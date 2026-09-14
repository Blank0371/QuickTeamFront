-- =====================================================================
--  Notfallgrund in eine eigene Tabelle mit eigener RLS
--  Vorbereitet am 2026-09-14. NICHT ANGEWENDET.
--
--  Ersetzt: migration-2026-09-13-notfallgrund.sql (Variante A)
-- =====================================================================
--
--  ENTSCHEIDUNG: Variante B.
--
--  Die Vorgängerdatei stellte zwei Wege nebeneinander und empfahl B,
--  „sobald jemand ohnehin an `notfall_melden` arbeitet". Bei der
--  Umsetzung stellte sich heraus, dass diese Bedingung wohlfeil war: B
--  braucht **keine einzige Änderung an einer Client-Signatur**, weil
--  `notfall_melden(p_zuweisung_id, p_grund, p_mitarbeiter_id)` gleich
--  bleibt und nur intern woanders hinschreibt. Der Aufwand ist damit
--  deutlich kleiner als angenommen — und der Gewinn bleibt:
--
--    * **Keine SECURITY-DEFINER-Funktion zum Lesen.** Die Regel steht
--      als Policy da, wird vom Planer durchgesetzt und ist in
--      `pg_policies` nachlesbar. RLS bleibt die einzige
--      Autorisierungsebene — die Linie dieses Projekts (`CLAUDE.md`).
--    * **Kein Spaltenrecht-Gebastel.** Variante A musste das
--      Tabellenrecht entziehen und elf Spalten einzeln zurückgeben; eine
--      neue Spalte in `notfaelle` wäre danach still unlesbar gewesen,
--      bis jemand die `grant`-Liste nachzieht.
--    * **Kein `select=*`-Bruch.** `notfaelle` behält sein
--      Tabellenrecht; wer `select=*` macht, bekommt alles ausser dem
--      Grund, weil die Spalte dort nicht mehr existiert.
--
--  Was B kostet: eine Datenmigration und ein `drop column`. Beides ist
--  hier ausformuliert.
--
-- =====================================================================
--  1. Das Ziel
-- =====================================================================
--
--  Teammitglieder sehen, was sie für eine Vertretung brauchen: Schicht,
--  Rolle, Status, wer ausfällt. Den **Grund** — die App schlug dafür
--  „Ich bin krank." vor, es ist also regelmässig ein Gesundheitsdatum
--  nach Art. 9 DSGVO — sehen nur:
--
--    * die meldende Person (es ist ihre eigene Angabe),
--    * die Betriebsleitung (sie entscheidet über die Vertretung),
--    * die übernehmende Person (sie ist bereits eingesprungen).
--
--  Wer die dritte Gruppe enger fassen will, streicht unten eine Zeile
--  aus der Policy; die Vertretungssuche funktioniert auch ohne sie.
--
-- =====================================================================
--  2. Warum RLS auf `notfaelle` das nicht leisten kann
-- =====================================================================
--
--  RLS filtert **Zeilen**, nicht Spalten. Wer die Zeile sehen darf — und
--  das müssen alle, sonst findet niemand eine Vertretung —, sieht jede
--  Spalte darin. Es gibt keine „Spaltenausnahme" in einer SELECT-Policy.
--
--  Und ein `revoke select (grund)` allein wirkt **nicht**, solange die
--  Rolle SELECT auf der ganzen Tabelle hält (PostgreSQL-Dokumentation,
--  `sql-revoke.html`: „revoking privileges on individual columns has no
--  effect if the role holds table-level privileges"). Genau dieser
--  Fehler stand in der ersten Fassung vom 2026-09-13.
--
--  Eine eigene Tabelle hat dagegen ihre eigenen Zeilen — und damit greift
--  RLS wieder genau so, wie sie gedacht ist.
--
-- =====================================================================
--  3. Die Angriffsfläche, am 2026-09-14 gegen die Live-Instanz geprüft
-- =====================================================================
--
--  (a) **Geerbte Rechte.** `pg_auth_members`: weder `anon` noch
--      `authenticated` sind Mitglied einer anderen Rolle.
--      `authenticator` ist Mitglied aller drei, aber `NOINHERIT`.
--      Kein geerbter Weg.
--  (b) **PUBLIC.** `relacl` enthält keinen Eintrag für `grantee = 0`.
--  (c) **Views.** `relkind in ('v','m')` im Schema `public`: null Zeilen.
--      Wer später eine anlegt, braucht `WITH (security_invoker = true)`
--      — sonst läuft sie mit den Rechten des Eigentümers und hebelt
--      jede Policy hier aus.
--  (d) **Funktionen.** Fünf berühren `notfaelle`:
--        kalender_schichten, schicht_ansehen        → nur `exists(...)`
--        notfall_vertretung_uebernehmen             → `select *`, gibt text
--        notfall_vertretung_ausschreiben            → `select *`, baut die
--          Ankündigung Feld für Feld und nimmt `grund` NICHT mit
--          (im Quelltext nachgesehen — hätte sie ihn in
--          `benachrichtigungen.inhalt` geschrieben, wäre er für jedes
--          Betriebsmitglied lesbar, und keine Policy hätte geholfen)
--        notfall_melden                             → schreibt ihn
--      Nach dieser Migration ist `grund` in keiner davon mehr enthalten:
--      die Spalte existiert nicht mehr. `select *` in den beiden
--      `record`-Varianten läuft weiter, liefert das Feld aber nicht.
--  (e) **Filter und RETURNING** auf `notfall_gruende` unterliegen
--      derselben Policy wie SELECT — es gibt keinen Weg, den Inhalt
--      durch `?grund=eq.…` zu erraten, ohne ihn lesen zu dürfen.
--
-- =====================================================================
--  4. Betroffene Aufrufer — abgeglichen, nicht vermutet
-- =====================================================================
--
--  SCHREIBEN
--    * `notfall_melden()` — wird unten umgeschrieben. **Signatur bleibt.**
--      Damit ändert sich für beide Clients beim Melden gar nichts:
--        - Web: `src/app/dashboard/(arbeit)/notfall/aktionen.ts:43`
--          (`p_grund: daten.grund`) — unverändert lauffähig.
--        - App: ruft dieselbe RPC.
--
--  LESEN
--    * Web: **kein einziger Zugriff auf `grund`.** Alle vier Abfragen in
--      `src/lib/dashboard/notfall.ts` (Zeilen 160, 204, 266 und die
--      Vertretungsliste) nennen ihre Spalten einzeln und ohne `grund`;
--      `ChefNotfall` hat gar kein solches Feld. Nach dieser Migration
--      ist im Web nichts anzupassen.
--    * App: `../QuickTeam App/src/app/(tabs)/manager.tsx:165` liest
--      `grund` in der Spaltenliste. **Einzige Fundstelle.** Patchvorschlag
--      in Abschnitt 8.
--    * Kein Client benutzt `select("*")` auf `notfaelle` (am 2026-09-13
--      in beiden Repos durchsucht) — ein `drop column` bricht also keine
--      Spaltenliste ausser der einen oben.
--
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 5. Die Tabelle
-- ---------------------------------------------------------------------
--
-- 1:1 zu `notfaelle`, deshalb ist `notfall_id` zugleich Primärschlüssel.
-- `betrieb_id` steht redundant dabei, damit die Policy ohne Join auf
-- `notfaelle` auskommt — ein Join in einer Policy wird bei jeder Zeile
-- ausgewertet und ist die häufigste Ursache dafür, dass RLS langsam wird.

create table if not exists public.notfall_gruende (
  notfall_id  uuid primary key
    references public.notfaelle(id) on delete cascade,
  betrieb_id  uuid not null
    references public.betriebe(id) on delete cascade,
  grund       text not null,
  erstellt_am timestamptz not null default now()
);

comment on table public.notfall_gruende is
  'Freitextgrund einer Notfallmeldung. Moeglicherweise Gesundheitsdatum '
  '(Art. 9 DSGVO), deshalb getrennt von notfaelle: RLS filtert Zeilen, '
  'nicht Spalten. Lesbar nur fuer Leitung, Melder und Vertretung.';

create index if not exists idx_notfall_gruende_betrieb
  on public.notfall_gruende (betrieb_id);

alter table public.notfall_gruende enable row level security;

-- ---------------------------------------------------------------------
-- 6. Die Regel — als Policy, nicht als Funktionskörper
-- ---------------------------------------------------------------------
--
-- Betriebszugehörigkeit zuerst: ohne sie ist alles Weitere
-- gegenstandslos, und `meine_mitarbeiter_id` liefert dann ohnehin null.

create policy notfall_gruende_select on public.notfall_gruende
  for select using (
    betrieb_id in (select public.meine_betriebe())
    and (
      public.ist_chef(betrieb_id)
      or exists (
        select 1
          from public.notfaelle n
         where n.id = notfall_gruende.notfall_id
           and public.meine_mitarbeiter_id(notfall_gruende.betrieb_id)
               in (n.melder_id, n.uebernehmer_id)
      )
    )
  );

-- **Kein INSERT, kein UPDATE, kein DELETE für `authenticated`.**
--
-- Das ist kein Versehen. Geschrieben wird ausschliesslich durch
-- `notfall_melden()` — eine SECURITY-DEFINER-Funktion, die ohnehin
-- prüft, dass nur eigene Schichten gemeldet werden. Ein direkter
-- INSERT-Weg wäre eine zweite Stelle, an der ein Grund entstehen kann,
-- ohne dass die Meldung dazu existiert.
--
-- Gelöscht wird über `on delete cascade` mit der Notfallzeile.

grant select on public.notfall_gruende to authenticated;
-- `anon` bekommt nichts: keine Policy, kein Grant.

-- ---------------------------------------------------------------------
-- 7. Datenmigration und Umbau
-- ---------------------------------------------------------------------

-- Bestand übernehmen. `nullif(btrim(...))` spiegelt genau das, was
-- `notfall_melden` beim Schreiben tut — leere und reine
-- Leerzeichen-Gründe werden gar nicht erst zu Zeilen.
insert into public.notfall_gruende (notfall_id, betrieb_id, grund, erstellt_am)
select n.id, n.betrieb_id, btrim(n.grund), coalesce(n.erstellt_am, now())
  from public.notfaelle n
 where nullif(btrim(n.grund), '') is not null
on conflict (notfall_id) do nothing;

-- Gegenprobe **vor** dem Löschen der Spalte: keine Zeile darf verloren
-- gehen. Schlägt das fehl, bricht die Transaktion ab, und die Spalte
-- steht noch.
do $$
declare
  v_quelle int;
  v_ziel   int;
begin
  select count(*) into v_quelle
    from public.notfaelle where nullif(btrim(grund), '') is not null;
  select count(*) into v_ziel from public.notfall_gruende;

  if v_quelle <> v_ziel then
    raise exception
      'Datenmigration unvollstaendig: % Gruende in notfaelle, % in notfall_gruende',
      v_quelle, v_ziel;
  end if;
end;
$$;

-- `notfall_melden` schreibt ab jetzt in die neue Tabelle.
-- **Signatur unverändert** — kein Client muss angefasst werden.
create or replace function public.notfall_melden(
  p_zuweisung_id uuid,
  p_grund text default null::text,
  p_mitarbeiter_id uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_z    record;
  v_ma   uuid;
  v_id   uuid;
  v_grund text;
begin
  select sz.betrieb_id, sz.mitarbeiter_id, sz.schicht_instanz_id, sz.rolle_id, si.datum
    into v_z
  from public.schicht_zuweisungen sz
  join public.schicht_instanzen si on si.id = sz.schicht_instanz_id
  where sz.id = p_zuweisung_id
  for update of sz;

  if v_z.betrieb_id is null then
    raise exception 'Zuweisung nicht gefunden';
  end if;

  -- Resolve the acting profile: honour the client-supplied id when it truly
  -- belongs to the caller in this business (the auth user may have several
  -- profiles); otherwise fall back to the default.
  if p_mitarbeiter_id is not null and exists (
       select 1 from public.mitarbeiter
       where id = p_mitarbeiter_id and auth_id = auth.uid()
         and betrieb_id = v_z.betrieb_id and status = 'aktiv') then
    v_ma := p_mitarbeiter_id;
  else
    v_ma := public.meine_mitarbeiter_id(v_z.betrieb_id);
  end if;

  if v_ma is null or v_ma <> v_z.mitarbeiter_id then
    raise exception 'Nur eigene Schichten koennen gemeldet werden';
  end if;
  if v_z.datum < current_date then
    raise exception 'Schicht liegt in der Vergangenheit';
  end if;
  if exists (
    select 1 from public.notfaelle
    where schicht_zuweisung_id = p_zuweisung_id and status <> 'storniert'
  ) then
    raise exception 'Fuer diese Schicht wurde bereits ein Notfall gemeldet';
  end if;

  update public.schicht_zuweisungen set attendet = false where id = p_zuweisung_id;

  insert into public.notfaelle
    (betrieb_id, schicht_zuweisung_id, schicht_instanz_id, rolle_id, melder_id)
  values
    (v_z.betrieb_id, p_zuweisung_id, v_z.schicht_instanz_id, v_z.rolle_id, v_ma)
  returning id into v_id;

  -- Der Grund landet in der getrennten Tabelle — und nur, wenn einer da
  -- ist. Eine Zeile mit leerem Grund waere ein Datensatz ohne Inhalt,
  -- der trotzdem unter Art. 9 faellt.
  v_grund := nullif(btrim(p_grund), '');
  if v_grund is not null then
    insert into public.notfall_gruende (notfall_id, betrieb_id, grund)
    values (v_id, v_z.betrieb_id, v_grund);
  end if;

  return v_id;
end;
$function$;

-- Erst jetzt die Spalte entfernen.
alter table public.notfaelle drop column grund;

-- ---------------------------------------------------------------------
-- Gegenproben im selben Lauf
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='notfaelle' and column_name='grund'
  ) then
    raise exception 'notfaelle.grund existiert noch';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='notfall_gruende'
       and policyname='notfall_gruende_select'
  ) then
    raise exception 'SELECT-Policy auf notfall_gruende fehlt';
  end if;

  -- Schreibrechte darf `authenticated` nicht haben.
  if has_table_privilege('authenticated', 'public.notfall_gruende', 'INSERT')
     or has_table_privilege('authenticated', 'public.notfall_gruende', 'UPDATE')
     or has_table_privilege('authenticated', 'public.notfall_gruende', 'DELETE') then
    raise exception 'authenticated darf notfall_gruende nicht beschreiben';
  end if;

  if has_table_privilege('anon', 'public.notfall_gruende', 'SELECT') then
    raise exception 'anon darf notfall_gruende nicht lesen';
  end if;
end;
$$;

commit;

-- =====================================================================
--  8. Patchvorschlag für die App (kein Schreibrecht in jenem Repo)
-- =====================================================================
--
--  Datei: `../QuickTeam App/src/app/(tabs)/manager.tsx`
--
--  VORHER (Zeile 165):
--
--    supabase.from("notfaelle")
--      .select("id, status, melder_id, schicht_instanz_id, rolle_id, grund, erstellt_am")
--
--  NACHHER:
--
--    supabase.from("notfaelle")
--      .select("id, status, melder_id, schicht_instanz_id, rolle_id, erstellt_am")
--
--  …und der Grund als zweite Abfrage, parallel zu den übrigen im selben
--  `Promise.all`:
--
--    supabase.from("notfall_gruende")
--      .select("notfall_id, grund")
--      .eq("betrieb_id", activeMitarbeiter.betrieb_id)
--
--  Zusammengeführt wird über `notfall_id`; `grund` bleibt wie bisher
--  `string | null` (Zeile 67), nur kommt der Wert jetzt aus einer Map
--  statt aus der Zeile:
--
--    const gruende = new Map(gruendeRows.map(g => [g.notfall_id, g.grund]));
--    …
--    grund: gruende.get(n.id) ?? null,     // statt n.grund ?? null
--
--  **Für andere Rollen ist das kein Sonderfall, sondern automatisch
--  richtig:** die Policy liefert einem gewöhnlichen Mitarbeiter schlicht
--  keine Zeile, die Map bleibt leer, und `grund` ist `null` — genau die
--  Anzeige, die `manager.tsx:796` ohnehin schon für „kein Grund
--  angegeben" hat. Es braucht keine Fallunterscheidung im UI.
--
--  Reihenfolge beim Ausrollen: **App zuerst**, dann diese Migration.
--  Andersherum bricht der Manager-Screen für die Dauer des Rollouts mit
--  einem 400er auf die unbekannte Spalte.
--
--  Ebenfalls in der App, unabhängig von der Datenbank:
--  `src/i18n/locales/de.json:447` schlägt als Platzhalter „Ich bin
--  krank." vor. Das fordert zu einer Gesundheitsangabe auf, die danach
--  niemand mehr braucht. Vorschlag in allen Sprachen: etwas Neutrales
--  ohne Beispiel, etwa „Kurze Begründung (keine Angaben zur
--  Gesundheit)". Das ist die wirksamere der beiden Massnahmen — sie
--  lässt die Daten gar nicht erst entstehen.
--
-- =====================================================================
--  9. Verhaltenstests in der Sandbox — mit JWT, nicht über die Oberfläche
-- =====================================================================
--
--  Aufbau: ein Betrieb X mit Chef, Melder M und unbeteiligtem
--  Mitarbeiter U; ein zweiter Betrieb Y mit eigenem Chef. M meldet einen
--  Notfall mit Grund.
--
--  | # | Wer | Aufruf | Erwartet |
--  |---|-----|--------|----------|
--  | 1 | M (Melder) | `GET /rest/v1/notfall_gruende?select=*` | 200, **1 Zeile** mit Grund |
--  | 2 | U (anderer Mitarbeiter) | dito | 200, **[]** |
--  | 3 | Chef X | dito | 200, **1 Zeile** |
--  | 4 | Chef Y (fremder Betrieb) | dito | 200, **[]** |
--  | 5 | `anon` (nur anon-Key) | dito | **401/403** |
--  | 6 | U | `GET /rest/v1/notfaelle?select=*` | 200, Zeile **ohne** `grund` |
--  | 7 | U | `GET /rest/v1/notfaelle?select=grund` | **400** (Spalte existiert nicht) |
--  | 8 | U | `GET /rest/v1/notfall_gruende?grund=like.*krank*` | 200, **[]** — Filtern ohne Leserecht liefert nichts |
--  | 9 | U | `POST /rest/v1/notfall_gruende` | **403** (kein INSERT-Recht) |
--  | 10 | U | `PATCH /rest/v1/notfall_gruende?notfall_id=eq.…` | **403** |
--  | 11 | M | `POST /rest/v1/rpc/notfall_melden` mit Grund | 200, Grund landet in der neuen Tabelle |
--  | 12 | M | dasselbe ohne Grund | 200, **keine** Zeile in `notfall_gruende` |
--  | 13 | Übernehmer | nach `notfall_vertretung_uebernehmen` | 200, **1 Zeile** |
--  | 14 | beliebig | Notfall löschen | Grundzeile verschwindet mit (`cascade`) |
--
--  Punkt 8 ist der, den man leicht vergisst: ein Filter auf eine Spalte
--  setzt in PostgreSQL SELECT auf ihr voraus. Unter RLS heisst das hier
--  nicht 403, sondern schlicht „keine Zeile passt" — und genau das ist
--  richtig, weil eine Fehlermeldung die Existenz verraten würde.
--
--  **Nicht in Produktion ausführen.** Wegwerfbetriebe in
--  `QT-Sandbox-Test`; nicht in „Test" (Fixtures), nie in Testbetrieb 12.
--
-- =====================================================================
--  10. Zurücknehmen
-- =====================================================================
--
--    alter table public.notfaelle add column grund text;
--    update public.notfaelle n set grund = g.grund
--      from public.notfall_gruende g where g.notfall_id = n.id;
--    -- `notfall_melden` auf die Fassung von vor dieser Migration
--    -- zurücksetzen (Quelltext im Git-Verlauf dieser Datei).
--    drop table public.notfall_gruende;
--
--  Der Rückweg verliert nichts — die Daten stehen bis zum `drop table`
--  vollständig in beiden Tabellen.
