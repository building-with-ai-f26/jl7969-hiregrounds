# SECURITY.md: Hire Grounds Security Audit (Build 3)

Status: **complete, Nov 22, 2026.** Live app: https://jl7969-hiregrounds.onrender.com (Render, free web service). All local and live checks are done. One weakness found on the live site (the rate limit) was fixed and re-tested.

## What kind of app this is

**AI app, no database.** Hire Grounds calls the Claude API from a Node/Express server. There is no sign-in and no server database.

- Each visitor's profile (resumes, stories, LinkedIn text) and chat tracker are saved **in their own browser** (`localStorage`), never on the server. Visitors can't see each other's data, and nothing is lost when the host restarts.
- The server is stateless. It reads uploaded PDFs in memory, returns the text, and saves nothing. It calls Claude when someone clicks **Generate prep**.
- The Claude API key lives only on the server, in the `ANTHROPIC_API_KEY` environment variable.
- PostHog (`phc_` public project key) records pageviews, clicks, and session replays. All typed text and generated content is masked in replays.

Why no database: storing classmates' resumes and contacts on a server would require sign-in, Row Level Security, and backups. Keeping data in each visitor's browser avoids holding anyone's personal data on the server at all. Sign-in and a database are planned for Build 5.

## Results by audit step

### 1. Access controls (AI app, no database test)
- **API key not exposed:** ✅ the key is read only in `app/server.js` and is never sent to the browser. On the live site, I fetched every page and script it serves (3 pages, 6 scripts and styles, and `/api/tones`) and searched them for key patterns. No secret keys, and no mention of `ANTHROPIC` in served code. The only key present is the public PostHog `phc_` key in `analytics.js`, which is allowed.
- **Rate limit:** local test ✅. 12 rapid calls to `POST /api/generate` returned `200` ×9, then `429` ×3 (the first call, sent without a resume, also counted toward the limit of 10).
- **Rate limit, live test (30 calls in a row):** the test calls were sent without a resume, so the server rejected each with `400` before calling Claude (no cost), and each still counted toward the limit.
  - **First run: found a weakness.** The limit kicked in (`429 Too Many Requests`, `ratelimit: limit=10`, `retry-after: 893`), but only from call 17, and some later calls still got through: 18 × `400`, 12 × `429`.
  - **Cause:** I added a temporary `/api/ip-check` route and measured the live site. Each request passes 3 proxy hops (visitor → Cloudflare edge → Render load balancer → local proxy → app), and the Cloudflare and Render addresses change from request to request. The app trusted only 1 hop, so it keyed the limit to rotating proxy addresses instead of the visitor.
  - **Fix:** trust exactly 3 hops (`TRUST_PROXY_HOPS`, default 3), then remove the IP-check route (commit `88be471`).
  - **Re-test after the fix: ✅** 10 × `400`, then 20 × `429`, with the first `429` at call 11, exactly as designed.
  - **Spoofing check: ✅** a request with a made-up `X-Forwarded-For` header was still blocked. The fake value lands to the left of the 3 trusted entries and is ignored.
- **No server-side data to steal:** ✅ the old routes that stored profiles and trackers on the server (`/api/profile`, `/api/resumes`, `/api/chats`) were removed and return `404`, both locally and on the live site.
- **Laptop import route:** ✅ `/api/local-import` returns `404` on the live site.
- **Security headers on the live site:** ✅ Content-Security-Policy, Strict-Transport-Security, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, and `Cross-Origin-Opener-Policy: same-origin`, with `X-Powered-By` removed.
- **PostHog on the live site:** ✅ loads under the security headers, sends events (HTTP 200), and starts session replay with all inputs and text masked.

### 2. Secret keys stay on the server
- ✅ Searched the working tree, untracked files, and **every commit in git history** for `sb_secret_`, `service_role`, `sk-or-`, `sk-ant-`, `sk-proj-`, and `sk_live_`. Found only placeholders: `.env.example` (`sk-ant-replace-with-your-key`) and an old placeholder `sk-or-v1-replace-with-your-key` in history. No real keys.
- ✅ `.env` is gitignored and has never been committed.
- Note: a Claude key was pasted into an AI chat on Nov 10. Jackson rotated it and uses a new key.
- ✅ Searched the live site's code for the same patterns (see step 1). None found.
- ✅ On Render, the key is set as an environment variable in the dashboard, not in code or the repo.

### 3. File storage stays private
- ✅ No file storage. Uploaded PDFs (resumes, LinkedIn exports) are read in memory, limited to 5 MB, checked to be real PDFs, and never written to disk.

### 4. Protect production from the agent
- ✅ No production database, so there's nothing to back up on the server. Each visitor's data lives in their own browser.
- ✅ `AGENTS.md` now has an **Ask me first** list (deleting data, database changes, keys and secrets, permissions, anything that costs money, and deploying), a **Shipping** section, and rules learned from real agent mistakes.

### 5. Spending caps and rate limits
- ✅ **Per-visitor rate limits** (by IP address), set in `app/config.js`:
  - `POST /api/generate` (calls Claude): 10 per 15 minutes.
  - `POST /api/extract-pdf` (PDF reading): 20 per 10 minutes.
- ✅ **Daily ceiling across all visitors:** 60 Claude calls per day, then `429`. Tone checks and email retries count toward it.
- ✅ No route writes to a database (there isn't one).
- ✅ **Hard monthly spending cap: $3** in the Claude Console (set by Jackson, Nov 22). At about $0.10 per generation, that's roughly 30 generations a month. When it's reached, Claude calls fail until the next month, so the cap, not the app, is the final backstop.

### 6. Dependency audit
- ✅ `npm audit`: **0 vulnerabilities** (Nov 22, 2026).

### 7. Agent security review
Claude Code reviewed the app and tried to break it. Findings:

| Finding | Risk | Fix |
| --- | --- | --- |
| Profiles and the tracker were stored in one shared file on the server | Once public, anyone with the link could read and overwrite others' resumes and contacts | Moved all personal data into each visitor's browser (Option A). The server stores nothing. |
| The local-import route reads data saved by older versions | If enabled on the host, it could expose laptop data | Disabled on the hosted site (returns `404`). Only works locally. |
| No limits on routes that cost money | Someone could run up the Claude bill | Per-visitor rate limits, a daily ceiling, and the Console spending cap |
| No security headers | Clickjacking, content sniffing, injected scripts | Helmet: a Content Security Policy that only allows our files and PostHog, `frame-ancestors 'none'`, `nosniff`, HSTS |
| Server only listened on the laptop | Couldn't be hosted | Listens on all interfaces only when hosted (`RENDER` or `NODE_ENV=production` set) |
| Rate limit trusted 1 proxy hop, but Render has 3 (found on the live site) | Limits keyed to rotating proxy IPs, so one visitor got extra requests (first `429` at call 17 instead of 11) | Measured the hops, set `trust proxy` to 3, removed the temporary IP-check route, and re-tested: first `429` at call 11, and spoofed headers are ignored |

Checked with no issues found:
- All user and AI text is inserted with `textContent`, never as HTML, so it can't inject scripts.
- LinkedIn links only allow `https://*.linkedin.com`; emails are validated before `mailto:` links are built.
- Prompt-injection guard: user-supplied text is wrapped in tags, and the model is told to ignore instructions inside it. Custom tones are checked before use.
- JSON request bodies are limited to 300 KB, and resume and LinkedIn text to 40,000 characters.
- PostHog session replay masks all inputs and page text; AI output carries `ph-no-capture`.

## Remaining issues and limits
- **Shared networks:** rate limits are per IP address. Classmates on the same Wi-Fi (for example, NYU) share one IP and therefore one limit of 10 generations per 15 minutes. It can be raised in `app/config.js` for a class demo.
- **The daily ceiling resets on restart:** it's counted in server memory, so a restart resets it. The Claude Console spending cap is the hard backstop.
- **Browser storage:** data is lost if a visitor clears their browser data, and anyone using the same browser profile can see it. That's acceptable for a prototype. Sign-in and a database come in Build 5.
- **PDF library:** `pdf-parse` 1.1.1 bundles an older PDF.js. `npm audit` reports nothing, but it's old. Mitigated by the 5 MB limit, the PDF check, the rate limit, and text-only extraction (nothing is rendered or run).
- **Free hosting sleeps:** Render's free tier sleeps when idle, so the first visit can take up to about a minute. That's an availability limit, not a security issue.
