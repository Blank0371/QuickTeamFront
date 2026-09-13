---
name: feature-parity-audit
description: Check whether the web dashboard covers a feature area to the standard CLAUDE.md sets (parity with the Expo app), by inspecting the actual Expo source and comparing it against the dashboard and the shared database. Read-only.
disable-model-invocation: true
---

The Expo app (`Blank0371/QuickTeamMobile`) is checked out read-only at
`../QuickTeam App` (space, not a dash — quote it in shell commands). Per
`.claude/rules/product.md`, **it is the authoritative source for what
existing product functionality is supposed to do.** This audit inspects
its actual implementation under `../QuickTeam App/src` — not just
`CLAUDE.md` or `docs/`, which are supporting context and may be stale or
incomplete. The **shared Supabase schema** remains authoritative for
current database structure (`.claude/rules/supabase.md`).

**Never write to `../QuickTeam App`.** Read-only, no exceptions — it is
the colleague's checkout, not material of this repo.

## Scope

One feature area per run: Kalender, Planung, Team, Urlaub, Mitteilungen,
Tausch, or Notfall (the list `CLAUDE.md` mandates under "Kursänderung vom
2026-08-26"). Ask if not specified.

## Procedure

1. **Locate the Expo implementation.** Find the relevant screen(s) under
   `../QuickTeam App/src/app` (routes) and the logic they call into under
   `../QuickTeam App/src/lib` / `src/context` / `src/components`. Read the
   actual code — don't infer behavior from file names or from `CLAUDE.md`'s
   prose summary of it.
2. **Extract the reference behavior**, across all of these dimensions:
   - visible functionality (what the screen shows and lets the user do)
   - business behavior (what happens on each action)
   - validation (client-side checks, required fields, format rules)
   - edge cases (empty states, boundary values, race conditions handled)
   - permissions (which role/status can see or do what)
   - database interactions (which tables/RPCs, which parameters, in what
     order)
   - state transitions (status values and what moves a row between them)
   - error behavior (what's caught, what's surfaced to the user, what's
     silently swallowed)
   - user flows (multi-step sequences, what happens on interruption/retry)
3. **Dashboard coverage:** does `src/app/dashboard/(arbeit)/` have a route
   for this area? Shipped, `folgt`-stub (see `dashboard-sidebar` for the
   flag), or entirely missing? For what's shipped, compare it against step 2
   dimension by dimension, not just "does a route exist."
4. **Table/RPC usage:** confirm the tables/RPCs step 1 found are queried and
   written the same way in the dashboard code — same field names, same
   `wochentag` convention (Monday-based, 0–6), same `p_mitarbeiter_id`
   pattern. Verify current signatures/columns against the live schema via
   the Supabase MCP tools (`list_tables`, `pg_proc`) rather than trusting
   what the Expo source implies — code and schema can drift apart.
5. **Drift check:** flag any place the dashboard disagrees with the Expo
   behavior found in step 2, any place the wizard and dashboard disagree
   with each other on a shared-table convention, or any place an RPC
   signature in code doesn't match the catalog (`pg_proc`) — this has
   bitten this project before (see `CLAUDE.md`'s "Tabellen des
   Onboarding-Wizards").
6. **Schema conflicts get reported, not resolved.** If the Expo source
   assumes a column, enum value, or RPC signature that the live schema
   doesn't have (or vice versa), that's a contradiction between the two
   authorities named in `.claude/rules/product.md` — write it up as an open
   question for the App developer instead of guessing which side is
   current.

## Output

A table: feature area → status (shipped / stub / missing) → per-dimension
findings (functionality, validation, edge cases, permissions, DB
interactions, state transitions, error behavior, flows) → drift found →
schema conflicts → open questions for the App developer. Keep findings
concrete: Expo file/line vs. dashboard file/line, or table/column, not a
vague "might differ."
