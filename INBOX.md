# INBOX

Things noticed in passing. Not implemented, not detoured onto.

- `CLAUDE.md` contains the literal text `echo "@AGENTS.md" > CLAUDE.md` —
  it looks like the command was written into the file instead of run. It
  probably wants to be just `@AGENTS.md`.
- `AGENTS.md` still has its placeholder title: `# AGENTS.md — «project name»`.
- Twelve domain error messages cannot be reached through the UI (HTML
  validation and hidden panels stop them). Either surface them or decide
  they are server-side belt-and-braces only.
- A failed POST leaves the browser on the POST URL, so refresh resubmits.
  Accepted in `specs/ui-ux.md`; revisit if this ever leaves a laptop.
- No favicon, so every page logs a 404 for `/favicon.ico`.
