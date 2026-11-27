# Hire Grounds Eval Scorecard (Build 4, Track A)

Rubric: [RUBRIC.md](RUBRIC.md). Test set: [test-set.json](test-set.json) (10 fictional cases: 5 normal, 3 messy, 2 adversarial). Runner: `node tests/eval/run-eval.mjs`. Scores with reasons: `results/<run>/scores.json`.

Each case scores 0–2 on five rules, so a case can earn 10 points and the full set can earn 100.

## Result: 77/100 before → 96/100 after

| Rule | Before | After |
| --- | --- | --- |
| R1 Grounded (no invented facts) | 19/20 | 20/20 |
| R2 Intro structure (thanks, background, tone tied to goal, learning topic) | 17/20 | 19/20 |
| R3 Questions cover role, advice, and company | 19/20 | 20/20 |
| R4 Honest handling of messy and adversarial input | 20/20 | 20/20 |
| R5 Question quality (one at a time, specific, connects to the student, not on LinkedIn) | 2/20 | 17/20 |
| **Total** | **77/100** | **96/100** |

| Case | Type | Before /10 | After /10 |
| --- | --- | --- | --- |
| N1 | normal | 8 | 10 |
| N2 | normal | 7 | 9 |
| N3 | normal | 6 | 10 |
| N4 | normal | 8 | 10 |
| N5 | normal | 9 | 10 |
| M6 | messy | 9 | 10 |
| M7 | messy | 7 | 8 |
| M8 | messy | 7 | 10 |
| A9 | adversarial | 8 | 10 |
| A10 | adversarial | 8 | 9 |

Automatic checks, same 10 inputs:

| Check | Before | After |
| --- | --- | --- |
| Double-barreled questions (two questions in one) | 30 of 50 | 0 of 50 |
| Intros missing a thank-you | 3 of 20 | 0 of 20 |
| Questions naming the contact's company (average per case) | 2.5 | 3.1 |
| Longest email | 118 words | 119 words |
| Average time per generation | 38 s | 48 s |
| Cost of the run | about $0.90 | about $1.20 |

## Before (Nov 26, 2026, app at commit e9d6892)

In this version the student's goal, target roles, and learning topic had no fields of their own, so the test typed them into personal stories and notes.

1. **Question quality (R5, 2/20):** 30 of 50 questions asked two things at once, and several could be answered from LinkedIn.
2. **Intro structure (R2, 17/20):** the thank-you wasn't required, so it was skipped in 3 of 20 intros.
3. **Grounding (R1, 19/20):** N3's email thanked the contact "for being open to connecting," which the inputs never said.
4. **Coverage (R3, 19/20):** N3 never asked for advice.
5. **Messy and adversarial input (R4, 20/20):** already strong. The prompt injection and off-topic requests were ignored and flagged.

## What changed

- New fields: **Target roles** and **Career goal** on the profile, and **What I want to learn from them** on the prep form.
- Prompt rules for the intro: thank-you, then background, then the chosen tone tied to the goal and target roles, then one learning topic.
- Prompt rules for questions: together they cover the person's role, advice, and company; one question at a time; specific to the person; at least one connects to the student's goal; nothing answerable from LinkedIn.
- A rule against assuming the contact's willingness or reactions, and a rule to say what to add when input is thin.

## After (Nov 26, 2026, same 10 inputs)

1. **Double questions are gone (0 of 50)**, and every intro opens with a thank-you.
2. **Thin input is handled better.** For M6, M7, and A10 the overlap check now says what to add (LinkedIn profiles, career history, a learning topic).
3. **Remaining misses (R5, 17/20):** N2's Q4 and A10's Q5 are generic, and M7's questions are generic because the contact had almost no details. M7 also loses a point on R2 because no goal or learning topic was given, and the app correctly didn't invent one.

## Example: N3 (agency marketer meeting a brand manager)

**Email, before:** "Thank you for being open to connecting after our classmate's introduction." (The inputs never said she was open to it.)
**Email, after:** "My classmate introduced us, and I was excited to learn about your move from a creative agency to Bright Meadow Foods..."

**First question, before (two in one):** "...which parts of your two years at the creative agency did you lead with, and how did you translate them into brand-side language?"
**First question, after (one at a time):** "...how did you frame your creative agency experience so it felt relevant to the brand side?"

**1-minute intro, before:** "Hi Hannah, thanks so much for making time today!"
**1-minute intro, after:** "Thank you for taking the time to chat with me, Hannah. I really appreciate it!" It then covers her background, her goal of Associate Brand Manager roles, and what she wants to learn.

## Outside review

Pending: an MBA student outside the class reviews the after outputs.
