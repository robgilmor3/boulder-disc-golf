# STATUS.md — Boulder Disc Golf Project Status
# Update this file after EVERY change with date and what changed

---

## CURRENT STATE (as of May 2026)

### Both sites are LIVE:
- boulderdiscgolf.com — landing page ✅
- boulder-disc-golf.vercel.app — tag app ✅

### What's working:
- Tag ledger loads players from Supabase ✅
- Weather widget on event cards (NWS + Open-Meteo fallback) ✅
- Community notes with drag to reorder and inline edit ✅
- Match flow: register → scores → tag redistribution ✅
- Player self-score submission ✅
- Admin panel with tag assignment bulk editor ✅
- Season scheduler for recurring events ✅
- Logo links back to boulderdiscgolf.com ✅
- Tag League App button in nav works ✅
- PWA install prompt mobile only ✅
- 36 players loaded from Saturday 5/16 match ✅

### Known issues / pending:
- Weather widget icons need upgrade to Meteocons
- Event list should only show next 1-2 upcoming events (not all) ✅ FIXED
- Events should auto-hide 4 hours after match ends ✅ FIXED
- Recurring Wednesday 4PM and Saturday noon events need to be generated
- Scott Carpenter Park still appears in admin add event course dropdown ✅ FIXED
- Under Construction banner still showing — needs to be removed
- Mobile/tablet responsive issues on iPhone Safari still need testing
- CLAUDE.md and STATUS.md need to be committed to GitHub repo

---

## RECENT CHANGES (newest first)

### May 23, 2026 — Session 3 continued
- Task 1: Joke homepage live — hero_joke.jpg swapped into index.html
  Original saved as index_backup.html to restore anytime

### May 23, 2026 — Session 3 (Cowork) — Tasks 5–11
- Task 5: Fixed drag-to-reorder notes for Android — setPointerCapture on handle, handle-level
  pointermove/pointerup listeners with {passive:false}, touch-action:none set in JS
- Task 6: Fixed inline note editing for touch devices — edit/delete buttons now always
  visible on touch screens (@media hover:none), save/cancel use onpointerdown
- Task 7: Added CSS breakpoints for 320/360/375/390/412/430/768/1024px
- Task 8: Fixed iPhone landscape — @media (max-height:500px) and (orientation:landscape)
  stacks weather widget below event info
- Task 9: Removed score submission from home screen — replaced with green
  "Head to the Match tab" prompt after registering
- Task 10: Removed Under Construction banner (constructionBanner + constructionNote divs)
- Task 11: Verified all recurring Wed 4PM + Sat noon events exist in Supabase
  through Oct 31 2026 (47 total events) — no new inserts needed

### May 23, 2026 — Session 2 (Cowork)
- Task 3: Tag number is now optional when adding a new player (blank = null)
  - Label updated to "Tag # (optional)"
  - Removed mandatory validation; duplicate check only runs if tag is provided

### May 2026
- Tasks 1-3: Confirmed Valmont DGC name correct everywhere
- Removed Scott Carpenter Park DGC from all course dropdowns
- Renamed Coal Creek Trail DGC → Coal Creek DGC in dropdown
- Event list now shows only next 1-2 upcoming events (.slice(0,2))
- Events now auto-hide 4 hours after match end time (was 3hrs)
- Fixed Tag League App button — pointer-events:none was blocking clicks on nav
- Fixed landing page hero — text repositioned to upper sky area, mountains visible
- Added BOULDER, COLORADO in dark text readable against mountains
- Added Elev · 5,430 ft line
- Fixed hero title — removed thick outlined orange stroke font, back to clean elegant text
- Added ⚡ Built by Rob Gilmore — Tech God ⚡ to footer
- Added Longs Peak Disc Golf Club feature card linking to lpdgc.org
- Added (Boulder County) subtitle to LPDGC card
- Course cards updated with correct DGCR links and ratings
- Removed Scott Carpenter Park from courses section
- Added East Interlocken, Wondervu, Harlow Platts with correct URLs
- Weather widget repositioned — side by side with event info not below it
- Player self-score submission added to home screen
- TD score dashboard with ✅/⏳ indicators added
- Match Manager auto-loads today's registered players
- Cowork fixed infinite Supabase loading spinner
- 36 players imported from Saturday 5/16 match results

---

## NEXT UP (in priority order)
1. Upgrade weather icons to Meteocons (deferred)
2. Upgrade weather icons to Meteocons (deferred from original backlog)
3. Test all mobile fixes on real Samsung device
