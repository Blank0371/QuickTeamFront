# Zahlungsablauf — Integriertes Testprotokoll

**Stand: 2026-09-14. Noch nicht gefahren — es fehlt der Zugang
(Abschnitt 1).**

Dieses Protokoll ist so geschrieben, dass es jemand mit Zugang ohne
Rückfragen abarbeiten kann. Jeder Fall nennt, **woran** das Ergebnis
abzulesen ist — und zwar am Stripe-Objekt und am Testbetrieb, nicht an
einer Erfolgsmeldung im Browser. Eine grüne Seite ist kein Beleg; sie
sagt nur, dass der Code nicht geworfen hat.

---

## 1. Was fehlt

### Was vorhanden ist — und warum es nicht genügt

Am 2026-09-14 liegen im Arbeitsverzeichnis `.env.local` und
`.env.production`. **Beide tragen Produktionskonfiguration**, und
`.env.local` ist eine **byteweise identische Kopie** von
`.env.production` (mit `cmp` geprüft, ohne den Inhalt zu lesen).

Geprüft wurde nur, *welcher Art* die Werte sind — nie ihr Inhalt:

| Merkmal | Befund |
| ------- | ------ |
| Supabase-Projekt | das geteilte **Produktionsprojekt** |
| `sk_test_` / `pk_test_` | **nicht vorhanden** |
| `pk_live_` | vorhanden |
| `STRIPE_WEBHOOK_SECRET` | vorhanden (Produktions-Endpunkt) |
| `SUPABASE_SERVICE_ROLE_KEY` | vorhanden |
| `SOFT_LAUNCH` | nicht `aus` |

**Ein Umbenennen macht daraus keine Testumgebung.** Das Protokoll legt
Stripe-Kunden, Abonnements und Zahlungsmethoden an, und der Webhook
schreibt in `betrieb_abonnements`. Gegen diese Konfiguration gefahren,
wären das echte Daten echter Betriebe — und die Expo-App hängt an
derselben Instanz.

Der letzte Eintrag erklärt nebenbei, warum bisher nichts passiert ist:
mit `SOFT_LAUNCH` ≠ `aus` leitet die Middleware `/einrichtung` und
`/dashboard` auf `/` um und fasst die Sitzung gar nicht erst an. Ein
versehentlicher lokaler Start hätte den Zahlungsweg also nicht erreicht.
Das ist ein glücklicher Umstand, keine Absicherung.

### Die Prüfung vor dem Start

```bash
node --env-file=.env.local scripts/pruefe-testumgebung.mjs
```

Prüft **beide** Seiten (Supabase-Projekt, Stripe-Schlüsselart, gemischte
Welten, Webhook, Preis-Ids, `SOFT_LAUNCH`), gibt **keinen einzigen Wert**
aus und endet mit Exitcode 1, wenn etwas nicht passt. Gegen die heutige
Datei meldet es vier blockierende Punkte.

Das ersetzt keinen Blick ins Stripe-Dashboard — es schliesst nur die
Verwechslung aus, die hier möglich war.

### Benötigt

| Variable | Wofür | Anforderung |
| -------- | ----- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sitzung, Betriebsdaten | **eigenes Sandbox-Projekt** mit QuickTeam-Schema |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dito | zum selben Projekt |
| `STRIPE_SECRET_KEY` | SetupIntent, Abo, Kunde | `sk_test_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payment Element | `pk_test_…`, **gleiches Konto** |
| `STRIPE_WEBHOOK_SECRET` | Statuswechsel | aus `stripe listen` **dieser** Umgebung |
| `STRIPE_PRICE_BASIC/PRO/BUSINESS` | Planwahl | **Testpreise** im selben Testkonto, `tax_behavior: exclusive` |
| `SOFT_LAUNCH=aus` | sonst ist der Stepper gesperrt | — |

### Beide Seiten müssen Sandbox sein

Ein Stripe-Testschlüssel allein genügt **nicht**. Der Ablauf schreibt auf
beiden Seiten:

- bei Stripe: Kunde, Anschrift, Steuer-ID, SetupIntent, Zahlungsmethode,
  Abo-Status;
- in Supabase: `betrieb_abonnements` (über den Webhook), und je nach Fall
  `rechtliche_zustimmungen`, `mitarbeiter`.

Das per MCP erreichbare Projekt `jqpfuotwsgnqihspsmmf` ist die geteilte
**Produktionsinstanz**. Die vorhandenen Sandbox-*Betriebe*
(`QT-Sandbox-Test`) liegen darin und lösen das nicht — gebraucht wird ein
eigenes **Projekt**.

Das Schema kommt am einfachsten über einen Dump des Produktionsschemas
**ohne Daten** (`supabase db dump --schema-only`) in das neue Projekt;
Policies, Trigger und RPCs müssen mit, sonst verhält sich der Stepper
anders als in Produktion.

### Übermittlung

Die Werte gehören **nicht** in diesen Chat, nicht ins Repo und nicht in
eine Datei unter Versionskontrolle. Weg: lokal eine eigene Datei anlegen
(alle `.env*`- und `env*`-Varianten sind seit dem 2026-09-14 ignoriert,
siehe `.gitignore`) und den Testlauf dort fahren.

**Die vorhandene `.env.local` dabei nicht überschreiben und nicht als
Vorlage nehmen** — sie ist die Produktionsdatei. Besser eine eigene, etwa
`.env.sandbox`, und der Lauf mit `--env-file=.env.sandbox`.

## 2. Vorbereitung

```bash
cp .env.local.example .env.sandbox        # Werte der Testumgebung eintragen
node --env-file=.env.sandbox scripts/pruefe-testumgebung.mjs   # muss 0 liefern
node --env-file=.env.sandbox node_modules/next/dist/bin/next dev
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Erst weiterlesen, wenn die Prüfung mit Exitcode 0 endet.** Sie ist die
einzige Stelle, an der eine Verwechslung von Test- und
Produktionskonfiguration noch auffällt; danach sieht jeder Schritt gleich
aus.

`--env-file=.env.sandbox` statt `.env.local`, damit die vorhandene
Produktionsdatei unangetastet bleibt. Next lädt `.env.local` von sich aus
— wer sie liegen lässt **und** `npm run dev` benutzt, arbeitet gegen
Produktion.

Zwei Terminals: der Webhook muss mitlaufen, sonst bleibt
`betrieb_abonnements` auf dem alten Stand und mehrere Prüfungen unten
sind nicht aussagekräftig.

**Testbetrieb** anlegen über `/registrieren` (Bestätigungscode notfalls
über `.claude/skills/run-quickteam-web/hole-code.mjs`), Land **AT**
wählen — nur dann erscheint das UID-Feld, das mehrere Fälle brauchen.

### Karten (Stripe-Testdaten)

| Zweck | Nummer |
| ----- | ------ |
| normal, ohne 3DS | `4242 4242 4242 4242` |
| **3DS erforderlich** | `4000 0027 6000 3184` |
| 3DS, Freigabe schlägt fehl | `4000 0000 0000 9995` (Zahlung abgelehnt) |

Ablaufdatum in der Zukunft, CVC beliebig.

---

## 3. Die Fälle

### a) Testabo mit normaler Testzahlungsmethode

1. Plan wählen → „Weiter zur Zahlung".
2. Rechnungsangaben ausfüllen, Karte `4242…`, absenden.

**Abzulesen an:**

- Stripe → Customer: `name`, `address.line1/postal_code/city/country`
  gesetzt; `invoice_settings.default_payment_method` gesetzt.
- Stripe → Subscription: `status = trialing`,
  `default_payment_method` gesetzt, `automatic_tax.enabled = true`.
- Supabase → `betrieb_abonnements`: `status = 'trial'`,
  `stripe_customer_id` und `stripe_subscription_id` gefüllt.
- **`betriebe.land` unverändert** — auch wenn im Formular ein anderes
  Land steht. (Der Unit-Test deckt das ab; hier ist die Gegenprobe am
  echten Datensatz.)

### b) 3DS-Testfall

1. Wie (a), aber Karte `4000 0027 6000 3184`.
2. Im 3DS-Fenster **bestätigen**.

**Abzulesen an:**

- Der Browser kehrt auf **dieselbe Seite** zurück, auf der das Formular
  stand — mit `?setup_intent=…`. (Vor der Korrektur vom 2026-09-14 ging
  er immer auf `/einrichtung/zahlung`.)
- Stripe → SetupIntent: `status = succeeded`.
- Stripe → Subscription: `default_payment_method` gesetzt.
- Die Rechnungsangaben stehen am Kunden, **obwohl das Formular beim
  Rückweg nicht mehr existierte** — sie wurden vor `confirmSetup`
  gespeichert.

### c) Pausiertes Testabo fortsetzen

Vorbereitung mit einer **Stripe-Testuhr**: Abo ohne Zahlungsmittel
anlegen, Uhr über das Testphasenende vorstellen, bis Stripe
`customer.subscription.paused` schickt.

1. `/dashboard` aufrufen → Umleitung auf
   `/einrichtung/testphase-abgelaufen`.
2. Rechnungsangaben + Karte `4242…`.

**Abzulesen an:**

- Stripe → Subscription: `status = active` (nicht mehr `paused`), und die
  offene Rechnung ist **bezahlt** (`nimmAboWiederAuf` ruft
  `invoices.pay()`).
- **Kein zweites Abo** am Kunden.
- Supabase → `betrieb_abonnements.status = 'aktiv'` nach dem Webhook.
- **Direkt nach dem Absenden**, noch bevor der Webhook durch ist:
  `/einrichtung` darf **nicht** auf die Sperrseite zurückwerfen. Das ist
  die Korrektur vom 2026-09-14 (Gegenprüfung bei Stripe); zum Testen den
  `stripe listen`-Prozess kurz anhalten und die Seite neu laden.

### d) Abgebrochene oder fehlgeschlagene Bestätigung

1. Karte `4000 0027 6000 3184`, im 3DS-Fenster **abbrechen**.
2. Zweiter Durchgang: Karte `4000 0000 0000 9995`.

**Abzulesen an:**

- Fehlermeldung im Formular, Knopf wieder bedienbar.
- Stripe → Subscription: **kein** `default_payment_method`.
- Stripe → Customer: die Rechnungsangaben stehen trotzdem da — sie
  wurden vor der Bestätigung gespeichert, und das ist gewollt (beim
  nächsten Anlauf ist das Formular vorbelegt).
- Supabase → `betrieb_abonnements` unverändert.

### e) Erneuter Aufruf desselben Rückwegs

1. Nach erfolgreichem (b) die Adresse mit `?setup_intent=…` **erneut**
   aufrufen (Verlauf zurück, neu laden).

**Abzulesen an:**

- Kein Fehler, keine zweite Zahlungsmethode, **kein** zweites Abo.
- Stripe → Subscription: unverändert `active`/`trialing`, nicht erneut
  fortgesetzt.
- Im Protokoll keine `[zahlung]`-Fehlerzeile.

Zusätzlich: dasselbe Formular in **zwei Tabs** öffnen und beide
absenden. Erwartet: beide laufen durch, am Ende hängt **eine**
Zahlungsmethode am Abo (die zuletzt bestätigte), und es gibt genau ein
Abo.

### f) Fremde SetupIntent-ID

1. In einem **zweiten** Testbetrieb (anderer Kunde) einen SetupIntent
   erzeugen, dessen Id notieren.
2. Als erster Betrieb `/einrichtung/zahlung?setup_intent=<fremde-id>`
   aufrufen.

**Abzulesen an:**

- Meldung „Diese Zahlungsmethode gehört nicht zu deinem Betrieb."
- Im Serverprotokoll: `[zahlung] SetupIntent … gehört zu …, erwartet …`.
- Stripe → beide Subscriptions unverändert.

Ebenfalls zu fahren:
`?setup_intent=seti_existiertnicht` → allgemeine Fehlermeldung, kein
Absturz.

### g) Rechnungsangaben als Tor (nicht als Ersatz für Sicherheit)

1. Formular abschicken mit **leerem** Ort → Browsermeldung am Feld.
2. Serverseitig: `rechnungSpeichern` direkt mit unvollständigen Daten
   aufrufen (DevTools → Server-Action-Aufruf wiederholen) → Fehler,
   nichts gespeichert.
3. Am Stripe-Kunden die `address` von Hand löschen, dann
   `?setup_intent=…` eines gültigen Intents aufrufen → **Ablehnung**
   („Für die Rechnung fehlen noch Angaben"), obwohl der Intent gültig und
   der Kunde der richtige ist.

Punkt 3 ist der eigentliche Beleg dafür, dass das Tor bei **Stripe**
liest und nicht der Eingabe glaubt.

### h) Kostenloses Testen bleibt möglich

1. Plan wählen → „Später hinterlegen".

**Abzulesen an:**

- Stripe → Subscription: `status = trialing`, **kein**
  `default_payment_method`, `trial_settings.end_behavior
  .missing_payment_method = pause`.
- Stripe → Customer: **keine** Anschrift (nur Land, aus
  `stelleSteuerstandortSicher`).
- Der Stepper führt weiter zu Schritt 3; es wurde nichts abgefragt.

### i) Bereits aktives und gekündigtes Abo

- **aktiv:** Formular erneut abschicken → Zahlungsmethode wird ersetzt,
  Abo bleibt `active`, **kein** zweites Abo, kein Resume.
- **vorgemerkt gekündigt** (`cancel_at_period_end`): Zusammenfassung
  zeigt „Das Abo ist gekündigt und endet am …"; Hinterlegen ändert die
  Vormerkung **nicht**.
- **gekündigt** (`canceled`): `/einrichtung/zahlung` bietet die Planwahl
  an; es entsteht ein **neues** Abo, das alte bleibt `canceled`.

### j) Testphasenende und Zusammenfassung

Am zwölften Tag einer 14-Tage-Testphase (Testuhr) das Formular öffnen.

**Abzulesen an:** die Zusammenfassung nennt das **tatsächliche**
`trial_end`-Datum und den **Stripe**-Betrag — nicht „die ersten 14 Tage"
und nicht den Anzeigepreis aus `plaene`. Weicht der Preis ab, steht
`[preise] …` im Serverprotokoll.

---

## 4. Ergebnisse

| Fall | Gefahren am | Ergebnis |
| ---- | ----------- | -------- |
| a) normale Karte | — | **offen** |
| b) 3DS | — | **offen** |
| c) pausiertes Abo fortsetzen | — | **offen** |
| d) Abbruch / Ablehnung | — | **offen** |
| e) Rückweg erneut / zwei Tabs | — | **offen** |
| f) fremde SetupIntent-Id | — | **offen** |
| g) Rechnungstor | — | **offen** |
| h) Testen ohne Karte | — | **offen** |
| i) aktiv / gekündigt | — | **offen** |
| j) Testphasenende | — | **offen** |

Ausgefüllt wird diese Tabelle von dem Lauf, der sie fährt — mit Datum
und, wo es hilft, der Stripe-Objekt-Id. Ein „sah gut aus" gehört nicht
hinein.
