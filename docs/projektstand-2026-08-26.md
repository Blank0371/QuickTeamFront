# Projektstand — 2026-08-26

Momentaufnahme dessen, was im Repo tatsächlich **existiert** (Code, nicht Plan).
`CLAUDE.md` bleibt die verbindliche Spezifikation; diese Datei ordnet nur ein,
was davon gebaut ist. Ersetzt `docs/projektstand-2026-08-23.md` — jene Fassung
beschreibt den Stand vor der Dashboard-Kursänderung und ist überall dort
überholt, wo sie sagt, hier ende der Weg mit dem Verweis auf die native App.

**Der Einrichtungs-Stepper ist unverändert fertig.** Neu ist, dass es hinter ihm
weitergeht: dieses Repo baut seit dem 2026-08-26 ein eigenes Web-Dashboard.

Git-Historie seit dem letzten Stand, acht Commits:

```
74215c0  Aufraeumen: ehrlicher Rollen-Loeschweg, zwei ueberholte CLAUDE.md-Stellen
0488490  Kursaenderung 2026-08-26: Web-Dashboard wird in diesem Repo gebaut
2339705  Phase 0: Dashboard-Schale, Positionswahl und Sperr-Tor
2ec8911  Phase 1a: Kalender-Monatsraster, lesend
d1a75c7  Phase 1b: Schichtdetail mit Besetzung, Mindestbesetzung und Notizen
97d058c  Abschlussseite: Dashboard statt App als naechster Schritt
b86c9d7  Phase 2a+2b: laufende Team- und Rollenverwaltung
d808c45  Phase 3a: Planungszeitraeume anlegen und verfolgen
```

---

## 1. Die Kursänderung in einem Absatz

Bis zum 2026-08-25 galt: Dashboard, Schichtplanung und laufende
Mitarbeiterverwaltung gehören ausschliesslich in die Expo-App, die Grenze
verläuft am Zeitpunkt — Erstausstattung hier, alles Spätere dort. Seit dem
2026-08-26 baut dieses Repo das Betriebs-Dashboard funktional **1:1 zur
Expo-App** nach, beide Rollensichten. Ausschlaggebend war ein Testvergleich
zwischen dem Verweis auf die Expo-Web-Version und einer eigenen Weboberfläche.

**Einzige Ausnahme sind Push-Benachrichtigungen**, technisch bedingt:
`expo-notifications` braucht einen nativen Build. Betroffen sind
Geräte-Registrierung und On-Device-Erinnerungen — die Tabelle
`benachrichtigungen` und alles, was darauf sitzt, wird normal nachgebaut.

Die alten Scope-Prüffragen sind ersatzlos hinfällig; sie erklärten genau die
Tabellen zum Verstoss, die jetzt Arbeitsmaterial sind. An ihre Stelle tritt:
**kann die Expo-App das? Dann gehört es hierher, ausser es hängt an Push.**

## 2. Was vom Dashboard steht

| Route | Inhalt | Rolle |
|---|---|---|
| `/dashboard` | Übersicht, Baustand | beide |
| `/dashboard/wechseln` | Positionswahl, Einladungen annehmen | beide |
| `/dashboard/kalender` | Monatsraster, Tagesliste auf schmalen Geräten | beide |
| `/dashboard/schicht/[id]` | Besetzung, Mindestbesetzung, Notizen | beide |
| `/dashboard/team` | Mitarbeiter, Rollen, Status, Anonymisieren | nur Chef |
| `/dashboard/planung` | Planungszeiträume anlegen und verfolgen | nur Chef |

Noch nicht gebaut und in der Navigation sichtbar als „folgt": Mitteilungen.
Ebenfalls offen: Solver-Aufruf, manuelle Zuweisung, Urlaub/Vorlieben,
Schichttausch und Notfallvertretung.

### Zwei Klammer-Gruppen tragen die Trennung

`src/app/(site)/…` bekommt Marketing-Kopfzeile und Fussbereich — Landing,
Preise, Rechtstexte, Auth **und** der Stepper. `src/app/dashboard/(arbeit)/…`
bekommt die Dashboard-Schale. Das Root-Layout trägt nur noch, was für alles
gilt: Sprache, Schriften, Sprungmarke, JSON-LD.

**Keine Adresse hat sich geändert** — Route-Gruppen sind URL-neutral, der Build
listet dieselben Routen wie vorher. Git hat alle 34 verschobenen Dateien als
Rename erkannt.

**Jeder neue Bereich gehört unter `(arbeit)`.** Dort läuft das Tor, und zwar im
Layout: `betreteDashboard()` prüft Anmeldung, Position und Sperre, bevor eine
Seite rendert. Wer eine Route daneben legt, umgeht die Prüfung.

### Die aktive Position steht in einem Cookie

`mitarbeiter` ist eine Anstellungs- und keine Personentabelle: dieselbe
`auth_id` kann mehrere Zeilen halten, auch mehrfach im selben Betrieb — am
Testzugang des Kollegen verifiziert (Chef, Anna und Tim, alle drei in
Testbetrieb 12). Fast jeder RPC nimmt `p_mitarbeiter_id`.

Die App hält die Auswahl im React-Context; im Browser trägt das nicht, weil
jeder Seitenaufruf ein Reload ist und Server Components rendern, bevor ein
Context existiert. Daher `qt_position`, `httpOnly`. **Das Cookie ist ein
Hinweis, kein Nachweis** — es wird bei jedem Zugriff gegen die eigenen aktiven
Anstellungen geprüft, ein unbekannter Wert fällt still auf die Normalfall-Regel
zurück. Bei genau einer Anstellung wird sie auch ohne Cookie genommen.

### Die Sperre bei abgelaufener Testphase gilt nur für Chefs

`betreteDashboard()` leitet auf dieselbe Sperrseite wie der Stepper — nicht auf
eine zweite Umsetzung davon. Für Angestellte greift sie nicht, und das ist
Absicht: `betrieb_abonnements` trägt nur `abonnement_select_chef`, die Abfrage
liefert für sie keine Zeile, und das heisst „nichts zu sehen", nicht „kein
Abo". Daraus eine Sperre abzuleiten hiesse, jeden Mitarbeiter jedes Betriebs
auszusperren. Gesperrt wird die Verwaltung, nicht die Schicht.

## 3. Konventionen: übernommen und bewusst nicht übernommen

**Übernommen**, weil zwei Schreibwege sich sonst widersprechen: montagsbasierter
`wochentag`, Mindestbesetzungs-Semantik, Feldnamen, RPC-Signaturen, die
Rangfolge der Schichtzustände (abgesagt → offen → Entwurf → normal), die
Roster-Privacy (Namen nie aus einem Raw-Select).

**Nicht übernommen:** die Farben. Die App malt Entwürfe in „Blueprint-Blau"
(`#2f5f8f`); unsere Palette kennt kein Blau, und ein Hex-Wert in einer
Komponente wäre doppelt verboten. Der Unterschied Entwurf/veröffentlicht läuft
deshalb über die Form — gestrichelte Umrandung, gedämpfter Text. Rot bleibt
Störungen vorbehalten.

**Nicht übernommen:** das Format der Monatsansicht. `calendar.tsx` zeigt einen
farbigen Punkt je Tag, was auf einem Handy richtig ist und auf einem Bildschirm
Verschwendung. `CLAUDE.md` begründet die Weboberfläche genau damit.

## 4. Für den Kollegen

Fünf Befunde aus der Arbeit am Dashboard, alle am 2026-08-24 bzw. 2026-08-26
gegen die Live-DB verifiziert. **Keiner davon ist von hier aus repariert** — das
Schema wird von diesem Repo aus nicht verändert. Sie stehen hier gebündelt,
weil sie sonst nur in Code-Kommentaren verstreut wären.

Die ersten beiden haben dieselbe Gestalt und sind die teuersten: die
Dokumentation beschreibt einen Schutz, den die Datenbank nicht hat, und beide
scheitern **lautlos** — kein Fehler, keine Warnung, nur eine Wirkung, die
ausbleibt.

### 4.1 `rollen` hat keine DELETE-Policy

`public.rollen` trägt `rollen_insert_chef` (INSERT), `rollen_select` (SELECT)
und `rollen_update_chef` (UPDATE). Es gibt **keine** DELETE-Policy und keine
ALL-Policy. RLS ist aktiv, `authenticated` hat den Tabellen-Grant `d`.

Folge: ein `delete from rollen` trifft null Zeilen und liefert **keinen**
Fehler. Ohne angehängtes `RETURNING` ist der Fehlschlag von einem Erfolg nicht
zu unterscheiden.

Alle anderen Wizard-Tabellen sind abgedeckt (`mitarbeiter_rollen_write_chef`,
`vorlagen_write_chef`, `svm_write_chef` sind ALL; `mitarbeiter_delete_chef` ist
eine eigene DELETE-Policy). Nur `rollen` fällt heraus.

Hier abgefangen: `entferneRolle()` in `src/lib/team.ts` hängt `.select("id")`
an, erkennt die null Zeilen und sagt es. Ausserdem stellt sie die zuvor
gelöschten `mitarbeiter_rollen` wieder her — die beiden Löschungen teilen sich
keine Transaktion, und ohne Rückschreiben wären die Zuweisungen fort und die
Rolle noch da. Bei fehlender Policy ist das nicht der Randfall, sondern jeder
Klick.

**Gebraucht wird:** eine DELETE-Policy auf `rollen` mit `ist_chef(betrieb_id)`.

### 4.2 `pruefe_letzter_chef()` hängt an keiner Tabelle

Die Funktion existiert und wirft „Der letzte aktive Chef eines Betriebs kann
nicht degradiert oder deaktiviert werden". **Aufgerufen wird sie nie** —
`pg_trigger` kennt für `mitarbeiter` nur `trg_mitarbeiter_spaltenschutz`.
`DOCUMENTATION.md` führt sie unter den Triggern, die Integrität erzwingen.

Die Kette: `schuetze_mitarbeiter_spalten` lässt einen Chef jede Spalte ändern
(`if ist_chef(new.betrieb_id) then return new`), also auch den eigenen Status.
Bleibt kein aktiver Chef, liefert `meine_betriebe()` nichts mehr (Filter
`status = 'aktiv'`), `ist_chef()` ist überall falsch, und damit greift **keine
Schreib-Policy des Betriebs mehr**. Der Betrieb wäre für alle verschlossen und
nur per Hand in der Datenbank zu retten.

**Beleg, dass der Zustand erreichbar ist:** zwei Betriebe haben heute schon
null aktive Chefs — `ShiftTest1` (20 Mitglieder) und `SIM_Solver_Test` (100).

Hier abgefangen: `darfStatusAendern()` in `src/lib/dashboard/team.ts`.
Chef-Zeilen bekommen im Dashboard weder Status-Steuerung noch Anonymisieren.
Das ist strenger als nötig — bei zwei Chefs wäre einer entbehrlich —, aber der
Preis dafür ist ein Klick und der Preis des Gegenteils ein verlorener Betrieb.

**Gebraucht wird:** der Trigger, den die Funktion erwartet, BEFORE UPDATE OR
DELETE auf `mitarbeiter`.

### 4.3 `schicht_ansehen` und `schicht_notizen_holen` sind sich uneinig

`schicht_ansehen` gewährt die Sicht auch, wenn die Schicht zur Übernahme
offensteht (`claim` gesetzt: Ausschreibung in meiner Rolle oder gesuchte
Vertretung). `schicht_notizen_holen` prüft dagegen nur `kann_schicht_sehen()`,
und das kennt Chef, `mitarbeiter_sehen_andere_schichten` und „ich bin
zugewiesen" — die Ausschreibung nicht.

Wer also eine offene Schicht betrachtet, bekommt das Detail, aber für die
Notizen ein geworfenes `Nicht berechtigt`.

Hier abgefangen: der Fehler wird geschluckt und der Notizteil weggelassen,
statt die Seite mitzureissen.

**Zu klären:** welche der beiden Bedingungen die richtige ist. Vermutlich
sollte `schicht_notizen_holen` dieselbe Grosszügigkeit haben wie
`schicht_ansehen` — oder umgekehrt.

### 4.4 `schicht_ansehen` liefert kein `status`

`kalender_schichten` gibt `status` mit, `schicht_ansehen` nicht. Ohne ihn sieht
die Detailansicht einer noch nicht veröffentlichten Schicht genauso aus wie die
einer bestätigten — ein Chef könnte einen Entwurf für den fertigen Dienstplan
halten.

Hier behelfsweise gelöst: ein ergänzender Select auf
`schicht_instanzen.status`, gedeckt durch `instanzen_select` mit demselben
`kann_schicht_sehen`, und erst gefragt, nachdem die RPC die Sicht gewährt hat.
Ein zusätzlicher Roundtrip für ein Feld.

**Gebraucht wird:** `'status', si.status` im `jsonb_build_object` von
`schicht_ansehen`.

### 4.5 `einladung-einloesen` ist deployed, aktiv und verwaist

Die Edge Function ist `ACTIVE` (Version 1, `verify_jwt: true`). Sie nimmt einen
`hash` entgegen, legt bei Bedarf einen `auth.users`-Eintrag mit der
synthetischen Adresse `mitarbeiter-<uuid>@invite.local` an, schreibt
`mitarbeiter.auth_id` — korrekt, anders als die gelöschte RPC — und gibt ein
fertiges Token-Paar zurück.

**Aufrufer hat sie keinen.** Sie liegt in keinem der beiden Repos
(`supabase/functions/` im App-Repo enthält nur `plan-generieren` und
`push-versenden`), und der App-Quelltext ruft sie nirgends auf; `select.tsx`
geht über `meine_einladungen()` / `einladung_annehmen()`. Die Tabelle
`einladungen` steht ebenfalls noch da, samt drei Chef-Policies.

Sie ist damit kein toter Datenweg, sondern ein **verwaister aktiver** —
unangenehmer, weil man ihn nicht sieht. Sie mintet Sessions gegen einen Hash,
wenn auch nur für Aufrufer mit gültigem JWT.

**Zu klären:** wird sie noch gebraucht? Wenn nein, gehört sie samt Tabelle
entfernt. Wenn ja, gehört sie in ein Repo.

### 4.6 `planungszyklus_erstellen` prüft keine Überschneidung

`TESTING.md` notiert „Range must not overlap existing `schicht_instanzen`". Die
Funktion prüft `ist_chef(p_betrieb_id)` und `p_ende > p_start`, sonst nichts;
einen EXCLUDE-Constraint auf `planungszyklen` gibt es ebenfalls nicht.

Zwei überlappende Zyklen sind kein Datenbankfehler, aber ein fachlicher: für
dieselben Tage entstünden zweimal Schichten aus denselben Vorlagen.

Hier abgefangen: `findeUeberschneidung()` warnt und verlangt eine ausdrückliche
Bestätigung — als Warnung, nicht als Verbot, denn ein bewusster Sonderzeitraum
in einem längeren ist denkbar.

**Zu klären:** soll die Prüfung in die Funktion, oder ist die Überlappung
zulässig? Falls Ersteres, gehört `TESTING.md` schon heute korrigiert.

### Ältere, weiter offene Punkte

- `meine_einladungen()` kanonisiert Telefonnummern nicht — eine Einladung an
  `0660 …` erreicht ein Konto mit `+43 660 …` nie, lautlos.
- `DOCUMENTATION.md` führt `einladungen` als aktiven Einladungsweg. Der
  tatsächlich benutzte läuft über `mitarbeiter` mit `status = 'eingeladen'`.
- Mail-Vorlagen liegen zentral im Supabase-Projekt, nicht pro Repo — die
  englischen aus dem App-Repo und die deutschen von hier kollidieren.
- `mitarbeiter_einladung_annehmen(p_code)` ist inzwischen **entfernt** (am
  2026-08-24 im Katalog geprüft). Der Punkt aus dem letzten Stand ist erledigt.

## 5. Geprüft, nicht angenommen

| Prüflauf | Umfang |
|---|---|
| Rasterarithmetik | 7 Monatsfälle: Schaltjahr, beide Jahreswechsel, sonntags beginnender Monat |
| Monatsparameter | 12 Unsinnseingaben, fällt still auf den laufenden Monat zurück |
| Überschneidungslogik | 12 Fälle inkl. berührender Grenzen und Jahreswechsel |
| `naechsterMonat` | 4 Fälle inkl. Schaltjahr |
| Routen ohne Session | alle Dashboard-Routen leiten mit 307 auf `/login` |
| Öffentliche Routen | unverändert 200, Kopf- und Fussbereich intakt, genau ein `<h1>` |
| Bundle | Landing weiterhin **103 kB** First Load JS über alle Phasen |

Aus den Daten von Testbetrieb 12 gelernt, rein lesend:

1. **16 von 164 Schichten haben `label = null`** (alle ohne Vorlage) —
   ungeprüft gerendert stünde dort „null".
2. **47 von 164 laufen über Mitternacht**, fast ein Drittel. Kein Randfall.
3. **Bis zu vier Schichten pro Tag** — eine feste Zellenhöhe hätte die vierte
   verschluckt.
4. **`meine_mitarbeiter_id()` ist `limit 1` ohne `order by`** — bei mehreren
   Anstellungen im selben Betrieb liefert sie eine beliebige. Deshalb wird
   `p_mitarbeiter_id` überall explizit übergeben.
5. Die Deadline des vorhandenen September-Zyklus steht auf `21:59:59+00`, also
   23:59:59 Ortszeit — die hier gewählte Konvention entspricht der Praxis.

**Eine Annahme ist dabei gefallen:** der Satz aus `CLAUDE.md`, dass etwas ohne
Mindestbesetzung in der App unsichtbar bleibt, gilt für `schicht_vorlagen`, wo
`scheduling.tsx` danach filtert — **nicht** für bereits erzeugte
`schicht_instanzen`. `kalender_schichten` kennt keinen solchen Filter.

## 6. Was ungetestet ist

**Der gesamte angemeldete Pfad.** Alle Dashboard-Seiten setzen eine Session
voraus; ohne sie ist nur die Umleitung prüfbar. Ungeprüft sind damit: das
Rendern der Schale, die Positionswahl mitsamt Cookie, die Rollentrennung
zwischen Chef- und Mitarbeitersicht, sämtliche Schreibaktionen und jede
Darstellung.

Zwei Zustände fehlen ausserdem in den Testdaten: ausgeblendete Rollen
(`aktiv = false`) und Statuswerte ausser `aktiv`. Diese Pfade sind nur im Code
belegt.

## 7. Was noch offen ist

**Im Repo:**

- Solver-Aufruf (`plan-generieren` anstossen und den Zyklusstatus verfolgen)
- manuelle Schicht-Zuweisung und -Bearbeitung
- Urlaub, Verfügbarkeiten, Schichtvorlieben — am 2026-08-26 ausdrücklich in den
  Scope genommen, nachdem sie beim ersten Zuschnitt gefehlt hatten
- Mitteilungen: Ankündigungen, Umfragen, Checklisten
- Schichttausch und Notfallvertretung
- Notizen lassen sich lesen, nicht schreiben — Phase 1 war lesend
- Landing Page, Rechtstexte, Store-URLs, `NEXT_PUBLIC_KONTAKT_EMAIL`
- `status = 'gekuendigt'` hat in der Wiedereinstiegs-Tabelle keine eigene Zeile
- „Ein Chef, mehrere Standorte" ist nicht unterstützt

**Ausdrücklich nicht Teil dieses Repos:** eine Sperre, die jemanden ohne
Zahlung an der Arbeit *in der nativen App* hindert.
