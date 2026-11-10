# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **What this repo builds:** Hire Grounds, a local coffee chat prep tool. It turns a resume, personal stories, and a contact's background into an outreach email, 5 questions, and 1- and 2-minute intros.
- **Primary user & core workflow:** [See the living PRD in `docs/index.html`]
- **Tech stack:** Node.js / Express (`app/server.js`) / plain HTML, CSS, JS (`app/public/`) / OpenRouter API. The model is set in `app/config.js`.

## 2. Commands
- **Install dependencies:** `npm install` (in Windows PowerShell: `npm.cmd install`)
- **Run locally:** copy `.env.example` to `.env`, set `OPENROUTER_API_KEY`, then `npm start` (PowerShell: `npm.cmd start`) and open http://localhost:3000
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
- Never commit `.env`, `data/` (saved profile), or uploaded resumes.
- Generated output may use only facts from the resume, personal stories, and contact info. Keep the email under 120 words.
- Keep the cost log printed for each generation. Do not log resume or contact content.
