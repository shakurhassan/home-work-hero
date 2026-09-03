# Feature: identity-and-directory

Status: Done · 2026-09-03 · Grounded in `specs/PRD.md` (decisions 1, 5, 6, 7)
All 15 ACs implemented and covered by 20 passing tests in `src/domain/`.

## Problem Statement

The app has no accounts and no database (PRD non-goals). Yet a student
must be able to say who they are, choose a reviewer, and add a reviewer
who is not in the list yet. And a first-time visitor must land on
something that already shows what the product does, rather than an empty
screen.

So this feature owns three things: the directory of people, the notion of
"who am I acting as", and the seeded demo data that both the running app
and the test suite read from.

## Proposed Change

One `Person` record covers both roles — role is what you are doing, not an
account type (PRD, Users). A person carries an `isReviewer` flag; the
reviewer list is the subset where it is true. Registering adds you to the
directory; the caller then makes you the current actor, using the id it
already supplied. Adding a reviewer either creates a
person with the flag set, or sets the flag on a person who already exists.
Any person in the directory can be selected as the actor, including one
just added — with no notifications, the alternative leaves work
permanently unreviewable (PRD decision 10).

`seedState()` returns a fresh `AppState` with four people and four
submissions parked in four different statuses. It is the single source of
truth for the demo and for test fixtures, so the two cannot drift.

### Types this feature owns

```ts
type PersonId = string;

interface Person {
  id: PersonId;
  name: string;          // trimmed, 1..80 chars
  email: string;         // trimmed, as entered
  isReviewer: boolean;
}

interface AppState {
  people: Person[];
  submissions: Submission[];   // owned by review-loop
}

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

**Who you are acting as is not part of `AppState`.** There is one shared
world and many browsers (PRD decision 11); if `actorId` lived in the state,
one browser switching identity would switch every other browser's too. The
core exposes `selectActor(state, personId): Result<PersonId>`, which only
validates that the person exists and hands the id back — the server stores
it against that browser's cookie.

Commands are pure: `(state, input) => Result<AppState>`. Ids and
timestamps arrive in the input, never from `Date.now()` or a random
source inside the core (PRD decision 7), so every test asserts an exact
value.

Email comparison is on `email.trim().toLowerCase()`. A valid email
matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

### Seed data (exact)

| id | name | email | isReviewer |
|----|------|-------|-----------|
| `p1` | Maya Chen | maya@example.com | false |
| `p2` | Tomas Alvarez | tomas@example.com | false |
| `p3` | Mr. Okafor | okafor@example.com | true |
| `p4` | Sam Chen | sam@example.com | true |

The four seeded submissions are specified in `review-loop.md`. The seed
carries no actor: a browser arrives with no identity and chooses one.

## Acceptance Criteria

### AC1: Registering a student adds them to the directory

**Given** `seedState()` (4 people)
**When** `registerStudent(state, { id: 'p9', name: 'Ada Byron', email: 'ada@example.com' })`
**Then** the result is `ok`, `value.people` has length 5, and `value.people[4]`
deep-equals `{ id: 'p9', name: 'Ada Byron', email: 'ada@example.com', isReviewer: false }`
**And when** `selectActor(value, 'p9')` is called
**Then** the result is `{ ok: true, value: 'p9' }` — the caller can make the
person it just registered the actor

### AC2: A duplicate email is rejected, whatever its case

**Given** `seedState()`
**When** `registerStudent(state, { id: 'p9', name: 'Other Maya', email: '  MAYA@Example.com ' })`
**Then** the result is `{ ok: false, error: { code: 'EMAIL_TAKEN', message: 'maya@example.com is already in the directory' } }`
and the input state is deep-equal to `seedState()`

### AC3: A blank name is rejected

**Given** `seedState()`
**When** `registerStudent(state, { id: 'p9', name: '   ', email: 'ada@example.com' })`
**Then** the result is `{ ok: false, error: { code: 'NAME_REQUIRED', message: 'Name is required' } }`
and `state.people` still has length 4

### AC4: A name longer than 80 characters is rejected

**Given** `seedState()`
**When** `registerStudent` is called with a name of 81 `'a'` characters
**Then** the result is `{ ok: false, error: { code: 'NAME_TOO_LONG', message: 'Name must be 80 characters or fewer' } }`
**And when** it is called with 80 `'a'` characters, the result is `ok` and
`value.people[4].name` has length 80

### AC5: A malformed email is rejected

**Given** `seedState()`
**When** `registerStudent(state, { id: 'p9', name: 'Ada Byron', email: 'ada@example' })`
**Then** the result is `{ ok: false, error: { code: 'INVALID_EMAIL', message: 'ada@example is not a valid email address' } }`

### AC6: Adding a brand-new reviewer appends them with the flag set

**Given** `seedState()`
**When** `addReviewer(state, { id: 'p9', name: 'Ms. Ito', email: 'ito@example.com' })`
**Then** the result is `ok`, `value.people` has length 5,
`value.people[4]` deep-equals `{ id: 'p9', name: 'Ms. Ito', email: 'ito@example.com', isReviewer: true }`,
and `value.people.slice(0, 4)` is deep-equal to `seedState().people`
(adding a reviewer changes nobody else, and does not change who you are —
identity is not in this state at all)

### AC7: Adding a reviewer who is already a person promotes them in place

**Given** `seedState()`
**When** `addReviewer(state, { id: 'p9', name: 'Tomas A.', email: 'tomas@example.com' })`
**Then** the result is `ok`, `value.people` still has length 4, the person
with id `'p2'` has `isReviewer === true`, and their `name` is still
`'Tomas Alvarez'` (the existing record is promoted, not renamed)

### AC8: Adding someone who is already a reviewer is rejected

**Given** `seedState()`
**When** `addReviewer(state, { id: 'p9', name: 'Mr. O', email: 'okafor@example.com' })`
**Then** the result is `{ ok: false, error: { code: 'ALREADY_REVIEWER', message: 'Mr. Okafor is already a reviewer' } }`
and the input state is deep-equal to `seedState()`

### AC9: Selecting a known person yields that person's id

**Given** `seedState()`
**When** `selectActor(state, 'p3')`
**Then** the result is `{ ok: true, value: 'p3' }` and `state` is unchanged
— the id is returned for the server to hold against the browser's cookie,
not written into the world

### AC10: Selecting an unknown person is rejected

**Given** `seedState()`
**When** `selectActor(state, 'p99')`
**Then** the result is `{ ok: false, error: { code: 'PERSON_NOT_FOUND', message: 'No person with id p99' } }`

### AC11: A reviewer added during the session can immediately be acted as

**Given** `seedState()` after `addReviewer(state, { id: 'p9', name: 'Ms. Ito', email: 'ito@example.com' })`
**When** `selectActor(state, 'p9')`
**Then** the result is `{ ok: true, value: 'p9' }`

### AC12: The reviewer list is the flagged subset, sorted by name

**Given** `seedState()`
**When** `listReviewers(state)`
**Then** it returns exactly 2 people whose ids, in order, are `['p3', 'p4']`
(`'Mr. Okafor'` before `'Sam Chen'`, ascending by `name`)

### AC13: The seed is exactly the documented fixture

**Given** nothing
**When** `seedState()`
**Then** `people` has length 4 with ids `['p1','p2','p3','p4']` matching the
seed table above, `submissions` has length 4 with ids `['s1','s2','s3','s4']`,
and `Object.keys(seedState())` is exactly `['people', 'submissions']`

### AC14: Two seeds are equal but not shared

**Given** `const a = seedState()` and `const b = seedState()`
**When** `a.people.push({ id: 'px', name: 'X', email: 'x@example.com', isReviewer: false })`
**Then** `b.people` still has length 4

### AC15: Commands never mutate the state they are given

**Given** `const before = seedState()` and `const snapshot = structuredClone(before)`
**When** `registerStudent(before, { id: 'p9', name: 'Ada Byron', email: 'ada@example.com' })` returns `ok`
**Then** `before` is deep-equal to `snapshot` and `value !== before`

## Files to Modify

| File | Change |
| ---- | ------ |
| `package.json` | New. Vitest, TypeScript, `npm test` / `npx tsc --noEmit` / `npm start` per AGENTS.md |
| `tsconfig.json` | New. `strict: true`, ES modules, no `any` |
| `src/domain/result.ts` | New. `Result<T>`, `ok()`, `err()`, the `ErrorCode` union (this feature contributes `EMAIL_TAKEN`, `NAME_REQUIRED`, `NAME_TOO_LONG`, `INVALID_EMAIL`, `ALREADY_REVIEWER`, `PERSON_NOT_FOUND`) |
| `src/domain/types.ts` | New. `Person`, `AppState`, `PersonId` — no `actorId`, per PRD decision 11 |
| `src/domain/validation.ts` | New. `normalizeEmail`, `isValidEmail`, `requireName` — pure, no I/O |
| `src/domain/people.ts` | New. `registerStudent`, `addReviewer`, `listReviewers`, and `selectActor(state, personId): Result<PersonId>` — validates only, returns the id |
| `src/domain/seed.ts` | New. `seedState()` returning a fresh deep copy each call |
| `src/domain/people.test.ts` | New. AC1–AC12, AC15 |
| `src/domain/seed.test.ts` | New. AC13, AC14 |

Deliberately **not** in this spec: the server, the HTTP layer, and the UI —
including the cookie that holds each browser's `actorId` and the lazy
seed-when-empty rule (PRD decisions 8 and 11). Both are shell concerns and
get their own spec once the stack is chosen. This core is pure and runs
under Vitest without either.

## Risk

- **What could break:** nothing — the repo has no source yet. The real risk
  is the shared `AppState` shape: `review-loop` extends the same type, so a
  change here ripples into that spec.
- **Identity outside the state** is easy to undo by accident. Anyone who
  "tidies" `actorId` back into `AppState` reintroduces the bug where one
  browser switching identity switches everyone's. AC9 asserts `selectActor`
  leaves the state untouched, so that regression fails a test.
- **`isReviewer` as a flag rather than a role table** may not survive a
  later requirement like "a reviewer who only reviews maths". Cheap to
  widen into `roles: Role[]` later; nothing outside `people.ts` reads it.
- **Rollback:** `git revert` of the feature commit. No data, no migration,
  no deployed state — the store is in memory and reseeds whenever no
  previous data is available (PRD decisions 1 and 8).

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
| -------- | ---- | ----- | ---- | ---- |
| `registerStudent` | AC1 · happy path — `adds a student to the directory` | seeded state | valid name + email, id `p9` | `people.length === 5`, new record deep-equals fixture |
| `registerStudent` | AC1 · integration — `the person just registered can be selected as actor` | state after AC1 | `selectActor(value, 'p9')` | `{ ok: true, value: 'p9' }` |
| `registerStudent` | AC2 · error — `rejects an email already in the directory, case-insensitively` | seeded state | `'  MAYA@Example.com '` | `EMAIL_TAKEN`, state unchanged |
| `registerStudent` | AC3 · error — `rejects a whitespace-only name` | seeded state | name `'   '` | `NAME_REQUIRED`, `people.length === 4` |
| `registerStudent` | AC4 · boundary — `rejects an 81-character name` | seeded state | 81 × `'a'` | `NAME_TOO_LONG` |
| `registerStudent` | AC4 · boundary — `accepts an 80-character name` | seeded state | 80 × `'a'` | `ok`, stored name length 80 |
| `registerStudent` | AC5 · error — `rejects an email with no dot in the domain` | seeded state | `'ada@example'` | `INVALID_EMAIL` |
| `registerStudent` | AC5 · error — `rejects an email with no @` | seeded state | `'ada.example.com'` | `INVALID_EMAIL` |
| `addReviewer` | AC6 · happy path — `appends a new person with isReviewer true` | seeded state | new email | `people.length === 5`, `isReviewer === true`, first 4 people unchanged |
| `addReviewer` | AC7 · edge — `promotes an existing person instead of duplicating them` | seeded state | `tomas@example.com` | `people.length === 4`, `p2.isReviewer === true`, name unchanged |
| `addReviewer` | AC8 · error — `rejects someone who is already a reviewer` | seeded state | `okafor@example.com` | `ALREADY_REVIEWER`, state unchanged |
| `addReviewer` | AC5 · error — `rejects a malformed reviewer email` | seeded state | `'ito@example'` | `INVALID_EMAIL` |
| `selectActor` | AC9 · happy path — `returns the id of a known person without touching state` | seeded state | `'p3'` | `{ ok: true, value: 'p3' }`, state deep-equals seed |
| `selectActor` | AC10 · error — `rejects an unknown person id` | seeded state | `'p99'` | `PERSON_NOT_FOUND` |
| `selectActor` | AC11 · integration — `can act as a reviewer added this session` | state after `addReviewer` p9 | `'p9'` | `{ ok: true, value: 'p9' }` |
| `listReviewers` | AC12 · happy path — `returns only reviewers, sorted by name` | seeded state | — | ids `['p3','p4']` |
| `listReviewers` | AC12 · edge — `returns an empty array when nobody is a reviewer` | state with `isReviewer` false for all | — | `[]` |
| `seedState` | AC13 · happy path — `returns the documented four people and four submissions` | — | — | exact ids, keys exactly `['people','submissions']` |
| `seedState` | AC14 · edge — `returns an independent copy each call` | two calls | mutate the first | second unchanged |
| `registerStudent` | AC15 · invariant — `does not mutate the state it is given` | cloned seed | valid input | input deep-equals clone, `value !== input` |

## Spec Readiness checklist

- [x] Every AC has a precise expected value — no "works correctly"
- [x] Another person could write a test from each AC without asking
- [x] Every AC can fail — one that cannot fail proves nothing
- [x] Error and edge cases have ACs of their own (AC2–AC5, AC8, AC10, AC14)
- [x] Every AC appears in the testing strategy table
