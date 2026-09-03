# PRD — Home Work Hero

Status: Draft · 2026-09-03 · Owner: Shakur

## Goal

A student writes down a homework question and their own answer, asks a
person to review it, and gets back a verdict, a score and a next action.
When the next action is "repeat", the student tries again and the earlier
attempt stays visible next to the new one. The product is that loop —
everything else is forms.

Success for v1: two browsers on one machine can run a full
submit → review → repeat → review cycle against seeded demo data, with no
database and no accounts.

## Users

- **Student** — writes questions and answers, picks a reviewer, revises
  after a "repeat", reads their own attempt history.
- **Reviewer** — a teacher, parent or peer. Works a queue of requests
  addressed to them, returns decision + score + next action + comment,
  and can also assign a question to a student directly.

Both are rows in one directory of people; role is what you are doing, not
a separate account type. Identity is a selector, not a login.

## Decisions

| # | Decision | Consequence |
|---|----------|-------------|
| 1 | **State lives in a `Map` in the server process**, held in memory and lost on restart. | There is a client/server boundary. Still zero database setup. |
| 2 | **A review has four fields**: decision (`approved` / `not approved`), score `0–100`, next action, and a comment. | Decision and next action are independent enums; the spec must rule on contradictory pairs such as approved + repeat. |
| 3 | **Attempts are append-only.** A submission owns an ordered `Attempt[]`; each attempt owns at most one review. Nothing is ever overwritten. | The improvement arc (52 → REPEAT → 78 → CONTINUE) is readable, and seed data can demonstrate it. |
| 4 | **Two entry points, one lifecycle.** A student starts with question + answer; a reviewer can assign a question with no answer yet. Both converge on `AWAITING_REVIEW`. | Student-assigned work needs its own status so "assigned to you, not yet answered" is visible in the student's queue. |
| 5 | **Question and answer are text.** No photo capture in v1. | Keeps the state blob small and drops the image-size edge case. Revisit later. |
| 6 | **Seeded demo data is the guidance.** Dummy students, a reviewer directory, and example submissions parked in *different* states — one awaiting review, one mid-repeat, one closed. | One seed module serves both `npm start` and the tests, so fixtures cannot drift from the demo. |
| 7 | **Business logic is pure.** `(state, input) => Result<state>`, no I/O, behind a `Store` interface. | Per AGENTS.md. The core is testable without the UI and survives a change of stack. |
| 8 | **Seeding is lazy, never eager.** The seed runs only when no previous data is available — not on every server boot. Data that exists is left alone. | The store cannot call `seedState()` unconditionally at startup. A browser is recognised across reloads, so it needs an identifier that survives them. |
| 9 | **The next-action enum is `CONTINUE \| REPEAT \| CORRECT \| DONE`.** Each value has one distinct consequence: `REPEAT` blanks the next answer, `CORRECT` prefills it, `CONTINUE` closes without locking, `DONE` closes and locks. | Confirmed. The transition table in `review-loop.md` is settled. |
| 10 | **Anyone in the directory can be selected as the current actor**, including a reviewer added moments ago. | Confirmed. Without it, a submission sent to a freshly added reviewer would be permanently unreviewable. |
| 11 | **One shared world; identity is per browser.** The server holds a single `AppState`, seeded when it is empty. A cookie carries only which person that browser is acting as. | Two browsers keep the real two-party flow of decision 1. `actorId` therefore cannot live inside `AppState` — otherwise one browser switching identity would switch the other's too. |

## Non-goals

Explicitly out of scope for v1 — not "later in v1", not at all:

- **No database, no migrations, no ORM.** In-memory only.
- **No authentication.** No passwords, sessions, tokens or password reset.
  Registration is "enter a name and email"; anyone in the directory can be
  selected as the current actor.
- **No notifications.** No email, no push, no in-app alerts. A reviewer
  finds work by opening their queue.
- **No AI assistance.** The app never answers, grades, hints at, or
  drafts homework. The student writes the answer; a person reviews it.
- **No file or photo upload** (see decision 5).
- **No deployment, multi-tenancy, or real-user data.** Local demo only.
- **No grading analytics, dashboards, leaderboards or exports.**
- **No mobile app.**

## Open questions

1. **Resolved** — see decision 9.
2. **Resolved** — see decision 10.
3. **Resolved** — see decision 11. A new browser joins the existing world
   and picks an identity; it does not get a seeded world of its own.
4. Assumed unless corrected: one reviewer per request; email unique across
   the whole directory rather than per role.

## Next step

Split into two feature specs against `specs/TEMPLATE.md`:
`identity-and-directory` (register, seed, add a reviewer) and `review-loop`
(submit, assign, review, score, next action, revise). Tech stack is still
undecided and this PRD does not need it.
