# Boulder Disc Golf — Master Spec
# Date: September 7, 2026
# Author: Rob Gilmore (via Browser Claude)
# Purpose: Single source of truth for Claude Code. Read this before touching anything.

---

## SECTION 1 — BUG FIXES (DO THESE FIRST)

These are surgical. Find the exact code, fix only what's specified, commit each one.

### BUG 1 — DIABLO HOLE-WIPE (CRITICAL)

Current behavior: if you're on hole 7 and tap hole 2 to correct a score, holes 3-7 get wiped. All scores gone, unrecoverable.

Required behavior: every hole's score is locked into memory the moment the "next hole" button is clicked. Navigating to any previous hole opens it for editing but does NOT touch any other hole's stored score. Editing a past hole changes only that hole and recalculates running totals. All other holes remain exactly as they were.

Additional requirements:
- Clicking any hole number dot jumps to that hole for viewing/editing
- A "return to current" button takes you to the first unconfirmed hole (if hole 7 was confirmed via next button, go to hole 8; if hole 7's next button hasn't been clicked yet, go to hole 7)
- Previously confirmed scores are immutable unless you explicitly navigate to that hole and change the number
- This applies to BOTH the overlay scorecard (renderDiabloScorecardOverlay) and the older step-based scorecard (renderDiabloHole) if it still exists

Root cause is likely in dscNextHole() and/or the scorecard rendering — when navigating backward it probably re-initializes the scores array or overwrites entries. Fix the data persistence, not just the UI.

### BUG 2 — DOUBLES PAYOUT MATH

In showDiabloPayout(), the doubles branch reads player-shaped objects (p.cali, p.team, p.name) but diabloMoney.scores contains team-shaped objects (teamKey, teamName, players, isCali) after startDiabloRound builds them. Every team collapses into one bucket and payout math is wrong.

Find this in showDiabloPayout:
```
if (isDoubles) { const teams = {}; diabloMoney.scores.forEach(p => {
  const key = p.cali ? 'cali_' + p.name : p.team;
```

Replace the entire isDoubles branch so it reads team objects correctly:
- s.teamName or s.name for the label
- s.total for the score
- s.players for the player list
- s.isCali for Cali status
- buyin * (s.isCali ? (s.buyinMultiplier || 1) : 2) for pot contribution (2 players per team)

### BUG 3 — NAV TAB HIGHLIGHTING

Line 1511: `const labels = { splash:'Home', ledger:'Tags', match:'Match', admin:'Admin' };`

Change to: `const labels = { splash:'Home', ledger:'Tags', match:'Match', stats:'Stats', diablo:'🔥 Diablo', admin:'Admin' };`

### BUG 4 — LFP BUTTON

Verify openDiabloPlay() actually fires when the button is tapped. The function exists and scrolls to diabloPlayAnchor. If the anchor element doesn't exist in the DOM when the Diablo page renders, that's the bug. Confirm it works after the other fixes land.

### BUG 5 — #666 MEMORIAL POSITION

Move the diablo-memorial div (the #666 memorial block) from its current position above the tag ledger to below the last tag row in the Diablo ledger. Order should be: hero card, last big win, stats, tag ledger rows, then #666 memorial at the bottom.

### BUG 6 — RAIN ANIMATION ANGLE

In the weather widget on the Home tab, rain drops currently fall straight down. Add a slight sideways angle to simulate wind-blown rain. CSS transform with a slight rotation or translateX drift on the animation keyframes.

---

## SECTION 2 — TAG OVERRIDE ON REGISTRATION

When a player registers for a match, their current tag number auto-populates from the ledger. They can change it.

### Flow:
1. Player taps their tag number field, types a new number
2. Confirmation prompt appears: "Tag #14 is currently held by [Mike Johnson]. Are you sure you want to claim this tag?"
3. Player confirms
4. The player's tag updates to the new number in the ledger
5. The displaced player (Mike) gets a dash (—) as their tag number
6. Mike's tag stays as a dash until he registers for his next match and enters his current tag number manually

### Edge cases:
- If the displaced person is also registering for this same match, they get the prompt immediately to enter their new number
- If a cascade happens (player A takes B's tag, B enters C's tag), each step triggers its own confirmation
- If a player enters a tag number that nobody currently holds, no displacement — just update their tag

### Admin override:
- Admins have a slider setting: no confirmation / minimal confirmation / full confirmation
- This controls the admin's own experience when overriding tags in the admin panel
- Admin can always change any player's tag regardless of the slider

---

## SECTION 3 — SIDE MATCHES

An informal tag match between 2+ players that happens outside a scheduled event.

### Rules:
- Any registered player can start a side match
- Course can be: selected from the existing course list, manually typed in, or left as "unspecified"
- Timestamped with date and time automatically when created
- Tag redistribution uses the exact same logic as a regular match (lowest score gets lowest tag, tiebreaker: better incoming tag wins)
- Ace pool does NOT apply to side matches
- CTP does NOT apply to side matches

### Data saved:
- Date, time, course (or unspecified)
- All players, their incoming tags, scores, and outgoing tags
- Full scorecard if they choose to score hole-by-hole (optional — they can also just enter total scores)

### History:
- Side matches appear in a separate tab/section from official match history
- When a player changes their tag at registration (Section 2), if it was from a side match scored in the app, that side match record is linked

---

## SECTION 4 — ACE POOL

A rolling pot of money that pays out when someone throws an ace (score of 1 on a hole) during a sanctioned match. Does not apply to side matches or Diablo.

### Two-pot system:
- Main pot: the active pool that pays out. Capped per course (example: $100 at Valmont). Cap amount is configurable per course by admin.
- Holding pot: overflow. When money comes in and the main pot is at its cap, the excess goes here. When the main pot pays out, the holding pot replenishes the main pot up to the cap. If the holding pot doesn't have enough to fully replenish, whatever is there goes in and the main pot sits below cap until more entry fees arrive.

### Money in:
- Fixed per-player opt-in fee per sanctioned match, set by admin at the course level
- Amount can vary ($1, $2, $5, etc.) and the TD can change it match to match
- Opt-in: players choose whether to buy into the ace pool when registering. They can opt into ace pool, CTP, both, or neither.

### Payout — shares system:
- One ace = one share
- Two aces by the same player in one round = two shares
- Total pot divided by total shares = payout per share
- Each player gets paid per share they earned
- Example: pot $100, three aces by three different players = $33.33 each
- Example: pot $100, two players ace, one of them aced twice = 3 shares, $33.33 per share, one player gets $66.67, other gets $33.33

### Hole modifiers (course-level rule):
- Specific holes can have payout modifiers. At Valmont, hole 5 pays half (0.5 shares instead of 1).
- A hole-5 ace earns 0.5 shares. The math still uses the shares system — the unpaid portion stays in (or returns to) the main pot.
- Example: pot $100, only ace is on Valmont hole 5. Player gets $50 (0.5 shares). $50 stays in main pot. Holding pot then tops up main pot if possible (but it's already at $100, so holding pot stays where it is).
- Example: pot $100, three aces — one on hole 5 (0.5 shares), two on other holes (1 share each). Total shares = 2.5. Per share = $40. Hole 5 player gets $20. Others get $40 each. Total payout = $100. Main pot goes to zero. Holding pot replenishes.
- Hole modifiers are admin-configurable per course. Default is 1.0 (full share) for all holes.

### Course-level admin rules:
- Cap amount (or uncapped)
- Whether this course shares an ace pool with another course
- Per-hole modifier overrides
- Default buy-in amount
- All rules persist match to match unless TD makes a temporary or permanent change

### Display:
- Ace pool balance shown in the registration area for the upcoming match at that course
- Number grows visibly as more players opt in and add to it
- If courses share a pool, both show the same balance

### Payout method:
- TD's call — Venmo, cash, or any other method. TD has full override on payment decisions.

### Future (not this build):
- Progressive ace pools (pay more, get a bigger share)

---

## SECTION 5 — CTP (CLOSEST TO THE PIN)

Separate pool from the ace pool. Specific holes picked by TD each match.

### Rules:
- Multiple CTP holes per match allowed
- Opt-in: players choose at registration whether to buy into CTP (independent of ace pool opt-in)
- One winner per CTP hole per match
- Physical flag system at the course — players measure, stick flag, write name. Last group brings in the flag. TD enters winner name in app.

### Cash vs Prize mode:
- Toggle per CTP hole: cash or prize
- If cash: show running dollar total on registration page, grows as more players opt in
- If prize: show number of players signed up for CTP, plus a text field for the TD to describe the prize

### CTP entry amount:
- Can vary per match, set by TD

### History:
- CTP winners tracked per match per hole
- Stored: date, course, hole number, winner name, cash amount or prize description

### Display:
- CTP pool info shown on registration page alongside ace pool
- Each CTP hole listed with its current pot (cash mode) or player count (prize mode)

---

## SECTION 6 — SCORING HANDOFF

One scorer at a time per Diablo money match.

### Flow:
1. Player A is scoring on their phone
2. Player B opens the same match on their phone
3. App detects an active scorer already exists
4. Prompt to Player B: "Shane is currently scoring this match. Request to take over?"
5. Player B confirms
6. Player A gets a prompt: "Rob wants to take over scoring. Allow?"
7. Player A confirms
8. Scoring control transfers to Player B. All scores, current hole, running totals transfer intact. Player B picks up exactly where Player A left off.

### Technical:
- active_scorer field on the diablo_money_matches table tracks who has control
- Match state (scores, current hole) is already saved to Supabase per hole, so the new device reads current state
- Both-confirm required (prevents accidental takeovers)

---

## SECTION 7 — MATCH HISTORY

### Official history tab:
- List of past sanctioned matches
- Each entry: date, course, number of players, winner (lowest tag earned), match type
- Expandable to show full results: every player's score, incoming tag, outgoing tag, tag movement
- Searchable by player name

### Side match / stats tab:
- Side matches scored through the app: date, time, course, players, scores, tag changes
- Tag change log: any time a player's tag changed via registration override (Section 2), logged with timestamp and reason (side match reference if available, or "manual override" if not)
- Player stats: matches played, wins, average score, best tag achieved, ace count, CTP wins
- We can dial in the exact stats later — build the data capture now so nothing is lost

---

## SECTION 8 — COURSE & SCORING DATA MODEL

### Per-course config (admin):
- Course name
- Number of holes (can vary by layout)
- Par per hole (stored as an array — for now Valmont is all 3s, Diablo is all 2s, but the array structure supports mixed pars for future layouts)
- Ace pool rules (cap, shared pool, hole modifiers, default buy-in)
- CTP defaults

### Future (not this build):
- Multiple layouts per course (different tee pads, pin placements, 9/18/27 hole configs)
- Layout selection at match creation with popular layouts sorted to top
- Hole-by-hole scoring in main tag matches (not just Diablo)
- Per-hole par pulled from DGCourseReview data

### Scoring defaults:
- Scorecard starts every player at par for each hole
- Player only needs to tap up or down from par
- If they don't touch it, par is assumed and auto-entered when moving to next hole

---

## SECTION 9 — REGISTRATION DISPLAY

The match registration page for an upcoming sanctioned match should show:
- Match info: date, time, course
- Ace pool balance for that course (grows as players opt in)
- CTP holes with pot amount (cash) or player count (prize) and prize description
- List of registered players with their tag numbers
- Each player shows: opted into ace pool (yes/no), opted into CTP (yes/no)
- Entry fee amounts clearly displayed (match fee, ace pool fee, CTP fee — all separate)

---

## BUILD ORDER RECOMMENDATION

1. Bug fixes (Section 1) — surgical, independent, de-risk existing functionality
2. Tag override (Section 2) — foundational for everything else
3. Side matches (Section 3) — players need this immediately
4. Ace pool (Section 4) — money is involved, get the math right
5. CTP (Section 5) — lighter lift, similar patterns to ace pool
6. Scoring handoff (Section 6) — quality of life
7. Match history (Section 7) — data capture first, display polish later
8. Course data model updates (Section 8) — future-proofing

---

## REMINDERS FOR CLAUDE CODE

- Read CLAUDE.md before every session
- Read STATUS.md to see what was last changed
- Fetch the live raw file from GitHub before making any changes
- Make ONLY the changes specified — do not improve other things
- Back up files before editing
- Update STATUS.md after every commit
- One clean commit per task
- If unsure, stop and ask Rob
