-- Privacy safeguards. Legacy notfaelle.grund remains NULL for old clients.
-- Notfall reasons are only readable by the reporter and active managers.
lock table public.notfaelle in share row exclusive mode;
create table public.notfall_gruende (
  notfall_id uuid primary key references public.notfaelle(id) on delete cascade,
  betrieb_id uuid not null references public.betriebe(id) on delete cascade,
  grund text not null,
  erstellt_am timestamptz not null default now()
);
create index idx_notfall_gruende_betrieb on public.notfall_gruende(betrieb_id);
alter table public.notfall_gruende enable row level security;
revoke all on public.notfall_gruende from public, anon, authenticated;
grant select on public.notfall_gruende to authenticated;
grant all on public.notfall_gruende to service_role;
create policy notfall_gruende_select on public.notfall_gruende
for select to authenticated using (
  betrieb_id in (select public.meine_betriebe()) and (
    public.ist_chef(betrieb_id) or exists (
      select 1 from public.notfaelle n join public.mitarbeiter m on m.id=n.melder_id
      where n.id=notfall_gruende.notfall_id and n.betrieb_id=notfall_gruende.betrieb_id
        and m.auth_id=(select auth.uid()) and m.status='aktiv'
    )
  )
);
insert into public.notfall_gruende(notfall_id,betrieb_id,grund,erstellt_am)
select id,betrieb_id,grund,erstellt_am from public.notfaelle where grund is not null;
do $check$ begin
  if exists(select 1 from public.notfaelle n where n.grund is not null and not exists(
    select 1 from public.notfall_gruende g where g.notfall_id=n.id and g.grund=n.grund
  )) then raise exception 'Notfallgrund migration incomplete'; end if;
end $check$;
update public.notfaelle set grund=null where grund is not null;
alter table public.notfaelle add constraint notfaelle_grund_nur_legacy_null check(grund is null);
comment on column public.notfaelle.grund is 'Compatibility field: always NULL. Protected reasons are in notfall_gruende.';
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
revoke all on function public.notfall_melden(uuid,text,uuid) from public,anon;
grant execute on function public.notfall_melden(uuid,text,uuid) to authenticated;

-- Operator-only workflow: open requests cannot silently expire.
create function private.export_sperre_beginnen(p_betrieb_id uuid,p_referenz text)
returns bigint language plpgsql security invoker set search_path='' as $fn$
declare v_id bigint;
begin
  if nullif(btrim(p_referenz),'') is null then raise exception 'Vorgangsreferenz fehlt'; end if;
  perform 1 from public.betriebe where id=p_betrieb_id for update;
  if not found then raise exception 'Betrieb nicht vorhanden'; end if;
  insert into private.loeschsperre(betrieb_id,bis,grund)
  values(p_betrieb_id,'infinity'::date,'Export/Wechsel: '||p_referenz) returning id into v_id;
  return v_id;
end $fn$;
create function private.export_sperre_abschliessen(p_sperre_id bigint,p_bereitgestellt_am date,p_uebergangsende date default null)
returns date language plpgsql security invoker set search_path='' as $fn$
declare v_bis date; v_betrieb uuid;
begin
  if p_bereitgestellt_am is null or p_bereitgestellt_am>current_date or p_uebergangsende>current_date then
    raise exception 'Vollstaendige Bereitstellung und Uebergangsende muessen erfolgt sein';
  end if;
  select betrieb_id into v_betrieb from private.loeschsperre where id=p_sperre_id;
  perform 1 from public.betriebe where id=v_betrieb for update;
  if not found then raise exception 'Betrieb oder Sperre nicht vorhanden'; end if;
  v_bis:=greatest(current_date,p_bereitgestellt_am,coalesce(p_uebergangsende,p_bereitgestellt_am))+30;
  update private.loeschsperre set bis=case when bis='infinity'::date then v_bis else greatest(bis,v_bis) end
    where id=p_sperre_id and grund like 'Export/Wechsel: %' returning bis into v_bis;
  if not found then raise exception 'Keine Export-/Wechselsperre'; end if;
  return v_bis;
end $fn$;
revoke all on function private.export_sperre_beginnen(uuid,text) from public,anon,authenticated;
revoke all on function private.export_sperre_abschliessen(bigint,date,date) from public,anon,authenticated;
alter table private.loeschsperre enable row level security;
notify pgrst,'reload schema';
