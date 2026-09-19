-- =====================================================================
--  E-Mail-Adresse des Partners in der Promo-Code-Liste
--  Am 2026-09-15 vom Nutzer angewiesen. Baut auf
--  `migration-2026-09-15-promo-code-liste.sql` auf.
-- =====================================================================
--
--  Zu jedem zugelassenen Code gehört die Adresse des Partners, der ihn
--  verteilt — für Rückfragen und Abrechnung.
--
--  **Pflicht (`not null`).** Am 2026-09-15 ist `promo_codes` leer, der
--  Zwang kostet also keinen Bestand. Ohne Adresse wäre ein Partner, der
--  Betriebe gebracht hat, nicht erreichbar.
--
--  Die Formprüfung ist bewusst grob — ein `@` mit etwas davor und einem
--  Punkt dahinter. Sie fängt Vertipper wie ein fehlendes `@` ab; ob die
--  Adresse zustellbar ist, kann keine Regex sagen.
--
--  Lesbar bleibt die Liste nur für den Betreiber: `promo_codes` hat für
--  `anon` und `authenticated` weder Grant noch Policy, und
--  `promo_code_gueltig()` gibt nur Ja/Nein zurück, nie eine Spalte. Die
--  Adresse ist damit auf demselben Weg geschützt wie der Partnername.
--
-- =====================================================================

begin;

alter table public.promo_codes
  add column email text not null
    check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

comment on column public.promo_codes.email is
  'E-Mail-Adresse des Partners, der den Code verteilt.';

do $$
begin
  if has_column_privilege('anon', 'public.promo_codes', 'email', 'SELECT')
     or has_column_privilege('authenticated', 'public.promo_codes', 'email', 'SELECT') then
    raise exception 'promo_codes.email darf fuer Clients nicht lesbar sein';
  end if;
end;
$$;

commit;

-- =====================================================================
--  Pflege (Betreiber, SQL-Editor)
-- =====================================================================
--
--    insert into public.promo_codes (code, partner, email)
--    values ('PARTNER10', 'Name des Partners', 'partner@example.com');
--
--    update public.promo_codes set email = 'neu@example.com' where code = 'PARTNER10';
--
-- =====================================================================
--  Zurücknehmen
-- =====================================================================
--
--    alter table public.promo_codes drop column email;
-- =====================================================================
