# Handover an den App-Entwickler — drei Stellen in der Expo-App

**Stand: 2026-09-11.** Eigenständige Datei, absichtlich kurz. Die vollständigen
Befunde stehen in `docs/audit-a/befunde-2026-09-11.md`, die technischen Details
der Migration in `docs/backend-befunde-2026-09-11.md`.

## Worum es geht

Abschnitt A des Codex-Sicherheitsaudits ist am 2026-09-11 auf der geteilten
Supabase-Instanz `jqpfuotwsgnqihspsmmf` **angewendet** worden — mit
ausdrücklicher Freigabe der Betreiberin, als benannte Ausnahme von der Regel
„das Schema wird vom Web-Repo aus nicht verändert".

Sieben Punkte sind behoben und gegengeprüft. **Drei davon ändern Verhalten, auf
das die App heute baut.** Die Änderungen sind live; die App ist gegen dieselbe
Datenbank noch nicht nachgezogen.

## Keine Eile — aber vor dem nächsten echten Testlauf

**Produktiv ist niemand betroffen.** Die App ist nicht im App Store, es gibt
keine Installation ausserhalb der Entwicklung. Es brennt also nichts.

**Wohl aber vor dem nächsten Testlauf mit der App gegen diese Datenbank.** Zwei
der drei Stellen führen dort zu falschen Zahlen bzw. zu Fehlern, die wie ein
App-Bug aussehen, obwohl sie die neue, gewollte Regel sind. Wer das nicht weiss,
sucht an der falschen Stelle.

---

## 1. `messages.tsx:313` — Umfrage-Zählung bei anonymen Umfragen

**Was sich geändert hat.** Die Policy `us_select` auf `umfrage_stimmen` gibt bei
einer **anonymen** Umfrage nur noch die **eigene** Stimme heraus. Vorher konnte
jedes Betriebsmitglied jede Einzelstimme samt `mitarbeiter_id` lesen.

**Warum** (Befund A1). Die Anonymität war nur Anzeigelogik. Beide Clients laden
die Rohzeilen und entscheiden erst beim Rendern, ob sie Namen auflösen — die
Zuordnung „wer hat was gewählt" stand trotzdem in der Netzwerkantwort und war
über einen direkten API-Aufruf ohne Weiteres abrufbar. Bei einer Umfrage, die
Anonymität *zusagt*, ist das der Fehler, nicht die Anzeige.

**Auswirkung ohne Anpassung:** anonyme Umfragen zeigen in der App als Ergebnis
höchstens `1` — nämlich die eigene Stimme. Kein Fehler, nur eine falsche Zahl,
und das ist die unangenehmere Sorte.

**Anpassung:** für anonyme Umfragen die neue RPC benutzen.

```ts
const { data } = await supabase.rpc("umfrage_ergebnis", {
  p_benachrichtigung_id: id,
});
// -> [{ option_id: string, anzahl: number }, ...]
```

`SECURITY DEFINER`, `EXECUTE` nur für `authenticated`, filtert selbst auf
`meine_betriebe()`. Gegengeprüft: korrekte Gesamtzahl im eigenen Betrieb,
leeres Ergebnis für einen fremden.

**Nicht-anonyme Umfragen sind unverändert** — dort bleiben Rohzeilen samt Namen
sichtbar und die bisherige clientseitige Zählung stimmt weiter. Die Umstellung
betrifft nur den Zweig `anonym === true`.

Das Web-Dashboard hatte dasselbe Problem und ist am 2026-09-11 mitgezogen
(`src/lib/dashboard/mitteilungen.ts`) — im Browser gegengeprüft: anonyme
Umfrage zeigt die richtige Gesamtzahl, ohne einen einzigen Wählernamen.

---

## 2. `scheduling.tsx`, Tab „Vacation" — eigenen Urlaubsantrag zurückziehen

**Was sich geändert hat.** Zwei Policies auf `urlaub` sind **entfallen**:
`urlaub_insert_selbst` und `urlaub_delete_selbst_or_chef`. Neu ist allein
`urlaub_delete_chef`.

Konkret:

- **Mitarbeiter können eigene Anträge nicht mehr löschen oder stornieren** —
  weder offen noch genehmigt noch vergangen. Alle drei Fälle sind einzeln
  gegengeprüft.
- **Anträge einreichen geht nur noch über `urlaub_beantragen()`.** Ein direkter
  `insert` auf `urlaub` wird abgewiesen.

**Warum** (Befund A5). `urlaub_beantragen()` prüft Datum, kollidierende
Schichten, veröffentlichte Planungszyklen und das Jahreskontingent. Die
INSERT-Policy verlangte davon **nichts** ausser `status = 'requested'` — ein
direkter Tabellenzugriff umging also alle vier Prüfungen. Gegengeprüft: 400
Urlaubstage auf einmal liessen sich vorher per direktem INSERT anlegen.

Die Löschsperre ist eine **ausdrückliche Entscheidung der Betreiberin** vom
2026-09-11, keine technische Ableitung: nur die Betriebsleitung storniert.

**Auswirkung ohne Anpassung:** jeder Knopf, der einen eigenen Antrag
zurückzieht, läuft in einen RLS-Fehler oder trifft null Zeilen. Falls die App
irgendwo direkt in `urlaub` einfügt, schlägt das ebenfalls fehl.

**Anpassung:** die Rückzieh-Aktion entfernen oder auf eine Anfrage an den Chef
umstellen; Einreichen auf `urlaub_beantragen()` umstellen, falls noch nicht.

**Wichtig für die Umsetzung:** `urlaub.status` erlaubt nur
`requested | approved | denied`. **Einen Zustand „storniert" gibt es im Schema
nicht.** Die Betriebsleitung lehnt mit `denied` ab oder löscht die Zeile. Soll
„storniert" von „abgelehnt" unterscheidbar werden, ist das eine Schema- und
Produktentscheidung — nicht Teil dieser Nacharbeit.

---

## 3. `manager.tsx` — Chef-Aktionen auf Mitarbeiterzeilen

**Was sich geändert hat.** `pruefe_letzter_chef()` hängt jetzt als
`trg_letzter_chef` BEFORE UPDATE OR DELETE an `mitarbeiter`.

**Warum** (Befund A6). Die Funktion existierte längst und war inhaltlich
korrekt — sie hing nur an **keiner Tabelle** und lief deshalb nie.
`DOCUMENTATION.md` führt sie unter den Triggern, die Integrität erzwingen; das
stimmte bis zu diesem Datum nicht. Gegengeprüft, wie ernst das war: ein Chef
konnte sich selbst zum Mitarbeiter degradieren, der Betrieb hatte danach null
aktive Chefs, `meine_betriebe()` lieferte nichts, `ist_chef()` war überall
falsch — der Betrieb war für alle verschlossen und nur per Hand in der Datenbank
zu retten. Zwei Betriebe in der Instanz sind heute schon in diesem Zustand.

**Auswirkung ohne Anpassung:** Degradierung, Deaktivierung, Anonymisierung und
Löschung des **letzten aktiven Chefs** schlagen jetzt fehl mit

```
Der letzte aktive Chef eines Betriebs kann nicht degradiert,
deaktiviert oder anonymisiert werden
```

Alles andere ist unverändert — einen gewöhnlichen Mitarbeiter zu deaktivieren
geht weiter (gegengeprüft), und bei zwei aktiven Chefs ist einer entbehrlich.

**Anpassung:** keine funktionale, nur die Meldung sauber anzeigen statt
verschlucken. Wenn `manager.tsx` diese Aktionen anbietet, sollte der Text beim
Nutzer ankommen.

Zwei Ergänzungen gegenüber deiner Fassung, damit du sie beim Lesen wiederfindest:

- `anonymisiert_am is not null` zählt als Verlust — sonst wäre
  `mitarbeiter_anonymisieren()` der Weg daran vorbei gewesen.
- Beim Löschen eines **Betriebs** kaskadiert `mitarbeiter_betrieb_fkey` auf
  `mitarbeiter`. Ohne Ausnahme hätte der Trigger die gewollte
  Betriebsschliessung blockiert; erkannt daran, dass die `betriebe`-Zeile
  während der Kaskade schon weg ist.

**Bekannte Folge, noch offen:** `konto_selbst_loeschen()` eines Chefs, der
allein einen Betrieb führt, scheitert jetzt. Inhaltlich richtig — der Betrieb
darf nicht führungslos zurückbleiben —, heisst aber, dass Kontolöschung und
Betriebsschliessung getrennte Wege brauchen. Das ist Audit-Punkt 19 und kommt
in einer späteren Runde.

---

## 4. Falls `einladung-einloesen` doch reaktiviert werden soll

Die Edge Function ist **deployed und `ACTIVE`**, hat aber **keinen Aufrufer** in
App oder Website, und ihr **Quellcode liegt in keinem der beiden Repos**.
Gesucht am 2026-09-11: `einloesen` kommt im App-Repo überhaupt nicht vor, das
einzige `functions.invoke` in beiden Projekten ist `plan-generieren`. Beide
Clients gehen über `meine_einladungen()` → `einladung_annehmen()`.

**Empfehlung: löschen.** Sie tut nichts, nichts hängt von ihr ab, und sie mintet
eine Sitzung allein gegen einen Hash. Die Alternative ist „behalten mit
Zieldatum und bis dahin deaktiviert" — aber nur, wenn es eine konkrete geplante
Funktion gibt (Einladung per Link ohne vorhandenes Konto). Ausführlich in
`docs/backend-befunde-2026-09-11.md`, Abschnitt 2.

**Falls sie bleibt, hat sie zwei echte Fehler**, die vorher weg müssen. Heutiger
Ablauf: Einladung lesen und prüfen → Session minten und **zurückgeben** → *erst
danach* `eingeloest_am` setzen.

1. Der Guard am Ende (`.is("eingeloest_am", null)`) ist wirkungslos: geprüft
   wird nur `updErr`, nicht ob eine Zeile getroffen wurde. Zwei gleichzeitige
   Aufrufe liefern **beide** ein gültiges Token-Paar.
2. Die Reihenfolge ist falsch. Die Sitzung entsteht, bevor die Einladung
   verbraucht ist.

**Erst verbrauchen, dann minten** — die Rückgabe des UPDATE *ist* die
Berechtigung, und Ablauf plus Einmaligkeit gehören in dieselbe `WHERE`-Klausel
(getrennt geprüft sind sie wieder ein Zeitfenster):

```ts
const { data: verbraucht } = await admin
  .from("einladungen")
  .update({ eingeloest_am: new Date().toISOString() })
  .eq("hash", hash)
  .is("eingeloest_am", null)
  .gt("ablaufdatum", new Date().toISOString())
  .select("betrieb_id, mitarbeiter_id")
  .maybeSingle();

if (!verbraucht) {
  return json({ error: "Einladung ungültig, abgelaufen oder bereits eingelöst" }, 409);
}
// ab hier — und nur hier — Session minten
```

Kommt das Minten danach nicht durch, ist die Einladung verbraucht. Das ist für
einen Einmal-Token die richtige Richtung: lieber eine verbrauchte Einladung neu
ausstellen als eine, die zweimal gilt.

**Ausserdem:** `mitarbeiter.auth_id` sollte die Funktion nicht selbst schreiben,
sondern `einladung_annehmen(p_mitarbeiter_id)` aufrufen. Die RPC ist seit dem
2026-09-11 auf atomaren Verbrauch umgestellt (`UPDATE … WHERE auth_id IS NULL
RETURNING`) und damit die einzige Stelle, an der eine Anstellung mit einem Konto
verknüpft wird. Zwei Wege auf dieselbe Spalte sind zwei Gelegenheiten, sich zu
widersprechen.

---

## 5. `plan-generieren` braucht eine Sperrzeit — und sie kann nur dort hinein

**Befund vom 2026-09-11** (Audit-Punkt 10, letzter offener Teil). Der Solver ist
der teuerste Aufruf im ganzen Produkt und hat **keine Begrenzung** — nicht im
Web, nicht in der App, nicht in der Datenbank. Ein angemeldeter Chef kann ihn
beliebig oft hintereinander anstossen. Supabase Edge Functions bringen von sich
aus kein Limit pro Nutzer mit, und die Auth-Rate-Limits greifen hier nicht: sie
sitzen auf `/auth/v1/*`, nicht auf `/functions/v1/*`.

**Warum das nicht im Web-Repo lösbar ist.** Beide Clients rufen die Function
**direkt aus dem Browser bzw. der App** auf, mit dem eigenen `access_token` —
im Web aus `solver-lauf.tsx`, in der App aus `manager.tsx:1528`. Der Grund ist
gut: die Function ist synchron und würde die Laufzeitgrenze einer Server Action
sprengen. Die Folge ist aber, dass der Aufrufer das Token selbst in der Hand
hält. Jede Sperre im Client — Cooldown-Knopf, Bestätigungsdialog, was auch
immer — ist damit **UX und keine Kontrolle**: ein `curl` mit demselben Token
geht daran vorbei. Dieselbe Logik wie bei der Zod-Validierung in diesem
Projekt: clientseitig ist Bequemlichkeit, serverseitig ist Verteidigung.

**Wirksam ist es nur an einer von zwei Stellen**, und beide liegen bei dir:

1. **In `plan-generieren` selbst** — die naheliegende. Die Function kennt
   `planungszyklen` und schreibt dort schon `solver_gestartet_am` und
   `solver_beendet_am`. Ein Ablehnen am Anfang genügt:

   ```ts
   // Sperrzeit: ein Lauf pro Zyklus alle N Minuten.
   // solver_beendet_am steht schon in der Tabelle — keine neue Spalte nötig.
   const { data: z } = await admin
     .from("planungszyklen")
     .select("status, solver_gestartet_am, solver_beendet_am")
     .eq("id", planungszyklus_id)
     .single();

   if (z?.status === "solver_laeuft") {
     return json({ error: "Läuft bereits" }, 409);
   }
   if (z?.solver_beendet_am &&
       Date.now() - new Date(z.solver_beendet_am).getTime() < SPERRE_MS) {
     return json({ error: "Zu früh — bitte kurz warten", retry_after_s: … }, 429);
   }
   ```

   Der `solver_laeuft`-Teil ist dabei nicht nur Drosselung, sondern schliesst
   auch eine echte Lücke: heute verhindert **nichts** zwei gleichzeitige Läufe
   auf demselben Zyklus. Die Oberfläche versteckt den Knopf, aber der Endpunkt
   nimmt den zweiten Aufruf an.

2. **Per Trigger auf `planungszyklen`** — nur falls (1) nicht geht. Die
   Function schreibt mit `service_role` und umgeht damit RLS, aber **nicht**
   Trigger. Ein `BEFORE UPDATE`, der den Wechsel auf `solver_laeuft` ablehnt,
   wenn `solver_beendet_am` zu kurz zurückliegt, würde also greifen. Das wäre
   allerdings DDL am geteilten Schema und bräuchte eigene Freigabe — Variante
   (1) ist sauberer.

**Die Parameter sind am 2026-09-11 von der Betreiberin entschieden** — damit
ist das keine offene Frage mehr, sondern eine Spezifikation:

1. **Harte Wartezeit: 30 Sekunden pro Betrieb.** Nicht pro Zyklus — gerechnet
   ab dem letzten Lauf **desselben Betriebs**, über alle seine Zyklen hinweg.
   Bei Verstoss eine klare Fehlermeldung (kein stilles Durchlassen, keine
   stille Ablehnung).
2. **Gleichzeitige Läufe auf demselben Zyklus werden abgelehnt**, nicht
   parallel ausgeführt.

Für (1) genügt ein Blick über die Zyklen des Betriebs, zum Beispiel
`max(solver_beendet_am)` bzw. `max(solver_gestartet_am)` für
`betrieb_id = …`. Für (2) ist ein Lesen-dann-Schreiben zu wenig — zwei
gleichzeitige Aufrufe lesen beide „läuft nicht". Der Anspruch muss atomar
sein, dieselbe Form wie bei `einladung_annehmen()`:

```ts
const { data: beansprucht } = await admin
  .from("planungszyklen")
  .update({ status: "solver_laeuft", solver_gestartet_am: new Date().toISOString() })
  .eq("id", planungszyklus_id)
  .neq("status", "solver_laeuft")      // <- der Anspruch selbst
  .select("id")
  .maybeSingle();

if (!beansprucht) return json({ error: "Für diesen Zeitraum läuft schon eine Planung" }, 409);
// ab hier — und nur hier — rechnen
```

Wer die Zeile von „nicht laufend" auf `solver_laeuft` dreht, hat gewonnen; der
zweite Aufruf trifft null Zeilen und wird abgelehnt. Wichtig dabei: schlägt der
Solver danach fehl, muss der Status zurückgesetzt werden, sonst bleibt der
Zyklus gesperrt — die Function tut das heute schon (`solver_fehler` plus
vorheriger Status), das darf nicht verloren gehen.

**Im Web-Repo ist dazu am 2026-09-11 eine Klicksperre gebaut worden**
(`solver-lauf.tsx`, `KLICKSPERRE_MS = 5000`): nach einem Klick bleibt der Knopf
fünf Sekunden deaktiviert, mit sichtbarer Begründung. Sie ist **ausdrücklich
als Komfortmassnahme gekennzeichnet**, im Code wie hier: sie verhindert den
versehentlichen Doppelklick und sonst nichts. Ein `curl` mit demselben Token
geht daran vorbei, und für die App gilt sie gar nicht. Sie ersetzt die beiden
Sicherungen oben nicht — sie überbrückt die Zeit, bis es sie gibt.

## Was dich *nicht* betrifft

Damit die Liste nicht länger wirkt, als sie ist — diese Änderungen sollten für
die App unsichtbar bleiben:

| Punkt | Änderung | Warum unkritisch |
| --- | --- | --- |
| A2 | `schuetze_mitarbeiter_spalten()` prüft per Allowlist statt Verbotsliste | Der reguläre Weg (nur `telefon` selbst ändern, alles andere durch Chef oder RPC) ist unverändert |
| A3 | `schicht_notizen` mit zusammengesetzten FKs auf Betrieb + Schicht und Betrieb + Autor | Betrifft nur betriebsübergreifende Kombinationen, die es legitim nie gab |
| A4 | `umfrage_optionen` und `nachricht_anhaenge` zusammengesetzt an `benachrichtigungen(betrieb_id, id)` | dito. `schicht_zuweisungen`, `mitarbeiter_rollen`, `urlaub`, `einladungen` waren schon sauber und sind unangetastet |
| A7 | `einladung_annehmen()` verbraucht atomar | Für denselben Nutzer weiterhin idempotent — gegengeprüft |
| A8 | `EXECUTE` entzogen auf `urlaub_benachrichtigen()` und `rls_auto_enable()` | Beides Triggerfunktionen, für einen Direktaufruf nie gedacht |

**Nicht angefasst:** Testbetrieb 12, `plan-generieren`, `push-versenden`, alle
Solver-Pfade, `betrieb_abonnements`.
