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
1. Fix player search dropdown on mobile (Task 4)
2. Fix drag-to-reorder notes on Android (Task 5)
3. Fix inline note editing on Android (Task 6)
4. CSS breakpoints for all screen widths (Task 7)
5. iPhone landscape stacking fix (Task 8)
6. Move score submission off home screen (Task 9)
7. Remove Under Construction banner (Task 10)
8. Generate recurring Wed/Sat events through Oct 2026 (Task 11)
