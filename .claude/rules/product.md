# Produkt — Betriebsregeln

`CLAUDE.md` ist der aktuelle Stand. Diese Datei ergänzt nur, wie mit Umfang
und Historie umzugehen ist.

- **Die Standardfrage für „gehört das hierher?"** ist `CLAUDE.md`s eigene:
  *kann die Expo-App das?* Ja → gehört hierher, ausser es hängt an Push. Nein →
  eine neue Produktentscheidung, die erst besprochen wird, bevor sie gebaut ist.
- Umfangsänderungen werden als datierter Abschnitt in `CLAUDE.md` festgehalten
  — alter Zustand, neuer Zustand, Datum, Begründung — nie als stille
  Überschreibung. Muster: die „Kursänderung"-Abschnitte in `CLAUDE.md` selbst.
- Hintergrund und Verlauf stehen in `docs/quickteam-gesamtkonzept.md` und den
  datierten `docs/projektstand-*.md`-Ständen. Dort nachsehen, bevor etwas als
  unentschieden behandelt wird.

## Die Expo-App ist die Quelle für bestehendes Verhalten

**Seit 2026-08-30 liegt die Expo-App (`Blank0371/QuickTeamMobile`) lokal
ausgecheckt unter `../QuickTeam App`** (Leerzeichen, kein Bindestrich — in der
Shell entsprechend quoten), read-only für dieses Projekt. Das ändert, worauf
sich Paritäts- und Portierungsarbeit stützt:

- **Für bestehendes Produktverhalten ist der Expo-Quellcode massgeblich** —
  nicht `CLAUDE.md`, nicht `docs/`. Diese bleiben unterstützender Kontext,
  kein Ersatz für den Blick in `../QuickTeam App/src`. Eine Paritäts- oder
  Portierungsaussage, die nur aus `CLAUDE.md` oder aus der geteilten
  Datenbank abgeleitet ist, ohne die tatsächliche Implementierung
  angesehen zu haben, ist unvollständig.
- **Für die aktuelle Datenbankstruktur bleibt das geteilte Supabase-Schema
  massgeblich** (`.claude/rules/supabase.md`) — die Expo-App ersetzt das
  Schema-Nachschlagen nicht, sie ergänzt es um die Frage, was ein Feature
  eigentlich tun soll: sichtbares Verhalten, Geschäftslogik, Validierung,
  Rand- und Fehlerfälle, Berechtigungen, Datenbankzugriffe,
  Zustandsübergänge, Nutzerflüsse.
- **Widerspricht das Expo-Verhalten dem aktuellen Schema** — eine Spalte, ein
  Enum-Wert oder eine RPC-Signatur, die der App-Code voraussetzt, aber laut
  `list_tables`/`pg_proc` nicht (mehr) existiert —, wird das als Konflikt
  gemeldet, nicht stillschweigend zugunsten der einen oder anderen Seite
  aufgelöst. Muster: die bereits dokumentierten Fälle in `CLAUDE.md`
  (`mitarbeiter_einladung_annehmen`, `pruefe_letzter_chef`).
- **Nie in `../QuickTeam App` schreiben.** Kein Edit, kein Write, keine
  Datei anlegen oder löschen — nur lesen. Es ist der Checkout des Kollegen,
  nicht Arbeitsmaterial dieses Repos.
- Das ändert nichts an der Grenze aus `CLAUDE.md`: *kann die Expo-App das?*
  bleibt die Frage, nur die Antwort kommt jetzt aus dem Quellcode statt aus
  einer Ableitung.
