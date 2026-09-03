# Feature: review-loop

Status: Done · 2026-09-03 · Grounded in `specs/PRD.md` (decisions 2, 3, 4, 5, 7)
All 26 ACs implemented and covered by 35 passing tests in `src/domain/`.
Depends on: `identity-and-directory` (owns `Person`, `AppState`, `Result`, the seed)

## Problem Statement

The product *is* the loop: a question and an answer go to a person, that
person returns a verdict, and when the verdict says "repeat" the student
tries again with the earlier attempt still visible beside the new one
(PRD decision 3). A reviewer can also start the loop by assigning a
question with no answer yet (PRD decision 4).

Nothing in the repo models any of this. Without it there is no product.

## Proposed Change

A `Submission` owns an ordered, append-only `Attempt[]`. Each attempt owns
at most one `Review`. No attempt and no review is ever edited or removed —
the improvement arc is the thing worth showing.

Four statuses, and the reviewer's `nextAction` is what moves the
submission between them:

| `nextAction` | new status | next attempt starts from | student may add another attempt |
| ------------ | ---------- | ------------------------ | ------------------------------- |
| `REPEAT`     | `NEEDS_REVISION` | a blank answer | yes |
| `CORRECT`    | `NEEDS_REVISION` | the previous answer | yes |
| `CONTINUE`   | `CLOSED` | the previous answer | yes — accepted, but not locked |
| `DONE`       | `CLOSED` | — | no — the submission is locked |

`CONTINUE` and `DONE` both close; they differ in whether the student can
still add a further attempt. `REPEAT` and `CORRECT` both reopen; they
differ in what `draftAnswerFor` hands back. Every enum value therefore has
one distinct, testable consequence. This enum is confirmed (PRD decision 9).

A verdict is consistent when `APPROVED` pairs with `CONTINUE` or `DONE`,
and `NOT_APPROVED` pairs with `REPEAT` or `CORRECT`. Any other pair is
rejected (PRD decision 2).

### Types this feature owns

```ts
type SubmissionStatus = 'ASSIGNED' | 'AWAITING_REVIEW' | 'NEEDS_REVISION' | 'CLOSED';
type Decision   = 'APPROVED' | 'NOT_APPROVED';
type NextAction = 'CONTINUE' | 'REPEAT' | 'CORRECT' | 'DONE';

interface Review {
  id: string;
  reviewerId: PersonId;
  decision: Decision;
  score: number;        // integer, 0..100 inclusive
  nextAction: NextAction;
  comment: string;      // trimmed, 1..1000 chars
  reviewedAt: string;   // ISO 8601, supplied by the caller
}

interface Attempt {
  id: string;
  answer: string;       // trimmed, 1..5000 chars
  submittedAt: string;
  review: Review | null;
}

interface Submission {
  id: string;
  studentId: PersonId;
  reviewerId: PersonId;
  question: string;     // trimmed, 1..2000 chars
  status: SubmissionStatus;
  createdBy: PersonId;  // the student, or the reviewer who assigned it
  createdAt: string;
  attempts: Attempt[];  // append-only
}
```

Commands, all pure `(state, input) => Result<AppState>`:
`createSubmission`, `assignSubmission`, `addAttempt`, `reviewAttempt`.
Queries, all pure and total: `queueForReviewer`, `assignmentsFor`,
`draftAnswerFor`, `isLocked`.

`isLocked(submission)` is derived, not stored: the last attempt's review
has `nextAction === 'DONE'`.

### Seed submissions (exact)

| id | student | reviewer | question | attempts | status |
|----|---------|----------|----------|----------|--------|
| `s1` | `p1` | `p3` | Why does ice float on water? | `a1` "Because it is lighter." — no review | `AWAITING_REVIEW` |
| `s2` | `p1` | `p3` | Explain photosynthesis in your own words. | `a2` "Plants eat sunlight." — `NOT_APPROVED`, 52, `REPEAT`, "Name the inputs and the outputs." | `NEEDS_REVISION` |
| `s3` | `p2` | `p4` | Solve 3x + 7 = 22 and show your working. | `a3` "x = 5" — `NOT_APPROVED`, 52, `CORRECT`; `a4` "3x + 7 = 22 → 3x = 15 → x = 5" — `APPROVED`, 78, `CONTINUE` | `CLOSED` |
| `s4` | `p2` | `p3` | Write three sentences about the water cycle. | none — assigned by `p3` | `ASSIGNED` |

`s3` is the 52 → 78 arc from the PRD, and it is closed but not locked.

## Acceptance Criteria

### AC1: A student submits a question and an answer

**Given** `seedState()`
**When** `createSubmission(state, { id: 's9', attemptId: 'a9', at: '2026-09-03T08:00:00.000Z', studentId: 'p1', reviewerId: 'p3', question: 'What is a prime number?', answer: 'A number with two factors.' })`
**Then** the result is `ok`, `value.submissions` has length 5, and the new
submission deep-equals `{ id: 's9', studentId: 'p1', reviewerId: 'p3', question: 'What is a prime number?', status: 'AWAITING_REVIEW', createdBy: 'p1', createdAt: '2026-09-03T08:00:00.000Z', attempts: [{ id: 'a9', answer: 'A number with two factors.', submittedAt: '2026-09-03T08:00:00.000Z', review: null }] }`

### AC2: A reviewer assigns a question with no answer yet

**Given** `seedState()`
**When** `assignSubmission(state, { id: 's9', at: '2026-09-03T08:00:00.000Z', reviewerId: 'p3', studentId: 'p1', question: 'List three prime numbers.' })`
**Then** the result is `ok`, the new submission has `status === 'ASSIGNED'`,
`attempts` of length 0, `createdBy === 'p3'`, and `reviewerId === 'p3'`

### AC3: Answering an assigned question moves it into the review queue

**Given** `seedState()` (`s4` is `ASSIGNED` with 0 attempts)
**When** `addAttempt(state, { submissionId: 's4', attemptId: 'a9', at: '2026-09-03T08:00:00.000Z', answer: 'Water evaporates, condenses, and falls as rain.' })`
**Then** the result is `ok`, `s4.status === 'AWAITING_REVIEW'`,
`s4.attempts` has length 1, and `s4.attempts[0].review === null`

### AC4: A review with REPEAT reopens the submission for a new attempt

**Given** `seedState()` (`s1` is `AWAITING_REVIEW`)
**When** `reviewAttempt(state, { submissionId: 's1', reviewId: 'r9', at: '2026-09-03T09:00:00.000Z', reviewerId: 'p3', decision: 'NOT_APPROVED', score: 40, nextAction: 'REPEAT', comment: 'Think about density.' })`
**Then** the result is `ok`, `s1.status === 'NEEDS_REVISION'`, and
`s1.attempts[0].review` deep-equals `{ id: 'r9', reviewerId: 'p3', decision: 'NOT_APPROVED', score: 40, nextAction: 'REPEAT', comment: 'Think about density.', reviewedAt: '2026-09-03T09:00:00.000Z' }`

### AC5: A review with CONTINUE closes the submission without locking it

**Given** `seedState()` (`s1` is `AWAITING_REVIEW`)
**When** `reviewAttempt(... decision: 'APPROVED', score: 88, nextAction: 'CONTINUE', comment: 'Good — density, not weight.')`
**Then** the result is `ok`, `s1.status === 'CLOSED'`, and `isLocked(s1) === false`

### AC6: A review with DONE closes and locks the submission

**Given** `seedState()`
**When** `reviewAttempt(... on 's1' ... decision: 'APPROVED', score: 95, nextAction: 'DONE', comment: 'Finished.')`
**Then** the result is `ok`, `s1.status === 'CLOSED'`, and `isLocked(s1) === true`
**And when** `addAttempt` is then called on `s1`
**Then** the result is `{ ok: false, error: { code: 'SUBMISSION_CLOSED', message: 'Submission s1 is closed' } }`

### AC7: A CONTINUE-closed submission still accepts a further attempt

**Given** `seedState()` (`s3` is `CLOSED` after `CONTINUE`)
**When** `addAttempt(state, { submissionId: 's3', attemptId: 'a9', at: '2026-09-03T08:00:00.000Z', answer: 'x = 5, checked by substitution.' })`
**Then** the result is `ok`, `s3.attempts` has length 3, and
`s3.status === 'AWAITING_REVIEW'`

### AC8: Earlier attempts and their reviews are never altered

**Given** `seedState()`
**When** `addAttempt` then `reviewAttempt` complete a second round on `s2`
(new attempt `a9`, review `r9` with score 78, `APPROVED`, `CONTINUE`)
**Then** `s2.attempts[0].id === 'a2'`, `s2.attempts[0].answer === 'Plants eat sunlight.'`,
`s2.attempts[0].review.score === 52`, `s2.attempts[0].review.nextAction === 'REPEAT'`,
`s2.attempts[1].review.score === 78`, and `s2.attempts` has length 2

### AC9: REPEAT starts from a blank answer, CORRECT starts from the previous one

**Given** `seedState()`
**When** `draftAnswerFor(state, 's2')` (last action `REPEAT`)
**Then** it returns `''`
**And when** `draftAnswerFor(state, 's3')` (last review on `a3` was `CORRECT`,
evaluated on a state where `a4` does not yet exist)
**Then** it returns `'x = 5'`

### AC10: A second attempt cannot be added while a review is pending

**Given** `seedState()` (`s1` is `AWAITING_REVIEW`)
**When** `addAttempt(state, { submissionId: 's1', attemptId: 'a9', at: '2026-09-03T08:00:00.000Z', answer: 'Another go.' })`
**Then** the result is `{ ok: false, error: { code: 'REVIEW_PENDING', message: 'Submission s1 is already awaiting review' } }`
and `s1.attempts` still has length 1

### AC11: A blank question is rejected

**Given** `seedState()`
**When** `createSubmission` is called with `question: '   '`
**Then** the result is `{ ok: false, error: { code: 'QUESTION_REQUIRED', message: 'Question is required' } }`
and `state.submissions` still has length 4

### AC12: A blank answer is rejected

**Given** `seedState()`
**When** `createSubmission` is called with `answer: '   '`
**Then** the result is `{ ok: false, error: { code: 'ANSWER_REQUIRED', message: 'Answer is required' } }`

### AC13: The question length boundary is 2000 characters

**Given** `seedState()`
**When** `createSubmission` is called with a 2001-character question
**Then** the result is `{ ok: false, error: { code: 'QUESTION_TOO_LONG', message: 'Question must be 2000 characters or fewer' } }`
**And when** it is called with a 2000-character question, the result is `ok`

### AC14: A student cannot send work to themselves

**Given** `seedState()`
**When** `createSubmission` is called with `studentId: 'p1'` and `reviewerId: 'p1'`
**Then** the result is `{ ok: false, error: { code: 'SELF_REVIEW_FORBIDDEN', message: 'A person cannot review their own work' } }`

### AC15: The chosen reviewer must be in the reviewer list

**Given** `seedState()` (`p2` has `isReviewer === false`)
**When** `createSubmission` is called with `reviewerId: 'p2'`
**Then** the result is `{ ok: false, error: { code: 'NOT_A_REVIEWER', message: 'Tomas Alvarez is not a reviewer' } }`

### AC16: Only the assigned reviewer can review

**Given** `seedState()` (`s1` is assigned to `p3`)
**When** `reviewAttempt` is called on `s1` with `reviewerId: 'p4'`
**Then** the result is `{ ok: false, error: { code: 'NOT_ASSIGNED_REVIEWER', message: 'Submission s1 is assigned to Mr. Okafor' } }`

### AC17: There is nothing to review until the student has answered

**Given** `seedState()` (`s4` is `ASSIGNED`, 0 attempts)
**When** `reviewAttempt` is called on `s4` by `p3`
**Then** the result is `{ ok: false, error: { code: 'NO_ATTEMPT_TO_REVIEW', message: 'Submission s4 has no answer yet' } }`

### AC18: An attempt cannot be reviewed twice

**Given** `seedState()` (`s2`'s only attempt already has a review)
**When** `reviewAttempt` is called on `s2` by `p3`
**Then** the result is `{ ok: false, error: { code: 'ALREADY_REVIEWED', message: 'Attempt a2 has already been reviewed' } }`
and `s2.attempts[0].review.score` is still `52`

### AC19: The score boundaries are 0 and 100 inclusive

**Given** `seedState()`
**When** `reviewAttempt` is called on `s1` with `score: 101`
**Then** the result is `{ ok: false, error: { code: 'SCORE_OUT_OF_RANGE', message: 'Score must be between 0 and 100' } }`
**And when** called with `score: -1`, the same error
**And when** called with `score: 0` and with `score: 100`, the result is `ok`

### AC20: A fractional score is rejected

**Given** `seedState()`
**When** `reviewAttempt` is called on `s1` with `score: 78.5`
**Then** the result is `{ ok: false, error: { code: 'SCORE_NOT_INTEGER', message: 'Score must be a whole number' } }`

### AC21: Decision and next action must agree

**Given** `seedState()`
**When** `reviewAttempt` is called on `s1` with `decision: 'APPROVED'` and `nextAction: 'REPEAT'`
**Then** the result is `{ ok: false, error: { code: 'INCONSISTENT_VERDICT', message: 'APPROVED cannot be paired with REPEAT' } }`
**And when** called with `decision: 'NOT_APPROVED'` and `nextAction: 'DONE'`
**Then** the error message is `'NOT_APPROVED cannot be paired with DONE'`

### AC22: A review must carry a comment

**Given** `seedState()`
**When** `reviewAttempt` is called on `s1` with `comment: '   '`
**Then** the result is `{ ok: false, error: { code: 'COMMENT_REQUIRED', message: 'Comment is required' } }`

### AC23: An unknown submission id is rejected

**Given** `seedState()`
**When** `reviewAttempt` is called with `submissionId: 's99'`
**Then** the result is `{ ok: false, error: { code: 'SUBMISSION_NOT_FOUND', message: 'No submission with id s99' } }`

### AC24: A reviewer's queue holds only their pending work, oldest first

**Given** `seedState()`
**When** `queueForReviewer(state, 'p3')`
**Then** it returns exactly one submission, id `'s1'`
**And when** `queueForReviewer(state, 'p4')`
**Then** it returns `[]` (`s3` is closed)

### AC25: A student's list holds the work waiting on them

**Given** `seedState()`
**When** `assignmentsFor(state, 'p2')`
**Then** it returns exactly one submission, id `'s4'` (`ASSIGNED`)
**And when** `assignmentsFor(state, 'p1')`
**Then** it returns exactly one submission, id `'s2'` (`NEEDS_REVISION`)

### AC27: Only the student may answer their own submission

**Given** `seedState()` (`s2` belongs to `p1`)
**When** `addAttempt(state, { submissionId: 's2', attemptId: 'a9', at: '2026-09-03T08:00:00.000Z', actorId: 'p3', answer: 'Not my homework.' })`
**Then** the result is `{ ok: false, error: { code: 'NOT_THE_STUDENT', message: 'Submission s2 belongs to Maya Chen' } }`
and `s2.attempts` still has length 1

> Added 2026-09-03 after review. `addAttempt` took no actor, so any signed-in
> person could POST an answer onto someone else's submission — verified live
> against the running app. The UI hid the form; the route did not enforce it.

### AC28: Work cannot be assigned to someone who is not in the directory

**Given** `seedState()`
**When** `assignSubmission(state, { id: 's9', at: '2026-09-03T08:00:00.000Z', reviewerId: 'p3', studentId: 'p999', question: 'Ghost question.' })`
**Then** the result is `{ ok: false, error: { code: 'PERSON_NOT_FOUND', message: 'No person with id p999' } }`
and `state.submissions` still has length 4

> Added 2026-09-03 after review. Assignments to an unknown student were
> accepted and became invisible work owned by nobody.

### AC26: Commands never mutate the state they are given

**Given** `const before = seedState()` and `const snapshot = structuredClone(before)`
**When** `reviewAttempt` on `s1` returns `ok`
**Then** `before` is deep-equal to `snapshot`, and
`before.submissions[0].attempts[0].review === null`

## Files to Modify

| File | Change |
| ---- | ------ |
| `src/domain/types.ts` | Extend. `Submission`, `Attempt`, `Review`, `SubmissionStatus`, `Decision`, `NextAction`; `AppState.submissions` typed |
| `src/domain/result.ts` | Extend `ErrorCode` with `SUBMISSION_NOT_FOUND`, `SUBMISSION_CLOSED`, `REVIEW_PENDING`, `QUESTION_REQUIRED`, `QUESTION_TOO_LONG`, `ANSWER_REQUIRED`, `ANSWER_TOO_LONG`, `SELF_REVIEW_FORBIDDEN`, `NOT_A_REVIEWER`, `NOT_ASSIGNED_REVIEWER`, `NO_ATTEMPT_TO_REVIEW`, `ALREADY_REVIEWED`, `SCORE_OUT_OF_RANGE`, `SCORE_NOT_INTEGER`, `INCONSISTENT_VERDICT`, `COMMENT_REQUIRED` |
| `src/domain/submissions.ts` | New. `createSubmission`, `assignSubmission`, `addAttempt`, `reviewAttempt` |
| `src/domain/queries.ts` | New. `queueForReviewer`, `assignmentsFor`, `draftAnswerFor`, `isLocked` — pure, total, no `Result` wrapper |
| `src/domain/seed.ts` | Extend with the four seeded submissions in the table above |
| `src/domain/submissions.test.ts` | New. AC1–AC23, AC26 |
| `src/domain/queries.test.ts` | New. AC9, AC24, AC25 |

Not in this spec: the in-memory server store, HTTP routes and the UI. They
consume these functions and get their own spec once the stack is chosen.

## Risk

- **What could break:** `identity-and-directory` shares `AppState`,
  `Result` and `seed.ts`. Extending `seed.ts` with submissions changes the
  fixture that feature's AC13 asserts on — the two specs must land with the
  same seed table or that test fails.
- **The status machine is the whole product.** A wrong transition (say,
  `CORRECT` closing a submission) is silent: no crash, just a student who
  can never revise. AC4–AC7 exist to make each transition fail loudly.
- **Rollback:** `git revert` of the feature commit. State is in memory and
  reseeds whenever no previous data is available (PRD decisions 1 and 8) —
  no data to migrate or lose.

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
| -------- | ---- | ----- | ---- | ---- |
| `createSubmission` | AC1 · happy path — `creates a submission awaiting review with one attempt` | seeded state | valid input | `submissions.length === 5`, record deep-equals fixture |
| `assignSubmission` | AC2 · happy path — `creates an assigned submission with no attempts` | seeded state | reviewer `p3`, student `p1` | `status === 'ASSIGNED'`, `attempts.length === 0`, `createdBy === 'p3'` |
| `assignSubmission` | AC11 · error — `rejects an assignment with a blank question` | seeded state | `question: '   '` | `QUESTION_REQUIRED` |
| `assignSubmission` | AC14 · error — `rejects a reviewer assigning work to themselves` | seeded state | `studentId === reviewerId === 'p3'` | `SELF_REVIEW_FORBIDDEN` |
| `addAttempt` | AC3 · happy path — `answers an assigned question` | seeded state | `s4` + answer | `status === 'AWAITING_REVIEW'`, `attempts.length === 1` |
| `addAttempt` | AC7 · edge — `accepts a further attempt after CONTINUE` | seeded state | `s3` + answer | `attempts.length === 3`, `status === 'AWAITING_REVIEW'` |
| `addAttempt` | AC6 · error — `refuses an attempt on a DONE-locked submission` | state after a `DONE` review on `s1` | `s1` + answer | `SUBMISSION_CLOSED` |
| `addAttempt` | AC10 · error — `refuses a second attempt while a review is pending` | seeded state | `s1` + answer | `REVIEW_PENDING`, `attempts.length === 1` |
| `addAttempt` | AC12 · error — `rejects a blank answer` | seeded state | `s4`, `answer: '   '` | `ANSWER_REQUIRED` |
| `addAttempt` | AC23 · error — `rejects an unknown submission id` | seeded state | `'s99'` | `SUBMISSION_NOT_FOUND` |
| `reviewAttempt` | AC4 · happy path — `REPEAT reopens the submission and stores the review` | seeded state | `s1`, `NOT_APPROVED`/40/`REPEAT` | `status === 'NEEDS_REVISION'`, review deep-equals fixture |
| `reviewAttempt` | AC5 · happy path — `CONTINUE closes without locking` | seeded state | `s1`, `APPROVED`/88/`CONTINUE` | `status === 'CLOSED'`, `isLocked === false` |
| `reviewAttempt` | AC6 · happy path — `DONE closes and locks` | seeded state | `s1`, `APPROVED`/95/`DONE` | `status === 'CLOSED'`, `isLocked === true` |
| `reviewAttempt` | AC8 · invariant — `leaves earlier attempts and reviews untouched` | seeded state | second round on `s2` | `attempts[0].review.score === 52`, `attempts.length === 2` |
| `reviewAttempt` | AC16 · error — `refuses a reviewer the submission is not assigned to` | seeded state | `s1` reviewed by `p4` | `NOT_ASSIGNED_REVIEWER` |
| `reviewAttempt` | AC17 · error — `refuses a submission with no answer yet` | seeded state | `s4` by `p3` | `NO_ATTEMPT_TO_REVIEW` |
| `reviewAttempt` | AC18 · error — `refuses to review an attempt twice` | seeded state | `s2` by `p3` | `ALREADY_REVIEWED`, score still 52 |
| `reviewAttempt` | AC19 · boundary — `rejects 101 and -1` | seeded state | `score: 101`, then `-1` | `SCORE_OUT_OF_RANGE` both times |
| `reviewAttempt` | AC19 · boundary — `accepts 0 and 100` | seeded state | `score: 0`, then `100` | `ok` both times |
| `reviewAttempt` | AC20 · error — `rejects a fractional score` | seeded state | `score: 78.5` | `SCORE_NOT_INTEGER` |
| `reviewAttempt` | AC21 · error — `rejects APPROVED with REPEAT` | seeded state | `APPROVED` + `REPEAT` | `INCONSISTENT_VERDICT`, message names both values |
| `reviewAttempt` | AC21 · error — `rejects NOT_APPROVED with DONE` | seeded state | `NOT_APPROVED` + `DONE` | `INCONSISTENT_VERDICT` |
| `reviewAttempt` | AC22 · error — `rejects a blank comment` | seeded state | `comment: '   '` | `COMMENT_REQUIRED` |
| `reviewAttempt` | AC23 · error — `rejects an unknown submission id` | seeded state | `'s99'` | `SUBMISSION_NOT_FOUND` |
| `reviewAttempt` | AC26 · invariant — `does not mutate the state it is given` | cloned seed | valid review on `s1` | input deep-equals clone, `attempts[0].review === null` |
| `createSubmission` | AC11 · error — `rejects a blank question` | seeded state | `question: '   '` | `QUESTION_REQUIRED`, `submissions.length === 4` |
| `createSubmission` | AC12 · error — `rejects a blank answer` | seeded state | `answer: '   '` | `ANSWER_REQUIRED` |
| `createSubmission` | AC13 · boundary — `rejects a 2001-character question` | seeded state | 2001 × `'q'` | `QUESTION_TOO_LONG` |
| `createSubmission` | AC13 · boundary — `accepts a 2000-character question` | seeded state | 2000 × `'q'` | `ok` |
| `createSubmission` | AC14 · error — `rejects sending work to yourself` | seeded state | `studentId === reviewerId` | `SELF_REVIEW_FORBIDDEN` |
| `createSubmission` | AC15 · error — `rejects a reviewer who is not in the reviewer list` | seeded state | `reviewerId: 'p2'` | `NOT_A_REVIEWER` |
| `draftAnswerFor` | AC9 · happy path — `returns a blank draft after REPEAT` | seeded state | `'s2'` | `''` |
| `draftAnswerFor` | AC9 · happy path — `returns the previous answer after CORRECT` | seed truncated to `a3` | `'s3'` | `'x = 5'` |
| `queueForReviewer` | AC24 · happy path — `returns only that reviewer's pending submissions` | seeded state | `'p3'` | `['s1']` |
| `queueForReviewer` | AC24 · edge — `returns an empty queue when everything is closed` | seeded state | `'p4'` | `[]` |
| `assignmentsFor` | AC25 · happy path — `returns assigned work` | seeded state | `'p2'` | `['s4']` |
| `assignmentsFor` | AC25 · happy path — `returns work needing revision` | seeded state | `'p1'` | `['s2']` |

## Spec Readiness checklist

- [x] Every AC has a precise expected value — no "works correctly"
- [x] Another person could write a test from each AC without asking
- [x] Every AC can fail — one that cannot fail proves nothing
- [x] Error and edge cases have ACs of their own (AC6, AC10–AC23)
- [x] Every AC appears in the testing strategy table
