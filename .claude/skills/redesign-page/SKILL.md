---
name: redesign-page
description: Redesign one existing QuickTeam route within the existing design system — implements changes, verifies them in a real browser, and re-runs the gates. Use for page-level UI rework, not new design systems.
disable-model-invocation: true
---

Reworks a page's UI within the existing token/component system — it does not
invent new colors, tokens, or patterns. If the ask actually requires a new
token or a genuinely new pattern, stop and confirm with the user first (see
`.claude/rules/ui.md`).

## Procedure

1. Confirm the target route and the concrete problem/brief with the user if
   either is ambiguous — a redesign brief ("make this clearer") is not
   enough to act on alone.
2. Read the current implementation and the relevant rules (`ui.md`,
   `CLAUDE.md` "Harte Vorgaben", `docs/Farbpalette.html`). Check
   `src/components/` for an existing pattern before building a new one.
3. Baseline: screenshot the current route via `playwright-cli` (see
   `run-quickteam-web` for dev-server + driver setup).
4. Implement, following `.claude/rules/coding.md` conventions — Server
   Component by default, semantic tokens only, minimal surface (don't touch
   unrelated code on the page).
5. Re-screenshot the same route/viewport and compare against the baseline.
6. Run the `ui-ux-audit` skill against the changed route(s) instead of
   re-deriving its checklist here.
7. Run the gates: `npm run typecheck`, `npm run build`.
8. For a substantial visual overhaul (not a small tweak), offer a Codex
   review per `coding.md`'s tooling policy — ask first, don't run it
   automatically.

## Output

Before/after screenshots, a short summary of what changed and why, and the
`ui-ux-audit` result for the changed route(s). Flag anything left undone and
why (e.g., a fix that would need a new token, deferred per `ui.md`).
