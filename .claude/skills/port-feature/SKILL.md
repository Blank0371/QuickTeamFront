---
name: port-feature
description: Implement in the web dashboard a feature area the Expo app already has, following the shared-table conventions in CLAUDE.md. Writes application code.
disable-model-invocation: true
---

Ports a feature the Expo app already covers into `/dashboard`, per
`CLAUDE.md`'s "kann die Expo-App das?" rule — this is not for inventing new
product behavior (see `.claude/rules/product.md` for that boundary).

**The Expo app, checked out read-only at `../QuickTeam App` (space, not a
dash), is the authoritative reference for what the ported feature is
supposed to do** — not `CLAUDE.md`, not `docs/`. Never write to
`../QuickTeam App`; read-only, no exceptions.

## Procedure

1. **Run `feature-parity-audit` first for this feature area**, unless one
   was already run in this conversation and nothing has changed since. Do
   not re-derive its checks inline — its output is the spec this port
   implements against: the actual Expo behavior (functionality, validation,
   edge cases, permissions, DB interactions, state transitions, error
   behavior, flows), not a guess from `CLAUDE.md`'s prose summary.
2. Confirm the tables/RPCs the audit identified — look these up via the
   Supabase MCP tools (`list_tables`, `pg_proc` signatures) against the
   **live schema**, which stays authoritative for current database
   structure even where it was built to match the Expo app
   (`.claude/rules/supabase.md`).
3. Check `CLAUDE.md` and `docs/quickteam-gesamtkonzept.md` for any documented
   convention or known trap on those tables (Monday-based `wochentag`,
   `ON DELETE RESTRICT` FKs, the missing `rollen` DELETE policy, etc.) — this
   project has a long list of exactly these, don't rediscover them the hard
   way.
4. **If the audit surfaced a conflict between Expo behavior and the live
   schema** (a column, enum value, or RPC signature the Expo code assumes
   that the schema doesn't have, or vice versa), stop and report it instead
   of guessing which side is current — don't implement against either side
   of an unresolved contradiction.
5. Implement per `.claude/rules/coding.md`: Server Components by default,
   Zod validation client **and** server, semantic UI tokens only, German
   domain naming matching the DB columns. Match the Expo behavior found in
   the audit, not just its rough shape — validation rules, edge-case
   handling, and error messaging are part of parity, not polish.
6. Verify in a real browser via `playwright-cli`, logged in per
   `run-quickteam-web` — don't declare it done from reading the diff. Check
   the edge cases the audit flagged, not just the happy path.
7. Run the gates: `npm run typecheck`, `npm run build`.
8. If the port turns out to need a schema change, **stop and report it** —
   this repo never writes schema (`CLAUDE.md`, `supabase.md`). "Melden,
   nicht reparieren."
9. For auth-, payment-, or shared-table-writing changes, offer a Codex
   review per `coding.md`'s tooling policy before considering it done — ask
   first.

## Output

Summary of what was ported, the parity findings it was implemented against,
the tables/RPCs it now touches, screenshots proving the browser-verified
flow, gate results, and any schema gap or Expo/schema conflict found along
the way (reported, not fixed).
