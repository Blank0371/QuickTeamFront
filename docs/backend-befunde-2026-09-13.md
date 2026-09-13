# Backend-Befunde 2026-09-13: was bei der Überarbeitung der Datenschutzerklärung aufgefallen ist

**An den App-Entwickler. Gemeldet, nicht repariert.** Von diesem Repo aus wurde
weder am Schema noch an der App etwas geändert.

Anlass: Die Datenschutzerklärung (`docs/rechtliches/legals/`, Stand 13.09.2026)
wurde vollständig neu geschrieben und dabei Satz für Satz gegen die Live-DB
(`jqpfuotwsgnqihspsmmf`), die Edge Functions und den App-Quelltext
(`QuickTeamMobile`, Stand `5079dca`) geprüft. Wo das System etwas anderes tut,
als die alte Erklärung behauptete, beschreibt die neue Fassung jetzt das
tatsächliche Verhalten. Mehrere dieser Stellen sollten aber im System behoben
werden, statt dauerhaft in einer Datenschutzerklärung eingeräumt zu werden.
Deshalb stehen sie hier.

Reihenfolge nach Dringlichkeit.

---

## 1. Notfallgrund ist für alle Betriebsmitglieder lesbar, und die App schlägt „Ich bin krank.“ vor

- Die Policy `notfaelle_select` lautet `betrieb_id IN (SELECT meine_betriebe())`.
  Jedes aktive Mitglied kann damit **jede** Notfallmeldung des Betriebs lesen,
  einschliesslich `grund` und `melder_id`. Die Oberfläche zeigt das
  womöglich nicht an, aber die API gibt es heraus.
- `src/i18n/locales/de.json:447` setzt als Platzhalter für dieses Feld
  `"reasonPlaceholder": "Ich bin krank."`.

Zusammen heisst das: Die App fordert zu einer Gesundheitsangabe auf (Art. 9
DSGVO), und die Datenbank macht sie dem ganzen Team zugänglich. Die neue
Datenschutzerklärung (Ziffer 8) sagt das offen, das ist aber nur eine
Notlösung.

**Vorschlag:** `grund` nur für Führungskräfte und die meldende Person lesbar
machen (eigene RPC oder Spalte aus der Policy herausnehmen), und den
Platzhalter in allen Sprachen durch etwas Neutrales ersetzen (etwa „Kurz, ohne
Gesundheitsangaben“). Danach kann der entsprechende Satz in Ziffer 7.4/8
entfallen.

## 2. Push-Token bleibt nach dem Abmelden bestehen

`signOut()` in `src/context/auth.tsx:231` ruft nur `supabase.auth.signOut()`.
`push_token_loeschen()` existiert, wird aber nirgends aufgerufen. Folge: Ein
abgemeldetes Gerät erhält weiter Push-Nachrichten für das Konto, und zwar samt
**vollständigem Titel und Text von Ankündigungen** (`push-versenden` übernimmt
`titel`/`text` ungekürzt).

**Vorschlag:** vor `signOut()` den eigenen Token mit `push_token_loeschen`
entfernen. Die Datenschutzerklärung (Ziffer 10) räumt das derzeit ein; nach
der Behebung kann der Satz raus.

## 3. Ungültige Push-Token werden nie aufgeräumt

`push-versenden` wertet die Antwort von Expo nicht aus. Token, die Expo als
`DeviceNotRegistered` meldet, bleiben für immer in `push_tokens`. Die alte
Erklärung behauptete das Gegenteil („werden gelöscht, wenn das Gerät den Token
ungültig meldet“); die neue behauptet es nicht mehr.

**Vorschlag:** Tickets bzw. Receipts auswerten und `DeviceNotRegistered`-Token
löschen.

## 4. Offline-Zwischenspeicher überlebt das Abmelden

`src/lib/cache.ts` legt Daten unter dem Präfix `cache:` in AsyncStorage ab. Beim
Abmelden wird nur die Sitzung entfernt, nicht dieser Cache. Die alte Erklärung
sagte, er werde beim Abmelden gelöscht; die neue sagt „bis zur Deinstallation“.

**Vorschlag:** beim Abmelden alle Schlüssel mit `cache:` entfernen. Das ist auch
bei geteilten Geräten sinnvoll.

## 5. Keine automatische Löschung von Betrieben

Weder nach Vertragsende noch bei einer pausierten Testphase löscht irgendetwas
die Daten eines Betriebs; `cron.job` enthält nur `cleanup-unconfirmed-users`.
Die neue Erklärung (Ziffer 15.3) **verspricht** auf Entscheidung der
Betreiberin:

- Löschung **30 Tage nach Vertragsende** (entspricht AGB § 6 Abs. 4),
- Löschung **90 Tage nach Pausierung**, wenn die Testphase ohne Zahlungsmittel
  abgelaufen ist und nicht fortgesetzt wurde.

Bis es einen Job gibt, muss das von Hand geschehen. Hinweis zur Umsetzung:
Die FK-Regeln sind uneinheitlich. Mehrere Tabellen hängen **ohne**
`ON DELETE CASCADE` an `betriebe` (`benachrichtigung_gelesen`, `aufgaben`,
`umfrage_optionen`, `umfrage_stimmen`, `nachricht_anhaenge`), die meisten FKs
auf `mitarbeiter` sind `NO ACTION`, und `mitarbeiter_rollen → rollen` ist
`RESTRICT`, wird also sofort geprüft. Ob ein einzelnes
`DELETE FROM betriebe` durchläuft, ist deshalb nicht sicher. Die
Löschreihenfolge sollte an einem Wegwerfbetrieb in der Sandbox ausprobiert
werden, bevor sie in einen Job kommt.

## 6. Zustimmungsnachweise verschwinden mit dem Betrieb

`rechtliche_zustimmungen.betrieb_id` ist `ON DELETE CASCADE`. Mit der Löschung
nach Ziffer 5 geht also auch der Nachweis verloren, dass AGB und AVV angenommen
wurden. Rechtlich wäre es oft sinnvoll, ihn bis zum Ende der Verjährungsfrist
aufzubewahren. Die Erklärung beschreibt das heutige Verhalten; ob sich das
ändern soll, ist eine Frage an Betreiberin und Anwalt, keine technische.

## 7. Tabellen ohne Aufbewahrungsregel

- `konto_merge_token`: benutzte und abgelaufene Token bleiben samt
  `quell_auth_id` / `ziel_auth_id` für immer stehen. Gültig sind sie nur 15
  Minuten; danach haben die Zeilen keinen Zweck mehr.
- `bug_reports`: Die Erklärung verspricht Löschung nach Bearbeitung,
  spätestens nach 12 Monaten. Bisher löscht nichts.
- `plan_aenderungen`: wächst unbegrenzt (derzeit rund 7.600 Zeilen seit dem
  11.08.) und wird nur mit dem Betrieb gelöscht. Das ist so beschrieben und
  vertretbar; eine Frist nach Weisung des Arbeitgebers wäre sauberer.

## 8. Sitzungen laufen nie ab

`auth.sessions` speichert IP-Adresse und User-Agent; `not_after` ist bei keiner
Sitzung gesetzt. Wer sich nie abmeldet, hinterlässt diese Daten dauerhaft.
Supabase bietet auf dem Pro-Plan unter Authentication → Sessions eine
Inaktivitäts- und Höchstdauer an. Ein Wert (z. B. 90 Tage Inaktivität) würde
Ziffer 7.1 der Erklärung eine feste Frist geben.

## 9. Die App liefert eine eigene, jetzt veraltete Datenschutzerklärung aus

`src/lib/legalDocs.ts` (Stand 12.09.2026) weicht von der neuen Fassung ab: kein
Vercel, kein Resend, kein WEB.DE, keine konkreten Löschfristen, und die falschen
Aussagen zu Push-Token und Cache aus den Punkten 2 bis 4. Am einfachsten wäre
es, den Text aus `docs/rechtliches/legals/` zu übernehmen und die Fassung auf
`2026-09-13` zu setzen.

Außerdem bietet die App eine Anmeldung per Telefonnummer an, obwohl laut
Betreiberin **kein SMS-Anbieter eingerichtet** ist. Die Erklärung erwähnt die
SMS-Anmeldung deshalb nicht. Bitte entweder die Oberfläche ausblenden oder vor
dem Einschalten Bescheid geben, damit der Anbieter in die Erklärung kommt.

## 10. Zur Kenntnis: `pruefe_letzter_chef` hängt inzwischen

`CLAUDE.md` (Abschnitt vom 2026-08-26) sagt, die Funktion sei an keine Tabelle
angehängt. Am 2026-09-13 in `pg_trigger` gefunden: `trg_letzter_chef`, BEFORE
DELETE OR UPDATE auf `mitarbeiter`. Der Schutz besteht also. Das ist keine
Aufgabe, sondern eine Korrektur des Kenntnisstands.
