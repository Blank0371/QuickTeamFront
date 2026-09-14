-- =====================================================================
--  Betriebsexport als konsistenter Schnappschuss
--  Vorbereitet am 2026-09-13. NICHT ANGEWENDET.
-- =====================================================================
--
--  Der Export in `src/lib/export/paket.ts` liest jede Tabelle einzeln
--  über PostgREST. Jede Anfrage ist eine eigene Transaktion, also kann
--  zwischen der ersten und der letzten etwas dazukommen oder
--  verschwinden. Das Paket sagt das offen (`meta.konsistenz`) — aber
--  „offen gesagt" ist nicht dasselbe wie „behoben".
--
--  Behoben wäre es mit **einer** Transaktion in
--  `repeatable read`-Isolation. Genau dafür ist diese Funktion da.
--
--  ---------------------------------------------------------------
--   Warum sie nicht angewendet ist
--  ---------------------------------------------------------------
--
--  `CLAUDE.md`, „Was hier nicht passiert": von diesem Repo aus wird das
--  Schema nicht verändert. Der Export funktioniert ohne sie; sie macht
--  ihn besser, nicht erst möglich. Die Entscheidung, ob die zusätzliche
--  Datenbankfläche den Gewinn wert ist, gehört dem Betreiber und dem
--  App-Entwickler, nicht dieser Datei.
--
--  ---------------------------------------------------------------
--   Was sich am Web-Code dadurch ändert
--  ---------------------------------------------------------------
--
--   * `baueExportPaket()` ersetzt die Schleife über `EXPORT_TABELLEN`
--     durch einen Aufruf `rpc("betrieb_export", { p_betrieb_id })`.
--   * Die Nachbearbeitung bleibt, wo sie ist: anonyme Umfragen,
--     Redaktion des Änderungsprotokolls, Erhalt der Pseudonymisierung.
--     Sie in SQL zu wiederholen hiesse, dieselbe Regel an zwei Stellen
--     zu pflegen — und die Fassung im TypeScript ist die getestete.
--   * `meta.konsistenz` bekommt einen anderen Satz.
--
--  ---------------------------------------------------------------
--   Warum `jsonb_agg` und nicht viele Rückgabemengen
--  ---------------------------------------------------------------
--
--  PostgREST gibt einer Funktion genau ein Ergebnis. Ein Objekt mit
--  einem Schlüssel je Tabelle ist die einzige Form, in der alle
--  Tabellen **aus derselben Transaktion** herauskommen — und genau
--  darum geht es hier. Der Preis: das Paket entsteht vollständig im
--  Arbeitsspeicher der Datenbank. Für einen Gastrobetrieb (die grösste
--  Tabelle ist `plan_aenderungen` mit einigen tausend Zeilen) ist das
--  unkritisch; für einen sehr grossen Bestand wäre stattdessen ein
--  Cursor je Tabelle innerhalb einer offenen Transaktion nötig, und den
--  kann PostgREST nicht halten.
-- =====================================================================

create or replace function public.betrieb_export(p_betrieb_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
-- `repeatable read` gilt ab der ersten Anweisung der Funktion; alle
-- folgenden sehen denselben Stand.
set default_transaction_isolation = 'repeatable read'
as $$
declare
  v_ergebnis jsonb;
begin
  -- Die Berechtigung wird hier **erneut** geprüft und nicht dem
  -- Aufrufer geglaubt: die Funktion läuft als SECURITY DEFINER, RLS
  -- greift in ihr also nicht mehr. Ohne diese Zeile wäre sie ein
  -- Vollzugriff auf jeden Betrieb für jeden Angemeldeten.
  if not public.ist_chef(p_betrieb_id) then
    raise exception 'Nicht berechtigt' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'begonnen_am', now(),
    'betriebe',                        (select jsonb_agg(to_jsonb(t)) from public.betriebe t where t.id = p_betrieb_id),
    'betriebs_einstellungen',          (select jsonb_agg(to_jsonb(t)) from public.betriebs_einstellungen t where t.betrieb_id = p_betrieb_id),
    'mitarbeiter',                     (select jsonb_agg(to_jsonb(t)) from public.mitarbeiter t where t.betrieb_id = p_betrieb_id),
    'rollen',                          (select jsonb_agg(to_jsonb(t)) from public.rollen t where t.betrieb_id = p_betrieb_id),
    'mitarbeiter_rollen',              (select jsonb_agg(to_jsonb(t)) from public.mitarbeiter_rollen t where t.betrieb_id = p_betrieb_id),
    'schicht_vorlagen',                (select jsonb_agg(to_jsonb(t)) from public.schicht_vorlagen t where t.betrieb_id = p_betrieb_id),
    'schicht_vorlage_mindestbesetzung',(select jsonb_agg(to_jsonb(t)) from public.schicht_vorlage_mindestbesetzung t where t.betrieb_id = p_betrieb_id),
    'planungszyklen',                  (select jsonb_agg(to_jsonb(t)) from public.planungszyklen t where t.betrieb_id = p_betrieb_id),
    'schicht_instanzen',               (select jsonb_agg(to_jsonb(t)) from public.schicht_instanzen t where t.betrieb_id = p_betrieb_id),
    'schicht_instanz_mindestbesetzung',(select jsonb_agg(to_jsonb(t)) from public.schicht_instanz_mindestbesetzung t where t.betrieb_id = p_betrieb_id),
    'schicht_zuweisungen',             (select jsonb_agg(to_jsonb(t)) from public.schicht_zuweisungen t where t.betrieb_id = p_betrieb_id),
    'schicht_ausschreibung_bedarf',    (select jsonb_agg(to_jsonb(t)) from public.schicht_ausschreibung_bedarf t where t.betrieb_id = p_betrieb_id),
    'schicht_notizen',                 (select jsonb_agg(to_jsonb(t)) from public.schicht_notizen t where t.betrieb_id = p_betrieb_id),
    'urlaub',                          (select jsonb_agg(to_jsonb(t)) from public.urlaub t where t.betrieb_id = p_betrieb_id),
    'abwesenheit',                     (select jsonb_agg(to_jsonb(t)) from public.abwesenheit t where t.betrieb_id = p_betrieb_id),
    'verfuegbarkeiten',                (select jsonb_agg(to_jsonb(t)) from public.verfuegbarkeiten t where t.betrieb_id = p_betrieb_id),
    'mitarbeiter_schicht_vorlieben',   (select jsonb_agg(to_jsonb(t)) from public.mitarbeiter_schicht_vorlieben t where t.betrieb_id = p_betrieb_id),
    'mitarbeiter_schicht_tagesvorlieben',(select jsonb_agg(to_jsonb(t)) from public.mitarbeiter_schicht_tagesvorlieben t where t.betrieb_id = p_betrieb_id),
    'benachrichtigungen',              (select jsonb_agg(to_jsonb(t)) from public.benachrichtigungen t where t.betrieb_id = p_betrieb_id),
    'umfrage_optionen',                (select jsonb_agg(to_jsonb(t)) from public.umfrage_optionen t where t.betrieb_id = p_betrieb_id),
    -- Einzelstimmen nur zu nicht-anonymen Umfragen. Dieselbe Regel wie
    -- im TypeScript, hier aber schon in der Quelle: was gar nicht
    -- herauskommt, kann auch nicht vergessen werden zu filtern.
    'umfrage_stimmen',                 (select jsonb_agg(to_jsonb(t)) from public.umfrage_stimmen t
                                          join public.benachrichtigungen b on b.id = t.benachrichtigung_id
                                         where t.betrieb_id = p_betrieb_id and coalesce(b.anonym, false) = false),
    'aufgaben',                        (select jsonb_agg(to_jsonb(t)) from public.aufgaben t where t.betrieb_id = p_betrieb_id),
    'benachrichtigung_gelesen',        (select jsonb_agg(to_jsonb(t)) from public.benachrichtigung_gelesen t where t.betrieb_id = p_betrieb_id),
    'nachricht_anhaenge',              (select jsonb_agg(to_jsonb(t)) from public.nachricht_anhaenge t where t.betrieb_id = p_betrieb_id),
    'schichttausch_anfragen',          (select jsonb_agg(to_jsonb(t)) from public.schichttausch_anfragen t where t.betrieb_id = p_betrieb_id),
    'notfaelle',                       (select jsonb_agg(to_jsonb(t)) from public.notfaelle t where t.betrieb_id = p_betrieb_id),
    'plan_aenderungen',                (select jsonb_agg(to_jsonb(t)) from public.plan_aenderungen t where t.betrieb_id = p_betrieb_id),
    'einladungen',                     (select jsonb_agg(jsonb_build_object(
                                            'betrieb_id', t.betrieb_id, 'mitarbeiter_id', t.mitarbeiter_id,
                                            'ablaufdatum', t.ablaufdatum, 'erstellt_am', t.erstellt_am,
                                            'eingeloest_am', t.eingeloest_am))
                                          from public.einladungen t where t.betrieb_id = p_betrieb_id),
    'betrieb_abonnements',             (select jsonb_agg(jsonb_build_object(
                                            'betrieb_id', t.betrieb_id, 'plan', t.plan,
                                            'status', t.status, 'aktualisiert_am', t.aktualisiert_am))
                                          from public.betrieb_abonnements t where t.betrieb_id = p_betrieb_id),
    'rechtliche_zustimmungen',         (select jsonb_agg(to_jsonb(t)) from public.rechtliche_zustimmungen t where t.betrieb_id = p_betrieb_id),
    'beendet_am', now()
  ) into v_ergebnis;

  return v_ergebnis;
end;
$$;

revoke all on function public.betrieb_export(uuid) from public;
revoke all on function public.betrieb_export(uuid) from anon;
grant execute on function public.betrieb_export(uuid) to authenticated;

comment on function public.betrieb_export(uuid) is
  'Vollstaendiger Betriebsexport aus EINER Transaktion (repeatable read). '
  'Einzelstimmen anonymer Umfragen und Einladungs-Hashes sind ausgenommen. '
  'Die weitere Redaktion (Aenderungsprotokoll, Pseudonymisierung) macht der '
  'Aufrufer in src/lib/export/paket.ts.';

-- =====================================================================
--  Gegenproben
-- =====================================================================
--
--   1) Chef des Betriebs      → Objekt mit allen Schlüsseln
--   2) Mitarbeiter desselben  → 403 (errcode 42501)
--   3) Chef eines anderen     → 403
--   4) `begonnen_am` und `beendet_am` sind in `repeatable read`
--      identisch (`now()` ist der Transaktionszeitpunkt) — das ist der
--      Beleg, dass alles aus einem Stand kommt.
--   5) Während des Aufrufs in einer zweiten Sitzung eine Zeile
--      einfügen: sie darf **nicht** im Ergebnis stehen.
--
-- =====================================================================
--  Zugabe: ein nicht-geheimer Sortierschlüssel für `einladungen`
-- =====================================================================
--
--  Unabhängig vom Schnappschuss, aber aus derselben Frage: `einladungen`
--  ist die einzige Exporttabelle ohne eindeutige, nicht-geheime
--  Sortierung. Ihr Primärschlüssel ist der Einladungs-Hash.
--
--  Nach ihm zu sortieren wäre serverseitig möglich — und wurde am
--  2026-09-14 ausdrücklich geprüft und **verworfen**: die
--  Keyset-Bedingung landet als `or=(hash.gt."…")` in der Anfrage-URL,
--  und die protokollieren PostgREST und die Hostingumgebung. Ein
--  Zugangsgeheimnis in Zugriffsprotokollen ist der schlechtere Tausch.
--
--  Eine eigene, nichtssagende Spalte löst es sauber:
--
--    alter table public.einladungen
--      add column if not exists lfd bigint generated always as identity;
--
--    create unique index if not exists einladungen_lfd_idx
--      on public.einladungen (lfd);
--
--  Danach in `src/lib/export/tabellen.ts`:
--
--    { name: "einladungen", ordnung: ["lfd"], eindeutig: true, … }
--
--  `lfd` gehört **nicht** in die exportierte Spaltenliste — sie ist ein
--  internes Ordnungsmerkmal, keine fachliche Angabe. Sortieren darf man
--  nach ihr trotzdem: sie verrät nichts ausser der Einfügereihenfolge.
--
-- =====================================================================
--  Zurücknehmen
-- =====================================================================
--
--   drop function if exists public.betrieb_export(uuid);
