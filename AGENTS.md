# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **What this repo builds:** Hire Grounds, a local coffee chat prep tool for MBA students. It turns a saved resume, personal stories, a contact's background, and optional LinkedIn PDFs into an outreach email, 5 questions, and 1- and 2-minute intros.
- **Primary user & core workflow:** NYU Stern MBA students preparing for coffee chats. Save one or more resumes once, then for each contact choose a resume, enter their details (and optionally their LinkedIn PDF), and click Generate. Full PRD in `docs/index.html`.
- **Tech stack:** Node.js / Express (`app/server.js`) / plain HTML, CSS, JS (`app/public/`) / Claude API via the official `@anthropic-ai/sdk`. The model is set in `app/config.js`. Analytics: PostHog (`app/public/analytics.js` and the `<head>` of `docs/index.html`).

## 2. Commands
- **Install dependencies:** `npm install` (in Windows PowerShell: `npm.cmd install`)
- **Run locally:** copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, then `npm start` (PowerShell: `npm.cmd start`) and open http://localhost:3000
- **Run deterministic tests:** none yet
- **Run model evals:** none yet (Build 4)

## 3. Non-Negotiable Engineering Rules
1. **Plan before coding:** Before touching multiple files, propose a brief plan and wait for approval.
2. **Small batches:** Make small, focused changes that can be reviewed and explained by a human in a single Pull Request.
3. **Explainability:** Avoid unnecessary abstractions or dependencies. Help the human builder understand the main components, what changed, why it matters, what could break, and how it was checked.
4. **Verify changes:** Run relevant checks. For a reproducible logic bug, use a failing test to demonstrate the fix when practical. Record manual checks and known limitations; follow the selected Build 4 evaluation track.
5. **Zero secrets in code:** Never hardcode API keys, tokens, or credentials. Always read from environment variables (`.env`) and update `.env.example` when new variables are needed.
6. **Stop when looping:** If a fix fails twice in a row, stop, summarize what failed, and ask the human before trying a third approach.

## 4. Hire Grounds Rules
- The model name lives only in `app/config.js`.
- Read the API key from the root `.env` on the server. Never hardcode it or send it to the browser.
- The PostHog project key (`phc_...`) in `app/public/analytics.js` and `docs/index.html` is a public client key by design: it can only send events. It is the one allowed exception to rule 5. Never add a PostHog personal API key.
- Never commit `.env`, `data/` (saved profile), or uploaded resumes. Uploaded PDFs are read in memory and never saved.
- Generated output may use only facts from the resume, personal stories, LinkedIn PDF text, and contact info. LinkedIn URLs are never sent to Claude. Keep the email under 120 words.
- Keep session replay masking (`maskAllInputs`, `maskTextSelector: '*'`) and the `ph-no-capture` classes on resume cards and AI output, so personal data and generated text never reach PostHog.
- Keep the cost log printed for each generation. Do not log resume or contact content.

## 5. Project Structure

```
.
├── app/                     Hire Grounds local app
│   ├── server.js            Express server: profile and resume APIs, PDF reading, prompt, Claude call, cost log
│   ├── config.js            Model name, reasoning effort, prices for the cost log, email word limit
│   ├── data/                Saved profile (profile.json). Gitignored; created on first save
│   └── public/              Browser files served at http://localhost:3000
│       ├── index.html       Page layout: profile (resumes, stories, LinkedIn), contact form, results
│       ├── app.js           Page behavior: resume list and editor, LinkedIn fields, Generate, Copy, events
│       ├── analytics.js     PostHog setup (US project) and the track() helper for named events
│       └── styles.css       Design
├── docs/                    Public Product Page (GitHub Pages, from main /docs)
│   ├── index.html           Pitch, living PRD, build log, PostHog snippet
│   └── assets/              Screenshots (fictional sample data only)
├── journal/, Intent.md, Plan.md, SPONSOR_MEMO.md, tests/   Class template files
├── .env.example             Placeholder for ANTHROPIC_API_KEY (copy to .env)
├── package.json             Dependencies and the start script (node app/server.js)
└── README.md                Class overview and local setup
```

**Data flow:** the browser sends the chosen resume ID, contact details, and optional LinkedIn PDF text to `POST /api/generate`. The server adds the saved profile, builds the prompt with strict fact rules, and calls Claude with a fixed JSON output format. It checks the email length (asking Claude once to shorten it if needed), returns the five sections, and prints token counts and estimated cost to the terminal.

**Server API (all local):**
- `GET /api/profile` and `PUT /api/profile` read the profile and save stories plus your LinkedIn URL.
- `POST` and `DELETE /api/profile/linkedin` add or remove your LinkedIn PDF.
- `POST /api/resumes`, `PUT /api/resumes/:id`, and `DELETE /api/resumes/:id` add, edit or replace, and delete resumes.
- `POST /api/extract-pdf` reads a contact's LinkedIn PDF and saves nothing.
- `POST /api/generate` runs one generation.

**Useful settings:** `PORT` changes the port (default 3000). `DATA_DIR` points the app at a different data folder, so demos and tests don't touch your saved profile.

## 6. Setup and Run, Step by Step
1. Install Node.js 18 or newer.
2. Clone the repo and open a terminal in its root folder.
3. `npm install` (PowerShell: `npm.cmd install`).
4. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`), then set `ANTHROPIC_API_KEY` to a key from the Claude Console.
5. `npm start` (PowerShell: `npm.cmd start`), then open http://localhost:3000.
6. Add a resume in step 1 of the page, then fill in a contact and click Generate prep. The terminal prints each run's tokens and cost.
7. Stop the server with Ctrl+C. Restart it after changing `.env` or server code.
