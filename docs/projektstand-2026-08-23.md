# Projektstand — 2026-08-23

> **Überholt seit dem 2026-08-26.** Aktuell ist
> `docs/projektstand-2026-08-26.md`. Diese Fassung beschreibt den Stand vor der
> Dashboard-Kursänderung und irrt überall dort, wo sie sagt, hier ende der Weg
> mit dem Verweis auf die native App. Was den Stepper, Stripe und die Preise
> angeht, gilt sie weiter.

Momentaufnahme dessen, was im Repo tatsächlich **existiert** (Code, nicht Plan).
`CLAUDE.md` bleibt die verbindliche Spezifikation; diese Datei ordnet nur ein,
was davon gebaut ist. Ersetzt `docs/projektstand-2026-08-17.md` — jene Fassung
beschreibt den Stand vor dem Einrichtungs-Stepper und ist in weiten Teilen
überholt, insbesondere überall dort, wo sie von Stripe Checkout spricht.

**Der Einrichtungs-Stepper ist fertig.** Vom Anlegen des Betriebs bis zum
Abschluss-Screen läuft der Weg durchgehend, einschliesslich übersprungener
Zahlung, Sperre nach abgelaufener Testphase und Wiederaufnahme.

Git-Historie, dreizehn Commits:

```
e64bd0c  Ausgangsstand: Marketing-Website und Chef-Auth
f5562e2  Phase 0: Regelwerk für Stripe- und Onboarding-Phase
9843df3  Phase 1: Stripe-Webhook mit service_role-Ausnahme
71d0707  Phase 2: Stripe-Checkout, Erfolgsseite und Abo-Status-Mapping   ← überholt
132dc4f  Phase 3: Regelwerk für den Einrichtungs-Stepper
430eb66  Phase 4: Zahlungsschicht ohne UI, Checkout-Weg abgerissen
ed3ade7  Phase 5: Stepper-Gerüst mit abgeleitetem Wiedereinstieg
5d040c0  Preisseite: doppelten CTA-Block entfernt
70d967f  Phase 6: Schritt 1 — Registrierung und Bestätigung verschmolzen
db012f8  Phase 7: Schritt 2 — Plan-Auswahl und eingebettetes Payment Element
a82edd9  Phase 8: Schritt 3 — Rollen und Mitarbeiter
4355e95  Phase 9: Schritt 4 — Schichtvorlagen mit Mindestbesetzung
(dieser) Phase 10: Abschluss-Screen, Sperrseite, finale Preise
```

`71d0707` steht bewusst noch in der Historie: es baute den Weg über Stripe
Checkout mit Weiterleitung, der am 2026-08-19 durch den Stepper ersetzt und in
`430eb66` wieder abgerissen wurde. Wer dort etwas sucht, sucht in einer
Sackgasse.

---

## 1. Fundament

Next.js 15 / React 19 / TypeScript strict / Tailwind v4, App Router. Deutsch
durchgehend, `lang="de"`, i18n-Struktur in `src/i18n/` vorbereitet (aktuell nur
`de`). Build und Dev laufen getrennt über `scripts/next-getrennt.mjs`
(`npm run build`, nie `npx next build` direkt).

Design-Tokensystem in `src/app/globals.css`, dreischichtig, Kernpalette
wörtlich aus `docs/Farbpalette.html`. Komponenten nutzen ausschliesslich
semantische Tokens, keine Hex-Werte — mit **einer** dokumentierten Ausnahme:
das Stripe Payment Element rendert in einem iframe und braucht echte Farbwerte.
`src/components/einrichtung/zahlungs-formular.tsx` liest sie zur Laufzeit über
`getComputedStyle` aus denselben CSS-Variablen, statt sie abzuschreiben.

First Load JS der Landing Page: 103 kB, unverändert über alle Phasen.

## 2. Der Einrichtungs-Stepper

Eine Route, vier Schritte, ein Fortschrittsbalken ohne JavaScript.

| Route | Inhalt |
|---|---|
| `/einrichtung` | zeigt selbst nichts, leitet dorthin, wo die Person steht |
| `/einrichtung/konto` | Betriebsdaten **und** Code-Bestätigung — vier Lagen, siehe unten |
| `/einrichtung/zahlung` | Plan wählen, Payment Element eingebettet — überspringbar |
| `/einrichtung/team` | Rollen anlegen, Mitarbeiter einladen, Rollen zuweisen |
| `/einrichtung/schichten` | Schichtvorlagen je Wochentag samt Mindestbesetzung |
| `/einrichtung/fertig` | Zusammenfassung, Store-Badges (Platzhalter) |
| `/einrichtung/testphase-abgelaufen` | Sperre, dasselbe Zahlungsformular wie Schritt 2 |

`/registrieren` ist eine Weiterleitung auf `/einrichtung/konto` — die Adresse
bleibt, weil Kopfzeile, mobiles Menü, Preisseite und Login sie verlinken.
`/auth/bestaetigen` und `/onboarding` gibt es nicht mehr.

### Wiedereinstieg wird abgeleitet, nicht gespeichert

`src/lib/einrichtung.ts`, kein Flag und keine Fortschrittsspalte. Die
Reihenfolge der Prüfungen ist verhaltensrelevant — die Sperre steht vor den
Wizard-Prüfungen, sonst käme jemand mit vollständigem Wizard daran vorbei.

| Beobachtung | Ziel |
|---|---|
| keine Session | `/login` |
| Session, kein Betrieb als Chef | Schritt 1 |
| kein Abo bei Stripe | Schritt 2 |
| `status = 'pausiert'` | Sperrseite |
| keine Rolle | Schritt 3 |
| keine Vorlage mit Mindestbesetzung | Schritt 4 |
| sonst | Abschluss-Screen |

Rück-Navigation ist erlaubt, Vorwärtsspringen nicht; bei gesperrter Testphase
führt jeder Weg auf die Sperrseite, auch der zurück. Login geht seit `ed3ade7`
über `/einrichtung` statt direkt auf `NEXT_PUBLIC_APP_URL` — damit gibt es
genau einen Ort, an dem entschieden wird, wohin jemand gehört.

**Mitarbeiter sind kein Kriterium.** Ein Betrieb, in dem vorerst nur der Chef
arbeitet, ist zulässig.

### Schritt 1 kennt vier Lagen

Alle aus vorhandenen Daten abgeleitet, keine davon gespeichert:

| Lage | Anzeige |
|---|---|
| keine Session, kein `?email=` | Formular für die Betriebsdaten |
| keine Session, mit `?email=` | Code-Eingabe, Daten zugeklappt darunter |
| Session, kein Betrieb | „Betrieb nachtragen" aus `user_metadata` |
| Session mit Betrieb | erledigt, Weg nach vorn, Abmelden |

Der Übergang von Formular zu Code läuft über eine Weiterleitung mit `?email=`,
nicht über Client-Zustand: so übersteht der Schritt einen Reload und die
Adresse ist beim Gerätewechsel vorausgefüllt — der Fall, für den es überhaupt
Codes statt Links gibt.

## 3. Zahlung

`src/lib/stripe.ts` ist die einzige Stelle, die serverseitig mit Stripe spricht
(ausser dem Webhook). Lesewege legen dort nichts an — `sucheKunde` ist
getrennt von `holeOderErstelleKunde`, weil die Ableitung bei jedem
Seitenaufruf nach dem Abo fragt und sonst allein durchs Hinschauen Kunden
entstünden.

**Das Abo entsteht auch beim Überspringen.** Es ist der Träger der Testphase,
nicht der Beleg einer Zahlung. Angelegt mit `trial_period_days: 14` und
`trial_settings.end_behavior.missing_payment_method: "pause"`.

**Am 2026-08-23 mit einer Stripe-Testuhr durchgespielt** — vorher war die
Sperrlogik eine Annahme:

```
Testphase läuft ohne Karte ab   →  Stripe setzt `paused`
                                →  Webhook schreibt `pausiert`
Karte nachgereicht              →  dasselbe Abo läuft als `active` weiter
```

Dabei kam heraus, dass `subscriptions.resume` allein nicht genügt: der Aufruf
erzeugt eine **offene Rechnung** über den vollen Monatsbetrag mit
`auto_advance: false`, und das Abo bleibt `paused`, bis sie bezahlt ist — im
Test über eine Stunde. `nimmAboWiederAuf()` bezahlt sie deshalb sofort.
Schlägt das fehl, bleibt das Abo pausiert und der Grund wird angezeigt
(`ZahlungAbgelehnt`).

Das Zahlungsformular ist **ein** Bauteil für zwei Stellen: Schritt 2 und die
Sperrseite. `stripe.confirmSetup({ redirect: "if_required" })` — Karte und SEPA
ohne Weiterleitung, 3DS kommt über `return_url` zurück und wird auf derselben
Seite übernommen. Übernommen wird serverseitig über die SetupIntent-ID: der
Server schlägt den Intent selbst nach und prüft, dass er zum Kunden dieses
Betriebs gehört.

## 4. Preise

Festgelegt am 2026-08-23, in Stripe und im Code gleichlautend:

| Anzeige | Plan-ID | Betrag | Grenze |
|---|---|---|---|
| Low | `basic` | 29 €/Monat | bis 15 Mitarbeiter |
| Medium | `pro` | 49 €/Monat | bis 30 Mitarbeiter |
| Business | `business` | 69 €/Monat | bis 50 Mitarbeiter, 1 Standort |
| Custom | — | Auf Anfrage | mehrere Standorte oder über 50 Mitarbeiter |

`Custom` hat bewusst **keine** Plan-ID und steht als `customTarif` neben
`plaene`, nicht darin: in `plaene` wäre er in Schritt 2 auswählbar und würde
beim Schreiben am CHECK auf `betrieb_abonnements.plan` scheitern.

Die alten Stripe-Preise (29,99 / 69,99 / 110,99) sind archiviert, die
`STRIPE_PRICE_*`-Variablen zeigen auf neue Price-Objekte. Beträge sind in
Stripe unveränderlich — eine Preisänderung heisst immer: neuen Price anlegen,
am Produkt als `default_price` setzen, alten archivieren, ID in die Umgebung.

## 5. Was noch Platzhalter ist

- **Store-Badges** auf dem Abschluss-Screen: sichtbar als „App Store" und
  „Google Play", gestrichelt umrandet, mit „bald verfügbar". **Kein `href`** —
  die App ist nicht veröffentlicht, und die Website kann vor ihr live gehen.
  `src/components/einrichtung/store-badges.tsx` wirft, wenn jemand
  `verfuegbar` setzt, ohne die Badges gebaut zu haben.
- **QR-Code** bewusst gar nicht erst gebaut: ein Code, der auf nichts zeigt,
  ist kein Platzhalter, sondern eine Sackgasse mit Aufforderungscharakter.
- **Custom-Kontakt** auf `/preise`: ohne `NEXT_PUBLIC_KONTAKT_EMAIL` steht dort
  „Kontaktadresse folgt in Kürze" statt eines toten `mailto:`.
- **Rechtstexte** `/impressum`, `/datenschutz`, `/agb` — Gerüste mit markierten
  Platzhaltern, unverändert seit dem Ausgangsstand.

## 6. Geprüft, nicht angenommen

Jede Phase ist gegen die laufende Anwendung und die echte Datenbank getestet,
nicht nur gegen die Dokumentation. Zusammengenommen:

| Prüflauf | Umfang |
|---|---|
| Zahlungsschicht (Phase 4) | 18 Prüfungen gegen die Stripe-Sandbox |
| Wiedereinstieg (Phase 5) | alle sieben Zeilen der Ableitungstabelle |
| Schritt 1 (Phase 6) | vier Lagen mit echten Sessions gerendert |
| Schritt 3 (Phase 8) | 26 Prüfungen: Regeln, RLS, Rendering, UNIQUE-Falle |
| Schritt 4 (Phase 9) | 40 Prüfungen, Schwerpunkt Wochentag |
| Stepper end-to-end | 33 Prüfungen von der Registrierung bis zur Sperre |
| Testuhr | 8 Prüfungen: Ablauf → `paused` → nachgereicht → `active` |

Dabei sind drei Annahmen gefallen, die vorher in der Doku standen:

1. `subscription.pending_setup_intent` ist bei einem Trial ohne Karte
   **gefüllt**, nicht `null`. Der eigene SetupIntent bleibt trotzdem — Stripes
   eigener zeigt nur Karte und Link, ohne SEPA-Lastschrift.
2. `meine_einladungen()` kanonisiert Telefonnummern **nicht**. `+43…` und
   `0043…` sind für die Funktion zwei verschiedene Nummern.
3. `subscriptions.resume` macht ein pausiertes Abo nicht sofort wieder aktiv.

## 7. Datenbank — nur Referenz, nichts davon wird hier verändert

Supabase-Projekt `jqpfuotwsgnqihspsmmf`. Der Wizard schreibt direkt in
`rollen`, `mitarbeiter`, `mitarbeiter_rollen`, `schicht_vorlagen` und
`schicht_vorlage_mindestbesetzung` — die Policies hängen alle an
`ist_chef(betrieb_id)`, ein eigener RPC wäre eine zweite Autorisierungsebene.

`betrieb_abonnements` schreibt ausschliesslich der Webhook mit
`service_role`; es gibt für die Tabelle gar keine schreibende Policy.

Die Fallen im Detail stehen in `CLAUDE.md`. Die drei, die am teuersten wären:

- **`schicht_vorlagen.wochentag` ist montagsbasiert** (0 = Montag). Der CHECK
  prüft nur `0..6`, nicht die Bedeutung. Drei Belegstellen aus dem App-Repo
  stehen als Kommentar in `src/lib/schichten.ts`.
- **Eine Vorlage ohne Mindestbesetzung ist in der App unsichtbar.** Der Wizard
  lässt sie deshalb gar nicht erst anlegen.
- **`rollen` hat `UNIQUE (betrieb_id, name)` ohne `aktiv`.** Die App löscht
  weich, der Wizard muss hart löschen — sonst blockiert eine entfernte Rolle
  ihren Namen für immer.

## 8. Env-Variablen (`.env.local.example`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL              (optional, Default https://quickteam.at)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_KONTAKT_EMAIL         (optional, für Custom-Anfragen auf /preise)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BASIC / _PRO / _BUSINESS
SUPABASE_SERVICE_ROLE_KEY         (ausschliesslich im Webhook gelesen)
```

Dichtheitsprüfung im Client-Bundle nach jedem Build: `pk_test_` und
`js.stripe.com` vorhanden; `sk_test_`, `sk_live_`, `whsec_`, `service_role`,
die Price-IDs und `api.stripe.com` jeweils null Treffer.

## 9. Bekannte Fallen im Betrieb

- `npm run dev`/`build` teilen sich sonst `.next` → immer über
  `scripts/next-getrennt.mjs`
- Leere Env-Variablen kommen als `""` an, nicht `undefined` — deshalb der
  `env()`-Helper in `src/lib/site.ts`
- `supabase-js` mappt `error_code` bei 500ern nicht auf `error.code`;
  `error.status === 500` muss mit geprüft werden
- `stripe listen` braucht einen laufenden Dev-Server; ohne ihn gehen Ereignisse
  verloren, und für CLI-weitergeleitete Ereignisse gibt es hinterher **kein**
  „Resend". Nachziehen geht dann nur über eine Änderung am Objekt.

## 10. Was noch offen ist

**Im Repo:**

- Store-URLs und QR-Code, sobald die App veröffentlicht ist
- `NEXT_PUBLIC_KONTAKT_EMAIL` für Custom-Anfragen
- Rechtstexte
- `status = 'gekuendigt'` hat in der Wiedereinstiegs-Tabelle keine eigene
  Zeile — fällt derzeit bis zum Abschluss-Screen durch. Nachholen, sobald
  aktive Kündigungen vorkommen.
- „Ein Chef, mehrere Standorte" ist nicht unterstützt; der einzige Weg zu einem
  zweiten Standort ist heute eine zweite Registrierung mit anderer Adresse.

**Beim Kollegen (App-Repo), gemeldet und nicht von hier aus repariert:**

- `meine_einladungen()` kanonisiert Telefonnummern nicht — eine Einladung an
  `0660 …` erreicht ein Konto mit `+43 660 …` nie, lautlos.
- `DOCUMENTATION.md` führt `einladungen` als Einladungsweg. Der Weg über
  `mitarbeiter` mit `status = 'eingeladen'` und `einladung_annehmen()` ist der
  tatsächlich benutzte; `mitarbeiter_einladung_annehmen(p_code)` schreibt auf
  eine Spalte, die es nicht gibt.
- Mail-Vorlagen liegen zentral im Supabase-Projekt, nicht pro Repo — die
  englischen aus dem App-Repo und die deutschen von hier kollidieren.

**Ausdrücklich nicht Teil dieses Repos:** eine Sperre, die jemanden ohne
Zahlung an der Arbeit *in der App* hindert. Die website-seitige Sperre reicht
für diese Phase.
