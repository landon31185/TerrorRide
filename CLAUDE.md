# TerrorRide — Project Memory & Decision Journal

## What This Is
Static multi-page band site for Terror Ride, a fictional West Seattle metal band.
Deployed on Vercel. Repo: `landon31185/TerrorRide`. Primary branch: `master`.
Live URL: `terrorride.vercel.app`

---

## Accessibility — Non-Negotiable
Every CSS color change must pass **WCAG AA contrast** before committing.

| Situation | Minimum ratio |
|-----------|--------------|
| Normal text (< 18pt / 14pt bold) | 4.5 : 1 |
| Large text (≥ 18pt or 14pt bold) | 3.0 : 1 |
| UI components / icons | 3.0 : 1 |

**Quick reference for this site's backgrounds:**
- Dark card `rgba(0,0,0,0.78)` ≈ near-black → text needs to be **≥ #888** to pass (5.74 : 1)
- Gov form / iframe body `#f2f2ed` (light) → text needs to be **≤ #595959** to pass
- Any `rgba(255,255,255,X)` on dark: X must be **≥ 0.6** (effectively ≥ #999) to clear 4.5 : 1

**Rule:** Never use `#555`, `#666`, `rgba(255,255,255,0.5)` or dimmer for readable text on dark backgrounds. Placeholder text is exempt (browsers handle it), decorative/non-text elements are exempt.

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
| Email | Resend | Transactional + campaign. Needs custom domain for real delivery |
| Fonts | HFucktura-Heavy, HFucktura-Thin | Self-hosted via `@font-face` |
| Maps | Leaflet.js + CartoDB dark tiles | No API key needed |
| Background | WebGL fragment shader | Domain-warped Voronoi lava cracks |
| CSS | Vanilla, no framework | CSS custom properties in `:root` |
| JS | Vanilla, no framework | All features in `script.js` |

### CSS Design Tokens
```css
--green: #24e39d      /* primary accent, interactive states */
--red: #BF0000        /* blood theme, ban indicators */
--dark-card: rgba(0,0,0,0.78)
--border-dim: #222
--nav-height: 64px
```

### Glass Card Recipe
```css
background: var(--dark-card);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid var(--border-dim);
border-radius: 4px;
```

---

## Environment Variables

| Variable | Used By | Notes |
|----------|---------|-------|
| `KV_REST_API_URL` | All api/ files | Auto-injected by Vercel Upstash integration |
| `KV_REST_API_TOKEN` | All api/ files | Auto-injected by Vercel Upstash integration |
| `RESEND_API_KEY` | api/complaints.js, api/songs.js, api/campaign.js | Resend API key |
| `ADMIN_KEY` | api/songs.js | Admin key for song request dashboard |
| `CAMPAIGN_ADMIN_KEY` | api/subscribe.js, api/campaign.js | Admin key for email campaign dashboard |

**Important:** Code uses fallback chains for Redis (`KV_REST_API_URL || UPSTASH_REDIS_REST_URL`) and Resend (`RESEND_API_KEY || RESEND_KEY || RESEND_ADMIN`). Always redeploy after changing env vars.

---

## OOUX Object Model

| Object | Properties | Actions |
|--------|-----------|---------|
| Band | name, bio, members, location, est. date | share |
| Member | name, role, photo | view |
| Song | title, album, stream links | play, request |
| Show | date, venue, location | get directions |
| Article | title, date, tag, body | read, share |
| Complaint | type, address, message | submit |
| Poll | question, answers, counts | vote, view results |
| Merch Item | name, price, availability | buy |
| Subscriber | email | subscribe, unsubscribe |
| Campaign | subject, body, sent count | compose, send |
| Scan | source, count | track |
| Magnet | id, geo result, count | track, dashboard |

---

## Pages

| Page | File | Status | Notes |
|------|------|--------|-------|
| Home | `index.html` | ✅ | Hero, news carousel (7 cards), poll results, merch preview, visitor counter |
| About | `about.html` | ✅ | Band member cards |
| Music | `music.html` | ✅ | Album card, track listing, stream buttons, song request form |
| Merch | `merch.html` | ✅ | 10 items (8 sold out), Certificate of Inconvenience |
| Banned | `banned.html` | ✅ | Leaflet map, ban list |
| Noise | `noise.html` | ✅ | Fake Seattle.gov complaint iframe + email list opt-in checkbox |
| News | `news.html` | ✅ | 6 articles newest-first, glass cards |
| Local | `local.html` | ✅ | West Seattle local spots map |
| Scan | `scan.html` | ✅ | QR scan landing, source-aware visit count |
| Magnet | `magnet.html` | ✅ | NFC magnet landing (geo-aware) + admin dashboard |
| Print | `print.html` | ✅ | QR asset sheet (coozie/sticker/poster + 6 location drops) |
| Admin | `admin.html` | ✅ | Song request dashboard + email campaign composer |
| Colophon | `colophon.html` | ✅ | How the site was made |

---

## Features Built

- **WebGL lava shader** — `initShaderBackground()` in `script.js`. Pauses when tab hidden. Half-res on mobile. Graceful fallback to `#000` if WebGL unavailable.
- **Geolocation banner** — detects West Seattle bounding box. "You already know." vs "You're not even from here." Cached in `localStorage` (`tr_local`).
- **Logo blood bleed** — `initLogoBleed()`. On tap/click, dark red circle expands from tap coords via `clip-path`, fades out.
- **Cursor fire trail** — `initCursorTrail()`. Canvas overlay, `pointer-events: none`. Spawns ember particles on `mousemove`, burst on `mousedown`. Skips touch-only devices.
- **View transitions** — CSS-only cross-document. Old page dims to near-black (200ms), new page rises and brightens (320ms). Nav locked with `view-transition-name: top-nav`.
- **Pop-up poll** — `initPoll()`. Shows once per session, 12 second delay. 2 questions, random rotation. Votes hit `/api/poll` → Upstash Redis. Results animate as bars.
- **Homepage poll results** — `initPollResults()`. Rotates featured poll weekly. Hides if API down.
- **News carousel** — 7 cards (6 articles newest-first + View All CTA). IntersectionObserver-based snap detection. Dot nav synced to card count.
- **Scroll reveal** — IntersectionObserver. `.reveal` elements fade+slide on viewport entry.
- **Mobile menu** — hamburger, full-screen overlay with flame video background.
- **Visitor counter widget** — `initVisitCount()`. Tracks West Seattle Homies vs Outsiders via geolocation + `/api/visits`. Glass card with bar, count split, deadpan caption.
- **NFC magnet campaign** — `initMagnetPage()`. Dual-mode: landing (geo prompt + scan log) when `?id=` present; admin dashboard (stats, per-magnet table, activity feed, 30s refresh) when no param.
- **Location QR codes** — `print.html` generates Avery-ready QR sheets for 6 West Seattle locations. Each QR links to unique scan source for tracking.
- **Email subscriber list** — opt-in checkbox on complaint form. `/api/subscribe` stores emails in Redis set (SADD, deduplication automatic). Unsubscribe link in every campaign email.
- **Email campaign dashboard** — `/admin.html` campaign section. Write subject + body, send to all subscribers via Resend. Stores history in Redis. Requires `CAMPAIGN_ADMIN_KEY`.
- **Song request feature** — form on music page, stored in Redis list, fulfillable from admin dashboard. Sends confirmation email via Resend.
- **WebMCP tools** — `initWebMCP()`. Registers site tools (`get_visit_stats`, `get_magnet_stats`, etc.) via `navigator.modelContext`.

---

## Serverless API Reference

### `/api/poll`
- `GET ?id=<id>` — returns `{ counts: [n, n, n] }` for a poll
- `POST { id, answer }` — cast a vote, returns updated counts
- Valid IDs: `species`, `quiet`

### `/api/complaints`
- `POST { name, email, desc }` — stores complaint, sends Narc Certification email via Resend

### `/api/songs`
- `GET ?key=<adminKey>` — list all song requests
- `POST { song, name, email, about }` — submit request, sends confirmation email
- `PUT { id, key }` — mark request fulfilled, sends fulfillment email

### `/api/visits`
- `GET` — returns `{ total, homie, outsider }`
- `POST { type: 'homie'|'outsider' }` — increment visit count

### `/api/scan`
- `GET ?s=<source>` — increments scan count, redirects to `/scan.html?s=<source>`
- `GET ?admin=1` — returns counts for all sources

### `/api/magnet`
- `GET ?admin=1` — returns `{ total, geo, magnets, recent }`
- `POST { magnet_id, geofence_result, message_shown }` — log a magnet scan

### `/api/subscribe`
- `POST { email }` — add to subscriber set
- `GET ?action=unsubscribe&email=X` — remove from set, redirect to `/?unsub=1`
- `GET ?admin=1&key=X` — returns `{ count, subscribers }`

### `/api/campaign`
- `GET ?admin=1&key=X` — returns `{ campaigns: [...] }` (last 10)
- `POST { subject, body, key }` — send campaign to all subscribers via Resend

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
- **Act:** Every database returned "Host not in allowlist" — sandbox network restriction, not Upstash config
- **Result:** Bad process. **Correct approach: always use Vercel's Upstash integration** (Vercel dashboard → Storage → Upstash for Redis → Create). It auto-injects env vars, no allowlist issues.
- **Lesson:** When using Vercel, use Vercel's native integrations. Don't go around them.

### ⚠️ Cursor trail `(hover: none)` check was too aggressive
- **Observe:** Cursor flames worked with external mouse, not with trackpad alone
- **Orient:** `(hover: none)` media query switches on some systems when mouse is disconnected
- **Decide:** Replace with stricter check: only skip if device has touch AND no hover
- **Act:** Changed to `'ontouchstart' in window && !window.matchMedia('(hover: hover)').matches`
- **Result:** Fixed. `(hover: none)` is unreliable for laptop trackpads. Use the compound check.

### ✅ Poll timing — 12 seconds vs 4 seconds
- **Observe:** 4 second delay fired before user had oriented to the page
- **Decide:** 12 seconds. Could revisit to "show on 2nd page view" if it still feels too soon.
- **Result:** Better. Less interruptive.

### ✅ Env var naming mismatch — Vercel KV vs Upstash names
- **Observe:** Vercel's Upstash integration injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`
- **Orient:** Code was written expecting `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- **Decide:** Support both with fallback: `process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL`
- **Result:** Works. Always check what env vars the Vercel integration actually injects.

### ❌ Resend env var named wrong in Vercel
- **Observe:** Resend emails silently not sending despite function returning 200
- **Orient:** Code checks `RESEND_API_KEY` but Vercel had `RESEND_KEY` and `RESEND_ADMIN`
- **Decide:** Fallback chain: `RESEND_API_KEY || RESEND_KEY || RESEND_ADMIN`. Added `console.log` for Resend status.
- **Result:** Fixed. **Lesson:** Define env var name in code first, then use that exact name in Vercel.

### ❌ Vercel env vars require a redeploy to take effect
- **Observe:** Added env var to Vercel, tested immediately, still failing
- **Orient:** Serverless functions are built at deploy time — no hot-reload
- **Result:** Always redeploy after adding/changing Vercel env vars.

### ⚠️ Resend test sender restriction
- **Observe:** Resend returned 200 but email never arrived
- **Orient:** `onboarding@resend.dev` only delivers to the account's own verified email
- **Result:** Works for account email only. For production delivery to anyone: buy a domain, verify in Resend → Domains, update `from` in api files.
- **Backlog:** Buy `terrorride.com` (~$10/yr) for real email delivery.

### ✅ CSS `--dark-card` token consolidation
- **Observe:** Glass panels had inconsistent rgba values scattered inline
- **Decide:** Bumped `--dark-card` to `rgba(0,0,0,0.78)`, replaced all inline values with `var(--dark-card)`
- **Result:** One token controls all glass backgrounds site-wide.

### ✅ Mobile body scroll lock on overlays
- **Observe:** Background content scrolled while mobile menu was open
- **Decide:** `document.body.style.overflow = isOpen ? 'hidden' : ''` on menu toggle
- **Result:** Fixed. Any full-screen overlay needs this.

### ✅ Mobile long-press context menu suppression
- **Observe:** Holding the logo triggered browser "Open in New Tab" menu
- **Decide:** Three-part fix: `e.preventDefault()` on pointerdown + `contextmenu` listener + CSS `-webkit-touch-callout: none; user-select: none`
- **Result:** Fixed. All three are needed.

### ✅ Footer ticker removed — position:sticky instead of position:fixed
- **Observe:** Fixed-position ticker had broken positioning, overlapped content
- **Orient:** `position:fixed` removes element from document flow entirely
- **Decide:** Remove ticker. Make footer `position: sticky; bottom: 0` instead.
- **Result:** Footer always visible at bottom of viewport, respects document flow. `sticky` is almost always better than `fixed` for footers.

### ✅ Geolocation caching in localStorage
- **Observe:** Geolocation prompt fires on every page load — annoying, burns permission budget
- **Decide:** Cache result in `localStorage` as `tr_local` (`'ws'` or `'outside'`). Check cache first.
- **Result:** Permission requested once. All subsequent checks are instant.

### ✅ Email opt-in as checkbox on existing form vs separate form
- **Observe:** Planned standalone subscribe section below complaint form
- **Orient:** User already entered their email in the complaint form. Redundant to ask again.
- **Decide:** Single checkbox on existing form: "Also add me to the mailing list." Fire subscribe POST silently on submit if checked.
- **Result:** Less friction, cleaner page, same outcome.

---

## Known Issues / Gotchas

- **Vercel integration env vars** differ from standalone Upstash env vars. Use fallback chains.
- **Sandbox network restriction** blocks outbound HTTP to external APIs. Don't test API connectivity from Claude Code sandbox — deploy and check Vercel logs.
- **Leaflet z-index** bleeds through mobile menu without `position: relative; z-index: 0` on `.map-wrap`.
- **WebGL canvas `view-transition-name`** — not needed. Canvas is captured in root screenshot and cross-fades seamlessly.
- **`punycode` deprecation warning** in Vercel build logs — harmless, from Node internals. Ignore it.
- **Resend free tier** — `onboarding@resend.dev` sender only delivers to account's verified email. Custom domain required for real delivery to subscribers.
- **Admin page is publicly accessible** — `admin.html` has no server-side auth. Security is entirely in the API key validation on the serverless functions. Use a strong, random `CAMPAIGN_ADMIN_KEY` and `ADMIN_KEY`.

---

## Planned / Not Yet Built

- [ ] **Buy `terrorride.com`** — ~$10/yr. Required for Resend to deliver to real subscribers. Verify in Resend → Domains, update `from:` in `api/campaign.js` and `api/complaints.js`.
- [ ] **`llms.txt`** — AI-readable site description at `/llms.txt`. New standard (2024). 20 min of writing.
- [ ] **JSON-LD structured data** — `MusicGroup` schema on `index.html`, `NewsArticle` on `news.html`.
- [ ] **Dynamic OG images** — Vercel `@vercel/og` function. Share a news article → preview shows headline in HFucktura on lava background.
- [ ] **Homepage poll results** — needs real votes to look good. Cast some via the pop-up poll first.
- [ ] **`/?unsub=1` page state** — unsubscribe redirect lands on homepage with no feedback. Add a toast or banner for "You've been unsubscribed."

---

## Git Workflow
- Primary branch: `master` → Vercel auto-deploys production on every merge
- Dev branches: `claude/<feature-name>` → PR → squash merge to master
- Every merge triggers a production deploy in ~30 seconds
