# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **What this repo builds:** Hire Grounds, a coffee chat prep tool for MBA students. It turns a saved resume, personal stories, a contact's background, and optional LinkedIn PDFs into an outreach email, 5 questions, and 1- and 2-minute intros. It also includes a chat tracker.
- **Primary user & core workflow:** NYU Stern MBA students preparing for coffee chats. Set up a profile once on the **Your profile** page (`/profile`): resumes, stories, and LinkedIn. Then on the **Coffee chat prep** page (`/`), choose your resume for this chat, enter the contact (and optionally their LinkedIn PDF), optionally pick a tone for the intros, and click Generate. Track people on the **Chat tracker** page (`/chats`). Full PRD in `docs/index.html`.
- **Where data lives:** each visitor's profile and tracker are saved **in their own browser** (`localStorage`). The server stores nothing. It reads PDFs in memory and calls Claude. Sign-in and a database are planned for Build 5.
- **Tech stack:** Node.js / Express (`app/server.js`) / plain HTML, CSS, JS (`app/public/`) / Claude API via the official `@anthropic-ai/sdk`. The model is set in `app/config.js`. Hosted on Render (free web service). Analytics: PostHog (`app/public/analytics.js` and the `<head>` of `docs/index.html`). Security: `helmet` headers and `express-rate-limit`.

## 2. Commands
- **Install dependencies:** `npm install` (in Windows PowerShell: `npm.cmd install`)
- **Run locally:** copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, then `npm start` (PowerShell: `npm.cmd start`) and open http://localhost:3000
- **Run locally while editing code:** `npm run dev` (PowerShell: `npm.cmd run dev`) restarts the server automatically when server code changes.
- **Dependency audit:** `npm audit` (fix any high-severity issues before shipping)
- **Run deterministic tests:** none yet
- **Run model evals:** none yet (Build 4)

## 3. Non-Negotiable Engineering Rules
1. **Plan before coding:** Before touching multiple files, propose a brief plan and wait for approval.
2. **Small batches:** Make small, focused changes that can be reviewed and explained by a human in a single Pull Request.
3. **Explainability:** Avoid unnecessary abstractions or dependencies. Help the human builder understand the main components, what changed, why it matters, what could break, and how it was checked.
4. **Verify changes:** Run relevant checks. For a reproducible logic bug, use a failing test to demonstrate the fix when practical. Record manual checks and known limitations; follow the selected Build 4 evaluation track.
5. **Zero secrets in code:** Never hardcode API keys, tokens, or credentials. Always read from environment variables (`.env` locally, Render's Environment settings when hosted) and update `.env.example` when new variables are needed.
6. **Stop when looping:** If a fix fails twice in a row, stop, summarize what failed, and ask the human before trying a third approach.

## 4. Ask Me First
Stop and get Jackson's explicit OK in the chat before doing any of these. Approval for one action doesn't carry over to the next.
- **Deleting or overwriting data:** clearing anyone's saved profile or tracker, deleting files in `app/data/`, changing the browser storage keys or format (`hireGrounds.*` in `localStorage`), or any destructive git command (`reset --hard`, force push, deleting branches).
- **Database changes**, if one is added later: creating, altering, or dropping tables, changing Row Level Security, or running migrations against production.
- **Keys, secrets, and permissions:** creating, rotating, reading, or pasting API keys; changing Render environment variables; changing GitHub repo, org, or app permissions; changing PostHog project settings.
- **Anything that costs money:** real Claude API calls (each Generate costs about $0.05 to $0.10), changing the model to a pricier one, raising rate limits or the daily ceiling, changing the Claude Console spending cap, or upgrading the Render plan (the free instance is the default; the paid one is $7/month).
- **Deploying or changing the live site** on Render.

## 5. Hire Grounds Rules
- The model name lives only in `app/config.js`, and so do the rate limits (`RATE_LIMITS`).
- Read the API key from the environment on the server. Never hardcode it or send it to the browser.
- The PostHog project key (`phc_...`) in `app/public/analytics.js` and `docs/index.html` is a public client key by design: it can only send events. It is the one allowed exception to rule 5. Never add a PostHog personal API key.
- Personal data stays in the visitor's browser. Don't add server routes that store profiles, resumes, or tracker entries without sign-in, a real database with Row Level Security, and Jackson's OK.
- Keep `/api/local-import` disabled when hosted (it returns 404 when `RENDER` or `NODE_ENV=production` is set). It exists only to move data an older version saved on the laptop into the browser.
- Keep the per-visitor rate limits on every route that calls Claude or reads PDFs, and the daily ceiling on Claude calls.
- Never commit `.env`, `data/`, or uploaded resumes. Uploaded PDFs are read in memory and never saved.
- Generated output may use only facts from the resume, personal stories, LinkedIn PDF text, and contact info. LinkedIn URLs are never sent to Claude. Keep the email under 120 words.
- Tone only changes word choice and feeling in the two intros; it never adds facts. Keep the intros as labeled segments (`added: true` for anything not from the inputs) so the page can highlight them. A custom tone (anything not in `TONE_SUGGESTIONS`) must pass the tone check before generating.
- Keep session replay masking (`maskAllInputs`, `maskTextSelector: '*'`) and the `ph-no-capture` classes on resume cards and AI output, so personal data and generated text never reach PostHog.
- Insert user and AI text with `textContent`, never `innerHTML`.
- Keep the cost log printed for each generation. Do not log resume or contact content.
- Keep `TODO.md` current: add new requests, and check items off (with the date) when they ship.

### Rules learned from real mistakes
- **Check the diff size before committing.** On Nov 10 the agent edited `docs/index.html` with a script that left one stray carriage return, and Git showed all 270 lines as changed. If a small edit shows a whole file as changed, fix the line endings first (`git diff --stat`, then check for lone `\r`).
- **Save data-format upgrades immediately.** On Nov 14 the agent upgraded old single-resume profiles on read without saving, so the upgraded resume got a new ID on every read and editing it failed with "no longer exists." Any upgrade that creates IDs must be saved right away.
- **Restart the server after server changes.** On Nov 15–21 a server left running on old code made the Your profile tab show "page not found." Use `npm run dev` locally, and redeploy on Render after pushing server changes.
- **Match test selectors exactly.** On Nov 22 a test picked the card containing "PM resume," which also matched "Tech PM resume," and edited the wrong one. Match full names in tests.

## 6. Project Structure

```
.
├── app/                     Hire Grounds app
│   ├── server.js            Express server: security headers, rate limits, PDF reading, tone check, prompt, Claude call, cost log
│   ├── config.js            Model name, reasoning effort, prices for the cost log, email word limit, tone suggestions, rate limits
│   ├── data/                Old local saves (profile.json, chats.json), only read for the one-time import. Gitignored
│   └── public/              Browser files served by the server
│       ├── profile.html     "Your profile" page (/profile): resumes, stories, your LinkedIn, Continue button
│       ├── profile.js       Profile page behavior: resume list and editor, About you, saves before Continue
│       ├── index.html       "Coffee chat prep" page (/): your resume for this chat, contact, tone, results
│       ├── prep.js          Prep page behavior: their LinkedIn, tone chips and pushback, Generate, highlights, Copy
│       ├── chats.html       "Chat tracker" page (/chats): stats, search, filters, people grouped by status
│       ├── chats.js         Tracker behavior: add, edit, delete, Prep for this chat (links to /?chat=<id>)
│       ├── common.js        Shared helpers: browser storage, tracker validation, PDF reading, one-time import, API calls, nav
│       ├── analytics.js     PostHog setup (US project) and the track() helper for named events
│       └── styles.css       Design
├── docs/                    Public Product Page (GitHub Pages, from main /docs)
│   ├── index.html           Pitch, living PRD, build log, PostHog snippet
│   └── assets/              Screenshots (fictional sample data only)
├── journal/, Intent.md, Plan.md, SPONSOR_MEMO.md, tests/   Class template files
├── SECURITY.md              Build 3 security audit: what was checked, found, and fixed
├── TODO.md                  Living to-do list
├── .env.example             Placeholder for ANTHROPIC_API_KEY (copy to .env)
├── package.json             Dependencies, Node version (engines), start and dev scripts
└── README.md                Class overview and local setup
```

**Data flow:** the browser keeps the profile and tracker in `localStorage`. On **Generate prep**, it sends the chosen resume's text, personal stories, your LinkedIn text, the contact's details, their optional LinkedIn PDF text, and the tone to `POST /api/generate`. For a custom tone, the server first asks Claude whether it's coherent and professional; if not, it returns HTTP 422 with a reason and suggested tones, and nothing is generated. Otherwise it builds the prompt with strict fact rules and calls Claude with a fixed JSON output format, where the intros come back as segments labeled `added` or not. It checks the email length (asking Claude once to shorten it if needed), returns the sections, and prints token counts and estimated cost. Nothing is stored on the server. A new visitor with no resume is redirected from `/` to `/profile?setup=1`.

**Server API:**
- `POST /api/extract-pdf` reads a PDF (resume or LinkedIn export) in memory and returns its text. Nothing is saved. Rate limited.
- `GET /api/tones` returns the default tone, the suggested tones, and the tone limit.
- `POST /api/generate` runs one generation, including the tone check for a custom tone. Rate limited and counted toward the daily ceiling.
- `GET /api/local-import` returns data an older version saved on this laptop, for a one-time move into the browser. Local only (404 when hosted).

**Useful settings (environment variables):** `ANTHROPIC_API_KEY` (required), `NODE_ENV=production` on the host, `PORT` (default 3000; Render sets it), `HOST` (defaults to `127.0.0.1` locally and `0.0.0.0` when hosted), and `DATA_DIR` (where the old local saves are read from).

## 7. Setup and Run, Step by Step (local)
1. Install Node.js 20.16 or newer.
2. Clone the repo and open a terminal in its root folder.
3. `npm install` (PowerShell: `npm.cmd install`).
4. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`), then set `ANTHROPIC_API_KEY` to a key from the Claude Console.
5. `npm run dev` (PowerShell: `npm.cmd run dev`), then open http://localhost:3000.
6. On first visit you land on **Your profile**: add a resume (and optionally stories and your LinkedIn), then click **Continue to coffee chat prep**. Fill in a contact, optionally pick a tone, and click **Generate prep**. The terminal prints each run's tokens and cost.
7. Stop the server with Ctrl+C.

## 8. Shipping (deploy to Render)
The app runs on Render as a free Node web service built from the `main` branch of `building-with-ai-f26/jl7969-hiregrounds`. Deploying and changing environment variables are on the **Ask me first** list.

**Before every deploy**
1. `npm audit`: no high-severity issues.
2. Search for secrets: `git grep -nE 'sb_secret_|service_role|sk-or-|sk-ant-|sk-proj-|sk_live_'`. Only the `.env.example` placeholder should appear.
3. Test locally with `npm run dev`: profile setup, Generate prep, and the chat tracker.
4. Commit and push to `main`.

**First-time setup (already done once; repeat only for a new service)**
1. On Render: **New +**, then **Web Service**, then pick the `jl7969-hiregrounds` repo (GitHub connected).
2. Settings: Language **Node**, Branch **main**, Root Directory blank, Build Command `npm ci`, Start Command `npm start`, Region **US East (Ohio or Virginia)**, Instance Type **Free**.
3. Environment variables: `ANTHROPIC_API_KEY` (Jackson types it in; never paste it into chat or code) and `NODE_ENV=production`.
4. Click **Deploy web service** and wait for "Live." The URL looks like `https://<name>.onrender.com`.
5. In PostHog, add the Render URL to the project's authorized domains.

**Every deploy after that**
1. Push to `main`. Render redeploys automatically (or click **Manual Deploy**, then **Deploy latest commit**).
2. Watch the deploy log until it says "Live."

**After every deploy (smoke test)**
1. Open the live URL on a phone: profile setup, then Generate prep (one real Claude call, about $0.10), then add the person to the Chat tracker.
2. Check that `/api/local-import` returns 404 on the live site.
3. Check PostHog Activity for pageviews from the live URL and that session replay records.
4. Rollback if something breaks: in Render, open **Events** and click **Rollback** on the last good deploy (or revert the commit and push).
