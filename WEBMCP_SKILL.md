# WebMCP + QR Guerilla Marketing — Reusable Skill Reference

Built on Terror Ride (terrorride.vercel.app). Copy this pattern to any static site on Vercel.

---

## Part 1: WebMCP — Make Any Website Agent-Callable

### What it is

W3C draft standard (Feb 2026, Google + Microsoft). Websites register structured tools via `navigator.modelContext.registerTool()`. AI agents discover and call them directly — no DOM scraping, no fragile automation. The agent reads your response text and relays it verbatim to the user. Your brand voice travels through the agent.

**Browser support today:**
- Chrome 146+ behind `chrome://flags → WebMCP for testing`
- All browsers via `@mcp-b/global` polyfill (auto-deactivates when native support exists)

---

### Step 1 — Polyfill (one line per HTML page)

Add **before** your main script tag. `defer` order guarantees polyfill runs first.

```html
<script src="https://unpkg.com/@mcp-b/global@latest/dist/index.iife.js" defer></script>
<script src="your-script.js" defer></script>
```

To patch every HTML file at once (Python):

```python
import glob
POLYFILL = '  <script src="https://unpkg.com/@mcp-b/global@latest/dist/index.iife.js" defer></script>\n'
TARGET   = '  <script src="script.js" defer></script>'
for path in glob.glob('*.html'):
    text = open(path).read()
    if POLYFILL.strip() not in text and TARGET in text:
        open(path, 'w').write(text.replace(TARGET, POLYFILL + TARGET))
```

---

### Step 2 — Register tools in JS

Call `initWebMCP()` from `DOMContentLoaded`. Guard with `if (!('modelContext' in navigator)) return;` so it fails silently on unsupported browsers.

```js
function initWebMCP() {
  if (!('modelContext' in navigator)) return;
  const mc = navigator.modelContext;

  mc.registerTool({
    name: 'tool_name',                      // snake_case
    description: 'What this does for an agent reading it',
    inputSchema: {
      type: 'object',
      properties: {
        param: { type: 'string', description: 'What this param is' },
      },
      required: ['param'],
    },
    async execute({ param }) {
      const res  = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ param }),
      });
      const data = await res.json();
      // Return structured text — agent relays this to the user
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    },
  });
}
```

**inputSchema types:** `string`, `integer`, `boolean`, `number`  
**Enums:** `{ type: 'string', enum: ['a', 'b', 'c'] }`  
**No-param tools:** `inputSchema: { type: 'object', properties: {} }`

---

### Step 3 — Declarative forms (zero JS)

Add three attributes to any `<form>` and the agent infers the schema from HTML alone.

```html
<form toolname="submit_request"
      tooldescription="Submit a request — describe what this action does">
  <input  name="title" toolparamdescription="The title of the request">
  <input  name="email" toolparamdescription="Contact email for follow-up">
  <textarea name="body" toolparamdescription="Full description"></textarea>
</form>
```

**Requirements:**
- Inputs need `name` attributes (not just `id`) — declarative API reads `name`
- Don't add `toolautosubmit` unless you want agents submitting without user confirmation
- Imperative tool + declarative form can coexist — agent uses whichever it finds

---

### The personality pattern

The agent reads your `text` response and passes it to the user. Put your voice in the JSON.

```js
// boring
return { content: [{ type: 'text', text: 'OK' }] };

// good
return { content: [{ type: 'text', text: JSON.stringify({
  confirmation: 'Received. Do not follow up.',
  doNotFollowUp: true,
  whatHappensNext: 'Forwarded to the appropriate person. That person is Jules. Jules does not check his voicemail.',
  data: actualResponseData,
}) }] };
```

The agent dutifully parses `doNotFollowUp: true` and tells the user not to follow up. That is the joke.

---

### Tool map — Terror Ride reference implementation

| Tool | Type | Endpoint | Notes |
|------|------|----------|-------|
| `get_band_info` | imperative | static | Returns members, van status, Greg status |
| `get_merch` | imperative | static | Each sold-out item has `soldOutReason` |
| `vote_poll` | imperative | `POST /api/poll` | `id`: `species`\|`quiet`, `answer`: 0–2 |
| `get_poll_results` | imperative | `GET /api/poll?id=` | Returns labeled results with vote counts |
| `request_song` | imperative + declarative | `POST /api/songs` | `doNotFollowUp: true` in response |
| `file_noise_complaint` | imperative | `POST /api/complaints` | `julesChecksHisVoicemail: false` |
| `get_scan_stats` | imperative | `GET /api/scan?admin=1` | QR scan counts by source |

All 7 tools registered globally (every page) — agent landing anywhere can use the full API.

---

## Part 2: QR Guerilla Marketing System

### Pattern

Physical QR code → serverless tracker (Redis) → branded landing page  
Tracks scans by source, redirects, shows live count on landing page.

---

### api/scan.js (Vercel serverless)

Mirrors `api/poll.js` — CommonJS, no build step, uses Vercel Upstash env vars.

```js
const VALID_SOURCES = new Set(['coozie', 'sticker', 'poster']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  const redis = async (cmds) => {
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  // Admin stats: GET /api/scan?admin=1
  if (req.method === 'GET' && req.query?.admin === '1') {
    const results = await redis([
      ['GET', 'scan:total'], ['GET', 'scan:coozie'],
      ['GET', 'scan:sticker'], ['GET', 'scan:poster'], ['GET', 'scan:unknown'],
    ]);
    const keys = ['total', 'coozie', 'sticker', 'poster', 'unknown'];
    const counts = {};
    keys.forEach((k, i) => { counts[k] = parseInt(results[i]?.result) || 0; });
    return res.json(counts);
  }

  // Track + redirect
  const source = VALID_SOURCES.has(req.query?.s) ? req.query.s : 'unknown';
  if (url && token) {
    try {
      await redis([['INCR', 'scan:total'], ['INCR', `scan:${source}`]]);
    } catch { /* non-blocking */ }
  }
  res.redirect(302, '/scan.html');
};
```

**Redis keys:** `scan:total`, `scan:coozie`, `scan:sticker`, `scan:poster`, `scan:unknown`

---

### scan.html — QR landing page

Full-viewport hero. Optimized for mobile — someone who just scanned a sticker.

Key elements:
```html
<section class="scan-hero">
  <h1 class="scan-headline">YOU<br>FOUND<br>THIS.</h1>
  <p class="scan-sub">Terrible decision. Also correct.</p>
  <p class="scan-geo" id="scan-geo" aria-live="polite"></p>   <!-- geo message -->
  <p class="scan-count" id="scan-count" aria-live="polite"></p> <!-- live count -->
  <nav class="scan-ctas">
    <a href="music.html"  class="scan-btn">Listen</a>
    <a href="merch.html"  class="scan-btn">Buy Something</a>
    <a href="noise.html"  class="scan-btn">File a Complaint</a>
  </nav>
</section>
```

JS in `script.js` (called from DOMContentLoaded):

```js
function initScanPage() {
  const geoEl   = document.getElementById('scan-geo');
  const countEl = document.getElementById('scan-count');
  if (!geoEl) return;

  // Geo — no radar animation, just quiet text
  const cached = localStorage.getItem('tr_local');
  if (cached !== null) {
    showGeo(cached === 'true');
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const local = /* bounding box check */;
        localStorage.setItem('tr_local', String(local));
        showGeo(local);
      },
      () => {}
    );
  }

  function showGeo(local) {
    geoEl.textContent = local ? "YOU'RE ALREADY ONE OF US." : "YOU CAME ALL THE WAY HERE.";
    geoEl.classList.add(local ? 'local' : 'outsider');
  }

  // Live scan count
  fetch('/api/scan?admin=1')
    .then(r => r.json())
    .then(({ total }) => {
      if (!countEl || !total) return;
      const others = total - 1;
      countEl.textContent = others <= 0
        ? "You're the first one here."
        : `You and ${others} other${others !== 1 ? 's' : ''} found this.`;
    })
    .catch(() => {});
}
```

**Important:** `initGeolocation()` (the radar animation version) must skip the scan page:
```js
function initGeolocation() {
  if (document.querySelector('.scan-geo')) return; // scan page handles its own geo
  // ... rest of function
}
```

---

### print.html — QR asset generator

Client-side QR generation via `qrcodejs` CDN. No server needed.

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

<script>
const ITEMS = [
  { label: 'COOZIE',  source: 'coozie'  },
  { label: 'STICKER', source: 'sticker' },
  { label: 'POSTER',  source: 'poster'  },
];
const BASE = 'https://yourdomain.com/api/scan?s=';

ITEMS.forEach(({ label, source }) => {
  const wrap = document.createElement('div');
  document.getElementById('print-grid').appendChild(wrap);
  new QRCode(wrap, {
    text: BASE + source,
    width: 200, height: 200,
    colorDark: '#000000', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });
});
</script>
```

**Print CSS** — strips everything except the QR grid:
```css
@media print {
  .top-nav, .mobile-menu, .site-footer, .print-btn { display: none !important; }
  body { background: #fff !important; padding-top: 0 !important; }
  #bg-canvas { display: none !important; }
  .print-qr-card { background: #fff !important; border: 1px solid #ccc !important; break-inside: avoid; }
}
```

Works on Avery 8163 (2×4 label sheet). Print → cut → stick everywhere.

---

### QR URLs to encode on physical goods

```
https://yourdomain.com/api/scan?s=coozie
https://yourdomain.com/api/scan?s=sticker
https://yourdomain.com/api/scan?s=poster
```

Check stats anytime: `https://yourdomain.com/api/scan?admin=1`

---

## Part 3: Demo Guide

### Option A — DevTools console (30 seconds, no installs)

1. Open the live site in any browser
2. Open DevTools → Console
3. Run:

```js
// Check tools are registered
const tools = await navigator.modelContext.listTools();
console.log(tools.map(t => t.name));
// → ['get_band_info', 'get_merch', 'vote_poll', ...]

// Call a static tool
const info = await navigator.modelContext.callTool('get_band_info', {});
console.log(JSON.parse(info.content[0].text));
// → { name: 'Terror Ride', gregStatus: 'Still mad.', ... }

// Vote on a poll — see the funny response
const vote = await navigator.modelContext.callTool('vote_poll', { id: 'species', answer: 0 });
console.log(JSON.parse(vote.content[0].text));
// → { confirmation: 'Your vote has been logged. It will not change anything. But it has been logged.' }

// Check scan stats
const scans = await navigator.modelContext.callTool('get_scan_stats', {});
console.log(JSON.parse(scans.content[0].text));
```

Best for a quick screen-share demo. No installs, works right now.

---

### Option B — MCP-B Extension + Claude Desktop (full agent experience)

This is the one where a real AI agent calls the tools and relays the responses.

1. Install [MCP-B Extension](https://chromewebstore.google.com/detail/mcp-b-extension/daohopfhkdelnpemnhlekblhnikhdhfa) from Chrome Web Store
2. Open the live site in Chrome — extension auto-detects tools on the page
3. Claude Desktop → Settings → Extensions → connect to MCP-B local server
4. Ask Claude in natural language:
   - *"What tools does this page expose?"*
   - *"Vote that we're fucked as a species on the Terror Ride poll"*
   - *"What merch is available and why is everything sold out?"*
   - *"File a noise complaint saying they were too loud last Tuesday"*

Claude calls the tools, reads the JSON responses, and delivers the band's voice back to you through the agent. `julesChecksHisVoicemail: false` will appear in a real conversation.

---

### Option C — Playwright headless test (CI-ready)

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page    = await browser.newPage();
await page.goto('https://yoursite.com');

// Verify all tools registered
const tools = await page.evaluate(() => navigator.modelContext.listTools());
console.log(tools.map(t => t.name));

// Call a live API tool
const result = await page.evaluate(() =>
  navigator.modelContext.callTool('get_poll_results', { id: 'species' })
);
console.log(JSON.parse(result.content[0].text));

// Test the funny response
const vote = await page.evaluate(() =>
  navigator.modelContext.callTool('vote_poll', { id: 'species', answer: 0 })
);
const resp = JSON.parse(vote.content[0].text);
console.assert(resp.confirmation.includes('logged'));

await browser.close();
```

Works in any CI environment. The polyfill runs in Playwright's Chromium just like a real browser.

---

## Checklist for a new project

- [ ] Add polyfill script tag to all HTML pages (before main script)
- [ ] Write `initWebMCP()` — guard with `if (!('modelContext' in navigator)) return`
- [ ] Map existing API endpoints to tool names — one tool per action
- [ ] Add brand voice to response JSON — agent relays it verbatim
- [ ] Add `toolname` + `tooldescription` + `toolparamdescription` to any HTML forms with `name` attributes
- [ ] Test in console: `navigator.modelContext.listTools()`
- [ ] Demo with MCP-B extension + Claude Desktop
- [ ] Document in colophon / README

---

*Built on Terror Ride — West Seattle noise metal, est. 2009. terrorride.vercel.app*
