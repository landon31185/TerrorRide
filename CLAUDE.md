# TerrorRide — Project Memory & Decision Journal

## What This Is
Static multi-page band site for Terror Ride, a fictional West Seattle metal band.
Deployed on Vercel. Repo: `landon31185/TerrorRide`. Branch: `claude/finish-pages-design-SJzou`.
Live URL: `terrorride.vercel.app`

---

## Brand Voice
West Seattle noise metal band. Comedic but committed to the bit. Never winking at the camera.
- Articles read like actual band statements, not parody
- The humor comes from specificity (Jules' stepdad Greg, Nick Burgess, the van, 48 complaints)
- Tone: deadpan, self-serious, occasionally threatening
- Do NOT make it cute. It should feel like it could be real.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Hosting | Vercel | Free tier, auto-deploys from GitHub on merge to master |
| Database | Upstash Redis (via Vercel integration) | Free tier, 500k commands/month |
| Serverless | Vercel `/api` functions | Node.js, CommonJS (`module.exports`) |
| Fonts | HFucktura-Heavy, HFucktura-Thin | Self-hosted via `@font-face` |
| Maps | Leaflet.js + CartoDB dark tiles | No API key needed |
| Background | WebGL fragment shader | Domain-warped Voronoi lava cracks |
| CSS | Vanilla, no framework | CSS custom properties in `:root` |
| JS | Vanilla, no framework | All features in `script.js` |

### CSS Design Tokens
```css
--green: #24e39d      /* primary accent, interactive states */
--red: #BF0000        /* blood theme, ban indicators */
--dark-card: rgba(0,0,0,0.72)
--border-dim: #222
--nav-height: 64px
```

---

## OOUX Object Model

| Object | Properties | Actions |
|--------|-----------|---------|
| Band | name, bio, members, location, est. date | share |
| Member | name, role, photo | view |
| Song | title, album, stream links | play, request (planned) |
| Show | date, venue, location | get directions |
| Article | title, date, tag, body | read, share |
| Complaint | type, address, message | submit |
| Poll | question, answers, counts | vote, view results |
| Merch Item | name, price, availability | buy |

---

## Pages

| Page | File | Status | Notes |
|------|------|--------|-------|
| Home | `index.html` | ✅ | Hero, news preview, poll results section |
| About | `about.html` | ✅ | Band member cards |
| Music | `music.html` | ✅ | Album card, track listing, stream buttons |
| Merch | `merch.html` | ✅ | 8 items (7 sold out), Certificate of Inconvenience |
| Banned | `banned.html` | ✅ | Leaflet map, ban list |
| Noise | `noise.html` | ✅ | Fake Seattle.gov complaint iframe |
| News | `news.html` | ✅ | 4 articles as glass cards |

---

## Features Built

- **WebGL lava shader** — `initShaderBackground()` in `script.js`. Pauses when tab hidden. Half-res on mobile. Graceful fallback to `#000` if WebGL unavailable.
- **Geolocation banner** — detects West Seattle bounding box. "You already know." vs "You're not even from here."
- **Logo blood bleed** — `initLogoBleed()`. On tap/click, dark red circle expands from tap coords via `clip-path`, fades out.
- **Cursor fire trail** — `initCursorTrail()`. Canvas overlay, `pointer-events: none`. Spawns ember particles on `mousemove`, burst on `mousedown`. Skips touch-only devices.
- **View transitions** — CSS-only cross-document. Old page dims to near-black (200ms), new page rises and brightens (320ms). Nav locked with `view-transition-name: top-nav`.
- **Pop-up poll** — `initPoll()`. Shows once per session, 12 second delay. 2 questions, random rotation. Votes hit `/api/poll` serverless function → Upstash Redis. Results animate as bars.
- **Homepage poll results** — `initPollResults()`. "The People Have Spoken" section. Rotates featured poll weekly via `Math.floor(Date.now() / (week_ms)) % POLLS.length`. Hides if API down.
- **Scroll reveal** — IntersectionObserver. `.reveal` elements fade+slide on viewport entry.
- **Mobile menu** — hamburger, full-screen overlay with flame video background.

---

## OODA Decision Log

### ✅ WebGL shader instead of static photo or video
- **Observe:** Site needed visual identity beyond a photo
- **Orient:** Photo = static, video = heavy (mobile data), CSS animation = limited
- **Decide:** Write a custom WebGL fragment shader (domain-warped Voronoi)
- **Act:** Implemented — runs 60fps, very distinctive, fits the lava/metal aesthetic
- **Result:** Good decision. The shader IS the site's identity. Don't remove it.

### ✅ View Transitions — CSS-only cross-document
- **Observe:** Multi-page site felt disconnected between navigations
- **Orient:** New CSS `@view-transition` API handles this without JS for MPA sites
- **Decide:** `@view-transition { navigation: auto }` + custom keyframes that dip to near-black
- **Act:** Implemented — works on Chrome 126+/Safari 18+, graceful fallback on others
- **Result:** Good decision. Locking the nav with `view-transition-name: top-nav` was key — without it the nav flickers.

### ❌ Standalone Upstash → wasted ~1 hour
- **Observe:** Needed serverless-compatible Redis for poll votes
- **Orient:** Upstash has a free tier and REST API, seemed straightforward
- **Decide:** Create standalone Upstash database, manually copy credentials
- **Act:** Every database returned "Host not in allowlist" — turned out to be a sandbox network restriction, not an Upstash config issue. Wasted time deleting/recreating databases.
- **Result:** Bad process. **Correct approach: always use Vercel's Upstash integration** (Vercel dashboard → Storage → Upstash for Redis → Create). It auto-injects env vars, no allowlist issues, no credential copying.
- **Lesson:** When using Vercel, use Vercel's native integrations. Don't go around them.

### ⚠️ Cursor trail `(hover: none)` check was too aggressive
- **Observe:** Cursor flames worked with external mouse, not with trackpad alone
- **Orient:** `(hover: none)` media query switches on some systems when mouse is disconnected
- **Decide:** Replace with stricter check: only skip if device has touch AND no hover
- **Act:** Changed to `'ontouchstart' in window && !window.matchMedia('(hover: hover)').matches`
- **Result:** Fixed. Lesson: `(hover: none)` is unreliable for laptop trackpads. Use the compound check.

### ✅ Poll timing — 12 seconds vs 4 seconds
- **Observe:** 4 second delay fired before user had oriented to the page
- **Orient:** User needs time to understand what they're looking at before interruption
- **Decide:** 12 seconds. Also considered "2nd page view" (more respectful of first impression)
- **Act:** Set to 12s. Could revisit to "show on 2nd page" if it still feels too soon.
- **Result:** Better. The "2nd page view" approach is still worth trying eventually.

### ✅ Env var naming mismatch — Vercel KV vs Upstash names
- **Observe:** Vercel's Upstash integration injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`
- **Orient:** Code was written expecting `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- **Decide:** Support both with fallback: `process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL`
- **Act:** Updated `api/poll.js`
- **Result:** Works. Always check what env vars the Vercel integration actually injects — they're not always what you expect.

### ❌ Resend env var named wrong in Vercel
- **Observe:** Resend emails silently not sending despite function returning 200 and Redis storing correctly
- **Orient:** Code checks `process.env.RESEND_API_KEY` but Vercel had vars named `RESEND_KEY` and `RESEND_ADMIN`
- **Decide:** Added fallback chain: `RESEND_API_KEY || RESEND_KEY || RESEND_ADMIN`. Also added `console.log` to log Resend response status so failures surface in Vercel logs.
- **Result:** Fixed. **Lesson:** Define the env var name in code first, then use that exact name in Vercel. Never guess.

### ❌ Vercel env vars require a redeploy to take effect
- **Observe:** Added env var to Vercel, tested immediately, still failing
- **Orient:** Serverless functions are built at deploy time — adding a var doesn't hot-reload anything
- **Result:** Always merge a PR or manually redeploy after adding/changing Vercel env vars before testing.

### ⚠️ Resend test sender restriction
- **Observe:** Resend returned status 200 but email never arrived
- **Orient:** `onboarding@resend.dev` (Resend's test sender) only delivers to the account's own verified email
- **Decide:** Test with the Resend account email. For production delivery to anyone: buy a domain, verify it in Resend → Domains, update `from` in both API files.
- **Result:** Works for account email only. **Backlog:** Buy `terrorride.com` (~$10/yr on Namecheap/Cloudflare) for real delivery.

### ✅ CSS `--dark-card` token consolidation
- **Observe:** Glass panels had inconsistent `rgba(0,0,0,0.72)` vs `rgba(0,0,0,0.78)` scattered inline
- **Decide:** Bumped `--dark-card` to `rgba(0,0,0,0.78)`, replaced all inline values with `var(--dark-card)`
- **Result:** One token controls all glass backgrounds site-wide. Add `border-radius: 4px` + `backdrop-filter: blur(12px)` + `border: 1px solid var(--border-dim)` for the full glass recipe.

### ✅ Mobile body scroll lock on overlays
- **Observe:** Background content scrolled while mobile menu was open
- **Decide:** `document.body.style.overflow = isOpen ? 'hidden' : ''` on menu toggle; clear on link click too
- **Result:** Fixed. Any full-screen overlay needs this.

### ✅ Mobile long-press context menu suppression
- **Observe:** Holding the logo triggered browser "Open in New Tab" menu instead of blood splatter
- **Decide:** Three-part fix: `e.preventDefault()` on pointerdown + `contextmenu` event listener + CSS `-webkit-touch-callout: none; user-select: none`
- **Result:** Fixed. All three are needed. Two alone isn't enough.

### ✅ Organic canvas shapes — bezier curves
- **Observe:** Blood splatter chunks looked geometric/angular
- **Orient:** Straight `lineTo` between polygon vertices creates hard edges
- **Decide:** `quadraticCurveTo` through midpoints between vertices for smooth blobs. Add spike variance: 25% of points lunge 1.8–2.6x further for organic tendrils.
- **Result:** Looks like actual blood. Pattern reusable for any organic canvas shape.

### ✅ `user-select: none` — apply at container level
- **Observe:** Hero text still selectable after adding `user-select: none` to `.hero-sub` only
- **Decide:** Apply to `.hero-inner` container instead of individual children
- **Result:** Fixed. Always set at the parent that wraps everything you want non-selectable.

---

## Known Issues / Gotchas

- **Vercel integration env vars** differ from standalone Upstash env vars. See decision log above.
- **Sandbox network restriction** blocks outbound HTTP to external APIs (Upstash, httpbin, etc). Don't test API connectivity from the Claude Code sandbox — test from a local terminal or just deploy and check.
- **Leaflet z-index** bleeds through mobile menu without `position: relative; z-index: 0` on `.map-wrap`.
- **WebGL canvas `view-transition-name`** — not needed. The canvas is captured in the root screenshot and cross-fades seamlessly because the lava moves slowly.
- **`punycode` deprecation warning** in Vercel build logs — harmless, from Node internals. Ignore it.

---

## Planned / Not Yet Built

- [ ] **Song request feature** — serverless + Upstash, same pattern as poll. User submits song name, stored in Redis list, band can view.
- [ ] **`llms.txt`** — AI-readable site description at `/llms.txt`. New standard (2024). 20 min of writing, strong portfolio talking point.
- [ ] **JSON-LD structured data** — `MusicGroup` schema on `index.html`, `NewsArticle` on `news.html`. Makes Google AI overviews and voice assistants understand the site.
- [ ] **Dynamic OG images** — Vercel `@vercel/og` function. Share a news article → preview image shows headline in HFucktura font on lava background.
- [ ] **`/colophon` page** — documents the OOUX object model, tech stack, design decisions. Portfolio artifact inside the portfolio.
- [ ] **Homepage poll results** needs real votes to look good — cast some votes via the pop-up poll first.

---

## Serverless API Reference

### `GET /api/poll?id=<poll_id>`
Returns current vote counts for a poll.
```json
{ "counts": [14, 8, 22] }
```

### `POST /api/poll`
Cast a vote. Body: `{ "id": "species", "answer": 0 }`
Returns updated counts.

Valid poll IDs: `species`, `quiet`

---

## Git Workflow
- Dev branch: `claude/finish-pages-design-SJzou`
- All work goes on the branch → PR → merge to `master` → Vercel auto-deploys production
- PRs are created via GitHub MCP tools in Claude Code sessions
- Every merge triggers a production deploy in ~30 seconds
