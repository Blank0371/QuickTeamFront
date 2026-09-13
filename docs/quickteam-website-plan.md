# QuickTeam — Website & Auth: Plan + Claude-Code-Prompt

Stand: 5. August 2026 · Supabase-Projekt `jqpfuotwsgnqihspsmmf` (QuickTeam, eu-west-1)

---

## 1. Scope-Abgrenzung

**Drin:**
- Öffentliche Marketing-Website (Landing, Features, Preise, Rechtstexte)
- Chef-Registrierung inkl. Betriebsanlage
- Chef-Login, Passwort-Reset, E-Mail-Bestätigung

**Draußen (macht dein Kollege in der React-App):**
- Dashboard, Schichtplanung, Mitarbeiterverwaltung
- Mitarbeiter-Login (läuft mobil, separat)

**Die Grenze:** Nach erfolgreichem Login/Registrierung redirected die Website auf `NEXT_PUBLIC_APP_URL`. Kein Dashboard-Nachbau, keine Schichtplan-Komponenten. Wenn Claude Code anfängt, ein Dashboard zu bauen, ist es vom Scope abgekommen.

---

## 2. Stack

| | |
|---|---|
| Framework | Next.js 15, App Router, TypeScript strict |
| Styling | Tailwind CSS v4 |
| Auth | `@supabase/ssr` (Cookie-basiert, **nicht** `@supabase/auth-helpers` — deprecated) |
| Hosting | Vercel |
| Sprache | Deutsch, `lang="de"`. i18n-Struktur vorbereiten (DB kennt `de`/`en`), aber nur `de` ausliefern |

Getrenntes Repo von der App, gleiche Supabase-Instanz.

---

## 3. Was das Schema hart vorgibt

Diese Punkte sind keine Designentscheidungen, sondern Fakten aus der DB:

**Registrierungs-RPC:**
```
registriere_betrieb(p_name text, p_land text, p_vorname text, p_nachname text) → uuid
```
Legt `betriebe`-Zeile + `mitarbeiter`-Zeile mit `rolle_typ='chef'`, `status='aktiv'` an. E-Mail wird aus dem JWT gezogen — darf im Formular **nicht** separat abgefragt und übergeben werden.

**Land ist auf `'AT'` oder `'DE'` beschränkt** (CHECK-Constraint). Kein Freitextfeld, ein Select mit zwei Optionen. Bestimmt später, welche Arbeitszeit-Parameter aus `gesetzliche_parameter` gelten.

**E-Mail-Bestätigung ist Pflicht.** `cleanup_unconfirmed_users()` löscht Accounts ohne `email_confirmed_at` nach 24 Stunden. Das muss in der UI kommuniziert werden.

**Preismodell steht in `betrieb_abonnements`:** `plan` ∈ `basic` | `pro` | `business`, `status` ∈ `trial` | `aktiv` | `zahlung_ausstehend` | `gekuendigt` | `pausiert`. Die Preisseite bildet genau diese drei Pläne ab, Einstieg über Trial.

**RLS ist überall an.** Nach der Registrierung sieht der Chef nur seinen eigenen Betrieb. Kein `service_role`-Key im Frontend — niemals, auch nicht serverseitig in dieser Website.

---

## 4. Der kritische Flow: Registrierung

Das ist die Stelle, an der es schiefgeht, wenn man es naiv baut.

**Problem:** `registriere_betrieb` verlangt `auth.uid()`, also eine Session. Die gibt es aber erst nach der E-Mail-Bestätigung — und dann ist das Formular längst weg.

**Lösung:**

```
1. Formular: Betriebsname, Land, Vorname, Nachname, E-Mail, Passwort
        ↓
2. supabase.auth.signUp({
     email, password,
     options: {
       emailRedirectTo: `${origin}/auth/callback`,
       data: { betrieb_name, land, vorname, nachname }   ← überlebt die E-Mail
     }
   })
        ↓
3. Seite "Bitte E-Mail bestätigen" (mit 24-Stunden-Hinweis)
        ↓
4. User klickt Link → /auth/callback
        ↓
5. Callback (Route Handler, serverseitig):
     a) Code gegen Session tauschen
     b) rpc('meine_betriebe') aufrufen
        → Ergebnis nicht leer? Betrieb existiert schon → direkt zu 5d
     c) rpc('registriere_betrieb', { p_name: …, p_land: …, … })
        Werte aus session.user.user_metadata
     d) redirect → NEXT_PUBLIC_APP_URL
```

**Schritt 5b ist nicht optional.** `registriere_betrieb` hat keinen Schutz gegen Mehrfachanlage — ein doppelt geklickter Bestätigungslink erzeugt sonst zwei Betriebe mit demselben Chef.

**Validierung:** Betriebsname und Vor-/Nachname dürfen nach `trim()` nicht leer sein (CHECK-Constraint in der DB, sonst kommt ein hässlicher Postgres-Fehler durch). Zod-Schema clientseitig + Server-Action.

---

## 5. Routen

```
/                     Landing
/preise               Basic / Pro / Business
/registrieren         Chef-Registrierung
/login                Chef-Login
/passwort-vergessen   Reset anfordern
/passwort-neu         Neues Passwort setzen (nach Reset-Link)
/auth/bestaetigen     "Prüf dein Postfach"
/auth/callback        Route Handler: Session + registriere_betrieb
/impressum            Pflicht (§5 ECG in AT, §5 DDG in DE)
/datenschutz          Pflicht (DSGVO)
/agb                  Empfohlen
```

`/impressum` und `/datenschutz` sind bei einem AT/DE-SaaS rechtlich nicht verhandelbar und müssen aus dem Footer jeder Seite erreichbar sein. Claude Code soll Gerüste mit klar markierten Platzhaltern bauen — den Inhalt muss ein Anwalt oder Generator liefern, nicht das Modell.

---

## 6. Design-Direction

**Richtung:** Sachliche Struktur als Basis, ein einziger großer Effekt als Signature. Nicht überall Bewegung — Boldness an genau einer Stelle ausgeben.

**Zielgruppe ernst nehmen:** Das liest ein Gastro-Betreiber um 23 Uhr nach Schichtende auf dem Handy. Das Ding muss auf 375px genauso überzeugen wie auf 27 Zoll.

**Anti-Template-Regel (wichtig, sonst wird es generisch):** Diese drei Looks sind bei KI-generierten Seiten Standard und explizit unerwünscht —
1. Cremeweißer Hintergrund (#F4F1EA-Bereich) + Serif-Display + Terrakotta-Akzent (#D97757-Bereich)
2. Fast-Schwarz + ein greller Acid-Green- oder Zinnober-Akzent
3. Zeitungs-Layout mit Haarlinien, 0px border-radius, dichten Spalten

**Signature-Idee (Vorschlag, darf ersetzt werden — aber nur durch etwas Besseres):** Der Hero zeigt einen leeren Wochenraster. Beim Laden füllt er sich in einer orchestrierten Sequenz selbst mit Schichten — erst chaotisch, dann rasten die Blöcke ein. Das ist buchstäblich das Produktversprechen als Bewegung, statt als Claim. `prefers-reduced-motion` zeigt den fertigen Zustand direkt.

**Qualitätsboden ohne Ankündigung:** responsiv bis 375px, sichtbarer Keyboard-Fokus, `prefers-reduced-motion` respektiert, Formulare mit echten `<label>`-Elementen und `aria-describedby` für Fehler.

---

## 7. Anti-Vibecoding-Checkliste

Die technischen Signale, an denen man eine hingeworfene Seite erkennt. Alle von Anfang an mitbauen — nachträglich nachrüsten kostet mehr und wird vergessen.

### Rendering & Auslieferung

**Der wichtigste Punkt: View-Source darf nicht leer sein.** Next.js rendert serverseitig — aber nur, solange die Seiten Server Components bleiben. Sobald `"use client"` oben in einer `page.tsx` steht, ist die Seite wieder eine leere Hülle mit einem JS-Bundle. Regel: Seiten und Layouts bleiben Server Components, Interaktivität wandert in kleine Client-Komponenten (Hero-Animation, Formulare, mobiles Menü). `curl` auf die Startseite muss die vollständige Textkopie zurückliefern.

- Keine Source Maps in Produktion (`productionBrowserSourceMaps: false` — ist Default, nicht versehentlich einschalten)
- Console beim Laden komplett sauber: keine Hydration-Mismatches, keine React-Key-Warnungen, keine 404s auf Assets
- JS-Bundle im Blick behalten: Landing Page unter 150 KB gzipped First Load JS. Keine Animationsbibliothek für etwas, das CSS auch kann

### Metadata pro Route

- **Eigener `<title>` pro Seite** — nicht überall derselbe. Über `metadata`-Export je Route, mit `title.template` im Root-Layout
- **Eigene Meta-Description pro Seite**, jeweils selbst geschrieben, nicht dieselbe kopiert
- **`metadataBase` + `alternates.canonical`** im Root-Layout, damit jede Seite ein Canonical-Tag bekommt
- **OG-Image**: `opengraph-image.tsx` je Route über `next/og`, plus Twitter-Card-Fallback
- **Echtes Favicon-Set**: `icon.svg`, `apple-icon.png`, `favicon.ico`. Nicht das Next.js-Default-Icon liegen lassen

### Struktur & Semantik

- **Genau ein `<h1>` pro Seite.** Nicht null, nicht drei. Visuell große Textblöcke, die keine Überschrift sind, werden `<p>` oder `<span>` mit Utility-Klassen
- Überschriftenhierarchie ohne Sprünge (h1 → h2 → h3)
- `lang="de"` im Root-Layout
- **Alt-Texte auf allen Bildern.** Dekorative Grafiken bekommen `alt=""` (leer, aber vorhanden), inhaltstragende bekommen eine echte Beschreibung
- **`not-found.tsx`** im eigenen Design, mit Weg zurück. Dazu `error.tsx` und `global-error.tsx`

### Crawler & Discovery

- `app/sitemap.ts` — generierte `sitemap.xml` mit allen öffentlichen Routen
- `app/robots.ts` — Auth-Routen ausschließen, **aber AI-Crawler nicht blocken**. Für ein SaaS in einem Markt, in dem Leute Tools über ChatGPT und Claude suchen, ist ein `Disallow` für GPTBot oder ClaudeBot ein Eigentor
- `public/llms.txt` — kurze strukturierte Produktbeschreibung für Sprachmodelle
- **Structured Data**: JSON-LD im Root-Layout. `Organization` plus `SoftwareApplication` mit `applicationCategory: BusinessApplication` und `offers` für die drei Pläne

### Reste & Domain

- Keine Template-Überbleibsel: kein „Create Next App" im Titel, kein Default-README, kein ungenutztes Boilerplate-CSS
- **Eigene Domain vor dem Launch.** Eine `*.vercel.app`-URL ist das erste, was auffällt. Domain kaufen, in Vercel verbinden, `metadataBase` und `emailRedirectTo` darauf zeigen lassen

---

## 8. Vorarbeit in der DB (nicht Teil des Website-Jobs)

Diese Punkte sind mir bei der Analyse aufgefallen und sollten unabhängig von der Website angegangen werden:

1. **`mitarbeiter_einladung_annehmen(p_code)` ist defekt** — schreibt in `mitarbeiter.auth_user_id`, die Spalte heißt `auth_id`. Wirft zur Laufzeit einen Fehler.
2. **Edge Function `einladung-einloesen` ist nicht aufrufbar** — `verify_jwt: true`, soll aber Sessions für Leute *ohne* Session erzeugen. Legt außerdem Fake-Accounts `@invite.local` an (kein Passwort-Reset möglich).
3. **Drei parallele Mitarbeiter-Onboarding-Wege** — vor dem Mobile-Client muss einer davon der kanonische werden. Der E-Mail-Weg (`meine_einladungen` → `einladung_annehmen`) ist der einzige, der aktuell funktioniert.
4. **Leaked-Password-Protection aus** — im Dashboard unter Auth → Policies aktivieren. Prüft Passwörter gegen HaveIBeenPwned.
5. **Trigger-Funktionen per REST aufrufbar** — `schreibe_audit_log`, `rls_auto_enable`, `benachrichtige_schicht_geaendert` und weitere sind für `anon` über `/rest/v1/rpc/` erreichbar. `REVOKE EXECUTE ... FROM anon, authenticated`.
6. **`gesetzliche_parameter` juristisch verifizieren** — steht so als Kommentar in der Tabelle, `quelle` und `geprueft_am` sind zu füllen.

---

## 9. Session-Aufteilung für Claude Code

Nicht alles in einem Rutsch. Fünf Sessions, jede mit klarem Abschluss:

| Session | Inhalt | Fertig, wenn |
|---|---|---|
| 1 | Setup, Supabase-Clients, Env, Route-Gerüst, Metadata-Fundament, Design-Tokens | `npm run build` läuft, alle Routen liefern 200, jede hat eigenen Titel |
| 2 | Kompletter Auth-Flow inkl. Callback und `registriere_betrieb` | Registrierung end-to-end getestet, Betrieb liegt in der DB |
| 3 | Landing Page inkl. Signature-Element | `curl` zeigt vollen Text, auf 375px und 1440px geprüft |
| 4 | Preise, Rechtstext-Gerüste, 404, Footer | Alle Routen inhaltlich fertig |
| 5 | Verifikation gegen Abschnitt 7 | Checkliste Punkt für Punkt abgehakt, Lighthouse ≥ 95 |

Session 2 vor Session 3 — der Flow ist das Risiko, das Design ist das Handwerk. Session 5 ist kein Puffer, sondern ein eigener Durchgang: Claude Code soll die Checkliste aus Abschnitt 7 abarbeiten und jeden Punkt einzeln bestätigen oder als offen melden.

---

## 10. Prompt für Claude Code

> Alles ab hier kopieren und als erste Nachricht in Claude Code einfügen. Für Session 1.

---

Du baust die Marketing-Website und den Auth-Bereich für **QuickTeam**, ein SaaS-Tool zur Schicht- und Teamplanung für Gastronomiebetriebe in Österreich und Deutschland. Die eigentliche App (Dashboard, Schichtplanung) wird separat von einem anderen Entwickler in React gebaut — die baust du **nicht**.

## Auftrag

Zwei Dinge: eine Marketing-Website, die das Produkt verkauft, und ein Auth-Bereich für die Registrierung und den Login von Betriebsinhabern ("Chefs"). Nach erfolgreichem Login redirected die Seite auf die separate App unter `NEXT_PUBLIC_APP_URL`.

## Stack

- Next.js 15, App Router, TypeScript strict
- Tailwind CSS v4
- `@supabase/ssr` für Auth — **nicht** `@supabase/auth-helpers-nextjs`, das ist deprecated
- Deployment-Ziel Vercel

## Supabase

Bestehendes Projekt, das Schema ist fertig und wird von dir **nicht** verändert. Env-Variablen in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://jqpfuotwsgnqihspsmmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<vom Nutzer>
NEXT_PUBLIC_APP_URL=<vom Nutzer>
```

Der `service_role`-Key kommt in dieses Projekt nicht rein. RLS ist auf allen Tabellen aktiv und soll auch die einzige Autorisierungsebene bleiben.

## Registrierungs-Flow — die kritische Stelle

Registrierung läuft über die Postgres-Funktion:

```
registriere_betrieb(p_name text, p_land text, p_vorname text, p_nachname text) → uuid
```

Sie legt Betrieb und Chef-Datensatz in einem Rutsch an. Die E-Mail zieht sie selbst aus dem JWT — nicht als Parameter übergeben.

Das Problem: Die Funktion braucht eine aktive Session, aber E-Mail-Bestätigung ist Pflicht. Die Betriebsdaten müssen also die Bestätigungs-E-Mail überleben. Bau es so:

1. Formular erfasst: Betriebsname, Land (Select: Österreich / Deutschland), Vorname, Nachname, E-Mail, Passwort
2. `supabase.auth.signUp()` mit `options.emailRedirectTo` auf `/auth/callback` und `options.data` = `{ betrieb_name, land, vorname, nachname }`
3. Weiterleitung auf `/auth/bestaetigen` — Hinweis, dass der Link innerhalb von 24 Stunden geklickt werden muss, sonst wird der Account automatisch gelöscht
4. Route Handler `/auth/callback`, serverseitig:
   - Code gegen Session tauschen
   - **Zuerst** `rpc('meine_betriebe')` aufrufen. Kommt ein Ergebnis zurück, existiert der Betrieb bereits → direkt weiterleiten, RPC überspringen
   - Sonst `rpc('registriere_betrieb', { p_name, p_land, p_vorname, p_nachname })` mit Werten aus `session.user.user_metadata`
   - Redirect auf `NEXT_PUBLIC_APP_URL`

Der Existenz-Check in Schritt 4 ist Pflicht. `registriere_betrieb` hat keinen Schutz gegen Mehrfachanlage — ein doppelt geklickter Bestätigungslink erzeugt sonst zwei Betriebe.

## Constraints aus der Datenbank

- `land` akzeptiert ausschließlich `'AT'` oder `'DE'`. Select mit zwei Optionen, keine Freitexteingabe
- Betriebsname und Vor-/Nachname dürfen nach `trim()` nicht leer sein — clientseitig mit Zod validieren, sonst kommt ein roher Postgres-Fehler durch
- Preismodell ist fix: `basic`, `pro`, `business`, Einstieg über Trial

## Routen

```
/  /preise  /registrieren  /login  /passwort-vergessen  /passwort-neu
/auth/bestaetigen  /auth/callback
/impressum  /datenschutz  /agb
```

Rechtstexte: nur Gerüst mit deutlich markierten Platzhaltern, kein erfundener Inhalt. Aus dem Footer jeder Seite verlinkt.

## Design

Zielgruppe ist ein Gastro-Betreiber, der das um 23 Uhr nach Schichtende auf dem Handy liest. Sachliche, disziplinierte Struktur als Basis — und **ein** großer Effekt, der hängen bleibt. Nicht überall Bewegung.

Diese drei Looks sind bei KI-generierten Seiten Standard und hier explizit unerwünscht:
1. Cremeweißer Hintergrund + Serif-Display + Terrakotta-Akzent
2. Fast-Schwarz + einzelner greller Acid-Green- oder Zinnober-Akzent
3. Zeitungs-Layout mit Haarlinien, 0px Radien, dichten Spalten

Signature-Vorschlag: Der Hero zeigt einen leeren Wochenraster, der sich beim Laden in einer orchestrierten Sequenz selbst mit Schichten füllt — erst unsortiert, dann rasten die Blöcke ein. Das Produktversprechen als Bewegung statt als Claim. Bei `prefers-reduced-motion` direkt der Endzustand. Ersetz die Idee gern, aber nur durch etwas nachweislich Besseres — und begründe es.

Bevor du Code schreibst: leg ein Token-System an (4–6 benannte Hex-Werte, zwei bis drei Schriftschnitte mit klaren Rollen, ein Layout-Konzept) und prüf es gegen die Anti-Template-Liste. Erst dann bauen.

Qualitätsboden, ohne ihn zu erwähnen: responsiv ab 375px, sichtbarer Keyboard-Fokus, `prefers-reduced-motion` respektiert, echte `<label>`-Elemente, Fehlermeldungen über `aria-describedby` verknüpft.

## Copy

Deutsch, Du-Form, Sie-Form konsistent durchhalten — entscheide dich und bleib dabei. Konkret statt clever. Fehlermeldungen sagen, was passiert ist und was zu tun ist, ohne sich zu entschuldigen.

## Technische Qualität — nicht verhandelbar

Die Seite soll nicht wie schnell zusammengeklickt wirken. Diese Punkte baust du von Anfang an mit, nicht nachträglich:

**Serverseitiges Rendering ist Pflicht.** Seiten und Layouts bleiben Server Components. `"use client"` kommt ausschließlich in kleine, isolierte Komponenten (Hero-Animation, Formulare, mobiles Menü) — **nie** an den Anfang einer `page.tsx`. Prüfkriterium: `curl` auf jede Route liefert den vollständigen sichtbaren Text im HTML. Wenn View-Source leer ist, ist die Architektur falsch.

**Metadata pro Route, nicht global:**
- Eigener `<title>` je Seite über `title.template` im Root-Layout
- Eigene, individuell geschriebene Meta-Description je Seite
- `metadataBase` + `alternates.canonical`
- `opengraph-image.tsx` über `next/og`, plus Twitter-Card
- Echtes Favicon-Set (`icon.svg`, `apple-icon.png`, `favicon.ico`) — nicht das Next.js-Default

**Semantik:**
- Genau ein `<h1>` pro Seite. Große Textblöcke, die keine Überschrift sind, werden `<p>` mit Utility-Klassen
- Überschriftenhierarchie ohne Sprünge
- `lang="de"` im Root-Layout
- Alt-Text auf jedem Bild — dekorative bekommen `alt=""`, inhaltstragende eine echte Beschreibung
- `not-found.tsx` im Seitendesign mit Weg zurück, dazu `error.tsx` und `global-error.tsx`

**Crawler:**
- `app/sitemap.ts` und `app/robots.ts`
- robots: Auth-Routen ausschließen, AI-Crawler (GPTBot, ClaudeBot, PerplexityBot) **nicht** blocken
- `public/llms.txt` mit kurzer strukturierter Produktbeschreibung
- JSON-LD im Root-Layout: `Organization` + `SoftwareApplication` mit `applicationCategory: BusinessApplication` und `offers` für die drei Pläne

**Sauberkeit:**
- Console beim Laden komplett leer — keine Hydration-Mismatches, keine Key-Warnungen, keine Asset-404s
- Keine Source Maps in Produktion
- First Load JS der Landing Page unter 150 KB gzipped. Keine Animationsbibliothek für etwas, das CSS auch kann
- Keine Template-Reste: kein „Create Next App", kein Default-README, kein ungenutztes Boilerplate

## Diese Session

Nur das Fundament:
1. Next.js-Projekt aufsetzen, TypeScript strict, Tailwind v4
2. Supabase-Clients für Browser, Server und Middleware nach dem `@supabase/ssr`-Muster
3. `.env.local.example` mit den drei Variablen
4. Alle Routen als Platzhalter-Seiten — jede mit **eigenem** Titel und **eigener** Description
5. Root-Layout: `metadataBase`, `title.template`, `lang="de"`, Header, Footer
6. `not-found.tsx`, `error.tsx`, `app/sitemap.ts`, `app/robots.ts`, Favicon-Set
7. Design-Tokens definieren und mir vorstellen

Kein Auth-Flow, keine Landing Page in dieser Session. Am Ende muss `npm run build` durchlaufen, jede Route 200 liefern, und `curl` auf jede Route den Platzhaltertext im HTML zeigen.

Wenn dir etwas an den Vorgaben widersprüchlich vorkommt: frag nach, statt zu raten.
