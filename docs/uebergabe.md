# Übergabe — Stand 2026-08-06, 18:40Z

Diese Datei ist der Einstieg für eine neue Chat-Session. `CLAUDE.md` bleibt die
verbindliche Spezifikation; hier steht nur, was **darüber hinaus** aus den bisherigen
Sessions bekannt ist.

---

## 1. Was fertig ist

**Fundament** — Next.js 15.5.22 / React 19.2.8 / TypeScript strict / Tailwind v4.3.3.
`npm run build` und `tsc --noEmit` laufen grün durch, alle 11 Routen liefern 200,
First Load JS der Startseite 103 kB (Budget 150 kB).

**Design-Tokensystem** in `src/app/globals.css`, dreischichtig. Ebene 1 ist seit
2026-08-06 die Kernpalette aus `docs/Farbpalette.html` — Grün / Bronze / Rot auf
dunklem Grund, wörtlich übernommen:

| Rolle          | Dunkel    | Hell      |
| -------------- | --------- | --------- |
| Background     | `#0D100E` | `#F3F0E8` |
| Surface        | `#1A1F1C` | `#E9E2D0` |
| Brand / Band   | `#16241C` | `#2A4034` |
| Text primär    | `#EDE9E0` | `#16241C` |
| Text sekundär  | `#6E736C` | `#5B564A` |
| Accent         | `#A8874F` | `#8A6B3C` |
| Accent Hover   | `#D4B478` | `#6E5228` |
| Danger         | `#C1442D` | `#A83824` |

Mengenverhältnis laut Palette: ~70 % dunkle Basis, 20 % Grün, 8 % Bronze, 2 % Rot. Rot
ist Fehlern und destruktiven Aktionen vorbehalten.

**Drei Werte sind minimal aufgehellt**, weil sie als Fliesstext unter 4.5:1 blieben:
Muted Stone auf Carbon (3.95 → 4.69 mit 10 % Bone), Accent auf Papier (4.34 → 4.75, ein
Viertel Richtung Hover-Ton) und Danger auf Carbon (3.76 → 5.18 über Red Hi). Jede
Stelle ist in `globals.css` einzeln begründet.

Schicht 2 leitet daraus semantische Tokens per `color-mix()` ab, inklusive
`prefers-color-scheme: dark`. Schicht 3 bindet sie über `@theme inline` an Tailwind
(`--color-*`, `--font-display/sans/mono`, `--radius-blk/card/panel`). Schriften
unverändert: Archivo (Display), Inter (Fliesstext), JetBrains Mono. Ansprache
durchgehend **Du-Form**.

**Auth-Bereich vollständig** — Registrierung, Login, Passwort-vergessen,
Passwort-neu, Bestätigungsseite, Callback. Server Components überall; `"use client"`
nur in den Formular-Komponenten, im mobilen Menü und im Session-Hinweis.

**Die Betriebsanlage** liegt in `src/lib/betrieb.ts` (`stelleBetriebSicher`) und wird
aus der Server Action von `/auth/bestaetigen` aufgerufen, nachdem `verifyOtp` die
Session erzeugt hat: `meine_betriebe()` → für jede ID `ist_chef({ p_betrieb_id })` →
nur wenn nirgends `true` kommt `registriere_betrieb()` → Redirect auf
`NEXT_PUBLIC_APP_URL`.
**Der `ist_chef`-Zweig wurde noch nie ausgelöst** — der eine erfolgreiche Testlauf lief
am Erstanlage-Pfad entlang. Ungetestet, nicht kaputt.

**Sicherheitsverhalten, das absichtlich so ist:**

- Es gibt keinen `?next=`-Parameter und keinen Open-Redirect-Angriffspunkt mehr:
  alle Weiterleitungen sind fest verdrahtet. `sichererPfad()` ist mit dem Callback
  entfallen — wird wieder ein Ziel aus einem Parameter gelesen, muss die Prüfung
  zurück.
- `src/lib/auth-meldungen.ts` ist eine Whitelist: Query-Parameter sind nur Schlüssel,
  ihr Text wird nie gerendert.
- Registrierung und Passwort-Reset antworten identisch, egal ob die Adresse existiert
  (keine Konto-Enumeration).

**Middleware** (`src/lib/supabase/middleware.ts`): frischt nur die Session auf.
`zielFuerAngemeldete()` gibt bewusst immer `null` zurück — Option 2 aus Session 2,
angemeldete Nutzer werden von `/login` und `/registrieren` **nicht** weggeleitet.
Stattdessen erscheint der schmale Banner aus `src/components/auth/session-hinweis.tsx`,
damit Kontowechsel und Zweitbetrieb möglich bleiben.

---

## 2. E-Mail-Versand — **gelöst am 2026-08-06**

**Ursache:** Im Supabase-Feld „Username" stand `Resend` mit grossem `R`. Resend
verlangt `resend`, kleingeschrieben. Nach der Korrektur kommen die Mails an.

Das war H1 aus `docs/plan-mailversand.md`, bestätigt durch ein Kontrollexperiment mit
festem Dummy-Key und variablem Benutzernamen — nicht durch Raten. Der Verlauf darunter
bleibt stehen, weil daraus zwei Dinge zu lernen sind: welche Diagnose trug und welche
nicht.

**Direkt danach kam der nächste Befund:** Die Mail enthielt einen achtstelligen
Zahlencode statt eines Links. Die Supabase-Vorlage „Confirm signup" stand auf
`{{ .Token }}`; dieses Repo baut aber den Link-Flow (`/auth/callback` +
`exchangeCodeForSession`) und hat keine Code-Eingabe. **Entscheidung vom 2026-08-06:
Vorlagen auf `{{ .ConfirmationURL }}` umstellen, kein Code-Weg.** Beide Vorlagen samt
Begründung und den offenen Dashboard-Punkten stehen in `docs/mail-vorlagen.md`.

<details>
<summary>Verlauf der Diagnose (historisch, für den Wiederholungsfall)</summary>

### Fakt, aus den Supabase-Auth-Logs am 2026-08-06 um 18:33Z abgefragt

```
2026-08-06T18:26:52Z | 535 "Invalid username" | hess.alex25@gmail.com   ← jüngster
2026-08-06T14:18:18Z | 535 "Invalid username" | leo.solomon@web.de
2026-08-06T14:17:52Z | 535 "Invalid username" | leo.solomon@web.de
2026-08-06T14:17:44Z | 535 "Invalid username" | leo.solomon@web.de
2026-08-05T21:53:43Z | 535 "Invalid username" | hess.alex25@gmail.com
… (insgesamt 9 Treffer, alle identisch)
```

Dazwischen liegt um `14:08:47Z` ein Treffer auf `path: /admin/custom-providers` — da
wurde am Dashboard gespeichert. Die 535er danach sind unverändert.

Jeder Treffer hängt an `action: user_confirmation_requested`, `path: /signup`.
Nach aussen kommt davon nur an:

```
HTTP 500  {"code":500,"error_code":"unexpected_failure",
           "msg":"Error sending confirmation email"}
```

**Der Fehler ist unverändert derselbe wie gestern.** Die Versuche von heute 14:17–14:18
scheitern genauso. Was auch immer zwischenzeitlich am Dashboard geändert wurde, hat
den 535 nicht beseitigt.

### Was bereits ausgeschlossen ist

| Verdacht                     | Status | Beleg                                                        |
| ---------------------------- | ------ | ------------------------------------------------------------ |
| Host / Port / TLS falsch     | ✅ ok  | Direkter TLS-Probe: `220 Resend SMTP Relay ESMTP`             |
| Resend akzeptiert kein LOGIN | ✅ ok  | `250-AUTH PLAIN LOGIN` im EHLO                                |
| API-Key ungültig             | ✅ ok  | Dein eigener Lauf: `235 Authentication successful`            |
| Anwendungscode               | ✅ ok  | Supabase antwortet 500, bevor App-Code beteiligt ist          |
| API-Key im Supabase-Feld     | ✅ ok  | wird bei `Invalid username` gar nicht geprüft (siehe unten)   |
| **Username-Feld**            | ❌     | **bewiesene Ursache** — der Wert ist nicht `resend`            |

### Warum das jetzt bewiesen ist (Kontrollexperiment 2026-08-06)

**Die frühere Begründung war falsch und ist ersetzt.** Sie lautete: „die Ablehnung
kommt direkt nach dem base64-kodierten Benutzernamen, das Passwort geht gar nicht mehr
raus." Das stimmt nicht — Resend beantwortet **jeden** Benutzernamen mit
`334 Password:`, auch `RESEND` oder `resend@quickteam.at`. Entschieden wird erst nach
dem Passwort. Aus dem Zeitpunkt der Ablehnung folgt also nichts.

Tragfähig ist stattdessen der **Text** der 535. Nachgewiesen mit einem absichtlich
ungültigen Dummy-Key, bei dem nur der Benutzername variierte — jeder Unterschied kann
damit nur vom Benutzernamen kommen:

| gesendeter Benutzername            | Antwort                                  |
| ---------------------------------- | ---------------------------------------- |
| `resend`                           | `535 Authentication credentials invalid` |
| `Resend`, `RESEND`, `resend ` u. a.| `535 Invalid username`                   |

Resend hat also zwei verschiedene 535er und trennt damit die Felder sauber:

- **`Invalid username`** → Benutzername ≠ `resend`; der Key wird nicht einmal geprüft.
- **`Authentication credentials invalid`** → Benutzername stimmt, der Key wird abgelehnt.

In den Auth-Logs steht ausnahmslos die erste Variante. **Der Benutzername im
Supabase-Feld ist nicht `resend`.** Der API-Key ist unverdächtig — über ihn ist bisher
schlicht nichts ausgesagt worden.

`scripts/smtp-test.mjs` wertet diese Unterscheidung jetzt selbst aus und zeigt vor dem
Verbinden Länge und Hex-Bytes des Benutzernamens. Ein mitkopiertes `U+00A0` oder ein
abschliessendes Leerzeichen sieht im Terminal sonst aus wie ein sauberes `resend`,
erzeugt aber dieselbe Meldung wie das grosse `R`.

### Nächster Schritt, konkret

1. In Supabase → Project Settings → Authentication → SMTP Settings das Feld
   **Username** ansehen. Erwartet wird exakt `resend`, sechs Zeichen, klein.
   Zuletzt stand dort `Resend` mit grossem R.
2. Den Wert **von Hand tippen, nicht einfügen.** Ein mitkopiertes Leerzeichen oder ein
   Zeilenumbruch ist im Feld unsichtbar und erzeugt exakt diesen 535.
3. Das Passwort-Feld ist maskiert und wird beim Speichern oft geleert — API-Key
   erneut eintragen.
4. Speichern, dann **eine Minute warten** (Minimum interval steht auf 60 Sekunden).

### Schnellster Testweg — ohne neue Testdaten

`/passwort-vergessen` mit einer bereits registrierten Adresse. Das löst denselben
SMTP-Versand aus, legt aber keine Zeilen in `betriebe`/`mitarbeiter` an. Danach die
Auth-Logs prüfen: verschwindet der 535, ist die Sache erledigt.

Alternativ das Skript, das den Feldinhalt an Supabase vorbei direkt gegen Resend prüft.
Dafür genügt ein **Dummy-Key** — die Username-Prüfung läuft vor der Key-Prüfung, ein
echtes Geheimnis muss also gar nicht in die Shell:

```
node scripts/smtp-test.mjs re_dummy "hier_den_Feldinhalt_einfügen"
```

`Invalid username` → das Feld ist falsch. `Authentication credentials invalid` → das
Feld ist richtig (und der Dummy-Key erwartungsgemäss nicht). Wird ein echter Key
verwendet, landet er in der Shell-History — danach löschen.

### Falls der 535 nach korrektem Username bleibt

Dann **den Text der Meldung lesen**, er sagt selbst, wo es weitergeht:

- Weiterhin `Invalid username` → der Wert im Feld ist immer noch nicht `resend`.
  Entweder steckt ein unsichtbares Zeichen drin (Byte-Ansicht des Skripts) oder
  Supabase hat nicht gespeichert — erkennbar daran, dass nach dem Neuladen der Seite
  wieder der alte Wert dasteht. Letzteres geht an den Supabase-Support, nicht in eine
  weitere Runde Raten.
- `Authentication credentials invalid` → Fortschritt, ab hier ist der API-Key dran
  (Phase 2b im Mailplan).
- Ausweichweg, erst wenn beides ausgeschöpft ist: Supabase Auth Hook „Send Email" auf
  eine Edge Function, die die Resend-**API** statt SMTP nutzt. Konfiguration, kein
  Schema-Eingriff — aber deutlich mehr Aufwand, und nur nach Rückfrage.

</details>

### Nachtrag: der Link ist wieder weg — Bestätigung läuft über Codes

Die erste Mail, die ankam, enthielt einen achtstelligen Zahlencode statt eines Links
(Supabase-Vorlage stand auf `{{ .Token }}`). Zunächst war entschieden, die Vorlage auf
`{{ .ConfirmationURL }}` umzustellen. **Am selben Tag umentschieden:** die Bestätigung
läuft jetzt komplett über eingetippte Codes, für Registrierung **und** Passwort-Reset.

Grund ist das PKCE-Problem, das der Link mitbringt: der `code_verifier` liegt als
Cookie im Browser der Registrierung, `exchangeCodeForSession` braucht ihn beim Klick
wieder. Mail am Handy öffnen, registriert am Laptop → Fehlermeldung. Für einen
Gastro-Betrieb ist das kein Randfall.

Was das im Repo bedeutet, steht in `CLAUDE.md` (Abschnitt „Bestätigung läuft über
Codes") und `docs/mail-vorlagen.md`. Ersatzlos entfallen: `/auth/callback`,
`callbackUrl()`, `emailRedirectTo`, `redirectTo`, die Redirect-Allowlist.

### Was am Mailversand noch offen ist

Konfiguration im Dashboard, alles beim User — im Repo ist dafür nichts zu tun.
Vorlagen zum Kopieren und Begründung: `docs/mail-vorlagen.md`.

1. **„Email OTP Length"** auf **8** stellen (Authentication → Sign In / Providers →
   Email). Supabase erlaubt 6–10. Muss zu `CODE_LAENGE` in `src/lib/validierung.ts`
   passen. Der Code vom 06.08. hatte bereits acht Ziffern — vermutlich steht es schon
   richtig, bestätigen musst du es trotzdem.
2. **Vorlage „Confirm signup"** auf die Token-Fassung umstellen.
3. **Vorlage „Reset Password"** ebenso. Bisher ungetestet, weil vorher gar keine Mail
   rausging.
4. **Sender name** steht auf `resend`. Gehört auf `QuickTeam`.
5. **`onboarding@resend.dev`** stellt nur an die Adresse des Resend-Kontoinhabers zu.
   Vor dem Livegang eine verifizierte Absenderdomain, z. B. `noreply@quickteam.at`.
   Erst danach kann sich überhaupt jemand ausser dir registrieren.

Danach der Gesamtdurchlauf. Dessen eigentlicher Zweck ist der **zweimal eingegebene
Code**: es darf kein zweiter Betrieb entstehen. Das ist der `ist_chef`-Zweig, jetzt in
`src/lib/betrieb.ts`, der bis heute nie ausgelöst wurde.

---

## 3. Danach: Landing Page

Die Startseite ist noch Platzhalter. Geplant und abgestimmt:

- **Hero mit dem Wochenraster**, das sich beim Laden in orchestrierter Folge mit
  Schichten füllt und dabei einen Konflikt auflöst. Reines CSS, keine
  Animationsbibliothek. `prefers-reduced-motion` → direkt der Endzustand.
- Drei Nutzenblöcke, ein AT/DE-Abschnitt, ein Abschlussblock.
- Budget First Load JS bleibt unter 150 kB.

**Blockiert:** Die Preisseite braucht echte Zahlen — Preise für Basic/Pro/Business,
Trial-Dauer, und was nach Ablauf des Trials passiert. Ohne diese Angaben entstehen
weder Preistabelle noch die `offers` im JSON-LD. Erfundene Preise kommen nicht auf die
Seite.

**Ebenfalls offen:** `opengraph-image.tsx` je Route (bisher nur die auf Root-Ebene),
und `NEXT_PUBLIC_SITE_URL` muss vor dem Deploy je Vercel-Umgebung auf die echte Domain
gesetzt werden.

---

## 4. Fallen, die schon einmal Zeit gekostet haben

- **`npm run dev` und `npm run build` teilten sich `.next`** — behoben am 2026-08-06,
  nachdem es ein zweites Mal zugeschlagen hatte. Symptom war: `Cannot find module
  './331.js'`, alle Routen 500, Stacktrace voller `node_modules`-Pfade. Sah wie ein
  Codefehler aus, war keiner.
  `npm run build` und `npm run start` laufen jetzt über `scripts/next-getrennt.mjs`
  und schreiben nach `.next-build`; `next.config.ts` liest dafür `NEXT_DIST_DIR` und
  fällt ohne die Variable auf `.next` zurück, damit Vercel unverändert baut. Beides
  darf ab jetzt gleichzeitig laufen.
  **Wer trotzdem `npx next build` direkt aufruft, umgeht den Schutz** — dann gilt
  wieder: Dev stoppen, `.next` löschen, neu starten.
- **Leere Env-Variablen sind nicht `undefined`.** Next inlined sie als `""`, `??` greift
  dann nicht und `new URL("")` wirft. Dafür gibt es den `env()`-Helper in
  `src/lib/site.ts` — neue Env-Zugriffe gehen durch ihn.
- **`supabase-js` mappt `error_code` bei 500ern nicht auf `error.code`.** Verzweigungen
  auf `error.code` allein laufen ins Leere; `error.status === 500` muss mit rein. Genau
  daran ist ein erster Fix-Versuch gescheitert, sichtbar erst durch
  `protokolliereAuthFehler()` in `src/lib/formular.ts`.
- **Ohne dieses Logging steht im Terminal nur `POST /registrieren 200`.** Alle fünf
  Auth-Aktionen rufen es auf — beim Ergänzen weiterer Aktionen mitziehen.
- **React mappt `onBlur` auf `focusout`** (bubbelt). Ein Handler am `<form>` bekommt das
  Formular als Event-Target, nicht das Feld. Deshalb `useFeldPruefung` in
  `src/components/formular/use-feld-pruefung.ts` mit `instanceof`-Narrowing.
- **`title.template` gilt nicht für das eigene Segment der Root-Seite** — dort braucht es
  `title: { absolute: … }`.
- **Aus dem Zeitpunkt einer SMTP-Ablehnung folgt nichts.** Ein Server darf `AUTH LOGIN`
  bis zum Schluss durchlaufen lassen und erst nach dem Passwort urteilen — Resend macht
  genau das. Wer aus „die Ablehnung kam nach dem Benutzernamen" auf das schuldige Feld
  schliesst, rät. Belastbar wird es erst durch ein Kontrollexperiment, in dem **eine**
  Variable wandert und alles andere konstant bleibt (hier: fester Dummy-Key, variabler
  Benutzername). Das kostete hier zwei Sessions.

---

## 5. Unverrückbar (aus CLAUDE.md, hier nur als Erinnerung)

- Das Schema wird von diesem Projekt aus **nicht** verändert. Kein DDL, keine
  Migration, keine Policy. Fällt etwas auf: melden, nicht beheben.
- Kein `service_role`-Key im Repo — auch nicht serverseitig. Nur
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_SITE_URL`.
- Keine zweite Autorisierungsebene neben RLS.
- Kein Dashboard, keine Schichtplanung in diesem Repo.
- Bei Unsicherheit über Spalten, Constraints oder RPC-Signaturen: im Supabase-MCP
  nachsehen (lesend), nicht raten.
