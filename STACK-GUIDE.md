# Vercel + Upstash + Resend Stack Guide
### Reusable infrastructure for static sites with serverless backends

Built from the TerrorRide project. Copy these patterns verbatim into any new project.

---

## The Stack

```
Vercel (hosting + serverless functions)
  └── /api/*.js  (Node.js, CommonJS)
       ├── Upstash Redis  → counters, lists, sets, key-value storage
       └── Resend         → transactional + campaign email
Static HTML / CSS / JS (no framework required)
```

**Cost at launch:** $0. Everything runs on free tiers.
**Scales to:** ~500k Redis commands/month, 3k Resend emails/month, 100GB Vercel bandwidth.

---

## 1. Initial Setup (do this once per project)

### Vercel
1. Push repo to GitHub
2. Import to Vercel → auto-detects static site, no build config needed
3. Every push to `master` triggers a production deploy (~30 seconds)

### Upstash Redis
1. Vercel dashboard → Storage → **Create Database** → Upstash for Redis
2. That's it. Vercel auto-injects env vars — no credentials to copy.

**Injected env vars:**
```
KV_REST_API_URL
KV_REST_API_TOKEN
```

> ⚠️ Do NOT create a standalone Upstash account and paste credentials manually.
> The Vercel integration handles allowlisting. Standalone will return "Host not in allowlist" errors.

### Resend
1. Create account at resend.com
2. Copy API key → add to Vercel env vars as `RESEND_API_KEY`
3. For real delivery (not just to your own email): verify a custom domain in Resend → Domains

> ⚠️ Env vars require a **redeploy** to take effect. Always redeploy after adding/changing vars.

---

## 2. Redis Boilerplate (copy into every api/ file)

```js
const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = async (cmds) => {
  const r = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  return r.json();
};
```

The pipeline endpoint batches multiple Redis commands into one HTTP call. Always use it.

**Common commands:**
```js
await redis([['INCR', 'mykey']]);                        // increment counter
await redis([['GET', 'mykey']]);                         // get value
await redis([['SET', 'mykey', JSON.stringify(obj)]]);    // store object
await redis([['SADD', 'myset', 'value']]);               // add to set (deduplicates)
await redis([['SMEMBERS', 'myset']]);                    // get all set members
await redis([['LPUSH', 'mylist', 'value'],               // prepend to list
             ['LTRIM', 'mylist', 0, 99]]);               // keep only last 100
await redis([['LRANGE', 'mylist', 0, 9]]);               // get first 10 items
```

---

## 3. Serverless Function Boilerplate

```js
// api/example.js
const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const redis = async (cmds) => {
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'Not configured' });

  if (req.method === 'GET') {
    const results = await redis([['GET', 'mykey']]);
    return res.json({ value: results[0]?.result });
  }

  if (req.method === 'POST') {
    const { data } = req.body || {};
    if (!data) return res.status(400).json({ error: 'Missing data' });
    await redis([['SET', 'mykey', data]]);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
```

**File goes in `/api/example.js` → available at `/api/example`**

---

## 4. Resend Email Boilerplate

```js
const RESEND_KEY = process.env.RESEND_API_KEY || process.env.RESEND_KEY;

const sendEmail = async ({ to, subject, html }) => {
  if (!RESEND_KEY) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Your Project <onboarding@resend.dev>', // swap for real domain later
      to,
      subject,
      html,
    }),
  });
  const body = await res.json();
  console.log('Resend status:', res.status, JSON.stringify(body)); // surfaces in Vercel logs
};
```

> ⚠️ `onboarding@resend.dev` only delivers to your own Resend-verified email.
> For real delivery: verify a domain in Resend → Domains, then change `from` to `you@yourdomain.com`.

---

## 5. Subscriber List + Campaign (copy from TerrorRide)

These two files are complete and reusable as-is. Only change the `from:` address and `SITE_URL`.

- `api/subscribe.js` — subscribe (POST), unsubscribe (GET), list (GET + admin key)
- `api/campaign.js` — send blast to all subscribers (POST + admin key), history (GET + admin key)

**Redis keys used:**
```
subscribers          → SADD/SREM/SMEMBERS (set, auto-deduplicates)
campaign:{timestamp} → JSON record of each sent campaign
campaign:recent      → LPUSH list of campaign IDs (trimmed to 10)
```

**Admin dashboard:** `admin.html` — key-gated, no server-side auth needed for a band/small project.
Access via `yoursite.com/admin.html` — key input on the page, or `?key=X` in URL as shortcut.

---

## 6. Visit / Scan Counter Pattern

Track any discrete event with a counter:

```js
// Increment
await redis([['INCR', 'visits:total'], ['INCR', 'visits:homie']]);

// Read
const results = await redis([['GET', 'visits:total'], ['GET', 'visits:homie']]);
const total = parseInt(results[0]?.result) || 0;
const homie = parseInt(results[1]?.result) || 0;
```

For multiple categories (e.g. scan sources), batch all reads:
```js
const sources = ['alki', 'junction', 'admiral'];
const cmds = sources.map(s => ['GET', `scan:${s}`]);
const results = await redis(cmds);
const counts = Object.fromEntries(sources.map((s, i) => [s, parseInt(results[i]?.result) || 0]));
```

---

## 7. Admin Key Pattern

For any endpoint that should be restricted:

```js
const ADMIN_KEY = process.env.MY_ADMIN_KEY || 'changeme';

// In handler:
if (req.query?.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
// or for POST:
if (req.body?.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
```

Set `MY_ADMIN_KEY` in Vercel env vars to a random string (e.g. `openssl rand -hex 16`).

---

## 8. Frontend Fetch Pattern

```js
// POST JSON to an API route
async function postData(url, data) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(url, err);
    return null;
  }
}

// Usage
const result = await postData('/api/subscribe', { email: 'user@example.com' });
if (result?.ok) showSuccess();
```

---

## 9. Geolocation + Cache Pattern

```js
const GEO_CACHE_KEY = 'tr_local'; // localStorage key

function getLocation(callback) {
  const cached = localStorage.getItem(GEO_CACHE_KEY);
  if (cached) return callback(cached);

  if (!navigator.geolocation) return callback('unknown');

  const timeout = setTimeout(() => callback('unknown'), 5000);

  navigator.geolocation.getCurrentPosition(
    pos => {
      clearTimeout(timeout);
      const { latitude: lat, longitude: lng } = pos.coords;
      // Define your bounding box
      const inArea = lat > 47.5 && lat < 47.612 && lng > -122.445 && lng < -122.34;
      const result = inArea ? 'local' : 'outside';
      localStorage.setItem(GEO_CACHE_KEY, result);
      callback(result);
    },
    () => { clearTimeout(timeout); callback('unknown'); }
  );
}
```

Always cache geolocation — permission prompts on every page load is terrible UX.

---

## 10. Env Vars Checklist

Before going live, verify these are set in Vercel:

| Variable | Required | Notes |
|----------|----------|-------|
| `KV_REST_API_URL` | ✅ | Auto-injected by Vercel Upstash integration |
| `KV_REST_API_TOKEN` | ✅ | Auto-injected by Vercel Upstash integration |
| `RESEND_API_KEY` | If using email | From resend.com dashboard |
| `ADMIN_KEY` | If using admin | Random string, keep secret |
| `CAMPAIGN_ADMIN_KEY` | If using campaigns | Can match ADMIN_KEY |

---

## 11. OODA Lessons Learned

These burned real time. Don't repeat them.

| ❌ Mistake | ✅ Fix |
|-----------|--------|
| Created standalone Upstash, got allowlist errors | Use Vercel's native Upstash integration every time |
| Added env var in Vercel, tested immediately, still broken | Env vars need a redeploy. Always. |
| Named env var differently in Vercel vs code | Define the name in code first, copy it exactly to Vercel |
| Used `onboarding@resend.dev`, emails never arrived to real users | Buy a domain, verify in Resend, update `from:` |
| Used `(hover: none)` to detect touch devices | Use `'ontouchstart' in window && !window.matchMedia('(hover: hover)').matches` |
| Geolocation fired on every page load | Cache result in localStorage on first call |
| Separate subscribe form below existing form | Checkbox on existing form — user already entered their email |
| `position: fixed` footer caused layout bugs | Use `position: sticky; bottom: 0` — respects document flow |

---

## 12. Deployment Checklist

- [ ] Vercel Upstash integration created (not standalone)
- [ ] All env vars set in Vercel (check Settings → Environment Variables)
- [ ] Redeployed after setting env vars
- [ ] Test one form submission end-to-end in production (Vercel logs → Functions tab)
- [ ] Admin key is a random string, not `changeme`
- [ ] WCAG contrast passes for all text (rgba white on dark: opacity ≥ 0.6)
- [ ] Images stripped of EXIF metadata if privacy matters (`exiftool -all= image.jpg`)

---

## File Structure

```
/
├── index.html          # homepage
├── styles.css          # all styles, CSS custom properties in :root
├── script.js           # all frontend JS, one file
├── CLAUDE.md           # project memory + decision log (keep updated)
├── STACK-GUIDE.md      # this file
├── api/
│   ├── complaints.js   # form submission + email
│   ├── poll.js         # vote + results
│   ├── visits.js       # visitor counter
│   ├── scan.js         # QR scan tracking
│   ├── magnet.js       # NFC magnet tracking
│   ├── songs.js        # song requests + admin
│   ├── subscribe.js    # email list management
│   └── campaign.js     # email blast sender
└── images/
```

---

*Built with Claude Code. Template extracted from `landon31185/TerrorRide`.*
