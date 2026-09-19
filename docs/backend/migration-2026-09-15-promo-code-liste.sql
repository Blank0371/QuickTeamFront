-- =====================================================================
--  Liste zugelassener Promo-Codes
--  Am 2026-09-15 vom Nutzer angewiesen. Baut auf
--  `migration-2026-09-15-promo-code.sql` auf.
-- =====================================================================
--
--  WAS SICH ÄNDERT
--
--  Bisher wurde jeder formal gültige Code gespeichert; ein Vertipper
--  landete als eigener „Partner" in der Auswertung. Ab jetzt:
--
--    * `promo_codes` hält die zugelassenen Codes samt Partner.
--      Gepflegt vom Betreiber im Supabase-Dashboard / SQL-Editor.
--    * `betrieb_promo_codes.promo_code` ist Fremdschlüssel darauf —
--      die Datenbank selbst lehnt unbekannte Codes ab, egal über
--      welchen Weg geschrieben wird.
--    * `promo_code_gueltig(text)` beantwortet der Registrierung die
--      Frage „gibt es diesen Code, und ist er aktiv?" — mit Ja/Nein,
--      ohne die Liste herauszugeben.
--    * Die INSERT-Policy verlangt zusätzlich einen **aktiven** Code:
--      wird einer zwischen Registrierung und Bestätigung abgeschaltet,
--      entsteht keine Zeile (die Einrichtung läuft trotzdem weiter).
--
--  WARUM EINE SECURITY-DEFINER-FUNKTION
--
--  Bei der Registrierung gibt es noch keine Session — der Aufruf kommt
--  als `anon`. Die Liste für `anon` lesbar zu machen hiesse, sie jedem
--  herauszugeben (`GET /rest/v1/promo_codes`). Die Funktion liefert
--  nur ein Boolean für genau einen Code. Erraten liesse sich ein Code
--  damit weiterhin — solange an einem Code kein Rabatt hängt, ist das
--  folgenlos.
--
--  Dieselbe Funktion steht in der INSERT-Policy, und dort ist sie
--  nicht Bequemlichkeit, sondern nötig: ein `exists (select … from
--  promo_codes)` in der Policy liefe mit den Rechten des Aufrufers, der
--  die Tabelle nicht lesen darf. Der Fremdschlüssel braucht das nicht —
--  RI-Prüfungen umgehen RLS und laufen mit den Rechten des Eigentümers.
--
-- =====================================================================

begin;

create table public.promo_codes (
  -- Dieselbe Form wie `betrieb_promo_codes.promo_code` — die Web-
  -- Registrierung normalisiert, der CHECK hält es fest.
  code        text primary key
    check (code ~ '^[A-Z0-9_-]{1,40}$'),
  -- Wer den Code verteilt. Pflicht: ohne Partner ist die Auswertung
  -- „wer hat wie viele Betriebe gebracht" nicht beantwortbar.
  partner     text not null
    check (length(btrim(partner)) > 0),
  -- Abschalten statt löschen: ein benutzter Code ist über den
  -- Fremdschlüssel ohnehin nicht löschbar.
  aktiv       boolean not null default true,
  erstellt_am timestamptz not null default now()
);

comment on table public.promo_codes is
  'Zugelassene Promo-Codes je Partner. Gepflegt vom Betreiber. '
  'Fuer Clients nicht lesbar; die Registrierung fragt ueber promo_code_gueltig().';

alter table public.promo_codes enable row level security;

-- Keine Policy, kein Grant: weder `anon` noch `authenticated` sehen die
-- Liste. Gepflegt wird über das Dashboard (postgres / service_role).
revoke all on public.promo_codes from anon, authenticated;

-- Bestand übernehmen, damit der Fremdschlüssel angelegt werden kann.
-- Am 2026-09-15 ist `betrieb_promo_codes` leer; die Zeile steht für den
-- Fall da, dass diese Datei später gegen einen Stand mit Daten läuft.
insert into public.promo_codes (code, partner)
select distinct promo_code, 'unbekannt (vor Einführung der Liste)'
  from public.betrieb_promo_codes
on conflict (code) do nothing;

-- `on update cascade`: ein umbenannter Code nimmt seine Nutzungen mit.
-- `on delete restrict`: ein benutzter Code verschwindet nicht samt
-- Zuordnung — abschalten (`aktiv = false`) ist der vorgesehene Weg.
alter table public.betrieb_promo_codes
  add constraint betrieb_promo_codes_promo_code_fkey
  foreign key (promo_code) references public.promo_codes(code)
  on update cascade on delete restrict;

create function public.promo_code_gueltig(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.promo_codes
     where code = p_code and aktiv
  );
$$;

comment on function public.promo_code_gueltig(text) is
  'Ja/Nein: gibt es diesen Promo-Code, und ist er aktiv? Gibt die Liste nicht heraus.';

-- Supabase vergibt EXECUTE per Default an PUBLIC — hier ausdrücklich.
revoke all on function public.promo_code_gueltig(text) from public;
grant execute on function public.promo_code_gueltig(text) to anon, authenticated;

-- Die INSERT-Policy aus der ersten Migration, ergänzt um den aktiven Code.
drop policy promo_code_insert_chef on public.betrieb_promo_codes;
create policy promo_code_insert_chef on public.betrieb_promo_codes
  for insert to authenticated
  with check (
    public.ist_chef(betrieb_id)
    and public.promo_code_gueltig(promo_code)
  );

-- ---------------------------------------------------------------------
-- Gegenproben im selben Lauf
-- ---------------------------------------------------------------------
do $$
begin
  if has_table_privilege('anon', 'public.promo_codes', 'SELECT')
     or has_table_privilege('authenticated', 'public.promo_codes', 'SELECT') then
    raise exception 'promo_codes darf fuer Clients nicht lesbar sein';
  end if;

  if not has_function_privilege('anon', 'public.promo_code_gueltig(text)', 'EXECUTE') then
    raise exception 'anon muss promo_code_gueltig aufrufen duerfen';
  end if;

  if public.promo_code_gueltig('GIBT_ES_NICHT_' || md5(random()::text)) then
    raise exception 'promo_code_gueltig meldet einen unbekannten Code als gueltig';
  end if;
end;
$$;

commit;

-- =====================================================================
--  Pflege (Betreiber, SQL-Editor)
-- =====================================================================
--
--    -- neuen Code anlegen (Grossbuchstaben, Ziffern, - und _). `email`
--    -- ist seit `migration-2026-09-15-promo-code-email.sql` Pflicht.
--    insert into public.promo_codes (code, partner, email)
--    values ('PARTNER10', 'Name des Partners', 'partner@example.com');
--
--    -- abschalten
--    update public.promo_codes set aktiv = false where code = 'PARTNER10';
--
--    -- Auswertung je Partner
--    select p.partner, p.code, count(b.betrieb_id) as betriebe
--      from public.promo_codes p
--      left join public.betrieb_promo_codes b on b.promo_code = p.code
--     group by p.partner, p.code
--     order by betriebe desc;
--
-- =====================================================================
--  Zurücknehmen
-- =====================================================================
--
--    drop policy promo_code_insert_chef on public.betrieb_promo_codes;
--    create policy promo_code_insert_chef on public.betrieb_promo_codes
--      for insert to authenticated with check (public.ist_chef(betrieb_id));
--    alter table public.betrieb_promo_codes
--      drop constraint betrieb_promo_codes_promo_code_fkey;
--    drop function public.promo_code_gueltig(text);
--    drop table public.promo_codes;
--
--  Die Web-Registrierung behandelt einen Fehler der Prüf-RPC als
--  „nicht prüfbar" und lässt den Code durch — sie bricht dadurch nicht.
-- =====================================================================
