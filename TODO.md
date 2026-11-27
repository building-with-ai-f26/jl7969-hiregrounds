# Hire Grounds To-Do

Living list of what's next. Check items off (`[x]`) when they ship, and note the commit or build.
Last updated: Nov 26, 2026.

## Up next (Build 4, Track A: output quality, due Nov 30)

- [x] Rubric from Jackson's rules (`tests/eval/RUBRIC.md`) and a 10-case test set (Nov 26)
- [x] "Before" run and scorecard: 56/80. Questions failed the role, advice, and company rule in every case (Nov 26)
- [ ] Improvements: Target roles and Career goal profile fields, a "What I want to learn from them" field, and prompt rules for intro structure, questions, and not assuming the contact's reactions
- [ ] "After" run on the same 10 inputs, and an updated scorecard
- [ ] Outside check: one target user outside class reviews the improved outputs
- [ ] Deploy the improvements to the live app
- [ ] Product Page: rubric, before-and-after scorecard, examples, PRD v4, Build 4 log
- [ ] **UI redesign (layouts B and C combined):** navy top bar; purple buttons, chips, and logo; blue structure; light-blue inputs; stats strip (Upcoming, Follow-up due, Met) and an up-next list on the prep page; inputs and results side by side, stacking on phones
  - [ ] Check all three pages at desktop and phone widths
  - [ ] Retake the Product Page screenshots (fictional sample data only)

## Planned for Build 5 (with the cloud deployment)

- [ ] **Login page and accounts**
  - [ ] Sign-up and sign-in page, so each person's profile and resumes are remembered and private
  - [ ] Secure password storage (hashed, never stored in plain text) and protected sessions
  - [ ] Keep each user's resumes, stories, and LinkedIn data separate on the server
  - [ ] Move each user's browser-saved profile and tracker into their account
  - [ ] Update the privacy notes, AGENTS.md, and PRD once data lives on a server
- [ ] **Job application helper (resume and cover letter):** paste a job description and get tailored resume bullets and a cover letter. Rules: never invent anything that wasn't provided, and align with the job description's verbs and company values. Show where each bullet came from, list the job's requirements the resume doesn't cover, and highlight anything added for tone.

## Ideas and follow-ups

- [ ] Lower the cost per run (about $0.09 in the Build 4 eval): test a lower effort setting or Claude Haiku, then re-run the eval
- [ ] Usage log: record each run's tokens and cost in a local file, with a `npm run usage` summary for the build log
- [ ] Check PostHog Activity and Session replay after real use, and add the first numbers to the Product Page

## Done

- [x] Logo: purple coffee mug with trending-up arrows on navy, in the app header, browser tab, and Product Page (Nov 26)
- [x] Deployed to Render with browser-stored data, rate limits, security headers, and SECURITY.md (Build 3, Nov 22)
- [x] Coffee chat tracker page (renamed Chat tracker on Nov 22): people with email, LinkedIn, company, role, status, chat and follow-up dates, notes, and thank-you; links to and from the prep page (Nov 21)
- [x] Fixed the Your profile tab error (stale server); added `npm run dev`, which auto-restarts (Nov 21)
- [x] Tone for intros: free text plus up to 3 suggested tones, pushback on tones that wouldn't land well, and highlighted tone-added phrases (Nov 15)
- [x] Two-page flow: Your profile, then Coffee chat prep, with an Edit profile link (Nov 15)
- [x] Clear "Your resume for this chat" label (Nov 15)
- [x] PostHog on the Product Page and in the local app (Build 2, Nov 15)
- [x] Resume library and LinkedIn inputs (Build 2, Nov 14)
- [x] Switched from OpenRouter to the Claude API and refreshed the design (Nov 10)
