# Backend-Befund 2026-10-07 — neue Spalte `urlaub.angerechnete_tage`, `urlaub_beantragen` erweitert

An: App-Entwickler (`QuickTeamMobile`). Gemeldet; in der App nichts geändert.

## Was sich geändert hat

Auf Anweisung des Nutzers (Text: `docs/backend/migration-2026-10-07-urlaub-angerechnete-tage.sql`):

1. **Neue Spalte `urlaub.angerechnete_tage smallint`**, nullable, CHECK
   `0..(bis - von) + 1`. Der Chef trägt im Web beim Genehmigen ein, wie viele der
   beantragten Kalendertage aufs Urlaubskontingent zählen (z. B. 10 statt 14 für zwei
   Wochen ohne Wochenenden). `NULL` = alle Kalendertage — das bisherige Verhalten.
2. **`urlaub_beantragen` geändert** (Signatur gleich): `v_verbraucht` summiert
   `least(coalesce(angerechnete_tage, Kalendertage), Kalendertage im laufenden Jahr)`.

## Was das für die App heisst

- **Nichts bricht.** Die App liest und schreibt die Spalte nicht; `decide()` setzt nur
  `status`/`begruendung`, der Wert bleibt stehen.
- **Die Sperre ist unverändert:** Solver, `pruefe_zuweisung_regeln` (HC-1) und
  `schicht_zuweisung_warnungen` prüfen weiter `datum between von and bis`.
- **Anzeigen weichen ab:** `usedDays` (`scheduling.tsx`) und `approvedDays`/`vacationTaken`
  (`manager.tsx`) zählen weiter Kalendertage und zeigen damit mehr verbrauchten Urlaub, als
  das Web und `urlaub_beantragen` rechnen. Der App-Wächter vor einer Genehmigung kann
  deshalb strenger sein als nötig. Zum Angleichen: je Antrag
  `angerechnete_tage ?? Kalendertage` nehmen; jahresübergreifend von vorne verteilen
  (zuerst ins Jahr von `von`, höchstens dessen Kalendertage, Rest ins Folgejahr) — Web:
  `angerechneteTageImJahr()` in `src/lib/dashboard/urlaub.ts`.
