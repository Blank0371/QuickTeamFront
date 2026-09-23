-- =====================================================================
--  Preference policies: every active position of an account counts
--  Directed by the user on 2026-09-23.
-- =====================================================================
--
--  `meine_mitarbeiter_id(betrieb_id)` ends in `limit 1` without
--  `order by`. An account with several active positions in the same
--  business (Testbetrieb 12, AndroidTestBusiness, AppleTestBusiness)
--  gets an arbitrary one of them back -- any write with a different
--  position fails with "new row violates row-level security policy".
--
--  The rule stays the same (you only write your own rows, the chef reads
--  the whole business); only the arbitrary pick goes.
--  `ist_meine_position()` is SECURITY DEFINER like `meine_mitarbeiter_id()`,
--  so it does not depend on RLS on `mitarbeiter`.
--  Roles unchanged (`public`, as before).
--
-- =====================================================================

begin;

create or replace function "public"."ist_meine_position"(
  p_mitarbeiter_id uuid,
  p_betrieb_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from "public"."mitarbeiter" m
    where m.id = p_mitarbeiter_id
      and m.betrieb_id = p_betrieb_id
      and m.auth_id = auth.uid()
      and m.status = 'aktiv'
  );
$$;

revoke all
  on function "public"."ist_meine_position"(uuid, uuid)
  from public;
grant execute
  on function "public"."ist_meine_position"(uuid, uuid)
  to authenticated;

-- Date-specific preferences -----------------------------------------

drop policy if exists "tagesvorlieben_write_selbst"
  on "public"."mitarbeiter_schicht_tagesvorlieben";
create policy "tagesvorlieben_write_selbst"
  on "public"."mitarbeiter_schicht_tagesvorlieben"
  for all
  using ("public"."ist_meine_position"(mitarbeiter_id, betrieb_id))
  with check ("public"."ist_meine_position"(mitarbeiter_id, betrieb_id));

drop policy if exists "tagesvorlieben_select"
  on "public"."mitarbeiter_schicht_tagesvorlieben";
create policy "tagesvorlieben_select"
  on "public"."mitarbeiter_schicht_tagesvorlieben"
  for select
  using (
    betrieb_id in (select "public"."meine_betriebe"())
    and (
      "public"."ist_chef"(betrieb_id)
      or "public"."ist_meine_position"(mitarbeiter_id, betrieb_id)
    )
  );

-- Recurring preferences ---------------------------------------------

drop policy if exists "vorlieben_insert_selbst"
  on "public"."mitarbeiter_schicht_vorlieben";
create policy "vorlieben_insert_selbst"
  on "public"."mitarbeiter_schicht_vorlieben"
  for insert
  with check ("public"."ist_meine_position"(mitarbeiter_id, betrieb_id));

drop policy if exists "vorlieben_update_selbst"
  on "public"."mitarbeiter_schicht_vorlieben";
create policy "vorlieben_update_selbst"
  on "public"."mitarbeiter_schicht_vorlieben"
  for update
  using ("public"."ist_meine_position"(mitarbeiter_id, betrieb_id))
  with check ("public"."ist_meine_position"(mitarbeiter_id, betrieb_id));

drop policy if exists "vorlieben_delete_selbst"
  on "public"."mitarbeiter_schicht_vorlieben";
create policy "vorlieben_delete_selbst"
  on "public"."mitarbeiter_schicht_vorlieben"
  for delete
  using ("public"."ist_meine_position"(mitarbeiter_id, betrieb_id));

drop policy if exists "vorlieben_select"
  on "public"."mitarbeiter_schicht_vorlieben";
create policy "vorlieben_select"
  on "public"."mitarbeiter_schicht_vorlieben"
  for select
  using (
    betrieb_id in (select "public"."meine_betriebe"())
    and (
      "public"."ist_chef"(betrieb_id)
      or "public"."ist_meine_position"(mitarbeiter_id, betrieb_id)
    )
  );

commit;
