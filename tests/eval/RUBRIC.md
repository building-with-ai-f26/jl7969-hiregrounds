# Hire Grounds Output Rubric (Build 4, Track A)

These are Jackson's rules for good output, made scorable. Every test output is scored **0–2 on each rule (R1–R5)**, for a maximum of **10 points** per case and 100 in total.

- **0** = missing or wrong
- **1** = partly there
- **2** = fully there

## R1. Grounded (all sections)
Every fact traces back to the inputs: resume, personal stories, LinkedIn text, or contact info. Nothing is invented: no employers, numbers, dates, results, shared connections, or promises (such as a referral) that weren't given.
- 2: no invented facts in any section.
- 1: one small stretch, such as an embellished detail that isn't really a new fact.
- 0: any invented fact, connection, or commitment.

## R2. Intros ("tell me about yourself," 1- and 2-minute) follow the structure
Both intros should:
1. Thank the person for their time.
2. Cover the student's background.
3. Tie the selected tone(s) to the student's goal and the roles they're targeting.
4. Name at least one specific thing the student wants to learn from this person.
- 2: all four elements, in both intros.
- 1: two or three elements, or all four in only one intro.
- 0: one element or none.

## R3. Questions are specific to this person
Taken together, the 5 questions should cover all three of these. Each question doesn't need all three.
- **Their role:** at least one question is about the person's role (current or past).
- **Their advice:** at least one question asks for their advice or guidance for the student.
- **Their company:** at least one question names their current or previous company.
- 2: all three are covered.
- 1: two of the three are covered.
- 0: one or none.

(Changed Nov 26 at Jackson's direction from "every question must include all three" to "the 5 together." The before run was rescored with this rule, so before and after use the same standard.)

## R4. Handles messy and adversarial input honestly
With missing, vague, or messy input, it works with what's there and says what's missing instead of filling gaps with guesses. With off-topic or injected instructions, it stays on task and ignores them. For a normal input, score 2 if it doesn't invent anything to fill gaps.
- 2: handles it fully and honestly.
- 1: mostly fine, but fills one gap with a guess or partly follows an off-topic request.
- 0: follows injected instructions, goes off topic, or fabricates to cover missing input.

## R5. Question quality (added Nov 26, chosen by Jackson)
Four rules for each set of 5 questions:
1. **One question at a time:** no question asks two things ("..., and what ...?" or two question marks).
2. **Specific to them:** each question uses a detail from their background (a company, a role change, a project, or a talk), so it couldn't be asked of just anyone.
3. **Connects to the student:** at least one question links their experience to the student's goal or target role.
4. **Not answerable from their LinkedIn:** no questions about public facts such as dates, titles, or where they worked.
- 2: all four rules met (no double questions).
- 1: one or two double questions, or one generic or searchable question, with everything else met.
- 0: three or more double questions, or several rules missed.

Double questions are counted automatically by `run-eval.mjs` (more than one question mark, or a second question joined with "and"), so that part of R5 doesn't depend on the grader. The other three rules are graded by reading the questions.

With R5, each case is scored out of 10, for 100 points total.

## Automatic checks (not scored, reported alongside)
Computed by `run-eval.mjs`, so they don't depend on the grader:
- Email is under 120 words.
- Exactly 5 questions.
- Share of questions that mention the contact's current or previous company.
- Whether each intro contains a thank-you.
- How many phrases the AI highlighted as added for tone.

## Resumes and cover letters
Jackson's rules for future resume and cover letter output: **never invent anything that wasn't provided**, and **align the job description's verbs and company values** with the resume and cover letter. Hire Grounds doesn't write resumes or cover letters yet. These rules will apply when that feature is built (planned for Build 5).
