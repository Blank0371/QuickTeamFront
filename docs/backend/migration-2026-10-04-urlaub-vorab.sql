-- =====================================================================
--  Vor QuickTeam genommener Urlaub: Tabelle `urlaub_vorab`
--  Am 2026-10-04 vom Nutzer angewiesen. Eingespielt als Migrationen
--  `urlaub_vorab_tabelle` und `urlaub_beantragen_mit_vorab`.
-- =====================================================================
--
--  Wer mitten im Jahr auf QuickTeam umstellt, hat Leute, die dieses Jahr
--  schon Urlaub hatten. Eine Zeile je Person und Jahr trägt diese Tage.
--
--  „Genommen" wird überall **berechnet**, nicht mitgeführt:
--
--      genommen = urlaub_vorab.tage (dieses Jahr)
--               + Tage offener und genehmigter `urlaub`-Zeilen (dieses Jahr)
--
--  Ein Antrag zählt ab dem Absenden, Ablehnen nimmt ihn heraus, Genehmigen
--  ändert nichts. Zeilen anderer Jahre zählen nicht und werden **nicht**
--  gelöscht — das Jahr in der Zeile genügt, und der Wert bleibt als
--  Nachweis lesbar.
--
--  Vorgeschichte am selben Tag: zwei Spalten an `mitarbeiter`
--  (`urlaub_bereits_genommen_tage`, `urlaub_bereits_genommen_jahr`,
--  Migrationen `urlaub_bereits_genommen`, `urlaub_bereits_genommen_jahr`).
--  Ihr einziger Wert wurde unten übernommen, die Spalten sind entfernt.
--
--  Teil 2 ändert die **bestehende** RPC `urlaub_beantragen`: einzige
--  Änderung ist `v_vorab` in der Kontingentprüfung. Solver
--  (`plan-generieren`), `pruefe_zuweisung_regeln` und
--  `schicht_zuweisung_warnungen` lesen nur genehmigte Urlaubsdaten, nie das
--  Kontingent — dort ist nichts zu ergänzen.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Teil 1 — `urlaub_vorab_tabelle`
-- ---------------------------------------------------------------------

create table public.urlaub_vorab (
  betrieb_id     uuid     not null references public.betriebe(id) on delete cascade,
  mitarbeiter_id uuid     not null,
  jahr           smallint not null constraint chk_urlaub_vorab_jahr check (jahr between 2000 and 2100),
  tage           smallint not null constraint chk_urlaub_vorab_tage check (tage between 0 and 365),
  geaendert_am   timestamptz not null default now(),
  primary key (mitarbeiter_id, jahr),
  constraint urlaub_vorab_mitarbeiter_fk foreign key (mitarbeiter_id, betrieb_id)
    references public.mitarbeiter(id, betrieb_id) on delete cascade
);

create index urlaub_vorab_betrieb_jahr_idx on public.urlaub_vorab (betrieb_id, jahr);

comment on table public.urlaub_vorab is
  'Urlaubstage, die eine Person in einem Jahr ausserhalb von QuickTeam schon genommen hat. Wird ueberall dort addiert, wo Urlaub gezaehlt wird (urlaub_beantragen, Web-Dashboard). Zeilen anderer Jahre zaehlen nicht und werden nicht geloescht. Angelegt 2026-10-04 (Web-Dashboard).';

alter table public.urlaub_vorab enable row level security;

revoke all on public.urlaub_vorab from anon;
revoke all on public.urlaub_vorab from authenticated;
grant select, insert, update, delete on public.urlaub_vorab to authenticated;

create policy urlaub_vorab_select on public.urlaub_vorab
  for select to authenticated
  using (betrieb_id in (select public.meine_betriebe())
         and (public.ist_chef(betrieb_id) or public.ist_meine_position(mitarbeiter_id, betrieb_id)));

create policy urlaub_vorab_write_chef on public.urlaub_vorab
  for all to authenticated
  using (public.ist_chef(betrieb_id))
  with check (public.ist_chef(betrieb_id));

-- Bestand aus den Spalten vom selben Tag uebernehmen, dann die Spalten entfernen.
insert into public.urlaub_vorab (betrieb_id, mitarbeiter_id, jahr, tage)
select betrieb_id, id, urlaub_bereits_genommen_jahr, urlaub_bereits_genommen_tage
  from public.mitarbeiter
 where urlaub_bereits_genommen_tage > 0 and urlaub_bereits_genommen_jahr is not null;

alter table public.mitarbeiter drop column urlaub_bereits_genommen_tage;
alter table public.mitarbeiter drop column urlaub_bereits_genommen_jahr;

-- ---------------------------------------------------------------------
--  Teil 2 — `urlaub_beantragen_mit_vorab`
--  Unverändert bis auf `v_vorab` (markiert).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.urlaub_beantragen(p_betrieb_id uuid, p_mitarbeiter_id uuid, p_von date, p_bis date, p_kommentar text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me         uuid;
  v_anspruch   int;
  v_verbraucht int;
  v_vorab      int;   -- neu
  v_neu        int;
  v_id         uuid;
begin
  -- authorize: the seat must be an active mitarbeiter owned by the caller
  select id into v_me from public.mitarbeiter
  where id = p_mitarbeiter_id
    and betrieb_id = p_betrieb_id
    and auth_id = auth.uid()
    and status = 'aktiv';
  if v_me is null then
    raise exception 'Kein gueltiger Mitarbeiter fuer diesen Betrieb' using errcode = '42501';
  end if;

  if p_von is null or p_bis is null or p_bis < p_von or p_von < current_date then
    raise exception 'URLAUB_DATUM';
  end if;

  if exists (
    select 1 from public.schicht_zuweisungen z
    join public.schicht_instanzen i on i.id = z.schicht_instanz_id
    where z.mitarbeiter_id = v_me and i.datum between p_von and p_bis
  ) then
    raise exception 'URLAUB_SCHICHTEN';
  end if;

  if exists (
    select 1 from public.planungszyklen z
    where z.betrieb_id = p_betrieb_id and z.status = 'veroeffentlicht'
      and p_von <= z.zeitraum_ende and p_bis >= z.zeitraum_start
  ) then
    raise exception 'URLAUB_GEPLANT';
  end if;

  select coalesce(urlaubsanspruch_tage, 0) into v_anspruch
  from public.mitarbeiter where id = v_me;

  select coalesce(sum(
      (least(u.bis, make_date(extract(year from current_date)::int, 12, 31))
       - greatest(u.von, make_date(extract(year from current_date)::int, 1, 1))) + 1
    ), 0) into v_verbraucht
  from public.urlaub u
  where u.mitarbeiter_id = v_me
    and u.status in ('approved', 'requested')
    and extract(year from u.von) = extract(year from current_date);

  -- neu: Urlaub aus der Zeit vor QuickTeam (urlaub_vorab, 2026-10-04)
  select coalesce(sum(v.tage), 0) into v_vorab
  from public.urlaub_vorab v
  where v.mitarbeiter_id = v_me
    and v.jahr = extract(year from current_date)::int;

  v_neu := (p_bis - p_von) + 1;
  if v_vorab + v_verbraucht + v_neu > v_anspruch then   -- neu: v_vorab
    raise exception 'URLAUB_KONTINGENT';
  end if;

  insert into public.urlaub (mitarbeiter_id, betrieb_id, von, bis, status, kommentar)
  values (v_me, p_betrieb_id, p_von, p_bis, 'requested', nullif(btrim(coalesce(p_kommentar,'')), ''))
  returning id into v_id;

  return v_id;
end;
$function$;
