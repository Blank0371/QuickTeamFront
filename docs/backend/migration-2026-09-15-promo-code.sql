-- =====================================================================
--  Promo-Code bei der Registrierung
--  Am 2026-09-15 vom Nutzer angewiesen. Additiv: eine neue Tabelle,
--  an keiner bestehenden Tabelle, Policy oder Funktion wird etwas
--  geändert.
-- =====================================================================
--
--  ZWECK
--
--  Wer QuickTeam für uns bewirbt, gibt einen Promo-Code weiter. Trägt
--  ein Betrieb ihn bei der Registrierung ein, steht hier, welcher
--  Betrieb welchen Code benutzt hat und wann. Mehr nicht: kein
--  Rabatt, keine Prüfung gegen eine Liste gültiger Codes — gespeichert
--  wird, was eingegeben wurde, in kanonischer Schreibweise.
--
--  NACHTRAG: die Liste kam noch am selben Tag dazu, siehe
--  `migration-2026-09-15-promo-code-liste.sql`. Die INSERT-Policy
--  unten ist dort ersetzt worden.
--
--  NAMEN
--
--  Angefragt waren `business_id`, `PROMO_CODE`, `created_at`. Die
--  Spalten heissen nach der Konvention der geteilten Datenbank
--  `betrieb_id` und `erstellt_am` (so in `notfall_gruende`,
--  `plan_aenderungen`, `rechtliche_zustimmungen` …); `promo_code` in
--  Kleinbuchstaben, weil PostgreSQL unquotierte Namen ohnehin faltet
--  und ein gequotetes `"PROMO_CODE"` in jeder Abfrage Anführungszeichen
--  verlangen würde.
--
--  EIN CODE JE BETRIEB
--
--  `betrieb_id` ist Primärschlüssel, wie bei `betrieb_abonnements`. Ein
--  Betrieb registriert sich einmal; ein zweimal eingegebener
--  Bestätigungscode soll keine zweite Zeile erzeugen. Der Schreibweg
--  ist dadurch idempotent (`ignoreDuplicates`), und der erste Eintrag
--  gewinnt.
--
--  LÖSCHUNG
--
--  `on delete cascade`, und das ist keine Geschmacksfrage:
--  `private.betrieb_endgueltig_loeschen()` löscht zuletzt
--  `public.betriebe` und verlässt sich darauf, dass alles Übrige
--  kaskadiert. Ein `restrict` hier liesse den Löschjob scheitern.
--  Folge: nach der Löschung eines Betriebs ist auch seine Zuordnung
--  weg. Wer Partner-Abrechnungen braucht, zählt vorher.
--
-- =====================================================================

begin;

create table public.betrieb_promo_codes (
  betrieb_id  uuid primary key
    references public.betriebe(id) on delete cascade,
  -- Kanonisch: ohne Leerraum, Grossbuchstaben. Die Web-Registrierung
  -- normalisiert vorher (`feldSchemata.promo_code`); der CHECK hält
  -- die Schreibweise auch für jeden anderen Schreibweg fest, damit
  -- `group by promo_code` nicht an „partner10" gegen „PARTNER10"
  -- zerfällt.
  promo_code  text not null
    check (promo_code ~ '^[A-Z0-9_-]{1,40}$'),
  erstellt_am timestamptz not null default now()
);

comment on table public.betrieb_promo_codes is
  'Promo-Code, den ein Betrieb bei der Registrierung angegeben hat. '
  'Ein Code je Betrieb. Geschrieben von der Web-Registrierung.';

-- Für die eigentliche Auswertung: wie viele Betriebe je Code.
create index idx_betrieb_promo_codes_code
  on public.betrieb_promo_codes (promo_code);

alter table public.betrieb_promo_codes enable row level security;

-- ---------------------------------------------------------------------
-- Rechte
-- ---------------------------------------------------------------------
--
-- Supabase vergibt in `public` per Default-Privileges ALLE Rechte an
-- `anon` und `authenticated`. RLS würde das zwar abfangen, aber hier
-- wird ausdrücklich nur das erteilt, was gebraucht wird: `anon` nichts,
-- `authenticated` Lesen und Anlegen. Kein UPDATE, kein DELETE — ein
-- eingetragener Code wird nicht nachträglich umgeschrieben.

revoke all on public.betrieb_promo_codes from anon, authenticated;
grant select, insert on public.betrieb_promo_codes to authenticated;

-- Nur die Leitung des eigenen Betriebs. Geschrieben wird unmittelbar
-- nach `registriere_betrieb`, dann ist die Person dort bereits Chef.
create policy promo_code_insert_chef on public.betrieb_promo_codes
  for insert to authenticated
  with check (public.ist_chef(betrieb_id));

-- Lesen darf die Leitung den eigenen Eintrag — es ist ihre eigene
-- Angabe, und sie steht damit auch im Betriebsexport. Ausgewertet wird
-- über alle Betriebe hinweg vom Betreiber (Dashboard / service_role).
create policy promo_code_select_chef on public.betrieb_promo_codes
  for select to authenticated
  using (public.ist_chef(betrieb_id));

-- ---------------------------------------------------------------------
-- Gegenproben im selben Lauf
-- ---------------------------------------------------------------------
do $$
begin
  if has_table_privilege('anon', 'public.betrieb_promo_codes', 'SELECT')
     or has_table_privilege('anon', 'public.betrieb_promo_codes', 'INSERT') then
    raise exception 'anon darf betrieb_promo_codes weder lesen noch schreiben';
  end if;

  if has_table_privilege('authenticated', 'public.betrieb_promo_codes', 'UPDATE')
     or has_table_privilege('authenticated', 'public.betrieb_promo_codes', 'DELETE') then
    raise exception 'authenticated darf betrieb_promo_codes nicht ändern oder löschen';
  end if;

  if (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'betrieb_promo_codes') <> 2 then
    raise exception 'betrieb_promo_codes: erwartet genau zwei Policies';
  end if;
end;
$$;

commit;

-- =====================================================================
--  Auswertung (Betreiber, SQL-Editor)
-- =====================================================================
--
--    select promo_code, count(*) as betriebe, min(erstellt_am), max(erstellt_am)
--      from public.betrieb_promo_codes
--     group by promo_code
--     order by betriebe desc;
--
-- =====================================================================
--  Zurücknehmen
-- =====================================================================
--
--    drop table public.betrieb_promo_codes;
--
--  Die Web-Registrierung protokolliert danach `[promo] …` und läuft
--  weiter — das Schreiben hält die Einrichtung nie auf.
-- =====================================================================
