# STATUS.md — Boulder Disc Golf Project Status

# Update this file after EVERY change with date and what changed

---

## May 29, 2026 — Diablo Money Match + Animated Flames Added

### tags.html: 4 surgical additions (no rewrites)

- **Addition 1** — New CSS: flames container/animation, money match UI classes (play btn, mode select, hole card, score input, running totals, payout card, buyin row, team buttons)
- **Addition 2** — Money Match HTML block inside diabloAdminSection: mode screen (LET'S PLAY), format select (Singles/Doubles), player setup with Cali option + buy-in, live scorecard (hole-by-hole), payout screen; plus flames toggle button and fixed flames container
- **Addition 3** — Full JS: diabloMoney state, showDiabloModeSelect, selectDiabloFormat, searchDiabloMoneyPlayer, addDiabloMoneyPlayer, setPlayerTeam, renderDiabloMoneyPlayerList, updateDiabloPot, startDiabloRound, renderDiabloHole, renderDiabloRunningTotals, diabloNextHole, showDiabloPayout, resetDiabloMoney, initDiabloFlames, toggleDiabloFlames
- **Addition 4** — initDiabloFlames() called inside renderDiabloPage() after loadDiabloPlayers()

### Features
- Singles: winner takes all from losers
- Doubles: Team 1 vs Team 2; Cali option (single or double buy-in for the odd player)
- 25-hole scorecard with running totals; leader highlighted in gold
- Payout screen shows winner name + $ amount + final scores
- Animated flames (18 randomized CSS-animated flames, fixed at bottom)
- Flames toggle button persists preference via localStorage

### Backup: backups/tags-2026-05-29.html (pre-edit, 148,512 bytes)
### Commit: feat: Diablo money match Singles/Doubles/Cali + animated flames toggle

## May 28, 2026 — El Diablo / Sparkmantown DGC League Added

### Supabase: 4 new tables created
- `diablo_players` — tag holders (columns: id, name, tag, joined_at)
- `diablo_events` — match events
- `diablo_match_history` — match results log
- `diablo_settings` — league config

### Supabase: 25 players seeded including #666 Jesse & GBear (legend) memorial

### tags.html: El Diablo tab added (7 surgical additions, no rewrites)
- Dark red / fire theme (`.diablo-*` CSS classes)
- 🔥 Diablo nav button (visible to logged-in users only)
- Tag ledger with search, sorted by tag (excluding #666)
- #666 Jesse & GBear permanent memorial card pinned to bottom
- Full match flow: Register Player → Enter Scores (par 50) → Assign New Tags
- Tiebreak rule: lower (better) tag wins
- Admin panel: Add Player to Diablo roster
- Cross-league player search (searches both Boulder + Diablo rosters)

### Backup: backups/tags-2026-05-28.html (pre-Diablo, 131,842 bytes)
### Commit: feat: El Diablo Sparkmantown tab added with full roster and #666 memorial

## CURRENT STATE (as of May 2026)

### Both sites are LIVE:

- boulderdiscgolf.com — landing page ✅
- boulder-disc-golf.vercel.app — tag app ✅


### What's working:

- Tag ledger loads 105 players from Supabase ✅
- Weather widget on event cards (NWS + Open-Meteo fallback) ✅
- Community notes with drag to reorder and inline edit ✅
- Match flow: register → scores → tag redistribution ✅
- Player self-score submission removed from home screen ✅
- Admin panel with tag assignment bulk editor ✅
- Season scheduler for recurring events ✅
- 47 recurring events (Wed 4PM + Sat noon) through Oct 2026 ✅
- Logo links back to boulderdiscgolf.com ✅
- Tag League App button in nav works ✅
- PWA install prompt mobile only ✅
- Persistent login via localStorage (Rob stays logged in) ✅
- Dynamic admin management with optional expiry dates ✅
- Under Construction banner removed ✅
- Landing page: joke hero image (hero_joke.jpg) ✅
- Landing page: Boulder, Colorado subtitle in white ✅
- Landing page: Longs Peak DGC feature card → lpdgc.org ✅
- Landing page: Colorado Disc Golf History card → pdga.com/history ✅
- Landing page: footer says "Est. 2014" ✅


### Known issues / pending:

- Weather widget icons: could upgrade to Meteocons (not urgent)

---

## RECENT CHANGES (newest first)

### May 26, 2026

- PERMANENT RULEBOOK added to top of CLAUDE.md: 11 golden rules for Cowork Claude sessions, role definitions (Browser Claude vs Cowork Claude), broken-link acknowledgment, and verified working baseline as of May 26 2026
- VERIFIED BASELINE (confirmed live in browser today): tags.html match flow works end-to-end (register → scores → Calculate Tags). index.html TAG LEAGUE APP links fixed to point to /tags.

### May 26, 2026

- DIAGNOSED + FIXED: TAG LEAGUE APP button in index.html was linking to https://boulder-disc-golf.vercel.app (the landing page root) instead of https://boulder-disc-golf.vercel.app/tags (the actual tag app). This created a circular loop — clicking the button just reloaded the landing page. Users could not reach the tag app via the button at all.
- ROOT CAUSE: Commit 102bbc4 (May 24) replaced index.html with Rob's landing_RESTORED.html, reverting the /tags URL fix that had been applied in commit e6191f5 (May 23).
- FIX: Updated all 3 TAG LEAGUE APP links in index.html to point to /tags.
- VERIFIED IN BROWSER: Clicked TAG LEAGUE APP button on live site — correctly opened https://boulder-disc-golf.vercel.app/tags. Tag app loaded. Match tab → added 2 players → Enter Scores → score input boxes appeared → scores saved with checkmarks → Calculate Tags button active. Full flow confirmed working.
- NOTE: index.html in the restored version is missing hero_joke.jpg (uses hero_enhanced.jpg instead) and is missing Dana Knight from board members. These appear to be intentional in Rob's landing_RESTORED.html — not changed.

### May 25, 2026

- fix: tags.html — added missing CSS classes (.score-status-item, .score-badge-done, .score-badge-pending, .score-done-val, .score-pending-input) that were referenced in JS but missing from CSS
- fix: index.html — Multiple Courses feature card now tap/click-expands to show 4 course links in a 2x2 grid

### May 25, 2026

- Fix tags.html: added missing CSS classes (.score-status-item, .score-badge-done, .score-badge-pending, .score-done-val, .score-pending-input) — these were referenced in JS but absent from the stylesheet, breaking score submission
- Restore index.html: replaced entirely with Rob's landing_RESTORED.html — exact copy, no changes


### May 24, 2026 (session setup)

- Added BACKUP PROTOCOL section to CLAUDE.md: before any edit to index.html or tags.html, create a dated backup in /backups/ and commit it first
- Added CRITICAL HTML SNIPPETS section to CLAUDE.md: exact HTML for Longs Peak feature card, Colorado Disc Golf History feature card, and both footer elements (Tech God credit + Est. 2014) — sourced from live index.html on this date
- Updated SESSION STARTUP CHECKLIST in CLAUDE.md: now includes explicit ordered steps (read CLAUDE.md, read STATUS.md, read live files from GitHub, verify critical snippets, fix anything missing, report findings)
- Updated bdg-session-start scheduled task to reflect new checklist


### May 24, 2026 (fix)

- commit 42a9c57: Fix three regressions in index.html
  * Board members updated to include Dana Knight
  * Multiple Courses feature card text fixed: replaced "Valmont Bike Park" + "Scott Carpenter Park" with correct current courses (Valmont DGC, Harlow Platts, East Interlocken, Wondervu, Coal Creek)
  * Fixed missing closing tag on Ace Pools feature card (broken HTML from prior edit)


### May 24, 2026

- commit 0f57675: Landing page overhaul
  * hero image changed to hero_joke.jpg
  * hero-sub and hero-elev text changed to white (rgba 255,255,255,0.95) with dark text-shadow for readability over joke image
  * Added Longs Peak Disc Golf Club feature card linking to lpdgc.org
  * Added Colorado Disc Golf History feature card linking to pdga.com/history
  * Footer updated from "Since 1989" to "Est. 2014"
- Tag app investigated: fully functional (105 players, 47 events, no JS errors)


### May 2026 (earlier)

- commit 102bbc4: Replaced index.html entirely with Rob's provided landing (9).html version
- Persistent login via localStorage: Rob and Shane stay logged in across sessions
- Dynamic admin management section (God panel): add admins with optional expiry
- Admin event list shows next 3 upcoming with "Show all" toggle
- Date display changed to MM/DD/YYYY throughout tags.html
- Tag number made optional when adding player
- Player search dropdown fix for mobile (pointerdown prevents default)
- Drag-to-reorder notes fixed for Android (document-level pointer listeners)
- Inline note editing fixed for Android devices
- CSS breakpoints added for 320/360/375/390/412/430/768/1024px
- iPhone landscape mode fixed (weather widget stacks)
- Score submission moved off home screen
- Under Construction banner removed
- 47 recurring events (Wed 4PM + Sat noon) created in Supabase through Oct 2026
- Added Coal Creek DGC to all course dropdowns, removed Scott Carpenter Park
- Valmont Bike Park DGC renamed to Valmont DGC everywhere

---

## NEXT UP (in priority order)

1. Weather widget icon upgrade to Meteocons (low priority)
