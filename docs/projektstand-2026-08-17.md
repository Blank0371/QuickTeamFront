# Projektstand — 2026-08-17

Momentaufnahme dessen, was im Repo tatsächlich **existiert** (Code, nicht Plan).
`CLAUDE.md` bleibt die verbindliche Spezifikation; diese Datei ordnet nur ein,
was davon schon gebaut ist und was noch als Platzhalter oder Entscheidung auf
dem Papier steht. `docs/uebergabe.md` ist die Vorgänger-Version davon (Stand
2026-08-06, vor der Stripe-Phase) — historisch interessant, aber überholt.

Git-Historie, drei Commits:

1. `e64bd0c` — Ausgangsstand: Marketing-Website und Chef-Auth
2. `f5562e2` — Phase 0: Regelwerk für Stripe- und Onboarding-Phase (nur `CLAUDE.md`)
3. `9843df3` — Phase 1: Stripe-Webhook mit service_role-Ausnahme

---

## 1. Fundament

Next.js 15 / React 19 / TypeScript strict / Tailwind v4, App Router. Deutsch
durchgehend, `lang="de"`, i18n-Struktur in `src/i18n/` vorbereitet (aktuell nur
`de`). Build und Dev laufen getrennt über `scripts/next-getrennt.mjs`
(`npm run build`, nie `npx next build` direkt).

Design-Tokensystem in `src/app/globals.css`, dreischichtig, Kernpalette
wörtlich aus `docs/Farbpalette.html` übernommen (Grün/Bronze/Rot auf dunklem
Grund). Komponenten nutzen ausschliesslich semantische Tokens, keine Hex-Werte.

## 2. Was fertig ist: Auth-Bereich

Vollständiger Kontenbereich für Betriebsinhaber, alles Server Components mit
isolierten Client-Formularen:

| Route | Zweck |
|---|---|
| `/registrieren` | Betriebsname, Land (AT/DE), Vor-/Nachname, E-Mail, Passwort → `signUp` mit Betriebsdaten in `user_metadata` |
| `/auth/bestaetigen` | 8-stelliger Code aus der Mail, „Code erneut senden" mit Countdown |
| `/login` | E-Mail + Passwort |
| `/passwort-vergessen` | E-Mail → Reset-Code anstossen |
| `/passwort-neu` | Code + neues Passwort in einem Schritt |

**Bestätigung läuft über eingetippte Codes, nicht über Links** (Entscheidung
2026-08-06, wegen PKCE-Problemen bei Mail-Öffnung auf einem anderen Gerät als
der Registrierung). Kein `/auth/callback`, kein `emailRedirectTo`, keine
Redirect-Allowlist. `verifyOtp` läuft mit `type: "email"` (Bestätigung) bzw.
`type: "recovery"` (Reset), `resend` mit `type: "signup"` — bewusst
unterschiedliche Werte, siehe `src/app/auth/bestaetigen/aktionen.ts`.

**Betriebsanlage** (`src/lib/betrieb.ts`, `stelleBetriebSicher`): nach
`verifyOtp` wird `meine_betriebe()` geholt, für jede ID `ist_chef()` geprüft,
und nur wenn nirgends `true` zurückkommt, läuft `registriere_betrieb()`. Das
ist der Schutz gegen einen zweimal eingegebenen Code, der sonst einen zweiten
Betrieb anlegen würde — die RPC selbst hat keine eigene Sperre.

Sicherheitsverhalten: kein Open-Redirect (`?next=` existiert nicht mehr),
`src/lib/auth-meldungen.ts` ist eine Whitelist für Query-Parameter-Texte,
Registrierung/Reset antworten unabhängig davon identisch, ob die Adresse
existiert (keine Konto-Enumeration). Angemeldete Nutzer werden von
`/login`/`/registrieren` nicht weggeleitet (Zweitbetrieb/Kontowechsel bleibt
möglich), stattdessen zeigt `session-hinweis.tsx` einen schmalen Banner.

**Nach dem Login geht es aktuell direkt zu `NEXT_PUBLIC_APP_URL`** —
`src/app/login/aktionen.ts:49`. Das in `CLAUDE.md` beschriebene dreistufige
Tor (unbezahlt → Checkout, bezahlt/Wizard offen → Wizard, beides erledigt →
Übergabeseite) ist **Spezifikation, aber noch nicht implementiert**.

## 3. Was fertig ist: Rechtstexte, SEO, Fehlerseiten

- `/impressum`, `/datenschutz`, `/agb` — Gerüste mit markierten Platzhaltern
  (82–100 Zeilen je Seite über `src/components/rechtstext.tsx`), aus dem
  Footer verlinkt. Keine erfundenen Inhalte.
- `not-found.tsx`, `error.tsx`, `global-error.tsx` im Seitendesign
- `app/sitemap.ts`, `app/robots.ts` (Auth-Routen ausgeschlossen, KI-Crawler
  ausdrücklich **nicht** blockiert), `public/llms.txt`
- `opengraph-image.tsx` auf Root-Ebene, Metadata je Route mit eigenem Title
  und individueller Description

## 4. Noch Platzhalter

- **Startseite (`/`)** — `PlatzhalterSeite`-Komponente statt echtem Hero/Content.
  Geplant: Wochenraster-Animation in reinem CSS, drei Nutzenblöcke,
  AT/DE-Abschnitt, Abschlussblock.
- **`/preise`** — ebenfalls `PlatzhalterSeite`. Blockiert auf echte Zahlen für
  Basic/Pro/Business, die es noch nicht gibt.
- `opengraph-image.tsx` fehlt noch für die einzelnen Unterrouten.

## 5. Stripe- und Onboarding-Phase — Stand

Seit 2026-08-10 offiziell im Scope (Checkout, einmaliger Onboarding-Wizard,
Abschluss-Screen mit App-Verweis). Bisher zwei von absehbar mehreren Phasen:

**Phase 0 (fertig)** — reines Regelwerk in `CLAUDE.md`: Weg
`/preise → /registrieren → /auth/bestaetigen → Checkout → Erfolgsseite →
Wizard → Abschluss`, das dreistufige Login-Tor, die Env-Var-Pflicht für
Price-IDs, die `service_role`-Ausnahme.

**Phase 1 (fertig)** — `src/app/api/stripe/webhook/route.ts`, der einzige Ort
im Repo mit `SUPABASE_SERVICE_ROLE_KEY`. Verarbeitet:

- `checkout.session.completed` → schreibt `plan`, `stripe_customer_id`,
  `stripe_subscription_id` in `betrieb_abonnements`, lässt `status` bewusst
  unangetastet (bleibt `trial`, vom Anlage-Trigger gesetzt)
- `customer.subscription.{created,updated,deleted,paused,resumed}` → schreibt
  `status`, mit Schutz gegen aus der Reihenfolge zugestellte Ereignisse
  (`aktualisiert_am`-Vergleich) und 503-Retry, falls das Abo noch keinem
  Betrieb zugeordnet ist
- Signaturprüfung vor jedem Zugriff, Rohbody über `request.text()`, lokaler
  Supabase-Client nur innerhalb des Handlers

**Offen in dieser Datei:** `statusAusStripe()` (Zeile 91–106) ist eine leere
Switch-Anweisung — jeder Stripe-Status liefert aktuell `null`, es wird also
noch **kein** Status geschrieben. Das Mapping (`trialing → trial`,
`active → aktiv`, und vor allem wohin `incomplete`/`unpaid`/`paused` gehören)
ist als Geschäftsentscheidung bewusst offengelassen — siehe Kommentar im Code.

**Noch nicht gebaut:**

- Route, die eine Stripe-Checkout-Session erzeugt (`/preise` → `/registrieren`
  → … → Checkout ist als Weg beschrieben, aber es gibt keinen Code, der einen
  Checkout auslöst)
- Erfolgsseite nach Checkout
- Onboarding-Wizard (Mitarbeiter-Einladungen, Rollen, Schichtvorlagen samt
  Mindestbesetzung) — keine der Wizard-Tabellen wird von hier aus beschrieben
- Abschluss-Screen mit Store-Badges/QR-Code
- Das dreistufige Login-Tor selbst (aktuell: Login leitet ungeprüft weiter,
  siehe Abschnitt 2)

## 6. Datenbank — nur Referenz, nichts davon wird hier verändert

Supabase-Projekt `jqpfuotwsgnqihspsmmf`. Wichtigste RPCs:
`registriere_betrieb`, `meine_betriebe`, `ist_chef`. Für den Wizard-Teil
existieren die Tabellen bereits live (`mitarbeiter`, `rollen`,
`schicht_vorlagen`, `schicht_vorlage_mindestbesetzung`, …) mit eigenen
Policies für den Chef — sie werden aus diesem Repo nur noch nicht bespielt.
Details und Fallen (montagsbasierter Wochentag, fehlende UNIQUE-Constraints,
nullable Kontaktfelder bei Einladungen) stehen ausführlich in `CLAUDE.md`.

## 7. Env-Variablen (`.env.local.example`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL          (optional, Default https://quickteam.at)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BASIC / _PRO / _BUSINESS
SUPABASE_SERVICE_ROLE_KEY     (ausschliesslich im Webhook gelesen)
```

## 8. Bekannte Fallen (Auszug, Details in `docs/uebergabe.md`)

- `npm run dev`/`build` teilen sich sonst `.next` → immer über
  `scripts/next-getrennt.mjs`
- Leere Env-Variablen kommen als `""` an, nicht `undefined` — deshalb der
  `env()`-Helper in `src/lib/site.ts`
- `supabase-js` mappt `error_code` bei 500ern nicht auf `error.code`;
  `error.status === 500` muss mit geprüft werden

## 9. Naheliegender nächster Schritt

Fachliche Entscheidung für `statusAusStripe()` in
`src/app/api/stripe/webhook/route.ts` treffen, danach Checkout-Route und
Erfolgsseite — das schliesst den Bogen, den der Webhook bereits erwartet.
