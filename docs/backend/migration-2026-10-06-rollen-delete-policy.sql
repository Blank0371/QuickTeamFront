-- =====================================================================
--  Rollen löschen: Policy `rollen_delete_chef`
--  Am 2026-10-06 vom Nutzer angewiesen und von ihm selbst im
--  SQL-Editor eingespielt (keine Zeile in `supabase_migrations`).
--  Danach von QuickTeamFront in `pg_policy` gegengeprüft.
-- =====================================================================
--
--  Bis hierhin trug `rollen` nur INSERT-, SELECT- und UPDATE-Policies.
--  RLS filterte jedes DELETE still heraus — kein Fehler, null Zeilen —,
--  eine einmal geschriebene Rolle war nicht mehr zu entfernen. Die App
--  löscht ohnehin weich (`manager.tsx`: `rollen.aktiv = false`); das Web
--  bietet daneben hartes Entfernen, weil `UNIQUE (betrieb_id, name)` das
--  `aktiv`-Flag nicht kennt und eine ausgeblendete Rolle ihren Namen
--  sonst für immer blockiert.
--
--  Form wie die übrigen Chef-Policies (`vorlagen_delete_chef`,
--  `svm_delete_chef`): ohne Rollenliste, Bedingung `ist_chef(betrieb_id)`.
--  `ist_chef` prüft `auth.uid()` — für `anon` ist das null, also false,
--  obwohl `anon` das Tabellenrecht DELETE trägt.
--
--  Was das Löschen weiterhin aufhält (FKs auf `rollen`, ON DELETE RESTRICT):
--    mitarbeiter_rollen, schicht_vorlage_mindestbesetzung,
--    schicht_instanz_mindestbesetzung, schicht_zuweisungen
--  Die Ausnahme ist `schicht_ausschreibung_bedarf` (ON DELETE CASCADE) —
--  die prüft `entferneRolle()` (`src/lib/team.ts`) vorher selbst.
--
--  Keine Trigger auf `rollen` (am 2026-10-06 in `pg_trigger` geprüft).
-- =====================================================================

create policy rollen_delete_chef on public.rollen
  for delete
  using (ist_chef(betrieb_id));

-- Rückbau, falls nötig:
--   drop policy rollen_delete_chef on public.rollen;
