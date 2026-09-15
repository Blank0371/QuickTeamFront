begin;
do $test$
declare n record; person record; visible_count integer; expected integer; hold_id bigint; deadline date; tested integer:=0; colleague uuid:=gen_random_uuid();
begin
 select * into strict n from public.notfaelle limit 1;
 insert into public.notfall_gruende(notfall_id,betrieb_id,grund) values(n.id,n.betrieb_id,'AUTOMATED PRIVACY TEST - ROLLED BACK');
 for person in select distinct m.auth_id, (exists(select 1 from public.mitarbeiter x where x.auth_id=m.auth_id and x.betrieb_id=n.betrieb_id and x.status='aktiv' and (x.rolle_typ='chef' or x.id=n.melder_id))) allowed
 from public.mitarbeiter m where m.betrieb_id=n.betrieb_id and m.status='aktiv' and m.auth_id is not null
 loop
   perform set_config('request.jwt.claim.sub',person.auth_id::text,true);
   perform set_config('role','authenticated',true);
   select count(*) into visible_count from public.notfall_gruende where notfall_id=n.id;
   if visible_count <> (case when person.allowed then 1 else 0 end) then raise exception 'RLS role mismatch'; end if;
   if exists(select 1 from public.notfaelle where id=n.id and grund is not null) then raise exception 'Legacy leak'; end if;
   perform set_config('role','postgres',true);
   tested:=tested+1;
 end loop;
 if tested<1 then raise exception 'Insufficient role fixtures'; end if;
 insert into auth.users(id) values(colleague);
 insert into public.mitarbeiter(betrieb_id,auth_id,vorname,nachname,status,rolle_typ) values(n.betrieb_id,colleague,'Privacy','Rollback-Test','aktiv','mitarbeiter');
 perform set_config('request.jwt.claim.sub',colleague::text,true);
 perform set_config('role','authenticated',true);
 select count(*) into visible_count from public.notfall_gruende where notfall_id=n.id;
 if visible_count<>0 then raise exception 'Same-business colleague leak'; end if;
 perform set_config('role','postgres',true);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 perform set_config('role','authenticated',true);
 select count(*) into visible_count from public.notfall_gruende;
 if visible_count<>0 then raise exception 'Foreign user leak'; end if;
 perform set_config('role','postgres',true);
 if has_table_privilege('anon','public.notfall_gruende','SELECT') or has_table_privilege('authenticated','public.notfall_gruende','INSERT') then raise exception 'Unexpected grants'; end if;
 hold_id:=private.export_sperre_beginnen(n.betrieb_id,'AUTOMATED TEST - ROLLED BACK');
 if not exists(select 1 from private.loeschsperre where id=hold_id and bis='infinity'::date) then raise exception 'Open hold expires'; end if;
 deadline:=private.export_sperre_abschliessen(hold_id,current_date-1,current_date);
 if deadline<current_date+30 then raise exception 'Retrieval period too short'; end if;
 if private.export_sperre_abschliessen(hold_id,current_date-20,null)<deadline then raise exception 'Repeat shortens hold'; end if;
end $test$;
select 'PASS: existing reporter/manager, synthetic same-business colleague, foreign user, grants, legacy NULL, indefinite hold, >=30 days, no shortening' as result;
rollback;
