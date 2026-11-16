# Hire Grounds To-Do

Living list of what's next. Check items off (`[x]`) when they ship, and note the commit or build.
Last updated: Nov 15, 2026.

## Up next

- [ ] **UI design refresh: make it sleeker**
  - [ ] Jackson picks the direction: fonts, colors, and section box (card) design
  - [ ] Apply the chosen fonts and colors as design tokens in `app/public/styles.css`
  - [ ] Restyle section boxes, buttons, inputs, and chips to match
  - [ ] Check both pages (Your profile, Coffee chat prep) at desktop and phone widths
  - [ ] Retake the Product Page screenshots (fictional sample data only)
- [ ] **Logo update**
  - [ ] Decide the logo direction (wordmark, icon, or both) alongside the new colors
  - [ ] Replace the placeholder square in the header on both app pages
  - [ ] Add a browser tab icon (favicon). The app currently has none.
  - [ ] Use the logo on the Product Page (`docs/index.html`)

## Planned for Build 5 (with the cloud deployment)

- [ ] **Login page and accounts**
  - [ ] Sign-up and sign-in page, so each person's profile and resumes are remembered and private
  - [ ] Secure password storage (hashed, never stored in plain text) and protected sessions
  - [ ] Keep each user's resumes, stories, and LinkedIn data separate on the server
  - [ ] Move today's single local profile into the first account
  - [ ] Update the privacy notes, AGENTS.md, and PRD once data lives on a server

## Ideas and follow-ups

- [ ] Lower the cost per run (about $0.10 now with tone labeling): test a lower effort setting or Claude Haiku, then fact-check the output again
- [ ] Usage log: record each run's tokens and cost in a local file, with a `npm run usage` summary for the build log
- [ ] Check PostHog Activity and Session replay after real use, and add the first numbers to the Product Page

## Done

- [x] Tone for intros: free text plus up to 3 suggested tones, pushback on tones that wouldn't land well, and highlighted tone-added phrases (Nov 15)
- [x] Two-page flow: Your profile, then Coffee chat prep, with an Edit profile link (Nov 15)
- [x] Clear "Your resume for this chat" label (Nov 15)
- [x] PostHog on the Product Page and in the local app (Build 2, Nov 15)
- [x] Resume library and LinkedIn inputs (Build 2, Nov 14)
- [x] Switched from OpenRouter to the Claude API and refreshed the design (Nov 10)
