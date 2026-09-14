-- =====================================================================
--  Notfallgrund — Variante A (Spaltenrechte + Definer-RPC)
--  Entwurf 2026-09-13, korrigiert 2026-09-14.
--
--  ###################################################################
--  #  ÜBERHOLT — nicht anwenden.                                     #
--  #                                                                 #
--  #  Umgesetzt wird Variante B:                                     #
--  #  migration-2026-09-14-notfallgrund-tabelle.sql                  #
--  #                                                                 #
--  #  Diese Datei bleibt als Beleg der Abwägung stehen — vor allem   #
--  #  wegen des Abschnitts über die wirkungslose erste Fassung, den  #
--  #  man kein zweites Mal herleiten sollte.                         #
--  ###################################################################
-- =====================================================================
--
--  !! Die Fassung vom 2026-09-13 war WIRKUNGSLOS. Wer sie schon
--  !! angewendet hat: sie hat nichts geschützt und nichts kaputtgemacht
--  !! — der Notfallgrund war danach genauso lesbar wie vorher.
--
--  Sie enthielt:
--
--      revoke select (grund) on public.notfaelle from authenticated;
--
--  `authenticated` hält aber SELECT auf der **ganzen Tabelle** (am
--  2026-09-14 in `information_schema.table_privileges` nachgesehen). Und
--  dazu sagt die PostgreSQL-Dokumentation ausdrücklich:
--
--    GRANT:  „granting a privilege at the table level is unaffected by
--             revoking it at the column level"
--    REVOKE: „revoking privileges on individual columns has no effect if
--             the role holds table-level privileges"
--
--  Das Statement läuft also ohne Fehler durch und bewirkt nichts. Genau
--  die Art Sicherheitsmassnahme, die schlimmer ist als keine: sie steht
--  im Migrationsverzeichnis, sie sieht richtig aus, und niemand prüft
--  nach.
--
--  Richtig ist: **erst das Tabellenrecht entziehen, dann die erlaubten
--  Spalten einzeln gewähren.** Das tut Abschnitt 2.
--
-- =====================================================================
--  1. Der Befund
-- =====================================================================
--
--  `docs/backend-befunde-2026-09-13.md`, Punkt 1: `notfaelle_select`
--  lautet `betrieb_id IN (SELECT meine_betriebe())`. Jedes aktive
--  Mitglied kann damit jede Notfallmeldung des Betriebs lesen —
--  einschliesslich `grund`. Die App schlägt für dieses Feld „Ich bin
--  krank." vor, es ist also regelmässig ein Gesundheitsdatum nach
--  Art. 9 DSGVO. Am 2026-09-14 erneut gegen `pg_policies` geprüft: die
--  Policy steht unverändert so da.
--
--  **RLS kann das nicht lösen.** RLS filtert Zeilen, nicht Spalten. Wer
--  die Zeile sehen darf — und das müssen alle, sonst funktioniert die
--  Vertretungssuche nicht —, sieht jede Spalte darin. Eine
--  „Spaltenausnahme" in einer SELECT-Policy gibt es nicht.
--
-- =====================================================================
--  2. Die Angriffsfläche, vollständig durchgesehen
-- =====================================================================
--
--  Ein Spaltenrecht nützt nur, wenn es keinen zweiten Weg zur Spalte
--  gibt. Am 2026-09-14 gegen die Live-Instanz geprüft:
--
--  (a) **Direkte Tabellenrechte.** `anon` und `authenticated` haben je
--      SELECT auf `public.notfaelle` — das ist der Weg, den Abschnitt 3
--      schliesst. `postgres` und `service_role` behalten ihn; beide
--      umgehen ohnehin RLS und sind keine Nutzerrollen.
--
--  (b) **Geerbte Rechte.** `pg_auth_members`: weder `anon` noch
--      `authenticated` sind Mitglied einer anderen Rolle. `authenticator`
--      ist Mitglied aller drei, aber `NOINHERIT` — es wechselt per
--      SET ROLE, erbt also nichts. **Kein geerbter Weg.**
--
--  (c) **PUBLIC.** `relacl` enthält keinen Eintrag für `grantee = 0`.
--      **Keine PUBLIC-Rechte auf der Tabelle.**
--
--  (d) **Views.** `pg_class` mit `relkind in ('v','m')` im Schema
--      `public`: **null Zeilen.** Es gibt keine Sicht, die an den
--      Spaltenrechten vorbeiführen könnte — weder eine mit
--      Definer-Rechten noch eine mit `security_invoker`.
--
--      Wer später eine anlegt: eine View läuft standardmässig mit den
--      Rechten ihres **Eigentümers**. Eine View über `notfaelle`, die
--      `postgres` gehört, macht diese Migration wirkungslos.
--      `WITH (security_invoker = true)` ist dort Pflicht.
--
--  (e) **Funktionen.** Fünf Funktionen berühren `notfaelle`:
--
--        kalender_schichten              → nur `exists(...)`, gibt einen
--                                          Wahrheitswert zurück
--        schicht_ansehen                 → dasselbe Muster
--        notfall_melden                  → schreibt `grund` (Parameter)
--        notfall_vertretung_uebernehmen  → `select *` in eine Variable,
--                                          gibt `text` zurück
--        notfall_vertretung_ausschreiben → `select *` in eine Variable;
--                                          baut die Ankündigung **Feld
--                                          für Feld** und nimmt `grund`
--                                          ausdrücklich NICHT mit
--
--      Der letzte Punkt ist der wichtige: hätte die Ausschreibung den
--      Grund in `benachrichtigungen.inhalt` geschrieben, wäre er für
--      jedes Betriebsmitglied lesbar — und keine Spaltenberechtigung
--      der Welt hätte daran etwas geändert. Tut sie nicht; im Quelltext
--      nachgesehen, nicht vermutet.
--
--  (f) **Filter und RETURNING.** Beides verlangt in PostgreSQL SELECT
--      auf der betroffenen Spalte. Nach Abschnitt 3 scheitert deshalb
--      auch `?grund=eq.…` — sonst liesse sich der Inhalt durch Raten
--      erschliessen, ohne ihn je zu lesen.
--
-- =====================================================================
--  3. Ist SECURITY DEFINER dafür nötig? Zwei Wege.
-- =====================================================================
--
--  Nein, nicht zwingend — und das ist eine echte Entscheidung, keine
--  Formalie.
--
--  **Variante A (unten umgesetzt): Spaltenrechte + Definer-Funktion.**
--  Die Spalte bleibt, wo sie ist; der Zugriff läuft über eine Funktion,
--  die als Eigentümer läuft und ihre Berechtigung selbst prüft.
--
--    + wenig Migrationsaufwand, keine Datenbewegung
--    + eine einzige App-Änderung (manager.tsx)
--    − SECURITY DEFINER umgeht RLS vollständig. Die Funktion **ist**
--      damit die Zugriffskontrolle; ein Fehler darin ist ein
--      Vollzugriff. Deshalb: fester `search_path`, nur ein
--      uuid-Parameter, kein dynamisches SQL, `EXECUTE` von PUBLIC und
--      `anon` entzogen, und ein einheitliches `null` für „gibt es
--      nicht" wie für „darfst du nicht" (sonst verrät die
--      Unterscheidung die Existenz fremder Meldungen).
--
--  **Variante B: eigene Tabelle `notfall_gruende` mit eigener RLS.**
--  `grund` zieht in eine 1:1-Tabelle um, deren SELECT-Policy genau
--  lautet: `ist_chef(betrieb_id) OR melder OR uebernehmer`.
--
--    + **keine Definer-Funktion nötig.** Die Regel steht als Policy da,
--      wird vom Planer durchgesetzt und ist in `pg_policies` lesbar
--    + RLS bleibt die einzige Autorisierungsebene (`CLAUDE.md`)
--    − Datenmigration, FK, `notfall_melden` muss umgeschrieben werden,
--      und die App braucht einen Join statt einer Spalte
--
--  **Empfehlung: B, sobald jemand ohnehin an `notfall_melden` arbeitet;
--  A als sofort umsetzbare Zwischenlösung.** Entschieden wird das mit
--  dem App-Entwickler, nicht hier. Variante B steht als Entwurf in
--  Abschnitt 7.
--
-- =====================================================================
--  4. Was das an den Clients bricht — abgeglichen, nicht vermutet
-- =====================================================================
--
--   * `../QuickTeam App/src/app/(tabs)/manager.tsx:165` liest `grund` in
--     der Spaltenliste. Diese eine Stelle muss auf den RPC umgestellt
--     werden, sonst antwortet PostgREST mit 403.
--   * Sonst greift **kein** Client auf `grund` zu, und **kein** Client
--     benutzt `select("*")` auf `notfaelle` (am 2026-09-13 in beiden
--     Repos durchsucht: `index.tsx:149`, `messages.tsx:116`,
--     `scheduling.tsx:173` und alle vier Abfragen in
--     `src/lib/dashboard/notfall.ts` nennen ihre Spalten einzeln).
--     Ein Spaltenrecht bricht nur `select=*`, und das gibt es hier nicht.
--   * **Wichtig für Abschnitt 3:** nach `revoke select on … from
--     authenticated` muss die Spaltenliste **alle** übrigen Spalten
--     nennen. Wird eine vergessen, brechen die vier Web-Abfragen und die
--     drei App-Abfragen — laut, aber überflüssig. Die Liste unten ist am
--     2026-09-14 aus `information_schema.columns` erhoben.
--
-- =====================================================================
--  5. Anwenden
-- =====================================================================
--
--   1. Zuerst an einem Wegwerfbetrieb in `QT-Sandbox-Test` laufen
--      lassen, nicht in „Test" und nie in Testbetrieb 12.
--   2. Die Gegenproben (Abschnitt 6) mit dem JWT eines gewöhnlichen
--      Mitarbeiters fahren, nicht über die Oberfläche.
--   3. Reihenfolge mit der App abstimmen: erst die App auf den RPC
--      umstellen, dann diese Migration — dann sieht niemand eine
--      Fehlermeldung, und der Grund ist ein paar Tage länger lesbar.
--      Umgekehrt schliesst die Lücke sofort, kostet aber einen kaputten
--      Manager-Screen, bis die App nachzieht.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Variante A, Schritt 1: Tabellenrecht entziehen, Spalten neu gewähren
-- ---------------------------------------------------------------------
--
-- Die Reihenfolge ist zwingend. `revoke select (grund)` allein wäre
-- wirkungslos (siehe Kopf); erst das Entziehen des Tabellenrechts macht
-- die anschliessende Spaltenliste zur vollständigen Aussage darüber, was
-- gelesen werden darf.
--
-- `anon` bekommt gar nichts zurück: die Rolle sieht mangels Policy
-- ohnehin keine Zeile, und ein Recht, das nicht vergeben ist, kann auch
-- nicht wirksam werden, wenn jemand später eine Policy ergänzt.

revoke select on public.notfaelle from authenticated;
revoke select on public.notfaelle from anon;

grant select (
  id,
  betrieb_id,
  schicht_zuweisung_id,
  schicht_instanz_id,
  rolle_id,
  melder_id,
  status,
  uebernehmer_id,
  vertretung_benachrichtigung_id,
  erstellt_am,
  aktualisiert_am
) on public.notfaelle to authenticated;

-- Gegenprobe im selben Lauf: `grund` darf nicht mehr lesbar sein, eine
-- gewöhnliche Spalte schon. Schlägt das fehl, bricht die Transaktion ab,
-- statt eine wirkungslose Migration zu hinterlassen — genau der Fehler
-- der ersten Fassung.
do $$
begin
  if has_column_privilege('authenticated', 'public.notfaelle', 'grund', 'SELECT') then
    raise exception
      'Migration wirkungslos: authenticated kann notfaelle.grund weiterhin lesen';
  end if;
  if not has_column_privilege('authenticated', 'public.notfaelle', 'status', 'SELECT') then
    raise exception
      'Zu viel entzogen: authenticated kann notfaelle.status nicht mehr lesen';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Variante A, Schritt 2: der schmale Pfad zurück
-- ---------------------------------------------------------------------

create or replace function public.notfall_grund(p_notfall_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_betrieb uuid;
  v_melder uuid;
  v_uebernehmer uuid;
  v_grund text;
  v_ich uuid;
begin
  select betrieb_id, melder_id, uebernehmer_id, grund
    into v_betrieb, v_melder, v_uebernehmer, v_grund
    from public.notfaelle
   where id = p_notfall_id;

  -- „gibt es nicht" und „darfst du nicht" sind absichtlich
  -- ununterscheidbar: sonst verrät die Antwort, ob eine fremde Meldung
  -- existiert.
  if v_betrieb is null then
    return null;
  end if;

  -- Betriebszugehörigkeit zuerst: ohne sie ist jede weitere Frage
  -- gegenstandslos, und `meine_mitarbeiter_id` liefert dann ohnehin null.
  if not (v_betrieb in (select public.meine_betriebe())) then
    return null;
  end if;

  v_ich := public.meine_mitarbeiter_id(v_betrieb);

  if public.ist_chef(v_betrieb)
     or (v_ich is not null and v_ich in (v_melder, v_uebernehmer)) then
    return v_grund;
  end if;

  return null;
end;
$$;

-- Supabase vergibt `EXECUTE` über Default-Privilegien auch an `anon`;
-- das `revoke from public` allein erfasst das nicht (Audit-Punkt 8).
revoke all on function public.notfall_grund(uuid) from public;
revoke all on function public.notfall_grund(uuid) from anon;
grant execute on function public.notfall_grund(uuid) to authenticated;

comment on function public.notfall_grund(uuid) is
  'Notfallgrund (moeglicherweise Gesundheitsdatum, Art. 9 DSGVO) fuer '
  'Leitung, Melder und Vertretung. Ersetzt den direkten Spaltenzugriff, '
  'der seit dieser Migration entzogen ist. SECURITY DEFINER, weil die '
  'Spalte sonst fuer niemanden mehr lesbar waere; die Funktion ist damit '
  'selbst die Zugriffskontrolle.';

commit;

-- =====================================================================
--  6. Gegenproben — als JWT der jeweiligen Person ausführen
-- =====================================================================
--
--  1) Gewöhnlicher Mitarbeiter, fremde Meldung:
--     GET /rest/v1/notfaelle?select=id,grund   → 403
--     GET /rest/v1/notfaelle?select=*          → 403  (kein Client tut das)
--     GET /rest/v1/notfaelle?select=id,status  → 200, unverändert
--     GET /rest/v1/notfaelle?grund=eq.test     → 403  (Filter braucht SELECT)
--     POST /rest/v1/rpc/notfall_grund          → null
--
--  2) Melder, eigene Meldung:        → der Text
--  3) Chef desselben Betriebs:       → der Text
--  4) Chef eines anderen Betriebs:   → null
--  5) `anon` (nur anon-Key):         → 401/403
--
--  6) **Und die App:** Manager-Screen öffnen. Vor der App-Änderung muss
--     er hier sichtbar brechen — wenn nicht, liest er `grund` über einen
--     Weg, den Abschnitt 2 übersehen hat.
--
-- =====================================================================
--  7. Variante B als Entwurf — ohne SECURITY DEFINER
-- =====================================================================
--
--  Nicht Teil dieser Migration. Steht hier, damit die Entscheidung mit
--  beiden Fassungen vor Augen fallen kann.
--
--    create table public.notfall_gruende (
--      notfall_id uuid primary key
--        references public.notfaelle(id) on delete cascade,
--      betrieb_id uuid not null references public.betriebe(id) on delete cascade,
--      grund      text not null,
--      erstellt_am timestamptz not null default now()
--    );
--
--    alter table public.notfall_gruende enable row level security;
--
--    -- Die ganze Regel, als Policy lesbar — kein Funktionskörper, den
--    -- man auditieren müsste.
--    create policy notfall_grund_select on public.notfall_gruende
--      for select using (
--        betrieb_id in (select public.meine_betriebe())
--        and (
--          public.ist_chef(betrieb_id)
--          or exists (
--            select 1 from public.notfaelle n
--             where n.id = notfall_id
--               and public.meine_mitarbeiter_id(betrieb_id)
--                   in (n.melder_id, n.uebernehmer_id)
--          )
--        )
--      );
--
--    -- Danach: Daten umziehen, `notfaelle.grund` löschen,
--    -- `notfall_melden()` auf die neue Tabelle umstellen.
--
--  Der Preis ist die Datenmigration und eine Änderung an fremdem Code
--  (`notfall_melden`); der Gewinn ist, dass die Zugriffsregel dort steht,
--  wo dieses Projekt alle anderen auch hat.
--
-- =====================================================================
--  8. Zurücknehmen
-- =====================================================================
--
--   grant select on public.notfaelle to authenticated;
--   drop function if exists public.notfall_grund(uuid);
--
-- =====================================================================
--  9. Was diese Migration NICHT erledigt
-- =====================================================================
--
--   * Der Platzhalter „Ich bin krank." in
--     `../QuickTeam App/src/i18n/locales/de.json:447` fordert weiterhin
--     zu einer Gesundheitsangabe auf. Er gehört in allen Sprachen durch
--     etwas Neutrales ersetzt („Kurz, ohne Angaben zur Gesundheit").
--     App-Änderung, keine Datenbankänderung — und die wirksamere von
--     beiden, weil sie die Daten gar nicht erst entstehen lässt.
--   * Bereits erfasste Gründe bleiben stehen. Ob Altbestände gelöscht
--     werden, ist eine Weisung des Verantwortlichen (des Kunden), keine
--     Entscheidung des Auftragsverarbeiters.
--   * `plan_aenderungen` kann alte Gründe in `alte_werte`/`neue_werte`
--     enthalten. Der Web-Export entfernt sie beim Export bereits
--     (`src/lib/export/paket.ts`); in der Tabelle selbst stehen sie
--     weiter.
