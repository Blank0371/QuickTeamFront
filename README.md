# QuickTeam — SaaS-Website und Web-Dashboard

Öffentliche Website und Anmeldebereich für QuickTeam, eine Anwendung zur
Schicht- und Dienstplanung für Gastronomiebetriebe in Österreich und
Deutschland.

Dieses Repo enthält auch das Web-Dashboard: Einrichtung, Abrechnung, Team,
Dienstplanung, Verfügbarkeiten, Urlaub, Tausch und Nachrichten. Nach der
Anmeldung wird abhängig von den vorhandenen Positionen und dem
Einrichtungsstand die passende Seite geöffnet.

## Lokales Setup

```bash
npm install
cp .env.local.example .env.local   # Werte eintragen
npm run dev                        # http://localhost:3000
```

**Die Werte stehen nicht im Repo.** `.env.local.example` enthält
ausschliesslich Variablennamen und Kommentare, keine Zugangsdaten — die
kommen separat vom Team (Passwort-Manager), nicht aus Git. `.env.local`
selbst ist in `.gitignore` und bleibt es.

Welche Variable wofür da ist, steht **in `.env.local.example` selbst**,
jeweils direkt über der Zeile. Hier stand früher eine zweite, kürzere
Tabelle mit vier Einträgen; sie war irgendwann auf dem Stand von vier von
dreizehn Variablen, ohne dass es jemandem auffiel. Eine Quelle ist besser
als zwei, von denen eine falsch ist.

Zwei Dinge, die man beim ersten Aufsetzen nicht erraten kann:

- **`SOFT_LAUNCH=aus` für lokale Entwicklung.** Der Schalter ist
  default-geschlossen, ein fehlender Wert sperrt also Registrierung,
  Login und Zahlung — die Startseite kommt dann ohne „Anmelden" und
  „Kostenlos testen", und `/registrieren` leitet auf `/` um. Das ist so
  gewollt: in Produktion steht `SOFT_LAUNCH=an` (in der
  Vercel-Umgebung), weil `/datenschutz` und `/agb` noch Entwürfe sind
  und sich bis dahin kein echter Betrieb registrieren soll. Die
  Begründung im Detail: `CLAUDE.md`, Abschnitt „Der
  Soft-Launch-Schalter".
- **`SUPABASE_SERVICE_ROLE_KEY` wird an genau einer Stelle gelesen**
  (`src/app/api/stripe/webhook/route.ts`). Taucht er in einer zweiten
  Datei auf, ist das ein Fehler, kein Ausbau — siehe `CLAUDE.md`.

Gegen die Datenbank läuft alles über den anon-Key und RLS; ein lokales
Supabase gibt es nicht, das Projekt ist geteilt.

## Skripte

| Befehl              | Wirkung                            |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Entwicklungsserver                 |
| `npm run build`     | Produktionsbuild                   |
| `npm run start`     | Produktionsbuild lokal ausliefern  |
| `npm run typecheck` | TypeScript ohne Emit               |
| `npm test`          | Lokale Regressionstests (Node 23+)  |

## Aufbau

```
src/
  app/          Routen, Metadata-Dateien, Fehlerseiten
  components/   Geteilte UI. "use client" nur hier, nie in page.tsx
  i18n/         Deutsch und Englisch; Dashboard/Auth noch teilweise deutsch
  lib/site.ts   Konstanten für Metadata, Sitemap, JSON-LD
  lib/supabase/ Clients für Browser, Server und Middleware
  middleware.ts Frischt die Auth-Session auf
```

## Design-Tokens

Alle Farben, Schriftrollen und Radien stehen in `src/app/globals.css`. Die
Datei hat drei Ebenen: sechs Basis-Hex-Werte, daraus abgeleitete semantische
Tokens (hell und dunkel), und die Tailwind-Anbindung über `@theme inline`.
Neue Farben werden in der zweiten Ebene gemischt — die erste wächst nicht.

## Icons neu erzeugen

`src/app/icon.svg` ist die Quelle. `apple-icon.png` und `favicon.ico` sind
daraus erzeugt; die Geometrie steht zusätzlich in
`scripts/gen-icons.mjs`. Nach einer Änderung am SVG die Werte dort angleichen
und `node scripts/gen-icons.mjs src/app` laufen lassen.

## Rahmenbedingungen

Scope, Datenbankschema, Registrierungs-Flow und die harten Vorgaben zu
Server Components, Metadata, Semantik und Barrierefreiheit stehen in
[`CLAUDE.md`](./CLAUDE.md).

## Letzter Audit

Befunde, umgesetzte Korrekturen und offene Backend-/Betriebsfragen:
[Audit vom 16.09.2026](docs/AUDIT-2026-09-16.md).
Supabase wurde bei dieser Prüfung ausschließlich lesend untersucht.
