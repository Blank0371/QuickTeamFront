-- =====================================================================
--  Vertragsende, Exportfristen und geordnete Löschung eines Betriebs
--  Vorbereitet am 2026-09-14. NICHT ANGEWENDET, NICHT ERPROBT.
--
--  Ersetzt: migration-2026-09-13-aufbewahrung.sql
-- =====================================================================
--
--  Was diese Fassung gegenüber der vom 2026-09-13 ändert:
--
--   1. **`aktualisiert_am` ist nicht mehr das Vertragsende.** Das war der
--      schwerste Fehler des Entwurfs: der Wert heisst „zuletzt vom
--      Webhook gesehen" und springt bei jedem Ereignis nach vorn. Eine
--      Löschfrist darauf rechnet in beide Richtungen falsch — und in
--      einer davon unwiederbringlich. Jetzt gibt es drei eigene Spalten,
--      geschrieben vom Webhook aus den Stripe-Feldern.
--   2. **`trg_letzter_chef` wird nicht mehr abgeschaltet.** Der Trigger
--      hat eine eingebaute Ausnahme, die der Entwurf übersehen hatte
--      (Abschnitt 4). Die Löschreihenfolge nutzt sie, statt den Schutz
--      generell auszuhebeln.
--   3. **Vorgemerkte Kündigung, Beendigung und pausiertes Testabo** sind
--      drei Zustände mit drei Fristen — vorher waren es zwei.
--   4. **Protokoll und Wiederholbarkeit**: jeder Lauf hinterlässt eine
--      Zeile, und ein zweiter Lauf über denselben Betrieb ist folgenlos.
--
-- =====================================================================
--  GESPERRT — Stand 2026-09-14
-- =====================================================================
--
--  Anwenden erst, wenn alle vier Punkte erledigt sind:
--
--   [x] 1. VERTRAGSENDE — gelöst: Abschnitt 2 (Spalten) + Abschnitt 3
--          (Webhook). Die Ableitung ist in `src/lib/abo-ende.ts`
--          implementiert und getestet.
--   [ ] 2. EXPORTFRISTEN — Abschnitt 5 ist geschrieben, aber es fehlt
--          der Lauf, der zeigt, dass `betrieb_loeschen()` wegen einer
--          offenen Anfrage tatsächlich abbricht.
--   [ ] 3. LETZTER-CHEF-TRIGGER — Abschnitt 4 erklärt, warum die neue
--          Reihenfolge ihn nicht mehr braucht. **Am Wegwerfbetrieb
--          nachzuweisen**, nicht zu glauben.
--   [ ] 4. ISOLIERTE UMGEBUNG — Testmatrix in Abschnitt 8, zu fahren in
--          `QT-Sandbox-Test`. Nicht in „Test" (Fixtures), nie in
--          Testbetrieb 12 (Testsuite der App).
--
-- =====================================================================
--  1. Offene Rechtsfragen — nicht vom Code zu entscheiden
-- =====================================================================
--
--  Diese Migration **erfindet keine Fristen**. Sie setzt die um, die in
--  den eigenen Dokumenten stehen, und markiert, was fehlt:
--
--   * **30 Tage nach Vertragsende** bis zur Löschung — AGB § 6 Abs. 4,
--     AVV § 8 Abs. 2, Datenschutzerklärung Ziffer 15.3. Belegt.
--   * **14 Tage Abruffrist** nach Bereitstellung eines Exports — AGB
--     § 6 Abs. 4 in der Fassung r2. Belegt, aber **von uns selbst
--     gesetzt**; wenn die anwaltliche Prüfung sie ändert, ändert sich
--     `ABRUFFRIST_TAGE` hier mit.
--   * **90 Tage** für ein pausiertes Testabo — AGB § 5 Abs. 3. Belegt.
--     **OFFEN:** § 5 Abs. 3 verweist seit dem 2026-09-13 für Export und
--     Löschung auf § 6 Abs. 4. Ob nach den 90 Tagen also noch einmal 30
--     Tage laufen (90 + 30) oder ob die 90 Tage die Aufbewahrung
--     bereits abgelten, steht in keinem der Dokumente eindeutig. Der
--     Code unten rechnet **90 + 30**, weil das die für den Kunden
--     günstigere und mit § 6 Abs. 4 wörtlich vereinbare Lesart ist —
--     **das ist eine Annahme und gehört bestätigt.**
--   * **Aufbewahrung des Zustimmungsarchivs**: der Entwurf schlug drei
--     Jahre vor (§§ 195, 199 BGB). **Unbestätigt.** Die Spalte
--     `loeschen_ab` steht da, aber kein Job räumt danach auf — das wäre
--     eine erfundene Frist.
--
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 2. Vertragsende als eigene Angabe
-- ---------------------------------------------------------------------
--
-- Drei Spalten, weil es drei Zustände sind (siehe `src/lib/abo-ende.ts`,
-- dort mit Tabelle und Tests):
--
--   beendet_am     — tatsächlich beendet (Stripe `ended_at`).
--                    NUR hieran hängt die Löschfrist des § 6 Abs. 4.
--   gekuendigt_zum — vorgemerkt, noch nicht wirksam (Stripe `cancel_at`
--                    bzw. Periodenende). Der Dienst läuft weiter, es
--                    läuft KEINE Löschfrist.
--   pausiert_seit  — Testphase ohne Zahlungsmittel abgelaufen (Stripe
--                    `trial_end` bei Status `paused`). Eigene Frist nach
--                    § 5 Abs. 3, eigener Ausgang.
--
-- Alle drei sind `null`, solange der jeweilige Zustand nicht eingetreten
-- ist. `null` heisst überall „nicht eingetreten", nie „unbekannt, nimm
-- heute".

alter table public.betrieb_abonnements
  add column if not exists beendet_am     timestamptz,
  add column if not exists gekuendigt_zum timestamptz,
  add column if not exists pausiert_seit  timestamptz;

comment on column public.betrieb_abonnements.beendet_am is
  'Tatsaechliches Vertragsende (Stripe ended_at). Beginn der Frist nach '
  'AGB § 6 Abs. 4. NICHT aktualisiert_am verwenden - das ist "zuletzt vom '
  'Webhook gesehen".';
comment on column public.betrieb_abonnements.gekuendigt_zum is
  'Vorgemerkte Kuendigung, noch nicht wirksam. Loest KEINE Loeschfrist aus.';
comment on column public.betrieb_abonnements.pausiert_seit is
  'Beginn der 90-Tage-Frist nach AGB § 5 Abs. 3 (pausiertes Testabo).';

-- ---------------------------------------------------------------------
-- 3. Was der Webhook zusätzlich schreiben muss
-- ---------------------------------------------------------------------
--
-- `src/app/api/stripe/webhook/route.ts` baut sein `felder`-Objekt bereits
-- bedingt zusammen („ein Feld, das wir nicht sicher kennen, wird gar
-- nicht erst geschrieben"). Die drei Werte fügen sich dort ein, ohne die
-- bestehende Schutzlogik anzufassen — insbesondere bleibt
-- `.lte("aktualisiert_am", ereignisZeit)` unverändert, das schon heute
-- verspätete und wiederholte Ereignisse abfängt.
--
--   import { ermittleVertragsLage } from "@/lib/abo-ende";
--
--   const lage = ermittleVertragsLage({
--     status: abo.status,
--     ended_at: abo.ended_at,
--     cancel_at: abo.cancel_at,
--     cancel_at_period_end: abo.cancel_at_period_end,
--     canceled_at: abo.canceled_at,
--     trial_end: abo.trial_end,
--     periode_ende: abo.items.data[0]?.current_period_end ?? null,
--   });
--
--   // Jeweils auch das Zuruecksetzen schreiben: wer ein gekuendigtes Abo
--   // reaktiviert, darf kein `gekuendigt_zum` behalten.
--   felder["beendet_am"] =
--     lage.art === "beendet" ? lage.beendetAm.toISOString() : null;
--   felder["gekuendigt_zum"] =
--     lage.art === "kuendigung-vorgemerkt" && lage.wirksamAm
--       ? lage.wirksamAm.toISOString() : null;
--   felder["pausiert_seit"] =
--     lage.art === "pausiert" && lage.seit ? lage.seit.toISOString() : null;
--
-- Der Typ von `felder` wird dafür von `Record<string, string>` auf
-- `Record<string, string | null>` erweitert.
--
-- **Reihenfolge beim Ausrollen:** erst diese Migration, dann der
-- Webhook. Andersherum schreibt der Webhook in Spalten, die es nicht
-- gibt, und jede Zustellung scheitert.

-- ---------------------------------------------------------------------
-- 4. Warum `trg_letzter_chef` in Ruhe gelassen werden kann
-- ---------------------------------------------------------------------
--
-- Der Entwurf vom 2026-09-13 hielt den Trigger für ein Hindernis und
-- erwog `session_replication_role = replica`. Das wäre ein Vorschlag
-- gewesen, den Schutz für die Dauer des Laufs komplett abzuschalten —
-- für **alle** Tabellen, nicht nur für diese eine.
--
-- Nötig ist das nicht. `pruefe_letzter_chef()` beginnt im DELETE-Zweig
-- mit genau dieser Ausnahme (am 2026-09-14 im Quelltext nachgesehen):
--
--     if not exists (select 1 from public.betriebe where id = old.betrieb_id)
--     then return old; end if;
--
-- **Ist der Betrieb schon weg, lässt der Trigger jede Mitarbeiterzeile
-- durch.** Die Reihenfolge unten nutzt das: zuerst fallen alle Kinder,
-- die `betriebe` am Löschen hindern würden, dann `betriebe` selbst — und
-- die Kaskade räumt `mitarbeiter`, `rollen`, `betriebs_einstellungen`,
-- `betrieb_abonnements`, `rechtliche_zustimmungen` und
-- `plan_aenderungen` ab, während der Trigger zusieht und zustimmt.
--
-- Der Schutz bleibt damit für jeden normalen Fall vollständig erhalten:
-- wer im laufenden Betrieb den letzten Chef löschen will, scheitert
-- weiterhin.
--
-- Nebeneffekt derselben Reihenfolge: `plan_aenderungen` muss **nicht**
-- von Hand geleert werden. Die Audit-Trigger auf `schicht_instanzen` und
-- `schicht_zuweisungen` schreiben während Phase 1 fleissig weiter; die
-- Kaskade in Phase 2 nimmt alles mit, was bis dahin entstanden ist. Der
-- Entwurf löschte `plan_aenderungen` mittendrin und hatte danach wieder
-- Zeilen darin.

-- ---------------------------------------------------------------------
-- 5. Exportanfragen halten die Löschung auf
-- ---------------------------------------------------------------------

create table if not exists public.export_anfragen (
  id                bigint generated always as identity primary key,
  betrieb_id        uuid not null references public.betriebe(id) on delete cascade,
  eingegangen_am    timestamptz not null default now(),
  bereitgestellt_am timestamptz,
  abrufbar_bis      timestamptz
    generated always as (bereitgestellt_am + interval '14 days') stored,
  erledigt          boolean not null default false,
  notiz             text
);

comment on table public.export_anfragen is
  'Exportverlangen in Textform nach AGB § 6 Abs. 4. Solange eine Zeile '
  'offen ist oder ihre Abruffrist laeuft, wird der Betrieb nicht geloescht.';

alter table public.export_anfragen enable row level security;

drop policy if exists export_anfragen_select_chef on public.export_anfragen;
create policy export_anfragen_select_chef on public.export_anfragen
  for select using (public.ist_chef(betrieb_id));
-- Angelegt wird ausschliesslich durch den Betreiber (`service_role`):
-- das Verlangen kommt in Textform, nicht aus der Oberfläche.

create index if not exists idx_export_anfragen_offen
  on public.export_anfragen (betrieb_id)
  where erledigt = false;

-- ---------------------------------------------------------------------
-- 6. Zustimmungsnachweise überleben den Betrieb
-- ---------------------------------------------------------------------

create table if not exists public.zustimmung_archiv (
  id            bigint generated always as identity primary key,
  betrieb_id    uuid not null,
  betrieb_name  text,
  auth_id       uuid,
  dokument      text not null,
  version       text not null,
  art           text,
  sprache       text,
  inhalt_hash   text,
  akzeptiert_am timestamptz not null,
  archiviert_am timestamptz not null default now()
);

comment on table public.zustimmung_archiv is
  'Zustimmungsnachweise geloeschter Betriebe. Ohne Fremdschluessel, damit '
  'keine Kaskade sie mitnimmt. Aufbewahrungsdauer NICHT festgelegt - '
  'offene Rechtsfrage, siehe Abschnitt 1 der Migration.';

alter table public.zustimmung_archiv enable row level security;
-- Keine Policy: nur `service_role`. Ein Archiv, in das eine Anwendung
-- schreiben kann, ist kein Archiv.

-- ---------------------------------------------------------------------
-- 7. Protokoll der Läufe
-- ---------------------------------------------------------------------

create table if not exists public.loesch_protokoll (
  id          bigint generated always as identity primary key,
  betrieb_id  uuid not null,
  betrieb_name text,
  grund       text not null,          -- 'vertragsende' | 'testabo_abgelaufen'
  bezugsdatum timestamptz,            -- beendet_am bzw. pausiert_seit
  begonnen_am timestamptz not null default now(),
  beendet_am  timestamptz,
  erfolg      boolean,
  fehler      text
);

alter table public.loesch_protokoll enable row level security;

-- ---------------------------------------------------------------------
-- 8. Die Löschung
-- ---------------------------------------------------------------------

create or replace function public.betrieb_loeschen(p_betrieb_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text;
  v_offen int;
  v_lauf  bigint;
begin
  select name into v_name from public.betriebe where id = p_betrieb_id;

  -- Wiederholbarkeit: ein zweiter Lauf über einen bereits gelöschten
  -- Betrieb ist folgenlos, nicht ein Fehler. Ein Löschjob, der beim
  -- zweiten Durchgang wirft, bleibt beim ersten Teilfehler für immer
  -- stehen.
  if v_name is null then
    return;
  end if;

  -- Eine laufende Exportanfrage hat Vorrang vor jeder Frist.
  select count(*) into v_offen
    from public.export_anfragen
   where betrieb_id = p_betrieb_id
     and (erledigt = false or abrufbar_bis > now());
  if v_offen > 0 then
    raise exception
      'Betrieb % hat % offene Exportanfrage(n) - Loeschung ausgesetzt (AGB § 6 Abs. 4)',
      p_betrieb_id, v_offen;
  end if;

  insert into public.loesch_protokoll (betrieb_id, betrieb_name, grund)
  values (p_betrieb_id, v_name, 'manuell')
  returning id into v_lauf;

  -- Nachweis sichern, bevor irgendetwas fällt.
  insert into public.zustimmung_archiv (
    betrieb_id, betrieb_name, auth_id, dokument, version, art, sprache,
    inhalt_hash, akzeptiert_am)
  select z.betrieb_id, v_name, z.auth_id, z.dokument, z.version, z.art,
         z.sprache, z.inhalt_hash, z.akzeptiert_am
    from public.rechtliche_zustimmungen z
   where z.betrieb_id = p_betrieb_id;

  /* ---- Phase 1: alles, was `betriebe` am Löschen hindert ----------
   *
   * Das sind die Tabellen mit `NO ACTION`/`RESTRICT` und die beiden
   * ohne jeden Fremdschlüssel auf `betriebe` (`benachrichtigungen`,
   * `einladungen`) — die blieben sonst als Waisen stehen, und zwar so,
   * dass es aussieht, als sei gelöscht worden.
   *
   * Kinder vor Eltern, aus der FK-Erhebung vom 2026-09-13 abgeleitet.
   */
  delete from public.schichttausch_anfragen           where betrieb_id = p_betrieb_id;
  delete from public.umfrage_stimmen                  where betrieb_id = p_betrieb_id;
  delete from public.umfrage_optionen                 where betrieb_id = p_betrieb_id;
  delete from public.aufgaben                         where betrieb_id = p_betrieb_id;
  delete from public.benachrichtigung_gelesen         where betrieb_id = p_betrieb_id;
  delete from public.nachricht_anhaenge               where betrieb_id = p_betrieb_id;
  delete from public.benachrichtigungen               where betrieb_id = p_betrieb_id;
  delete from public.schicht_ausschreibung_bedarf     where betrieb_id = p_betrieb_id;
  delete from public.schicht_notizen                  where betrieb_id = p_betrieb_id;
  delete from public.verfuegbarkeiten                 where betrieb_id = p_betrieb_id;
  delete from public.schicht_zuweisungen              where betrieb_id = p_betrieb_id;
  delete from public.schicht_instanz_mindestbesetzung where betrieb_id = p_betrieb_id;
  delete from public.schicht_instanzen                where betrieb_id = p_betrieb_id;
  delete from public.mitarbeiter_schicht_tagesvorlieben where betrieb_id = p_betrieb_id;
  delete from public.mitarbeiter_schicht_vorlieben    where betrieb_id = p_betrieb_id;
  delete from public.schicht_vorlage_mindestbesetzung where betrieb_id = p_betrieb_id;
  delete from public.schicht_vorlagen                 where betrieb_id = p_betrieb_id;
  delete from public.planungszyklen                   where betrieb_id = p_betrieb_id;
  delete from public.notfaelle                        where betrieb_id = p_betrieb_id;
  delete from public.urlaub                           where betrieb_id = p_betrieb_id;
  delete from public.abwesenheit                      where betrieb_id = p_betrieb_id;
  delete from public.mitarbeiter_rollen               where betrieb_id = p_betrieb_id;
  delete from public.einladungen                      where betrieb_id = p_betrieb_id;

  -- Kontoweite Einstellungen der Anstellungen dieses Betriebs.
  -- `benachrichtigung_prefs` hängt an `mitarbeiter`, nicht an `betriebe`.
  delete from public.benachrichtigung_prefs
   where mitarbeiter_id in (select id from public.mitarbeiter where betrieb_id = p_betrieb_id);

  /* ---- Phase 2: der Betrieb, und die Kaskade räumt auf -------------
   *
   * Ab hier greift die Ausnahme in `pruefe_letzter_chef()`: die
   * `betriebe`-Zeile ist weg, also lässt der Trigger die
   * Mitarbeiterzeilen durch, ohne dass irgendein Schutz abgeschaltet
   * werden musste.
   *
   * Die Kaskade nimmt mit: mitarbeiter, rollen, betriebs_einstellungen,
   * betrieb_abonnements, rechtliche_zustimmungen, plan_aenderungen
   * (samt allem, was die Audit-Trigger in Phase 1 noch geschrieben
   * haben) und export_anfragen.
   *
   * **Anmeldekonten bleiben bestehen.** `mitarbeiter.auth_id` verweist
   * auf `auth.users` mit `ON DELETE SET NULL` — in dieser Richtung, nicht
   * umgekehrt. Wer noch in einem anderen Betrieb angestellt ist, behält
   * dort alles; wer nirgends mehr steht, behält sein Konto und kann es
   * selbst löschen.
   */
  delete from public.betriebe where id = p_betrieb_id;

  update public.loesch_protokoll
     set beendet_am = now(), erfolg = true
   where id = v_lauf;
exception
  when others then
    -- Das Protokoll überlebt den Rollback nicht; die Zeile wird deshalb
    -- vom Aufrufer (Abschnitt 9) geschrieben, nicht hier. Diese
    -- Behandlung dient nur der sprechenden Meldung.
    raise;
end;
$$;

revoke all on function public.betrieb_loeschen(uuid) from public;
revoke all on function public.betrieb_loeschen(uuid) from anon;
revoke all on function public.betrieb_loeschen(uuid) from authenticated;
-- Ausschliesslich `service_role`. Kein angemeldeter Nutzer darf einen
-- ganzen Betrieb mit einem Aufruf entfernen, auch kein Chef.

-- ---------------------------------------------------------------------
-- 9. Fällige Betriebe finden — ohne sie zu löschen
-- ---------------------------------------------------------------------
--
-- Bewusst getrennt: eine Funktion, die **nur liest**, lässt sich gefahrlos
-- ausführen und ansehen. Erst wer ihr Ergebnis durchgeht, löscht.

create or replace function public.betriebe_zur_loeschung()
returns table (betrieb_id uuid, betrieb_name text, grund text, bezugsdatum timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  -- Vertragsende: 30 Tage nach dem TATSAECHLICHEN Ende (AGB § 6 Abs. 4).
  -- `gekuendigt_zum` taucht hier absichtlich nicht auf: eine vorgemerkte
  -- Kuendigung ist kein Vertragsende.
  select b.id, b.name, 'vertragsende', a.beendet_am
    from public.betrieb_abonnements a
    join public.betriebe b on b.id = a.betrieb_id
   where a.beendet_am is not null
     and a.beendet_am < now() - interval '30 days'
  union all
  -- Pausiertes Testabo: 90 Tage Fortsetzungsfrist (§ 5 Abs. 3), danach
  -- endet der Vertrag; darauf die 30 Tage aus § 6 Abs. 4.
  -- ANNAHME, siehe Abschnitt 1 - gehoert bestaetigt.
  select b.id, b.name, 'testabo_abgelaufen', a.pausiert_seit
    from public.betrieb_abonnements a
    join public.betriebe b on b.id = a.betrieb_id
   where a.pausiert_seit is not null
     and a.beendet_am is null
     and a.pausiert_seit < now() - interval '120 days';
$$;

revoke all on function public.betriebe_zur_loeschung() from public;
revoke all on function public.betriebe_zur_loeschung() from anon;
revoke all on function public.betriebe_zur_loeschung() from authenticated;

commit;

-- =====================================================================
--  10. Testmatrix — synthetische Betriebe in `QT-Sandbox-Test`
-- =====================================================================
--
--  | # | Aufbau | Erwartet |
--  |---|--------|----------|
--  | 1 | nur ein Chef, sonst nichts | läuft durch; `trg_letzter_chef` wirft NICHT |
--  | 2 | Chef + 5 Mitarbeiter + 3 Rollen + Zuweisungen | läuft durch; keine FK-Verletzung |
--  | 3 | viele abhängige Zeilen (Mitteilungen, Umfragen, Anhänge, Tausch, Notfälle, Urlaub) | läuft durch; `benachrichtigungen` und `einladungen` sind danach leer (keine Waisen) |
--  | 4 | Mitarbeiter hat zusätzlich eine Anstellung in Betrieb Y | Konto bleibt; Anstellung in Y unberührt; `auth.users` unverändert |
--  | 5 | offene `export_anfragen`-Zeile | **Abbruch** mit Meldung, Betrieb bleibt vollständig |
--  | 6 | Exportanfrage bereitgestellt vor 13 Tagen | **Abbruch** (Abruffrist läuft) |
--  | 7 | Exportanfrage bereitgestellt vor 15 Tagen, erledigt | läuft durch |
--  | 8 | `gekuendigt_zum` gesetzt, `beendet_am` null | taucht in `betriebe_zur_loeschung()` **nicht** auf |
--  | 9 | `beendet_am` vor 31 Tagen | taucht auf |
--  | 10 | `pausiert_seit` vor 100 Tagen | taucht **nicht** auf (120 nicht erreicht) |
--  | 11 | derselbe Betrieb zweimal löschen | zweiter Lauf ist folgenlos, kein Fehler |
--  | 12 | Teilfehler erzwingen (z. B. FK künstlich blockieren) | Transaktion rollt zurück, Betrieb bleibt **vollständig**, nicht halb |
--  | 13 | nach dem Lauf: `zustimmung_archiv` | trägt die Zeilen des Betriebs |
--
--  Punkt 12 ist der, den man leicht übergeht: eine Löschung, die zur
--  Hälfte durchläuft, hinterlässt einen Betrieb ohne Dienstplan, aber mit
--  Mitarbeitern — schlimmer als gar keine Löschung. Die Funktion läuft
--  deshalb in **einer** Transaktion; der Aufrufer darf sie nicht in
--  Teilschritte zerlegen.
--
-- =====================================================================
--  11. Wer ruft das auf
-- =====================================================================
--
--  Weiterhin **kein `pg_cron`-Job in dieser Datei**. Erst soll
--  `betrieb_loeschen()` an Wegwerfbetrieben bewiesen sein. Der Entwurf
--  zum späteren Einhängen — er liest die Liste und löscht einzeln, damit
--  ein Fehlschlag bei einem Betrieb die übrigen nicht aufhält:
--
--    select cron.schedule('betriebe-aufraeumen', '30 3 * * *', $job$
--      do $inner$
--      declare r record;
--      begin
--        for r in select * from public.betriebe_zur_loeschung() loop
--          begin
--            perform public.betrieb_loeschen(r.betrieb_id);
--          exception when others then
--            insert into public.loesch_protokoll
--              (betrieb_id, betrieb_name, grund, bezugsdatum, beendet_am,
--               erfolg, fehler)
--            values (r.betrieb_id, r.betrieb_name, r.grund, r.bezugsdatum,
--                    now(), false, sqlerrm);
--          end;
--        end loop;
--      end;
--      $inner$;
--    $job$);
--
--  Die Fehlerzeile wird **ausserhalb** der gescheiterten Transaktion
--  geschrieben — innerhalb würde sie mit zurückgerollt, und der
--  Fehlschlag wäre unsichtbar.
--
-- =====================================================================
--  12. Was offen bleibt
-- =====================================================================
--
--   * **Anhänge.** `nachricht_anhaenge` wird gelöscht, die Dateien im
--     Objektspeicher nicht — es gibt heute keinen (am 2026-09-14:
--     `storage.buckets` leer). Sobald es einen gibt, gehört das Löschen
--     der Objekte in Phase 1, vor der Tabellenzeile: danach ist der Pfad
--     weg und die Datei verwaist.
--   * **Sicherungen.** Die tägliche Datenbanksicherung wird nach 7 Tagen
--     überschrieben (Datenschutzerklärung Ziffer 15.4). Eine Löschung ist
--     also frühestens 7 Tage später auch dort durchgezogen. Das ist
--     beschrieben und braucht keinen Code — aber es gehört in jede
--     Löschbestätigung, die jemand nach AVV § 8 Abs. 2 verlangt.
--   * **Aufbewahrungsdauer des Zustimmungsarchivs** — offene
--     Rechtsfrage, Abschnitt 1.
--   * **90 + 30 oder nur 90** für pausierte Testabos — offene
--     Rechtsfrage, Abschnitt 1. Der Code rechnet 120 Tage.
