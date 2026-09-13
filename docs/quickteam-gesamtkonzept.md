# QuickTeam — Geschäftskonzept & Projektdokumentation

Stand: 26. August 2026 · Zusammengefasst aus dem gesamten bisherigen Projektverlauf

---

## 1. Die Geschäftsidee

**QuickTeam** ist ein SaaS-Tool zur Schicht- und Teamplanung für Gastronomiebetriebe in Österreich und Deutschland.

### Zielgruppe

Ein Gastro-Betreiber, der abends nach Schichtende auf dem Handy kurz reinschaut — nicht am Schreibtisch, nicht mit viel Geduld für Komplexität. Mobile-first als Grundannahme für Design und Priorität, nicht als nachträgliches Feature.

### Positionierung

Bewusst **unterhalb** vollständiger Workforce-Management-Suiten (Papershift, Planday) positioniert:

- Reine Schicht- und Teamplanung, kein integriertes Zeiterfassungs-/Lohnabrechnungssystem
- Marktvergleich: Etablierte Anbieter liegen bei kleinen Teams bei ca. 2,50–3€ pro Mitarbeiter/Monat; QuickTeam bewusst deutlich darunter, da neues Produkt ohne Kundenreferenzen — günstiger Einstieg, um überhaupt erste Kunden zu gewinnen, Preiserhöhung später mit wachsendem Vertrauen und Funktionsumfang möglich
- **Differenzierung durch persönlichen Onboarding-Call:** Etablierte Anbieter verlangen für echten, persönlichen Support extra (Papershift z. B. 99–399€/Monat für höhere Support-Stufen als Dauerabo). QuickTeam bietet stattdessen ein **einmaliges, kostenloses Setup-Gespräch** — nimmt die Einstiegshürde "das versteh ich eh nicht" für Erstnutzer ohne Erfahrung mit Planungssoftware. Skaliert nur bei kleiner Kundenzahl; ab einer gewissen Größe braucht es entweder mehr Personal dafür oder eine Umstellung auf aufgezeichnetes Video + optionalen Call.

### Preismodell (final)

| Plan | Preis/Monat | Grenze | Onboarding-Call |
|---|---|---|---|
| Low | 29€ | bis 15 Mitarbeiter | gegen Aufpreis (49€ einmalig) |
| Medium | 49€ | bis 30 Mitarbeiter | inklusive (30 Min.) |
| Business | 69€ | bis 50 Mitarbeiter, 1 Standort | inklusive (60 Min.) |
| Custom | Auf Anfrage | mehrere Standorte oder >50 Mitarbeiter | individuell |

**Herleitung:** Sinkender Pro-Kopf-Preis mit steigender Größe (Low ~1,93€/MA, Medium ~1,63€/MA, Business ~1,38€/MA) — bewusste, durchgerechnete Kurve nach dem Prinzip "größere Kunden bekommen besseren Stückpreis", alle drei deutlich unter Marktniveau.

**Custom-Grenze bewusst gezogen:** "Ein Chef, mehrere Standorte" ist architektonisch aktuell **nicht unterstützt** (jeder Betrieb = ein eigener Signup, kein gebündeltes Abo über Standorte hinweg). Die Grenze schickt Mehrstandort-Kunden deshalb konsequent zu Custom, statt ein Self-Service-Versprechen zu geben, das die Architektur nicht einlösen kann.

**Stripe-Produktnamen** wurden von Basic/Pro/Business auf Low/Medium/Business umbenannt, um zu den Anzeigenamen zu passen (rein kundensichtbar, betrifft nicht die internen Datenbank-IDs `basic/pro/business`).

### Onboarding-Service — praktische Umsetzung

- Format: 30–60 Min. Videocall, gemeinsame Bildschirmfreigabe
- Buchung: geplant über ein einfaches Tool wie Cal.com/Calendly, eingebettet auf der Preisseite
- Zeitpunkt im Flow: nach Registrierung, wenn der Nutzer bereits "im System" ist

---

## 2. Produktarchitektur — zwei Repos, eine Datenbank

### Die App (separater Entwickler, React Native/Expo)

`github.com/Blank0371/QuickTeamMobile` — die operative Planungsanwendung. Stand V1.0, sehr ausgereift:

- Automatischer Schicht-Solver (Constraint-Optimierung) als eigene Supabase Edge Function (`plan-generieren`)
- Schichttausch, Notfallvertretung, Verfügbarkeiten/Urlaubsanträge
- Ankündigungen, Umfragen, Checklisten
- Push-Benachrichtigungen (nativ, nicht im Web verfügbar)
- 7 Sprachen (de, en, es, fr, ru, tr, uk)
- RLS + ~50 `SECURITY DEFINER`-RPCs, keine Roher-Select-Zugriffe auf sensible Daten

### Die Website (dieses Repo)

Next.js 15, App Router, TypeScript strict, Tailwind v4. Ursprünglich nur Marketing + Auth, im Projektverlauf mehrfach bewusst erweitert:

**Scope-Entwicklung (chronologisch):**
1. Marketing-Website + Chef-Registrierung/Login
2. + Stripe-Zahlung, einmaliger Einrichtungs-Stepper (Konto → Zahlung → Team → Schichten)
3. + **Vollständiges Betriebs-Dashboard**, funktional 1:1 zur App (mit Ausnahme von Push-Benachrichtigungen — technisch nicht im Web möglich)

Jede Scope-Änderung wurde bewusst in `CLAUDE.md` dokumentiert (alter Zustand, neuer Zustand, Datum, Begründung) statt stillschweigend überschrieben.

### Warum die Doppelung bei Rollen/Schichtvorlagen bewusst ist

Sowohl der Website-Wizard als auch die App (`manager.tsx`) können Rollen und Schichtvorlagen anlegen. Bewusste Entscheidung: Web-Formulare sind für initiale Masseneingabe (mehrere Mitarbeiter/Rollen auf einmal) besser geeignet als mobile Eingabe. Konsequenz: Der Wizard richtet sich strikt nach den Konventionen der App (Feldnamen, Wochentag-Zählung, Mindestbesetzungs-Semantik), nicht umgekehrt.

---

## 3. Technische Kernentscheidungen

### Authentifizierung: Code statt Link

Bestätigung läuft über einen **8-stelligen, eingetippten Code**, nicht über einen klickbaren Link. Grund: PKCE (der ursprüngliche Link-Mechanismus) bindet die Sitzung an den Browser, der die Registrierung gestartet hat — bricht, wenn die Bestätigungsmail auf einem anderen Gerät/in einer anderen App geöffnet wird (z. B. Mail-App-eigener In-App-Browser). Bei einer mobilen Zielgruppe kein Randfall. Zusätzlicher Vorteil: kein Scanner-Bot-Risiko (Sicherheitsscanner klicken Links automatisch, tippen aber keine Codes ab).

`verifyOtp()` läuft mit `type: "email"` (Bestätigung, nicht das veraltete `"signup"`) bzw. `type: "recovery"` (Reset).

### Betriebsanlage: Schutz gegen Mehrfachanlage

`registriere_betrieb()` hat selbst **keine** Sperre gegen doppelte Anlage. Schutz kommt aus der Anwendungsschicht: nach Code-Bestätigung wird `meine_betriebe()` geholt, für jede zurückgegebene ID `ist_chef()` geprüft — nur wenn nirgends `true`, läuft die RPC. `meine_betriebe()` liefert Mitgliedschaft, nicht Chef-Eigenschaft — ein reiner Leer-Test wäre nicht ausreichend.

### Zahlung: Stripe, eingebettet, überspringbar

- **Eingebettetes Payment Element** (Stripe Elements), nicht Redirect zu Stripe-Checkout — nahtloser Fortschrittsbalken über den gesamten Einrichtungs-Stepper
- **Eigener `SetupIntent`** statt `subscription.pending_setup_intent` — Letzteres ist bei einem Trial ohne Karte leer. Zusätzlicher Grund: Stripes eigener Setup-Intent zeigt nur Karte + Link, kein SEPA-Lastschrift — für AT/DE-Gastrobetriebe kein Nebenaspekt
- **Zahlungsmethoden im Stripe-Dashboard bewusst kuratiert:** Karte + SEPA-Lastschrift aktiv, irrelevante automatisch vorgeschlagene Methoden (Kakao Pay, Naver Pay, Pix, Bancontact) deaktiviert
- **14-tägige Testphase ohne Kartenzwang** — `trial_settings.end_behavior.missing_payment_method: 'pause'`. Bei Ablauf ohne Zahlungsmittel geht das Abo auf `paused`, nicht `cancel` (lässt sich mit `resume` reaktivieren, kein Neuabschluss nötig)
- **Kritischer Fund:** `subscriptions.resume()` allein reaktiviert das Abo nicht — erzeugt eine offene Rechnung, die erst bezahlt werden muss (dauerte im Test über eine Stunde bis automatischer Einzug). Fix: `nimmAboWiederAuf()` bezahlt die Rechnung sofort nach `resume()`
- **Plan wird aus der Price-ID am Rechnungsposten abgeleitet**, nicht aus Metadaten — vermeidet zwei parallele Wahrheiten bei Planwechsel
- **Kein Ablaufdatum als eigene Spalte** — `betrieb_abonnements` hat keine Trial-Ende-Spalte; Stripes `paused`-Status übernimmt diese Funktion vollständig
- Einzige `service_role`-Ausnahme im gesamten Repo: `app/api/stripe/webhook/route.ts`, mit sechs dokumentierten Bedingungen (u. a. `request.text()` statt `.json()` für korrekte Signaturprüfung)

### Einrichtungs-Stepper

Reihenfolge: Konto (Registrierung + Code-Bestätigung in einem Schritt) → Zahlung (überspringbar) → Team (Rollen + Mitarbeiter-Einladungen) → Schichten (Vorlagen + Mindestbesetzung) → Abschluss.

**Wiedereinstieg vollständig aus vorhandenen Daten abgeleitet, kein Fortschritts-Flag:**

| Beobachtung | Ziel |
|---|---|
| keine Session | /login |
| Session, kein Betrieb als Chef | Konto-Schritt |
| kein Abo bei Stripe (`stripe_subscription_id IS NULL` oder `status = 'gekuendigt'`) | Zahlung |
| `status = 'pausiert'` | Sperrseite |
| keine Rolle im Betrieb | Team |
| keine Vorlage mit Mindestbesetzung | Schichten |
| sonst | Abschluss |

Bekannter offener Punkt: `status = 'gekuendigt'` hat noch keine eigene Sperrseiten-Behandlung — wird relevant, sobald reale Kündigungen vorkommen.

### Dashboard (aktuelle Hauptbaustelle)

Route-Präfix `/dashboard`. Aufbau in Phasen, nach Risiko geordnet:

- **Phase 0 (fertig):** Schale, Positionswahl (ein Login kann mehrere Positionen/Betriebe halten), Sperren-Tor
- **Phase 1a+1b (fertig):** Kalender-Monatsraster + Schichtdetail, rein lesend
- **Phase 2a+2b (fertig):** laufende Mitarbeiter-/Rollenverwaltung, Statuswechsel/Anonymisieren
- **Phase 3a (fertig):** Planungszyklen anlegen
- **Phase 3b (fertig):** Solver-Aufruf (asynchron, Status-Polling statt Warten in der Server Action)
- **Offen:** Phase 4 (manuelle Schicht-Zuweisung), Phase 4.5 (Urlaub/Verfügbarkeiten — nachträglich als fehlend erkannt), Phase 5 (Kommunikation), Phase 6 (Tausch + Notfallvertretung)

**Wichtige Architekturentscheidung:** Der Solver (`plan-generieren`) wird direkt aus dem Browser per `fetch` aufgerufen, nicht über das Supabase-SDK (`functions.invoke`) — spart 66 kB Bundle-Größe, vertretbar weil das Auth-Token ohnehin nicht `httpOnly` und damit im Browser lesbar ist.

---

## 4. Bekannte Fehler und Lücken im geteilten Backend (für den App-Entwickler)

Diese sechs Punkte wurden während der Dashboard-Entwicklung entdeckt, betreffen die gemeinsame Datenbank/Backend-Logik und liegen außerhalb des Website-Repos:

1. **`rollen` hat keine `DELETE`-Policy.** Löschversuche scheitern lautlos (0 betroffene Zeilen, kein Fehler) — bestätigt durch echten Schreibtest. Website fängt das mit einer ehrlichen Fehlermeldung ab, behebt aber nicht die Ursache.
2. **`pruefe_letzter_chef()` hängt an keinem Trigger.** Die Funktion existiert, wird aber nie aufgerufen — ein Chef kann sich selbst deaktivieren und den Betrieb damit für alle unzugänglich machen. **Bereits real eingetreten:** zwei Betriebe (`ShiftTest1`, `SIM_Solver_Test`) haben aktuell null aktive Chefs. Website blockiert Status-Änderungen bei Chef-Zeilen präventiv an der Oberfläche.
3. **`schicht_ansehen` und `schicht_notizen_holen` sind sich uneinig**, wer eine Schicht sehen darf (offene Ausschreibung wird unterschiedlich behandelt).
4. **`schicht_ansehen` liefert keinen `status`** — ohne zusätzlichen Select sähe ein unveröffentlichter Entwurf wie ein bestätigter Dienst aus.
5. **Die Edge Function `einladung-einloesen` ist "verwaist aktiv"** — deployed, funktionsfähig, mintet Sessions gegen einen Hash, wird aber in keinem der beiden Repos aufgerufen.
6. **`planungszyklus_erstellen` prüft keine Zeitraum-Überlappung**, obwohl die eigene Testdokumentation das behauptet — überlappende Zyklen erzeugen doppelte Schichten für dieselben Tage. Website fängt das jetzt mit einer Warnung samt Bestätigungshäkchen ab.

Vollständige Details mit Fundstellen in `docs/projektstand-2026-08-26.md`.

---

## 5. Wiederkehrendes Arbeitsmuster in diesem Projekt

Diese Prinzipien haben sich über den gesamten Projektverlauf bewährt und sollten beibehalten werden:

- **Katalog/DB nachschlagen statt Dokumentation oder Gedächtnis vertrauen.** Mehrfach hat sich gezeigt: Doku und Code behaupten einen Schutzmechanismus, der in der Datenbank schlicht fehlt (`rollen`-Policy, `pruefe_letzter_chef`-Trigger) — beide scheitern lautlos, nur `pg_policies`/`pg_trigger` zeigen die Wahrheit.
- **Empirisch bestätigen vor dem Melden.** Vermutete Bugs wurden wo möglich in zurückgerollten Transaktionen echt nachgestellt, nicht nur aus dem Katalog abgeleitet.
- **Schema/Policies werden von der Website aus nie verändert** — nur gelesen. Änderungen an der gemeinsamen Datenbank laufen ausschließlich über den App-Entwickler.
- **Bewusste Kursänderungen werden dokumentiert, nie stillschweigend überschrieben** — mit altem Zustand, neuem Zustand, Datum, Begründung.
- **Phasenweise Entwicklung, nach Risiko geordnet**, jede Phase endet auf einem gegen die echte DB geprüften, committeten Zustand.
- **Ein lebendiges Projektstand-Dokument** wird bei größeren Meilensteinen neu geschrieben (nicht nur ergänzt), alte Fassungen bleiben mit Überholt-Hinweis erhalten.
- **Testbetrieb 12** (`3a1d698e-2a17-4612-8acd-7f3aa90b5153`) ist ein fester, von der App-Testsuite genutzter Fixture-Datensatz — wird nie durch eigene Tests verändert.

---

## 6. Offene Punkte, die außerhalb von Code liegen

- Echte Rechtstexte (Impressum, Datenschutz, AGB) — aktuell nur Gerüste mit Platzhaltern
- Eigene Domain (aktuell Platzhalter/localhost)
- Store-URLs für App Store/Google Play (App noch nicht veröffentlicht)
- `NEXT_PUBLIC_KONTAKT_EMAIL` für den Custom-Tarif
- Echter SMTP-Absender mit verifizierter eigener Domain (läuft aktuell über Resends Test-Domain)
- Mail-Vorlagen-Konflikt zwischen Website (Deutsch, Code-basiert) und App-Repo (Englisch, `signup-code.html`) — beide liegen im selben Supabase-Projekt, Klärung mit dem App-Entwickler bisher nicht bestätigt abgeschlossen
- Die sechs Backend-Befunde aus Abschnitt 4
