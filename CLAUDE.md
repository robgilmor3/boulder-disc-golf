# CLAUDE.md — Permanent Instructions for Boulder Disc Golf Repo

Read this file at the start of every session before making any changes.

---

## What This Project Is

A disc golf tag league web app for Boulder Disc Golf Club (Boulder, CO).
- Players hold numbered tags; lower = better rank
- Weekly matches at local courses; players swap tags based on finish
- Public landing page + a full Tag League App (login, registration, scoring, stats, admin)

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Hosting:** Vercel (auto-deploys from GitHub `main` branch)
- **Backend:** Supabase (project ID: `mewwizubdwfgvrhiylur`)
  - Anon/publishable key lives in tags.html — safe for browser use
  - Supabase JS client v2 loaded via CDN
- **Key files:**
  - `index.html` — public landing page (~720 lines)
  - `tags.html` — full Tag League App (~2500+ lines)
  - `STATUS.md` — changelog (update after EVERY change)
  - `CLAUDE.md` — this file

---

## Live URLs

| Page | URL |
|------|-----|
| Landing page | https://boulder-disc-golf.vercel.app |
| Tag League App | https://boulder-disc-golf.vercel.app/tags |

---

## Supabase Schema (events table)

```
id, date (date), time (text, e.g. "16:00"), title (text), course (text),
cancelled (bool), registered (jsonb array of {name, tag, score, score_by, score_at}),
ace_per_player (numeric), ace_pool_total (numeric), ace_pool_cap (numeric), host (text)
```

**Recurring schedule loaded:** Wed 4PM + Sat 12PM @ Valmont DGC, May 23 – Oct 31 2026 (47 events)

---

## Course Names (use exactly as shown)

- `Valmont DGC` ← always use this, never "Valmont Bike Park DGC"
- `Harlow Platts Community Park`
- `East Interlocken Park`
- `Wondervu DGC`

**COURSE_COORDS in tags.html:**
```js
'Valmont DGC': {lat:40.0150, lon:-105.2316}
```

---

## Coding Preferences

- **Minimal diffs** — surgical edits only; never rewrite sections that don't need changing
- **Always validate JS** before committing: extract script tags → check with `node --check`
- **No frameworks** — keep it vanilla HTML/CSS/JS
- **Mobile-first** — Rob uses a Samsung Galaxy Fold; test tap targets and layout at mobile widths
- **CSS transitions** — use `max-height` for expand/collapse effects
- **Touch detection** — use `window.matchMedia('(hover: none)')` not user-agent sniffing
- **Commit messages** — be specific: say what file and what changed
- **Never change** the Supabase URL or anon key
- **Never remove** existing functionality unless Rob explicitly asks
- **Weather cache key** — currently `wx4_`; bump to `wx5_`, `wx6_` etc. only if forcing a fresh fetch

---

## What NOT to Touch

- Supabase URL / anon key
- Service worker / manifest files (if present)
- The `COURSE_COORDS` lat/lon values unless Rob provides new ones
- Any file Rob hasn't mentioned — don't "clean up" things proactively

---

## GitHub Workflow

```bash
TOKEN=$(cat /sessions/*/mnt/outputs/.github_token)
cd /tmp/bdg2  # or clone fresh if not present
git config user.email "gilmoremail@gmail.com"
git config user.name "Rob Gilmore"
git add <files>
git commit -m "<specific message>"
git push https://$TOKEN@github.com/robgilmor3/boulder-disc-golf main
```

The GitHub token is saved at: `/sessions/*/mnt/outputs/.github_token`
Read it fresh each session — don't hardcode it.

---

## MANDATORY: Update STATUS.md After Every Change

Every time you commit anything to this repo, add a new entry at the TOP of the
"Recent Changes" section in STATUS.md with:
- Today's date
- Which file(s) changed
- What changed and why

Then include STATUS.md in the same commit. No exceptions.

---

## Rob's Working Style

- Rob often works in Claude.ai, perfects changes there, then pastes one-liner instructions here to push to GitHub
- Instructions arrive as "One paste for Cowork:" followed by exact instructions
- Follow instructions exactly — don't add unrequested features or change unrelated things
- When Rob uploads an HTML file and says "replace exactly", do a byte-for-byte copy — no modifications
- Rob is in Mountain Time (America/Denver, UTC-6/7)
- If something isn't working, check STATUS.md git history and the actual file before guessing
