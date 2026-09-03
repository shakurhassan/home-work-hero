# UI / UX

Status: Draft · 2026-09-03 · Grounded in `specs/PRD.md`, `specs/features/*.md`

## Principle

Four screens, plain forms, no client JavaScript. A student should be able
to submit work within ten seconds of arriving, and the seeded examples
should teach the loop without a word of instruction (PRD decision 6).

## Screens

**1. Who are you? (`GET /`)**
The only entry point. A list of the four seeded people as buttons —
name, email, and `reviewer` where the flag is set — plus a short
"someone else" form (name, email) that registers and signs in in one step.
Choosing sets the cookie and redirects to `/home`. Every page header shows
`Acting as <name>` with a `switch` link back here, because switching roles
is the core demo gesture, not a settings screen.

**2. Home (`GET /home`)**
Two stacked lists, both driven by the query functions:

- **Waiting on you** — `assignmentsFor(actor)`. Rows show the question, the
  reviewer's name, and the reason it is here: `assigned` or
  `needs revision — score 52`.
- **To review** — `queueForReviewer(actor)`, shown only when the actor has
  `isReviewer`. Rows show the question, the student's name, and how many
  attempts have been made.
- Everything else the actor is involved in sits under **All my work**, with
  a status chip.

Two buttons at the top: **Ask for a review** and, for reviewers,
**Assign work**.

**3. New submission (`GET /new`, `POST /submissions`)**
Question, answer, and a reviewer `<select>` listing `listReviewers()`. Under
the select, a disclosure — *reviewer not listed?* — holding name and email
fields that post to `/reviewers` and return here with the new reviewer
already chosen. That is the whole "add a reviewer" flow from the brief, and
it never leaves the page's purpose.
`GET /assign` is the same form with the answer field removed.

**4. Submission (`GET /s/:id`)**
The question, then the attempt timeline oldest-first — every attempt with
its answer and, beneath it, its verdict card: decision, score `/100`, next
action, comment, reviewer, date. History is never collapsed or hidden; it
is the reason the product exists (PRD decision 3).

Below the timeline, exactly one action panel, chosen by state:

| Actor | Status | Panel |
|-------|--------|-------|
| student | `ASSIGNED` | Answer box, empty |
| student | `NEEDS_REVISION` | Answer box, prefilled from `draftAnswerFor` (blank after `REPEAT`, previous answer after `CORRECT`) |
| student | `CLOSED`, not locked (last action `CONTINUE`) | Answer box — the work was accepted, but the student may still improve it |
| assigned reviewer | `AWAITING_REVIEW` | Review form: decision radios, score `0–100`, next action radios, comment |
| anyone | `CLOSED` and locked | Nothing — a line reading `Closed — no further attempts` |
| anyone else | any | Nothing |

Showing no panel is the honest rendering of "not your turn". The domain
rejects the action anyway (AC16, AC17, AC10); the UI just avoids offering
what would fail.

## Rules that apply everywhere

- **Errors are the domain's words.** A failed command re-renders the same
  page with `error.message` verbatim in a red banner above the form, and
  the fields keep what was typed. The feature specs fix those strings, so
  the UI never invents copy like "something went wrong".
- **A successful POST redirects (303).** Refresh must never resubmit an
  attempt that worked.
- **A rejected POST re-renders in place, 200**, keeping what was typed
  (`web-shell.md` AC17, AC20). The browser therefore stays on the POST URL
  and a refresh will resubmit — accepted deliberately: the alternative is
  stashing the error in the session to survive a redirect, which buys
  nothing for a laptop demo and adds a second place where state lives.

  > Corrected 2026-09-03 after review. This rule previously read "POST then
  > redirect (303); refresh must never resubmit", which contradicted
  > `web-shell.md` AC17's 200 re-render. Re-render wins.
- **Empty states are seeded away** for a first visitor, but each list still
  carries one: `Nothing waiting on you`, `Your review queue is empty`.
- **Status chips**, one vocabulary, everywhere: `assigned`,
  `awaiting review`, `needs revision`, `closed`.
- **Scores read `52 / 100`**, never bare, and always sit next to the next
  action — a number without a next step is the thing this product is
  trying not to be.

## Look

One `<style>` block. System font stack, a 40rem centred column, generous
line height, one accent colour for primary buttons, a light grey card for
each attempt and a tinted card for each verdict. Dark mode via
`prefers-color-scheme` and two colour variables — it is four lines and
avoids a glaring white page at night.

Accessibility, at MVP cost: real `<label>` for every field, `<button>` for
every action, focus outlines untouched, one `<h1>` per page, and status
communicated by text rather than colour alone.

## Risk

- **No client JS means a full page load per interaction.** On localhost
  this is imperceptible and it buys the removal of an entire toolchain.
- **The disclosure for adding a reviewer** is the one flow that leaves and
  returns to a half-filled form. It must round-trip the typed question and
  answer, or a student loses their work — the most likely UI bug here.
- **Rollback:** views are pure string functions; any screen can be reverted
  alone.

## Non-goals honoured

No sign-in, no password, no email, no notification of any kind. No photo
upload, no rich text, no drag and drop. No dashboards, charts, or progress
analytics. No mobile app — the single column happens to work on a phone.
