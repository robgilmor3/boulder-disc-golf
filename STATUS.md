# Boulder Disc Golf — Project Status

---

## Current Live URLs

| Page | URL |
|------|-----|
| Landing page | https://boulder-disc-golf.vercel.app |
| Tag League App | https://boulder-disc-golf.vercel.app/tags |

---

## Recent Changes

### 2026-05-21
- **CLAUDE.md** — Created permanent instruction file: project context, tech stack, live URLs, coding preferences, what not to touch, GitHub workflow, mandatory STATUS.md update rule
- **STATUS.md** — Recreated with full current state

### 2026-05-21
- **STATUS.md** — Created initial project changelog

### 2026-05-21
- **tags.html** — PWA install banner: mobile-only (width < 768px or touch/hover:none device), text updated to "📲 Add to your home screen for quick access!", dismiss button labeled "Dismiss"

### 2026-05-21
- **tags.html + Supabase** — Deleted stale past event (May 20, "Valmont Bike Park DGC"). Inserted 47 recurring events: Wed 4PM + Sat 12PM @ Valmont DGC, May 23 – Oct 31 2026 (Supabase IDs 2–48)
- **tags.html** — `renderSplash` now auto-hides events where date+time+3h is past — no manual deletion needed

### 2026-05-21
- **tags.html** — Renamed all "Valmont Bike Park DGC" → "Valmont DGC" (dropdowns, course selectors, COURSE_COORDS key)

### 2026-05-21
- **index.html** — Multiple Courses card: hover/tap expand with 4 clickable course tiles (Valmont Disc Park, Harlow Platts, East Interlocken, Wondervu) linking to dgcoursereview.com. CSS max-height transition. Mobile tap toggles via toggleCoursesCard()
- **index.html** — All 5 course cards: corrected ratings (Valmont ⭐4.2, Harlow Platts ⭐4.1, Flatirons ⭐4.7, East Interlocken ⭐4.1, Wondervu ⭐4.1). Removed ↗ arrows. All course/LPDGC links open in same tab
- **index.html** — Wondervu meta: "22 holes · Boulder County foothills · $10/day · No reservations required · Only mountain DGC in Boulder County · Very hilly and heavily wooded"
- **index.html** — Fixed DGCR URLs: East Interlocken → east-interlocken-park.4660, Harlow Platts → harlow-platts-park.160, Wondervu → wondervu-dgc.9221

### Prior session
- **index.html** — Added LPDGC (Longs Peak Disc Golf Club) feature card → https://lpdgc.org, subtitle "(Boulder County)"
- **index.html** — All 3 Tag League App links → https://boulder-disc-golf.vercel.app/tags with target="_blank"
- **index.html** — Multiple Courses body text updated; removed Scott Carpenter Park and Coal Creek Trail
- **tags.html** — Tag# field read-only for non-admin users
- **tags.html** — Weather: NWS api.weather.gov primary + Open-Meteo fallback; colored Unicode icons (☀☁⚡❄); cache key wx4_; refresh thresholds 10min/30min/2h; columns = 1h before through 3h after event time
- **tags.html** — Score submission: players self-submit strokes on home screen; TD live dashboard with ✅/⏳ per player; Commit button gated until all scores in
- **tags.html** — Match Manager auto-loads today's event and registered players from Supabase
- **tags.html** — Stats tab: fixed empty state (was spinning forever); targets statsContent div correctly

---

## Known Issues

- None currently known.

---

## Next Up

- *(Add items here as they come up)*

---

## Architecture Notes

- **Stack:** Static HTML/CSS/JS, no framework. Deployed on Vercel (auto-deploys from main branch)
- **Backend:** Supabase project `mewwizubdwfgvrhiylur`. Anon/publishable key in browser — safe
- **Key files:** `index.html` (landing page) · `tags.html` (Tag League App) · `CLAUDE.md` (instructions) · `STATUS.md` (this file)
- **Weather:** NWS api.weather.gov → /points/{lat},{lon} → hourly forecast. Fallback: Open-Meteo. Cache prefix: `wx4_`
- **COURSE_COORDS:** `'Valmont DGC': {lat:40.0150, lon:-105.2316}`
- **Supabase events schema:** `id, date, time, title, course, cancelled, registered (JSON), ace_per_player, ace_pool_total, ace_pool_cap, host`
- **Recurring schedule:** Wed 4PM + Sat 12PM @ Valmont DGC, May 23 – Oct 31 2026 (47 events, IDs 2–48)
