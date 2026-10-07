# Backend-Befund 2026-10-06 — `rollen` hat jetzt eine DELETE-Policy

An: App-Entwickler (`QuickTeamMobile`). Gemeldet; in der App nichts geändert.

## Was sich geändert hat

Auf Anweisung des Nutzers, von ihm im SQL-Editor eingespielt (Text:
`docs/backend/migration-2026-10-06-rollen-delete-policy.sql`):

```sql
create policy rollen_delete_chef on public.rollen
  for delete using (ist_chef(betrieb_id));
```

Vorher lief jedes `delete` auf `rollen` still ins Leere (RLS, null Zeilen, kein Fehler).
Jetzt kann ein aktiver Chef Rollen seines Betriebs hart löschen.

## Was das für die App heisst

- **Nichts bricht.** Die App löscht weiterhin weich (`manager.tsx`, `aktiv = false`) und
  ruft kein `delete` auf `rollen` auf.
- **Geschützt bleiben** Rollen, an denen noch etwas hängt: `mitarbeiter_rollen`,
  `schicht_vorlage_mindestbesetzung`, `schicht_instanz_mindestbesetzung` und
  `schicht_zuweisungen` stehen auf ON DELETE RESTRICT.
- **Eine Ausnahme:** `schicht_ausschreibung_bedarf.rolle_id` ist ON DELETE **CASCADE**.
  Ein hartes Löschen nähme einer laufenden Ausschreibung still ihre Zeile für diese
  Rolle. Das Web prüft das vorher selbst und lehnt ab; wer in der App einmal hart löscht,
  sollte dasselbe tun — oder der FK wird auf RESTRICT gestellt (von hier nicht angefasst).

## Wie das Web löscht

`entferneRolle()` (`src/lib/team.ts`) lehnt ab, solange die Rolle einer Person
zugewiesen ist („Du kannst die Rolle nicht löschen, weil sie noch einer Person zugewiesen
ist.") oder in einer Ausschreibung steht. Zuweisungen werden **nicht** mitgelöscht.
