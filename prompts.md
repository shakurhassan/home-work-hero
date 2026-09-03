# Prompts

Every prompt from the session that built this project, in order, each
followed by a three-sentence summary of what the reply did.

---

## 1 — research

> Run the `research` workflow from @AGENTS.md — read-only, no code, no spec.
>
> Task: Building a homework helper project that helps users to do their homework and a reviewer reviews the homework by request. Student registers with a name and email and puts their homework question and their answer and request a review if review is not in the reviewing list they can add it. A Reviewer reviews and makes decision gives a score  and next action continue, repeat etc. No database setup is needed, user registration or notification only session storage for persistency. Create dummy users, reviewers at the start and example question and answers so users can use it as guidance
>
> This is a fresh project, so research the problem, not a codebase: the
> simplest approach that could work. Let's think about the tech stack later.
>
> Report: the approach you would take, what to reuse, and what was unclear
> enough that you had to guess. Ask me about the guesses — do not resolve
> them yourself.

Read the empty repo and proposed a single immutable `AppState` with pure transition functions behind a `Store` interface, so the persistence choice could stay open while the domain got built. Identified the submission lifecycle as the whole product and recommended splitting the work into two feature specs. Asked four structured questions rather than guessing: how student and reviewer share state, the shape of the verdict, whether revisions keep history, and whether photos and reviewer-initiated assignments were in scope.

---

## 2 — PRD

> Write the PRD in specs/PRD.md: goal, users, the decisions I just made, and
> explicit non-goals. One page. Do not use the feature template yet.

Wrote `specs/PRD.md` in 72 lines: goal, the two users, seven decisions as a table pairing each with its consequence, and non-goals stated as hard exclusions. Recorded the reading of the split answer — text only, but reviewer-initiated assignments in scope — and flagged it for correction. Kept three open questions at the end rather than resolving them silently.

---

## 3 — feature specs

> Write the spec for the features of the app.
>
> Ground it in the research pass findings and specs/PRD.md. Write
> specs/features/«feature».md for each feature using specs/TEMPLATE.md.
>
> Acceptance criteria as Given/When/Then, numbered AC1, AC2, …
> Every one names a precise expected value or output — never "a sensible
> message", never "works correctly".
>
> Then run the Spec Readiness checklist and show the result item by item.

Wrote `identity-and-directory.md` (15 ACs) and `review-loop.md` (26 ACs), every AC naming a literal error code, status or deep-equal fixture. Gave each next-action enum value one distinct testable consequence so the four values could not collapse into two. Verified AC coverage mechanically with a `comm` diff rather than by eye, then reported the readiness checklist item by item.

---

## 4 — open question answers

> PRD open question answers 1.ok 2. ok 3. only reseed on a new browser or no previous data is available

Turned answers 1 and 2 into PRD decisions 9 and 10 and removed the corresponding hedges from both specs. Flagged that answer 3 collided with the earlier shared-store choice and asked which won, rather than picking. When the shared world was confirmed, moved `actorId` out of `AppState` — otherwise one browser switching identity would switch everyone's — and updated five ACs accordingly.

---

## 5 — architecture, UI/UX, tech stack, scaffold

> Write architecture, ui/ux and tech stack specs into specs/. Focus on
> simplicity and being able to quickly develop an MVP. Stay inside the PRD
> non-goals. One page each.
>
> Then scaffold the project according to the tech stack spec: install
> what is needed, make the commands in @AGENTS.md real, and run `npm test`
> with no tests yet. It must pass green. Show the output.

Chose zero runtime dependencies and no build step, since Node 25 strips TypeScript types natively — `node:http`, server-rendered HTML, plain forms, one `<style>` block. Wrote the three specs at 77, 114 and 105 lines, each naming the PRD non-goals it honours. Scaffolded the project, made all three AGENTS.md commands real, and showed `npm test` and `tsc` both exiting 0.

---

## 6 — first tdd cycle

> Run the `tdd` workflow from @AGENTS.md for AC1 in
> specs/features/«feature».md.
>
> RED first: write the failing test for this AC only. The test name states
> the AC. Run it and paste the real output. Confirm it fails because the
> behaviour is missing — not because of an import, path or fixture.
>
> Only then GREEN: the smallest change that passes it. Run ALL tests and
> show the summary. Then REFACTOR with the tests green.
>
> Stop after this AC. Do not start the next one.

Built the seed fixture and two stubs first, so the failure would be behavioural rather than an unresolved import, and pasted the real output showing `length 4, expected 5`. Implemented the smallest change — append a person, find by id — with no validation, leaving AC2–AC5 to drive that. Refactored only the test duplication, since the production code was two five-line functions.

---

## 7 — continue

> yes

Ran AC2 as its own cycle: the RED showed `registerStudent` returning `ok` with a five-person directory, proving the duplicate check simply did not exist. Added `normalizeEmail`, the `EMAIL_TAKEN` code and a guard, and confirmed the case-insensitive match the AC demanded. Reported that there was nothing worth refactoring rather than inventing churn.

---

## 8 — finish the identity feature

> go ahead and do all AC's of identity and directory

Completed AC3–AC15 in four cycles, batching RED per function group but never writing implementation before a failing test. Flagged plainly that AC9, AC10, AC14 and AC15 passed on arrival and were characterization tests, not RED→GREEN. Marked the spec Done at 15 ACs and 20 passing tests, and noted that satisfying AC13 meant building review-loop's seed fixture early.

---

## 9 — review-loop AC1

> Run the `tdd` workflow from @AGENTS.md for AC1 in
> specs/features/review-loop.md.
>
> RED first: write the failing test for this AC only. The test name states
> the AC. Run it and paste the real output. Confirm it fails because the
> behaviour is missing — not because of an import, path or fixture.
>
> Only then GREEN: the smallest change that passes it. Run ALL tests and
> show the summary. Then REFACTOR with the tests green.
>
> Stop after this AC. Do not start the next one.

Showed the RED output and argued from the received value — the fixture's four seeded submissions — that the failure was behavioural, not structural. Implemented `createSubmission` with no validation at all, since AC11–AC15 exist to force it. Extracted the now-duplicated `expectOk` helper into `src/test-support.ts` and noted that file is in no spec's file list.

---

## 10 — AC2

> run for AC2

RED showed `expected undefined to be 'ASSIGNED'` because the stub appended nothing. Implemented `assignSubmission` with `createdBy` set to the reviewer — the field that distinguishes the second entry point to the lifecycle. Extracted `withSubmission` but deliberately kept the two object literals separate, because their differing fields are the meaningful distinction.

---

## 11 — AC3

> run for AC3

The strongest RED of the run: the test helper found `s4` in the fixture and read back `'ASSIGNED'`, so the submission existed and only the transition was missing. Implemented `addAttempt` as a map with no lookup-failure path, leaving AC23 to force that. Extracted `newAttempt` (two callers, as predicted) and `mapSubmission` for readability.

---

## 12 — the remaining review-loop ACs

> run remaining AC's one at a time no patches

Ran AC4–AC26 as 23 separate cycles, with the status machine emerging one row at a time: AC5 failed against AC4's hardcoded status, AC6 against AC5's ternary. Corrected a syntax error I introduced at AC11 and said so rather than treating the transform failure as a RED. Marked the spec Done at 26 ACs, and named the three ACs that passed on arrival plus the validation ordering no AC pins down.

---

## 13 — first walkthrough attempt

> Start the app. If the port is already in use, pick another one and tell
> me the URL you actually used.
>
> Then use the browser tool Playwright MCP to walk through AC«N» as a user
> would: click, type, read the screen, take a screenshot.
>
> Report exactly what you did and what you saw — inputs and outputs. List
> every difference from the AC. Do not fix anything yet.

Started the app on 4001 after finding 3000 busy, and drove it with Playwright as asked. Reported that the accessibility tree contained zero interactive elements: the server answered every path with one line of plain text, so the walkthrough stopped at step one. Listed every difference from the AC and explained this was expected — both feature specs had deferred the shell — without fixing anything.

---

## 14 — build the shell

> Start building according to TDD.

Wrote `specs/features/web-shell.md` first, since `tdd` requires a spec and both feature specs had deferred the shell. Built store, sessions, cookies, router, form parsing, escaping, views and server across eight RED→GREEN cycles. Corrected AC12 in the spec rather than the test when its marker string turned out to appear in the page heading, then made the app real end to end.

---

## 15 — walkthrough, second attempt

> Start the app. If the port is already in use, pick another one and tell
> me the URL you actually used.
>
> Then use the browser tool Playwright MCP to walk through AC«N» as a user
> would: click, type, read the screen, take a screenshot.
>
> Report exactly what you did and what you saw — inputs and outputs. List
> every difference from the AC. Do not fix anything yet.

Walked review-loop AC1 as a student: chose an identity, typed the question and answer, picked a reviewer, submitted, and landed on the new submission. Reported every input and output in a table with screenshots. Listed five differences from the AC — all places where its literal ids and timestamps cannot exist in a browser, plus `createdBy` never being rendered.

---

## 16 — walk every AC

> Continue continue the walkthrough and the reports for all AC's

Walked 28 ACs across all three specs in one session, switching between five people, and reported each input and output. The significant finding was a class of twelve error ACs no user can reach, because HTML validation and hidden panels prevent them — so those domain messages are never seen. Also confirmed the form loses typed values on error and that a closed-but-unlocked submission offers the student nothing.

---

## 17 — the missing screenshots

> Screenshots are missing for most of AC's reuse the browser tool as user would read the screen and take the missing screenshots

Restarted the app so the seed was intact and captured 29 screenshots, one per AC state, into `screenshots/`. Caught that two files were byte-identical and corrected my own first explanation: a closed `<select>` renders only its selected option, so no screenshot of that page can evidence the reviewer list. Deleted the duplicate, renamed the rest to what they actually show, and listed the states that remain unscreenshottable and why.

---

## 18 — review

> Run all tests and show the summary.
>
> Then run the `review` workflow from @AGENTS.md on all changes so far:
> for each change, which AC it serves; what changed that no AC asked for;
> which test proves what. Also audit input validation and error paths.
> End with APPROVED or CHANGES_REQUIRED and a numbered list.
>
> If CHANGES_REQUIRED: fix the items one at a time, each through the tdd
> workflow (red first), then run the review again. Stop when APPROVED, or
> after two rounds without progress — then tell me what is stuck.

Audited the error paths against the running app and reproduced six defects, including a 500 crash on a malformed enum and any signed-in person being able to answer someone else's submission. Fixed five of them one at a time, red first, adding four new ACs to the specs before writing code. Round two came back APPROVED, with three spec-versus-spec contradictions escalated as decisions rather than silently resolved.

---

## 19 — decisions and commit

> 1. re-render, 2. show the answer box, 3. 404 4. commit the changes so far

Corrected `ui-ux.md` so the redirect rule applies to success only, and wrote down that an error re-render leaves refresh able to resubmit. Added AC21 and AC22 and implemented both red-first: the answer box now appears on a CONTINUE-closed submission, and an unknown submission id returns 404. Committed 71 files as `c319fcf` on a new branch, and flagged that I had deleted five stray screenshots without asking.

---

## 20 — this file

> Write all my prompts to prompts.md and briefly summarise what you
> answered with three sentences each.

Wrote every prompt verbatim into `prompts.md` in order, each with a three-sentence summary of the reply. Kept the two identical walkthrough prompts as separate entries, since the first found no UI and the second exercised the working app. Left the file untracked so you can decide whether it belongs in the repository.
