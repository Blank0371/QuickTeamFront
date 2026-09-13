# Logik-Spezifikation: Vertrag, Sollstunden, Überstunden, Urlaubsanspruch

Stand 2026-09-08. Erhoben gegen die Live-DB (`jqpfuotwsgnqihspsmmf`) und den
Expo-Quellcode unter `../QuickTeam App`. **Nur gelesen — nichts geändert.**

Zweck: Grundlage für die Entscheidung, was beim Anlegen eines Mitarbeiters im
Web erfasst werden soll. Keine UI-Vorgaben.

---

## 1. Feldbestand

**Es gibt keine Vertrags- oder Anstellungstabelle.** Alle Felder hängen direkt an
`mitarbeiter`; die 34 Tabellen des Schemas enthalten nichts in dieser Richtung
(`abwesenheit`, `urlaub` betreffen Abwesenheiten, nicht den Vertrag). **Views
gibt es im Schema `public` überhaupt keine** — `information_schema.views` ist
leer, es kann also nirgends eine abgeleitete Spalte versteckt sein.

Vollständige Spaltenliste von `mitarbeiter` (18 Spalten). Die anstellungs-
relevanten sind hervorgehoben:

| Spalte | Typ | NULL | Default | CHECK |
| --- | --- | --- | --- | --- |
| `id` | uuid | nein | `gen_random_uuid()` | PK |
| `betrieb_id` | uuid | nein | – | FK → `betriebe` |
| `auth_id` | uuid | **ja** | – | FK → `auth.users` (ON DELETE SET NULL) |
| `vorname` | text | nein | – | keiner (kein trim-CHECK) |
| `nachname` | text | nein | – | keiner (kein trim-CHECK) |
| `email` | text | ja | – | keiner, **kein UNIQUE** |
| `telefon` | text | ja | – | keiner |
| `rolle_typ` | text | nein | `'mitarbeiter'` | `chef` \| `mitarbeiter` |
| **`vertrag_typ`** | **text** | **ja** | – | **keiner — Freitext** |
| **`soll_stunden`** | **numeric** | **ja** | – | **keiner** |
| **`max_stunden_hart`** | **numeric** | **ja** | – | **keiner** |
| **`toleranz_ueberstunden`** | **numeric** | **nein** | **`0`** | **keiner** |
| **`ueberstunden_saldo`** | **numeric** | **nein** | **`0`** | **keiner** |
| `status` | text | nein | `'eingeladen'` | `eingeladen` \| `aktiv` \| `pausiert` \| `inaktiv` |
| `anonymisiert_am` | timestamptz | ja | – | – |
| `erstellt_am` | timestamptz | nein | `now()` | – |
| **`urlaubsanspruch_tage`** | **smallint** | **nein** | **`25`** | **`>= 0`** |
| `sprache` | text | ja | – | keiner |

**Nicht vorhanden, obwohl gesucht:**

- **kein Stundenlohn, kein Gehalt, keine Währung** — nirgends im Schema. Wer
  Entlohnung erfassen will, braucht eine Schema-Änderung, und die entsteht nicht
  in diesem Repo.
- **kein Eintrittsdatum.** `erstellt_am` ist der Zeitpunkt, zu dem die *Zeile*
  angelegt wurde — bei einem migrierten Bestand also das Migrationsdatum, nicht
  der Arbeitsbeginn. Die Überstundenrechnung braucht deshalb einen Umweg (§3).

Ergänzend gelesen wird `betriebs_einstellungen`: `abrechnung_bis` (date, NULL) und
`notfall_stunden_anrechnen` (bool) steuern die Überstundenrechnung, und
`gesetzliche_parameter` (je `land`) trägt Ruhezeit, Tages-/Wochenhöchstarbeitszeit
und die Pausenschwellen.

### Ist-Belegung

Zur Einordnung, wie ernst diese Felder heute genommen werden (aggregiert, keine
Einzelzeilen):

- 168 Zeilen gesamt
- `vertrag_typ`: **in allen 168 Zeilen NULL** — das Feld ist faktisch ungenutzt
- `soll_stunden` gesetzt: 143 · `max_stunden_hart` gesetzt: 120
- `toleranz_ueberstunden` ≠ 0: 120 · `ueberstunden_saldo` ≠ 0: 20
- `urlaubsanspruch_tage`: nur 2 verschiedene Werte im ganzen Bestand

---

## 2. Fester Eingabewert oder berechnet?

**Alle sieben Felder sind gespeicherte Eingabewerte. Keines wird von der
Datenbank berechnet oder fortgeschrieben.** Es gibt keinen Trigger, keine
Funktion und keine View, die einen davon schreibt — geprüft über `pg_proc`
(Volltextsuche in allen Funktionsrümpfen), `pg_trigger` und
`information_schema.views`.

Genau drei Funktionen erwähnen diese Spalten überhaupt:

| Funktion | Angehängt an | liest |
| --- | --- | --- |
| `pruefe_zuweisung_constraints()` | BEFORE-Trigger auf `schicht_zuweisungen` | `max_stunden_hart` |
| `urlaub_beantragen(...)` | RPC (SECURITY DEFINER) | `urlaubsanspruch_tage` |
| `schuetze_mitarbeiter_spalten()` | BEFORE-UPDATE-Trigger auf `mitarbeiter` | alle — nur als Sperrliste |

**Die wichtigste Konsequenz: `ueberstunden_saldo` ist nicht der Überstundenstand.**
Es ist ein **Anfangsbestand** („opening balance") — der Übertrag aus der Zeit vor
QuickTeam bzw. vor der letzten Abrechnung. Der tatsächliche Saldo wird bei jeder
Anzeige und bei jedem Solver-Lauf **neu gerechnet und nie zurückgeschrieben**.
Genau deshalb kommt dieses Feld ohne Eintrittsdatum aus: was vor dem Übertrag
liegt, steckt als Zahl darin.

---

## 3. Überstunden-Berechnung

Live berechnet, **nirgends gespeichert**. Zwei unabhängige Implementierungen, die
identisch sind:

- `../QuickTeam App/src/app/(tabs)/manager.tsx:100-113` — `computeOvertime()`
- `../QuickTeam App/supabase/functions/plan-generieren/index.ts:225-272`

```
überstunden(m) = m.ueberstunden_saldo
               + Σ  über jeden VOLLEN Kalendermonat,
                    dessen letzter Tag <= betriebs_einstellungen.abrechnung_bis
                  ( gearbeitete Bruttostunden(m, Monat) − m.soll_stunden )
```

Regeln im Einzelnen, alle im Quelltext belegt:

1. **`abrechnung_bis IS NULL` → überstunden = `ueberstunden_saldo`.** Ohne
   definierte Abrechnungsperiode wird gar nichts aufsummiert
   (`manager.tsx:107`, `index.ts:270`).
2. **Nur volle Monate.** Ein Monat zählt erst, wenn sein letzter Kalendertag
   `<= abrechnung_bis` liegt (`lastDayOfMonth(ym) > cutoff → continue`).
3. **Monate ohne Schichten werden übersprungen** — nicht als „0 gearbeitet, also
   volles Soll als Minus" gewertet. `manager.tsx:99` nennt das ausdrücklich
   „natural hire-date handling": das ersetzt das fehlende Eintrittsdatum.
4. **Notfall-Schichten** (`schicht_zuweisungen.attendet = false`) zählen nur, wenn
   `betriebs_einstellungen.notfall_stunden_anrechnen` gesetzt ist.
5. **Gerechnet wird BRUTTO**, also die reine Uhrzeitspanne inkl. Pause,
   Nachtschicht über Mitternacht mit `+24h` (`manager.tsx:81-87`,
   `solver.ts:183-191`). Das ist **Absicht, kein Fehler**: `solver.ts:358-360`
   hält fest, dass Brutto die bezahlte Zeit ist und die Nettozeit
   (`netto_arbeitszeit_stunden()`) ausschliesslich für die gesetzlichen
   Tages-/Wochengrenzen benutzt wird.

`soll_stunden` ist dabei ein **Monatswert**, der unverändert von den
Monatsstunden abgezogen wird.

### Wo `soll_stunden` sonst noch wirkt

- **Solver-Fairness** (`solver.ts:341`): Zielwert `= soll_stunden × verfügbarkeitsFaktor`.
  Der Faktor kürzt Ziel *und* Hartgrenze anteilig um die Arbeitstage, die
  genehmigter Urlaub wegnimmt (`solver.ts:320-334`) — Urlaub schrumpft also das
  Soll, statt in die übrigen Tage gedrückt zu werden.
- **Solver-Überstundenkosten** (`solver.ts:351`):
  `otPen = max(0, überstunden − toleranz_ueberstunden)`. `toleranz_ueberstunden`
  wirkt **ausschliesslich hier** — es ist ein Freibetrag für die Reihenfolge der
  Einteilung, keine Grenze, die irgendetwas verhindert.

### `max_stunden_hart`

Die einzige dieser Zahlen, die etwas **blockiert**. `pruefe_zuweisung_constraints()`
wirft bei Überschreitung (HC-5) und verhindert die Zuweisung. Die Website mappt
die Meldung bereits (`src/app/dashboard/(arbeit)/schicht/[id]/aktionen.ts:50-55`).

---

## 4. Urlaubsanspruch

`urlaub_beantragen(p_betrieb_id, p_mitarbeiter_id, p_von, p_bis, p_kommentar)`,
SECURITY DEFINER, prüft der Reihe nach:

1. Sitz gehört dem Aufrufer und ist `status = 'aktiv'` (sonst `42501`)
2. Daten plausibel und nicht in der Vergangenheit → `URLAUB_DATUM`
3. keine bestehende Schichtzuweisung im Zeitraum → `URLAUB_SCHICHTEN`
4. kein `veroeffentlicht`-Planungszyklus überlappt → `URLAUB_GEPLANT`
5. **Kontingent** → `URLAUB_KONTINGENT`:

```
verbraucht = Σ (Kalendertage) aller urlaub-Zeilen des Mitarbeiters
             mit status IN ('approved','requested')
             und extract(year from von) = laufendes Jahr,
             je Zeile auf das laufende Kalenderjahr zugeschnitten
neu        = (bis − von) + 1
Ablehnung, wenn verbraucht + neu > urlaubsanspruch_tage
```

Wichtig für die Erfassung: gezählt werden **Kalendertage, nicht Arbeitstage** —
Wochenenden und Feiertage inklusive. Ein Anspruch von 25 entspricht also *nicht*
25 Arbeitstagen. Offene Anträge (`requested`) belegen das Kontingent bereits mit.

Die Website spiegelt diese Rechnung für die Chef-Genehmigung nach
(`src/app/dashboard/(arbeit)/urlaub/aktionen.ts:106-120`) und liest den Anspruch
in `src/lib/dashboard/urlaub.ts:109-121`.

---

## 5. Wo wird das heute eingetragen?

**Nirgends. Weder App noch Website schreiben eine dieser Spalten.**

- Der Expo-Quellcode greift auf `mitarbeiter` an genau drei Stellen zu, alle
  lesend: `manager.tsx:152`, `index.tsx:116`, `select.tsx:50`. Ein `.update()`,
  `.insert()` oder `.upsert()` auf `mitarbeiter` existiert im gesamten
  App-Repo nicht.
- Die App hat **überhaupt keinen Anlege-Weg für Mitarbeiter** — `CreateShiftsModal`
  legt Schichten an, nicht Personen. (Deckt sich mit dem Befund vom 2026-09-07:
  Einladungen erzeugt ebenfalls nur die Website.)
- Angezeigt wird im Chef-Detail: `vertrag_typ` (`manager.tsx:598`), `soll_stunden`
  (`:599`), Überstunden-Aufschlüsselung (`:603-604`), Urlaub verbraucht/Anspruch
  (`:608`). Alles reine Anzeige, kein Editor.
- Die Website liest bisher nur `urlaubsanspruch_tage`. `holeTeam()` in
  `src/lib/dashboard/team.ts:67` selektiert `id, vorname, nachname, email,
  telefon, rolle_typ, status` — keines der Vertragsfelder.
- `registriere_betrieb()` setzt keines der Felder; es bleibt bei den Defaults
  (`toleranz 0`, `saldo 0`, `urlaubsanspruch 25`, Rest NULL).

**Die vorhandenen Werte (143× `soll_stunden` usw.) sind also von Hand
eingetragen worden** — per SQL, Supabase-Dashboard oder Seed. Es gibt keine
Oberfläche dafür.

**Für die Website heisst das:** ein Erfassungsformular ist keine Nachbau-Arbeit,
sondern die **erste** Oberfläche dafür überhaupt. Nach der Regel aus `CLAUDE.md`
(„kann die Expo-App das?") ist das eine neue Produktentscheidung und wird
besprochen, bevor sie gebaut wird — die Felder selbst existieren aber, und der
Solver rechnet bereits mit ihnen.

---

## 6. Berechtigung

### Lesen — `mitarbeiter_select`

```
betrieb_id IN (SELECT meine_betriebe())
AND anonymisiert_am IS NULL
AND ( ist_chef(betrieb_id)
      OR auth_id = auth.uid()
      OR COALESCE(betriebs_einstellungen.mitarbeiter_sehen_andere_mitarbeiter, false) )
```

- Chef: alle Zeilen des Betriebs.
- Mitarbeiter: **immer die eigene Zeile** — also auch die eigenen
  `soll_stunden`, `ueberstunden_saldo`, `vertrag_typ`.
- Fremde Zeilen nur, wenn `mitarbeiter_sehen_andere_mitarbeiter` gesetzt ist.
  **RLS filtert zeilenweise, nicht spaltenweise**: steht das Flag, sehen
  Angestellte die Vertragsdaten ihrer Kollegen mit. Die App zeigt sie zwar nur
  im Chef-Screen an, aber die Zeile ist über die API abrufbar.

### Schreiben

| Policy | Bedingung | Wirkung |
| --- | --- | --- |
| `mitarbeiter_insert_chef` | `ist_chef(betrieb_id)` | Chef legt an — alle Spalten |
| `mitarbeiter_update_chef` | `ist_chef(betrieb_id)` | Chef ändert — alle Spalten |
| `mitarbeiter_update_selbst` | `auth_id = auth.uid()` | eigene Zeile, **spaltenweise nur durch Trigger begrenzt** |
| `mitarbeiter_delete_chef` | `ist_chef(...) AND auth_id IS DISTINCT FROM auth.uid()` | Chef löscht, aber nicht sich selbst |

Der Chef ist also der einzige, der Vertragsdaten schreiben darf — **fast**. Siehe
den nächsten Abschnitt.

---

## 7. Befunde, die vor dem Bau geklärt gehören

Alle drei sind gelesen und verifiziert, keiner ist repariert.

### 7.1 Ein Mitarbeiter kann seinen eigenen Urlaubsanspruch erhöhen

`mitarbeiter_update_selbst` erlaubt das UPDATE auf Zeilenebene; die einzige
Spaltenbegrenzung ist der Trigger `schuetze_mitarbeiter_spalten()`. Dessen
Sperrliste zählt auf: `id, betrieb_id, auth_id, vorname, nachname, email,
rolle_typ, vertrag_typ, soll_stunden, max_stunden_hart, toleranz_ueberstunden,
ueberstunden_saldo, status, anonymisiert_am, erstellt_am` — und wirft sonst
„Nur telefon darf selbst geaendert werden".

**`urlaubsanspruch_tage` und `sprache` stehen nicht auf dieser Liste.**

Eine Spaltenrechte-Sperre fängt es nicht ab: `has_column_privilege('authenticated',
…, 'UPDATE')` ist für **jede** Spalte von `mitarbeiter` wahr, und
`information_schema.column_privileges` enthält keine einschränkenden Einträge.

Damit kann jede angemeldete Person ihren eigenen `urlaubsanspruch_tage` beliebig
hochsetzen — und `urlaub_beantragen()` prüft das Kontingent gegen genau diese
Spalte. Bei `sprache` ist das Schreibrecht gewollt; bei `urlaubsanspruch_tage`
mit hoher Wahrscheinlichkeit nicht. **Zu melden, nicht von hier zu beheben**
(Trigger-Änderung = Schema-Änderung).

### 7.2 Entscheidung vom 2026-09-08: Eingabe in Wochenstunden, gespeichert × 4,33

**Festgelegt:** das Erfassungsformular fragt **Wochenstunden**; gespeichert wird
`soll_stunden = round(wochenstunden × 4,33)`, also ein Monatswert.

Das ist keine neue Konvention, sondern die bestehende — an drei Stellen belegt:

1. `index.tsx:74-77` benennt sie wörtlich: „soll_stunden is a weekly-hours ×
   4.33 figure for a typical month".
2. Alle drei Verbraucher rechnen monatlich: `computeOvertime()`
   (`manager.tsx:110`), die Überstundenrechnung des Solvers (`index.ts:265`) und
   das Fairness-Ziel (`solver.ts:341`).
3. Der Bestand bestätigt es: 143 gesetzte Werte, Spanne 80–173, Mittel 166,7 —
   **keiner unter 60**. 173 ist exakt `round(40 × 4,33)`.

4,33 ist 52 Wochen / 12 Monate. Gerundet wird auf ganze Stunden, damit die neuen
Werte zum Bestand passen (40 h/Woche → 173, nicht 173,2); die Spalte ist
`numeric` und verkraftet auch Nachkommastellen, es geht nur um Einheitlichkeit.

**Was die Entscheidung nicht aufhebt:** die Mitarbeiter-Startseite rechnet den
Monatswert über `monthTarget()` (`index.tsx:77-81`) wieder auf die *tatsächliche*
Monatslänge um (`soll / 4,33 × Tage/7`), die Überstundenrechnung des Chefs nicht.
Für einen 31-Tage-Monat zeigt die Mitarbeiter-Ansicht damit rund 2 % mehr Ziel an
als die Chef-Rechnung abzieht, im Februar rund 8 % weniger. Das ist eine
Anzeige-Abweichung in der App, keine Folge der Eingabekonvention — sie bestünde
bei jeder Speicherung gleichermassen und ist von hier aus nicht zu beheben.

### 7.3 `max_stunden_hart`: der DB-Deckel ist wirkungslos

Dieselbe Spalte wird von zwei Seiten verschieden gelesen:

- **Datenbank** (`pruefe_zuweisung_constraints`): Summe der **Netto**stunden der
  **ISO-Kalenderwoche** darf `max_stunden_hart` nicht überschreiten
  („HC-5 … KW ab %").
- **Solver** (`plan-generieren/index.ts:26`): „HC-5: **MONTHLY** (cycle) hours
  must not exceed `max_stunden_hart`", zusätzlich anteilig gekürzt.

**Aufgelöst durch den Bestand:** alle 120 gesetzten Werte liegen zwischen 65 und
208, **keiner unter 48** — die Daten sind monatlich, wie `soll_stunden`.

Die Folge ist nicht, dass die Datenbank zu viel durchliesse: unmittelbar **vor**
der HC-5-Prüfung steht die gesetzliche Wochengrenze aus `gesetzliche_parameter`
(AT und DE je 48 h), und die greift immer zuerst. Weil jeder hinterlegte
Monatswert über 48 liegt, **feuert HC-5 bei keiner einzigen Zeile jemals**.

Der persönliche Hartdeckel wird damit **ausschliesslich vom Solver** durchgesetzt.
Eine manuelle Zuweisung über das Dashboard ist nur durch das Gesetz begrenzt
(48 h/Woche, 12 h/Tag in AT bzw. 10 h in DE) und kann jemanden auf rund 208
Monatsstunden bringen, obwohl in `max_stunden_hart` 150 steht — ohne Fehler.

Ein Wochenwert einzutragen würde das umdrehen und wäre schlimmer: die DB griffe
korrekt, aber der Solver verstünde 40 als **Monats**deckel und plante die Person
auf 40 Stunden im Monat. **Es gibt keinen Wert, der für beide Seiten richtig ist.**
Solange das so bleibt, gilt die Bestandskonvention (monatlich, also ebenfalls
`wochenstunden × 4,33`) — und der Hartdeckel ist eine Solver-Vorgabe, keine
Sperre. Zu melden, nicht von hier zu beheben.

### 7.4 Randnotiz: toter Status-Zweig im Zuweisungs-Trigger

`pruefe_zuweisung_constraints()` prüft `if v_ma.status = 'deaktiviert'`. Dieser
Wert ist im CHECK auf `mitarbeiter.status` gar nicht zugelassen
(`eingeladen | aktiv | pausiert | inaktiv`) — der Zweig läuft nie. Folge: eine
Person mit `status = 'inaktiv'` oder `'pausiert'` wird von der Datenbank **nicht**
an einer Schichtzuweisung gehindert. Betrifft die Vertragsfelder nicht direkt,
gehört aber in dieselbe Meldung.

---

## 8. Kurzfassung für die Planung

| Feld | Eingabe/berechnet | Pflicht | Grenzen in der DB | Wer schreibt heute | Wirkt auf |
| --- | --- | --- | --- | --- | --- |
| `vertrag_typ` | Eingabe | optional (NULL) | keine — Freitext | niemand | nur Anzeige |
| `soll_stunden` | Eingabe **Wochenstunden × 4,33** (§7.2) | optional (NULL) | keine (auch negativ möglich) | niemand | Überstunden, Solver-Fairness |
| `max_stunden_hart` | Eingabe **Wochenstunden × 4,33** (§7.3) | optional (NULL) | keine | niemand | nur Solver — DB-Prüfung feuert nie |
| `toleranz_ueberstunden` | Eingabe | NOT NULL, Default 0 | keine | niemand | nur Solver-Reihenfolge |
| `ueberstunden_saldo` | Eingabe (**Anfangsbestand**) | NOT NULL, Default 0 | keine | niemand | Startwert der Überstunden |
| `urlaubsanspruch_tage` | Eingabe | NOT NULL, Default 25 | `>= 0` | niemand (aber: 7.1) | **blockiert** Urlaubsantrag |
| Stundenlohn / Gehalt | — | — | — | — | **existiert nicht** |
| Eintrittsdatum | — | — | — | — | **existiert nicht** |

Überstunden und verbrauchter Urlaub sind **abgeleitete Grössen** und brauchen kein
Feld — sie werden aus `schicht_zuweisungen` bzw. `urlaub` live gerechnet.
