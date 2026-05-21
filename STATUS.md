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
- **tags.html** — PWA install banner: mobile-only (width < 768px or touch device), updated text to "📲 Add to your home screen for quick access!", relabeled dismiss button to "Dismiss"

### 2026-05-21
- **tags.html + Supabase** — Deleted past event (May 20 "Valmont Bike Park DGC"). Inserted 47 recurring events: every Wednesday 4:00 PM and every Saturday 12:00 PM at Valmont DGC, May 23 – Oct 31 2026 (Supabase IDs 2–48).
- **tags.html** — `renderSplash` now auto-filters events where date+time+3h is past — disappear from home screen automatically.

### 2026-05-21
- **tags.html** — Renamed all "Valmont Bike Park DGC" → "Valmont DGC" everywhere (dropdowns, course selectors, COURSE_COORDS).

### 2026-05-21
- **index.html** — Multiple Courses feature card: hover/tap expand with 4 clickable course tiles linking to dgcoursereview.com. CSS max-height transition. Mobile tap toggles via toggleCoursesCard().

### 2026-05-21
- **index.html** — All 5 course cards: corrected DGCR ratings (Valmont ⭐4.2, Harlow Platts ⭐4.1, Flatirons ⭐4.7, East Interlocken ⭐4.1, Wondervu ⭐4.1). Removed ↗ arrows. All course/LPDGC links open in same tab.
- **index.html** — Wondervu meta: "22 holes · Boulder County foothills · $10/day · No reservations required · Only mountain DGC in Boulder County · Very hilly and heavily wooded"
- **index.html** — Fixed all DGCR URLs: East Interlocken → east-interlocken-park.4660, Harlow Platts → harlow-platts-park.160, Wondervu → wondervu-dgc.9221

### Prior session
- **index.html** — Added LPDGC (Longs Peak Disc Golf Club) feature card → https://lpdgc.org, subtitle "(Boulder County)"
- **index.html** — All 3 Tag League App links updated to https://boulder-disc-golf.vercel.app/tags with target="_blank"
- **index.html** — Multiple Courses body text updated; removed Scott Carpenter Park and Coal Creek Trail
- **tags.html** — Tag# field read-only for non-admin users
- **tags.html** — Weather: NWS API (api.weather.gov) primary, Open-Meteo fallback; colored Unicode icons; cache key wx4_; refresh at 10min/30min/2h thresholds; columns = 1h before through 3h after event time
- **tags.html** — Score submission: players self-submit strokes on home screen; TD sees live dashboard with ✅/⏳ per player; Commit button gated until all scores in
- **tags.html** — Match Manager auto-loads today's event and registered players from Supabase
- **tags.html** — Stats tab: fixed to show empty state instead of spinning; targets statsContent div correctly

---

## Known Issues

- None currently known.

---

## Next Up

- *(Add items here as they come up)*

---

## Architecture Notes

- **Stack:** Static HTML/CSS/JS, no framework. Deployed on Vercel.
- **Backend:** Supabase project `mewwizubdwfgvrhiylur`. Anon/publishable key in browser — safe.
- **Key files:** `index.html` (landing page, ~720 lines) · `tags.html` (Tag League App, ~2500+ lines)
- **Weather:** NWS api.weather.gov → /points/{lat},{lon} → hourly forecast. Fallback: Open-Meteo. Cache prefix: `wx4_`
- **COURSE_COORDS:** `'Valmont DGC': {lat:40.0150, lon:-105.2316}`
- **Supabase events schema:** `id, date, time, title, course, cancelled, registered (JSON), ace_per_player, ace_pool_total, ace_pool_cap, host`
- **Recurring schedule:** Wed 4PM + Sat 12PM @ Valmont DGC, May 23 – Oct 31 2026 (47 events)
