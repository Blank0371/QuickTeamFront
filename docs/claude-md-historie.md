# CLAUDE.md — Änderungshistorie

Dieses Dokument trägt die **datierte Entscheidungshistorie**, die früher direkt in
`CLAUDE.md` stand. `CLAUDE.md` ist der aktuelle Stand; hier steht, wie er entstanden
ist — alter Zustand, neuer Zustand, Datum, Begründung.

`.claude/rules/product.md` verlangt, dass Umfangs- und Verhaltensänderungen als
datierter Abschnitt festgehalten werden, nie als stille Überschreibung. Diese Datei
erfüllt das: Wer eine Regel in `CLAUDE.md` verändert oder umkehrt, hängt hier einen
datierten Eintrag an (neuestes oben) und schreibt in `CLAUDE.md` nur den neuen Stand.

Die technischen Einzelheiten des jeweils **aktuellen** Standes (Spaltennamen,
Signaturen, Schwellwerte, Dateipfade) stehen in `CLAUDE.md`. Hier steht das *Warum*
und das *Vorher*.

---

## 2026-09-24 — Dienstplan-Export als Excel-Datei statt CSV

**Vorher:** `GET /api/plan-export` lieferte eine CSV in langer Form — Semikolon, BOM,
entschärfte Formelzellen, Datum als Text `DD.MM.YYYY`. **Jetzt:** eine `.xlsx` mit zwei
Blättern, „Dienstplan" (Matrix wie der Aushang) und „Liste" (lange Form mit echten
Datums-/Zeitwerten, Stunden-Spalte, Filter, fixierter Kopfzeile), geschrieben ohne
Abhängigkeit (`src/lib/export/xlsx.ts`). **Begründung:** der Nutzer nannte die Formatierung
„grauenhaft"; in Excel geöffnet (per COM nachgesehen) hatten alle Spalten dieselbe
Standardbreite, Überschriften waren abgeschnitten, nichts war hervorgehoben, es gab keinen
Filter. Das Format selbst war die Ursache — CSV trägt keine Formatierung. Die Wahl der CSV
am 2026-09-21 stützte sich auf „keine neue Abhängigkeit"; das gilt für den eigenen
Schreiber weiterhin.

---

## 2026-09-23 — Notiz zu Tageswünschen (vierte Schema-Ausnahme)

**Vorher:** ein Tageswunsch (`mitarbeiter_schicht_tagesvorlieben`) war nur „gerne"/
„ungerne"; der Chef sah Tageswünsche nirgends (die App zeigt sie ihm nicht, der Solver
liest sie direkt). **Jetzt:** Spalte `notiz text` (nullable, nach `trim()` nicht leer,
≤ 500 Zeichen), vom Mitarbeiter in `/dashboard/verfuegbarkeit` gepflegt; der Chef liest
sie im Schichtdetail („Wünsche für diesen Tag") und gesammelt auf
`/dashboard/verfuegbarkeit`, das für einen Chef statt der Eingabe eine Übersicht aller
Tageswünsche des Teams zeigt (nach Tag oder Person gruppiert).
**Begründung:** Anweisung des Nutzers. Spalte statt Tabelle, weil der PK jeden
Tageswunsch schon zu genau einer Zeile macht und die bestehende RLS (selbst schreiben,
Chef liest) genau passt. **Neue Produktentscheidung ohne App-Gegenstück** — die App
kennt die Spalte nicht; beim Kollegen melden. Migration
`docs/backend/migration-2026-09-23-tagesvorliebe-notiz.sql`.

Im selben Zug (fünfte Ausnahme): die Policies beider Vorlieben-Tabellen auf
`ist_meine_position()` umgestellt. **Vorher** `mitarbeiter_id = meine_mitarbeiter_id(betrieb_id)`
— bei mehreren aktiven Anstellungen im selben Betrieb (Testbetrieb 12, AndroidTestBusiness,
AppleTestBusiness) eine beliebige, Schreiben scheiterte an RLS. **Jetzt** zählt jede
aktive eigene Anstellung. Auf Anweisung des Nutzers.

Nebenbei: der Pfad der Expo-App ist `../QuickTeamMobile`, nicht `../QuickTeam App`.

---

## 2026-09-23 — Datenschutzerklärung an den neuen Einrichtungsweg angepasst (`2026-09-23-draft`)

**Vorher:** Fassung `2026-09-16-draft`. Sie beschrieb den Stand vor dem 2026-09-22: ein
Registrierungsformular für Konto und Betrieb zugleich, das Cookie `qt_registrierung`
(gibt es nicht mehr), einen Promo-Code „beim Anmeldekonto", eine 14-tägige Testphase
und eine freiwillige UID nur für Österreich. Dass die Werbepartnerin oder der
Werbepartner hinter einem Promo-Code von der Anmeldung und den Umsätzen des Betriebs
erfährt, stand nirgends; ebenso wenig, dass Betriebsdaten vor der ersten Zahlung als
Metadata eines Stripe-Kunden liegen.

**Jetzt:** Ziffer 5 in 5.1 Konto, 5.2 Betrieb (samt Stripe-Parkplatz und Promo-Code mit
Weitergabe an den Werbepartner, Art. 6 Abs. 1 lit. f, Widerspruchsrecht), 5.3
Zustimmungsnachweis (Datenschutz beim Konto, AGB/AVV beim Betrieb), 5.4 Zwecke. Ziffer 6
ohne Testphase, UID/USt-IdNr Pflicht, Rabattcode. Cookie `qt_abrechnung` statt
`qt_registrierung`. Werbepartner in der Empfängerliste (Ziffer 13), neue Zeilen in der
Speicherdauer (Ziffer 15), Testphase nur noch als Altvertrags-Fall (15.3), Ziffer 16
neu. Vorgänger samt Prüfsummen unter `docs/rechtliches/archiv/vor-2026-09-23/`.

**Begründung:** Anweisung des Nutzers, nach der Überarbeitung des Werbepartner-Vertrags.
Folge der neuen Fassung: Führungskräfte sehen im Dashboard einen Hinweis zur
Kenntnisnahme (kein Riegel, `ermittleZustimmungBefund`). **Offene Lücke im Code, im Text
ehrlich benannt:** geparkte Betriebsdaten eines nie abgeschlossenen Einrichtungswegs
bleiben am Stripe-Kunden, bis jemand ihre Löschung verlangt — weder `konto-loeschung.ts`
noch ein Cron räumt sie ab.

## 2026-09-23 — Werbepartner-Vertrag rechtlich nachgeschärft (Fassung `2026-09-23`)

**Vorher:** Fassung `2026-09-19`, zwölf Paragrafen. Sie verwies für den Datenschutz auf
die Datenschutzerklärung, die Werbepartner gar nicht behandelt; nannte die Vergütung in
§ 4 Abs. 4 zugleich „Bruttobetrag einschließlich Umsatzsteuer" und „zuzüglich
Umsatzsteuer"; erklärte die Berechnung des Anbieters für „maßgeblich" (Beweislast-
verschiebung); trug eine doppelte Schriftformklausel; regelte weder Vertragsschluss,
Haftung, Werbekennzeichnung noch Markennutzung; und sprach von „Registrierung" und
„Ende der kostenlosen Testphase", die es seit dem 2026-09-22 so nicht mehr gibt.

**Jetzt:** Fassung `2026-09-23`, vierzehn Paragrafen, Vergütungssätze, Stichtag, Frist,
Mindestbetrag, Kündigungsfrist und Änderungsvorlauf **unverändert**. Neu: Vertragsschluss
erst mit Annahme (§ 1 Abs. 4); Tippgeber- statt Handelsvertreterstellung (§ 9);
Werberegeln samt Kennzeichnung, Spam- und Rabattversprechen-Verbot und widerruflichem
Nutzungsrecht (§ 4); Haftung und Freistellung (§ 10); Netto-Vergütung mit
Gutschriftverfahren (§ 8); Abrechnung mit achtwöchiger Einwendungsfrist (§ 7 Abs. 4);
Art.-13-Hinweise im Vertrag (§ 12); Schlussbestimmungen ohne doppelte Schriftform.
Kleine Zusätze, die der Betreiber bestätigen sollte: Bestandskunden der letzten zwölf
Monate zählen nicht (§ 3 Abs. 4), Restguthaben unter 50 € wird nach Vertragsende
ausgezahlt (§ 7 Abs. 3), Verrechnungsfenster sechs Monate (§ 6 Abs. 3). Der PDF-Setzer
hält Überschriften mit ihrem ersten Absatz zusammen.

**Begründung:** Anweisung des Nutzers, den Vertrag so zu fassen, dass ein Anwalt nichts
zu beanstanden findet. Anwaltlich geprüft ist er damit weiterhin **nicht**; die
Einzelheiten für den Prüfer stehen in `docs/rechtliches/legals/README.md`.

## 2026-09-22 — Betrieb entsteht erst nach bestätigter Zahlung, keine Testphase

**Vorher:** Der Betrieb-Schritt (`/einrichtung/betrieb`) legte den Betrieb **sofort** an
(`betriebAnlegen()` → `registriere_betrieb`), bevor irgendeine Zahlung stattfand. Der
Zahlungsschritt gab jedem ersten Abo eines Betriebs 14 Tage Testphase **ohne**
Zahlungsmittel (`trial_period_days` + `missing_payment_method: 'pause'`), und dieser
Schritt war **überspringbar** („Später hinterlegen"). Lief die Testphase ohne Karte ab,
pausierte Stripe das Abo, der Webhook schrieb `pausiert`, und die Sperrseite
`/einrichtung/testphase-abgelaufen` fing das ab. Folge: ein Betrieb konnte dauerhaft in
der Datenbank stehen, ohne dass je Geld floss — genau die „weird overlaps and conflicts",
die der Nutzer nicht mehr wollte.

**Jetzt** (auf Anweisung des Nutzers, Detailfragen per Rückfrage geklärt):

- **Kein halber Betrieb mehr.** Die `betriebe`-Zeile entsteht erst, wenn Stripe die
  Zahlung bestätigt hat. Bis dahin gibt es keine `betrieb_id`; Kunde und Abo werden über
  die Auth-User-ID des Chefs zugeordnet (`pending_user` in der Stripe-Kunden-Metadata),
  und die Betriebsdaten aus Schritt 1 (Name, Land, Chef-Name, Promo-Code) reisen in
  derselben Metadata mit. `betriebAbschliessen()` legt nach bestätigter Zahlung den
  Betrieb an (`stelleBetriebSicher`), verschiebt die Metadata von `pending_user` auf
  `betrieb_id` (`verknuepfePendingMitBetrieb`) — das löst `customer.subscription.updated`
  aus, an dem der Webhook `betrieb_abonnements` schreibt — und schreibt danach Zustimmung
  und Promo-Code. Der Webhook bleibt die einzige Stelle, die `betrieb_abonnements`
  schreibt; **kein neues `service_role`**, **keine Schemaänderung** (die Zwischendaten
  liegen bei Stripe).
- **Keine Testphase.** Jedes Abo ist sofort fällig (`payment_behavior:
  'default_incomplete'`, Erstrechnung wird beim Hinterlegen der Karte bezahlt). Ein
  kostenloser erster Monat läuft über einen Stripe-**Rabattcode (100 %)**, nicht über
  `trial_period_days`. Zahlungsmittel **und** UID sind Pflicht (Rechnungstor
  `rechnungVollstaendig`). „Später hinterlegen" ist entfallen.
- **Schrittfolge:** Konto (`/registrieren`) → Übersicht (`/dashboard/wechseln`, „nicht
  zugeordnet" + „Betrieb einrichten") → Betriebsdaten → Zahlung → *Betrieb entsteht* →
  Team → Schichten. Die Wiedereinstiegs-Ableitung (`ermittleStandFuer`) liest die
  Vorbezahlungs-Phase aus dem Pending-Stripe-Kunden (`holePendingLage`) statt aus einer
  `betrieb`-Zeile, die es noch nicht gibt.
- **Restbestand:** `erstelleAbo` (jetzt immer `default_incomplete`), die Sperrseite
  `/einrichtung/testphase-abgelaufen` und `zahlungsmittelUebernehmen` bedienen nur noch
  den Neuabschluss eines **bestehenden**, gekündigten Betriebs. `trial_period_days`,
  `missing_payment_method: 'pause'` und der Überspringen-Weg kommen für neue Betriebe
  nicht mehr vor (Invariantentest `zahlung-invarianten.test.ts`).

**Begründung:** Nutzerwunsch „a business is not put into the database until the payment
connection with Stripe is confirmed, to avoid weird overlap and conflicts"; die Testphase
wird durch einen 100-%-Rabattcode ersetzt.

---

## 2026-09-22 — Kontoerstellung und Betrieb-Anlage getrennt

**Vorher:** Registrierung und Betrieb-Anlage waren **ein** Vorgang. `/registrieren`
leitete auf `/einrichtung/konto` (Schritt 1 des Steppers) um; dieses eine Formular
sammelte Betriebsname, Land, Chef-Name, E-Mail, Passwort **und** alle drei Zustimmungen.
Weil `registriere_betrieb` eine Session braucht, die es erst nach der Code-Bestätigung
gibt, mussten die Betriebsdaten die Bestätigungsmail überleben: sie reisten durch
`options.data` beim `signUp` und zusätzlich durch einen `registrierung-merker`-Cookie.
`bestaetigen()` legte unmittelbar nach `verifyOtp` den Betrieb an (`stelleBetriebSicher`),
schrieb die drei Zustimmungszeilen und den Promo-Code und ging in den Zahlungsschritt. Ein
angemeldetes Konto ohne Betrieb galt als „in Schritt 1 steckengeblieben" und wurde
dorthin geleitet; für Service-Role-Konten gab es die Sonderfassung „Dein Konto steht — der
Betrieb fehlt noch" (`betriebNachtragen()`).

**Jetzt** (auf Anweisung des Nutzers, Detailfragen per Rückfrage geklärt):

- **Registrierung erzeugt nur ein Konto.** `/registrieren` ist eine eigenständige Seite
  (kein Redirect mehr in den Stepper): E-Mail, Passwort, **Datenschutz-Kenntnisnahme**.
  Nach `verifyOtp` landet die Person auf ihrer Übersicht `/dashboard/wechseln`. Kein
  Betrieb, keine Zustimmungszeile an dieser Stelle.
- **Betrieb-Anlage ist ein eigener Schritt** (`/einrichtung/betrieb`, Schritt 1 des
  Steppers), erreichbar aus der Übersicht („Betrieb einrichten"). Mit bestehender Session
  ruft `betriebAnlegen()` `registriere_betrieb` **direkt mit den Formularwerten** auf —
  der Umweg über `user_metadata` und der `registrierung-merker`-Cookie entfallen. Hier
  wird auch die **AGB/AVV**-Vertragsannahme abgehakt und der Promo-Code eingegeben.
- **Zustimmung ist zweigeteilt.** Datenschutz (persönlich) beim Konto, AGB/AVV
  (betrieblich) beim Betrieb. Geschrieben werden alle drei Zeilen erst beim Anlegen des
  Betriebs (`schreibeZustimmungen`), weil `rechtliche_zustimmungen.betrieb_id` NOT NULL
  ist — die beim Signup zugestimmte Datenschutz-Fassung reist dafür in `user_metadata`
  mit (`zustimmungFuerBetrieb()`).

**Begründung:** Wunsch des Nutzers, Konto und Betrieb als getrennte Vorgänge zu führen —
erst ein Konto anlegen, dann auf einer Übersicht der eigenen Verbindungen entscheiden, ob
man einen Betrieb eröffnet. Als angenehmer Nebeneffekt fällt die gesamte
Metadaten-durch-die-Mail-Mechanik weg: die Session steht, wenn der Betrieb entsteht.

**Benannte Lücke:** Ein Konto, das nie einen Betrieb anlegt (nur Einladungen annimmt),
bekommt von diesem Repo keine Datenschutz-Zeile — die braucht eine `betrieb_id`, und das
Annehmen einer Einladung läuft app-seitig. Offen beim Betreiber, ob das früher geschehen
soll. **Unverändert:** ein Chef = ein Betrieb; Bestätigung über Codes; Soft-Launch-Sperre.

**Berührte Stellen:** `src/lib/validierung.ts` (`kontoSchema`/`betriebSchema` statt
`registrierungSchema`), `src/lib/zustimmung.ts` (`datenschutzSignupVersionen`,
`datenschutzAusMetadaten`, `zustimmungFuerBetrieb`), `src/lib/einrichtung.ts`
(`SCHRITTE`: `betrieb` statt `konto`), `src/lib/betrieb.ts`, `src/app/(site)/registrieren/`
(neu: Seite + Abschnitte + Aktionen), `src/app/(site)/einrichtung/betrieb/` (neu),
`einrichtung/konto/` und `src/lib/registrierung-merker.ts` (entfernt),
`zustimmung-feld.tsx` (`variante`), i18n `de`/`en`, `dashboard/wechseln` (Link).

---

## 2026-09-21 — Payment-Rework: UID/USt-IdNr für AT und DE Pflicht, Stripe-Rabattcode, Monats/Jahres-Umschalter

**Vorher:**
- **UID** war ein Feld nur für Österreich (`ATU` + 8 Ziffern), dort seit dem
  2026-09-18 am Rechnungstor Pflicht. Für Deutschland gab es kein Feld; ein
  hereingereichter Wert wurde in `pruefeRechnung` verworfen und in
  `speichereRechnungAmKunden` bei Land ≠ AT sogar aktiv **entfernt**
  (`entferneUids`).
- **Rabattcodes:** Es gab nur den internen Partner-Promo-Code
  (`promo_codes`/`betrieb_promo_codes`), der **keinen** Nachlass gewährt, sondern
  festhält, über wen ein Betrieb kam. Einen echten Stripe-Rabatt konnte der Kunde
  nirgends eingeben.
- **Intervall:** monatlich/jährlich wurde nur auf `/preise` gewählt und per Cookie
  (`abrechnung-merker.ts`) durchgereicht. Schritt 2 zeigte die Wahl nur an
  („Kein Umschalter, nur die Anzeige"); ein Wechsel eines bestehenden Abos war
  nicht vorgesehen.

**Jetzt** (auf Anweisung des Nutzers, Scope per Rückfrage geklärt):

- **UID/USt-IdNr Pflicht für beide Länder.** `feldSchemata.uid` akzeptiert beide
  Formate (`ATU########` / `DE#########`); `rechnungSchema.superRefine` verlangt eine
  Nummer für AT **und** DE und erzwingt das landrichtige Format.
  `rechnungVollstaendig()` prüft die Nummer bei Stripe für `country ∈ {AT, DE}`.
  `setzeUid` hinterlegt sie als `eu_vat` (gilt für DE wie AT); der frühere
  „bei Land ≠ AT entfernen"-Zweig entfällt. Feld erscheint in Schritt 2 und im
  Rechnungsformular für beide Länder mit landabhängiger Beschriftung.
  *Begründung:* Geschäftsregel „kein Verkauf ohne UID/B2C". Für DE ändert die
  Nummer die Steuer nicht (Inlandsumsatz), gilt aber als Unternehmernachweis.

- **Stripe-Rabattcode.** Neues freiwilliges Feld `coupon` in Schritt 2;
  `pruefePromotionCode()` prüft gegen aktive Stripe-`promotion_codes`, ein gültiger
  wird als `discounts` in `erstelleAbo` gelegt, ein unbekannter ist ein Feldfehler
  (`v.coupon.unbekannt`). Getrennt vom internen Partner-Promo-Code. Bestandskunden:
  über das Kundenportal (Dashboard-Config „allow promotion codes").

- **Monats/Jahres-Umschalter in Schritt 2.** Echter Toggle (`intervall`-Radiofeld);
  `planWaehlen` zieht den Formularwert dem Cookie vor, `wechslePlan` stellt ein
  bestehendes Abo auf die andere Preis-ID um. Der Wechsel eines **laufenden** Abos
  im Dauerbetrieb läuft über das **Stripe-Kundenportal** (Proration von Stripe),
  kein eigener In-App-Umschalter — so bleibt der Zahlungs-Codepfad bei der
  bestehenden „Abo verwalten"-Philosophie.

**Gates:** `npm run typecheck`, `npm run build`, `npm test` grün; die vier
`rechnung.test.ts`-Fälle zur alten DE-Optionalität auf die neue Pflicht umgestellt.

---

## 2026-09-21 — Mobile Dashboard-Navigation: Tab-Leiste neu, Konto-Kachel, Theme-Umschalter, Kontolöschung verlinkt

**Vorher:** Die untere Tab-Leiste (`DashboardTableiste`, seit 2026-09-20) zeigte
drei Kernkacheln plus „Mehr". Sprache und Abmelden standen oben rechts in der
Topbar (auf jeder Breite), der Positionswechsel dort nur unterhalb `lg`. Einen
ausdrücklichen Hell/Dunkel-Umschalter gab es nicht — die Farben folgten allein
`prefers-color-scheme`. `/kontoloeschung` war bewusst **von nirgends** verlinkt.

**Jetzt** (auf Anweisung des Nutzers, mit Rückfrage geklärt):

- **Fünf Kacheln, feste Reihenfolge:** Mitteilungen · Planung/Manager · Übersicht ·
  Kalender · Konto. Die mittlere Kachel öffnet die Bereiche ohne eigene Kachel und
  heisst für Chefs „Manager" (Team, Planung, Betriebseinstellungen …), für
  Angestellte „Planung" (Urlaub, Verfügbarkeit, Tausch, Notfall).
- **„Konto"-Kachel** rechts sammelt, was vorher oben rechts stand (Sprache,
  Abmelden) plus Darstellung, Verbindungen (Positionswechsel, umbenannt zu
  „Verbindungen verwalten" / „Manage connections") und Kontolöschung. Sie heisst
  bewusst „Konto", nicht „Einstellungen" — Letzteres trägt schon der Chef-Bereich
  für Abo/Abrechnung, der jetzt in der Manager-Kachel liegt.
- **Topbar-Handgriffe nur noch ab `lg`.** Auf schmalen Geräten trägt sie die
  „Konto"-Kachel; auf breiten (keine Tab-Leiste) weiterhin die Topbar — jetzt
  auch mit dem neuen Theme-Umschalter.
- **Hell/Dunkel/System-Umschalter** (`ThemaWahl`, Cookie `qt_theme` →
  `data-theme` am `<html>`, Server-Action wie `SprachWahl`). `globals.css`
  refaktoriert: die gemessenen Dunkelwerte stehen einmal als `--qt-dark-*` und
  werden an zwei Auslösern angewandt (Systemwunsch **und** ausdrückliche Wahl);
  eine ausdrückliche Wahl geht dem System vor. Keine der gemessenen Zahlen wurde
  geändert — nur ihre Anwendung.
- **`/kontoloeschung` aus dem angemeldeten Dashboard verlinkt** (nur dort, als
  destruktiver Eintrag). Öffentlich/unangemeldet bleibt sie unverlinkt und
  `index:false`; die URL ändert sich nicht (kein Zustimmungs-Neulauf).

**Begründung:** Der Nutzer wollte eine daumengerechte, rollenbewusste
Mobilnavigation und die Konto-/Darstellungsfunktionen dort, wo der Daumen sie
erreicht. Die Verlinkung der Kontolöschung macht die Zusage aus Datenschutz 15.2
(„jederzeit selbst löschen") auffindbar, statt sie hinter einer abzutippenden
URL zu verstecken — die Sperre gegen einen *öffentlichen* Weg bleibt.

## 2026-09-19 — Werbepartner-Vertrag festgelegt und aus dem Entwurfsstand genommen

**Vorher:** `docs/rechtliches/legals/Werbepartner-Vertrag-QuickTeam-de-en.md` war ein
Vorlagenentwurf. Der Kopf trug einen Entwurfsvermerk („pre-lawyer draft"), die
Vergütungssätze in § 4 waren ausdrücklich als **Beispielwerte** bezeichnet, und in
eckigen Klammern standen ungefüllte Angaben: Auszahlungstermin, Auszahlungsfrist,
Mindestauszahlungsbetrag, Kündigungsfrist und Vorlauf für ein Änderungsangebot. Das
PDF unter `/promocode/antrag` gab sie so an Bewerber weiter — ein Formular, das nach
seinem eigenen Vorwort noch nicht verwendet werden durfte.

**Jetzt:** alle Klammerwerte sind festgelegt, der Entwurfsvermerk ist weg, Fassung
`2026-09-19`. 20 % des Nettoumsatzes je geworbenem Betrieb in den ersten zwölf
Monaten, danach 10 %; Stichtag der erste Tag jedes Kalendermonats, Auszahlung
innerhalb von 14 Tagen, Mindestbetrag 50,00 €; Kündigungsfrist vier Wochen;
Änderungsangebot mindestens sechs Wochen vorher. Deutsch und Englisch gemeinsam
geändert.

**Begründung:** Anweisung des Nutzers, die Werte sind seine Geschäftsentscheidung. Die
Sätze 20/10 standen schon als Beispiel im Text und wurden verbindlich übernommen; der
Mindestbetrag von 50,00 € hält die Zahl der SEPA-Überweisungen klein, und die
Kündigungsfrist von vier Wochen ist kürzer als der Vorlauf von sechs Wochen für ein
Änderungsangebot — wer eine Änderung nicht mitmachen will, kann vorher kündigen,
statt von ihr überholt zu werden.

**Ausdrücklich benannt:** dass der Entwurfsvermerk fällt, war ebenfalls die Anweisung
des Nutzers; anwaltlich geprüft ist der Text damit **nicht**. Das unterscheidet ihn
von AGB, AVV und Datenschutzerklärung, die den Vermerk behalten — und es ändert nichts
an `SOFT_LAUNCH`, der an deren Stand hängt und nicht an diesem Vertrag. Der Befund
steht im README der Rechtstexte, damit ein Prüfer ihn nicht erst suchen muss.

**Nebenbei behoben:** der Kopf verwies für den Vorrang der deutschen Fassung auf einen
nicht existierenden „§ 13 Abs. 4"; richtig ist § 12 Abs. 5 (auch in Teil C). Und der
PDF-Setzer kennt jetzt `<!-- seitenumbruch -->`, weil Steuerstatus-Ankreuzfelder und
Unterschriftsblock vorher über Seitengrenzen zerfielen — bei einem Formular zum
Ausdrucken und Unterschreiben ist das kein Schönheitsfehler. Aktueller Stand in
`CLAUDE.md`, Abschnitt „Die Werbepartner-Seite `/promocode`".

## 2026-09-15 — Promo-Code bei der Registrierung

**Vorher:** Abschnitt A der Registrierung fragte nur Betriebs- und Zugangsdaten ab.
**Jetzt:** ein freiwilliges Feld „Promo-Code"; der benutzte Code je Betrieb steht in
`betrieb_promo_codes`. Neue Produktentscheidung auf Nutzer-Anweisung — die Expo-App
hat keine Registrierung und damit kein Gegenstück.

Nachtrag am selben Tag: nur zugelassene Codes (`promo_codes`-Liste, RPC
`promo_code_gueltig`), Prüfung vor dem `signUp`. Solange `promo_codes` leer ist, wird
jeder Code als unbekannt abgewiesen — Codes anlegen, bevor sie verteilt werden.
Details und aktueller Stand in `CLAUDE.md`, Abschnitt „Promo-Code".

Schema-Ausnahme (dritte überhaupt), auf Nutzer-Anweisung: Tabellen
`betrieb_promo_codes` und `promo_codes`, RPC `promo_code_gueltig`, Spalte
`promo_codes.email`. Rein additiv. Quellen `docs/backend/migration-2026-09-15-*.sql`.

---

## 2026-09-14 — Sammeltag: Abo-Härtung, Löschung, Export, Rechnungsdaten

**Zwei Fehler auf dem Weg aus der Sperre.**
- `ZahlungsFormular` schickte die `return_url` fest auf `/einrichtung/zahlung`, auch
  von der Sperrseite. Da Schritt 2 einen gesperrten Betrieb vorher auf die Sperrseite
  umleitet und `redirect()` den Query-String verwirft, kam `?setup_intent=` nie an —
  die bestätigte Zahlungsmethode wurde ohne Fehlermeldung nie übernommen (jedes
  Zahlungsmittel mit Weiterleitung: PayPal, Bank, 3DS). Jetzt gibt die Sperrseite
  `rueckkehrPfad` mit.
- `pausiert`/`gekuendigt` wird jetzt bei Stripe gegengefragt (`aboLageBeiStripe()`),
  weil die Zeile nur der Webhook ändert und ein zahlender Kunde sonst wieder vor
  „Kostenpflichtig fortsetzen" stand. Beide Tore (`ermittleStandFuer`, `pruefeSperre`)
  fragen dieselbe Frage, sonst schicken sie den Kunden im Kreis. Stripe kann die Sperre
  aufheben, nicht erfinden; ist Stripe nicht erreichbar, bleibt sie.

**Eine Testphase je Betrieb.** Vorher gab `erstelleAbo()` jedem neuen Abo
`trial_period_days` — ein gekündigter Betrieb bekam beim Neuabschluss die nächste
Testphase, kündbar/neu abschliessbar in Endlosschleife (unbegrenzt kostenlos). Jetzt
gibt es die Testphase nur, wenn der Stripe-Kunde nie ein Abo hatte
(`holeAboVerlauf()`, `status: "all"`); jedes weitere Abo entsteht
`default_incomplete` (offene Erstrechnung, kein Einzug ohne Karte, verfällt nach 23 h).
AGB § 5 Abs. 2 deckt die Regel.

**Gescheiterte Erst-Lastschrift kündigt das Abo.** Vorher blieb ein per SEPA
neu abgeschlossenes Abo `active`, auch wenn die Lastschrift scheiterte (Stripe
storniert nur die Rechnung) — ein Monat ohne Zahlung, nach jeder Kündigung
wiederholbar. Jetzt behandelt der Webhook `invoice.payment_failed` für die Erstrechnung
(`billing_reason = subscription_create`) und kündigt das Abo bei Stripe. Das ist die
**einzige Stelle, an der der Webhook bei Stripe schreibt**; in der DB bleibt es bei
`betrieb_abonnements`. Restlücke: bis die Bank zurückgibt, läuft der Zugang (Tage).

**Vertragsende sperrt alle, pausierte Abos enden nach 90 Tagen.** Vorher sperrte das
Dashboard-Tor nur Chefs (Angestellte eines gekündigten Betriebs arbeiteten unbegrenzt
weiter, entgegen AGB § 6 Abs. 2), und ein pausiertes Abo blieb bei Stripe für immer
pausiert (der Löschjob fasst `pausiert` nie an). Jetzt: `pruefeSperre()` fragt für
Nicht-Chefs `betrieb_vertrag_beendet()` → `/dashboard/beendet`; Cron
`/api/cron/testphasen-beenden` (täglich 02:00 UTC) kündigt pausierte Abos, deren
`trial_end` > 90 Tage zurückliegt; DB-Job löscht 30 Tage später (Tag 90+30, AGB r2
§ 5 Abs. 3). Teile B/C aus `docs/backend-befunde-2026-09-14.md` auf DB-Teil A.

**Rechnungsangaben vor der Aktivierung** (Entscheidung der Betreiberin). Vorher ging
nur das Land an Stripe. § 5 Abs. 5 AGB / § 14 Abs. 4 UStG verlangen Firma und Anschrift.
Jetzt fünf Pflichtfelder über dem Zahlungsformular; das Tor sitzt in
`zahlungsmittelUebernehmen()` (`rechnungVollstaendig(kundeId)` liest den Stand bei
Stripe, wegen 3DS-Rückkehr ohne Formular und wegen direkter Server-Action-Aufrufe).
Kostenloses Testen ohne Karte/Anschrift bleibt möglich; Pflicht wird es erst, wenn
eine Rechnung entstehen kann.

**Export: Keyset-Blättern statt `range()`, und Unvollständigkeit wird benannt.**
Versatz-Blättern übersprang/dupliziert Zeilen bei gleichzeitigen Änderungen. Jetzt
Keyset nach Primärschlüssel; Garantie im Paket („jede während des Lesens unveränderte
Zeile erscheint genau einmal", kein Schnappschuss). Fehlende Anhänge:
`vollstaendig: false`, `-UNVOLLSTAENDIG.json`, Antwortkopf. Gespeicherte Pfade werden
eingeordnet, nie abgerufen (SSRF-Schutz).

**Korrektur: ein Spaltenrecht entzieht kein Tabellenrecht.** Der Entwurf
`migration-2026-09-13-notfallgrund.sql` benutzte `revoke select (grund) …`, was
wirkungslos ist, solange `authenticated` SELECT auf der ganzen Tabelle hält. Richtig:
erst `revoke select on <tabelle>`, dann `grant select (<erlaubte Spalten>)`, im selben
Lauf mit `has_column_privilege()` geprüft. Wer eine Spalte schützt, prüft fünf weitere
Wege (geerbte Rechte, PUBLIC-Grants, Views, SECURITY-DEFINER-Funktionen,
Filter/`RETURNING`).

**Schema-Ausnahme (zweite):** Löschung nach Vertragsende, Teil A aus
`docs/backend-befunde-2026-09-14.md` (`loeschung_a1`–`a5`). Nicht rein additiv:
`betrieb_abonnements.beendet_am` + Trigger, Trigger auf `rechtliche_zustimmungen` und
`betriebe`, Schema `private`, Cron `betriebe-aufraeumen`, RPC `betrieb_vertrag_beendet()`.
Eingespielt ohne Test, auf Anweisung. Grund: AGB § 5 Abs. 3 / § 6 Abs. 4 und
Datenschutzerklärung 15.3 versprachen eine Löschung, die es nicht gab.
Achtung: `migration-2026-09-14-vertragsende-und-loeschung.sql` ist ein paralleler,
nie angewendeter Entwurf und darf **nicht** zusätzlich eingespielt werden.

**`?lang=de|en` für Links aus der App.** Vorher kam die Sprache nur aus `qt_sprache`.
Die Expo-App öffnet Rechtstexte im In-App-Browser ohne Cookie — jeder sah Deutsch.
Jetzt geht `?lang=` dem Cookie vor, nur für diese Anfrage, ohne etwas zu speichern
(Kopfzeile `x-qt-sprache`, `src/i18n/sprach-parameter.ts`). Nur GET/HEAD, damit der
Umschalter-POST weiter gewinnt.

---

## 2026-09-13 — Rechtliche Durchsicht: Portal, Steuer, Zustimmung, Export

**Kündigung über das Stripe-Kundenportal** (Befund 5 der externen rechtlichen
Durchsicht; Betreiberin entschied Portal statt eigenem Knopf). Vorher gab es keine
Oberfläche zum Kündigen, nur E-Mail. Jetzt „Abo verwalten" in
`/dashboard/einstellungen` (`aboVerwalten()`). Kunden-Id serverseitig abgeleitet.
Dazu: Zahlungsansichten lesen Betrag/Testphasenende/erste Abbuchung aus dem Stripe-Abo,
nicht aus `plaene`/`TESTPHASE_TAGE` (`src/lib/abo-konditionen.ts`).

**Umsatzsteuer über Stripe Tax.** Vorher trug kein Abo `automatic_tax` — Stripe buchte
netto als brutto ab, obwohl AGB § 5 Abs. 1 „zzgl. USt." sagt. Jetzt `automatic_tax:
{ enabled: true }` in `erstelleAbo()`, `wechslePlan()`, `uebernimmZahlungsmittel()`;
Standort aus `betriebe.land`; österreichische Betriebe bekommen ein freiwilliges
UID-Feld (`eu_vat`, Reverse Charge). Voraussetzung im Stripe-Dashboard: Stripe Tax
aktiv, Registrierung für Deutschland, Preise `tax_behavior: exclusive`.

**Eine neue Fassung sperrt nicht mehr.** Vorher verlangte `ermittleZustimmungStand()`
für alle drei Dokumente die aktuelle Fassung und sperrte sonst die ganze Verwaltung.
Jetzt (`ermittleZustimmungBefund()`): fehlende AGB/AVV-Zeile sperrt; ältere Fassung →
Hinweisstreifen; Datenschutzerklärung sperrt gar nicht (Art. 13 DSGVO informiert, nicht
zustimmen). Grund: AGB § 13 Abs. 2/3 — solange der Kunde einer Änderung nicht zustimmt,
gelten die bisherigen Bedingungen. Dazu: Datenschutz wird je Person geprüft (nicht je
Betrieb); `sprache` und `inhalt_hash` (sha256 der deutschen Fassung) werden jetzt
geschrieben. Fassungen dürfen auseinanderlaufen (AGB/Datenschutz `2026-09-13-r2-draft`,
AVV `2026-09-13-draft`).

**Kündigung und Export kommen an jeder Sperre vorbei.** `betreteOhneTore()` prüft
Anmeldung/Anstellung/Position, lässt aber die wirtschaftlichen Tore weg. Zwei Aufrufer:
`aboVerwalten()` und `/api/betrieb-export`. Vorher fingen die Tore genau die Zustände
ab, in denen man kündigen oder Daten exportieren will. Berechtigung unverändert.

**Betriebsexport gebaut.** `GET /api/betrieb-export`, JSON-Paket. Füllt AGB § 6 Abs. 4/5
(„strukturiertes, gängiges, maschinenlesbares Format"), das es vorher nur als Satz gab.
Vier Regeln (Tabellenliste gepflegt, eigene `betrieb_id`-Eingrenzung, Seiten,
vier Anonymisierungs-Eingriffe) und die aktuellen Grenzen stehen in `CLAUDE.md`.

**Landingpage bewegt sich nur ab 1024px.** Vorher lief die Bewegung auf jeder Breite,
obwohl die grosse Kalender-Sequenz mobil per `display:none` fehlte — Hero-Inhalt zog
sich vor nichts zurück, Versprechen-Blöcke blieben bei fehlendem/spätem JS oder
schnellem Wischen unsichtbar, der Sprunganker `#kalender` sass auf der desktop-only
Section. Jetzt kapseln alle vier Client-Inseln ihre Bewegung in
`gsap.matchMedia("(min-width:1024px)")` mit `mm.revert()`-Cleanup; der mobile
Kalenderabschnitt ist statisches Markup; der Anker sitzt am immer dargestellten Wrapper.
`gsap.matchMedia` (nicht ein `if`), damit GSAP beim Verkleinern die Inline-Stile und
ScrollTrigger selbst zurücknimmt. `prefers-reduced-motion` gilt vor der Breitenabfrage.

**Die Löschmigration ist gesperrt.** `migration-2026-09-13-aufbewahrung.sql` wird nicht
angewendet, bis vier Punkte erledigt sind (belastbares Vertragsende-Datum, Exportfristen
nachgewiesen, `trg_letzter_chef` geklärt, Sandbox-Erprobung). Sperrliste im Kopf der
Datei.

---

## 2026-09-11 — Öffentliche Registrierung bleibt offen; Bestandsbetriebe nachgefragt

**`disable_signup` wird zurückgenommen.** Regel vom 2026-09-09 hatte
`disable_signup = true` verlangt (Registrierung als „unterste Sperre" unter
`SOFT_LAUNCH`); Testkonten nur über `auth.admin.createUser()`. Jetzt: `disable_signup`
bleibt `false`, die öffentliche Registrierung ist dauerhaft offen und **kein
Sicherheitsproblem** — ein Auth-Konto ohne Anstellung ist wertlos (`meine_betriebe()`
leer, `ist_chef()` überall falsch). Die Zugriffskontrolle liegt bei Vertragsannahme und
Zahlung, nicht bei der Kontoerstellung. `SOFT_LAUNCH` bleibt unberührt und in Produktion
`an`. Ausführlich in `docs/audit-a/entscheidung-disable-signup-2026-09-11.md`. Für
Testkonten sind seither beide Wege erlaubt (`/registrieren` + `hole-code.mjs`, oder
Service-Role).

**Bestandsbetriebe werden zur Zustimmung nachgefragt.** Wer vor dem 2026-09-10
registriert hatte, hatte den Zustimmungshaken nie gesehen. Jetzt fragt
`pruefeZustimmung()` im Dashboard-Tor für Chefs, ob der Betrieb zu allen drei Dokumenten
eine Zeile in der aktuellen Fassung hat; fehlt eine → `/dashboard/zustimmung`. Gefragt
wird nach dem Betrieb, geschrieben mit der eigenen `auth_id`. Angestellte bleiben
unberührt. Reihenfolge: erst `pruefeSperre`, dann `pruefeZustimmung`.

---

## 2026-09-10 — i18n-Mechanik, Rechtstexte als Dokumente, Zustimmungstabelle

**i18n-Mechanik für Seiteninhalt.** Vorher war Zweisprachigkeit nur Wörterbuchpaar +
Umschalter; Client-Inseln und Zod-Meldungen hatten keinen Weg zur Übersetzung. Jetzt
drei Bausteine: `src/i18n/server.ts` (Server-Helfer), `sprach-provider.tsx` (Context
für Fehlergrenzen + Validierung, sonst Props), `text.ts` (Zod-Meldungsschlüssel). Details
in `CLAUDE.md`, Abschnitt „Zweisprachigkeit". Nebenbei behoben: fünf `getDictionary()`
ohne Locale lieferten immer Deutsch.

**Aus Gerüsten werden Dokumente.** Vorher: `/impressum`, `/datenschutz`, `/agb` als
Gerüste mit markierten Platzhaltern. Jetzt liegen die Texte vor und werden gerendert;
`PH`/`EntwurfsHinweis` entfernt; `/avv` neu (Vorlage mit Kundenlücken, Hinweiskasten).
`RechtsDokument` liest die Datei nach `qt_sprache`; der eigene `?sprache=`-Umschalter
auf `/datenschutz` ist entfallen. Das Impressum übersetzt Rubriken, keine Angaben.
`MarkdownText` kann seither Tabellen und Blockzitate (AVV Anlage 3). Reviewer-Hinweis
aus den englischen Fassungen entfernt (`/agb` ist öffentlich). `SOFT_LAUNCH` bleibt —
die Texte sind vollständig, aber laut README „pre-lawyer drafts", also nicht final.
Ein Verzeichnis statt zwei: alle Rechtsrouten lesen aus `docs/rechtliches/legals/`.

**Zustimmungstabelle gebaut** (erste Schema-Ausnahme, ausdrücklich freigegeben).
Rechtliche Vorprüfung: AGB § 7 Abs. 3 setzt Abschluss des AVV bei Registrierung voraus,
im Formular stand nichts. Die Expo-App fragt zu, legt es aber gerätelokal in
AsyncStorage ab — serverseitig gab es nie einen Nachweis. Neue, additive Tabelle
`rechtliche_zustimmungen`. Aktueller Schema-/RLS-/Flow-Stand in `CLAUDE.md`.

---

## 2026-09-09 — Zweisprachigkeit live; Lighthouse belegt; disable_signup (überholt)

**Die Seite liefert `de` und `en` aus**, Umschalter oben rechts. Wörterbücher als
getippte Objekte, kein next-intl.

**Lighthouse erstmals gemessen** (nicht behauptet): Accessibility 100 auf `/dashboard`
und beiden Kalender-Varianten; Übersicht startete auf 96 (ein `color-contrast`-Fehler an
den Sidebar-Initialen, `text-signal` auf `bg-signal-weak` 3.94:1, behoben mit
`text-text`). SEO/Agentic Browsing niedrig, aber für `index:false`-Dashboards ohne
Aussagekraft.

**`disable_signup = true`** eingeführt — am 2026-09-11 wieder zurückgenommen (siehe dort).

---

## 2026-09-08 — Zwei Testbetriebe, zwei Zwecke

Nach einem nicht sauber rückbaubaren Solver-Testlauf festgelegt: „Test" trägt dauerhafte
Fixtures (nur Lesen/gezielte Einzeländerung mit Rückbau), „QT-Sandbox-Test" ist für
zustandsverändernde Läufe. Grund: `geplante_schichten_verwerfen(p_betrieb_id)` löscht
**jede** `geplant`-Instanz im Betrieb, nicht die eines Laufs — ein Rückbau in „Test"
hätte einen vorbestehenden Datensatz mitgenommen. Testbetrieb 12 bleibt für beides
gesperrt (Testsuite der App).

---

## 2026-09-07 — Wizard-Feinschliff aus einem Kollegen-Test

**Rollen werden gesammelt, nicht sofort geschrieben.** Vorher ging jede Rolle beim
Klick sofort in `rollen`. Da `rollen` keine DELETE-Policy hat (RLS filtert das DELETE
still, null Zeilen) und `UNIQUE (betrieb_id, name)` den Namen blockiert, lief „anlegen,
vertippt, weg damit" in eine Sackgasse. Jetzt hält Schritt 3 die Rollen im
Formularzustand und schreibt gebündelt beim Weitergehen/ersten Einladen. Kompensation,
kein Fix — für schon geschriebene Rollen gilt die Sperre unverändert (`art: "gesperrt"`).
Preis: der Rollen-Editor braucht JavaScript.

**Doppelprüfung beim Einladen ist Name *und* Kontakt.** Vorher verhinderte eine
übereinstimmende E-Mail/Telefon im selben Betrieb das Anlegen. Das verbot, was das
Datenmodell überall annimmt: eine Adresse kann mehrere Anstellungen tragen (Testbetrieb
12: Chef, Anna, Tim unter einer Adresse). Jetzt blockiert nur zusätzlich gleicher Vor-
und Nachname (Doppelklick-Schutz).

**`qt_position` ist `Secure` nach Protokoll, nicht nach `NODE_ENV`.** Ein
Produktionsbuild über `http://` setzte das Cookie `Secure`, der Browser verwarf es still
— Konten mit mehreren Anstellungen sahen bei jedem Aufruf „keine Position gewählt".
Jetzt aus `x-forwarded-proto` abgeleitet. Dazu reist das Ziel als `?weiter=` durch die
Positionswahl (vorher fest `/dashboard`).

---

## 2026-08-29 — Kein Abschluss-Screen mehr; zwei Kontrast-Ausnahmen

**`/einrichtung/fertig` entfernt.** Die Seite war richtig, solange die native App das
Ziel war. Mit dem Web-Dashboard baute sie eine Lücke: die Wiedereinstiegs-Ableitung
läuft bei jeder Anmeldung, also landete auch die tägliche Anmeldung eines fertigen
Betriebs auf „Dein Betrieb steht". Der Zustand `fertig` bleibt als Endpunkt der
Ableitung, war nie der Name einer Seite.

**Zwei Kontrast-Ausnahmen freigegeben** (`--qt-muted-sunk`, `--qt-border-control`),
beide im Browser gemessen und in `globals.css` begründet. Aktuelle Fassung in
`CLAUDE.md`, „Harte Vorgaben".

---

## 2026-08-26 — Kursänderung: das Dashboard wird hier gebaut

**Vorher galt:** Dashboard, Schichtplanung, laufende Mitarbeiterverwaltung und der
mobile Login gehörten ausschliesslich in die Expo-App; der Wizard schrieb einmalig die
Grundausstattung, alles Spätere gehörte der App. Der Abschluss-Screen verwies auf die
Stores. Drei Prüffragen unterschieden „gehört hierher" an „läuft einmalig, keine
Bestandsliste"; `schicht_instanzen`, `schicht_zuweisungen`, `urlaub`,
`benachrichtigungen`, `notfaelle` galten als Beweis, vom Weg abgekommen zu sein.

**Jetzt gilt:** dieses Repo baut das Betriebs-Dashboard funktional 1:1 zur Expo-App
nach — beide Rollensichten, Chef wie Mitarbeiter. Der Urlaubs-/Vorlieben-Teil
(App: `scheduling.tsx`) wurde am selben Tag ausdrücklich dazugenommen. Die alten
Prüffragen sind hinfällig; an ihre Stelle tritt: **kann die Expo-App das?** Ja → gehört
hierher (ausser Push). Nein → neue Produktentscheidung, erst besprechen. Begründung:
beide Wege (Expo-Web-Target vs. eigene Weboberfläche) wurden getestet, die Entscheidung
fiel für ein eigenständiges Dashboard.

Ausnahme Push: `expo-notifications` braucht einen nativen Build und funktioniert im Web
nicht — die Geräte-Registrierung (`push_token_speichern`) und On-Device-Erinnerungen
bleiben der App. `benachrichtigungen` (die Tabelle) wird hier gelesen und geschrieben;
nur der Klingelton fehlt.

**Befunde am selben Tag:**
- `pruefe_letzter_chef()` ist an keine Tabelle angehängt (nur
  `trg_mitarbeiter_spaltenschutz` auf `mitarbeiter`) — läuft nie, obwohl
  `DOCUMENTATION.md` sie unter integritätserzwingenden Triggern führt. Zwei Betriebe
  haben schon null aktive Chefs. Gemeldet, nicht repariert; die Oberfläche fängt es ab.
- `planungszyklus_erstellen` prüft keine Überschneidung, obwohl `TESTING.md` es
  behauptet. Das Dashboard warnt selbst und verlangt Bestätigung.
- Dashboard-Schale + Sperre (`betreteDashboard()`) gebaut; Sperre nur für Chefs
  (`betrieb_abonnements` trägt nur `abonnement_select_chef`).
- Position in `qt_position` (`httpOnly`), weil Server Components vor jedem React-Context
  rendern und ein Reload die App-Auswahl verlöre. Cookie ist Hinweis, kein Nachweis.

---

## 2026-08-24 — `mitarbeiter_einladung_annehmen` ist weg

Im Katalog nachgesehen: die code-basierte Einladungs-RPC, die zur Laufzeit warf (schrieb
`mitarbeiter.auth_user_id`, eine Spalte, die es nicht gibt), existiert nicht mehr. Es
gibt nur noch `meine_einladungen()` und `einladung_annehmen(p_mitarbeiter_id)`. Die
Tabelle `einladungen` steht weiter da; ihr einziger Konsument ist die deployte, aber
aufruferlose Edge Function `einladung-einloesen` (verwaister aktiver Datenweg — vor
Arbeit an Einladungen beim Kollegen klären).

---

## 2026-08-23 — Preise festgelegt; Sperrlogik mit Testuhr durchgespielt

Preise: Low 29 €, Medium 49 €, Business 69 €/Monat (bis 15/30/50 Mitarbeiter, Business
+ ein Standort). Anzeige in `plaene`; abgerechnet nach dem Stripe-Preis hinter
`STRIPE_PRICE_*`.

Mit einer Stripe-Testuhr bestätigt: Testphase ohne Karte → `paused` → Webhook schreibt
`pausiert` → Karte nachgereicht → dasselbe Abo läuft `active` weiter. Dabei entdeckt:
`resume` erzeugt eine offene Rechnung (`auto_advance: false`), das Abo bleibt `paused`
bis zur Zahlung — deshalb bezahlt `nimmAboWiederAuf()` sofort mit `invoices.pay()`.

---

## 2026-08-19 — Der Einrichtungs-Stepper ersetzt Checkout-mit-Weiterleitung

**Vorher** (2026-08-10 beschlossen, 2026-08-18 gebaut): Stripe Checkout mit
Weiterleitung auf eine fremde Domain. **Jetzt:** vier zusammenhängende Stepper-Schritte
mit Fortschrittsbalken, Zahlung eingebettet über Stripe Elements. Eine Weiterleitung
mitten im Balken bricht dessen Zusage und macht das Überspringen unmöglich.

Dabei: eigener SetupIntent statt `pending_setup_intent` (zeigt SEPA über
`automatic_payment_methods`, ist an zwei Zeitpunkten neu erzeugbar); Plan reist nicht
mehr als `?plan=` mit; das Formular für einen zweiten Betrieb wird entfernt (bis
2026-08-21 noch sichtbar).

---

## 2026-08-18 — Wizard deckt Rollen, Mitarbeiter, Schichtvorlagen ab

Bewusste Dopplung mit der App: die Grundausstattung ist Masseneingabe, wofür ein
Web-Formular besser ist als eine Handy-Maske. Daraus folgt die Verpflichtung, sich nach
`manager.tsx` zu richten (montagsbasierter `wochentag`, Mindestbesetzungs-Semantik,
Feldnamen) — sonst liest die andere Oberfläche die Daten still falsch.

---

## 2026-08-11 — `stripe_subscription_id` beantwortet nicht „hat bezahlt?"

Zur Zeit des Checkouts fragte Stufe 1 die Subscription-ID (nicht `status`), weil eine ID
ohne Karte gar nicht entstand. Mit dem Überspringen-Weg entsteht die ID auch ohne Karte;
gefragt wird künftig `status`, die ID ist nur noch Existenzfrage. (Superseded durch die
Stripe-Gegenfrage vom 2026-09-14.)

---

## 2026-08-06 — Bestätigung über Codes, nicht über Links

Für Registrierung und Passwort-Reset. Der Link-Weg lief über PKCE; der `code_verifier`
liegt im registrierenden Browser, `exchangeCodeForSession` braucht ihn beim Klick —
Mail auf dem Handy, registriert am Laptop scheitert. Für Gastro-Betriebe der Normalfall.
`verifyOtp` braucht nur Adresse und Ziffern. Aktueller Stand (Code-Länge, Typwerte) in
`CLAUDE.md`.

---

## 2026-08-05 / 2026-08-10 — Datenbank und Wizard-Tabellen gegen die Live-DB verifiziert

Die in `CLAUDE.md` unter „Datenbank" und „Onboarding-Wizard" dokumentierten Signaturen,
Constraints, Enum-Werte und Fallen wurden an diesen Tagen gegen die Live-Instanz geprüft.
Sie stehen dort als aktueller Stand.
