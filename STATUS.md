# STATUS.md — Boulder Disc Golf Project Status

# Update this file after EVERY change with date and what changed

---

## September 9, 2026 — Diablo pick grid orders by who played most recently

### Backup: backups/tags-2026-09-09.html (pre-edit) — committed separately

### Correction to yesterday's note

STATUS said grid ranking was blocked because nothing recorded who played or when. That was wrong. `startDiabloRound()` has always written a `diablo_money_matches` row containing the full player list plus a `created_at` timestamp, so the history was there the whole time. Confirmed against live data: 16 matches spanning 2026-05-29 to 2026-09-08, 18 distinct player names recoverable. No schema change was needed.

### What changed

Rob's ask was recency, not a leaderboard: whoever played most recently should drift to the visible chips, everyone else stays reachable by search. No cap — the roster is 31 and they all fit.

- New `diabloLastPlayed` map and `loadDiabloRecency()`, which reads the last 50 match rows and builds name → most recent `created_at`. Called from `openDiabloPlay()`
- `renderDiabloQuickGrid()` now sorts: **in this game first**, then **played most recently**, then **never played, by tag**. #666 still excluded
- `startDiabloRound()` stamps everyone in the round as played right now, so the ordering updates immediately instead of waiting for the next reload
- A player added through ADD SOMEONE NEW, or pulled in through search, is stamped too — so someone entered for the first time sits near the front rather than at the bottom with the never-played

Nothing is hidden and nothing is labelled. The order just reflects who has been around lately.

### Verification

- `node --check` — clean
- 12 automated assertions through a real DOM: recency order with mixed played/never-played, selected player jumping to the front regardless of history, a freshly stamped never-played player rising, #666 always excluded, empty recency falling back cleanly to tag order, null tags sorting last without throwing, and an apostrophe name still producing a parseable handler

### Commit: feat: Diablo pick grid orders by most recently played

## September 8, 2026 — Diablo Who's Playing: names, search, add (and the add-player bug)

### Backup: backups/tags-2026-09-08e.html (pre-edit) — committed separately

### THE BUG Rob reported

Adding a player and having them appear as a chip in Who's Playing never worked, and the reason is in the code, not the UI. `addDiabloPlayer()` (the top "Add Player to El Diablo" card) ends with `loadDiabloPlayers(); renderDiabloLedger('')` — it refreshes the **ledger** and never calls `renderDiabloQuickGrid()`. The new player was saved correctly and simply was not redrawn into the pick grid until something else happened to re-render it.

Fixed: `addDiabloPlayer()` now calls `renderDiabloQuickGrid()` too, and that function got a null guard so it is safe to call from anywhere.

### Screen order — now names, search, add

Per Rob: player chips first, then search, then add. Previously the grid was followed straight by "＋ Add a New Victim", with search buried inside that button's expanded row.

- **Chips** (unchanged position) — the roster, tap to toggle, #666 excluded
- **🔍 Search all players** — full-width box directly under the chips. Selecting a result now **adds that player to the game** via `toggleDiabloPlayer()`. Previously it only typed the name into the box and you still had to press Add
- **＋ ADD SOMEONE NEW** — collapsed one-line dropdown, same pattern as the Add Player card

### Guests are gone

`addDiabloGuestPlayer()` used to push `{guest: true}` into the current match only — never saved anywhere, so the person had to be retyped every single round. It now inserts into `diablo_players` (the real roster), reloads, re-renders both the ledger and the grid, and auto-selects them into the current game. One action instead of three, and they exist next time.

If the insert fails it degrades to adding them to this game only and says so, rather than silently losing them.

### Verification

- `node --check` — clean
- 21 automated assertions through a real DOM: element order proven by DOM position (search above add), old victim button gone, add form collapsed by default, search result lands in the game and clears the box, chip renders with its ✓, #666 stays out, a newly added name saves to the roster and appears as a *selected* chip, input clears and the form re-collapses, duplicates refused, and an apostrophe name (`Pat O'Brien`) renders a chip whose handler parses

### NOT DONE — needs Rob's decision

Grid ranking and trimming. Rob wants most-played / recently-played players surfaced and inactive ones pushed off, capped around 20-30. Blocked on a data problem, not a code problem: `diablo_players` has no last-played or play-count column, `diablo_player_stats` is empty, and the only participation record is the `players` JSON blob on 16 `diablo_money_matches` rows. Ranking cannot be built well until that data is being recorded.

### Commit: feat: Diablo Who's Playing reordered to names/search/add, new players save to the roster and auto-select

## September 8, 2026 — Diablo: Add Player collapsed, readability pass

### Backup: backups/tags-2026-09-08d.html (pre-edit) — committed separately

### 1. "Add Player to El Diablo" collapsed into a dropdown

That card sat directly above the money match section as a full expanded form (Name, PDGA #, Tag #, Add button), so tapping LET'S PLAY landed on it and it read as a required first step. It is now a single-line header with a chevron, collapsed by default, that expands on tap. All three fields and the `addDiabloPlayer()` wiring are unchanged inside it. The money match card is now the top of the view after LET'S PLAY.

The separate "＋ Add a New Victim" button inside the singles/doubles/tags setup screen is untouched — that is the one for adding someone mid-setup who is not in the system.

### 2. Readability pass — the real problem was contrast, not brightness

The Diablo section used `#8b0000` for nearly all label and detail text on `#1a0000` / `#0d0000` backgrounds. Measured: **2.01:1**. WCAG's minimum for body text is 4.5:1 and for large text 3:1, so this failed even the lenient threshold. It was not Rob's phone.

Raised via one appended CSS block (appended so it wins the cascade, original rules left intact):

- Label/detail text `#8b0000` → `#ff6a4d` — **2.01:1 → 7.11:1**
- Card titles `#cc2200` → `#ff5a33`, 18px → 19px — **3.64:1 → 6.48:1**
- Player/score/buy-in names → `#ffe4dd` at weight 600
- Mode buttons (SINGLES / DOUBLES / TAGS) → brighter text, stronger border
- Section titles and team buttons lifted to match

New `.diablo-eyebrow` class now used by MONEY MATCH, TAG MATCH and ACTIVE GAMES — Bebas Neue, 15px, wide tracking, glow. Previously these were 10px `#8b0000` monospace, which is what made them nearly invisible.

### Verification

- `node --check` — clean
- 12 automated assertions through a real DOM: form collapsed on load, header renders as a single line, all three fields and the add handler survive, toggle opens/closes and flips the chevron, plus computed WCAG contrast ratios confirming the new values clear AA and the old ones did not

### Commit: feat: collapse Diablo Add Player into a dropdown, raise text contrast across the Diablo section

## September 8, 2026 — Diablo: format screen first, active games listed underneath (max 2)

### Backup: backups/tags-2026-09-08c.html (pre-edit) — committed separately

### The problem

`checkForActiveMatch()` **replaced** the format card with a single "Active Game Found" screen. Tapping LET'S PLAY when any stale active match existed dropped Rob onto a resume prompt instead of the singles/doubles/tags options, which read as "you have to deal with this first." Because 16 money matches exist with status `active` (most of them abandoned mid-game while the scorecard was broken), this was happening nearly every time.

### The change

- LET'S PLAY now **always** lands on the format card. `openDiabloPlay()` hides setup/scorecard/payout and forces `diabloFormatScreen` visible before checking for active games
- Active games render **below** the format card as their own list, capped at 2 (`.limit(2)` plus a `.slice(0,2)` belt-and-braces). Each card shows format, roster, and hole X of Y, with Resume and an ✕ abandon button
- The list hides itself whenever the format card is not the visible screen, so it never trails along behind the setup or scorecard screens
- New `diabloActiveMatches` state, new `renderDiabloActiveGames()`, `resumeDiabloMatchById(id)`, `abandonDiabloMatchById(id)`
- The old markup block (`Active Game Found` card) was removed, and **`abandonAndNew()` and `startDifferentMatch()` were deleted** — they existed only to serve that block

### Note on the deletions

This is the first commit written under the rule Rob wants adopted: a session that replaces a feature deletes what it replaced, in the same commit. Both functions were verified to have zero remaining references before removal.

### Verification

- `node --check` on extracted inline JS — clean
- 16 automated assertions through a real DOM, all passing: empty state hides the list and leaves the format card alone; one game renders a singular header and one card with correct hole/format; two games render a plural header and two cards; the list hides when the format card is hidden and returns when it comes back; a resume handler built from a roster containing `Pat O'Brien` parses with no stray attributes; malformed players JSON degrades to "No players recorded" instead of throwing
- NOT yet tapped on a real phone

### Still open from this conversation

Rob also wants the "＋ Add a New Victim" button de-emphasised so it does not read as a required step. Not done in this commit — the active-games restructure was the specified priority and the session was near its usage limit.

### Commit: feat: Diablo play screen defaults to new game, active games listed below (max 2)

## September 8, 2026 — Overnight surgical pass: dead handlers, apostrophe names, UTC dates

Run unattended at Rob's request. Three independent surgical fixes, no features built, no behavior invented. Every item here was previously surfaced to Rob and either explicitly offered or reported in the code audit.

### Backup: backups/tags-2026-09-08b.html (pre-edit) — committed separately before edits

### New shared helpers (added above `showPage`)

- `attrStr(s)` — `JSON.stringify` plus `&quot;` escaping. The one canonical way to put a string into an inline HTML event attribute in this file. Null/undefined safe
- `localDateStr(d)` — `YYYY-MM-DD` in the browser's local timezone
- `localDateFromStr(s)` — parses `YYYY-MM-DD` as local midnight instead of UTC midnight

The two inline escapes shipped earlier today in `searchPlayer` / `searchPlayerModal` were converged onto `attrStr` so there is exactly one pattern in the file rather than two.

### FIX 1 — dead handlers and apostrophe-unsafe names (10 sites)

`selectPDGAResult` in the PDGA search-results dropdown had the same raw `JSON.stringify` breakage fixed in the Match page dropdown earlier today: the handler attribute was truncated at the first inner quote, so that dropdown was fully dead. Changed to `onmousedown` + `attrStr`.

Nine further sites interpolated player names into inline handlers with single quotes, which breaks on any name containing an apostrophe. All converted to `attrStr`:

- `removeRegistrant`, `saveTDScore` (Match page)
- `selectDiabloPlayer`, `removeDiabloRegistrant`, `saveDiabloScore`, `toggleDiabloPlayer` (x3), and the `diabloMoneyPlayerInput` value assignment (Diablo)

Effect: a player named O'Brien no longer breaks the remove button, the score field, or the Diablo player grid.

### FIX 2 — UTC date rollover (7 sites)

`new Date().toISOString().split('T')[0]` returns the UTC date. Boulder is UTC−6/−7, so after 6pm local it returns tomorrow. Wednesday Night League starts around sunset, so the TODAY badge, the "you're registered, head to the Match tab" prompt, and the Match tab's auto-detect all silently stopped matching the event that was actually happening, at exactly the moment people needed them.

All seven replaced with `localDateStr()`: `renderSplash` today, `initMatch` auto-detect, two admin paths, the weather widget, and the two history-row date writes (`diablo_match_history`, `diablo_money_history`).

Verified at TZ=America/Denver: 9:00 PM Wed Sep 9 2026 now yields `2026-09-09`; the old code yielded `2026-09-10`.

### FIX 3 — season scheduler generated every event one day late

`new Date('2026-07-04')` parses as UTC midnight, which is 6pm July 3 in Denver, so `getDay()` returned 5 (Friday) instead of 6 (Saturday). The loop then advanced to what it thought was the target day and converted back out through UTC, landing one day late on every generated event.

`generateSeasonSchedule` and the season countdown now use `localDateFromStr` for the start/end dates and `localDateStr` for the emitted date.

Verified: July 4 2026 now reports `getDay() === 6`. A full Saturday season generates 18 events, all on Saturdays; Wednesday generates 17, all on Wednesdays. Previously every one was off by a day.

### Verification

- `node --check` on the extracted inline JS — parses clean
- Automated tests at TZ=America/Denver, 31 assertions, all passing: local-date rollover at 8am / 9pm / 11:59pm, zero padding, season-start weekday, full Saturday and Wednesday season generation with every date checked against its target weekday, and handler escaping for `Kevin Bankson`, `Pat O'Brien`, `Ann "Ace" Diaz`, `José Ramírez`, `X & Y <b>` — each parsed through a real HTML parser, checked for stray attributes, and invoked to confirm the name arrives intact
- Note on the brace-balance check used in earlier entries: it drifts on this diff because it cannot see regex literals, and this change removes three `/"/g` literals and adds one. `node --check` is the authoritative check and is clean

### NOT DONE — deliberately left for Rob

- Bugs 8 through 11 in the master spec. These need product decisions, not just code, and were not built unattended
- Ace pool still charges a hardcoded $1 per player regardless of the configured amount. One line, but it changes money behavior, so it waits for a yes
- `commitResults` is still non-atomic with no confirmation dialog. Needs a Supabase RPC to do properly
- The Stats tab still cannot populate — `rounds` is never written by the live match flow
- Supabase still has no authentication or row-level security. Unchanged and still the most important open item

### Commits: fix: dead PDGA dropdown handler and apostrophe-unsafe names / fix: local date handling for today detection and season scheduler

## September 8, 2026 — Bug 7: mobile dropdown tap fix

### Backup: backups/tags-2026-09-08.html (pre-edit, 207,416 bytes) — committed separately before edits

### tags.html: 4 surgical replacements, all in dropdown item renderers. No other functions touched.

- `searchPlayer()` (Match page) — `onpointerdown` → `onmousedown`, name and PDGA number now interpolated with `JSON.stringify(x).replace(/"/g,'&quot;')`
- `searchPlayerModal()` — `onpointerdown` → `onmousedown`, name interpolation changed from `'${p.name}'` to the same attribute-safe `JSON.stringify` + `&quot;` escape
- `searchDiabloPlayer()` — `onpointerdown` → `onmousedown`
- `searchDiabloMoneyPlayer()` — `onpointerdown` → `onmousedown`

### VERIFIED ROOT CAUSE — differs from the reported diagnosis

The instruction attributed the dead dropdown to iOS Safari firing blur before pointerdown. That does not hold: there is no `onblur` handler anywhere in tags.html, so nothing hides the dropdown on blur.

Checked against the live site with the real 106-player roster. The Match page dropdown was dead because the handler attribute was truncated by the HTML parser. `searchPlayer` interpolated `${JSON.stringify(p.name)}` raw into a double-quoted attribute, so `onpointerdown="...selectPlayer("Kevin Bankson", 13, "190454")"` ended at the first inner quote. The live handler read exactly `event.preventDefault();selectPlayer(` — a syntax error — and the remainder of the name became stray DOM attributes (`kevin`, `bankson",`, `13,`). Broken on every device, not only mobile.

`searchPlayerModal` was NOT broken. Its single-quote interpolation parses fine inside a double-quoted attribute; it failed only on apostrophe names. Copying the Match page pattern into it verbatim, as instructed, would have broken it for every name.

### DEVIATION FROM INSTRUCTIONS (1)

Instructions said to make `searchPlayerModal` use `JSON.stringify` "like the Match page version does." The Match page version is the broken one. Used `JSON.stringify(name).replace(/"/g,'&quot;')` in both places instead — attribute-safe, and the actual fix for the reported symptom. The `onmousedown` change was applied to all four renderers exactly as specified.

### STILL OPEN — same defect, deliberately not fixed (outside the four named renderers)

- PDGA search-results dropdown (`selectPDGAResult`, inside `lookupPDGAName`) uses the same raw `JSON.stringify` interpolation and is fully dead for the same reason. One line
- `searchDiabloPlayer` and `searchDiabloMoneyPlayer` still interpolate names with escaped single quotes, so they break on apostrophe names. One line each
- Two `onpointerdown` note-edit buttons left as-is — buttons, not dropdown items, no blur interaction

### Verification

- Inline JS extracted and parsed with `node --check` — clean
- Brace/paren/bracket balance compared against the pre-edit backup — identical, zero delta
- Attribute-escaping tested through a real HTML parser against `Kevin Bankson`, `Pat O'Brien`, `Ann "Ace" Diaz`, `Jose Ramirez`: handler parses, no stray attributes, sibling `style` attribute intact, name passed through to the handler byte-for-byte in every case
- Pre-fix breakage confirmed on the live deployed site before editing
- NOT verified by tapping on a physical iPhone. If the dropdown still misbehaves on iOS after this, the next lever is delaying the dropdown hide rather than changing the event type

### Commit: fix: mobile dropdown tap bug — onmousedown replaces onpointerdown

## September 8, 2026 — Master spec: bugs 7-11 and Section 10

### BOULDER_DISC_GOLF_MASTER_SPEC.md only. No code changes in this commit.

- Section 1 — added BUG 7 (mobile dropdown tap, marked FIXED with the verified root cause and the three still-open sibling instances), BUG 8 (edit registrant after adding), BUG 9 (clear display of player count, ace pool, CTP), BUG 10 (end of match ace entry), BUG 11 (scoring order)
- Added SECTION 10 — SCORING ORDER: starting order by lowest PDGA number, reorder after each hole by previous-hole score, tie-break backward hole by hole, fall back to starting order, Announce Order button via `speechSynthesis`
- Section 10 placed after Section 9 rather than after the trailing BUILD ORDER and REMINDERS blocks, so the numbered sections stay contiguous
- Bugs 8 through 11 are spec text only — not built

### Commit: docs: add bugs 7-11 and scoring order to master spec

## September 7, 2026 — Bug Fixes: Diablo hole-wipe, doubles payout, nav highlighting

### Backup: backups/tags-2026-09-07.html (pre-edit, 206,471 bytes) — committed separately before edits

### tags.html: 13 surgical replacements across 3 bugs. No other functions or files touched.

**BUG 1 (CRITICAL) — Diablo hole-wipe.** Root cause: `diabloMoney.currentHole` was doing two jobs at once — "which hole is on screen" and "furthest hole reached." Going back to fix a past hole dragged the frontier backward with it, so tapping Next re-walked forward from there, inserting duplicate score rows and making resumed matches double-count.

Fix — added a separate `diabloMoney.frontierHole` tracking the furthest hole reached. `currentHole` is now purely the viewing hole.

- `diabloMoney` initializer + `closeDiabloPlay()` reset — added `frontierHole: 1`
- `startDiabloRound()` — sets `frontierHole = 1` alongside `currentHole = 1`
- `resumeDiabloMatch()` — sets `frontierHole = Math.max(1, currentHole || 1)` so a resumed match restores its real frontier (see DEVIATION below)
- `dscGoToHole(n)` — now allows any hole `1..frontierHole` (was: past holes only). Sets `currentHole` only, never `frontierHole`
- `dscReturnToCurrent()` — NEW function, jumps back to `frontierHole`
- `dscNextHole()` — saves only the viewed hole's score and recalculates totals. Advances `frontierHole` only when `currentHole === frontierHole`. When editing a past hole it saves that hole and returns to the frontier instead of advancing. Now deletes existing `diablo_money_scores` rows for that match+hole before inserting, so re-saving a corrected hole replaces its rows instead of duplicating them. `diablo_money_matches.current_hole` is bumped only when the frontier actually advances
- `renderDiabloScorecardOverlay()` — running totals and rel-to-par now measure against `frontierHole - 1` (holes actually confirmed) so totals stay stable while looking back; hole dots render "done" for every hole below the frontier and are clickable up to and including it (previously dots 3-7 went blank the moment you jumped back to hole 2, which is what "all the scores are gone" looked like on the course); the Next button reads "Save & Return to Hole X" when viewing a past hole; a "↩ Return to Current (Hole X)" button appears in the footer while viewing a past hole

**BUG 2 — Doubles payout math.** The `isDoubles` branch in `showDiabloPayout()` read player-shaped fields (`p.cali`, `p.team`, `p.name`) off `diabloMoney.scores`, which holds team-shaped objects (`teamKey`, `teamName`, `players`, `isCali`, `buyinMultiplier`) after `startDiabloRound()` builds them. Every team collapsed into one `undefined` bucket, `payoutPerWinner` resolved to exactly $0, and `undefined` player names were written into `diablo_money_history` and `diablo_player_stats`.

Fix — replaced the entire `isDoubles` branch. Each entry in `scores` IS a team: `s.teamName` for the label (with " (Cali)" appended when `s.isCali`), `s.total` for the score, `s.players` for the roster, `buyin * (s.isCali ? (s.buyinMultiplier || 1) : 2)` for pot contribution. Loser filtering now compares object identity rather than label text, so two teams sharing a name can no longer merge. Singles branch untouched.

**BUG 3 — Nav tab highlighting.** `showPage()`'s label map had no entry for the Stats or Diablo tabs, so tapping either left no tab highlighted.

- `const labels = { splash:'Home', ledger:'Tags', match:'Match', admin:'Admin' };`
- → `const labels = { splash:'Home', ledger:'Tags', match:'Match', stats:'Stats', diablo:'🔥 Diablo', admin:'Admin' };`

### DEVIATION FROM INSTRUCTIONS (1)

Instructions said to initialize `frontierHole` to 1 in both `startDiabloRound` and `resumeDiabloMatch`. Taken literally, that breaks resume: `checkForActiveMatch()` restores `currentHole` from the database, so resuming a match on hole 12 with `frontierHole = 1` would leave the frontier behind the viewing hole — every dot unclickable and the button reading "Save & Return to Hole 1." Used `Math.max(1, currentHole || 1)` instead, which preserves the intent without the regression.

### Verification

- Inline JS extracted and parsed with `node --check` — clean
- Brace/paren/bracket balance compared against the pre-edit backup — identical, zero delta
- Automated logic tests, 21 assertions, all passing: frontier advance, back-navigation leaving other holes intact, editing a past hole changing only that hole and recalculating totals, return-to-frontier behavior, forward-jump guard, single-hole delete-then-insert, no `current_hole` bump when editing a past hole, round finish
- Automated payout tests: 3 even teams ($30 pot → $10 each to 2 winners), Cali in the field at 1x buy-in ($25 pot → $7.50 each), Cali team winning ($15 pot → $10), singles branch unchanged. No `undefined` anywhere in the output
- NOT verified in a live browser on the course — the logic is tested, the on-device feel is not

### Commit: fix: Diablo hole-wipe, doubles payout, nav highlighting

## May 29, 2026 — Diablo Full Rebuild (LFP header, devil bg, resume, stats, last win)

### Supabase SQL (needs manual run — Supabase dashboard did not load in browser):
Run this SQL manually in the Supabase SQL editor at https://supabase.com/dashboard/project/mewwizubdwfgvrhiylur/sql/new
Tables to create: diablo_money_matches, diablo_money_scores, diablo_money_history, diablo_player_stats
(See backups/tags-2026-05-29c.html commit message for full SQL)

### tags.html: 6 surgical additions/replacements:
- Addition 1 — New CSS: devil bg, sticky header, LFP button pulse, header flame animation, last win card, stats row styles
- Addition 2 — diablo-page div gets devil SVG background + sticky header (EL DIABLO title + LFP button + flame icon)
- Addition 3 — Last Big Win card + Player Stats card inserted before #666 memorial
- Addition 4 — Full diabloModeScreen rebuild: format select (Tags/Singles/Doubles), quick player grid tap-to-select, guest add, team assign, resume mid-game screen, scorecard, payout
- Addition 5 — Complete JS rewrite of money match functions: openDiabloPlay, closeDiabloPlay, checkForActiveMatch, resumeDiabloMatch, abandonAndNew, selectDiabloFormat, renderDiabloQuickGrid, toggleDiabloPlayer, addDiabloGuestPlayer, checkCaliNeeded, renderDiabloSelectedPlayers, setDiabloTeam, setCaliMultiplier, updateDiabloPot, searchDiabloMoneyPlayer, startDiabloRound (saves to DB), diabloNextHole (saves per hole), showDiabloPayout (saves history + updates player stats), loadDiabloLastWin, loadDiabloStats
- Addition 6 — loadDiabloLastWin() + loadDiabloStats() called in renderDiabloPage after loadDiabloPlayers()

### Backup: backups/tags-2026-05-29c.html (pre-edit, 172,337 bytes)
### Commit: feat: Diablo full rebuild — LFP header, devil bg, resume mid-game, stats, last win

## May 29, 2026 — Doom Fire Canvas Algorithm (flames upgrade)

### tags.html: 1 surgical replacement (CSS + JS, no other changes)
- Replaced CSS `.flame` div + `@keyframes flicker` with `#diabloFireCanvas { display: block; }`
- Replaced `initDiabloFlames()` CSS-div approach with canvas-based Doom fire algorithm
- Added `startDoomFire(canvas)`: 120×60 pixel fire simulation, 256-color heat palette, spreadFire spread algorithm, requestAnimationFrame loop, `_stopFire`/`_startFire` handles for toggle
- Updated `toggleDiabloFlames()` to stop/start canvas animation on toggle (no wasted rAF when hidden)
- Backup: backups/tags-2026-05-29b.html
### Commit: fix: replace CSS div flames with Doom fire canvas algorithm

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

## May 29, 2026 — UnifrakturMaguntia blackletter font, LFP uncensored, flames removed

### tags.html: 12 surgical changes
- Added UnifrakturMaguntia Google Font (blackletter) alongside Bebas Neue
- Deleted .diablo-toggle-flames CSS rules
- Replaced .diablo-lfp-btn with UnifrakturMaguntia version (animated pulse, glow, uncensored text)
- LFP button text uncensored: "LET'S F***ING PLAY" → "LET'S FUCKING PLAY"
- Applied UnifrakturMaguntia as primary font to 7 Diablo display elements: .diablo-sticky-title, .diablo-hero h1, .diablo-section-title, .diablo-card-title, .diablo-hole-num, .diablo-payout-winner, .diablo-last-win-winner
- Deleted flames toggle button HTML + diablo-flames-container HTML
- Deleted 3 JS functions: initDiabloFlames, startDoomFire, toggleDiabloFlames
- Removed initDiabloFlames() call from renderDiabloPage()
- Deleted .diablo-flames-container CSS rules + #diabloFireCanvas CSS
- Net: -3268 bytes (185,891 → 182,623 bytes)

### Backup: backups/tags-2026-05-29d.html (pre-edit, 185,891 bytes)
### Commit: feat: UnifrakturMaguntia blackletter font, LFP uncensored, flames removed

## May 29, 2026 — LFP button in hero card, MedievalSharp titles, sticky header removed

### tags.html: 8 surgical changes (11 sub-changes)
- Change 1: Google Fonts — UnifrakturMaguntia swapped for MedievalSharp
- Change 2: All 8 UnifrakturMaguntia font-family occurrences replaced with Bebas Neue
- Change 3: .diablo-hero h1 → font-family: MedievalSharp (overrides Bebas Neue)
- Change 4: .diablo-section-title → font-family: MedievalSharp
- Change 5: .diablo-lfp-btn replaced — smaller (15px, 8px padding), tighter border, adds :hover rule
- Change 6: Deleted diablo-sticky-header HTML div entirely
- Change 7: diablo-hero div gets flex layout + LFP button moved inside hero card
- Change 8: Deleted .diablo-sticky-header, .diablo-sticky-title, .diablo-header-flame CSS rules
- Net: -839 bytes (182,623 → 181,784 bytes)

### Backup: backups/tags-2026-05-29e.html (pre-edit, 182,623 bytes)
### Commit: fix: LFP button in hero card, MedievalSharp titles, remove sticky header

## May 29, 2026 — LFP button nesting fixed, 666 to bottom, angled rain

### tags.html: 4 surgical changes (6 sub-changes)
- Change 1: diabloModeScreen moved OUTSIDE diabloAdminSection — was nested inside display:none admin div (bug: LFP button did nothing). Add Player button now properly closes admin card, new diabloMoneySection sits at page level. Includes new diabloPlayAnchor section title.
- Change 2: #666 Jesse & GBear memorial moved from above Tag Ledger to below it (after diabloTagList), with margin-top:12px
- Change 3: Added @keyframes rainDrift + .rain-drop CSS; replaced 2 static rain span |||s with 3 animated rain-drop spans in nwsEmoji function
- Change 4: openDiabloPlay() now smoothly scrolls to diabloPlayAnchor after opening the mode screen
- Net: +427 bytes (181,784 → 182,211 bytes)

### Backup: backups/tags-2026-05-29f.html (pre-edit, 186,776 bytes)
### Commit: fix: LFP button nesting fixed, 666 to bottom, angled rain

## May 29, 2026 — Diablo always-visible format selector, money first, back buttons, remove match manager

### tags.html: 9 surgical changes
- Change 1: Deleted entire diabloMatchSection block (-3740 bytes) — old match manager removed
- Change 2: diabloMoneySection — modeScreen now always visible (no display:none), diabloPlayAnchor is a 1px spacer div, section title removed
- Change 3: diabloFormatScreen restructured — MONEY MATCH (Singles/Doubles) first, TAG MATCH second; removed old 🔥 card title
- Change 4: Setup screen ← Back button now calls backToDiabloFormat() instead of closeDiabloPlay()
- Change 5: openDiabloPlay() — removed show/hide of modeScreen, just calls checkForActiveMatch() + scroll
- Change 6: closeDiabloPlay() — removed hide of modeScreen, resets sub-screens and state only
- Change 7: Added backToDiabloFormat() function — hides sub-screens, shows format screen, resets format/players
- Change 8: Abandon Round button now shows confirm('Abandon this round?') dialog before closing
- Change 9: Payout screen Done→ Play Again 🔥 + added ← Back to Game Select button
- Net: -3104 bytes (182,211 → 179,107 bytes)

### Backup: backups/tags-2026-05-29g.html (pre-edit, 187,203 bytes)
### Commit: feat: Diablo always-visible format selector, money first, back buttons, remove match manager

## May 29, 2026 — Doubles team lock+randomize flow, Sparkman Bros DGC, hero subtitle pop

### tags.html: 7 surgical changes (8 sub-changes)
- Change 1: Hero subtitle — "SPARKMANTOWN DGC" → "SPARKMAN BROS DGC", added orange glow style (color:#ff6600, text-shadow, letter-spacing:3px, font-weight:600)
- Change 2: renderDiabloSelectedPlayers — full replacement with 3-phase doubles flow: (1) add players + show Lock btn, (2) after lock: team assignment with Randomize/Reset + T1/T2/CALI buttons, (3) singles/tags: unchanged flow
- Change 3: Added 3 new functions: lockDiabloPlayers() (locks roster, auto-Cali on odd count), clearTeams() (resets team assignments), randomizeTeams() (24-frame flicker animation then shuffles teams)
- Change 4: Added 🔒 LOCK IN PLAYERS → button (id=diabloLockBtn, hidden by default) to setup screen HTML
- Change 5: diabloMoney state — added teamsLocked: false
- Change 6: teamsLocked reset to false in both closeDiabloPlay() and backToDiabloFormat()
- Change 7: teamsLocked reset in selectDiabloFormat()
- Net: +3658 bytes (179,107 → 182,765 bytes)

### Backup: backups/tags-2026-05-29h.html (pre-edit, 184,082 bytes)
### Commit: feat: doubles team lock+randomize flow, Sparkman Bros DGC, hero subtitle pop

## May 29, 2026 — Fix renderDiabloPage crash on diabloMatchSection

### tags.html: 1 surgical fix
- renderDiabloPage() was calling getElementById('diabloMatchSection').style.display which crashed since diabloMatchSection was deleted. Replaced with safe null-checked adminSection reference only.
- diabloMatchSection references: 0 remaining in file

### Backup: backups/tags-2026-05-29i.html (pre-edit, 187,755 bytes)
### Commit: fix: remove diabloMatchSection reference that was crashing renderDiabloPage

## May 29, 2026 — Brighter El Diablo title, subtitle smaller, LFP wider, resume screen 3 options

### tags.html: 5 surgical changes
- Change 1: .diablo-hero h1 CSS — color #cc2200 → #ff3300, double glow text-shadow (rgba(255,51,0,0.7) + rgba(204,34,0,0.4))
- Change 2: Subtitle inline style — font-size:13px → font-size:11px
- Change 3: Hero div — title div gets flex-shrink:0; LFP button wrapped in flex:1 centered div with padding-right:8px; button gets padding:8px 28px (wider)
- Change 4: Resume screen — 2 side-by-side buttons → 3 full-width vertical buttons: ▶ Resume Game, + Start Different Match, ✕ Abandon & Delete
- Change 5: Added startDifferentMatch() function — pauses match without deleting, returns to format screen
- Net: +747 bytes (182,747 → 183,494 bytes)

### Backup: backups/tags-2026-05-29j.html (pre-edit, 187,737 bytes)
### Commit: feat: brighter El Diablo title, subtitle smaller, LFP wider, resume screen 3 options

## May 29, 2026 — Larger El Diablo title, 666 memorial red+white, hellfire background

### tags.html: 3 surgical changes
- Change 1: .diablo-hero h1 font-size 36px → 48px
- Change 2: .diablo-memorial CSS — dark #0a0000 bg with red border+glow; #666 tag: 56px bright red (#ff3300) with double text-shadow; names: white with red glow; sub: red; added .memorial-sub rule
- Change 3: .diablo-page background — Unsplash hellfire image (photo-1516912481808) with dark rgba overlay (0.92/0.95), cover fixed
- Net: +443 bytes (183,494 → 183,937 bytes)

### Backup: backups/tags-2026-05-29k.html (pre-edit, 188,488 bytes)
### Commit: feat: larger El Diablo title, 666 memorial red+white, hellfire background

## May 29, 2026 — Doubles multi-team bucket flow, correct payout math, T1-T6 teams

### tags.html: 6 surgical changes
- Change 1: renderDiabloSelectedPlayers — full rewrite: non-doubles path simplified; doubles bucket phase shows player count + odd/Cali warning; locked phase shows T1-T6+CALI buttons per player, team summary header, RANDOMIZE/Reset row
- Change 2: randomizeTeams — now assigns pairs into T1/T2/T3... (floor(i/2) mapping); cali players untouched; 24-frame flicker animation unchanged
- Change 3: updateDiabloPot — doubles: each non-cali player ×2 buyin per team; cali uses buyinMultiplier; display shows multiplier detail
- Change 4: lockDiabloPlayers — calls updateDiabloPot() after locking; cleaned up auto-cali logic
- Change 5: showDiabloPayout isDoubles branch — teamLabel uses t.toUpperCase() for T1/T2/T3 etc; pot math: each player contributes 1x buyin to team pot (2x total per pair); loserPot = total - winnerContrib; payoutSub shows score + per-winner amount
- Change 6: T3/T4/T5/T6 team button selected CSS added; cali selected updated to #444 bg / #888 border
- Net: +1693 bytes (183,937 → 185,630 bytes)

### Backup: backups/tags-2026-05-29l.html (pre-edit, 188,931 bytes)
### Commit: feat: doubles multi-team bucket flow, correct payout math, T1-T6 teams

## May 29, 2026 — Unlimited doubles teams, Wikimedia lava background

### tags.html: 3 surgical changes
- Change 1: .diablo-page background — Unsplash URL replaced with Wikimedia lava flow image (Kilauea); overlay lightened slightly (0.88/0.93)
- Change 2: randomizeTeams() — now uses 't' + (floor(i/2)+1) so teams are t1/t2/t3... with no hardcoded limit; handles any number of players
- Change 3: renderDiabloSelectedPlayers — team buttons now dynamic: numTeams = ceil(nonCali/2), shows numTeams+2 buttons so there's always 2 extras; replaces hardcoded ['t1'..'t6']
- Net: +196 bytes (185,630 → 185,826 bytes)

### Backup: backups/tags-2026-05-29m.html (pre-edit, 190,634 bytes)
### Commit: fix: unlimited doubles teams, Wikimedia lava background

## May 29, 2026 — Fix doubles team buttons to exact count

### tags.html: 1 surgical fix
- renderDiabloSelectedPlayers: teamNamesArr length changed from numTeams+2 to numTeams — shows exactly the right number of team buttons, no extra caps

### Backup: backups/tags-2026-05-29n.html
### Commit: fix: doubles team buttons match exact player count, no cap

## May 29, 2026 — CSS hell background (fire demon smoke effect)

### tags.html: 1 surgical change
- .diablo-page background: Wikimedia lava URL removed entirely; replaced with 5-layer pure CSS radial-gradient hell effect — two side ember glows (rgba 180,0,0), top smoke darkening, center void (rgba 0,0,0,0.9), bottom lava glow, base linear dark-red gradient
- No external image dependency — fully CSS

### Backup: backups/tags-2026-05-29o.html
### Commit: feat: CSS hell background replicating fire demon smoke effect

---

## May 29, 2026 — Hell Team Names (200+), Dynamic Naming, Unlimited Pairs

### tags.html: 7 surgical changes (commit 892e6e8):
- Change 1 — Added DIABLO_TEAM_NAMES array (200+ hell/demon/mythology names) + teamNameMap: {} to diabloMoney state
- Change 2 — randomizeTeams() now uses 'team1'/'team2'/etc keys and auto-picks unique random hell names into teamNameMap
- Change 3 — renderDiabloSelectedPlayers teamsLocked branch: team buttons now display hell name from teamNameMap (not 'T1'/'T2')
- Change 4 — setDiabloTeam() auto-assigns hell name to teamNameMap when a team is manually assigned for first time
- Change 5 — closeDiabloPlay() and backToDiabloFormat() both reset teamNameMap: {}
- Change 6 — showDiabloPayout() teamLabel uses teamNameMap[p.team] if available
- Change 7 — renderDiabloRunningTotals() team label uses teamNameMap[p.team] if available

---

## May 30, 2026 — Background fix, flame emoji, remove auto-cali popup

### tags.html: 4 surgical changes (commit af6634b):
- Change 1 — .diablo-devil-bg: position fixed → absolute so hell gradient CSS shows through; opacity 0.04 → 0.06
- Change 2 — .diablo-hero::after flame emoji: right 16px → 12px, font-size 60px → 72px, opacity 0.15 → 0.55, added drop-shadow glow filter
- Change 3a — toggleDiabloPlayer(): removed checkCaliNeeded() call — no more auto-cali popup while tapping players
- Change 3b — addDiabloGuestPlayer(): removed checkCaliNeeded() call — same fix for guest add flow

---

## May 30, 2026 — Doubles flow: clean team cards, Cali 1x/2x, no team buttons (commit b36f540)

### tags.html: 6 surgical changes:
- Change 1 — lockDiabloPlayers(): sets caliPlayer, clears teamNameMap/teamAssignments, no toast
- Change 2 — renderDiabloSelectedPlayers(): full rewrite — bucket phase shows player count + odd warning; locked phase shows Cali 1x/2x card + big RANDOMIZE button before teams; after randomize shows clean hell-name team cards + Cali card + Re-Randomize + START ROUND
- Change 3 — randomizeTeams(): builds teamAssignments array [{name, players, key}], flicker animation on player names, then reveals team cards
- Change 4 — setCaliMult(mult) added; clearTeams() now resets teamAssignments + teamNameMap
- Change 5 — diabloMoney state gets teamAssignments:[] and caliPlayer:null
- Change 6 — closeDiabloPlay() and backToDiabloFormat() both reset teamAssignments/caliPlayer

---

## May 30, 2026 — Fix dice emoji unicode in randomize button (commit below)

### tags.html: 1 surgical fix:
- Fixed \U0001f3b2 literal string → real 🎲 emoji in RANDOMIZE TEAMS button inside renderDiabloSelectedPlayers

---

## May 30, 2026 — Cali random shuffle, gets hell name, red matching style (commit 22983e0)

### tags.html: 3 surgical changes + 2 bonus fixes:
- Change 1 — lockDiabloPlayers(): clears ALL players' cali/team state on lock (no pre-assignment)
- Change 2 — randomizeTeams(): shuffles ALL players including future Cali; last player of odd group becomes Cali and gets their own unique hell name; Cali pushed into teamAssignments with isCali:true
- Change 3a — renderDiabloSelectedPlayers forEach: filters out isCali entries so Cali doesn't render twice
- Change 3b — Cali card replaced: now shows hell name in red (same style as teams), CALI label below, 1x HALF / 2x FULL buttons in matching red style
- Bonus: Re-Randomize button emoji fixed (was \U0001f3b2 literal string)

---

## May 30, 2026 — Fix setCaliMult to update teamAssignment (commit below)

### tags.html: 1 surgical fix:
- setCaliMult(): now updates both player.buyinMultiplier AND teamAssignments cali entry so 1x/2x buttons re-render correctly

---

## May 30, 2026 — Scorecard +/- buttons, grey default 2, orange on activate (commit fb6e4bf)

### tags.html: 4 surgical changes:
- Change 1 — Added .diablo-score-default and .diablo-score-active CSS classes
- Change 2 — renderDiabloHole(): replaced text inputs with +/− buttons + big tappable score display; defaults to grey 2, shows hell team name label; activates orange on tap/adjust
- Change 3 — Added activateDiabloScore(idx) and adjustDiabloScore(idx, delta) functions
- Change 4 — diabloNextHole(): reads from dhole_N_display dataset instead of input values; untouched scores default to 2; recalculates totals via reduce

---

## May 30, 2026 — Add a New Victim button (commit 4235a02)

### tags.html: 2 surgical changes:
- Change 1 — HTML: replaced inline guest input row with dashed "＋ Add a New Victim" button; input row hidden by default inside collapsible div; input has Enter key handler
- Change 2 — JS: added toggleDiabloGuestInput() to show/hide row + auto-focus; addDiabloGuestPlayer() now collapses row after adding

---

## May 30, 2026 — Fullscreen scorecard overlay (commit d6772e8)

### tags.html: 4 surgical changes:
- Change 1 — CSS: added 25 new .dsc-* classes for fullscreen scorecard overlay (fixed inset:0, z-index:150, team rows, score controls, hole dots, running total chips)
- Change 2 — startDiabloRound(): builds team-based scores array from teamAssignments for doubles; calls showDiabloScorecard() instead of showing diabloScorecardScreen
- Change 3 — Replaced renderDiabloHole/adjustDiabloScore/activateDiabloScore/diabloNextHole/renderDiabloRunningTotals with new functions: showDiabloScorecard, hideDiabloScorecard, renderDiabloScorecardOverlay, dscActivate, dscAdjust, dscGoToHole, dscNextHole. Old stubs kept for compatibility.
- Change 4 — resumeDiabloMatch(): calls showDiabloScorecard() instead of old scorecard screen

---

## June 1, 2026 — Relative-to-par scoring, birdie/bogey labels, E for even

### Commit: 92b0957 — "feat: relative-to-par scoring, birdie/bogey labels, E for even"

### tags.html: 4 surgical changes:
- Added fmtRelPar(strokes, holesPlayed) — returns 'E', '+N', or '-N' relative to par (par=2 per hole)
- Added scoreLabel(strokes) — returns hole label: Birdie, Par, Bogey, Double Bogey, etc.
- renderDiabloScorecardOverlay: added holesPlayed var, running totals now show rel-par (E/+N/-N), team total header shows rel-par
- Score control in overlay shows scoreLabel below the score number

### Live verified:
- fmtRelPar(0,0)='E', fmtRelPar(1,1)='-1', fmtRelPar(4,2)='E' ✓
- scoreLabel(1)='Birdie', scoreLabel(2)='Par', scoreLabel(3)='Bogey' ✓


## June 12, 2026 — Added Fable 5 workflow section to CLAUDE.md

- Appended FABLE 5 + COWORK WORKFLOW (June 2026) section to the bottom of CLAUDE.md. No other changes.
- Commit: docs: add Fable 5 workflow section
## June 14 2026
- Fix .diablo-page background: added position:relative, overflow:hidden, isolation:isolate to CSS; removed inline style="position:relative;" from div
- Fix FINISH ROUND button: corrected emoji escape from \U0001f525 (Python) to \uD83D\uDD25 (JS)
- Fix right-side scorecard totals: now show relative to par (E/+1/-1) via fmtRelPar(), with dynamic font size
