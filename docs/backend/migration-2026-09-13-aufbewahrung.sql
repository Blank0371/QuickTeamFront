-- =====================================================================
--  Aufbewahrung und Löschung eines Betriebs
--  Vorbereitet am 2026-09-13. NICHT ANGEWENDET, NICHT ERPROBT.
-- =====================================================================
--
--  ###################################################################
--  #  ÜBERHOLT — nicht anwenden.                                     #
--  #                                                                 #
--  #  Ersetzt durch:                                                 #
--  #  migration-2026-09-14-vertragsende-und-loeschung.sql            #
--  #                                                                 #
--  #  Diese Fassung rechnete Fristen auf `aktualisiert_am` und wollte #
--  #  `trg_letzter_chef` per `session_replication_role` abschalten.   #
--  #  Beides ist falsch; die Nachfolgedatei erklärt, warum, und       #
--  #  braucht keines von beidem. Bleibt als Beleg der Herleitung      #
--  #  (FK-Erhebung, Trigger-Funde) stehen.                            #
--  ###################################################################
--
--  Diese Migration wird **nicht angewendet**, bis alle vier Punkte
--  erledigt sind. Betreiberentscheidung vom 2026-09-14; sie geht der
--  Einschätzung dieser Datei vor.
--
--   [ ] 1. VERTRAGSENDE. Es gibt kein belastbares Datum (Abschnitt 6).
--          `betrieb_abonnements` hat keine Spalte dafür; `aktualisiert_am`
--          heisst „zuletzt vom Webhook gesehen", nicht „beendet am". Eine
--          Frist auf dem falschen Datum löscht zu früh. Zu klären: eigene
--          Spalte `beendet_am` oder Abfrage bei Stripe.
--
--   [ ] 2. EXPORTFRISTEN. `export_anfragen` und die Abruffrist aus
--          AGB § 6 Abs. 4 (Fassung r2) müssen nachweislich greifen —
--          also ein Lauf, in dem `betrieb_loeschen()` wegen einer
--          offenen Anfrage tatsächlich abbricht, nicht nur der Code, der
--          es tun sollte.
--
--   [ ] 3. LETZTER-CHEF-TRIGGER. `trg_letzter_chef` (BEFORE DELETE auf
--          `mitarbeiter`) wirft voraussichtlich, sobald die letzte aktive
--          Chef-Zeile fällt — und genau das tut eine Betriebslöschung.
--          Ob er es wirklich tut und womit er sich abschalten lässt, ist
--          **ungeprüft** (Abschnitt 5, Punkt I).
--
--   [ ] 4. ISOLIERTE UMGEBUNG. Erprobt wird an einem Wegwerfbetrieb in
--          `QT-Sandbox-Test`. Nicht in „Test" (dort liegen Fixtures),
--          nie in Testbetrieb 12 (daran hängt die Testsuite der App).
--
--  Solange auch nur ein Kästchen offen ist, ist diese Datei eine
--  Vorlage zum Erproben und kein Betriebsmittel. Sie löscht ganze
--  Betriebe; ein unerprobter Lauf ist nicht zurückzunehmen.
--
--  ###################################################################
--
--  Deckt drei Befunde ab:
--
--   * `docs/backend-befunde-2026-09-13.md` Punkt 5 — es gibt keine
--     automatische Löschung von Betrieben, obwohl Ziffer 15.3 der
--     Datenschutzerklärung und § 6 Abs. 4 der AGB sie versprechen.
--   * Punkt 6 — `rechtliche_zustimmungen.betrieb_id` ist
--     `ON DELETE CASCADE`; mit dem Betrieb verschwindet der Nachweis,
--     dass AGB und AVV je angenommen wurden.
--   * Der Widerspruch, den das Review vom 2026-09-13 benannt hat: eine
--     rechtzeitige Exportanfrage darf nicht dadurch unerfüllbar werden,
--     dass ihre Quelldaten während der Bearbeitungsfrist gelöscht
--     werden.
--
--  **Diese Datei ist ein Entwurf zum Erproben, keine fertige Migration.**
--  Zwei Hindernisse sind benannt, aber nicht ausgeräumt (Abschnitt 5);
--  beide lassen sich nur an einem Wegwerfbetrieb klären, und von diesem
--  Repo aus wird in die Datenbank nicht geschrieben.
--
-- =====================================================================
--  1. Was einem `DELETE FROM betriebe` heute im Weg steht
-- =====================================================================
--
--  Am 2026-09-13 aus `pg_constraint` und `pg_trigger` der Live-Instanz
--  erhoben, nicht geschätzt:
--
--  (a) **Fünf Tabellen hängen mit `NO ACTION` an `betriebe`** und lassen
--      das Löschen scheitern: `aufgaben`, `benachrichtigung_gelesen`,
--      `nachricht_anhaenge`, `umfrage_optionen`, `umfrage_stimmen`.
--
--  (b) **`benachrichtigungen` hat überhaupt keinen Fremdschlüssel auf
--      `betriebe`.** Ein gelöschter Betrieb liesse damit seine
--      Ankündigungen, Umfragen und Checklisten als Waisen stehen — sie
--      werden weder mitgelöscht noch blockieren sie. Dasselbe gilt für
--      `einladungen`. Das ist der unangenehmste der drei Fälle: es
--      **sieht** aus, als sei gelöscht worden.
--
--  (c) **Zehn Fremdschlüssel auf `mitarbeiter` sind `NO ACTION`**, vier
--      auf `rollen` sind `RESTRICT`. `mitarbeiter` und `rollen` hängen
--      selbst mit `CASCADE` an `betriebe` — der Kaskadenlauf bricht
--      also an seinen eigenen Kindern ab.
--
--  (d) **Zwei Trigger schreiben beim Löschen** (`trg_audit_instanzen`,
--      `trg_audit_zuweisungen` → `plan_aenderungen`). Wer
--      `plan_aenderungen` vor den Schichten leert, hat danach wieder
--      Zeilen darin.
--
--  (e) **`trg_letzter_chef` (BEFORE DELETE auf `mitarbeiter`)** wirft,
--      sobald die letzte aktive Chef-Zeile entfernt wird — und genau das
--      tut eine Betriebslöschung. Siehe Abschnitt 5.
--
--  Die Reihenfolge unten ist aus (a) bis (d) abgeleitet.
--
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 2. Der Nachweis überlebt den Betrieb
-- ---------------------------------------------------------------------
--
-- Ein Zustimmungsnachweis, der mit dem Vertragsgegenstand verschwindet,
-- beweist im Streitfall nichts — gebraucht wird er gerade dann, wenn es
-- den Betrieb nicht mehr gibt. Deshalb eine eigene Tabelle ohne
-- Fremdschlüssel: sie hält Betriebsname und -id als Text fest, damit
-- keine Beziehung sie mitreissen kann.
--
-- **Entscheidung des Betreibers, nicht des Codes:** wie lange sie steht.
-- Vorgeschlagen sind drei Jahre nach Vertragsende (regelmässige
-- Verjährung, §§ 195, 199 BGB); darüber hinaus wäre eine Aufbewahrung
-- ohne Zweck.

create table if not exists public.zustimmung_archiv (
  id                bigint generated always as identity primary key,
  betrieb_id        uuid not null,
  betrieb_name      text,
  auth_id           uuid,
  dokument          text not null,
  version           text not null,
  art               text,
  sprache           text,
  inhalt_hash       text,
  akzeptiert_am     timestamptz not null,
  archiviert_am     timestamptz not null default now(),
  loeschen_ab       timestamptz not null
);

comment on table public.zustimmung_archiv is
  'Zustimmungsnachweise geloeschter Betriebe. Ohne Fremdschluessel, damit '
  'keine Kaskade sie mitnimmt. Aufbewahrung bis `loeschen_ab`.';

alter table public.zustimmung_archiv enable row level security;
-- Keine Policy: niemand ausser `service_role` liest oder schreibt hier.
-- Das ist kein Versehen — ein Archiv, in das eine Anwendung schreiben
-- kann, ist kein Archiv.

-- ---------------------------------------------------------------------
-- 3. Offene Exportanfragen halten die Löschung auf
-- ---------------------------------------------------------------------
--
-- § 6 Abs. 4 der AGB in der Fassung r2: ein rechtzeitiges Verlangen
-- hält die Löschung auf, bis die Daten bereitgestellt wurden und seit
-- der Bereitstellung vierzehn Tage zum Abruf vergangen sind. Ohne eine
-- solche Zeile könnte der Löschjob eine laufende Anfrage nicht kennen.
--
-- Die Zeile legt der Betreiber an, wenn ein Verlangen in Textform
-- eingeht (die Selbstbedienung über `/api/betrieb-export` braucht sie
-- nicht — dort ist die Bereitstellung der Abruf).

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
  'nicht erledigt ist oder ihre Abruffrist laeuft, wird der Betrieb nicht '
  'geloescht.';

alter table public.export_anfragen enable row level security;

create policy export_anfragen_select_chef on public.export_anfragen
  for select using (public.ist_chef(betrieb_id));
-- Angelegt wird ausschliesslich durch den Betreiber (`service_role`):
-- die Anfrage kommt in Textform, nicht aus der Oberflaeche.

create index if not exists idx_export_anfragen_offen
  on public.export_anfragen (betrieb_id)
  where erledigt = false;

-- ---------------------------------------------------------------------
-- 4. Die Löschung selbst
-- ---------------------------------------------------------------------

create or replace function public.betrieb_loeschen(p_betrieb_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_offen int;
begin
  select name into v_name from public.betriebe where id = p_betrieb_id;
  if v_name is null then
    raise exception 'Betrieb % existiert nicht', p_betrieb_id;
  end if;

  -- Eine laufende Exportanfrage hat Vorrang vor der Frist.
  select count(*) into v_offen
    from public.export_anfragen
   where betrieb_id = p_betrieb_id
     and (erledigt = false or abrufbar_bis > now());
  if v_offen > 0 then
    raise exception
      'Betrieb % hat % offene Exportanfrage(n) — Loeschung ausgesetzt (AGB § 6 Abs. 4)',
      p_betrieb_id, v_offen;
  end if;

  -- Nachweis sichern, bevor irgendetwas fällt.
  insert into public.zustimmung_archiv (
    betrieb_id, betrieb_name, auth_id, dokument, version, art, sprache,
    inhalt_hash, akzeptiert_am, loeschen_ab)
  select z.betrieb_id, v_name, z.auth_id, z.dokument, z.version, z.art,
         z.sprache, z.inhalt_hash, z.akzeptiert_am, now() + interval '3 years'
    from public.rechtliche_zustimmungen z
   where z.betrieb_id = p_betrieb_id;

  -- Reihenfolge: Kinder vor Eltern, siehe Abschnitt 1.
  -- `benachrichtigungen`, `einladungen` und `plan_aenderungen` stehen
  -- ausdrücklich darin, obwohl (bzw. weil) ihre Fremdschlüssel sie nicht
  -- mitnehmen würden.
  delete from public.schichttausch_anfragen      where betrieb_id = p_betrieb_id;
  delete from public.umfrage_stimmen             where betrieb_id = p_betrieb_id;
  delete from public.umfrage_optionen            where betrieb_id = p_betrieb_id;
  delete from public.aufgaben                    where betrieb_id = p_betrieb_id;
  delete from public.benachrichtigung_gelesen    where betrieb_id = p_betrieb_id;
  delete from public.nachricht_anhaenge          where betrieb_id = p_betrieb_id;
  delete from public.benachrichtigungen          where betrieb_id = p_betrieb_id;
  delete from public.schicht_ausschreibung_bedarf where betrieb_id = p_betrieb_id;
  delete from public.schicht_notizen             where betrieb_id = p_betrieb_id;
  delete from public.verfuegbarkeiten            where betrieb_id = p_betrieb_id;
  delete from public.schicht_zuweisungen         where betrieb_id = p_betrieb_id;
  delete from public.schicht_instanz_mindestbesetzung where betrieb_id = p_betrieb_id;
  delete from public.schicht_instanzen           where betrieb_id = p_betrieb_id;
  delete from public.mitarbeiter_schicht_tagesvorlieben where betrieb_id = p_betrieb_id;
  delete from public.mitarbeiter_schicht_vorlieben where betrieb_id = p_betrieb_id;
  delete from public.schicht_vorlage_mindestbesetzung where betrieb_id = p_betrieb_id;
  delete from public.schicht_vorlagen            where betrieb_id = p_betrieb_id;
  delete from public.planungszyklen              where betrieb_id = p_betrieb_id;
  delete from public.notfaelle                   where betrieb_id = p_betrieb_id;
  delete from public.urlaub                      where betrieb_id = p_betrieb_id;
  delete from public.abwesenheit                 where betrieb_id = p_betrieb_id;
  delete from public.mitarbeiter_rollen          where betrieb_id = p_betrieb_id;
  delete from public.rollen                      where betrieb_id = p_betrieb_id;
  delete from public.einladungen                 where betrieb_id = p_betrieb_id;

  delete from public.benachrichtigung_prefs
   where mitarbeiter_id in (select id from public.mitarbeiter where betrieb_id = p_betrieb_id);

  -- Nach allem, was beim Löschen protokolliert wird (Abschnitt 1 (d)).
  delete from public.plan_aenderungen            where betrieb_id = p_betrieb_id;

  delete from public.mitarbeiter                 where betrieb_id = p_betrieb_id;
  delete from public.betrieb_abonnements         where betrieb_id = p_betrieb_id;
  delete from public.betriebs_einstellungen      where betrieb_id = p_betrieb_id;
  delete from public.rechtliche_zustimmungen     where betrieb_id = p_betrieb_id;
  delete from public.betriebe                    where id = p_betrieb_id;
end;
$$;

revoke all on function public.betrieb_loeschen(uuid) from public;
revoke all on function public.betrieb_loeschen(uuid) from anon;
revoke all on function public.betrieb_loeschen(uuid) from authenticated;
-- Ausschliesslich `service_role`: das ist ein Betreiberwerkzeug. Kein
-- angemeldeter Nutzer darf einen ganzen Betrieb mit einem Aufruf
-- entfernen, auch kein Chef.

commit;

-- =====================================================================
--  5. Zwei ungeklärte Hindernisse — vor dem Einsatz zu erproben
-- =====================================================================
--
--  (I) **`trg_letzter_chef`.** Der Trigger (BEFORE DELETE auf
--      `mitarbeiter`) wirft, wenn die letzte aktive Chef-Zeile fällt.
--      Genau das tut `delete from mitarbeiter where betrieb_id = …`.
--      Die Funktion läuft als SECURITY DEFINER, aber `security definer`
--      schaltet keine Trigger ab.
--
--      Zu prüfen, in dieser Reihenfolge:
--        1. Wirft `pruefe_letzter_chef` überhaupt, wenn alle Chef-Zeilen
--           in **einer** Anweisung fallen? Die Funktion ist FOR EACH ROW;
--           beim letzten Zeilenlauf sind die anderen schon weg — sie wird
--           vermutlich werfen. Am Wegwerfbetrieb messen, nicht annehmen.
--        2. Wenn ja: `set local session_replication_role = 'replica'`
--           innerhalb der Funktion. Das erfordert in Supabase die Rolle
--           `postgres`; ob `service_role` das darf, ist zu prüfen.
--        3. Sonst: den Trigger um eine Ausnahme für den Löschpfad
--           erweitern — das ist eine Änderung an fremdem Code und gehört
--           abgestimmt.
--
--  (II) **Dateianhänge.** `nachricht_anhaenge` verweist über
--       `datei_pfad` auf Objekte im Speicher. Die Zeile zu löschen
--       entfernt die Datei nicht. Solange es keinen Bucket gibt
--       (am 2026-09-13 war `storage.buckets` leer, siehe
--       `docs/export/README.md`), ist nichts zu tun; sobald es einen
--       gibt, gehört das Löschen der Objekte hierher.
--
-- =====================================================================
--  6. Wer ruft das auf
-- =====================================================================
--
--  Hier ist bewusst **kein** `pg_cron`-Job enthalten. Ein Job, der
--  unbeaufsichtigt ganze Betriebe löscht, gehört nicht in dieselbe
--  Migration wie die Funktion, die er aufruft — erst soll die Funktion
--  an einem Wegwerfbetrieb bewiesen sein. Der Entwurf dafür, zum
--  späteren Einhängen:
--
--    select cron.schedule('betriebe-aufraeumen', '30 3 * * *', $job$
--      select public.betrieb_loeschen(b.id)
--        from public.betriebe b
--        join public.betrieb_abonnements a on a.betrieb_id = b.id
--       where a.status = 'gekuendigt'
--         and a.aktualisiert_am < now() - interval '30 days';
--    $job$);
--
--  `aktualisiert_am` ist dabei ein Behelf: `betrieb_abonnements` hat
--  **keine Spalte für das Vertragsende** und keine für das Ende der
--  Testphase (CLAUDE.md, Abschnitt „missing_payment_method"). Der Wert
--  ändert sich bei jedem Webhook, ist also „zuletzt gesehen", nicht
--  „beendet am". Für eine belastbare Frist braucht es entweder eine
--  Spalte `beendet_am` oder eine Abfrage bei Stripe. **Das ist zu
--  entscheiden, bevor ein Job scharf geschaltet wird** — eine
--  Löschfrist, die auf dem falschen Datum rechnet, löscht zu früh.
