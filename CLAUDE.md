# QuickTeam — Website, Auth & Web-Dashboard

## Scope

Dieses Repo enthält die öffentliche Marketing-Website, den Auth-Bereich für
Betriebsinhaber ("Chefs") — Landing, Preise, Rechtstexte, Registrierung, Login,
Passwort-Reset, E-Mail-Bestätigung — den Einrichtungs-Stepper seit 2026-08-19 und
**seit 2026-08-26 zusätzlich ein vollständiges Web-Dashboard**.

### Kursänderung vom 2026-08-26: das Dashboard wird hier gebaut

Das ist eine bewusste Entscheidung nach einem Testvergleich, keine Vergesslichkeit
und kein schleichendes Ausufern. Weil sie das Vorherige umkehrt, steht beides hier.

**Vorher galt:** Dashboard, Schichtplanung, laufende Mitarbeiterverwaltung und der
mobile Mitarbeiter-Login gehören ausschliesslich in die separate React-Native-App
(Expo, `Blank0371/QuickTeamMobile`, anderer Entwickler). Die Grenze verlief nicht an
der Tabelle, sondern am Zeitpunkt: der Wizard schrieb einmalig die Grundausstattung
eines frisch angelegten Betriebs, alles Spätere — ändern, pausieren, umplanen,
Schichten zuweisen, Urlaub — gehörte der App. Der Abschluss-Screen verwies auf die
Stores, `NEXT_PUBLIC_APP_URL` war ausdrücklich kein Web-Dashboard.

**Jetzt gilt:** dieses Repo baut das Betriebs-Dashboard funktional **1:1 zur
Expo-App** nach — Kalender und Schichtübersicht, laufende Mitarbeiter- und
Rollenverwaltung, Planungszyklen samt Solver-Aufruf, manuelle Zuweisung, Urlaub,
Verfügbarkeiten und Schichtvorlieben, Ankündigungen mit Umfragen und Checklisten,
Schichttausch und Notfallvertretung. Beide Rollensichten, Chef wie Mitarbeiter, denn
Tausch, Urlaub und Notfall sind ihrem Wesen nach Mitarbeiter-Funktionen.

Der Urlaubs- und Vorlieben-Teil — in der App `scheduling.tsx` — ist am 2026-08-26
ausdrücklich dazugenommen worden, nachdem er beim ersten Zuschnitt gefehlt hatte. Ohne
ihn hätten Angestellte im Dashboard zwar Dienstplan, Mitteilungen und Tausch, aber
keinen Weg, Urlaub einzureichen; die Genehmigung auf Chef-Seite hinge in der Luft.

**Begründung:** die Expo-App liefert zwar ein Web-Target, aber ein Verweis darauf ist
etwas anderes als eine eigene Weboberfläche. Beide Wege wurden gegeneinander
getestet; die Entscheidung fiel für ein eigenständiges Dashboard in diesem Repo statt
für den Verweis auf die Expo-Web-Version.

**Die eine Ausnahme sind Push-Benachrichtigungen**, und sie ist technisch bedingt,
nicht abgewogen: `expo-notifications` braucht einen nativen Build (FCM/APNs) und
funktioniert im Web nicht — `DOCUMENTATION.md`, Abschnitt „Notifications, push &
reminders". Alles, was daran hängt, bleibt der nativen App vorbehalten: die
Geräte-Registrierung über `push_token_speichern`, die On-Device-Erinnerungen am
Vorabend und zwei Stunden vorher. **Nicht** ausgenommen sind die
Benachrichtigungen selbst: `benachrichtigungen` ist die Tabelle hinter Ankündigungen,
Umfragen, Checklisten und allen Systemmeldungen, und die werden hier gelesen und
geschrieben wie überall sonst. Nur der Klingelton fehlt.

### Was das für die alten Prüffragen bedeutet

Die drei Prüffragen von vorher sind hinfällig, und zwar so gründlich, dass sie hier
nicht stehen bleiben dürfen: sie beantworteten „gehört das hierher?" mit „nur wenn es
einmalig läuft und keine Bestandsliste hat", und `schicht_instanzen`,
`schicht_zuweisungen`, `urlaub`, `benachrichtigungen` und `notfaelle` galten als
Beweis dafür, vom Weg abgekommen zu sein. Genau diese Tabellen sind jetzt das
Arbeitsmaterial.

An ihre Stelle tritt eine einzige Frage: **kann die Expo-App das?** Wenn ja, gehört es
hierher — ausser es hängt an Push. Wenn nein, ist es eine neue Produktentscheidung und
keine Nachbau-Arbeit; dann wird sie besprochen, bevor sie gebaut wird.

### Wizard und Dashboard überschneiden sich jetzt — und das ist geregelt

Der Einrichtungs-Stepper bleibt, was er ist: der geführte Erstlauf. Das Dashboard ist
der Dauerbetrieb. Beide schreiben in dieselben Tabellen, und damit gilt die
Verpflichtung aus dem Abschnitt „Tabellen des Onboarding-Wizards" nun für die ganze
Fläche statt für fünf Tabellen: **die Konventionen kommen aus dem App-Repo, nicht aus
eigenem Gutdünken.** Montagsbasierter `wochentag`, dieselbe
Mindestbesetzungs-Semantik, dieselben Feldnamen, dieselben RPC-Signaturen. Wo zwei
Oberflächen dasselbe schreiben, aber nur eine die Konvention kennt, entstehen Daten,
die die andere stillschweigend falsch liest — und geworfen wird nichts.

Der Solver bleibt ausdrücklich fremder Code: `plan-generieren` ist eine Supabase Edge
Function und wird **aufgerufen**, nicht nachgebaut.

## Stack

- Next.js 15, App Router, TypeScript strict
- Tailwind CSS v4
- `@supabase/ssr` für Auth — **nicht** `@supabase/auth-helpers-nextjs` (deprecated)
- Deployment: Vercel
- Sprache: Deutsch und Englisch, `lang` aus dem Cookie — siehe „Zweisprachigkeit" unten

## Zweisprachigkeit — Stand und offener Rest

**Seit 2026-09-09 liefert die Seite `de` und `en` aus.** Der Umschalter steht
oben rechts, in der öffentlichen Kopfzeile wie in der Dashboard-Topbar.

**So funktioniert es.** Sprachpakete als getippte Objekte, kein next-intl:

- `src/i18n/de.ts` — Leitsprache. `Dictionary = typeof de`, **ohne `as const`**;
  mit `as const` wären alle Werte Literaltypen und `en` müsste wörtlich dieselben
  Sätze enthalten.
- `src/i18n/en.ts` — `export const en: Dictionary`. Die Typangabe ist der
  eigentliche Schutz: ein fehlender Schlüssel bricht `npm run typecheck`, statt
  im Browser als `undefined` aufzutauchen.
- `src/i18n/sprache.ts` — `leseSprache()` / `setzeSprache()` über das Cookie
  `qt_sprache`. Kein Pfad-Präfix; die Abwägung samt Preis (Suchmaschinen sehen
  nur die deutsche Fassung) steht dort im Kopfkommentar.
- `src/components/sprach-wahl.tsx` — zwei Formulare, Server Action, kein
  Client-Bündel. Funktioniert ohne JavaScript.

**Neue Strings gehören ins Wörterbuch, nicht ins JSX.** Wer einen Text hart in
eine Komponente schreibt, macht ihn einsprachig, und niemand merkt es.

### Änderung vom 2026-09-10: die Mechanik steht, der Seiteninhalt nicht

**Vorher** war die Zweisprachigkeit ein Wörterbuchpaar und ein Umschalter. Wo
eine Client-Insel Text brauchte, gab es keinen Weg dorthin; wo ein Zod-Schema
eine Meldung trug, war sie deutsch.

**Jetzt** gibt es drei Bausteine, und sie decken die Fälle ab, an denen die
Übersetzung des Seiteninhalts sonst hängen bliebe:

| Baustein | Wofür |
| -------- | ----- |
| `src/i18n/server.ts` — `holeTexte()` / `holeValidierung()` / `holeAuthTexte()` | Server Components und Server Actions, eine Zeile statt zwei |
| `src/i18n/sprach-provider.tsx` — `<SprachProvider>` / `useKlientTexte()` | die Texte, die eine Client-Insel **nicht** als Prop bekommen kann |
| `src/i18n/text.ts` — `meldung()` / `loeseMeldung()` | Meldungsschlüssel der Zod-Schemata |

**Props bleiben der Normalfall.** Was eine Insel an eigenen Beschriftungen
braucht, reicht ihr Server-Elternteil herein — so wie `site-header.tsx` es mit
`mobile-menu.tsx` hält. Der Context trägt ausdrücklich nur zwei Blöcke:
Fehlergrenzen (`error.tsx` bekommt von React nur `error` und `reset`) und
Validierungsmeldungen (querschnittlich, in jedem Formular). Eine Insel, die
`getDictionary()` selbst aufruft, zöge **beide** Wörterbücher ins Client-Bündel;
die Landing Page hat dafür kein Budget.

**Zod-Meldungen sind Schlüssel, keine Sätze.** `validierung.ts` baut seine
Schemata im Modul-Scope, und ein Modul-Scope kennt die Sprache der Anfrage
nicht. Aufgelöst wird an genau zwei Stellen — `pruefeFeld()` für den Browser,
`feldFehler()` für die Server Action. Der Schlüsseltyp kommt als `import type`
aus `de.ts`: ein Vertipper bricht den Typecheck, und zur Laufzeit ist der Import
weg. Die verworfene Alternative — eine Schema-Fabrik pro Sprache — steht samt
Begründung in `src/i18n/text.ts`.

**Was `de.ts` und `en.ts` jetzt zusätzlich tragen:** `validierung` (rund sechzig
Meldungsschlüssel, flach und gepunktet), `auth` (die Supabase-Fehlertexte aus
`authFehlerText()`), `rechtliches` und `auswahl`.

**`auswahl` trennt Etikett von Wert, und das ist die Prüffrage für jeden String
in diesem Projekt.** `LAENDER` und `SPRACHEN` speichern einen Code (`AT`/`DE`,
`de`/`en`) und zeigen einen Namen — der Name wird übersetzt. `VERTRAG_TYPEN`
speichert den **Anzeigetext selbst** (`mitarbeiter.vertrag_typ` ist `text` ohne
CHECK, und `manager.tsx:598` in der App gibt ihn ungeprüft aus) — eine
Übersetzung schriebe englische Vertragsarten in eine geteilte Tabelle, die die
deutsche App dann wörtlich anzeigt. Deshalb bleibt sie unangetastet.

**Nebenbei behoben:** fünf Aufrufe von `getDictionary()` **ohne Locale** lieferten
unabhängig vom Cookie Deutsch aus — Fussbereich, `not-found`, beide `error.tsx`
und die Positionswahl. Der Fussbereich ist eine Server Component und hätte das
Cookie lesen können; er tat es nur nicht.

### Aufgabe für die nächste Sitzung

**`docs/i18n-glossar.md` ist ab dem 2026-09-10 verbindlich.** Es hält fest,
welcher deutsche Fachbegriff welchen englischen bekommt, mit Beleg — Expo-App
oder Web-Wörterbuch. Vor jeder neuen englischen Formulierung dort nachsehen;
neue Begriffe gehören hinein. Es trägt ausserdem die Liste der Strings, die
**nie** übersetzt werden (`VERTRAG_TYPEN`, Registerangaben, Plan-IDs).

**Der Seitentext ist weiterhin überwiegend hartkodiertes Deutsch.** Übersetzt
sind: Navigation, beide Fussbereiche, Fehlerseiten, Dashboard-Sidebar,
Rechtsseiten, Validierungs- und Auth-Meldungen — und seit dem 2026-09-10 die
**vollständige Landingpage** sowie die geteilten Formular-Bausteine
(`felder.tsx`, `datum-wahl.tsx`).

**Wochentage und Monate stehen in keinem Wörterbuch.** `kalender.ts` leitet sie
über `Intl.DateTimeFormat` aus der Locale ab; die deutschen Konstanten
`MONATSNAMEN` / `WOCHENTAGE` / `WOCHENTAGE_LANG` sind seither **abgeleitet, nicht
abgeschrieben** und können nicht mehr von der englischen Fassung abweichen. Wer
eine der rund zehn Dateien anfasst, die sie noch benutzen, ersetzt den Zugriff
durch `monatsnamen(locale)` und reicht die Locale herein.

**`KlientTexte` trägt seit dem 2026-09-10 einen dritten Block und die Locale.**
`formular` sind die Beschriftungen der geteilten Bausteine (`SelectFeld`,
`DatumWahl`) — querschnittlich wie `validierung`. `locale` ist **kein Text,
sondern ein Schlüssel für `Intl`**: damit formatiert eine Client-Insel Datums-
und Zahlwerte korrekt, ohne dass ein einziger String über die Grenze müsste.

Zu tun, in dieser Reihenfolge:

1. **Öffentliche Seiten** — Landing (Hero, Versprechen-Karten, Preisabschnitt),
   `/preise`, Auth, die vier Stepper-Schritte. Der Landing-Fussbereich ist am
   2026-09-10 mitgegangen; der Rest steht noch im JSX.
2. **Dashboard-Bereiche** — der grösste Teil; dort liegen die meisten Sätze.
   Für die englische Fassung ist die Expo-App massgeblich, nicht eigenes
   Ermessen: `../QuickTeam App/src/i18n/locales/{de,en}.json` enthält 532
   gepflegte Schlüsselpaare, davon `manager` 181, `shiftSwap` 65, `messages` 63,
   `scheduling` 54, `calendar` 53. Wer „Urlaub" eigenständig als „Time off"
   übersetzt, während die App „Vacation" sagt, baut genau die Divergenz, die der
   1:1-Nachbau vermeiden soll.
3. **Verbleibende Meldungen in `src/lib/`** — die Server-Actions geben neben
   `feldFehler()` und `authFehlerText()` noch eigene `nachricht`-Sätze zurück.

**Entschieden am 2026-09-10: die App ist die Quelle.** Die abweichenden Begriffe
in `en.ts` sind nachgezogen — `urlaub` von „Time off" auf **„Vacation"**
(`scheduling.tabVacation`), `notfall` von „Call-outs" auf **„Emergency"**
(`scheduling.tabEmergency`), `rolle.mitarbeiter` von „Staff" auf **„Employees"**
(`manager.tabEmployees`). Dieselbe Person benutzt womöglich beides in derselben
Schicht; „Time off" hier gegen „Vacation" dort liest sich nicht als Nuance,
sondern als zwei verschiedene Funktionen.

**Drei Beschriftungen haben in der App kein Gegenstück und bleiben
web-eigen** — das steht als Kommentar am Dashboard-Block in `en.ts`: `tausch`
ist hier ein eigener Bereich, in der App dagegen ein Abschnitt innerhalb einer
Schicht („Swap this shift"), es gibt also keine Navigationsbeschriftung zum
Übernehmen. `verfuegbarkeit` ebenso — die App nennt den Inhalt „preferences",
kennt aber keinen so benannten Bereich. Und `uebersicht` ist **nicht** die
`tabs.main` der App („Home"): das ist ein Startbildschirm für Angestellte, dies
hier eine Betriebsübersicht.

Für alles Weitere gilt ab jetzt: **vor einer eigenen englischen Formulierung in
`../QuickTeam App/src/i18n/locales/en.json` nachsehen.**

Danach zu entscheiden, nicht vorher: ob die **öffentlichen** Seiten ein
`/en/`-Präfix bekommen. Für sie ist die Cookie-Lösung ein echter SEO-Nachteil;
für das Dashboard (`robots: index:false`) ist sie folgenlos. Die Wörterbücher
bleiben davon unberührt — es ändert sich nur, woher `leseSprache()` die Locale
nimmt.

### Änderung vom 2026-09-14: `?lang=de|en` für Links aus der App

**Vorher:** die Sprache kam ausschliesslich aus `qt_sprache`. **Jetzt:** ein
`?lang=` im Aufruf geht dem Cookie vor — nur für diese eine Anfrage.

**Grund:** die Expo-App öffnet unter Einstellungen > Rechtliches `/datenschutz`,
`/agb` und `/avv` im In-App-Browser, wo kein Cookie gesetzt ist; ohne Parameter
sah dort jeder Deutsch. Die App hängt `?lang=de` bzw. `?lang=en` an (alle
Nicht-Deutsch-Sprachen → `en`).

**Kein Cookie, bewusst:** die Middleware reicht den Wert als Kopfzeile
`x-qt-sprache` an `leseSprache()` weiter (`src/i18n/sprach-parameter.ts`) und
speichert nichts — die Datenschutzerklärung sagt über `qt_sprache` „nur wenn Sie
die Sprache umschalten", und das bleibt so wahr. Preis: interne Links fallen auf
Cookie bzw. Deutsch zurück. Nur GET/HEAD, damit der Umschalter (Server-Action-POST
an dieselbe Adresse samt `?lang=`) weiter gewinnt — am 2026-09-14 im Browser
geprüft. Eine vom Client mitgeschickte `x-qt-sprache` wird verworfen.

## Datenbank

Supabase-Projekt `jqpfuotwsgnqihspsmmf` (eu-west-1). Die App teilt sich dieselbe
Instanz. Alle folgenden Angaben sind am 2026-08-05 gegen die Live-DB verifiziert.

**Registrierungs-RPC:**

```
registriere_betrieb(p_name text, p_land text, p_vorname text, p_nachname text) → uuid
```

SECURITY DEFINER. Wirft `Nicht authentifiziert`, wenn `auth.uid()` null ist. Legt
`betriebe` + `mitarbeiter` (`rolle_typ='chef'`, `status='aktiv'`) an und zieht die
E-Mail selbst aus `auth.jwt() ->> 'email'` — **E-Mail nicht als Parameter übergeben,
es gibt keinen solchen Parameter.**

**`meine_betriebe() → SETOF uuid`** liefert `betrieb_id` aller Zeilen mit
`auth_id = auth.uid() AND status = 'aktiv'`. Das ist **Mitgliedschaft, nicht
Chef-Eigenschaft**: wer irgendwo als Mitarbeiter aktiv ist, bekommt ein nicht-leeres
Ergebnis. Als Existenz-Check für einen eigenen Betrieb allein nicht ausreichend.

**`ist_chef(p_betrieb_id uuid) → boolean`** prüft `rolle_typ='chef' AND
status='aktiv'` für `auth.uid()` im übergebenen Betrieb. Nimmt einen Parameter.

**Constraints:**

- `betriebe.land` CHECK: nur `'AT'` oder `'DE'`. Select mit zwei Optionen, kein Freitext
- `betriebe.name` CHECK: `length(trim(name)) > 0`
- `mitarbeiter.vorname` / `.nachname`: nur `NOT NULL`, **kein trim-CHECK**. Leerzeichen-
  Strings laufen durch. Die Zod-Validierung ist hier die einzige Verteidigungslinie
- `mitarbeiter.rolle_typ` ∈ `chef` | `mitarbeiter`; `.status` ∈ `eingeladen` | `aktiv` |
  `pausiert` | `inaktiv`
- Spalte heißt `mitarbeiter.auth_id` — nicht `auth_user_id`
- `betrieb_abonnements.plan` ∈ `basic` | `pro` | `business`; `.status` ∈ `trial` | `aktiv` |
  `zahlung_ausstehend` | `gekuendigt` | `pausiert`. Die Preisseite bildet genau diese
  drei Pläne ab, Einstieg über Trial

**Automatik beim Betrieb-Insert:** Trigger `trg_betrieb_erstelle_einstellungen` legt
`betriebs_einstellungen` und `betrieb_abonnements` (`basic` / `trial`) selbst an. Von
hier aus wird in diese Tabellen **nichts** geschrieben.

**E-Mail-Bestätigung ist Pflicht.** `cleanup_unconfirmed_users()` löscht `auth.users`
ohne `email_confirmed_at` nach 24 Stunden. Muss in der UI stehen.

**RLS ist auf allen Tabellen aktiv** und bleibt die einzige Autorisierungsebene.

## Tabellen des Onboarding-Wizards

Am 2026-08-10 gegen die Live-DB verifiziert. Der Chef darf direkt schreiben, ein
eigener RPC ist nicht nötig: `mitarbeiter_insert_chef`, `rollen_insert_chef`,
`mitarbeiter_rollen_write_chef` (ALL), `vorlagen_write_chef` (ALL) und
`svm_write_chef` (ALL) hängen alle an `ist_chef(betrieb_id)`.

**Der Wizard deckt Mitarbeiter, Rollen und Schichtvorlagen ab — obwohl die App
dasselbe kann.** Entscheidung vom 2026-08-18. Das ist eine bewusste Dopplung, keine
übersehene Überschneidung. Die Grundausstattung ist Masseneingabe: ein Dutzend
Mitarbeiter, vier Rollen, ein ganzes Wochenraster, alles am Stück. Dafür ist ein
Web-Formular mit Tastatur, Tab-Reihenfolge und sichtbarem Gesamtüberblick das
bessere Werkzeug als eine Handy-Maske, die jeweils ein Feld zeigt. Die Grenze aus
dem Scope-Abschnitt verschiebt sich dadurch nicht: hier entsteht der Erstbestand,
jede spätere Änderung gehört der App.

**Die Konsequenz daraus ist eine Verpflichtung, keine Freiheit.** Zwei Schreibwege
auf dieselben Tabellen vertragen genau eine Konvention. Der Wizard richtet sich
deshalb nach `manager.tsx` in der App — nicht umgekehrt, und nicht nach eigenem
Gutdünken: montagsbasierter `wochentag`, dieselbe Mindestbesetzungs-Semantik,
dieselben Feldnamen. Wo beide Seiten schreiben, aber nur eine die Konvention kennt,
entstehen Daten, die die andere stillschweigend falsch liest — eine Schicht liegt
einen Tag daneben, eine Vorlage bleibt unsichtbar, und geworfen wird nichts. Die
folgenden Fallen sind damit keine Randnotizen, sondern die Prüfliste vor jedem
Schreibzugriff des Wizards.

**Rollen zuerst, dann die beiden Dinge, die sie brauchen.** Die Aufteilung auf
Schritt 3 (Rollen + Mitarbeiter) und Schritt 4 (Schichtvorlagen) folgt nicht dem
Gefühl, sondern den Fremdschlüsseln: `mitarbeiter_rollen` braucht eine Rolle, um
jemandem eine zuzuweisen, und `schicht_vorlage_mindestbesetzung` braucht eine, damit
die Vorlage in der App überhaupt sichtbar wird. Rollen zu den Vorlagen zu schlagen
und die Mitarbeiter davon zu trennen — der naheliegende Schnitt — macht den
Mitarbeiter-Schritt unvollständig, egal in welcher Reihenfolge er läuft.

Der Nebeneffekt ist der Wiedereinstieg: getrennt lässt sich „Rollen da, Vorlagen
nicht" aus den Daten ablesen. In einem gemeinsamen Schritt wäre derselbe Zustand nur
noch über ein Flag unterscheidbar — und genau das soll es nicht geben.

**Eine Schichtvorlage ohne Mindestbesetzung ist in der App unsichtbar.**
`schicht_vorlage_mindestbesetzung` (PK `schicht_vorlage_id, rolle_id`, Spalten
`betrieb_id`, `mindestanzahl smallint CHECK >= 0`) ist keine Verfeinerung, sondern
die Verbindung, über die ein Mitarbeiter die Vorlage überhaupt zu sehen bekommt:
`scheduling.tsx` behält nur Vorlagen, für die eine Mindestbesetzungs-Zeile mit einer
Rolle existiert, die der Person zugewiesen ist. Vorlage und Rollenbedarf werden
deshalb zusammen erfasst, nicht in getrennten Schritten.

**`schicht_vorlagen.wochentag` ist montagsbasiert: 0 = Montag, 6 = Sonntag.**
Die App rechnet `(d.getDay() + 6) % 7`. Der CHECK prüft nur `0..6` und fängt eine
Verwechslung mit der JS-Konvention (0 = Sonntag) nicht ab — jede Schicht läge dann
einen Tag daneben, ohne Fehlermeldung.

**Eingeladene Mitarbeiter brauchen E-Mail oder Telefon, sonst sind sie unerreichbar.**
`meine_einladungen()` findet die Zeile nur über `lower(email) = lower(jwt.email)`
oder über normalisierte Telefonziffern (mindestens 6). Beide Spalten sind nullable —
die Zod-Regel ist wieder die einzige Verteidigungslinie. Der Wizard setzt
`status = 'eingeladen'` (ist auch der Spalten-Default); auf `aktiv` geht die Zeile
erst durch `einladung_annehmen()` aus der App.

**Rollen löscht der Wizard hart, die App weich — und das muss so sein.**
`manager.tsx` setzt `rollen.aktiv = false`, weil dort Rollen an vergangenen
Zuweisungen hängen. Der UNIQUE-Constraint heisst aber `(betrieb_id, name)` und kennt
`aktiv` nicht: eine weich gelöschte „Küche" blockiert den Namen für immer. Genau der
naheliegendste Handgriff im Wizard — anlegen, vertippt, weg damit, neu anlegen — liefe
damit in eine Fehlermeldung über einen Datensatz, den man gar nicht mehr sieht. Im
Wizard gibt es die Vergangenheit noch nicht, also wird wirklich gelöscht: erst
`mitarbeiter_rollen` (FK ist ON DELETE RESTRICT), dann die Rolle. Hängt doch schon
eine Vorlage daran, verhindert der FK das Löschen und die Meldung bleibt sichtbar.

**Telefonnummern müssen international gespeichert werden, sonst kommt die Einladung
nie an.** `meine_einladungen()` vergleicht `regexp_replace(telefon, '[^0-9]', '', 'g')`
mit denselben Ziffern aus `auth.jwt() ->> 'phone'` — am 2026-08-23 im Quelltext
nachgesehen. Kanonisiert wird dabei **nichts**: `+43 660 1234567` und
`0043 660 1234567` sind für die Funktion zwei verschiedene Nummern, und eine nationale
`0660 …` findet ein Konto mit `436601234567` nie.

`telefonKanonisch()` in `src/lib/validierung.ts` behebt davon nur den eindeutigen Teil
— führendes `00` wird zu `+`. Eine einzelne führende `0` bleibt stehen: sie liesse sich
nur unter Annahme des Landes umrechnen, und eine stille Annahme über eine
Telefonnummer ist schlimmer als ein deutlicher Hinweis am Feld. **Offen und beim
Kollegen:** ob `meine_einladungen()` die Nummern selbst kanonisieren sollte. Von hier
aus wird die Funktion nicht angefasst.

**Weitere Fallen:**

- `mitarbeiter.email` hat **keinen** UNIQUE-Constraint, nur den einfachen Index
  `mitarbeiter_email_idx`. Doppelt abgeschickte Wizard-Schritte erzeugen doppelte
  Einladungen — Idempotenz muss von hier kommen
- `mitarbeiter_rollen` braucht alle drei Spalten; die FKs sind zusammengesetzt
  (`mitarbeiter(id, betrieb_id)` und `rollen(betrieb_id, id)`). Der Rollen-FK ist
  `ON DELETE RESTRICT`, der Mitarbeiter-FK hat gar keine Regel: „Mitarbeiter wieder
  entfernen" löscht erst `mitarbeiter_rollen`, dann die Zeile
- `schicht_vorlagen.bezeichnung` ist nullable, die App rendert sie ungeprüft — ein
  NULL erscheint als „null". Immer setzen. `chk_vorlage_zeiten_verschieden` verbietet
  nur `start = end`, Nachtschichten über Mitternacht sind erlaubt
- `rollen` hat `UNIQUE (betrieb_id, name)` und `CHECK length(trim(name)) > 0`
- `trg_mitarbeiter_spaltenschutz` ist BEFORE **UPDATE**, greift bei Inserts also
  nicht. Nachträglich darf nur ein Chef korrigieren — der Wizard bietet deshalb
  „löschen und neu anlegen" statt Bearbeiten an
- **Vorlagen erzeugen keine Schichten.** Es gibt keine Funktion, die aus
  `schicht_vorlagen` `schicht_instanzen` generiert. Der Wizard verspricht deshalb
  keinen fertigen Dienstplan, sondern ein fertiges Grundgerüst — die konkreten
  Schichten entstehen erst im Dashboard, mit einem Planungszeitraum

**`pruefe_letzter_chef()` ist an keine Tabelle angehängt.** Am 2026-08-26 in
`pg_trigger` nachgesehen: auf `mitarbeiter` liegt nur `trg_mitarbeiter_spaltenschutz`.
Die Funktion existiert, wirft die passende Meldung — und läuft nie.
`DOCUMENTATION.md` im App-Repo führt sie unter den Triggern, die Integrität
erzwingen; das stimmt nicht.

Die Folge ist ernst: `schuetze_mitarbeiter_spalten` lässt einen Chef jede Spalte
ändern, also auch den eigenen Status. Steht danach kein aktiver Chef mehr im Betrieb,
liefert `meine_betriebe()` nichts (es filtert `status = 'aktiv'`), `ist_chef()` ist
überall falsch, und keine Schreib-Policy des Betriebs greift mehr. Der Betrieb wäre
für alle verschlossen und nur noch per Hand in der Datenbank zu retten. **Zwei
Betriebe haben heute schon null aktive Chefs** — der Zustand ist erreichbar, nicht
theoretisch.

Von hier aus wird kein Trigger angelegt. Die Oberfläche fängt es ab: Chef-Zeilen
bekommen im Dashboard weder Status-Steuerung noch Anonymisieren
(`darfStatusAendern()` in `src/lib/dashboard/team.ts`). Das ist strenger als nötig —
bei zwei Chefs wäre einer entbehrlich —, aber der Preis dafür ist ein Klick, und der
Preis des Gegenteils ein verlorener Betrieb. **Gemeldet, nicht repariert.**

**`planungszyklus_erstellen` prüft keine Überschneidung**, obwohl `TESTING.md` es
behauptet („Range must not overlap existing `schicht_instanzen`"). Am 2026-08-26 im
Quelltext nachgesehen: geprüft werden `ist_chef` und `p_ende > p_start`, sonst
nichts; einen EXCLUDE-Constraint gibt es auch nicht. Zwei überlappende Zeiträume
erzeugen für dieselben Tage doppelt Schichten. Das Dashboard warnt deshalb selbst und
verlangt eine ausdrückliche Bestätigung — als Warnung, nicht als Verbot, denn ein
bewusster Sonderzeitraum innerhalb eines längeren ist denkbar.

**Erledigt, steht nur noch als Historie hier:** `mitarbeiter_einladung_annehmen(p_code
text)` war ein zweiter, code-basierter Einladungsweg, der zur Laufzeit warf — die
Funktion schrieb `mitarbeiter.auth_user_id`, eine Spalte, die es nicht gibt (sie heisst
`auth_id`). Gemeldet und nicht von hier repariert; **am 2026-08-24 im Katalog
nachgesehen: die Funktion existiert nicht mehr**, im ganzen Projekt gibt es nur noch
`meine_einladungen()` und `einladung_annehmen(p_mitarbeiter_id)`.

Die Tabelle `einladungen` steht dagegen weiter da, samt ihrer drei Chef-Policies — und
sie hat sehr wohl noch einen Konsumenten, nur keinen in Postgres: die **Edge Function
`einladung-einloesen`** ist deployed und `ACTIVE` (Version 1, `verify_jwt: true`). Sie
nimmt einen `hash` entgegen, legt bei Bedarf einen `auth.users`-Eintrag mit der
synthetischen Adresse `mitarbeiter-<uuid>@invite.local` an, schreibt `mitarbeiter.auth_id`
— korrekt, anders als die gelöschte RPC — und gibt ein fertiges Token-Paar zurück.

**Aufrufer hat sie keinen.** Sie liegt nicht im App-Repo (`supabase/functions/` enthält
nur `plan-generieren` und `push-versenden`), und der App-Quelltext ruft sie nirgends auf;
`select.tsx` geht über `meine_einladungen()` / `einladung_annehmen()`. Sie ist damit
kein toter Datenweg, sondern ein **verwaister aktiver** — schlimmer, weil man ihn nicht
sieht. Vor jeder Arbeit an Einladungen ist beim Kollegen zu klären, ob sie noch gebraucht
wird; sie mintet Sessions allein gegen einen Hash, wenn auch nur für Aufrufer mit
gültigem JWT. **Von hier aus wird sie weder benutzt noch angefasst.**

`DOCUMENTATION.md` im App-Repo führt `einladungen` als den aktiven Einladungsweg; das ist
überholt, `TESTING.md` und die DB widersprechen. Der Wizard geht ausschliesslich den
E-Mail-Weg über `mitarbeiter` mit `status = 'eingeladen'`.

### Änderung vom 2026-09-07: Rollen werden im Wizard gesammelt, nicht sofort geschrieben

Aus einem Test des Kollegen. **Vorher:** jede Rolle ging beim Klick auf „Hinzufügen"
unmittelbar in `rollen`. **Jetzt:** Schritt 3 hält sie im Formularzustand und schreibt
sie gebündelt beim Weitergehen — oder beim ersten Einladen, weil eine Rollenzuweisung
eine `rolle_id` braucht und ein Entwurf keine hat.

**Grund:** `rollen` hat keine DELETE-Policy (bekannter, gemeldeter Fund). Eine
geschriebene Rolle war damit nicht mehr wegzubekommen — RLS filtert das DELETE still
heraus, null Zeilen betroffen, kein Fehler —, und `UNIQUE (betrieb_id, name)` blockierte
zusätzlich den Namen. Ausgerechnet der häufigste Handgriff der Einrichtung, „anlegen,
vertippt, weg damit, neu anlegen", lief damit in eine Sackgasse. Solange nichts
geschrieben ist, gibt es nichts zu löschen.

Das ist eine **Kompensation, kein Fix**: für Rollen, die schon in der Datenbank stehen —
Rückkehr aus Schritt 4, Team-Seite im Dashboard — gilt die Sperre unverändert, und dort
bleibt es bei `art: "gesperrt"` mit sichtbarer Meldung. Die Policy entsteht nicht hier.

**Preis, bewusst bezahlt:** der Rollen-Editor braucht JavaScript. Eine Sammlung, die erst
am Ende schreibt, kann es ohne Client-Zustand nicht geben; die Alternative wäre genau der
Fehler gewesen, um den es geht. Einladen, Entfernen und Weitergehen bleiben echte
`<form>`-Posts.

### Änderung vom 2026-09-07: Doppelprüfung beim Einladen ist Name **und** Kontakt

**Vorher:** eine übereinstimmende E-Mail oder Telefonnummer im selben Betrieb verhinderte
das Anlegen. **Jetzt:** nur, wenn zusätzlich Vor- und Nachname übereinstimmen.

**Grund:** die alte Regel verbot etwas, das das Datenmodell überall sonst annimmt —
**eine Adresse kann mehrere Anstellungen tragen, auch im selben Betrieb.** Testbetrieb 12
ist genau so gebaut (Chef, Anna, Tim unter einer Adresse), und `holePositionen()` rechnet
damit. Die Datenbank hält davon nichts ab: `mitarbeiter_email_idx` ist ein gewöhnlicher
Index, kein UNIQUE — am 2026-09-07 in `pg_indexes` nachgesehen.

Der Zweck der Prüfung bleibt trotzdem gültig: ohne sie erzeugt ein doppelt abgeschicktes
Formular zwei Einladungen. Ein Doppelklick unterscheidet sich vom zweiten Profil aber an
genau einer Stelle — beim Doppelklick steht auch derselbe Name im Formular. Zwei Menschen
unter einer Adresse heissen verschieden.

### Änderung vom 2026-09-07: `qt_position` ist `Secure` nach Protokoll, nicht nach `NODE_ENV`

**Vorher:** `secure: process.env.NODE_ENV === "production"`. **Jetzt:** abgeleitet aus
`x-forwarded-proto`.

**Grund:** ein Produktionsbuild über schlichtes `http://` setzte das Cookie mit `Secure`,
und der Browser verwarf es stillschweigend. Für Konten mit **mehreren Anstellungen** —
und nur für die, bei einer einzigen greift die Normalfall-Regel in `waehleAktive()` —
war damit jeder Seitenaufruf wieder „keine Position gewählt". Die Auswahl selbst sah aus,
als hätte sie funktioniert: die Server Action liest beim Rendern der Weiterleitung ihren
eigenen, noch ungespeicherten Wert aus dem Cookie-Speicher des laufenden Requests, die
Übersicht erschien also einmal — und erst der nächste Klick fiel zurück.

Dazu reist das eigentliche Ziel jetzt als `?weiter=` durch die Positionswahl
(`wechselAdresse()` / `sicheresZiel()` in `src/lib/dashboard/pfad.ts`). Vorher leitete
`waehlePosition` fest auf `/dashboard`: wer auf „Kalender" geklickt hatte, landete nach
der Auswahl auf der Übersicht und kam bei jedem Versuch aufs Neue dort an. Den Pfad
kennt eine Server Component nicht von sich aus — die Middleware reicht ihn als
`x-qt-pfad` weiter.

## Bestätigung läuft über Codes, nicht über Links

**Entscheidung vom 2026-08-06, gilt für Registrierung und Passwort-Reset.**

Die Mail-Vorlagen verschicken `{{ .Token }}` — einen achtstelligen Zahlencode, der auf
der Seite eingetippt wird. Es gibt **keinen** Bestätigungslink, kein
`{{ .ConfirmationURL }}`, kein `emailRedirectTo`, kein `redirectTo`, keine Route
`/auth/callback` und keine Abhängigkeit von der Redirect-Allowlist.

**Grund:** Der Link-Weg lief über PKCE. Der `code_verifier` liegt als Cookie in dem
Browser, in dem die Registrierung abgeschickt wurde; `exchangeCodeForSession` braucht
ihn beim Klick wieder. Mail auf dem Handy öffnen, registriert am Laptop — und der
Tausch scheitert. Für Gastro-Betriebe ist das der Normalfall, nicht der Randfall.
`verifyOtp` braucht dagegen nur E-Mail-Adresse und Ziffern; beides steht im Formular.
Deshalb ist die Adresse auf beiden Code-Seiten ein sichtbares, änderbares Feld und
kein verstecktes.

Vorlagen, Dashboard-Einstellungen und die Farbwerte der Mails: `docs/mail-vorlagen.md`.

**Codelänge:** 8 Ziffern. Dashboard unter Authentication → Sign In / Providers → Email
→ „Email OTP Length" (Supabase erlaubt 6–10). Muss mit `CODE_LAENGE` in
`src/lib/validierung.ts` übereinstimmen.

**Die drei Typwerte unterscheiden sich und das ist Absicht:**

| Aufruf                          | Typ          |
| ------------------------------- | ------------ |
| `verifyOtp` nach Registrierung  | `"email"`    |
| `verifyOtp` nach Passwort-Reset | `"recovery"` |
| `resend` für die Registrierung  | `"signup"`   |

`"signup"` ist für `verifyOtp` nicht falsch, aber `"email"` ist der dokumentierte Weg
(JS-Referenz, „Verify Signup OTP"). `resend` akzeptiert laut `ResendParams`
ausschliesslich `signup` und `email_change` — dort geht `"email"` gar nicht.

## Registrierungs-Flow

`registriere_betrieb` braucht eine Session, die es erst nach der E-Mail-Bestätigung
gibt — die Betriebsdaten müssen die Bestätigungsmail überleben. Das gilt unverändert,
auch wenn Formular und Code-Eingabe seit dem Stepper **derselbe Schritt 1** sind:
zwei Abschnitte einer Seite, nicht zwei Seiten.

1. Abschnitt A: Betriebsname, Land (Select AT/DE), Vorname, Nachname, E-Mail, Passwort
2. `supabase.auth.signUp({ email, password, options: { data: { betrieb_name, land,
   vorname, nachname } } })` — **ohne** `emailRedirectTo`
3. Abschnitt B klappt auf: Code-Eingabe, 24-Stunden-Hinweis, „Code erneut senden" mit
   sichtbarem 60-Sekunden-Countdown. Die Adresse bleibt sichtbar und änderbar
4. Server Action `bestaetigen()`:
   a. `verifyOtp({ email, token, type: 'email' })` → Session
   b. `stelleBetriebSicher()` aus `src/lib/betrieb.ts`:
      `rpc('meine_betriebe')`, für **jede** zurückgegebene ID `rpc('ist_chef',
      { p_betrieb_id: id })`. Ist irgendwo `true` → RPC überspringen
   c. sonst `rpc('registriere_betrieb', { p_name, p_land, p_vorname, p_nachname })`
      mit Werten aus `session.user.user_metadata`
   d. weiter zu Schritt 2 des Steppers

**Warum die Zusammenlegung die Codes nicht in Frage stellt:** Ein Schritt heisst nicht
eine Sitzung. Die Mail kann weiterhin auf einem anderen Gerät ankommen als dem, auf
dem das Formular ausgefüllt wurde — genau dafür gibt es Ziffern statt Links. Wer auf
dem Laptop registriert und den Code auf dem Handy liest, tippt ihn auf dem Laptop
ein; wer die Seite zwischendurch schliesst, kommt über den Wiedereinstieg an
derselben Stelle wieder heraus. Beides funktioniert nur, weil `verifyOtp` nichts
ausser Adresse und Ziffern braucht.

**Der Plan reist nicht mehr mit.** Bis zum 2026-08-18 kam er als `?plan=` von
`/preise` über ein verstecktes Feld in `user_metadata` und von dort in den Checkout.
Mit der Verlagerung der Planwahl in Schritt 2 entfällt der ganze Weg: die Auswahl
steht dann unmittelbar vor dem Anlegen des Abos, in derselben Sitzung, ohne
Zwischenlager. `user_metadata` trägt wieder nur die vier Betriebsfelder.

**Schritt (b) ist Pflicht.** `registriere_betrieb` hat keinen Schutz gegen
Mehrfachanlage — ein zweimal eingegebener Code erzeugt sonst zwei Betriebe. Ein reiner
Leer-Test auf `meine_betriebe` reicht nicht (siehe oben).

**Fehlschlägt (b) oder (c), nachdem die Adresse bestätigt ist**, bleibt die Person in
Schritt 1 mit einer erklärenden Meldung. Zurück auf das leere Formular zu schicken
wäre falsch: das Konto existiert dann bereits.

**Passwort-Reset** läuft spiegelbildlich und bleibt eine eigene Seite ausserhalb des
Steppers: `resetPasswordForEmail(email)` ohne `redirectTo`, Weiterleitung auf
`/passwort-neu?email=…`, dort Code + neues Passwort in einem Schritt —
`verifyOtp({ type: 'recovery' })`, direkt danach `updateUser`.

**Validierung:** Betriebsname, Vor- und Nachname nach `trim()` nicht leer — Zod
clientseitig **und** in der Server-Action.

## Das Web-Dashboard

Gebaut ab 2026-08-26, Schale zuerst. Es liegt unter `/dashboard` und ist von der
öffentlichen Seite getrennt.

**Zwei Klammer-Gruppen tragen die Trennung, ohne eine einzige Adresse zu ändern.**
`src/app/(site)/…` bekommt Marketing-Kopfzeile und Fussbereich — Landing, Preise,
Rechtstexte, Auth **und** der Stepper. `src/app/dashboard/(arbeit)/…` bekommt die
Dashboard-Schale. Das Root-Layout trägt nur noch, was wirklich für alles gilt:
Sprache, Schriften, Sprungmarke, JSON-LD. Ein „Kostenlos testen"-Knopf über dem
Dienstplan eines zahlenden Betriebs wäre sonst unvermeidlich gewesen.

**Jeder neue Bereich gehört unter `(arbeit)`.** Dort läuft das Tor, und zwar im
Layout: `betreteDashboard()` prüft Anmeldung, Position und Sperre, bevor eine Seite
rendert. Wer eine Route daneben legt, umgeht die Prüfung — nicht aus Nachlässigkeit,
sondern weil Next Layouts nach dem Dateibaum zuordnet.

**Die Positionswahl liegt bewusst daneben** (`dashboard/wechseln`, ohne die Schale).
Sie ist die Antwort auf „keine Position gewählt" und verwiese sonst auf sich selbst.

### Die aktive Position steht in einem Cookie, nicht im Speicher

`mitarbeiter` ist eine Anstellungstabelle, keine Personentabelle: dieselbe `auth_id`
kann mehrere Zeilen halten, auch **mehrfach im selben Betrieb** — am 2026-08-26 am
Testzugang des Kollegen gesehen (Chef, Anna und Tim, alle drei in Testbetrieb 12).
Fast jeder RPC nimmt deshalb `p_mitarbeiter_id`.

Die App hält diese Auswahl in einem React-Context; `TESTING.md` warnt ausdrücklich
davor, im Web-Build eine URL direkt anzusteuern, weil ein Reload sie verliert. Im
Browser ist genau das der Normalfall, und Server Components rendern, bevor irgendein
Context existiert. Die Position muss also serverseitig lesbar sein, bevor die erste
Zeile HTML entsteht — daher `qt_position`, `httpOnly`.

**Das Cookie ist ein Hinweis, kein Nachweis.** Es wird bei jedem Zugriff gegen die
Liste der eigenen aktiven Anstellungen geprüft; ein unbekannter Wert fällt still auf
die Normalfall-Regel zurück. Damit bleibt die Regel aus `TESTING.md` §5.2 gewahrt —
jede hereingereichte ID wird aus `auth.uid()` neu abgeleitet, nie geglaubt. Bei genau
einer Anstellung — dem Normalfall — wird sie auch ohne Cookie genommen; eine Auswahl
zwischen einer einzigen Möglichkeit ist keine.

## Der Einrichtungs-Stepper

**Entscheidung vom 2026-08-19. Sie ersetzt den Weg über Stripe Checkout mit
Weiterleitung, der am 2026-08-10 beschlossen und am 2026-08-18 gebaut wurde.**
Was von jener Fassung weitergilt, steht unten ausdrücklich dabei; alles andere ist
überholt und nicht mehr im Code.

Aus vier getrennten Seiten wird ein zusammenhängender Stepper mit sichtbarem
Fortschrittsbalken:

| Schritt | Inhalt |
| ------- | ------ |
| 1 | Betriebsdaten, Zugangsdaten **und** Code-Bestätigung — in einem Schritt |
| 2 | Plan wählen, Zahlungsmittel eingebettet hinterlegen — **überspringbar** |
| 3 | Rollen anlegen, Mitarbeiter einladen und ihnen Rollen zuweisen |
| 4 | Schichtvorlagen je Wochentag samt Mindestbesetzung |
| — | fertig — es geht direkt in `/dashboard` weiter |

**Warum eingebettet statt Weiterleitung.** Der Bezahlvorgang ist hier kein
Kassengang am Ende eines Einkaufs, sondern der zweite von vier Schritten einer
Einrichtung. Eine Weiterleitung auf eine fremde Domain mitten im Fortschrittsbalken
bricht genau die Zusage, die der Balken gibt — und sie macht das Überspringen
unmöglich, weil die Entscheidung „später" dann auf Stripes Seite fallen müsste. Das
Zahlungsformular gehört deshalb auf unsere Seite, über Stripe Elements mit dem
Payment Element.

### Zahlung ist überspringbar, das Abo entsteht trotzdem

Wer in Schritt 2 überspringt, bekommt **trotzdem ein Stripe-Abonnement** — es ist
der Träger der Testphase, nicht der Beleg einer Zahlung. Angelegt wird es mit
`trial_period_days` (14, Wert aus `TESTPHASE_TAGE` in `src/lib/site.ts`) und ohne
Zahlungsmittel. Das ist kein Sonderfall, sondern der von Stripe vorgesehene Weg: bei
einem Trial ist nichts fällig, die Rechnung lautet auf 0,00 € mit dem Posten „Free
trial", und das Abo geht direkt auf `trialing`.

`payment_behavior` spielt hier **keine** Rolle. Der Parameter steuert, was bei einer
fälligen ersten Zahlung geschieht — bei einem Trial gibt es keine. Aus demselben
Grund ist der Stripe-Status `incomplete` in diesem Flow unerreichbar.

**Seit dem 2026-09-14 gilt das nur noch für das erste Abo eines Betriebs** — ein
Neuabschluss nach Kündigung hat keine Testphase, ist nicht überspringbar und
entsteht `incomplete`. Siehe „Änderung vom 2026-09-14: eine Testphase je Betrieb".

### `missing_payment_method: 'pause'` trägt das Ablauf-Tor

```
trial_settings[end_behavior][missing_payment_method] = pause
```

Läuft die Testphase ohne hinterlegte Karte ab, setzt Stripe das Abo auf `paused` und
schickt `customer.subscription.paused`. Der Webhook schreibt daraus
`status = 'pausiert'`, und **daran** erkennt die Website „Testphase abgelaufen, kein
Zahlungsmittel" — ohne eine einzige Datumsrechnung.

Das ist keine Bequemlichkeit, sondern die einzige Möglichkeit: `betrieb_abonnements`
hat **keine Spalte für das Ende der Testphase**, und das Schema wird von hier aus
nicht verändert. Ein Tor auf „14 Tage vorbei" hätte gar keine Datengrundlage. Stripe
rechnet, wir lesen das Ergebnis ab.

`cancel` wäre die falsche Wahl: ein gekündigtes Abo lässt sich nicht wieder
aufwecken, aus „Zahlungsmethode nachreichen" würde ein Neuabschluss.
`create_invoice` ebenfalls — das führt auf `past_due` → `zahlung_ausstehend`, und das
sperrt bewusst nichts. Kommt die Karte nach, wird dasselbe Abo per `resume`
fortgesetzt.

**Am 2026-08-23 mit einer Stripe-Testuhr durchgespielt** — vorher war die ganze
Sperrlogik eine Annahme. Beobachtet: Testphase läuft ohne Karte ab → Stripe setzt
`paused` → Webhook schreibt `pausiert` → Karte nachgereicht → dasselbe Abo läuft als
`active` weiter. Kein neues Abo, keine Datumsrechnung.

**`resume` allein reicht dabei nicht.** Der Aufruf erzeugt eine **offene Rechnung**
über den vollen Monatsbetrag mit `auto_advance: false`, und das Abo bleibt so lange
`paused`, bis diese bezahlt ist — im Test über eine Stunde, bis Stripe von selbst
einzog. Für die Sperrseite wäre das die schlechteste denkbare Reihenfolge: Karte
hinterlegt, „danke" gelesen, weiter gesperrt. `nimmAboWiederAuf()` bezahlt die
Rechnung deshalb sofort mit `invoices.pay()`. Schlägt das fehl (abgelehnte Karte),
bleibt das Abo pausiert und der Grund wird angezeigt statt verschluckt —
`ZahlungAbgelehnt` in `src/lib/stripe.ts`.

### Zwei Folgen, die leicht zu übersehen sind

**`stripe_subscription_id` beantwortet nicht mehr die Frage „hat bezahlt?".** Die
Regel vom 2026-08-11 — Stufe 1 fragt die Subscription-ID und ausdrücklich nicht
`status` — war zu ihrer Zeit richtig: damals erzwang der Checkout die Karte, eine
Subscription-ID konnte ohne Zahlungsmittel gar nicht entstehen, und `status` stand
während der Testphase auf `trial`, war für die Frage also unbrauchbar. Mit dem
Überspringen-Weg entsteht die ID auch ohne Karte. Gefragt wird deshalb künftig
`status`; die Subscription-ID ist nur noch die Existenzfrage „gibt es überhaupt ein
Abo".

**Die Sperre gegen Doppelanlage kann nicht aus unserer Datenbank kommen.** Naheliegend
wäre „steht schon eine `stripe_subscription_id` in der Zeile?" — die schreibt aber nur
der Webhook, und der ist asynchron. Zwischen „Abo angelegt" und „Zeile aktualisiert"
liegen Sekunden, in denen ein Reload ein zweites Abo erzeugt. Selbst schreiben dürfen
wir die Zeile nicht; das ist der Sinn der service_role-Ausnahme. Die Prüfung läuft
deshalb **gegen Stripe**: Customer über `metadata['betrieb_id']` suchen, dessen
Abonnements auflisten. Ein API-Aufruf mehr, dafür keine Aufweichung der Regel.

### Zahlungsmittel: eigener SetupIntent, nicht `pending_setup_intent`

Das Feld `subscription.pending_setup_intent` ist bei einem Trial ohne Karte
**gefüllt** und wäre grundsätzlich benutzbar — am 2026-08-19 gegen die Sandbox
geprüft: `status = requires_payment_method`, `usage = off_session`, `client_secret`
vorhanden. Trotzdem wird ein eigener SetupIntent erzeugt, und zwar aus einem
handfesten Grund:

Stripes eigener Intent kommt mit `payment_method_types: ["card", "link"]` und
`automatic_payment_methods: null`. Er zeigt also Karte und Link — und sonst nichts.
Ein selbst erzeugter Intent mit `automatic_payment_methods: { enabled: true }` zeigt,
was im Dashboard freigeschaltet ist, und dazu gehört im Zielmarkt AT/DE die
SEPA-Lastschrift. Für einen Gastrobetrieb ist das kein Randfall, sondern oft das
bevorzugte Zahlungsmittel.

Dazu kommt: der `pending_setup_intent` entsteht einmal beim Anlegen des Abos. Wir
brauchen einen Intent an zwei Zeitpunkten — in Schritt 2 und womöglich Wochen später
auf der Sperrseite. Einen frisch erzeugten kann man einfach noch einmal erzeugen;
einen geteilten, dessen Zustand von einem früheren Versuch abhängt, nicht.

Erzeugt wird also ein eigener SetupIntent auf den Customer
(`usage: 'off_session'`, `automatic_payment_methods`). Clientseitig:

```
stripe.confirmSetup({ elements, confirmParams: { return_url }, redirect: "if_required" })
```

`redirect: "if_required"` ist der Grund, warum der Schritt überhaupt eingebettet
funktioniert: Karten werden ohne Weiterleitung bestätigt, nur 3DS-Fälle verlassen die
Seite kurz. Nach Erfolg wird die Zahlungsmethode als Standard am Customer und am
Abonnement gesetzt.

Derselbe Baustein trägt zwei Stellen — Schritt 2 und die Sperrseite nach abgelaufener
Testphase. Sie unterscheiden sich im Text darum herum, nicht im Mechanismus. Zwei
Umsetzungen desselben Formulars wären zwei Gelegenheiten, sich zu widersprechen.

### Wiedereinstieg wird abgeleitet, nicht gespeichert

Wer den Stepper verlässt und sich später erneut anmeldet, landet dort, wo er
aufgehört hat. Dafür gibt es **kein Flag und kein neues Feld** — der Stand ergibt sich
aus dem, was ohnehin da ist:

| Beobachtung | Ziel |
| ----------- | ---- |
| keine Session | `/login` |
| Session, aber kein Betrieb als Chef | Schritt 1 |
| kein Abo bei Stripe | Schritt 2 |
| `status = 'pausiert'` | Sperrseite „Testphase abgelaufen" |
| keine Rolle im Betrieb | Schritt 3 |
| keine Vorlage mit Mindestbesetzung | Schritt 4 |
| sonst | `/dashboard` |

**Es gibt keinen Abschluss-Screen mehr.** Bis zum 2026-08-29 lag zwischen
fertiger Einrichtung und Dashboard die Seite `/einrichtung/fertig` — Zusammenfassung,
Store-Badges, ein Knopf „Zum Dashboard". Sie war richtig, solange die native App das
Ziel war und es hier nichts zu tun gab. Mit dem Web-Dashboard füllt sie keine Lücke
mehr, sondern baut eine: **die Ableitung läuft bei jeder Anmeldung**, nicht nur bei
der ersten, und damit landete auch die tägliche Anmeldung eines längst eingerichteten
Betriebs auf „Dein Betrieb steht". Ein Abschluss, den man täglich abschliesst, ist
keiner. Der Zustand `fertig` bleibt und heisst dasselbe; er ist der Endpunkt der
Ableitung und war nie der Name einer Seite.

**Mitarbeiter sind bewusst kein Kriterium.** Ein Betrieb, in dem vorerst nur der Chef
arbeitet, ist zulässig; würde „mindestens eine Einladung" zur Bedingung, käme er nie
aus Schritt 3 heraus. Eine Vorlage ohne Mindestbesetzung zählt nicht mit — sie wäre in
der App ohnehin unsichtbar.

**`status = 'gekuendigt'` ist behandelt, auch wenn er in der Tabelle oben keine
eigene Zeile hat.** `ermittleStandFuer()` behandelt ihn wie „kein Abo“ und
`pruefeSperre()` leitet Chefs auf `/einrichtung/zahlung`, wo sich ein neues Abo
abschliessen lässt. Hier stand bis zum 2026-09-13, der Fall falle bis ins
Dashboard durch; das war zu dem Zeitpunkt schon nicht mehr wahr.

### Änderung vom 2026-09-14: zwei Fehler auf dem Weg aus der Sperre

**Rückkehr nach einer Weiterleitung auf der Sperrseite.** `ZahlungsFormular`
schickte die `return_url` fest auf `/einrichtung/zahlung`, auch von der Sperrseite
aus. Schritt 2 leitet einen gesperrten Betrieb aber vor jeder Auswertung auf die
Sperrseite um, und `redirect()` verwirft den Query-String: `?setup_intent=` kam nie
an, die bestätigte Zahlungsmethode wurde nie übernommen, ohne Fehlermeldung. Betraf
jedes Zahlungsmittel, das die Seite verlässt (PayPal, Bank-Weiterleitungen, 3DS mit
Weiterleitung). **Jetzt** gibt die Sperrseite `rueckkehrPfad` mit — die Seite, die
das Formular zeigt, wertet die Rückkehr auch aus.

**`pausiert` wird bei Stripe bestätigt.** Vorher kam die Sperre allein aus der
Zeile, die nur der Webhook ändert. Wer auf der Sperrseite bezahlt hatte, war bei
Stripe schon `active`, die Zeile aber noch `pausiert` — und stand wieder vor
„Kostenpflichtig fortsetzen". **Jetzt** fragen Stepper (`ermittleStandFuer`) und
Dashboard-Tor (`pruefeSperre`) beide über `aboLageBeiStripe()` nach, **nur**
wenn die Zeile `pausiert` oder `gekuendigt` sagt (bzw. im Stepper noch keine
Subscription-ID trägt). Stripe kann die Sperre aufheben, nicht erfinden; ist Stripe
nicht erreichbar, bleibt sie. Beide Tore müssen dieselbe Frage stellen — fragte nur
eines nach, schickten sie sich den Kunden gegenseitig im Kreis zu. Die Regel „der
Webhook schreibt `betrieb_abonnements` allein" bleibt unberührt: gelesen wird bei
Stripe, geschrieben nichts.

### Änderung vom 2026-09-14: eine Testphase je Betrieb

**Vorher:** `erstelleAbo()` gab jedem neuen Abo `trial_period_days`. Ein gekündigter
Betrieb wird in den Zahlungsschritt geschickt, um neu abzuschliessen — und bekam
dort die nächste Testphase, ohne Karte. Während der Testphase im Kundenportal
kündigen, neu abschliessen, wieder kündigen: unbegrenzt kostenlos.

**Jetzt:** Die Testphase gibt es nur, wenn der Stripe-Kunde des Betriebs noch **nie**
ein Abo hatte (`holeAboVerlauf()`, `status: "all"` zählt gekündigte mit). Jedes
weitere Abo entsteht mit `payment_behavior: "default_incomplete"` — Status
`incomplete`, erste Rechnung offen, kein Einzugsversuch ohne Karte.
`uebernimmZahlungsmittel()` bezahlt sie sofort (`bezahleOffeneRechnung()`, dieselbe
Mechanik wie beim Wiederaufnehmen). Ohne Karte verfällt das Abo nach 23 Stunden
kostenlos (`incomplete_expired` → `gekuendigt`).

- **Kein Überspringen:** Plan-Auswahl ohne „Später hinterlegen", Text ohne
  „14 Tage kostenlos"; `planWaehlen()` ignoriert `absicht=ueberspringen`, wenn das
  Abo `incomplete` ist. Die Zahlungsansicht nennt die sofortige Abbuchung
  (`zusammenfassungNeuabschluss()`), der Knopf heisst „Kostenpflichtig abonnieren".
- **Beide Tore zählen `incomplete` wie „kein Abo"** (`aboLageBeiStripe()` →
  `unbezahlt`). Sonst wäre das blosse Anlegen schon der Zugang. Der Webhook
  schreibt für `incomplete` weiterhin nichts, die Zeile bleibt also `gekuendigt`,
  bis bezahlt ist.
- **Planwechsel vor der Zahlung:** ein `incomplete`-Abo wird nicht umgestellt,
  sondern gekündigt und neu angelegt — an ihm hängt die offene Rechnung über den
  alten Betrag, und das Kündigen stoppt deren Einzug.
- **Idempotenzschlüssel** trägt jetzt die Anzahl bisheriger Abos statt `:steuer`.
  Vorher lieferte Stripe einem Betrieb, der binnen 24 Stunden kündigte und neu
  abschloss, das alte, gekündigte Abo als Antwort zurück — und es entstand keins.

**Grenze:** gezählt wird je Stripe-Kunde, und der hängt am Betrieb. Eine zweite
Registrierung mit anderer Adresse ist ein neuer Betrieb und bekommt eine neue
Testphase — das war schon immer so und ist über den Betrieb nicht zu fassen. AGB
§ 5 Abs. 2 („beginnt mit der Wahl des Tarifs im Anschluss an die Registrierung")
deckt die Regel; eine Textänderung war nicht nötig.

### Änderung vom 2026-09-13: Kündigung über das Stripe-Kundenportal

**Vorher:** Es gab keine Oberfläche zum Kündigen. AGB § 6 Abs. 2 nannte die
Kündigung „über die im Dienst oder beim Zahlungsdienstleister dafür vorgesehene
Funktion“, aber keine davon existierte, und es blieb nur die E-Mail.

**Jetzt:** In `/dashboard/einstellungen` steht für Chefs „Abo verwalten“
(`aboVerwalten()` in `einstellungen/aktionen.ts`). Der Knopf öffnet das
Stripe-Kundenportal: Kündigung zum Periodenende, Wechsel des Zahlungsmittels,
Rechnungen. Die Kunden-Id wird serverseitig abgeleitet und nie aus dem Formular
gelesen. Welche Funktionen das Portal anbietet, steht in der Portal-Konfiguration
im Stripe-Dashboard; ohne gespeicherte Konfiguration zeigt die Seite einen Fehler
und verweist auf die E-Mail.

**Grund:** Befund 5 der externen rechtlichen Durchsicht vom 2026-09-13. Entschieden
hat die Betreiberin: Portal statt eigenem Knopf.

**Dazu gehört:** Die Zahlungsansichten (Schritt 2 und Sperrseite) zeigen Betrag,
tatsächliches Testphasenende, erste Abbuchung, Verlängerung und Kündigung direkt
über dem Knopf. Diese Angaben werden aus dem Stripe-Abo gelesen, nicht aus `plaene` /
`TESTPHASE_TAGE` (`src/lib/abo-konditionen.ts`). Weicht der Stripe-Preis vom
Anzeigepreis ab, landet `[preise] …` im Protokoll.

Die Expo-App hat kein Gegenstück, und das ist kein Paritätsbruch: Abo und Zahlung
liegen ohnehin nur hier.

### Änderung vom 2026-09-13: Umsatzsteuer über Stripe Tax

**Vorher:** Kein Abo trug `automatic_tax`, kein Steuersatz war gesetzt. Stripe buchte
den Nettopreis als Bruttobetrag ab, obwohl AGB § 5 Abs. 1, `/preise` und die
Zahlungsansicht „zzgl. USt." sagen.

**Jetzt:** `erstelleAbo()`, `wechslePlan()` und `uebernimmZahlungsmittel()` setzen
`automatic_tax: { enabled: true }`. Stripe Tax braucht dafür einen Standort des
Kunden; für AT/DE genügt das Land, und das kommt aus `betriebe.land`
(`holeRechnungsangaben()` in `src/lib/betrieb.ts`, `stelleSteuerstandortSicher()` in
`src/lib/stripe.ts`). Ein im Kundenportal gepflegtes Land wird nicht überschrieben.

**Österreichische Betriebe** bekommen in Schritt 2 ein freiwilliges Feld „UID-Nummer";
sie geht als `eu_vat` an den Stripe-Kunden und entscheidet über Reverse Charge.
Deutsche Betriebe bekommen kein Feld — für einen Inlandsumsatz ändert die Nummer
nichts. Zod-Regel `feldSchemata.uid`, doppelt geprüft wie jedes Feld.

**Voraussetzung im Stripe-Dashboard, sonst geht nichts oder es wird 0 % aufgeschlagen:**
Stripe Tax aktiv, eine **Registrierung für Deutschland** (am 2026-09-13 im Live-Konto:
aktiv, aber ohne jede Registrierung) und Preise mit `tax_behavior: exclusive`.
`pruefePreisGleichstand()` schreibt `[preise] …` ins Protokoll, wenn ein Preis nicht
netto angelegt ist oder ein Abo ohne `automatic_tax` läuft. Welcher Satz bei
österreichischen Betrieben **ohne** UID gilt, hängt an der OSS-Einstellung in Stripe Tax
und ist eine Frage an die Steuerberatung, keine an den Code.

**Ein Chef, mehrere Standorte ist nicht unterstützt.** Der Stepper geht durchgehend
von einem Betrieb pro Anmeldung aus: `holeChefBetriebId()` liefert den ersten, für den
`ist_chef` wahr ist, und die ganze Ableitung hängt daran. `stelleBetriebSicher()` hat
das schon immer so gehalten — ein zweiter Betrieb liess sich unter derselben Anmeldung
nie anlegen, das Formular dafür war nur bis zum 2026-08-21 noch sichtbar. Der einzige
Weg zu einem zweiten Standort ist heute eine zweite, unabhängige Registrierung mit
anderer E-Mail-Adresse.

Wird daraus ein echtes Szenario — eine Kette, ein Franchise, zwei Lokale unter einer
Leitung — braucht es eine eigene Entscheidung: eine Betriebsauswahl im Stepper, ein
anderes Verhalten von `meine_betriebe()`, und eine Antwort darauf, welcher Betrieb bei
Login gemeint ist. Jetzt nicht bauen, aber beim nächsten Anfassen dieser Ableitung
prüfen.

Das Tor gilt **immer**, nicht nur ab der zweiten Anmeldung. Gleicher Zustand, gleiche
Antwort, unabhängig davon, über welchen Weg jemand ankommt.

### Was aus der Checkout-Fassung unverändert weitergilt

**Stripe-Price-IDs stehen durchgehend in Env-Variablen**, je Plan eine
(`STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`) — nie als Literal
im Code, auch nicht „vorläufig". Der Code kennt nur die drei Plan-IDs aus
`src/lib/site.ts` und schlägt die Price-ID dazu nach. Fehlt eine, ist das ein
Konfigurationsfehler mit klarer Meldung, kein stiller Fallback auf einen anderen Plan.

**Die Plan-IDs bleiben `basic` | `pro` | `business`.** Angezeigt werden sie als Low,
Medium und Business. Das sind reine Anzeigenamen — der CHECK auf
`betrieb_abonnements.plan` lässt nur die drei IDs zu, und Umbenennen wäre eine
Schema-Änderung, die von hier aus nicht stattfindet.

**Preise, festgelegt am 2026-08-23:** Low 29 €, Medium 49 €, Business 69 € im Monat,
mit den Grenzen „bis 15 / 30 / 50 Mitarbeiter" (Business zusätzlich ein Standort). Die
Beträge stehen für die Anzeige in `plaene` in `src/lib/site.ts`; abgerechnet wird nach
dem Stripe-Preis hinter der jeweiligen `STRIPE_PRICE_*`-Variablen. Nichts im Code hält
beide synchron.

**Ein Betrag lässt sich in Stripe nicht ändern.** `prices.update` kann alles ausser
`unit_amount`. Eine Preisänderung heisst deshalb: neuen Price anlegen, ihn am Produkt
als `default_price` setzen (sonst weigert sich Stripe, den alten zu archivieren), den
alten archivieren, die neue ID in die Umgebung eintragen. Laufende Abos bleiben
unberührt — sie hängen am alten Price, bis jemand sie umstellt.

**`Custom` ist kein vierter Plan, sondern der Weg daran vorbei.** Mehrere Standorte
oder über 50 Mitarbeiter laufen über eine Kontaktaufnahme, nicht über den
Self-Service. Der Tarif steht deshalb als `customTarif` **neben** `plaene` und nicht
darin: in `plaene` wäre er in Schritt 2 auswählbar und würde beim Schreiben am CHECK
scheitern.

**Der Webhook bleibt die einzige Stelle, die `betrieb_abonnements` schreibt**, und er
läuft unabhängig von der Oberfläche. Keine Seite darf voraussetzen, dass er schon
durch ist — eine Verzögerung von Sekunden ist normal. Wer den Stand braucht, bevor er
da sein kann, fragt Stripe direkt statt zu warten.

**`NEXT_PUBLIC_APP_URL` zeigt auf die native App, nicht auf eine Web-Version.** Wo
immer auf die App hingewiesen wird, geschieht das über Store-Badges statt über einen
Link. **Zurzeit gibt es keine solche Stelle**: sie stand auf dem Abschluss-Screen, und
den gibt es seit dem 2026-08-29 nicht mehr. `store-badges.tsx` bleibt trotzdem im
Repo — die Komponente ist die einzige Umsetzung der Regel unten, und die gilt weiter.
Wer den Hinweis auf die App wieder unterbringt, benutzt sie und baut keine zweite.

**Der QR-Code ist bewusst nicht gebaut, obwohl hier lange etwas anderes stand.**
Geplant war ein Inline-SVG ohne Bibliothek. Umgesetzt wurde er nicht, weil die App
nicht veröffentlicht ist und die Website vor ihr live gehen kann: ein QR-Code, der auf
nichts zeigt, ist kein Platzhalter, sondern eine Sackgasse mit Aufforderungscharakter —
er verlangt, gescannt zu werden, und bestraft jeden, der es tut. Die Store-Badges sind
stattdessen gestrichelt umrandet und ohne `href`; `store-badges.tsx` wirft, wenn jemand
`verfuegbar` setzt, ohne echte Ziele zu hinterlegen. Sobald die App in den Stores ist,
kommen Links **und** QR-Code zusammen — vorher keins von beidem.

**`/preise` bleibt eine reine Marketingseite.** Die Planwahl ist in Schritt 2
gewandert; der CTA verweist nur noch auf `/registrieren` und gibt keinen Plan mehr mit.

### Ausdrücklich nicht Teil dieses Repos

Eine Sperre, die jemanden ohne Zahlung an der Arbeit **in der nativen App** hindert —
ob über RLS oder app-seitig — wird hier weder entschieden noch gebaut. Sie beträfe
unmittelbar das Verhalten im Repo des Kollegen und wird mit ihm abgestimmt.

**Erledigt am 2026-08-26 mit der Dashboard-Schale:** `betreteDashboard()` prüft die
Sperre vor jedem Seitenaufbau und leitet auf dieselbe Sperrseite wie der Stepper —
`/einrichtung/testphase-abgelaufen`, nicht eine zweite Umsetzung davon.

**Die Sperre greift dabei nur für Chefs, und das ist Absicht.** Technisch ginge es
nicht anders: `betrieb_abonnements` trägt ausschliesslich `abonnement_select_chef`.
Für eine angestellte Person liefert die Abfrage keine Zeile — was „nichts zu sehen"
heisst und nicht „kein Abo". Daraus eine Sperre abzuleiten hiesse, jeden Mitarbeiter
jedes Betriebs auszusperren. Inhaltlich passt es zum Absatz oben: gesperrt wird die
Verwaltung, nicht die Schicht. Wer eingeteilt ist, sieht seinen Dienstplan auch dann,
wenn der Chef die Karte nicht hinterlegt hat.

## Der Soft-Launch-Schalter

**`SOFT_LAUNCH` ist der einzige Schalter für „Konten und Verträge sind zu".**
Er steuert beides: welche Routen ausgeliefert werden **und** ob es sichtbare Wege
dorthin gibt. Ein zweiter Mechanismus für die Sichtbarkeit — eine eigene
Konstante, ein Feature-Flag daneben — wäre eine zweite Gelegenheit, in die
falsche Richtung zu zeigen: Knöpfe vor einer gesperrten Route, oder eine offene
Route ohne Weg dorthin.

| Umgebung | Wert | Wirkung |
| -------- | ---- | ------- |
| Produktion (Vercel Env) | `SOFT_LAUNCH=an` | Sperre steht |
| Lokal und Staging | `SOFT_LAUNCH=aus` | Voller Entwicklungs- und Testbetrieb |

**`an` ist in Produktion ausdrücklich zu setzen, obwohl es der Default wäre.**
`softLaunchAktiv()` liest `process.env.SOFT_LAUNCH?.trim().toLowerCase() !== "aus"`
— die Sperre ist also standardmässig geschlossen, und ein fehlender, leerer oder
vertippter Wert lässt sie zu. Das ist die richtige Richtung für einen Schalter,
der Kontoanlage und Zahlung verhindert. Der Eintrag in der Vercel-Umgebung ist
trotzdem Pflicht: der Zustand einer Produktionsumgebung soll ablesbar sein und
nicht aus einer Abwesenheit folgen.

**Warum die Sperre in Produktion steht.** `/datenschutz` und `/agb` sind
Entwürfe mit sichtbar markierten Platzhaltern; nur `/impressum` ist final. Solange
das so ist, darf sich kein echter Betrieb registrieren und kein Vertrag zustande
kommen — es gäbe keine gültige Grundlage dafür, und die Datenschutzerklärung
beschriebe eine Verarbeitung, die die Seite dann tatsächlich vornimmt. Der
Launch verschiebt sich; am Produkt wird weitergebaut. Die Sperre fällt, wenn die
Rechtstexte final sind, nicht früher.

**Zwei Ebenen, beide am selben Schalter** — die Begründung im Einzelnen steht in
`src/lib/soft-launch.ts`:

1. `src/middleware.ts` leitet jede Adresse unter `GESPERRTE_PRAEFIXE` auf `/` um
   (307 für GET, 303 sonst) und fasst dabei keine Sitzung an.
2. `createClient()` (`src/lib/supabase/server.ts`) und `stripeKlient()`
   (`src/lib/stripe.ts`) rufen `verlangeSoftLaunchFrei()`. Das schliesst die Lücke,
   die Ebene 1 offen lässt: eine Server Action ist über ihre ID von jeder Route
   aus adressierbar, auch von der offenen Startseite.

**Die Sichtbarkeit hängt an denselben `softLaunchAktiv()`.** Wer eine weitere
Stelle mit einem Weg nach `/login`, `/registrieren` oder `/passwort-vergessen`
baut, hängt sie dort an und führt keine eigene Bedingung ein:

- `src/components/site-header.tsx` — „Anmelden" und „Kostenlos testen"
- `src/components/mobile-menu.tsx` — dieselben zwei Einträge im Panel; der Header
  reicht die Beschriftungen herein, weil die Insel den Schalter nicht lesen kann
  (`SOFT_LAUNCH` trägt bewusst kein `NEXT_PUBLIC_`-Präfix)
- `src/components/site-footer.tsx` — Spalte „Konto", und mit ihr die vierte
  Rasterspalte
- `src/components/landing/hero.tsx` — die zwei Hero-Knöpfe; `authOffen` kommt als
  Prop aus `src/app/(landing)/page.tsx`, aus demselben Grund wie beim Menü
- `src/components/landing/pricing-abschnitt.tsx` und
  `src/app/(site)/preise/page.tsx` — Buchen-Weg gegen „Bald verfügbar"
- `src/app/layout.tsx` — JSON-LD `offers`. Ein `availability: InStock` ist
  gegenüber Suchmaschinen die Zusage „jetzt zu diesem Preis kaufbar"

**Was nicht am Schalter hängt und warum.** `public/llms.txt` ist eine statische
Datei und beschreibt den Abschnitt „Stand" so, wie er in Produktion gilt —
dort steht die Sperre. Eine Umschaltung wäre nur lokal sichtbar und machte die
Datei in Produktion falsch, sobald jemand sie vergisst. `oeffentlicheRouten` und
`authRouten` in `src/lib/site.ts` bleiben ebenfalls unverändert: sie beantworten
„gehört das in den Index?", nicht „darf das ausgeliefert werden?" — Auth-Routen
gehören auch nach dem Launch nicht in Sitemap und Suchindex.

## Harte Vorgaben

**Farben kommen aus `docs/Farbpalette.html`.** Grün / Bronze / Rot auf dunklem Grund,
dort stehen Kernpalette, Rollenzuordnung und beide Modi. Übernommen sind sie in Ebene 1
von `src/app/globals.css` — wörtlich, nicht nachempfunden. Wer einen Wert ändern will,
ändert zuerst das Palettendokument.

- Komponenten benutzen ausschliesslich die semantischen Tokens aus Ebene 2
  (`bg-surface`, `text-muted`, `border-line`, …), nie einen Hex-Wert
- Mengenverhältnis laut Palette: ~70 % dunkle Basis, 20 % Grün, 8 % Bronze, 2 % Rot
- **Rot ist Fehlern und destruktiven Aktionen vorbehalten.** Nicht für Hervorhebungen
- Wo ein Palettenwert unter 4.5:1 für Fliesstext bleibt, wird er im Token minimal
  aufgehellt statt ersetzt — die drei Stellen sind in `globals.css` einzeln begründet

**Zwei eng gefasste Ausnahmen für Kontrast, freigegeben am 2026-08-29.** Beide ändern
kein einziges Ebene-1-Token; sie mischen vorhandene Palettenwerte anders. Beide sind im
Browser gemessen, nicht geschätzt, und in `globals.css` an Ort und Stelle begründet.

`--qt-muted-sunk` — Sekundärtext auf versenkter Fläche. `--qt-muted` ist gegen
`--qt-bg` getunt (4.63:1) und fällt auf `--qt-surface-sunk` auf 4.29:1, also unter AA.
Genau dort stehen die Beschriftungen der Auswahl-Chips. Ein Viertel Bone statt einem
Zehntel bringt 5.41:1.

`--qt-border-control` — die Grenze eines **Bedienelements**, nicht jede Linie.
`--qt-border` trägt Kartenkanten und Trennstriche; das ist Dekoration, und dafür
verlangt WCAG nichts. Bei den Auswahl-Chips ist derselbe Rahmen aber die einzige
Grenze des Elements — ihre Fläche unterscheidet sich vom Seitengrund nur um 1.28:1 —,
und damit gilt 1.4.11 mit 3:1 gegen gemessene 1.45:1. 70 % Bronze im Dunkelmodus
bringt 3.23:1.

**Warum ein eigenes Token und nicht `--qt-border` selbst**, obwohl genau das
freigegeben war: ausprobiert und verworfen. Mit 70 % auf `--qt-border` bekommt jede
Karte und jede Trennlinie eine deutlich goldene Kante — auf der Dashboard-Übersicht
allein 21 Elemente —, das Mengenverhältnis oben (~8 % Bronze) kippt sichtbar, und
`--qt-border-strong` läge mit 48 % **unter** der gewöhnlichen Linie: ein Feldrahmen
zurückhaltender als ein Trennstrich. Getrennt gehalten bleibt die Rangfolge intakt
(1.42 < 2.17 < 3.34) und die Dekoration ruhig.

**Die Ausnahmen gelten für diese beiden Token und sonst nichts.** Wer eine dritte
braucht, misst zuerst und begründet sie hier — sie sind kein Freibrief, an der Palette
zu drehen, sondern zwei benannte Stellen, an denen ein Kontrastwert die Form gewinnt.

**Server Components sind Pflicht.** `"use client"` steht nie am Anfang einer
`page.tsx` oder eines Layouts, sondern ausschließlich in kleinen isolierten
Komponenten (Hero-Animation, Formulare, mobiles Menü). Prüfkriterium: `curl` auf jede
Route liefert den vollständigen sichtbaren Text im HTML.

**Metadata je Route, nicht global:**
- Eigener `<title>` pro Seite über `title.template` im Root-Layout
- Eigene, individuell geschriebene Description pro Seite — keine kopierte
- `metadataBase` + `alternates.canonical` im Root-Layout
- `opengraph-image.tsx` je Route über `next/og`, plus Twitter-Card-Fallback
- Echtes Favicon-Set: `icon.svg`, `apple-icon.png`, `favicon.ico`. Nicht das Next-Default

**Semantik:**
- Genau ein `<h1>` pro Seite. Große Textblöcke ohne Überschriftenfunktion werden `<p>`
- Überschriftenhierarchie ohne Sprünge
- `lang="de"` im Root-Layout
- Alt-Text auf jedem Bild; dekorative bekommen `alt=""`
- `not-found.tsx`, `error.tsx`, `global-error.tsx` im Seitendesign, mit Weg zurück

**Crawler:**
- `app/sitemap.ts` und `app/robots.ts`
- robots: Auth-Routen ausschließen, AI-Crawler (GPTBot, ClaudeBot, PerplexityBot)
  **nicht** blocken
- `public/llms.txt` mit kurzer strukturierter Produktbeschreibung
- JSON-LD im Root-Layout: `Organization` + `SoftwareApplication` mit
  `applicationCategory: BusinessApplication` und `offers` für die drei Pläne

**Sauberkeit:**
- Console beim Laden leer: keine Hydration-Mismatches, keine Key-Warnungen, keine 404s
- Keine Source Maps in Produktion (`productionBrowserSourceMaps` bleibt aus)
- First Load JS der Landing Page: **unter 165 kB gzipped bzw. 140 kB brotli**.
  Am 2026-09-10 gegen `.next-build` gemessen: **158,5 kB gzip, 137,4 kB brotli,
  493,5 kB roh** (Summe der neun JS-Dateien, die `app-build-manifest.json` für
  `/(landing)/page` listet, einzeln durch `zlib` gejagt).
  **Die Zahl in der Tabelle von `next build` ist bereits gzipped** —
  `experimental.gzipSize` steht in Nexts Vorgaben auf `true`, ihre „162 kB"
  sind also mit diesem Budget unmittelbar vergleichbar und **nicht** mit einem
  Rohwert. Der bisherige Wert von 150 kB war damit nicht falsch verglichen,
  sondern schlicht überschritten; das neue Budget liegt dicht über dem
  gemessenen Stand, damit es Rückschritte fängt, statt dauerhaft rot zu stehen.
  Was der Browser tatsächlich lädt, hängt am Hoster: gzip ist die Untergrenze,
  brotli liefern die üblichen CDNs aus.
  Keine Animationsbibliothek für etwas, das CSS auch kann
- Keine Template-Reste: kein „Create Next App", kein Default-README, kein ungenutztes
  Boilerplate-CSS

**Barrierefreiheit:** responsiv ab 375px, sichtbarer Keyboard-Fokus,
`prefers-reduced-motion` respektiert, echte `<label>`-Elemente, Fehlermeldungen über
`aria-describedby` verknüpft.

**Rechtstexte:** aus dem Footer jeder Seite verlinkt. Keine erfundenen Rechtstexte.

### Änderung vom 2026-09-10: aus Gerüsten werden Dokumente

**Vorher** galt: `/impressum`, `/datenschutz`, `/agb` bekommen Gerüste mit
deutlich markierten Platzhaltern. **Jetzt** liegen die Texte vor und werden
gerendert; die Platzhalter-Bausteine `PH` und `EntwurfsHinweis` sind entfernt,
weil sie keinen Aufrufer mehr hatten — und weil „noch nicht
veröffentlichungsreif" über einem ausformulierten Vertrag falsch wäre.

| Route | Quelle | Stand |
| ----- | ------ | ----- |
| `/impressum` | JSX, Rubriken aus dem Wörterbuch | geprüfte Registerangaben |
| `/datenschutz` | `docs/rechtliches/legals/{datenschutzerklaerung-de,privacy-policy-en}.md` | gezeichnet |
| `/agb` | `docs/rechtliches/legals/{AGB-QuickTeam-de,Terms-QuickTeam-en}.md` | 15 §§, platzhalterfrei |
| `/avv` | `docs/rechtliches/legals/{AVV-QuickTeam-de,DPA-QuickTeam-en}.md` | Vorlage mit Kundenlücken |

`RechtsDokument` (`src/components/rechtsdokument.tsx`) liest die Datei zur
Laufzeit und wählt sie nach `qt_sprache`. **Der eigene `?sprache=`-Umschalter auf
`/datenschutz` ist entfallen**: seit es einen Umschalter in der Kopfzeile gibt,
widersprachen sich zwei Schalter, die voneinander nichts wussten.

**Das Impressum übersetzt Rubriken, keine Angaben.** „Registergericht" wird zu
„Registering court", „Amtsgericht Stuttgart" nicht. Registerangaben sind
Tatsachen; wer sie übersetzt, benennt eine Einrichtung, die es unter dem Namen
nicht gibt — und ein Impressum ist der Ort, an dem jemand genau das nachschlagen
können muss.

**`/avv` ist neu und trägt einen Hinweiskasten.** § 7 Abs. 3 der AGB setzt
voraus, dass der Kunde den Auftragsverarbeitungsvertrag bei der Registrierung
schliesst — er muss also lesbar sein. Anders als AGB und Datenschutzerklärung ist
er eine **Vorlage**: `[Firma / Name des Kunden]`, `[Anschrift]` und
`[gesetzliche Vertretung]` stehen wörtlich im Text. Der Kasten sagt, dass die
Klammern kundenspezifische Angaben sind und kein Versehen.

**`MarkdownText` kann seit dem 2026-09-10 Tabellen und Blockzitate.** Anlage 3
des AVV listet die Unterauftragsverarbeiter als Tabelle — ohne Unterstützung wäre
daraus eine Absatzfolge voller Pipe-Zeichen geworden, bei einer Pflichtangabe
nach Art. 28 Abs. 3 lit. d DSGVO.

**Aus den englischen Fassungen ist der Reviewer-Hinweis entfernt worden.**
`Terms-QuickTeam-en.md` und `DPA-QuickTeam-en.md` begannen mit einem Blockzitat
„Note (not part of the contract text) …", das interne Dateipfade
(`src/lib/legalDocs.ts`) und den Vermerk „Pre-lawyer draft" enthielt — und
`/agb` ist eine öffentliche Route, nicht in `GESPERRTE_PRAEFIXE`. Die
Vorrang-Aussage geht dabei nicht verloren: sie steht normativ in § 14 Abs. 6 des
Vertragstexts selbst. Der Review-Status steht weiterhin im README daneben.

**`SOFT_LAUNCH` bleibt trotzdem stehen, und das ist der Kern.** Die Sperre fällt
laut dem Abschnitt „Der Soft-Launch-Schalter", wenn die Rechtstexte **final**
sind. `docs/rechtliches/legals/README.md` bezeichnet alle vier Dokumente
ausdrücklich als „pre-lawyer drafts"; die Bedingung ist damit nicht erfüllt. Dass
die Texte jetzt vollständig sind, ist ein anderer Zustand als „geprüft" — von
hier aus wird der Schalter nicht angefasst.

**Erledigt am 2026-09-10: ein Verzeichnis, nicht zwei.** Die
Datenschutzerklärung lag byte-identisch sowohl in `docs/rechtliches/` als auch
in `legals/`. Die obere Fassung ist entfernt, alle vier Rechtsrouten lesen jetzt
aus `docs/rechtliches/legals/`, und das README dort listet alle sechs Dokumente.
Zwei gleiche Fassungen eines Rechtstexts sind eine Gelegenheit, die zu pflegen,
die niemand ausliefert.

## Lighthouse: gemessene Werte, nicht behauptete

**Erstmals im Repo belegt am 2026-09-09.** Vorher gab es dazu nichts: gesucht wurde
in `docs/`, `CLAUDE.md` und `.claude/`, der einzige Zahlenwert war
`docs/quickteam-website-plan.md` mit „Lighthouse ≥ 95" — ein Planungshaken, kein
Messergebnis. Wer sich auf frühere 100er-Werte beruft, beruft sich auf nichts.

Gemessen mit Chrome DevTools Lighthouse, `device: desktop`, `mode: navigation`,
gegen den lokalen Dev-Server mit den Fixtures aus Betrieb „Test":

| Bereich | Accessibility | Datum |
| ------- | ------------- | ----- |
| `/dashboard` (Übersicht) | **100** | 2026-09-09 |
| `/dashboard/kalender` (Chip-Zellen) | **100** | 2026-09-09 |
| `/dashboard/kalender` (Indikator-Zellen) | **100** | 2026-09-09 |

Die dritte Zeile ist der Nachmessung nach dem Umbau auf Indikatorpunkte geschuldet:
mit den Rollenkennfarben kamen vier neue Flächenfarben ins Raster, und
kleine Farbflächen sind der Fall, in dem 1.4.11 (3:1 für bedeutungstragende
Grafik) am ehesten reisst. Tut es hier nicht — die Punkte tragen ihre Auskunft
ohnehin zusätzlich als `title` und Vorlesetext, und die Zahl daneben steht als
Text da.

Die Übersicht stand beim ersten Lauf auf **96**. Ursache war ein einziger
`color-contrast`-Fehlschlag, und zwar an einem Element aus demselben Umbau: die
Initialen in der Personenkarte der Sidebar standen in `text-signal` auf
`bg-signal-weak` — 3.94:1 bei 12 px, gefordert sind 4.5:1. Behoben durch
`text-text`; die Akzentfarbe trägt dort ohnehin die Fläche. Der Wert danach: 100.

**Was in diesen Zahlen nicht steckt:** SEO liegt bei 58, Agentic Browsing bei 67.
Beides ist für angemeldete Dashboard-Seiten ohne Aussagekraft — sie sind per
`robots: { index: false }` bewusst aus dem Index genommen, und ein
Meta-Description-Abzug auf einer Seite, die niemand finden soll, ist kein Befund.
Gemessen wird hier Accessibility.

## Zwei Testbetriebe, zwei Zwecke — nie mischen

Festgelegt am 2026-09-08, nachdem ein Solver-Testlauf nicht durchgeführt werden
konnte, weil er sich nicht sauber hätte zurückbauen lassen.

| Betrieb | Zweck | Was dort passieren darf |
| ------- | ----- | ----------------------- |
| **Test** | dauerhafte Testdaten und Fixtures | Lesen, gezielte Einzeländerungen mit anschliessendem Rückbau |
| **QT-Sandbox-Test** | ausschliesslich zustandsverändernde Läufe | Solver-Läufe, `geplante_schichten_verwerfen()`, alles Betriebsweite |

Die Sandbox ist am 2026-09-08 angelegt worden: `6decd41e-9f80-4e79-a20b-5af22146546a`,
eigenes Konto `hess.alex25+sandbox@gmail.com` (Zugangsdaten beim Nutzer, nicht hier).
Sie steht eingerichtet bereit — eine Rolle „Service", drei Vorlagen (Mo/Mi/Fr,
09:00–17:00, Mindestbesetzung 1) und eine eingeladene Testperson ohne
`soll_stunden`. Diese Grundausstattung überlebt `verwerfen()` und muss nicht vor
jedem Lauf neu gebaut werden; Zyklen, Instanzen und Zuweisungen sind das
Wegwerfmaterial.

**Ein zweiter Betrieb geht nur über ein zweites Konto.** `stelleBetriebSicher()`
überspringt `registriere_betrieb`, sobald man irgendwo Chef ist. Das deckt sich mit
„Ein Chef, mehrere Standorte ist nicht unterstützt" weiter oben.

### Änderung vom 2026-09-11: die öffentliche Registrierung bleibt dauerhaft offen

**Vorher galt** (Regel vom 2026-09-09): `disable_signup` musste in der
Supabase-Auth-Konfiguration auf `true` stehen, weil die Registrierung „die
unterste Sperre gegen Kontoanlage durch Fremde" sei und **unter** `SOFT_LAUNCH`
liege. Testkonten durften deshalb **ausschliesslich** über
`auth.admin.createUser()` entstehen, nie über `/registrieren`.

**Jetzt gilt:** `disable_signup` bleibt `false`. Die öffentliche Registrierung
ist absichtlich dauerhaft offen und ist **kein Sicherheitsproblem**. Ein
Auth-Konto für sich ist wertlos — es trägt keine Anstellung, keinen Betrieb und
keine Rolle. `meine_betriebe()` liefert für ein frisches Konto nichts,
`ist_chef()` ist überall falsch, und keine Policy des Betriebs greift. Wer sich
registriert, kann genau eines: einen eigenen, leeren Betrieb anlegen.

**Begründung:** die Zugriffskontrolle liegt bewusst bei der **Vertragsannahme
und der Zahlung**, nicht bei der Kontoerstellung. Ein Schalter, der die
Kontoanlage verhindert, schützt nichts, was nicht ohnehin schon durch RLS,
Zustimmungstor und Abo-Sperre geschützt ist — er verlagert die Grenze nur an
eine Stelle, an der sie nichts trägt, und macht dabei jeden Testzugang zum
Sonderfall. Die eigentliche Sicherheitsgrenze ist damit Abschnitt B des
Audits (Punkte 11–14), insbesondere die Trennung von **betrieblicher
Vertragsannahme** und **persönlicher Kenntnisnahme**: dort entscheidet sich,
wer für einen Betrieb verbindlich zustimmen darf. Ausführlich in
`docs/audit-a/entscheidung-disable-signup-2026-09-11.md`.

`SOFT_LAUNCH` bleibt davon **unberührt** und bleibt in Produktion auf `an`.
Es ist der Schalter, der Registrierung, Login und Zahlung *als Routen*
unerreichbar macht, solange die Rechtstexte Entwürfe sind — und das ist die
Sperre, auf die es ankommt. `disable_signup` war die zweite Verriegelung an
derselben Tür.

**Für Testkonten heisst das: beide Wege sind erlaubt.** Über `/registrieren`
mit `hole-code.mjs` für den Bestätigungscode, oder direkt per Service-Role.
Der direkte Weg bleibt der bequemere, weil er Mail und OTP überspringt:

```
auth.admin.createUser({
  email, password,
  email_confirm: true,          // spart Mail und OTP-Code
  user_metadata: { betrieb_name, land, vorname, nachname },
})
```

`user_metadata` ist dabei nicht optional, sondern der Kern: `betriebNachtragen()`
liest genau diese vier Felder und reicht sie an `stelleBetriebSicher()` weiter.
Fehlen sie, steht das Konto ohne Betrieb da und die Oberfläche sagt „Angaben nicht
mehr auffindbar".

**Ein per Service-Role angelegtes Konto bekommt keine Zustimmungszeile.** Seit
dem 2026-09-10 schreibt die Registrierung drei Zeilen nach
`rechtliche_zustimmungen` (eigener Abschnitt weiter unten). Der Weg dorthin
führt über `user_metadata.zustimmung_versionen`, und den Schlüssel setzt allein
das Formular. Ein über `auth.admin.createUser()` angelegtes Konto trägt ihn
nicht, bekommt also auch keine Zustimmung eingetragen — und das ist richtig so:
es hat ja niemand geklickt. `betriebNachtragen()` prüft auf den Schlüssel und
überspringt das Schreiben still, statt eine Zustimmung zu erfinden, die es nie
gab. **Wer den Zustimmungsweg prüfen will, nimmt deshalb `/registrieren`** —
oder gibt den Schlüssel ausdrücklich mit.

Nach dem Anlegen ganz normal über `/login` anmelden. Der Stepper erkennt
„Session, aber kein Betrieb als Chef", zeigt Schritt 1 in der Fassung **„Dein
Konto steht — der Betrieb fehlt noch"**, und ein Klick auf „Betrieb jetzt
anlegen" ruft `registriere_betrieb` auf. Die Bedingung dafür ist in
`src/app/(site)/einrichtung/konto/page.tsx` allein `stand.betriebId === null` —
es muss keine Registrierung vorausgegangen sein. Ab dort läuft der Stepper wie
immer.

**`hole-code.mjs` ist damit wieder der normale Weg** für ein über das Formular
angelegtes Testkonto: es holt den OTP-Code, wenn kein Postfach erreichbar ist.
Seine Projekt-Erkennung (`QT_CONFIRM_TEST_SUPABASE_REF`) bleibt bestehen — sie
schützt nicht die Registrierung, sondern davor, versehentlich gegen die
geteilte Instanz zu laufen. Dasselbe gilt für ein etwaiges Skript, das Konten
per Service-Role **anlegt**: `SUPABASE_SERVICE_ROLE_KEY` bleibt auf die in
`.claude/rules/security.md` genannten Stellen beschränkt.

**Der Grund ist eine Funktion, die keinen Zyklus kennt.**
`geplante_schichten_verwerfen(p_betrieb_id)` löscht **jede** `schicht_instanz`
mit `status = 'geplant'` im ganzen Betrieb — nicht die eines bestimmten Laufs.
Ein zweiter Ausweg besteht nicht: `schicht_instanzen.planungszyklus_id` ist
`ON DELETE SET NULL`, ein gelöschter Zyklus lässt seine Instanzen also verwaist
zurück, statt sie mitzunehmen. Wer einen Solver-Lauf rückgängig machen will,
trifft damit zwangsläufig auch alles, was vorher schon `geplant` war.

In „Test" lag am 2026-09-08 genau so ein vorbestehender Datensatz. Ein Testlauf
dort wäre nur um den Preis dieses Datensatzes rückbaubar gewesen — und
wiederherstellen liesse er sich von hier aus nicht, weil aus diesem Repo nicht in
die Datenbank geschrieben wird. Der Lauf ist deshalb unterblieben.

**Die Regel daraus:** in „Sandbox" wird nichts abgelegt, das jemand später
wiederfinden will. Was dort steht, ist Wegwerfware, und genau deshalb darf
`verwerfen()` dort jederzeit betriebsweit zuschlagen. Umgekehrt läuft in „Test"
kein Solver — dort stehen die Fixtures.

Testbetrieb 12 (`3a1d698e-…`) bleibt davon unberührt und ist weiterhin für beides
gesperrt: die Testsuite der App hängt daran (`.claude/rules/supabase.md`).


## Zustimmung zu AGB, AVV und Datenschutzerklärung

**Gebaut am 2026-09-10. Enthält die einzige Schema-Änderung, die je aus diesem
Repo gekommen ist — ausdrücklich freigegeben, mit Begründung.**

### Warum überhaupt

Die rechtliche Vorprüfung hat es benannt: § 7 Abs. 3 der AGB setzt voraus, dass
der Kunde den AVV bei der Registrierung schliesst, und im Formular stand weder
eine Checkbox noch ein Verweis auf AGB, AVV oder Datenschutzerklärung. Eine
Einbeziehung, die nirgends stattfindet, ist keine.

Die Expo-App fragt zwar zu (`src/components/LegalConsentGate.tsx`, Dokumente
`privacy` und `terms`) — legt das Ergebnis aber in **AsyncStorage** ab, also
gerätelokal. Nach einer Neuinstallation ist es weg, und serverseitig gab es nie
einen Nachweis. Eine Tabelle war deshalb nicht die Verdopplung eines bestehenden
Wegs, sondern der erste.

### Die Tabelle

`rechtliche_zustimmungen`. **Neu und eigenständig; an keiner bestehenden Tabelle
wurde etwas geändert.**

| Spalte | Typ | Anmerkung |
| ------ | --- | --------- |
| `id` | `bigint` identity | wie `plan_aenderungen` |
| `betrieb_id` | `uuid` NOT NULL | FK → `betriebe`, `ON DELETE CASCADE` |
| `auth_id` | `uuid` | FK → `auth.users`, `ON DELETE SET NULL` — wie `mitarbeiter.auth_id` |
| `dokument` | `text` NOT NULL | CHECK `agb` \| `avv` \| `datenschutz` |
| `version` | `text` NOT NULL | CHECK nicht leer |
| `akzeptiert_am` | `timestamptz` NOT NULL | `default now()` |

Struktur bewusst an `plan_aenderungen` angelehnt statt neu erfunden: dieselbe
Id-Art, dieselbe FK-Regel auf `betriebe`, derselbe Index-Zuschnitt
(`idx_zustimmung_betrieb_zeit` auf `(betrieb_id, akzeptiert_am DESC)`).

**Zusätzlich, nicht aus der Vorlage:** ein eindeutiger Index über
`(betrieb_id, auth_id, dokument, version)`. Ein doppelt abgeschicktes Formular
oder ein zweimal eingegebener Code soll keine zweite Zeile erzeugen; der
Schreibweg ist dadurch idempotent (`ignoreDuplicates`). Wer stattdessen **jeden
Klick** protokollieren will statt einer Zeile je Fassung, muss diesen Index
entfernen — dann ist es ein Log, kein Bestand.

### RLS

Vier Regeln, zwei davon durch Abwesenheit:

- `zustimmung_select_chef_oder_selbst` — `ist_chef(betrieb_id) OR auth_id = auth.uid()`
- `zustimmung_insert_selbst` — `auth_id = auth.uid() AND betrieb_id IN (SELECT meine_betriebe())`
- **kein UPDATE**, **kein DELETE**

Die zweite Bedingung beim INSERT ist kein Zierrat: ohne sie könnte ein
angemeldeter Nutzer Zeilen in die Beweisspur eines **fremden** Betriebs
schreiben, solange er nur seine eigene `auth_id` einträgt.

Die fehlenden UPDATE- und DELETE-Policies sind die Regel, nicht ein Versehen —
eine Zustimmung wird nie nachträglich verändert. **`service_role` umgeht RLS
weiterhin**, wie überall; die Unveränderlichkeit gilt gegenüber angemeldeten
Nutzern, nicht gegenüber dem Betreiber.

### Wie die Zustimmung durch die Bestätigungsmail kommt

Der Haken sitzt in Schritt 1, der Betrieb entsteht erst nach der
Code-Bestätigung — dazwischen liegen eine Mail, bis zu 24 Stunden und womöglich
ein Gerätewechsel. Zum Zeitpunkt des Hakens gibt es keine `betrieb_id`, an der
eine Zeile hängen könnte.

Die Zustimmung nimmt deshalb denselben Weg wie die vier Betriebsfelder:
`options.data` beim `signUp`, unter `zustimmung_versionen`. **Mitgeführt werden
die Fassungen, nicht nur ein Ja** — ändert sich ein Rechtstext zwischen
Abschicken und Bestätigen, hat die Person der alten Fassung zugestimmt, und die
neue einzutragen wäre eine falsche Angabe in genau dem Datensatz, der sie
widerlegen soll.

Geschrieben wird in `bestaetigen()` und `betriebNachtragen()`, unmittelbar nach
`stelleBetriebSicher()` und in derselben Server Action — kein zweiter Schritt,
der für sich fehlschlagen kann. Ein `insert` mit drei Zeilen, nicht drei
Aufrufe: „hat den AGB zugestimmt, dem AVV vielleicht" ist der schlechteste
Zustand.

### Fassungen

`src/lib/rechtstexte.ts`, Format `YYYY-MM-DD` mit optionalem Zusatz —
übernommen aus `../QuickTeam App/src/lib/terms.ts` (`"2026-08-07-draft"`), damit
beide Seiten dieselbe Schreibweise benutzen.

Die Dokumente trugen ihre Fassung bereits als `**Stand: …**` in der zweiten
Zeile; ein zweiter Marker daneben wäre eine zweite Stelle zum Pflegen. Aus dem
Fliesstext zu parsen wurde verworfen — „10. September 2026" gegen „10 September
2026", und ein Datumsparser über Rechtstexte liefert unbemerkt das falsche
Ergebnis. **Wer einen Rechtstext ändert, ändert `Stand:` in beiden Sprachen und
den Wert in `rechtstexte.ts`.**

Der Zusatz `-draft` ist keine Formalie: `docs/rechtliches/legals/README.md`
bezeichnet alle Dokumente als „pre-lawyer drafts". Fällt die anwaltliche
Prüfung, entfällt der Zusatz — und weil sich die Fassung damit ändert, ist
ablesbar, wer noch der Entwurfsfassung zugestimmt hat.

### Änderung vom 2026-09-11: Bestandsbetriebe werden nachgefragt

**Vorher** stand hier die Lücke: wer vor dem 2026-09-10 registriert hatte,
hatte den Haken nie gesehen, und ohne Eingriff wäre das so geblieben.
**Jetzt** gibt es dafür ein Tor im Dashboard.

`pruefeZustimmung()` in `src/lib/dashboard/zugang.ts` läuft im selben
Durchgang wie die Zahlungssperre und fragt für **Chefs**, ob der Betrieb zu
allen drei Dokumenten eine Zeile in der **aktuellen** Fassung hat. Fehlt eine,
geht es auf `/dashboard/zustimmung`; das eigentliche Ziel reist als `?weiter=`
mit, wie bei der Positionswahl.

**Gefragt wird nach dem Betrieb, nicht nach der Person.** Der Vertrag besteht
mit dem Betrieb; ein zweiter Chef, der später dazukommt, schliesst ihn nicht
noch einmal. Geschrieben wird trotzdem mit der eigenen `auth_id` — die
INSERT-Policy lässt nichts anderes zu.

**Angestellte bleiben unberührt**, und das ist dieselbe Begründung wie bei der
Zahlungssperre: den AVV ihres Arbeitgebers können sie nicht annehmen, und sie
an der Schicht zu hindern, bis der Chef geklickt hat, wäre genau die Sperre,
die dieses Repo ausschliesst. Technisch ginge es ohnehin nicht:
`zustimmung_select_chef_oder_selbst` zeigt ihnen nur ihre eigenen Zeilen, und
„keine eigene Zeile" heisst nicht „der Betrieb hat nicht zugestimmt".

**Die Reihenfolge ist verhaltensrelevant:** erst `pruefeSperre`, dann
`pruefeZustimmung`. Ein Betrieb mit abgelaufener Testphase landet weiterhin auf
der Zahlungsseite statt auf dem Zustimmungs-Tor — er käme danach ohnehin nicht
weiter. **Am Zahlungsweg ändert sich durch die Zustimmung nichts**: kein Zugriff
auf Stripe, auf `betrieb_abonnements` oder auf einen Tarif, weder lesend noch
schreibend.

**Die Seite liegt neben der Schale**, nicht darunter — `dashboard/zustimmung/`
statt `dashboard/(arbeit)/zustimmung/`. Läge sie darunter, prüfte das Tor sich
selbst und schickte sich im Kreis; dieselbe Falle wie bei `dashboard/wechseln`,
und beide sind deshalb in `sicheresZiel()` als `weiter=`-Ziel ausgeschlossen.

**Eine Fassungsänderung fragt automatisch neu.** Wird ein Rechtstext geändert
und der Wert in `rechtstexte.ts` mitgezogen, passt keine bestehende Zeile mehr,
und das Tor greift beim nächsten Aufruf — am 2026-09-11 an einem Testbetrieb
durchgespielt. Genau so fällt später der `-draft`-Zusatz weg.

**Das Kontrollkästchen gibt es nur einmal.**
`src/components/formular/zustimmung-feld.tsx` trägt Text, Links und
Fehlermeldung für Registrierung **und** Tor; `schreibeZustimmungen()` schreibt
in beiden Fällen. Zwei Kopien wären zwei Gelegenheiten, sich zu widersprechen —
ausgerechnet bei dem Text, der den Nachweis trägt.

### Eine bekannte Lücke — benannt, nicht geschlossen

**Das Schreiben hält die Einrichtung nicht auf.** Schlägt der `insert` fehl,
steht der Fehler im Serverprotokoll (`[zustimmung] …`) und die Einrichtung läuft
weiter. Die Begründung: Konto und Betrieb existieren an dieser Stelle bereits,
und jemanden hier steckenzulassen hiesse, ihm ein halbes Konto zu hinterlassen.
Der Preis ist ein Betrieb ohne Nachweis, den niemand bemerkt, ausser er sieht
ins Protokoll. **Ob das der richtige Handel ist, ist eine Frage an den
Betreiber, keine technische** — sie ist gestellt und noch nicht beantwortet.

## Schema nachschlagen statt raten

Das Schema ist über den Supabase-MCP-Server abfragbar. Bei Unsicherheit über
Spaltennamen, Constraints, Enum-Werte oder RPC-Signaturen wird dort nachgesehen —
nicht geraten und nicht aus dieser Datei extrapoliert. `list_tables` für Struktur,
`execute_sql` gegen `pg_proc` / `pg_constraint` für Signaturen und Checks.

## Was hier nicht passiert

- **Das Schema wird von diesem Projekt aus nicht verändert.** Keine Migrationen, keine
  DDL, keine Policy-Änderungen. Fällt ein Schema-Problem auf: melden, nicht beheben.

  **Eine einzige Ausnahme, am 2026-09-10 ausdrücklich freigegeben:** die Tabelle
  `rechtliche_zustimmungen` (eigener Abschnitt oben). Sie ist **additiv** — eine
  neue Tabelle, an keiner bestehenden wurde etwas geändert. Der Grund war ein
  rechtlicher Befund, kein technischer Wunsch: ohne sie gibt es keinen Nachweis
  der Zustimmung zu AGB, AVV und Datenschutzerklärung.

  Die Regel gilt im Übrigen unverändert weiter. Eine freigegebene Ausnahme ist
  kein Präzedenzfall: die nächste Schema-Änderung braucht ihre eigene Freigabe,
  ihre eigene Begründung und ihren eigenen Abschnitt hier. Insbesondere bleibt
  es dabei, dass an **bestehenden** Tabellen, Policies und Funktionen von hier
  aus nichts geändert wird — auch nicht an der neuen, sobald die App sie kennt.
- **Kein `service_role`-Key im Repo — mit genau einer Ausnahme.** Alles andere läuft
  weiterhin über den anon-Key und RLS. Die Ausnahme ist der Stripe-Webhook unter
  `src/app/api/stripe/webhook/route.ts` und sonst nichts.

  *Grund:* `betrieb_abonnements` trägt ausschliesslich die SELECT-Policy
  `abonnement_select_chef`. Es gibt keine Policy, unter der ein angemeldeter Nutzer
  die Zeile schreiben könnte — und der Webhook kommt von Stripe, hat also ohnehin
  keine Session. Ohne erhöhte Rechte ist der Zahlungsstatus nicht speicherbar.

  *Bedingungen, die alle gleichzeitig gelten:*
  - nur in dieser einen Datei, Route Handler mit `runtime = "nodejs"`
  - der Key heisst `SUPABASE_SERVICE_ROLE_KEY` — **nie** mit `NEXT_PUBLIC_`-Präfix
  - der Client wird lokal in der Handler-Funktion erzeugt, nie modulweit exportiert,
    nie aus einer anderen Datei importierbar
  - geschrieben wird **ausschliesslich** `betrieb_abonnements`, keine andere Tabelle
  - jeder Request geht zuerst durch `stripe.webhooks.constructEvent`; ohne gültige
    Signatur endet der Handler, bevor der Supabase-Client überhaupt entsteht
  - der Rohbody wird über `await request.text()` gelesen, nicht über `.json()` —
    sonst schlägt die Signaturprüfung fehl

  Taucht der Key in einer zweiten Datei auf, ist das ein Fehler, kein Ausbau.
- Keine zweite Autorisierungsebene neben RLS.
