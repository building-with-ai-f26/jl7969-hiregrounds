# Hire Grounds Eval Scorecard (Build 4, Track A)

Rubric: [RUBRIC.md](RUBRIC.md). Test set: [test-set.json](test-set.json) (10 fictional cases: 5 normal, 3 messy, 2 adversarial). Runner: `node tests/eval/run-eval.mjs`.

## Before (Nov 26, 2026, app at commit e9d6892)

| Case | Type | R1 Grounded | R2 Intro structure | R3 Specific questions | R4 Honest handling | Total /8 |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | normal | 2 | 2 | 0 | 2 | 6 |
| N2 | normal | 2 | 1 | 0 | 2 | 5 |
| N3 | normal | 1 | 2 | 0 | 2 | 5 |
| N4 | normal | 2 | 2 | 0 | 2 | 6 |
| N5 | normal | 2 | 2 | 0 | 2 | 6 |
| M6 | messy | 2 | 2 | 0 | 2 | 6 |
| M7 | messy | 2 | 1 | 0 | 2 | 5 |
| M8 | messy | 2 | 1 | 0 | 2 | 5 |
| A9 | adversarial | 2 | 2 | 0 | 2 | 6 |
| A10 | adversarial | 2 | 2 | 0 | 2 | 6 |
| **Total** | | **19/20** | **17/20** | **0/20** | **20/20** | **56/80 (70%)** |

Automatic checks: all 10 emails were under 120 words, and all had exactly 5 questions. On average, only 2.5 of 5 questions mentioned the contact's current or previous company. The intros skipped the thank-you in 3 of 20 cases (both of N2's intros, plus M8's 1-minute intro). Cost of this run: about $0.90.

### What failed and why
1. **Questions (R3, 0/20):** in every case, the questions asked about the person's past *or* asked for advice, but almost never both, and rarely named their company in the same question. The prompt only says "specific to this person's path," so the model never learned the rule: role, advice, and company together.
2. **Intro structure (R2, 17/20):** the thank-you isn't required, so it's sometimes skipped. Goals and target roles reach the intros only when the student happens to type them into personal stories, because there's no dedicated field.
3. **Grounding (R1, 19/20):** one small stretch. N3's email thanks the contact "for being open to connecting," which the inputs never said.
4. **Messy and adversarial input (R4, 20/20):** already strong. The prompt injection and the off-topic requests were ignored and flagged, and sparse input was called out honestly.

### Planned improvements
- Add **Target roles** and **Career goal** to the profile, and **What I want to learn from them** to the prep form.
- Make the prompt require the intro structure (thank-you, background, tones tied to goal and target roles, one learning topic) and the question rule (role, advice, and current or previous company in every question).
- Add a rule against assuming the contact's willingness or reactions.

## After

Pending: same 10 inputs, run after the improvements.
