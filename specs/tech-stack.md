# Tech Stack

Status: Draft · 2026-09-03 · Grounded in `specs/PRD.md`

## The choice

**Node's built-in HTTP server, server-rendered HTML, plain forms, and
TypeScript run directly by Node. No framework, no bundler, no build step,
no runtime dependencies.**

Node 25 strips TypeScript types natively, so `node src/main.ts` just runs.
That removes the entire toolchain that a small app usually drags behind it.

| Concern | Choice | Why not the usual thing |
|---------|--------|------------------------|
| Language | TypeScript, `strict`, ES modules | AGENTS.md requires it |
| Running it | `node src/main.ts` — native type stripping | `tsx`/`ts-node` add a dependency for something Node now does |
| HTTP | `node:http` | Express earns its keep at ~20 routes; we have 11 and no middleware needs |
| UI | Server-rendered HTML from template literals, `<form method="post">` | React/Vite means a bundler, a dev server, a proxy, a fetch layer and client state — for pages that are lists and forms |
| Client JS | **None** | Every interaction is a form post. Nothing needs hydration |
| CSS | One `<style>` block, ~60 lines, no framework | Tailwind is a build step |
| Templating | Template literals + one `escapeHtml` helper | A template engine is a dependency and a second syntax |
| Tests | Vitest, `vitest run --passWithNoTests` | AGENTS.md requires it. `--passWithNoTests` keeps the command honest before the first test exists |
| Types | `tsc --noEmit` | Type checking only; Node does the running |
| Storage | A module-level variable in the server process | PRD decisions 1, 8, 11 — no database is a non-goal, not a shortcut |

## Dependencies

**Runtime: none.** Not "few" — zero. `package.json` has no `dependencies`
key.

**Development: three.** `typescript`, `vitest`, `@types/node`.

Anything proposed later has to beat "write the twenty lines yourself".
Email validation, HTML escaping and cookie parsing are all under ten lines
each and are already specced as pure functions.

## Commands (AGENTS.md, made real)

| Command | Runs | Green means |
|---------|------|-------------|
| `npm test` | `vitest run --passWithNoTests` | exit 0 |
| `npx tsc --noEmit` | type check over `src/` | exit 0, no diagnostics |
| `npm start` | `node src/main.ts` | server listening on `http://localhost:3000` |
| `npm run dev` | `node --watch src/main.ts` | same, restarts on save |

## Conventions this forces

- **Relative imports carry the real `.ts` extension** (`./people.ts`).
  Node resolves the literal path; `allowImportingTsExtensions` lets `tsc`
  agree.
- **`erasableSyntaxOnly: true`.** No `enum`, no `namespace`, no parameter
  properties — type stripping cannot express them. Union string literal
  types (`'CONTINUE' | 'REPEAT' | …`) are what the feature specs already
  use, so nothing is lost.
- **`verbatimModuleSyntax: true`** — type-only imports say `import type`.
- **`noUncheckedIndexedAccess: true`** — `attempts[0]` is
  `Attempt | undefined`. The domain looks up "the last attempt" constantly
  and this makes the missing case impossible to forget.

## Risk

- **Node ≥ 23.6 is required.** Below that, type stripping is off and
  `node src/main.ts` fails outright. Recorded in `engines`. Fallback if it
  ever bites: add `tsx` as a fourth devDependency and change one script
  line — no source changes.
- **Type stripping is not type checking.** Node happily runs code that
  `tsc` would reject, so `npx tsc --noEmit` is not optional politeness; it
  is the only thing enforcing AGENTS.md's "no `any`".
- **Rollback:** the stack is four files (`package.json`, `tsconfig.json`,
  `src/main.ts`, `.gitignore`). Reverting costs nothing.

## Non-goals honoured

No database driver, no ORM, no migration tool (PRD). No auth library, no
session store, no mailer, no push service. No AI SDK. No file upload
handling. No Docker, no CI, no deploy target — this runs on a laptop.
