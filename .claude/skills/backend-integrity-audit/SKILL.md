---
name: backend-integrity-audit
description: Find drift between documented protections and the actual Supabase state (RLS, policies, triggers, grants) using advisors and catalog queries. Read-only, never touches schema. Mirrors docs/backend-befunde-*.md.
disable-model-invocation: true
---

Continues the pattern in `docs/backend-befunde-2026-08-28.md`: the docs claim
a protection the catalog doesn't back up, found by querying `pg_catalog`
directly, not by reading documentation. Strictly read-only — see
`.claude/rules/supabase.md`.

## Procedure

1. Run `get_advisors` (security and performance) via the Supabase MCP tools.
2. Run targeted catalog queries for the failure modes this project has hit
   before, even where advisors stay quiet:
   - RLS policies per table actually reachable by `anon`/`authenticated`
     (`pg_policies`) — a table can have RLS *enabled* with zero policies,
     which reads as "safe" but may mean "silently broken feature" instead
     (see finding 8 in `backend-befunde-2026-08-28.md`).
   - Trigger presence for anything code or docs assume is enforced
     (`pg_trigger`) — `pruefe_letzter_chef()` exists and is attached to
     nothing; check whether that's still true and whether anything new has
     the same gap.
   - `EXECUTE` grants for `anon`/`authenticated` on `SECURITY DEFINER`
     functions, especially trigger-only functions (`has_function_privilege`,
     pattern in finding 7).
   - FK delete rules (`pg_constraint`) where code assumes `RESTRICT` or
     cascade behavior it hasn't verified.
3. Cross-reference every finding against `CLAUDE.md` and the existing
   `docs/backend-befunde-*.md` / `docs/projektstand-*.md` files — don't
   re-report something already known and accepted.
4. Where feasible, confirm a suspected bug empirically inside a rolled-back
   transaction (`begin; …; rollback;`) rather than only inferring from the
   catalog — but never call a function with an external side effect
   (`pg_net`, email, notifications) this way; a `ROLLBACK` doesn't undo an
   HTTP call already sent (`.claude/rules/supabase.md`).
5. Never modify schema, policies, grants, or data — including as a "quick
   test". Never touch Testbetrieb 12. Never read `.env*` — use the MCP
   tools' own authenticated connection.

## Output

If new drift is found: a dated `docs/backend-befunde-YYYY-MM-DD.md`,
following the existing file's structure (Fundstelle, query, severity,
"gemeldet, nicht repariert", addressed to the App developer). If nothing new
turns up: a short note naming which advisors/queries were checked and
against which date's prior findings — no new file for a clean run.
