# Terminologie-Glossar Deutsch → Englisch

**Angelegt am 2026-09-10**, abgeleitet aus dem bereits übersetzten Bestand.
Verbindlich für jede weitere Übersetzung in `src/i18n/en.ts`.

## Die Regel

**Für Fachbegriffe ist die Expo-App massgeblich, nicht eigenes Ermessen.**
`../QuickTeam App/src/i18n/locales/{de,en}.json` enthält 532 gepflegte
Schlüsselpaare. Dieselbe Person benutzt womöglich App und Web in derselben
Schicht; „Time off" hier gegen „Vacation" dort liest sich nicht als Nuance,
sondern als zwei verschiedene Funktionen.

Wo die App einen Begriff **nicht** kennt, darf das Web einen eigenen führen —
dann steht er unten mit der Herkunft `Web` und einer Begründung.

Vor jeder neuen englischen Formulierung: erst hier nachsehen, dann in der App
nachschlagen, erst dann selbst formulieren. Neue Begriffe gehören hierher.

## Belegspalte

| Kürzel | Bedeutung |
| ------ | --------- |
| `A:` | Expo-App, Schlüssel in `locales/{de,en}.json` |
| `W:` | Web-Wörterbuch, Pfad in `src/i18n/{de,en}.ts` |
| `Web` | vom Web eigenständig gesetzt, kein Gegenstück in der App |

**Stand des Abgleichs am 2026-09-10:** 15 Begriffe kommen in beiden
Wörterbüchern vor, **alle 15 stimmen überein** — es gibt derzeit keine
Abweichung zwischen Web und App.

---

## Kernbegriffe der Domäne

| Deutsch | Englisch | Beleg |
| ------- | -------- | ----- |
| Betrieb | Business | `A: manager.tabBusiness` · `W: dashboard.gruppeBetrieb` |
| Betriebsname | Business name | `W: validierung.bez.betriebName` |
| UID-Nummer (österr. USt-IdNr.) | VAT ID (UID) | `W: validierung.v.uid.form` — web-eigen, die App kennt keine Abrechnung |
| Betriebseinstellungen | Business settings | `A: manager.businessSettings` |
| Mitarbeiter (als Liste/Bereich) | Employees | `A: manager.tabEmployees` |
| Mitarbeiter (einzelne Person) | **Employee** | `A: manager.denyReasonPlaceholder` („shown to employee") |
| Team | Team | `A: manager.employees` · `W: dashboard.team` |
| Kollegen | Coworkers | `A: calendar.coworkers` |
| Chef | Manager | `A: tabs.manager` · `W: dashboard.rolle.chef` |
| Rolle | Role | `A: messages.osFull` („This role is already full.") |
| Schicht | Shift | `A: calendar.shift` |
| Schichtvorlage | Template | `A: manager.newTemplate` („New template") |
| Mindestbesetzung | Minimum staffing | `A: manager.tplRoles` |
| Besetzung | Staffing | `A: calendar.staffing` |
| Zuweisung / zugewiesen | assigned | `A: messages.emTookBody` |
| Einladung | Invitation | `A: select.invites` |
| Vertrag | Contract | `A: manager.contract` |
| Konto | Account | `A: auth.noAccount` |

## Planung und Kalender

| Deutsch | Englisch | Beleg |
| ------- | -------- | ----- |
| Planung (Bereich) | Planning | `A: manager.csMethod` („Planning method") · `W: dashboard.planung` |
| Planungszyklus | Planning cycle | `A: manager.csCyclesMany` |
| Dienstplan | Schedule | `Web` — kein Gegenstück; siehe Anmerkung 1 |
| Kalender | Calendar | `A: tabs.calendar` · `W: dashboard.kalender` |
| Entwurf (geplante Schicht) | Draft | `A: calendar.planned` |
| veröffentlichen | Publish | `A: calendar.confirmPlannedGo` |
| Wochentag | Weekday | `A: manager.tplWeekday` |
| Woche | Week | `A: calendar.week` |
| Monat | Month | `A: calendar.month` |
| Tag | Day | `A: calendar.day` |
| Frist / Deadline | Deadline | `A: manager.csDeadline` |
| Von … Bis (Zeitraum) | From … To | `A: manager.csRangeStart` / `csRangeEnd` |

## Arbeitszeit

| Deutsch | Englisch | Beleg |
| ------- | -------- | ----- |
| Sollstunden | Target hours | `A: manager.targetHours` |
| Überstunden | Overtime | `A: manager.overtime` |
| Überstundensaldo | Overtime balance | `A: manager.overtimeBalance` |
| Urlaub | Vacation | `A: scheduling.tabVacation` · `W: dashboard.urlaub` |
| Urlaubsantrag | Vacation request | `A: manager.vacationRequests` |
| Urlaubsanspruch | Vacation allowance | `A: manager.vacationAllowance` |
| Verfügbarkeit | Availability | `A: manager.availabilityDeadline` · `W: dashboard.verfuegbarkeit` |
| Wunsch / Vorliebe | Preference | `A: scheduling.savePreferences` |
| Wunschtage | Preferred days | `A: shiftSwap.preferredDays` |
| Arbeite gerne / ungerne | Prefer to work / Prefer not to work | `A: scheduling.preferWork` / `preferOff` |

## Tausch, Notfall, Mitteilungen

| Deutsch | Englisch | Beleg |
| ------- | -------- | ----- |
| Tausch (Vorgang) | Swap | `A: shiftSwap.notPossibleTitle` |
| Schichttausch (Plural, Liste) | Shift swaps | `A: home.swapWaiting` |
| Tausch (Navigationsbereich) | Swaps | `W: dashboard.tausch` — siehe Anmerkung 2 |
| Notfall | Emergency | `A: scheduling.tabEmergency` · `W: dashboard.notfall` |
| Vertretung | Replacement | `A: home.emergencyWaiting` |
| übernehmen | Take / Take over | `A: messages.osTake` · `A: shiftSwap.cardTitle` |
| Mitteilungen (Bereich) | Messages | `A: tabs.messages` · `W: dashboard.mitteilungen` |
| Nachrichten | Messages | `A: home.newMessages` |
| Aufgaben | To-dos | `A: tabs.todos` |

**Nicht in der App belegt:** Ankündigung, Umfrage, Checkliste. Die Web-Seite
legt sie erstmals fest — beim Übersetzen der Mitteilungen hier eintragen.

## Bedienung

| Deutsch | Englisch | Beleg |
| ------- | -------- | ----- |
| Abbrechen | Cancel | `A: manager.cancel` |
| Hinzufügen | Add | `A: manager.addTemplate` |
| Bearbeiten | Edit | `A: manager.editTemplate` |
| Bestätigen | Verify (Code) / Confirm (Vorgang) | `A: auth.verify` · `A: shiftSwap.confirmSwap` |
| Senden | Post (Mitteilung) / Send | `A: messages.post` |
| Speichern | Save | `A: scheduling.savePreferences` |
| Zurück | Back | `A: auth.back` |
| Löschen | **kontextabhängig** — siehe Anmerkung 3 | `A: scheduling.clear` / `manager.deleteTemplate` |
| Heute / Morgen | Today / Tomorrow | `A: home.today` / `home.tomorrow` |
| Anmelden | Sign in | `W: nav.login` |
| Abmelden | Sign out | `A: settings.signOut` · `W: dashboard.abmelden` |
| Registrieren | Sign up | `W: footer.kontoLinks[1]` |

## Rechtliches und Marketing

| Deutsch | Englisch | Beleg |
| ------- | -------- | ----- |
| Rechtliches | Legal | `W: footer.rechtliches` |
| Impressum | Imprint | `W: rechtliches.impressum` |
| Datenschutzerklärung | Privacy Policy | `W: rechtliches.datenschutz` |
| AGB | Terms | `W: footer.rechtlichesLinks[2]` |
| AVV | DPA | `W: rechtliches.avvKurz` |
| Gastronomiebetriebe | restaurants and bars | `W: footer.claim` |
| Registrieren | Register | `W: nav.registrieren` |
| Preise | Pricing | `W: nav.links[1]` |

## Namen und Codes — **nie übersetzen**

| Was | Warum |
| --- | ----- |
| `VERTRAG_TYPEN` (Vollzeit, Teilzeit, Minijob / geringfügig, …) | Der Anzeigetext **ist** der Spaltenwert in `mitarbeiter.vertrag_typ` (`text`, kein CHECK), und `manager.tsx:598` gibt ihn ungeprüft aus. Eine Übersetzung schriebe englische Vertragsarten in eine geteilte Tabelle. |
| Registerangaben im Impressum (Amtsgericht Stuttgart, HRB 795737, EUID, USt-IdNr.) | Tatsachen, keine Übersetzung. Wer „Amtsgericht" zu „District Court" macht, benennt eine Einrichtung, die es unter dem Namen nicht gibt. |
| Firmenname samt Rechtsform (BlankTrading UG (haftungsbeschränkt)) | Teil der Firma. |
| Plan-IDs `basic` / `pro` / `business` | CHECK auf `betrieb_abonnements.plan`. Angezeigt werden Low / Medium / Business. |
| Routenpfade (`/preise`, `/impressum`, `/agb`, `/avv`) | Die Beschriftung wird übersetzt, der Pfad nicht. |

**Die Prüffrage für jeden String: Etikett oder Wert?** Speichert die Datenbank
einen Code und zeigt die Oberfläche einen Namen — dann ist der Name ein Etikett
und wird übersetzt (`LAENDER`, `SPRACHEN`). Speichert sie den Anzeigetext
selbst, wird er nicht angefasst.

## Datums- und Monatsnamen: kein Wörterbucheintrag

Wochentage und Monate stehen **nicht** in `de.ts`/`en.ts`, sondern werden über
`Intl.DateTimeFormat` aus der Locale abgeleitet (`src/lib/dashboard/kalender.ts`).

Nachgemessen am 2026-09-10: `Intl` liefert für `de` zeichengenau dieselben
Namen, die vorher als Konstanten dastanden (Januar … Dezember, Mo … So,
Montag … Sonntag), und für `en` genau die Kurzformen, die auch die App führt
(`A: calendar.monday` = „Mon"). Ein Wörterbucheintrag wäre eine zweite Quelle
für Daten, die die Plattform schon korrekt hat — und die einzige, die veralten
kann.

---

## Anmerkungen

**1 — „Dienstplan" und „Planung" stehen beide in der Sidebar.**
Das Web trennt zwei Bereiche, die die App nicht trennt: `gruppeDienstplan`
(„Schedule") ist die Sidebar-Gruppe über Kalender und Schichten, `planung`
(„Planning") der Bereich für Planungszyklen und Solver-Läufe. Die App nennt
ihren Sammel-Reiter `tabs.scheduling` = „Planung" → **„Scheduling"**. Dieses
dritte Wort ist im Web damit belegt und sollte für nichts anderes benutzt
werden.

**2 — „Tausch" als Navigationsbereich hat kein Gegenstück.**
In der App ist Tauschen ein Abschnitt **innerhalb** einer Schicht
(`shiftSwap.section` = „Swap this shift"), im Web ein eigener Bereich mit einer
Liste. Der Plural „Swaps" benutzt dasselbe Wort wie die App
(`home.swapWaiting` = „Shift swaps …") und ist damit keine Abweichung.

**3 — „Löschen" ist im Englischen zwei Wörter.**
Die App unterscheidet: `scheduling.clear` = „Löschen" → **„Clear"** (eine
Eingabe zurücksetzen) gegen `manager.deleteTemplate` = „Vorlage löschen" →
**„Delete template"** (einen Datensatz entfernen). Beim Übersetzen ist zu
entscheiden, welcher Fall vorliegt; ein pauschales „Delete" für ein
Feld-Zurücksetzen wäre falsch und im Zweifel alarmierend.

**4 — „Übersicht" ist nicht die Startseite der App.**
`W: dashboard.uebersicht` = „Overview". Die App hat `tabs.main` = „Start" →
„Home", das ist aber ein Startbildschirm für Angestellte, keine
Betriebsübersicht. Kein Gegenstück, bewusst eigener Begriff.

## Offene Anbindungen — Text da, Verbraucher fehlt

**`auswahl` im Wörterbuch ist noch nirgends angebunden.** Die vier Einträge
(`landAT`, `landDE`, `spracheDE`, `spracheEN`) existieren seit dem 2026-09-09,
aber beide Verbraucher lesen weiterhin die deutschen `name`-Felder aus
`src/lib/validierung.ts`:

| Konstante | Verbraucher | Bereich |
| --------- | ----------- | ------- |
| `LAENDER` | `einrichtung/konto/daten-abschnitt.tsx:92` | Auth + Stepper |
| `SPRACHEN` | `dashboard/einstellungen/einstellungen-formular.tsx:184` | Dashboard |

Sichtbar wird das auf `/einrichtung/konto` mit `qt_sprache=en`: dort stehen
„Österreich" und „Deutschland" im Auswahlfeld. Das ist **kein Rückschritt** —
die Namen waren immer deutsch, und die ganze Seite ist es noch. Beide Stellen
werden mit ihrem jeweiligen Bereich angebunden; die Übersetzung liegt bereit.

Die Codes (`AT`/`DE`, `de`/`en`) bleiben davon unberührt: sie stehen in
CHECK-Constraints und werden nie übersetzt.

## Entschieden am 2026-09-10

**`dashboard.rolle.mitarbeiter` steht auf „Employee" (Singular).** Der Wert
bezeichnet die Rolle **einer** Person und wird in der Sidebar unter deren Namen
gerendert (`dashboard-sidebar.tsx:234–236`) sowie in der Topbar; daneben steht
`rolle.chef` = „Manager", ebenfalls Singular.

Das ist die **einzige bewusste Abweichung vom wörtlichen App-Beleg**:
`manager.tabEmployees` lautet „Employees", beschriftet dort aber einen Reiter
über einer Liste und nicht einen Menschen. Die App benutzt für die einzelne
Person selbst den Singular (`manager.denyReasonPlaceholder`: „Reason (shown to
employee)") — die Wortwahl bleibt also gewahrt, nur der Numerus folgt der
Stelle, an der der Text steht.

Daraus die Prüffrage für jede weitere Übernahme aus der App: **beschriftet der
Beleg dasselbe wie die Zielstelle?** Ein Reiter, ein Knopf und ein Rollenlabel
können dasselbe Wort in verschiedener Form brauchen.
