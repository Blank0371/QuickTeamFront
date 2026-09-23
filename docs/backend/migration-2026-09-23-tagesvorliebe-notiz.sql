-- =====================================================================
--  Notiz zu einem Tageswunsch
--  Am 2026-09-23 vom Nutzer angewiesen. Rein additiv.
-- =====================================================================
--
--  Wer für ein bestimmtes Datum „gerne"/„ungerne" angibt, kann einen
--  kurzen Text dazuschreiben; der Chef liest ihn.
--
--  **Spalte statt eigener Tabelle.** Der PK `(mitarbeiter_id,
--  schicht_vorlage_id, datum)` macht jeden Tageswunsch zu genau einer
--  Zeile — eine Notiz gehört zu genau einem Wunsch. Eine eigene Tabelle
--  hätte denselben Schlüssel noch einmal getragen, dazu eigene RLS und
--  eigenes Weich-Löschen. Die bestehenden Policies passen bereits:
--  `tagesvorlieben_write_selbst` (nur die Person selbst schreibt),
--  `tagesvorlieben_select` (Chef liest den ganzen Betrieb).
--
--  **Verträglich mit der App.** `scheduling.tsx` upsertet ohne die
--  Spalte; PostgREST setzt bei `on conflict` nur die mitgeschickten
--  Spalten — eine Notiz bleibt stehen, die App kennt sie nur nicht.
--
--  Leer heisst `null`, nicht `''` — der CHECK verlangt nach `trim()`
--  mindestens ein Zeichen, höchstens 500.
--
-- =====================================================================

begin;

alter table public.mitarbeiter_schicht_tagesvorlieben
  add column notiz text
    check (notiz is null or (length(trim(notiz)) > 0 and length(notiz) <= 500));

comment on column public.mitarbeiter_schicht_tagesvorlieben.notiz is
  'Freitext der Person zum Tageswunsch, für den Chef lesbar. Leer = null.';

commit;
