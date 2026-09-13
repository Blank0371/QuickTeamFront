# Entscheidung: die öffentliche Registrierung bleibt offen

**2026-09-11, Betreiber.** Betrifft Punkt 10 aus Abschnitt A des
Codex-Audits. Ersetzt die Regel vom 2026-09-09.

## Die Entscheidung

`disable_signup` bleibt **`false`**. Die öffentliche Registrierung unter
`/registrieren` ist absichtlich dauerhaft offen. **Im Supabase-Dashboard ist
nichts zu ändern** — der gemessene Zustand ist bereits der gewünschte.

Die bisherige Pflicht, Testkonten ausschliesslich über
`auth.admin.createUser()` anzulegen, entfällt damit. Beide Wege sind erlaubt;
der Service-Role-Weg bleibt der bequemere, weil er Mail und OTP-Code
überspringt.

## Warum

**Ein Auth-Konto für sich ist wertlos.** Es trägt keine Anstellung, keinen
Betrieb und keine Rolle. Für ein frisches Konto liefert `meine_betriebe()`
nichts, `ist_chef()` ist überall falsch, und keine Schreib-Policy eines
bestehenden Betriebs greift. Wer sich registriert, kann genau eines: einen
eigenen, leeren Betrieb anlegen — und das hat auf die Daten fremder Betriebe
keine Wirkung.

**Die Zugriffskontrolle liegt bewusst bei Vertragsannahme und Zahlung, nicht
bei der Kontoerstellung.** Das ist der Kern. Drei Tore stehen *hinter* der
Registrierung, und sie sind die, auf die es ankommt:

| Tor | Wo | Was es verhindert |
| --- | --- | --- |
| RLS auf allen Tabellen | Datenbank | Zugriff auf fremde Betriebe — unabhängig davon, wie das Konto entstand |
| Zustimmungstor | `pruefeZustimmung()` in `src/lib/dashboard/zugang.ts` | Arbeit im Dashboard ohne Annahme von AGB, AVV und Datenschutzerklärung |
| Abo-Sperre | `pruefeSperre()`, Stripe-Status `pausiert` | Verwaltung nach abgelaufener Testphase ohne Zahlungsmittel |

**`disable_signup` war eine zweite Verriegelung an derselben Tür wie
`SOFT_LAUNCH`** — und die schlechtere von beiden. `SOFT_LAUNCH` macht
`/registrieren`, `/login` und den Zahlungsweg **als Routen** unerreichbar und
entfernt zugleich jeden sichtbaren Weg dorthin (Header, Footer, Hero,
Preisseite, JSON-LD). Es ist damit sowohl wirksamer als auch ehrlicher: es
verspricht nichts, was es nicht hält. `disable_signup` hingegen liess das
Formular stehen und die Absendung scheitern.

**Der Preis der alten Regel war real.** Jeder Testzugang wurde zum Sonderfall:
ein Skript, das die Service-Role braucht, ein zusätzlicher Guard gegen die
geteilte Instanz, und ein Weg, der den Zustimmungspfad **nicht** durchläuft —
`betriebNachtragen()` schreibt für ein admin-erzeugtes Konto bewusst keine
`rechtliche_zustimmungen`-Zeile. Ausgerechnet der Pfad, der rechtlich am
genauesten geprüft werden muss, war über den vorgeschriebenen Weg nicht
testbar.

## Was das für Abschnitt B bedeutet

**Mit dieser Entscheidung wird Abschnitt B (Punkte 11–14) die eigentliche
Sicherheitsgrenze des Produkts.** Das ist die unmittelbare Folge, nicht eine
Randbemerkung: wenn die Kontoanlage offen ist, entscheidet sich alles daran,
*was ein Konto darf* — und der erste Ort, an dem es etwas Verbindliches darf,
ist die Vertragsannahme.

Der bereits offene Befund **11** wird damit dringlicher, nicht weniger
dringlich:

> *„Gewöhnliche Mitarbeiter können aktuell Einträge erzeugen, die als
> Zustimmung des Betriebs zählen. Erledigt, wenn: Betriebliche
> Vertragsannahme und persönliche Kenntnisnahme getrennt gespeichert und
> ausgewertet werden."*

Heute prüft `pruefeZustimmung()` **den Betrieb, nicht die Person** — es fragt,
ob für den Betrieb eine Zeile in der aktuellen Fassung existiert, und
`zustimmung_insert_selbst` erlaubt jedem Mitglied mit eigener `auth_id`, eine
solche Zeile zu schreiben. Die Unterscheidung „hat der vertretungsberechtigte
Inhaber den Vertrag geschlossen" gegen „hat eine angestellte Person die
Datenschutzhinweise gelesen" existiert im Datenmodell nicht. Genau diese
Trennung ist die Grenze, die jetzt allein trägt.

Punkte **12** (Datenbankfehler darf nicht als Zustimmung gelten) und **13**
(Speicherfehler werden heute ignoriert, die Einrichtung läuft weiter — die in
`CLAUDE.md` bereits als „bekannte Lücke" benannte Stelle) hängen daran: eine
Grenze, die im Fehlerfall stillschweigend durchlässt, ist keine. Punkt **14**
(Unterzeichner, Betrieb, Zeitpunkt, Sprache, exakte Fassung nachweisbar) ist
der Nachweis, dass sie gehalten hat.

## Folgen für die Dokumentation

- **`CLAUDE.md`**: der Abschnitt „Testkonten entstehen über die Service-Role,
  nicht über `/registrieren`" ist durch einen datierten
  Änderungsabschnitt ersetzt. Es bleibt keine Anweisung stehen, die
  `disable_signup` auf `true` verlangt.
- **`SOFT_LAUNCH` ist unberührt** und bleibt in Produktion auf `an`. Die
  Bedingung für sein Fallen ist unverändert: finale, anwaltlich geprüfte
  Rechtstexte.
- **`docs/audit-a/befunde-2026-09-11.md`**, Punkt 10, trägt weiterhin die
  Messung (`disable_signup: false`, direkt aus `GET /auth/v1/settings`) — jetzt
  als bestätigter Sollzustand statt als Befund.

## Was dadurch *nicht* erledigt ist

Die übrigen Restpunkte aus Punkt 10 bleiben offen und sind von dieser
Entscheidung unabhängig:

- **Mailkontingent pro Stunde** — nicht gemessen, weil ein Messlauf genau das
  Kontingent verbraucht, das echte Registrierungen brauchen. Im Dashboard
  nachzusehen. Mit offener Registrierung wird es der begrenzende Faktor gegen
  massenhafte Kontoanlage, denn `mailer_autoconfirm` ist `false`: ohne
  zustellbare Adresse entsteht kein bestätigtes Konto.
- **`cleanup_unconfirmed_users()`** räumt unbestätigte `auth.users` nach 24
  Stunden ab. Das ist die Gegenmassnahme gegen Karteileichen aus offener
  Registrierung und war schon vorher da — jetzt trägt sie mehr Last als zuvor.
- **`plan-generieren` ohne Sperrzeit** — der teuerste Aufruf im Produkt, ohne
  jede Begrenzung. Kostenfrage, keine Zugriffsfrage.
- **MFA** auf den Admin-Zugängen zu Supabase, Vercel und Stripe.
- **Testpasswort `Test1234!`** auf fünf Konten. Vor Launch ersetzen.
