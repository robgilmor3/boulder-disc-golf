# CLAUDE.md — Boulder Disc Golf Project

# READ THIS BEFORE DOING ANYTHING ELSE

## SESSION STARTUP CHECKLIST — RUN THIS EVERY TIME

Every session must do these things **in order** before any other work:

1. Read this entire CLAUDE.md file
2. Read STATUS.md to see what was last changed
3. Read live index.html from GitHub: https://raw.githubusercontent.com/robgilmor3/boulder-disc-golf/refs/heads/main/index.html
4. Read live tags.html from GitHub: https://raw.githubusercontent.com/robgilmor3/boulder-disc-golf/refs/heads/main/tags.html
5. Verify all CRITICAL HTML SNIPPETS are present in index.html (see CRITICAL HTML SNIPPETS section below):
   - Longs Peak feature card with onclick window.open lpdgc.org
   - Colorado Disc Golf History feature card with onclick window.open pdga.com/history
   - Footer div: ⚡ Built by Rob Gilmore — Tech God ⚡
   - Footer logo span with Boulder, Colorado · Est. 2014
6. Also verify these items in index.html:
   - Hero image is hero_joke.jpg
   - hero-sub and hero-elev CSS use rgba(255,255,255,0.95) and text-shadow: 0 2px 8px rgba(0,0,0,0.9)
   - Board members line includes Dana Knight
   - Multiple Courses feature card does NOT mention "Scott Carpenter Park" or "Valmont Bike Park"
   - All feature card </div> closing tags are present (check HTML structure)
7. Fix anything missing before proceeding with Rob's request — commit the fix first
8. Report to Rob what was found and what (if anything) was fixed

There is also a Cowork scheduled task called **bdg-session-start** that automates this check.

---


## HOW TO START EVERY SESSION

1. Read this entire file first
2. Read STATUS.md to see what was last changed
3. Fetch the current live code before making any changes:
  - Landing page: https://raw.githubusercontent.com/robgilmor3/boulder-disc-golf/refs/heads/main/index.html
  - Tag app: https://raw.githubusercontent.com/robgilmor3/boulder-disc-golf/refs/heads/main/tags.html
4. Make ONLY the changes Rob asked for — nothing else
5. Update STATUS.md after every single change with date and what you did
6. Never "improve" things that weren't asked about

---


## BACKUP PROTOCOL

Before making ANY change to index.html or tags.html, always create a dated backup first:

1. Copy the current file to index_backup_YYYY-MM-DD.html or tags_backup_YYYY-MM-DD.html
2. Place the backup in a folder called /backups/ in the repo
3. Commit the backup BEFORE making any changes to the original file
4. Only then proceed with the requested edits

Example: before editing index.html on May 24 2026, first commit /backups/index_backup_2026-05-24.html with message "backup: index.html before [description of change]", then make the edits in a separate commit.

This rule applies to ALL edits — even tiny ones. No exceptions.

---


## CRITICAL HTML SNIPPETS

These elements MUST always be present in index.html with exact text. Verify on every session startup (step 5 of the SESSION STARTUP CHECKLIST). If any are missing or altered, restore immediately before doing any other work.

### 1. Longs Peak Disc Golf Club feature card

```html
<div class="feature-card" style="cursor:pointer" onclick="window.open('https://www.lpdgc.org','_blank')">
  <div class="feature-icon">⛰️</div>
  <div class="feature-title">Longs Peak Disc Golf Club</div>
  <div class="feature-body">Sister club serving the Longmont/Boulder County area. Great community, great courses. (Boulder County)</div>
</div>
```

### 2. Colorado Disc Golf History feature card

```html
<div class="feature-card" style="cursor:pointer" onclick="window.open('https://www.pdga.com/history','_blank')">
  <div class="feature-icon">📜</div>
  <div class="feature-title">Colorado Disc Golf History</div>
  <div class="feature-body">Boulder is where it all started — the PDGA was born here in 1976. Explore the full history of disc golf in Colorado and beyond.</div>
</div>
```

### 3. Footer — Tech God credit + Est. 2014

The footer must contain both of these elements:

```html
<div class="footer-logo">
  Boulder Disc Golf
  <span>Boulder, Colorado · Est. 2014</span>
</div>
```

```html
<div style="text-align:center;margin-bottom:10px;font-family:Barlow Condensed,sans-serif;font-size:13px;letter-spacing:2px;color:#3DDC6E">⚡ Built by Rob Gilmore — Tech God ⚡</div>
```

Key strings to grep for during verification:
- Boulder, Colorado · Est. 2014
- ⚡ Built by Rob Gilmore — Tech God ⚡
- lpdgc.org
- pdga.com/history

---


## WHAT THIS PROJECT IS

Boulder Disc Golf Tag League — a web app for managing disc golf bag tag matches in Boulder, CO. Built and run by Rob Gilmore (Tech God). The tag app is the core product. The landing page is the marketing front door.

---


## LIVE URLS

- Landing page: https://boulderdiscgolf.com (index.html)
- Tag app: https://boulder-disc-golf.vercel.app (tags.html)
- GitHub repo: https://github.com/robgilmor3/boulder-disc-golf (PUBLIC)
- Supabase project: https://mewwizubdwfgvrhiylur.supabase.co

---


## TECH STACK

- Frontend: Single HTML files only — frameworks, no build step
- Database: Supabase (PostgreSQL), free tier
- Hosting: Vercel — auto-deploys from GitHub main branch on every commit
- Domain: boulderdiscgolf.com via Namecheap DNS → Vercel

---


## FILE STRUCTURE

- index.html = landing page (boulderdiscgolf.com)
- tags.html = tag app (boulder-disc-golf.vercel.app)
- hero_enhanced.jpg = background photo for landing page
- vercel.json = Vercel routing config
- CLAUDE.md = this file
- STATUS.md = living changelog
- /backups/ = dated backups of index.html and tags.html (see BACKUP PROTOCOL)

---


## ADMIN CREDENTIALS (tag app)

- God Admin: username rob password boulder1
- Admin: username shane password bdgc1

---


## DATABASE (Supabase)

Tables: players, events, notes, match_history, settings, rounds

- players: id, name, pdga, tag (integer), role, last_change, match_count, best_tag
- events: id, title, course, date, time, cancelled, registered (jsonb), ace_per_player, entry_fee
- notes: id, content, created_at
- settings: key, value (used for ace_pool_balance, note_order)

---


## TAG LEAGUE RULES (DO NOT BREAK THIS LOGIC)

- ~350 tags in circulation, #1 is best
- After a match, tags redistribute: best score gets lowest tag number
- Tiebreaker: if two players tie on score, player with BETTER (lower number) incoming tag keeps the better outgoing tag
- Tags only redistribute among tags brought to that specific match

---


## COURSES (correct list — do not add others without Rob's permission)

- Valmont DGC (main course)
- Harlow Platts Community Park
- East Interlocken Park
- Wondervu DGC
- Coal Creek DGC


## DO NOT INCLUDE THESE COURSES (removed by Rob)

- Scott Carpenter Park — NOT a disc golf course
- Valmont Bike Park DGC — wrong name, use "Valmont DGC"

---


## DESIGN RULES — DO NOT CHANGE THESE

- Tag app: dark green color scheme (#0a0f0d background, #3DDC6E green, #F0C040 gold)
- Landing page: dark background, orange (#F5742A) and green (#3DDC6E) accents
- Hero image: hero_enhanced.jpg — Flatirons sunset with disc golf basket
- Boulder Disc Golf title sits in upper portion of hero image in the sky/clouds area
- BOULDER, COLORADO subtitle is dark/black so it reads against the mountains
- Elev · 5,430 ft line below that
- Tag League App button is green, top right corner of nav, links to https://boulder-disc-golf.vercel.app
- Footer credit: ⚡ Built by Rob Gilmore — Tech God ⚡

---


## KNOWN WORKING FEATURES (do not break)

- Supabase connection with hardcoded keys in tags.html
- Weather widget using NWS API with Open-Meteo fallback
- Event cards with weather side by side (flex row layout)
- Community notes with drag to reorder and inline edit
- Tag ledger with player search
- Match flow: register → scores → auto tag redistribution
- Player self-score submission
- PWA install prompt (mobile only)
- Logo links back to boulderdiscgolf.com

---


## WHAT IS NOT BUILT YET

- Hole-by-hole scoring
- Bluetooth/WebRTC offline sync
- The Caddy Engine (disc recommendations)
- Real PDGA authentication (currently demo credentials)
- Push notifications
- boulderdiscgolf.com/tags routing (tag app lives at vercel URL directly)

---


## ROB'S RULES FOR COWORK

1. Read the live GitHub code BEFORE making changes — never assume you know what's there
2. Make ONLY what was asked — do not "improve" other things
3. Update STATUS.md after every commit
4. Never change the Supabase credentials
5. Never change the tag redistribution logic
6. One clean commit per task — do not bundle unrelated changes
7. If unsure about something, stop and ask Rob before proceeding
8. Do not revert changes that are already working
9. Always follow BACKUP PROTOCOL before editing index.html or tags.html
