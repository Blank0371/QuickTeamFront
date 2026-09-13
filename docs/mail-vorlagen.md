# E-Mail-Vorlagen (Supabase Dashboard)

Diese Texte gehören in **Supabase → Authentication → Email Templates**. Sie liegen
nicht bei Resend — Resend ist nur der Versandweg, den Inhalt baut Supabase.

**Warum sie hier stehen:** Die Vorlagen sind Dashboard-Konfiguration und damit nicht
versioniert. Ändert jemand dort etwas, ist ohne diese Datei nicht mehr
nachvollziehbar, wie es gemeint war.

---

## Die entscheidende Variable

Beide Vorlagen verschicken **`{{ .Token }}`** — den Zahlencode. **Nicht**
`{{ .ConfirmationURL }}`, nicht `{{ .TokenHash }}`.

Das ist eine Architekturentscheidung vom 2026-08-06 und keine Geschmacksfrage:

Der Link-Weg lief über PKCE. Beim `signUp` legt `@supabase/ssr` einen `code_verifier`
als Cookie im Browser ab; `exchangeCodeForSession` braucht ihn beim Klick wieder. Wer
sich am Laptop registriert und die Mail auf dem Handy öffnet, hat dieses Cookie dort
nicht — der Tausch scheitert, und zwar mit einer Fehlermeldung, die nach einem
kaputten Link aussieht. Für einen Gastro-Betrieb ist genau das der Normalfall: Anmeldung
im Büro, Mail auf dem Telefon.

Der Code kennt dieses Problem nicht. `verifyOtp` braucht nur E-Mail-Adresse und Ziffern,
beides steht im Formular. Gerätewechsel ist damit kein Sonderfall mehr, sondern
vorgesehen — auf beiden Seiten steht das auch so.

Nebeneffekt: Kein Link heisst auch kein Rücksprungziel. `emailRedirectTo`,
`redirectTo` und die Redirect-Allowlist entfallen ersatzlos, ebenso die Route
`/auth/callback`. Mail-Scanner, die Links vorab öffnen und dabei den Token verbrauchen,
sind ebenfalls erledigt.

**Steht in einer Vorlage `{{ .ConfirmationURL }}`, ist der betroffene Weg tot** — es
gibt keine Route mehr, die einen solchen Link entgegennimmt.

---

## Voraussetzung im Dashboard: Codelänge

**Authentication → Sign In / Providers → Email → „Email OTP Length"**

Supabase erlaubt dort laut Doku (`auth.email.otp_length`) **6 bis 10 Ziffern**,
Standard ist 6. Dieses Projekt fährt **8**.

Der Wert muss mit `CODE_LAENGE` in `src/lib/validierung.ts` übereinstimmen. Stimmen sie
nicht überein, weist entweder die Zod-Prüfung gültige Codes ab oder Supabase lehnt sie
an — beides sieht für den Nutzer gleich aus.

Ebenfalls dort: **„Email OTP Expiration"**, aktuell 3600 Sekunden. Die Oberfläche sagt
„gilt 60 Minuten"; wird der Wert geändert, muss der Text mit.

---

## 1. Confirm signup

Ausgelöst von `supabase.auth.signUp()` in `src/app/registrieren/aktionen.ts` und von
`supabase.auth.resend({ type: "signup" })` in `src/app/auth/bestaetigen/aktionen.ts`.

Geprüft wird der Code mit `verifyOtp({ email, token, type: "email" })`.

**Subject:** `Dein QuickTeam-Code: {{ .Token }}`

```html
<div style="font-family:-apple-system,Segoe UI,Corbel,Arial,sans-serif;
            color:#16241C;line-height:1.6;max-width:520px">
  <h2 style="font-size:20px;margin:0 0 16px;color:#16241C">Willkommen bei QuickTeam</h2>

  <p style="margin:0 0 20px">
    Fast geschafft. Trag diesen Code auf der Bestätigungsseite ein, dann legen
    wir deinen Betrieb an:
  </p>

  <p style="margin:0 0 20px;padding:20px 24px;background:#F3F0E8;
            border:1px solid #D9CFB6;border-radius:10px;text-align:center;
            font-family:Consolas,'Cascadia Mono',monospace;font-size:34px;
            font-weight:700;letter-spacing:10px;color:#6E5228">
    {{ .Token }}
  </p>

  <p style="margin:0 0 16px;font-size:14px;color:#5B564A">
    Der Code gilt 60 Minuten. Du kannst ihn auf einem anderen Gerät eintippen als
    dem, auf dem du diese Mail liest — trag dort einfach dieselbe E-Mail-Adresse
    mit ein.
  </p>

  <p style="margin:0 0 16px;font-size:14px;color:#5B564A">
    Bestätigst du nicht innerhalb von 24 Stunden, wird die Registrierung wieder
    gelöscht. Dann legst du den Betrieb einfach neu an — es geht nichts verloren,
    weil er bis zur Bestätigung noch gar nicht existiert.
  </p>

  <p style="margin:24px 0 0;font-size:13px;color:#5B564A">
    Du hast dich nicht bei QuickTeam registriert? Dann ignorier diese Mail.
    Ohne den Code passiert nichts.
  </p>
</div>
```

---

## 2. Reset Password

Ausgelöst von `supabase.auth.resetPasswordForEmail()` — sowohl in
`src/app/passwort-vergessen/aktionen.ts` als auch beim „erneut senden" auf
`/passwort-neu`.

Geprüft wird der Code mit `verifyOtp({ email, token, type: "recovery" })`. Direkt
danach setzt dieselbe Server Action das neue Passwort.

**Subject:** `Dein QuickTeam-Code zum Passwort zurücksetzen: {{ .Token }}`

```html
<div style="font-family:-apple-system,Segoe UI,Corbel,Arial,sans-serif;
            color:#16241C;line-height:1.6;max-width:520px">
  <h2 style="font-size:20px;margin:0 0 16px;color:#16241C">Passwort zurücksetzen</h2>

  <p style="margin:0 0 20px">
    Du hast ein neues Passwort für QuickTeam angefordert. Trag diesen Code auf der
    Seite ein, auf der du gerade bist:
  </p>

  <p style="margin:0 0 20px;padding:20px 24px;background:#F3F0E8;
            border:1px solid #D9CFB6;border-radius:10px;text-align:center;
            font-family:Consolas,'Cascadia Mono',monospace;font-size:34px;
            font-weight:700;letter-spacing:10px;color:#6E5228">
    {{ .Token }}
  </p>

  <p style="margin:0 0 16px;font-size:14px;color:#5B564A">
    Der Code gilt 60 Minuten und lässt sich nur einmal verwenden. Auch hier
    kannst du das Gerät wechseln — trag dann dieselbe E-Mail-Adresse mit ein.
  </p>

  <p style="margin:24px 0 0;font-size:13px;color:#5B564A">
    Du hast das nicht angefordert? Dann ignorier diese Mail — dein Passwort
    bleibt unverändert.
  </p>
</div>
```

---

## Farben

Die Werte stammen aus `docs/Farbpalette.html`, heller Modus — E-Mail-Clients können
`prefers-color-scheme` nicht zuverlässig, deshalb eine feste helle Variante:

| Rolle          | Wert      |
| -------------- | --------- |
| Text primär    | `#16241C` |
| Text sekundär  | `#5B564A` |
| Codefläche     | `#F3F0E8` |
| Coderahmen     | `#D9CFB6` |
| Code-Ziffern   | `#6E5228` |

Inline-Styles, keine `<style>`-Blöcke und keine externen Ressourcen — alles andere
überlebt Gmail und Outlook nicht.

---

## Was sonst noch passen muss

- **Sender name** steht auf `resend`. Gehört auf `QuickTeam` — das ist der Name, den
  ein Gastro-Betrieb im Posteingang sieht.
- **Absenderadresse — und damit zurzeit die Registrierung selbst.**
  `onboarding@resend.dev` stellt ausschliesslich an die Adresse des Resend-Konto-
  inhabers zu. Vor dem Livegang eine eigene Domain in Resend verifizieren (SPF- und
  DKIM-Records) und auf etwas wie `noreply@quickteam.at` umstellen.

  **Das ist kein Punkt für später, sondern eine Sperre für heute.** Scheitert der
  Versand, antwortet GoTrue mit `500 unexpected_failure` und **rollt den Benutzer
  zurück** — es entsteht kein Konto. Solange keine Domain verifiziert ist, kann sich
  also niemand ausser dem Kontoinhaber registrieren. Am 2026-08-29 in den `auth_logs`
  des Supabase-Projekts nachgelesen:

  ```
  gomail: could not send email 1: 550 "You can only send testing emails to your own
  email address (hess.alex25@gmail.com). To send emails to other recipients, please
  verify a domain at resend.com/domains, and change the `from` address to an email
  using this domain."
  ```

  **`+suffix`-Varianten helfen dabei nicht** — hier stand lange das Gegenteil.
  `hess.alex25+qtclaudetest@gmail.com` wurde mit demselben `550` abgewiesen; Resend
  vergleicht die Adresse zeichengenau und kennt kein Plus-Aliasing. Getestet werden
  kann ausschliesslich mit `hess.alex25@gmail.com` selbst.

  Der eigentliche Grund taucht **nirgends in der Anwendung auf**: nach aussen reicht
  GoTrue nur „Error sending confirmation email" durch. Wer ihn sucht, findet ihn in den
  `auth_logs`, nicht im Terminal des Dev-Servers.
- **SMTP-Username** ist `resend`, kleingeschrieben. Grosses `R` erzeugt
  `535 Invalid username` — siehe `docs/uebergabe.md`.
- **Minimum interval** steht auf 60 Sekunden. Der „Code erneut senden"-Button auf
  beiden Seiten sperrt genau so lange und zählt sichtbar herunter. Wird der Wert im
  Dashboard geändert, muss `SPERRE_SEKUNDEN` in
  `src/components/formular/erneut-senden.tsx` mit.
- **Ungenutzte Vorlagen** (Magic Link, Invite, Change Email) rührt diese Website nicht
  an — sie lösen keinen der hier gebauten Flows aus.

---

## Zwei Typwerte, die sich nicht gleichen

Eine Stolperstelle, die beim nächsten Anfassen sonst Zeit kostet:

| Aufruf                            | Typ            | Quelle                                    |
| --------------------------------- | -------------- | ----------------------------------------- |
| `verifyOtp` nach Registrierung    | `"email"`      | JS-Referenz, „Verify Signup OTP"          |
| `verifyOtp` nach Passwort-Reset   | `"recovery"`   | Auth-Doku, Passwort-Reset                 |
| `resend` für die Registrierung    | `"signup"`     | `ResendParams` lässt nur `signup`/`email_change` zu |

`"signup"` existiert im Typ `EmailOtpType` weiterhin und ist für `verifyOtp` nicht
verboten — dokumentiert ist für die Signup-Bestätigung aber `"email"`. Dass
ausgerechnet `resend` den anderen Wert verlangt, ist kein Tippfehler im Code.
