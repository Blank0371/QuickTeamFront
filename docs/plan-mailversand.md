# Plan: Bestätigungsmails zum Laufen bringen

> ## ✅ Erledigt am 2026-08-06 — Phasen 0 bis 3
>
> **Ursache: das Username-Feld stand auf `Resend` statt `resend`.** H1, wie in Phase 1
> hergeleitet. Nach der Korrektur kommt die Mail an, kein `535` mehr.
>
> **Offen ist etwas anderes:** Die Mail enthielt einen Zahlencode statt eines Links —
> die Supabase-Vorlage stand auf `{{ .Token }}`. Entscheidung vom 2026-08-06: Vorlagen
> auf `{{ .ConfirmationURL }}` umstellen, keine Code-Eingabe bauen. Das läuft ab hier
> über **`docs/mail-vorlagen.md`**, nicht mehr über diesen Plan.
>
> Was von diesem Plan noch aussteht: **Phase 4** (Absender) und **Phase 5**
> (Gesamtdurchlauf, insbesondere der doppelt geklickte Link). Der Rest ist Historie und
> steht nur noch für den Wiederholungsfall hier.

**Ziel:** Eine Registrierung auf `/registrieren` löst eine Bestätigungsmail aus, die
ankommt. Kein `535` mehr in den Supabase-Auth-Logs.

**Vorgehen:** Phasenweise. Jede Phase hat ein Abbruchkriterium — wird es nicht
erreicht, wird nicht die nächste Phase probiert, sondern die Ursache eingegrenzt.
Nichts wird geändert, bevor die Rohmeldung gelesen ist.

**Rollen:** Dashboard-Einstellungen und Resend-Konto macht der User. Code, Logs und
Diagnose mache ich. Ich habe keinen Zugriff auf das Supabase-Dashboard und keinen auf
das Resend-Konto.

---

## Was schon feststeht

Der `535` kommt **von Resend**, nicht von Supabase. Das ist die wichtigste
Einschränkung: Supabase liest die Custom-SMTP-Einstellungen, baut die TLS-Verbindung
zu `smtp.resend.com:465` auf und kommt bis zur Anmeldung. Host, Port, TLS-Modus und das
AUTH-Verfahren sind damit erledigt — sie funktionieren, sonst gäbe es einen anderen
Fehler. Ebenso erledigt: der Anwendungscode, denn Supabase antwortet mit 500, bevor
irgendetwas aus diesem Repo beteiligt ist.

Übrig bleibt genau ein Paar: **Benutzername und Passwort**, so wie sie in den
Supabase-Feldern stehen.

Zwei Hypothesen standen gegeneinander:

- **H1 — Benutzername.** Im Feld stand zuletzt `Resend` mit grossem R. Resend
  verlangt `resend`. SMTP vergleicht bytegenau.
- **H2 — Passwort.** Der Benutzername ist in Ordnung, aber der gespeicherte API-Key
  ist ein anderer, ein abgelaufener oder ein beim Einfügen verstümmelter.

**H1 ist seit 2026-08-06 bestätigt, H2 ausgeschlossen.** Wie, steht in Phase 1.

---

## Phase 0 — Zeitstempel setzen (ich)

Vor jeder Änderung die Auth-Logs abrufen und den Zeitstempel des jüngsten `535`
notieren.

Zweck: Danach ist jeder Log-Eintrag entweder älter als diese Marke — dann ist er alt
und beweist nichts — oder jünger, dann gehört er zum Test. Ohne diese Marke ist beim
nächsten Blick in die Logs nicht unterscheidbar, ob der `535` von gerade eben stammt
oder von gestern. Genau das ist beim letzten Anlauf passiert.

Stand 2026-08-06T18:33Z: jüngster Treffer **2026-08-06T18:26:52Z**,
`hess.alex25@gmail.com`, `user_confirmation_requested`, `path: /signup`.

Das ist **nach** der vorherigen Marke (14:18:18Z) und nach der Dashboard-Änderung um
14:08:47Z (`path: /admin/custom-providers`). Der Fehler ist unverändert derselbe.

---

## Phase 1 — Das Entscheidungsexperiment · **ERLEDIGT 2026-08-06, H1 bestätigt**

Die ursprünglich geplanten drei Läufe mit dem echten API-Key waren nicht nötig. Ein
Kontrollexperiment mit einem **absichtlich ungültigen Dummy-Key** hat die Frage
entschieden — ganz ohne echtes Geheimnis.

**Aufbau:** derselbe Dummy-Key gegen `smtp.resend.com:465`, nur der Benutzername
variiert. Wenn der Key konstant falsch ist, kann jeder Unterschied in der Antwort nur
vom Benutzernamen kommen.

```
Benutzername          Antwort nach dem Passwort-Schritt
--------------------  ------------------------------------------
resend                535 Authentication credentials invalid
Resend                535 Invalid username
RESEND                535 Invalid username
"resend " (Space)     535 Invalid username
" resend"             535 Invalid username
"Resend " + U+00A0    535 Invalid username
resend@quickteam.at   535 Invalid username
```

**Zwei Erkenntnisse, beide wichtig:**

1. **Resend beantwortet den Benutzernamen immer mit `334 Password:`** — auch einen
   offensichtlich falschen. Die frühere Notiz „die Ablehnung kommt direkt nach dem
   Benutzernamen, das Passwort geht gar nicht mehr raus" ist damit **widerlegt**. Aus
   dem *Zeitpunkt* der Ablehnung lässt sich nichts schliessen.
2. **Der Text der 535 unterscheidet die beiden Felder trotzdem sauber:**

   | Antwort                                  | Bedeutung                                        |
   | ---------------------------------------- | ------------------------------------------------ |
   | `535 Invalid username`                   | Benutzername ≠ `resend`. Der Key wird gar nicht geprüft. |
   | `535 Authentication credentials invalid` | Benutzername korrekt, **Key** abgelehnt.          |

**Schluss:** In den Supabase-Auth-Logs steht ausnahmslos `535 "Invalid username"` —
in allen neun Treffern, bis hinauf zum jüngsten um 18:26:52Z. Also ist der Wert im
Supabase-Feld **Username** nicht `resend`. **H1 bestätigt, H2 ausgeschlossen.** Über
den gespeicherten API-Key ist damit nichts bekannt und auch nichts zu befürchten — er
wurde bei keinem dieser Versuche überhaupt geprüft.

→ Phase 2a. Phase 2b entfällt vorerst.

Das Testskript zeigt seit dieser Session zusätzlich Länge und Hex-Bytes des
Benutzernamens an, bevor es verbindet. Ein mitkopiertes `U+00A0` oder ein
abschliessendes Leerzeichen ist im Terminal sonst nicht von einem sauberen `resend` zu
unterscheiden — und erzeugt exakt dieselbe Meldung wie das grosse `R`.

---

## Phase 2a — Benutzername korrigieren (User) · **ERLEDIGT, war die Lösung**

Supabase → Project Settings → Authentication → SMTP Settings.

1. Feld **Username** vollständig leeren.
2. `resend` **von Hand tippen**, nicht einfügen. Sechs Zeichen, alles klein. Ein
   mitkopiertes Leerzeichen oder ein Zeilenumbruch ist im Feld nicht zu sehen und
   erzeugt exakt diesen `535`.
3. Feld **Password** neu befüllen. Es ist maskiert und wird beim Speichern
   regelmässig geleert — auch wenn dort Punkte stehen.
4. Speichern.
5. **Seite neu laden und beide Felder erneut ansehen.** Steht wieder der alte Wert da,
   hat Supabase nicht gespeichert — das ist dann ein eigenes Problem und geht an den
   Supabase-Support, nicht in eine weitere Runde Raten.
6. Eine Minute warten. „Minimum interval" steht auf 60 Sekunden; ein Test davor wird
   abgewiesen und sieht aus wie ein neuer Fehler.

→ Phase 3.

**Der Log-Eintrag nach dem nächsten Versuch sagt selbst, ob es gereicht hat:**

- kein 535 → fertig.
- `535 Invalid username` → das Feld ist **immer noch** nicht `resend`. Nicht erneut
  raten: Feldinhalt markieren, kopieren und mit
  `node scripts/smtp-test.mjs re_DEIN_KEY "eingefügt"` durch die Byte-Ansicht schicken.
  Sie zeigt das unsichtbare Zeichen.
- `535 Authentication credentials invalid` → **Fortschritt.** Der Benutzername stimmt
  jetzt, ab hier ist der Key dran → Phase 2b.

---

## Phase 2b — Key erneuern (User) · nur bei `Authentication credentials invalid`

1. Im Resend-Dashboard einen **neuen API-Key** anlegen, mit Sendeberechtigung und
   **ohne Domain-Einschränkung**. Ein auf eine Domain eingeschränkter Key kann bei
   `onboarding@resend.dev` scheitern.
2. Den neuen Key sofort mit `node scripts/smtp-test.mjs re_NEUER_KEY resend` prüfen.
   Erwartet: `235 Authentication successful`. Kommt das nicht, liegt es am
   Resend-Konto und nicht an Supabase.
3. Erst danach den Key in das Supabase-Feld **Password** eintragen, Username auf
   `resend` prüfen, speichern.
4. Neu laden, Werte kontrollieren, eine Minute warten.

→ Phase 3.

---

## Phase 3 — Verifikation · **ERLEDIGT, Mail kam an**

**Auslöser:** `/passwort-vergessen` mit **`hess.alex25@gmail.com`**.

Zwei Gründe für genau diesen Weg:

- Passwort-Reset nutzt denselben SMTP-Versand wie die Registrierung, legt aber keine
  Zeilen in `betriebe` und `mitarbeiter` an. Kein Testmüll in der Datenbank.
- Die Adresse muss die des Resend-Kontoinhabers sein. Warum, steht in Phase 4.

Dev-Server dafür starten: `npm run dev` (und sicherstellen, dass kein `npm run build`
parallel läuft — die teilen sich `.next`).

**Meine Prüfung danach:** Auth-Logs abrufen und auf Einträge **nach der Marke aus
Phase 0** filtern.

- Kein neuer `535`, Eintrag `user_recovery_requested` ohne `error` → SMTP steht.
- Neuer `535` → **den Text lesen, nicht raten.** `Invalid username` heisst: das Feld ist
  weiterhin nicht `resend` (zurück zu Phase 2a, diesmal mit der Byte-Ansicht des
  Skripts). `Authentication credentials invalid` heisst: Benutzername erledigt, jetzt
  ist der Key dran (Phase 2b).

**Abbruchkriterium der Phase:** Die Mail liegt im Posteingang (oder im Spam).

---

## Phase 4 — Der Absender, bevor er zum nächsten Fehler wird

Das kommt als Nächstes, unabhängig vom `535`, und wird beim Testen sonst als neuer
Bug missverstanden:

- **`onboarding@resend.dev` stellt ausschliesslich an die E-Mail-Adresse des
  Resend-Kontoinhabers zu.** Das ist eine Sandbox-Adresse. Ein Test mit
  `leo.solomon@web.de` — wie am 06.08. um 14:17 — wird auch bei perfekter Anmeldung
  nicht zugestellt. Deshalb läuft Phase 3 bewusst über die Kontoinhaber-Adresse.
- **Sender name** steht auf `resend`. Gehört auf `QuickTeam`. Das ist der Name, den
  ein Gastro-Betrieb im Posteingang sieht.
- **Vor dem Livegang** eine eigene Domain in Resend verifizieren (DNS-Records für SPF
  und DKIM setzen) und den Absender auf etwas wie `noreply@quickteam.at` umstellen.
  Erst danach sind Mails an beliebige Empfänger möglich. Das ist kein Nebenpunkt,
  sondern die Voraussetzung dafür, dass sich überhaupt jemand ausser dir registrieren
  kann.

Solange die Domain nicht verifiziert ist, wird ausschliesslich mit
`hess.alex25@gmail.com` und `+suffix`-Varianten davon getestet.

---

## Phase 5 — Gesamtdurchlauf (gemeinsam)

Erst wenn die Mail nachweislich ankommt:

1. Registrierung auf `/registrieren` mit `hess.alex25+testN@gmail.com`.
2. Weiterleitung auf `/auth/bestaetigen` prüfen, samt 24-Stunden-Hinweis.
3. Link in der Mail klicken → `/auth/callback`.
4. Prüfen, dass genau **ein** Betrieb angelegt wurde. Dann den Link **ein zweites Mal**
   klicken. Es darf kein zweiter Betrieb entstehen — das ist der `ist_chef`-Zweig, der
   bisher noch nie ausgelöst wurde. Dieser Test ist der eigentliche Zweck von Phase 5.
5. Weiterleitung auf `NEXT_PUBLIC_APP_URL` (`http://localhost:3001`). Dort läuft
   nichts — „Website nicht erreichbar" ist an dieser Stelle das **erwartete** Ergebnis
   und kein Fehler. Die Planungs-App baut ein anderer Entwickler.

---

## Phase 6 — Ausweichweg, nur nach ausdrücklicher Freigabe

Falls Phase 1 bis 3 nachweislich ausgeschöpft sind und der `535` bleibt: Supabase Auth
Hook „Send Email" auf eine Edge Function, die die Resend-**API** statt SMTP nutzt.

Das ist Konfiguration und kein Schema-Eingriff, aber es verlässt den Rahmen dieses
Repos: eine Edge Function ist Server-Code ausserhalb der Marketing-Website, und der
Mail-Versand wandert damit aus dem Dashboard in versionierten Code. Zwischenlösung für
die Weiterarbeit wäre stattdessen, Custom SMTP vorübergehend abzuschalten — der
eingebaute Supabase-Versand ist stark rate-limitiert und stellt nur an
Projektmitglieder zu, reicht aber, um die Landing Page nicht zu blockieren.

Beides erst nach Rückfrage.

---

## Fertig ist es, wenn

- Die Auth-Logs nach der Phase-0-Marke (`2026-08-06T18:26:52Z`) keinen `535` mehr
  enthalten.
- Eine Registrierungsmail tatsächlich im Posteingang liegt.
- Der Bestätigungslink zweimal geklickt genau einen Betrieb erzeugt.
- ~~Notiert ist, welche der beiden Hypothesen zutraf~~ → **erledigt: H1
  (Benutzername), belegt durch das Kontrollexperiment in Phase 1.**

Danach ist die Landing Page dran (`docs/uebergabe.md`, Abschnitt 3).

---

## Regeln, die auch hier gelten

- **Rohmeldung vor Fix.** Erst die unveränderte Fehlermeldung aus Logs oder Terminal
  zeigen, dann die Ursache benennen, dann ändern. Keine Änderung „auf Verdacht", und
  kein „läuft jetzt" ohne Log-Beleg.
- **Konfiguration vs. Code trennen.** Bei jedem Befund sagen, wer dran ist: Dashboard
  (User) oder Repo (ich).
- **Das Schema bleibt unangetastet.** Keine Migration, kein DDL, keine Policy. Fällt
  etwas auf: melden, nicht beheben.
- **Kein `service_role`-Key**, nirgends — auch nicht, um den Mailversand zu testen.
- **Kein API-Key in einer Datei im Repo.** Die Testläufe geben ihn als Argument mit;
  danach die Shell-History leeren.
