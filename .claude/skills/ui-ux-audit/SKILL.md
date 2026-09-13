---
name: ui-ux-audit
description: Audit one or more QuickTeam routes against this project's design-system tokens, contrast, semantics, and accessibility rules. Read-only — reports findings, does not edit code.
disable-model-invocation: true
---

Audits real, rendered pages — not source code review by reading — against
`.claude/rules/ui.md` and `CLAUDE.md`'s "Harte Vorgaben". Read-only: report
findings, don't fix them here (hand off to `redesign-page` or a direct edit
if the user wants fixes applied).

## Scope

Ask which route(s) if not given. Default to the route(s) touched by the most
recent uncommitted changes (`git diff --name-only`) when nothing is specified.

## Procedure

1. Ensure the dev server is running — follow `run-quickteam-web`'s "Run
   (agent path)" section (port fallback, background start).
2. Drive each target route with `playwright-cli`, run from **outside** the
   repo tree with the local binary by absolute path (see
   `run-quickteam-web`'s Gotchas — this is not optional, HMR loops otherwise).
3. For each route, check:
   - **Tokens:** `grep` the touched component(s) for raw hex (`#[0-9a-f]{3,8}`)
     or arbitrary Tailwind color classes outside the semantic set in
     `docs/Farbpalette.html`.
   - **Contrast:** for text/border pairs that look tight, measure via
     `playwright-cli eval` (`getComputedStyle`) on the actual rendered
     colors — don't infer from the token name alone.
   - **Semantics:** `snapshot` for heading structure (exactly one `<h1>`, no
     level skips), and confirm the route is a Server Component (`curl` the
     route directly, full visible text must be in the raw HTML).
   - **Accessibility:** every `<img>` has `alt` (or `alt=""` if decorative),
     every error message is linked via `aria-describedby`, focus is visible
     after `press Tab` a few times (screenshot).
   - **Responsive:** `resize 375 800`, screenshot, check nothing clips or
     overlaps.
   - **Console:** `console` command, zero errors/warnings expected.
4. `close` the browser session when done.

## Output

A findings list, most-severe first: file/line if it's a code-level issue
(wrong token, missing `alt`), or route + description if it's a rendered-page
issue (contrast, layout). Each finding names the concrete rule it breaks
(cite `ui.md` or the `CLAUDE.md` section). No findings survive → say so
plainly, don't pad the report.
