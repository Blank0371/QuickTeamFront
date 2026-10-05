# Backend-Befund 2026-10-04 — neue Tabelle `urlaub_vorab`, `urlaub_beantragen` erweitert

An: App-Entwickler (`QuickTeamMobile`). Gemeldet; in der App nichts geändert.

## Was sich geändert hat

Auf Anweisung des Nutzers (Text: `docs/backend/migration-2026-10-04-urlaub-vorab.sql`):

1. **Neue Tabelle `urlaub_vorab`** `(betrieb_id, mitarbeiter_id, jahr, tage)`, PK
   `(mitarbeiter_id, jahr)`: Urlaubstage, die eine Person in einem Jahr **vor QuickTeam**
   schon genommen hat. Chef schreibt, Chef und Person lesen. Gesetzt vom Chef im Web —
   beim Einladen und im Profil.
2. **`urlaub_beantragen` geändert** (Signatur gleich): die Kontingentprüfung addiert
   `urlaub_vorab.tage` des laufenden Jahres. Ein Antrag aus der App wird also strenger
   geprüft, wenn ein Vorab-Wert existiert — sonst unverändert. Fehlercode bleibt
   `URLAUB_KONTINGENT`.

„Genommen" ist damit: Vorab + offene + genehmigte Anträge des Jahres. Kein Zähler — die
Tabelle ändert sich nur, wenn der Chef einen Wert einträgt.

(Am selben Tag kurzzeitig zwei Spalten `mitarbeiter.urlaub_bereits_genommen_tage`/`_jahr`;
in die Tabelle übernommen und wieder entfernt. Die App hat sie nie gelesen.)

## Was die App noch anders anzeigt

- `scheduling.tsx`, `usedDays`: Resttage der Mitarbeiter-Sicht ohne Vorab → zu hoch. Das
  Tor (RPC) lehnt trotzdem richtig ab; nur die Anzeige und der Hinweis `exceedsBalance`
  stimmen nicht.
- `manager.tsx`, `vacationTaken`: „genommen / Anspruch" ohne Vorab (und ohne offene
  Anträge).
- `manager.tsx`, `approvedDays` vor einer Genehmigung: ohne Vorab → kann genehmigen, was
  das Web ablehnt.

## Vorschlag

An allen drei Stellen `urlaub_vorab.tage` für `mitarbeiter_id` und das gerechnete Jahr
addieren (Web: `genommeneTage()`/`vorabFuer()` in `src/lib/dashboard/urlaub.ts`).

## Nicht betroffen

`plan-generieren` (Solver), `pruefe_zuweisung_regeln`, `schicht_zuweisung_warnungen` lesen
nur genehmigte Urlaubs**daten** (welcher Tag ist blockiert), nie ein Kontingent. Vorab-Tage
haben keine Daten und liegen in der Vergangenheit.

## Nebenbei aufgefallen (unabhängig, nicht geändert)

`urlaub_beantragen` vergleicht einen Antrag für **nächstes** Jahr (`v_neu`, volle Länge) mit
dem Verbrauch des **laufenden** Jahres — ein Dezember-Antrag für Januar kann am
ausgeschöpften alten Jahr scheitern, und ein Antrag über den Jahreswechsel belastet das
alte Jahr mit voller Länge.
