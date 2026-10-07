-- =====================================================================
--  Angerechnete Urlaubstage: Spalte `urlaub.angerechnete_tage`
--  Am 2026-10-07 vom Nutzer angewiesen. Im SQL-Editor einzuspielen
--  (beide Teile in einem Lauf).
-- =====================================================================
--
--  Ein Antrag über zwei Kalenderwochen (14 Tage) belastet das Kontingent
--  bisher mit 14 Tagen — auch für jemanden, der am Wochenende nie
--  arbeitet. Der Chef trägt beim Genehmigen ein, wie viele der Tage als
--  Urlaub zählen (Vorbelegung: alle Kalendertage).
--
--      NULL  = alle Kalendertage von..bis zählen (bisheriges Verhalten)
--      n     = n Tage zählen, 0 <= n <= (bis - von) + 1
--
--  Jahresübergreifende Anträge: die angerechneten Tage werden **von vorne**
--  verteilt — zuerst auf das Jahr von `von`, höchstens so viele, wie der
--  Antrag dort Kalendertage hat, der Rest auf das Folgejahr (Web:
--  `angerechneteTageImJahr()` in `src/lib/dashboard/urlaub.ts`).
--
--  **Die Sperre bleibt der ganze Zeitraum.** Solver (`plan-generieren`),
--  `pruefe_zuweisung_regeln` (HC-1) und `schicht_zuweisung_warnungen`
--  prüfen `datum between von and bis` und lesen keine Tagezahl — an ihnen
--  ändert sich nichts. Wer 14 Tage beantragt und 10 angerechnet bekommt,
--  ist trotzdem alle 14 Tage nicht einplanbar.
--
--  Schreiben darf nur der Chef: `urlaub` hat als einzige Update-Policy
--  `urlaub_update_chef`, Mitarbeiter legen Zeilen nur über
--  `urlaub_beantragen` an (dort wird die Spalte nicht gesetzt).
--
--  Teil 2 ändert die **bestehende** RPC `urlaub_beantragen` (Signatur
--  gleich): einzige Änderung ist `coalesce(u.angerechnete_tage, …)` in
--  `v_verbraucht`.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Teil 1 — Spalte
-- ---------------------------------------------------------------------

alter table public.urlaub
  add column angerechnete_tage smallint
  constraint chk_urlaub_angerechnete_tage
    check (angerechnete_tage is null or angerechnete_tage between 0 and (bis - von) + 1);

comment on column public.urlaub.angerechnete_tage is
  'Tage dieses Antrags, die aufs Urlaubskontingent zaehlen; vom Chef beim Genehmigen gesetzt. NULL = alle Kalendertage von..bis. Aendert nichts an der Sperre: geplant wird im ganzen Zeitraum nicht. Angelegt 2026-10-07 (Web-Dashboard).';

-- ---------------------------------------------------------------------
--  Teil 2 — `urlaub_beantragen` zählt angerechnete Tage
-- ---------------------------------------------------------------------

create or replace function public.urlaub_beantragen(p_betrieb_id uuid, p_mitarbeiter_id uuid, p_von date, p_bis date, p_kommentar text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me         uuid;
  v_anspruch   int;
  v_verbraucht int;
  v_vorab      int;
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

  -- Angerechnete Tage (2026-10-07): vom Chef gesetzt, sonst alle
  -- Kalendertage. `von` liegt hier im laufenden Jahr, die angerechneten
  -- Tage fallen also zuerst in dieses Jahr — gekappt auf dessen Kalendertage.
  select coalesce(sum(
      least(
        coalesce(u.angerechnete_tage, (u.bis - u.von) + 1),
        (least(u.bis, make_date(extract(year from current_date)::int, 12, 31))
         - greatest(u.von, make_date(extract(year from current_date)::int, 1, 1))) + 1
      )
    ), 0) into v_verbraucht
  from public.urlaub u
  where u.mitarbeiter_id = v_me
    and u.status in ('approved', 'requested')
    and extract(year from u.von) = extract(year from current_date);

  -- Urlaub aus der Zeit vor QuickTeam (urlaub_vorab, 2026-10-04): zaehlt im
  -- Jahr seines Eintrags wie genehmigter Urlaub.
  select coalesce(sum(v.tage), 0) into v_vorab
  from public.urlaub_vorab v
  where v.mitarbeiter_id = v_me
    and v.jahr = extract(year from current_date)::int;

  v_neu := (p_bis - p_von) + 1;
  if v_vorab + v_verbraucht + v_neu > v_anspruch then
    raise exception 'URLAUB_KONTINGENT';
  end if;

  insert into public.urlaub (mitarbeiter_id, betrieb_id, von, bis, status, kommentar)
  values (v_me, p_betrieb_id, p_von, p_bis, 'requested', nullif(btrim(coalesce(p_kommentar,'')), ''))
  returning id into v_id;

  return v_id;
end;
$function$;
