-- =====================================================================
-- Codex-Audit Abschnitt A — Sicherheit und Berechtigungen
-- Entworfen 2026-09-11, korrigiert 2026-09-11 (Runde 2).
--
-- Gegen den am 2026-09-11 gelesenen Live-Stand von jqpfuotwsgnqihspsmmf
-- entworfen (pg_policies, pg_trigger, pg_constraint, pg_proc). Gegenproben
-- in docs/audit-a/befunde-2026-09-11.md.
--
-- Vorabprüfungen erledigt:
--   * mitarbeiter_id_betrieb_key          UNIQUE (id, betrieb_id)     — existiert
--   * schicht_instanzen_betrieb_id_id_key UNIQUE (betrieb_id, id)     — existiert
--   * benachrichtigungen                  UNIQUE (betrieb_id, id)     — fehlt, A4 legt an
-- A3 kann sich also auf beide vorhandenen UNIQUEs stützen.
--
-- ACHTUNG: A1, A5 und A6 ändern Verhalten, auf das die Expo-App heute
-- baut. Vor dem Anwenden mit dem App-Entwickler abstimmen — die
-- betroffenen Stellen stehen je Abschnitt dabei.
-- =====================================================================


-- ---------------------------------------------------------------------
-- A2  Spaltenschutz — Allowlist, und zwar in JEDEM Zweig
-- ---------------------------------------------------------------------
-- Zwei Fehler, nicht einer:
--
-- (a) Die Ursprungsfassung zählte im Schlussblock die GESCHÜTZTEN Spalten
--     einzeln auf. Jede später hinzugefügte Spalte war damit ungeschützt;
--     urlaubsanspruch_tage war genau so durchgerutscht.
--
-- (b) Der erste Korrekturentwurf behob nur (a). Die drei Sonderfälle
--     gaben weiterhin früh `return new` zurück und liefen an der
--     Allowlist vorbei — eine nicht aufgeführte Spalte liess sich im
--     selben UPDATE mitschicken und der Fix war ausgehebelt.
--
-- Jetzt: die Sonderfälle setzen nur noch die erlaubte Spaltenmenge und
-- fallen anschliessend durch dieselbe Prüfung wie alle anderen. Es gibt
-- genau einen Ausgang, und der prüft.
--
-- Die erlaubten Mengen sind aus den aufrufenden Funktionen abgelesen,
-- nicht geschätzt:
--   einladung_annehmen()    setzt auth_id, status
--   konto_merge_confirm()   setzt auth_id
--   konto_selbst_loeschen() setzt vorname, nachname, email, telefon,
--                                 auth_id, status, anonymisiert_am
create or replace function public.schuetze_mitarbeiter_spalten()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare
  v_erlaubt text[] := array['telefon'];
  v_alt     jsonb;
  v_neu     jsonb;
  v_spalte  text;
begin
    if auth.uid() is null then return new; end if;
    if ist_chef(new.betrieb_id) then return new; end if;

    -- Sonderfall 1: eigene Einladung annehmen (einladung_annehmen()).
    if  old.auth_id is null
    and new.auth_id = auth.uid()
    and old.status = 'eingeladen'
    and new.status = 'aktiv'
    and old.email is not null
    and lower(old.email) = lower(auth.jwt() ->> 'email')
    then
        v_erlaubt := array['telefon','auth_id','status'];

    -- Sonderfall 2: Kontozusammenführung, belegt durch einen soeben
    -- eingelösten konto_merge_token (konto_merge_confirm()).
    elsif old.auth_id is not null
    and new.auth_id = auth.uid()
    and exists (select 1 from public.konto_merge_token k
                 where k.quell_auth_id = old.auth_id
                   and k.ziel_auth_id  = auth.uid()
                   and k.verwendet_am is not null
                   and k.verwendet_am > now() - interval '5 minutes')
    then
        v_erlaubt := array['telefon','auth_id'];

    -- Sonderfall 3: Selbstlöschung der EIGENEN Anstellung
    -- (konto_selbst_loeschen()). Entzieht nur eigenen Zugang, kann also
    -- nicht zur Rechteausweitung dienen.
    elsif old.auth_id = auth.uid()
    and new.auth_id is null
    and new.status = 'inaktiv'
    and new.anonymisiert_am is not null
    and new.email is null
    then
        v_erlaubt := array['telefon','auth_id','status',
                           'anonymisiert_am','email','vorname','nachname'];
    end if;

    -- Der EINE Ausgang. Deny-by-default: was nicht ausdrücklich in
    -- v_erlaubt steht, darf sich nicht unterscheiden — unabhängig davon,
    -- welcher Zweig oben gegriffen hat.
    v_alt := to_jsonb(old);
    v_neu := to_jsonb(new);
    foreach v_spalte in array v_erlaubt loop
        v_alt := v_alt - v_spalte;
        v_neu := v_neu - v_spalte;
    end loop;

    if v_alt is distinct from v_neu then
        raise exception 'Nicht erlaubte Spaltenaenderung. Erlaubt in diesem Fall: %',
            array_to_string(v_erlaubt, ', ');
    end if;

    return new;
end;
$fn$;


-- ---------------------------------------------------------------------
-- A1  Anonyme Umfragen — Rohstimmen nicht mehr für alle lesbar
-- ---------------------------------------------------------------------
-- BRICHT die Stimmenzählung anonymer Umfragen in beiden Clients, bis sie
-- umfrage_ergebnis() benutzen:
--   Web: src/lib/dashboard/mitteilungen.ts:197
--   App: ../QuickTeam App/src/app/(tabs)/messages.tsx:313
-- Bei NICHT-anonymen Umfragen ändert sich nichts.
create or replace function public.umfrage_ergebnis(p_benachrichtigung_id uuid)
returns table (option_id uuid, anzahl bigint)
language sql security definer stable set search_path to 'public' as $fn$
  select o.id, count(s.id)
    from public.umfrage_optionen o
    left join public.umfrage_stimmen s on s.option_id = o.id
   where o.benachrichtigung_id = p_benachrichtigung_id
     and o.betrieb_id in (select public.meine_betriebe())
   group by o.id;
$fn$;
revoke all on function public.umfrage_ergebnis(uuid) from public;
grant execute on function public.umfrage_ergebnis(uuid) to authenticated;

drop policy if exists us_select on public.umfrage_stimmen;
create policy us_select on public.umfrage_stimmen for select using (
  betrieb_id in (select public.meine_betriebe())
  and (
    -- die eigene Stimme sieht man immer (Client zeigt "du hast abgestimmt")
    mitarbeiter_id = public.meine_mitarbeiter_id(betrieb_id)
    -- fremde Stimmen nur bei offener Umfrage
    or not coalesce((select b.anonym from public.benachrichtigungen b
                      where b.id = umfrage_stimmen.benachrichtigung_id), false)
  )
);


-- ---------------------------------------------------------------------
-- A3  Schichtnotizen — Betrieb, Schicht und Autor zusammen erzwingen
-- ---------------------------------------------------------------------
-- Bisher drei unabhängige Einzel-FKs: jeder für sich gültig, zusammen
-- betriebsübergreifend kombinierbar. Zusammengesetzte FKs erzwingen die
-- Übereinstimmung in der DB — also auch für service_role und den Solver,
-- was eine Policy nicht leisten würde.
alter table public.schicht_notizen
  drop constraint if exists schicht_notizen_schicht_instanz_id_fkey,
  drop constraint if exists schicht_notizen_mitarbeiter_id_fkey;

alter table public.schicht_notizen
  add constraint schicht_notizen_schicht_betrieb_fkey
    foreign key (betrieb_id, schicht_instanz_id)
    references public.schicht_instanzen (betrieb_id, id) on delete cascade,
  add constraint schicht_notizen_mitarbeiter_betrieb_fkey
    foreign key (mitarbeiter_id, betrieb_id)
    references public.mitarbeiter (id, betrieb_id) on delete cascade;


-- ---------------------------------------------------------------------
-- A4  Weitere betriebsübergreifende Verknüpfungen
-- ---------------------------------------------------------------------
-- Geprüft und bereits sauber (zusammengesetzte FKs vorhanden):
--   schicht_zuweisungen, mitarbeiter_rollen, urlaub, einladungen
-- umfrage_stimmen braucht nichts: die Tabelle hat überhaupt keine
-- INSERT/UPDATE/DELETE-Policy, geschrieben wird nur über abstimmen().
-- Offen und hier geschlossen: umfrage_optionen und nachricht_anhaenge
-- hängen per Einzel-FK an benachrichtigungen(id) ohne Betriebsbezug.
alter table public.benachrichtigungen
  add constraint benachrichtigungen_betrieb_id_id_key unique (betrieb_id, id);

alter table public.umfrage_optionen
  drop constraint if exists umfrage_optionen_benachrichtigung_id_fkey;
alter table public.umfrage_optionen
  add constraint umfrage_optionen_benachrichtigung_betrieb_fkey
    foreign key (betrieb_id, benachrichtigung_id)
    references public.benachrichtigungen (betrieb_id, id) on delete cascade;

alter table public.nachricht_anhaenge
  drop constraint if exists nachricht_anhaenge_benachrichtigung_id_fkey;
alter table public.nachricht_anhaenge
  add constraint nachricht_anhaenge_benachrichtigung_betrieb_fkey
    foreign key (betrieb_id, benachrichtigung_id)
    references public.benachrichtigungen (betrieb_id, id) on delete cascade;


-- ---------------------------------------------------------------------
-- A5  Urlaub — fachliche Regeln auf jedem Schreibweg
-- ---------------------------------------------------------------------
-- Entscheidung der Betreiberin vom 2026-09-11: Mitarbeiter dürfen eigene
-- Anträge NIE selbst löschen oder stornieren, unabhängig vom Status.
-- Nur die Betriebsleitung storniert.
--
-- BRICHT in der Expo-App jeden Knopf, der einen eigenen Urlaubsantrag
-- zurückzieht (scheduling.tsx, Tab "Vacation") — dort muss die Aktion
-- entfernt oder auf eine Chef-Anfrage umgestellt werden.
--
-- Einreichen läuft danach ausschliesslich über urlaub_beantragen(), das
-- Datum, kollidierende Schichten, veröffentlichte Zyklen und Kontingent
-- prüft. Ohne INSERT-Policy gibt es keinen zweiten Weg mehr daran vorbei.
drop policy if exists urlaub_insert_selbst on public.urlaub;
drop policy if exists urlaub_delete_selbst_or_chef on public.urlaub;

create policy urlaub_delete_chef on public.urlaub
  for delete using (public.ist_chef(betrieb_id));
-- UPDATE bleibt wie gehabt allein bei urlaub_update_chef.
-- SELECT bleibt unverändert (urlaub_select).


-- ---------------------------------------------------------------------
-- A6  Schutz des letzten aktiven Chefs — Trigger tatsächlich binden
-- ---------------------------------------------------------------------
-- Die Funktion existierte, war aber an keine Tabelle gebunden (am
-- 2026-09-11 in pg_trigger bestätigt: auf mitarbeiter lag nur
-- trg_mitarbeiter_spaltenschutz).
--
-- Zwei Ergänzungen gegenüber der vorhandenen Fassung:
--   * anonymisiert_am zählt als Verlust — sonst wäre
--     mitarbeiter_anonymisieren() der Weg daran vorbei.
--   * Beim Löschen eines ganzen Betriebs kaskadiert
--     mitarbeiter_betrieb_fkey (ON DELETE CASCADE) auf mitarbeiter. Ohne
--     die Ausnahme unten würde der Trigger genau den gewollten
--     Betriebsschliessungsprozess blockieren, den das Audit offen halten
--     will. Während der Kaskade ist die betriebe-Zeile bereits weg —
--     daran wird der Fall erkannt.
create or replace function public.pruefe_letzter_chef()
returns trigger language plpgsql set search_path to 'public' as $fn$
begin
  if tg_op = 'DELETE' then
    -- Betrieb wird selbst gelöscht: Kaskade nicht blockieren
    if not exists (select 1 from public.betriebe where id = old.betrieb_id) then
      return old;
    end if;
    if old.rolle_typ = 'chef' and old.status = 'aktiv' and not exists (
      select 1 from public.mitarbeiter
       where betrieb_id = old.betrieb_id and id <> old.id
         and rolle_typ = 'chef' and status = 'aktiv') then
      raise exception 'Der letzte aktive Chef eines Betriebs kann nicht geloescht werden';
    end if;
    return old;
  end if;

  if old.rolle_typ = 'chef' and old.status = 'aktiv'
     and (new.rolle_typ <> 'chef' or new.status <> 'aktiv'
          or new.anonymisiert_am is not null) then
    if not exists (
      select 1 from public.mitarbeiter
       where betrieb_id = old.betrieb_id and id <> old.id
         and rolle_typ = 'chef' and status = 'aktiv') then
      raise exception 'Der letzte aktive Chef eines Betriebs kann nicht degradiert, deaktiviert oder anonymisiert werden';
    end if;
  end if;
  return new;
end;
$fn$;

-- BEFORE, nicht AFTER: die Prüfung muss die Änderung verhindern, nicht
-- nachträglich feststellen.
drop trigger if exists trg_letzter_chef on public.mitarbeiter;
create trigger trg_letzter_chef
  before update or delete on public.mitarbeiter
  for each row execute function public.pruefe_letzter_chef();


-- ---------------------------------------------------------------------
-- A7  Einladungseinlösung — atomarer Verbrauch (nur die DB-Hälfte)
-- ---------------------------------------------------------------------
-- Bisher: SELECT ohne Sperre, dann UPDATE ohne Bedingung. Zwei
-- gleichzeitige Aufrufer lesen beide auth_id = null, kommen beide an der
-- "bereits eingelöst"-Prüfung vorbei, der zweite überschreibt den ersten.
-- Ausnutzbar, weil eine Zeile über E-Mail ODER Telefon matchen kann
-- (v_email_ok or v_phone_ok), also von zwei verschiedenen Konten
-- beansprucht werden kann.
--
-- Jetzt: ein einziges UPDATE ... WHERE auth_id IS NULL RETURNING. Genau
-- ein Aufrufer bekommt eine Zeile zurück; der zweite bekommt keine und
-- scheitert definiert.
--
-- DAS SCHLIESST PUNKT 7 NICHT VOLLSTÄNDIG. Die Edge Function
-- `einladung-einloesen` mintet die Session VOR dem Verbrauch und prüft
-- das Ergebnis ihres eigenen Guards nicht. Ihr Quellcode liegt in keinem
-- der beiden Checkouts und ist von hier aus nicht deploybar. Siehe
-- befunde-2026-09-11.md, Punkt 7, und den Folgeauftrag darin.
create or replace function public.einladung_annehmen(p_mitarbeiter_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_betrieb_id uuid;
  v_email text; v_telefon text; v_auth_id uuid;
  v_jwt_email text := auth.jwt() ->> 'email';
  v_jwt_phone text := regexp_replace(coalesce(auth.jwt() ->> 'phone',''), '[^0-9]', '', 'g');
  v_email_ok boolean; v_phone_ok boolean;
begin
  if auth.uid() is null then raise exception 'Nicht authentifiziert'; end if;

  select betrieb_id, email, telefon, auth_id
    into v_betrieb_id, v_email, v_telefon, v_auth_id
    from public.mitarbeiter
   where id = p_mitarbeiter_id and anonymisiert_am is null;

  v_email_ok := v_email is not null and v_jwt_email is not null
            and lower(v_email) = lower(v_jwt_email);
  v_phone_ok := v_telefon is not null and length(v_jwt_phone) >= 6
            and regexp_replace(v_telefon, '[^0-9]', '', 'g') = v_jwt_phone;

  if v_betrieb_id is null or not (v_email_ok or v_phone_ok) then
    raise exception 'Einladung nicht gefunden oder bereits eingelöst';
  end if;

  -- schon mir zugeordnet: idempotenter Erfolg
  if v_auth_id = auth.uid() then return v_betrieb_id; end if;

  -- Atomarer Verbrauch. Nur wer die Zeile von null auf sich dreht, gewinnt.
  update public.mitarbeiter
     set auth_id = auth.uid(), status = 'aktiv'
   where id = p_mitarbeiter_id
     and auth_id is null
  returning betrieb_id into v_betrieb_id;

  if v_betrieb_id is null then
    raise exception 'Einladung bereits eingelöst';
  end if;

  return v_betrieb_id;
end;
$fn$;


-- ---------------------------------------------------------------------
-- A8  Unnötige Ausführungsrechte entziehen
-- ---------------------------------------------------------------------
-- Beide sind Triggerfunktionen und für einen Direktaufruf nicht gedacht.
-- urlaub_benachrichtigen() hat als einzige ihrer Art EXECUTE für PUBLIC
-- und anon; rls_auto_enable() ist eine Event-Trigger-Funktion, deren
-- Direktaufruf ohnehin scheitert. Alle übrigen Triggerfunktionen stehen
-- auf postgres/service_role.
revoke all on function public.urlaub_benachrichtigen() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
