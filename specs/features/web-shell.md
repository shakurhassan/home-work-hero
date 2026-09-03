# Feature: web-shell

Status: Done · 2026-09-03 · Grounded in `specs/PRD.md`, `specs/architecture.md`,
`specs/ui-ux.md`, `specs/tech-stack.md`
Depends on: `identity-and-directory` (Done), `review-loop` (Done)

## Problem Statement

The domain is complete and 55 tests pass, but `npm start` serves one line of
plain text. Nothing renders the seeded world, nothing reads a form, and no
browser can reach any of the 41 acceptance criteria already implemented. The
product exists only as functions.

This feature is the shell those functions have been waiting for: an
in-memory store, a per-browser identity cookie, a router, and server-rendered
pages. No new domain logic — every command and query already exists.

## Proposed Change

`web/ → store/ → domain/`, one direction (architecture.md). The store holds
one `AppState`, seeded lazily on first read (PRD decision 8). Sessions map a
cookie value to an `actorId`, kept out of `AppState` (PRD decision 11).

Handlers do five steps and nothing else: parse, mint ids and timestamps,
call one domain command, commit-or-report, redirect. Views are pure
functions from state to an HTML string, so they are unit-testable without a
socket.

### Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Who are you? — the identity picker |
| POST | `/identity` | Set the cookie's actor |
| POST | `/register` | Register a student, then act as them |
| GET | `/home` | Waiting on you · To review · All my work |
| GET | `/new` | New submission form |
| POST | `/submissions` | `createSubmission` |
| POST | `/reviewers` | `addReviewer`, returns to `/new` |
| GET | `/assign` | Assign-work form (reviewers only) |
| POST | `/assignments` | `assignSubmission` |
| GET | `/s/:id` | One submission: question, timeline, action panel |
| POST | `/s/:id/attempts` | `addAttempt` |
| POST | `/s/:id/reviews` | `reviewAttempt` |

Anything else is a 404.

## Acceptance Criteria

### AC1: The store seeds itself on first read, not at boot

**Given** a fresh store (`resetStore()` called)
**When** `getState()`
**Then** it returns a state whose `people` have ids `['p1','p2','p3','p4']`
and whose `submissions` have ids `['s1','s2','s3','s4']`

### AC2: Data that exists is never reseeded

**Given** a fresh store, then `setState({ people: [], submissions: [] })`
**When** `getState()`
**Then** it returns `{ people: [], submissions: [] }` — `people` has length 0

### AC3: A cookie header yields the session id

**Given** the header `'hwh_sid=abc123; theme=dark'`
**When** `readCookie(header, 'hwh_sid')`
**Then** it returns `'abc123'`
**And when** the header is `'theme=dark'`, it returns `null`
**And when** the header is `undefined`, it returns `null`

### AC4: A session remembers who a browser is acting as

**Given** `clearSessions()`, then `setActor('sess-1', 'p3')`
**When** `actorFor('sess-1')`
**Then** it returns `'p3'`
**And when** `actorFor('sess-unknown')`, it returns `null`
**And when** `actorFor(null)`, it returns `null`

### AC5: The router matches a submission path and captures its id

**Given** nothing
**When** `matchRoute('GET', '/s/s1')`
**Then** it returns `{ name: 'submission', id: 's1' }`
**And when** `matchRoute('POST', '/s/s1/reviews')`, it returns
`{ name: 'addReview', id: 's1' }`

### AC6: An unknown path does not match

**Given** nothing
**When** `matchRoute('GET', '/nope')`
**Then** it returns `null`
**And when** `matchRoute('DELETE', '/')`, it returns `null`

### AC7: A form body is decoded into fields

**Given** the body `'question=Why+ice%3F&answer=Less+dense&reviewerId=p3'`
**When** `parseForm(body)`
**Then** it returns
`{ question: 'Why ice?', answer: 'Less dense', reviewerId: 'p3' }`
**And when** the body is `''`, it returns `{}`

### AC8: HTML special characters are escaped

**Given** nothing
**When** `escapeHtml('<b>"Tom" & \'Jo\'</b>')`
**Then** it returns
`'&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jo&#39;&lt;/b&gt;'`

### AC9: The identity page lists everyone, marking reviewers

**Given** `seedState()`
**When** `identityPage(state)`
**Then** the string contains `'Who are you?'`, contains `'Maya Chen'`,
`'Tomas Alvarez'`, `'Mr. Okafor'` and `'Sam Chen'`, contains
`'name="personId" value="p3"'`, and contains `'action="/register"'`

### AC10: A student's home shows what is waiting on them and no review queue

**Given** `seedState()`
**When** `homePage(state, 'p1')`
**Then** the string contains `'Waiting on you'`, contains
`'Explain photosynthesis in your own words.'`, contains `'needs revision'`,
and does **not** contain `'To review'`

### AC11: A reviewer's home shows their queue

**Given** `seedState()`
**When** `homePage(state, 'p3')`
**Then** the string contains `'To review'` and contains
`'Why does ice float on water?'`

### AC12: A submission page shows every attempt and verdict, oldest first

**Given** `seedState()`
**When** `submissionPage(state, 'p2', 's3')`
**Then** the string contains `'x = 5'` before it contains `'3x = 15'`,
contains `'52 / 100'`, contains `'78 / 100'`, contains `'CORRECT'` and
contains `'CONTINUE'`

> Corrected 2026-09-03 during tdd. The AC first used `'3x + 7 = 22'` as the
> second marker, but that string is `s3`'s own question and is rendered in
> the `<h1>` above the timeline, so the ordering assertion could never hold
> however correct the view was. `'3x = 15'` appears only inside attempt 2.

### AC13: The action panel is chosen by actor and status

**Given** `seedState()`
**When** `submissionPage(state, 'p3', 's1')` (the assigned reviewer, awaiting review)
**Then** it contains `'name="score"'` and `'name="nextAction"'`
**And when** `submissionPage(state, 'p4', 's1')` (not the assigned reviewer)
**Then** it does **not** contain `'name="score"'`
**And when** `submissionPage(state, 'p1', 's2')` (the student, needs revision)
**Then** it contains `'name="answer"'`

### AC14: Rendered content is escaped

**Given** `seedState()` with `s1.question` replaced by `'<script>x</script>'`
**When** `submissionPage(state, 'p1', 's1')`
**Then** it contains `'&lt;script&gt;x&lt;/script&gt;'` and does **not**
contain `'<script>x</script>'`

### AC15: The server serves the identity page as HTML

**Given** the app listening on an ephemeral port with a fresh store
**When** `GET /`
**Then** the status is `200`, the `content-type` header starts with
`'text/html'`, and the body contains `'Who are you?'`

### AC16: A student submits work through the browser and is redirected

**Given** a fresh store and a session acting as `'p1'`
**When** `POST /submissions` with
`question=What+is+a+prime+number%3F&answer=Two+factors&reviewerId=p3`
**Then** the status is `303`, the `location` header matches `/^\/s\/.+/`, and
`getState().submissions` has length 5

### AC17: A rejected command re-renders with the domain's own message

**Given** a fresh store and a session acting as `'p1'`
**When** `POST /submissions` with `question=+++&answer=Two+factors&reviewerId=p3`
**Then** the status is `200`, the body contains `'Question is required'`, and
`getState().submissions` still has length 4

### AC19: A malformed enum value is rejected, never crashed

**Given** a fresh store and a session acting as `'p3'`
**When** `POST /s/s1/reviews` with
`decision=FOO&score=50&nextAction=REPEAT&comment=hi`
**Then** the status is `200`, the body contains
`'FOO is not a valid decision'`, and `s1.attempts[0].review` is still `null`
**And when** `nextAction=BOGUS` is sent with `decision=NOT_APPROVED`
**Then** the status is `200` and the body contains
`'BOGUS is not a valid next action'`

> Added 2026-09-03 after review. The handler cast untrusted form strings
> straight to `Decision` and `NextAction`; a bogus `decision` made
> `ACTIONS_FOR[decision]` undefined and threw, answering 500. Untrusted
> input must reach the domain already parsed, or be refused with a message.

### AC20: A rejected command keeps what the user typed

**Given** `seedState()`
**When** `submissionPage(state, 'p3', 's1', 'Score must be a whole number', { score: '78.5', comment: 'Nearly there' })`
**Then** the string contains `value="78.5"` and contains `'Nearly there'`

> Added 2026-09-03 after review. `ui-ux.md` requires that a failed command
> re-render "with the fields keeping what was typed"; `reviewPanel` and
> `answerPanel` took no values, so a reviewer lost the whole form.

### AC21: A submission closed with CONTINUE still offers the student an answer box

**Given** `seedState()` (`s3` is `CLOSED` after `CONTINUE`, not locked)
**When** `submissionPage(state, 'p2', 's3')`
**Then** it contains `'name="answer"'`
**And when** `submissionPage(state, 'p2', 's4')` is rendered after `s4` has
been closed with `DONE`
**Then** it does **not** contain `'name="answer"'`

> Added 2026-09-03. `review-loop` AC7 says the domain accepts a further
> attempt after `CONTINUE`, but the panel table offered no way to make one,
> so accepted work could never be improved.

### AC22: An unknown submission id is a 404

**Given** the app listening and a session acting as `'p1'`
**When** `GET /s/s99`
**Then** the status is `404` and the body contains `'No such submission'`

> Added 2026-09-03. The page rendered with a 200, so a mistyped URL looked
> like a legitimately empty submission.

### AC18: An unknown path is a 404

**Given** the app listening
**When** `GET /nope`
**Then** the status is `404`

## Files to Modify

| File | Change |
| ---- | ------ |
| `src/store/store.ts` | New. `getState`, `setState`, `resetStore` — lazy seed on first read |
| `src/store/sessions.ts` | New. `actorFor`, `setActor`, `newSessionId`, `clearSessions` |
| `src/web/cookies.ts` | New. `readCookie(header, name)` — pure |
| `src/web/form.ts` | New. `parseForm(body)` — pure |
| `src/web/html.ts` | New. `escapeHtml`, `layout` and the single `<style>` block |
| `src/web/router.ts` | New. `Route` union and `matchRoute(method, path)` — pure |
| `src/web/views.ts` | New. `identityPage`, `homePage`, `newSubmissionPage`, `assignPage`, `submissionPage` — pure, state in, string out |
| `src/web/handlers.ts` | New. One handler per route: parse → mint → command → 303 or re-render |
| `src/web/server.ts` | New. `createApp()` returning an `http.Server`, so tests can listen on port 0 |
| `src/main.ts` | Replace the placeholder with `createApp().listen(PORT)` |
| `src/store/store.test.ts` | New. AC1, AC2 |
| `src/store/sessions.test.ts` | New. AC4 |
| `src/web/router.test.ts` | New. AC5, AC6 |
| `src/web/parsing.test.ts` | New. AC3, AC7, AC8 |
| `src/web/views.test.ts` | New. AC9–AC14 |
| `src/web/server.test.ts` | New. AC15–AC18 |

## Risk

- **Mutable module state across tests.** `store.ts` and `sessions.ts` hold
  process-wide state; a test that forgets `resetStore()` sees another test's
  writes. Every test in `store.test.ts` and `server.test.ts` resets first.
- **The dependency rule.** `views.ts` must import from `domain/` only, never
  from `store/`. A view that reaches for `getState()` itself becomes
  untestable without the store, and nothing fails loudly.
- **Escaping is easy to skip** on one field and hard to notice. AC14 covers
  the submission page; every other view uses the same `escapeHtml` helper.
- **Ports in tests.** `server.test.ts` listens on port `0` so it never
  collides with a running dev server.
- **Rollback:** `git revert`; `src/main.ts` returns to the placeholder. No
  data to migrate — the store is memory.

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
| -------- | ---- | ----- | ---- | ---- |
| `getState` | AC1 · happy path — `seeds on first read` | fresh store | `getState()` | person ids `['p1'..'p4']`, submission ids `['s1'..'s4']` |
| `getState` | AC2 · edge — `does not reseed when data exists` | after `setState` with empty state | `getState()` | `people` length 0 |
| `readCookie` | AC3 · happy path — `finds the named cookie` | `'hwh_sid=abc123; theme=dark'` | name `hwh_sid` | `'abc123'` |
| `readCookie` | AC3 · error — `returns null when absent` | `'theme=dark'` | name `hwh_sid` | `null` |
| `readCookie` | AC3 · error — `returns null with no header` | `undefined` | name `hwh_sid` | `null` |
| `actorFor` | AC4 · happy path — `remembers the actor for a session` | `setActor('sess-1','p3')` | `actorFor('sess-1')` | `'p3'` |
| `actorFor` | AC4 · error — `unknown session has no actor` | fresh sessions | `actorFor('sess-unknown')` | `null` |
| `actorFor` | AC4 · error — `null session has no actor` | fresh sessions | `actorFor(null)` | `null` |
| `matchRoute` | AC5 · happy path — `captures a submission id` | — | `GET /s/s1` | `{ name: 'submission', id: 's1' }` |
| `matchRoute` | AC5 · happy path — `captures a review post` | — | `POST /s/s1/reviews` | `{ name: 'addReview', id: 's1' }` |
| `matchRoute` | AC6 · error — `unknown path` | — | `GET /nope` | `null` |
| `matchRoute` | AC6 · error — `wrong method` | — | `DELETE /` | `null` |
| `parseForm` | AC7 · happy path — `decodes fields` | encoded body | `parseForm` | three decoded fields |
| `parseForm` | AC7 · edge — `empty body` | `''` | `parseForm` | `{}` |
| `escapeHtml` | AC8 · happy path — `escapes the five characters` | mixed string | `escapeHtml` | exact escaped string |
| `identityPage` | AC9 · happy path — `lists everyone and the register form` | seed | render | contains all four names, `value="p3"`, `action="/register"` |
| `homePage` | AC10 · happy path — `student sees their own work only` | seed, `p1` | render | contains `Waiting on you`, `needs revision`; no `To review` |
| `homePage` | AC11 · happy path — `reviewer sees their queue` | seed, `p3` | render | contains `To review`, `Why does ice float on water?` |
| `submissionPage` | AC12 · happy path — `timeline oldest first with both verdicts` | seed, `s3` | render | `x = 5` before `3x = 15`; `52 / 100`; `78 / 100` |
| `submissionPage` | AC13 · happy path — `review form for the assigned reviewer` | seed, `p3`, `s1` | render | `name="score"`, `name="nextAction"` |
| `submissionPage` | AC13 · error — `no form for anyone else` | seed, `p4`, `s1` | render | no `name="score"` |
| `submissionPage` | AC13 · happy path — `answer box for the student` | seed, `p1`, `s2` | render | `name="answer"` |
| `submissionPage` | AC14 · error — `escapes a scripted question` | seed with `<script>` | render | escaped, not raw |
| `GET /` | AC15 · happy path — `serves the identity page` | app listening | request | 200, `text/html`, `Who are you?` |
| `POST /submissions` | AC16 · happy path — `redirects after a valid submit` | session as `p1` | valid form | 303, `location` `/s/…`, 5 submissions |
| `POST /submissions` | AC17 · error — `re-renders with the domain message` | session as `p1` | blank question | 200, `Question is required`, 4 submissions |
| `GET /nope` | AC18 · error — `unknown path is 404` | app listening | request | 404 |

## Spec Readiness checklist

- [x] Every AC has a precise expected value — no "works correctly"
- [x] Another person could write a test from each AC without asking
- [x] Every AC can fail — one that cannot fail proves nothing
- [x] Error and edge cases have ACs of their own (AC2, AC3, AC6, AC7, AC13, AC14, AC17, AC18)
- [x] Every AC appears in the testing strategy table
