# UI — Betriebsregeln

Die vollständigen Vorgaben (Tokens, Kontrast-Ausnahmen, Server-Components-
Pflicht, Semantik, Barrierefreiheit) stehen in `CLAUDE.md` unter „Harte
Vorgaben". Diese Datei ergänzt nur die Arbeitsweise.

- Tokens kommen aus `docs/Farbpalette.html` über Ebene 2 (`bg-surface`,
  `text-muted`, …) — ein neuer Hex-Wert oder ein neues Token ist ein Stopp
  und eine Rückfrage, keine eigene Ermessensentscheidung.
- **Kontrast wird gemessen, nicht geschätzt.** Ein Token kann an einer Stelle
  passen und an einer anderen unter 4.5:1 fallen, je nachdem, auf welcher
  Fläche es sitzt — genau so sind `--qt-muted-sunk` und `--qt-border-control`
  entstanden. Im Browser prüfen (`playwright-cli` + `eval` auf berechnete
  Stile), nicht am Quelltext ablesen.
- Server-Components-Probe: `curl` auf die Route, der komplette sichtbare Text
  muss im HTML stehen.
- Icons ausschliesslich über `lucide-react` — kein zweites Icon-Set einführen.
- Vor einer neuen Komponente erst prüfen, ob `src/components/` schon dieselbe
  Aufgabe löst — dieses Projekt konsolidiert aktiv (siehe den Git-Verlauf zu
  den Rollen-Chips).
