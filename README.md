# home-work-hero

A student writes down a homework question and their own answer, asks a
person to review it, and gets back a decision, a score and a next action.
When the next action sends the work back, the student tries again — and the
earlier attempt stays visible beside the new one.

That loop is the product. Everything else is forms.

## Run it

```bash
npm install
npm start          # http://localhost:3000
```

Node 25 runs the TypeScript directly, so there is no build step. Set `PORT`
if 3000 is taken:

```bash
PORT=4000 npm start
```

Open the app, pick one of the seeded people, and you are in. There are no
accounts and no passwords — identity is a selector, not a login. Open a
second browser, act as someone else, and the two of you share one world.

## The demo, in one minute

The store seeds itself on first read with four people and four submissions,
each parked in a different state so the whole loop is visible immediately:

| Submission | Student | Reviewer | State |
|-----------|---------|----------|-------|
| Why does ice float on water? | Maya Chen | Mr. Okafor | awaiting review |
| Explain photosynthesis… | Maya Chen | Mr. Okafor | needs revision, scored 52 |
| Solve 3x + 7 = 22… | Tomas Alvarez | Sam Chen | closed — 52 → 78 across two attempts |
| Write three sentences about the water cycle | Tomas Alvarez | Mr. Okafor | assigned, not yet answered |

The people are **Maya Chen** and **Tomas Alvarez** (students) and
**Mr. Okafor** and **Sam Chen** (reviewers) — though the roles are not
account types, just what each person happens to be doing.

Act as **Maya** to answer work; act as **Mr. Okafor** to review it. A
reviewer can also assign a question that has no answer yet.

A restart wipes everything and reseeds — the store is memory, by design.

## How a review works

The reviewer gives a decision, a score out of 100, a next action and a
comment. The next action is what moves the submission:

| Next action | Result | The student's next attempt |
|-------------|--------|---------------------------|
| `REPEAT` | reopened | starts blank |
| `CORRECT` | reopened | starts from the previous answer |
| `CONTINUE` | closed | accepted, but may still be improved |
| `DONE` | closed and locked | no further attempts |

`APPROVED` only pairs with `CONTINUE` or `DONE`; `NOT_APPROVED` only with
`REPEAT` or `CORRECT`. Anything else is refused.

Attempts are append-only. No answer and no review is ever overwritten,
because the improvement arc is the thing worth showing.

## Commands

| Command | What it does |
|---------|--------------|
| `npm start` | run the app |
| `npm run dev` | run it with `--watch` |
| `npm test` | Vitest, all 92 tests |
| `npx tsc --noEmit` | type check |

"Green" means the command exited 0 just now.

## Architecture

Three layers, one direction of dependency:

```
  web/     router · handlers · views      impure: sockets, cookies, clock, ids
    ↓
  store/   one AppState + sessions        impure: mutable module state
    ↓
  domain/  pure functions, no I/O         imports nothing but itself
```

`domain/` cannot import `store/` or `web/`. Every domain command is
`(state, input) => Result<AppState>`, and ids and timestamps arrive as
inputs rather than being read from the clock — which is why every
acceptance criterion can assert an exact value.

**No runtime dependencies.** Three dev ones: `typescript`, `vitest`,
`@types/node`.

## Specs

The code was written spec-first, and the specs are the contract:

| File | What it holds |
|------|---------------|
| `specs/PRD.md` | goal, users, eleven decisions, non-goals |
| `specs/architecture.md` | layers, the store, the request lifecycle |
| `specs/ui-ux.md` | four screens, the action-panel rules |
| `specs/tech-stack.md` | the stack, and why not the usual thing |
| `specs/features/identity-and-directory.md` | 15 ACs — people, actor, seed |
| `specs/features/review-loop.md` | 28 ACs — submit, assign, review, revise |
| `specs/features/web-shell.md` | 22 ACs — store, router, views, server |

Every test name states the AC it proves, so `AC19: rejects a score of 101
and a score of -1` carries its own provenance. `prompts.md` records how the
project was built, including where a spec was corrected rather than a test.

## Deliberately not built

No database, no ORM, no migrations. No authentication, no passwords, no
sessions beyond a cookie holding which person a browser is acting as. No
notifications of any kind — a reviewer finds work by opening their queue.
No AI assistance: the app never answers, grades or drafts homework; a
person does that. No photo upload, no deployment, no analytics.

## Known rough edges

- A **failed** POST re-renders in place, so the browser stays on the POST
  URL and refreshing resubmits. Deliberate (`specs/ui-ux.md`), not
  overlooked.
- Twelve domain error messages are unreachable through the UI, because
  HTML validation and hidden panels prevent a user from ever triggering
  them. They are correct and tested; nobody sees them.
- `favicon.ico` 404s on every page.
