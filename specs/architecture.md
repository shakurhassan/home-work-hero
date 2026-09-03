# Architecture

Status: Draft · 2026-09-03 · Grounded in `specs/PRD.md` and `specs/tech-stack.md`

## Shape

Three layers, one direction of dependency. The arrow never reverses.

```
  web/           router · handlers · views      impure: sockets, cookies, clock, ids
    |  imports
    v
  store/         the one AppState + sessions    impure: mutable module state
    |  imports
    v
  domain/        pure functions, no I/O         imports nothing but itself
```

`domain/` cannot import `store/` or `web/`. That single rule is what makes
AGENTS.md's "business logic in pure functions, testable without the CLI/UI"
true rather than aspirational, and it is checkable by eye in a code review.

## Files

```
src/
  main.ts               starts the http server, wires the router
  domain/               ← specs/features/*.md live here
    types.ts            Person, Submission, Attempt, Review, AppState
    result.ts           Result<T>, ok(), err(), ErrorCode
    validation.ts       normalizeEmail, isValidEmail, requireName …
    people.ts           registerStudent, addReviewer, selectActor, listReviewers
    submissions.ts      createSubmission, assignSubmission, addAttempt, reviewAttempt
    queries.ts          queueForReviewer, assignmentsFor, draftAnswerFor, isLocked
    seed.ts             seedState()
  store/
    store.ts            getState(), setState(), the lazy seed
    sessions.ts         cookie <-> actorId
  web/
    router.ts           method + path -> handler
    handlers.ts         parse form -> call domain -> setState -> redirect
    html.ts             layout(), escapeHtml(), the one <style> block
    views.ts            one function per page, returns a string
```

## The store

```ts
let state: AppState | null = null;

export function getState(): AppState {
  if (state === null) state = seedState();   // PRD decision 8: lazy, never eager
  return state;
}
export function setState(next: AppState): void { state = next; }
```

One shared world for every browser (PRD decisions 1 and 11). The seed runs
on first read, not at boot, so "no previous data available" is the only
thing that triggers it. A process restart empties memory and the next
request reseeds.

**Sessions are separate from the world.** `Map<string, PersonId>` keyed by a
cookie value; the cookie is a `crypto.randomUUID()` set on first response.
`actorId` is deliberately not in `AppState` — with one shared world, storing
it there would make one browser's identity switch change everybody's.

## Request lifecycle

Every mutating request is the same five steps, and handlers do nothing else:

1. **Parse** — read the cookie, `await` the body, decode `application/x-www-form-urlencoded`.
2. **Mint** — generate `id`s with `crypto.randomUUID()` and `at` with
   `new Date().toISOString()`. The edge is the only place either happens;
   the domain receives them as inputs, which is why every AC can assert an
   exact value.
3. **Call** — one domain command. `Result<AppState>`.
4. **Commit or report** — `ok` → `setState` and `303 See Other` to the page
   (so refresh never re-posts); `!ok` → re-render the page with
   `error.message` in a banner, form values preserved.
5. **Render** — never both commit and render. Redirect after write, always.

`GET` handlers call query functions only and render.

## Testing

- `domain/*.test.ts` — Vitest against pure functions. No server, no
  sockets, no fixtures beyond `seedState()`. This is where the 41 ACs of the
  two feature specs live, and it is the whole test suite for the MVP.
- `store/` and `web/` are deliberately thin enough to have no logic worth
  unit-testing: the store is three lines, handlers are the five steps above.
  If a handler ever grows a branch that matters, that branch belongs in
  `domain/` instead.

## Risk

- **The dependency rule erodes quietly.** The first `import { getState }`
  inside `domain/` makes the pure core untestable without a server, and
  nothing will fail loudly. Watch for it in review.
- **Mutable module state means test pollution** if a test ever imports
  `store.ts`. Domain tests take `seedState()` as an argument and never
  touch the store, which sidesteps it entirely.
- **One shared world has no concurrency control.** Two simultaneous posts
  can each read the same state and the second `setState` wins. Node is
  single-threaded per request tick and this is a laptop demo, so it is
  accepted, not solved.
- **Rollback:** layers are separate directories; any one can be reverted
  without touching the others. No data to migrate — the store is memory.

## Non-goals honoured

No database, no repository pattern over a database, no migrations. No auth
middleware, no CSRF tokens, no rate limiting, no notification queue. No
API for third parties — the HTML *is* the interface. No client-side state.
