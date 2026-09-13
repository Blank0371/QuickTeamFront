# Backend-Befunde 2026-09-11 — angewendete Änderungen und ein Folgeauftrag

**An den App-Entwickler.** Anders als die früheren Dateien dieser Reihe ist das
hier **nicht** „gemeldet, nicht repariert". Abschnitt A des Codex-Audits ist am
2026-09-11 auf `jqpfuotwsgnqihspsmmf` **angewendet** worden — mit ausdrücklicher
Freigabe der Betreiberin, als benannte Ausnahme von der Regel „das Schema wird
von diesem Projekt aus nicht verändert".

Migration: `docs/audit-a/migration-abschnitt-a.sql`
Gegenproben: `docs/audit-a/befunde-2026-09-11.md`

---

## 1. Drei Änderungen brechen laufenden App-Code

**Diese drei sind live und noch nicht mit dir abgestimmt.** Sie stehen hier
zuerst, weil sie Arbeit auf deiner Seite auslösen.

### A1 — anonyme Umfragen zählen in der App falsch

`messages.tsx:313` lädt `umfrage_stimmen` direkt:

```ts
supabase.from("umfrage_stimmen")
  .select("benachrichtigung_id, option_id, mitarbeiter_id")
  .in("benachrichtigung_id", ids)
```

Die Policy `us_select` gibt bei **anonymen** Umfragen jetzt nur noch die
**eigene** Stimme heraus. Die App zeigt dort ab sofort „1 Stimme" statt der
echten Zahl. Nicht-anonyme Umfragen sind unverändert.

**Grund:** vorher konnte jedes Betriebsmitglied jede Einzelstimme samt
`mitarbeiter_id` lesen. Die Anonymität existierte nur im Rendering — beide
Clients laden die Rohzeilen und entscheiden erst beim Anzeigen, ob sie Namen
auflösen. Wer die Netzwerkantwort liest, sah die Zuordnung.

**Was zu tun ist:** für anonyme Umfragen die neue RPC benutzen.

```ts
const { data } = await supabase.rpc("umfrage_ergebnis", {
  p_benachrichtigung_id: id,
});
// -> [{ option_id: uuid, anzahl: number }, ...]
```

`SECURITY DEFINER`, `EXECUTE` nur für `authenticated`, filtert selbst auf
`meine_betriebe()`. Gegengeprüft: liefert die korrekte Zahl für den eigenen
Betrieb und ein leeres Ergebnis für einen fremden.

### A5 — Urlaubsanträge: Mitarbeiter dürfen nicht mehr löschen oder stornieren

Entscheidung der Betreiberin, ausdrücklich und unabhängig von meiner
Einschätzung: **Mitarbeiter dürfen eigene Anträge nie selbst löschen oder
stornieren — offen, genehmigt oder vergangen. Nur die Betriebsleitung.**

Entfallen sind `urlaub_insert_selbst` und `urlaub_delete_selbst_or_chef`. Neu
ist allein `urlaub_delete_chef`.

**Folgen für die App:**

- Jeder Knopf in `scheduling.tsx` (Tab „Vacation"), der einen eigenen Antrag
  zurückzieht, läuft jetzt in einen RLS-Fehler bzw. trifft null Zeilen.
  Entfernen oder auf eine Anfrage an den Chef umstellen.
- **Anträge einreichen geht nur noch über `urlaub_beantragen()`.** Ein direkter
  `insert` auf `urlaub` wird abgewiesen. Falls die App irgendwo direkt
  einfügt, muss das auf die RPC umgestellt werden.

**Zu beachten:** `urlaub.status` erlaubt nur `requested | approved | denied`.
Einen Zustand „storniert" gibt es im Schema **nicht** — die Betriebsleitung
lehnt also mit `denied` ab oder löscht die Zeile. Wenn „Stornierung" ein
eigener, von „abgelehnt" unterscheidbarer Zustand werden soll, ist das eine
Schema-Änderung und eine Produktentscheidung, keine Nacharbeit.

### A6 — der letzte aktive Chef ist jetzt geschützt

`pruefe_letzter_chef()` existierte schon, hing aber an **keiner** Tabelle. Sie
hängt jetzt als `trg_letzter_chef` BEFORE UPDATE OR DELETE an `mitarbeiter`.

Fehlschlagen können ab sofort: Degradierung, Deaktivierung, Anonymisierung und
Löschung des letzten aktiven Chefs eines Betriebs — mit
`Der letzte aktive Chef eines Betriebs kann nicht …`. Wenn `manager.tsx` diese
Aktionen anbietet, sollte die Meldung dort sauber angezeigt statt verschluckt
werden.

Zwei Ergänzungen gegenüber deiner Fassung:

- `anonymisiert_am is not null` zählt als Verlust — sonst wäre
  `mitarbeiter_anonymisieren()` der Weg daran vorbei.
- Beim Löschen eines **Betriebs** kaskadiert `mitarbeiter_betrieb_fkey` auf
  `mitarbeiter`. Ohne Ausnahme hätte der Trigger genau die gewollte
  Betriebsschliessung blockiert. Erkannt daran, dass die `betriebe`-Zeile
  während der Kaskade schon weg ist.

**Bekannte Folge:** `konto_selbst_loeschen()` eines Chefs, der allein einen
Betrieb führt, scheitert jetzt. Inhaltlich richtig, aber es heisst, dass
Kontolöschung und Betriebsschliessung getrennte Wege brauchen (Audit-Punkt 19).

`DOCUMENTATION.md` führt `pruefe_letzter_chef` unter den Triggern, die
Integrität erzwingen. Das stimmte bis heute nicht — ab jetzt schon.

---

## 2. Folgeauftrag: Edge Function `einladung-einloesen`

**Das ist der eine Punkt aus Abschnitt A, der offen bleibt, und er liegt bei
dir** — nicht aus Zuständigkeitsdenken, sondern weil der Quellcode hier nicht
liegt und von hier nicht deploybar ist.

### Befund zum Zustand

Am 2026-09-11 nachgesehen. Die Funktion ist `ACTIVE`, Version 1,
`verify_jwt: true`. Ihr Ablauf:

1. `einladungen` lesen, `eingeloest_am` und `ablaufdatum` prüfen
2. bei Bedarf `auth.users` anlegen, `mitarbeiter.auth_id` schreiben
3. **Session minten und zurückgeben**
4. *erst danach* `eingeloest_am` setzen, mit `.is("eingeloest_am", null)`

**Zwei Fehler:**

- Der Guard in Schritt 4 ist wirkungslos. Geprüft wird nur `updErr`, nicht ob
  überhaupt eine Zeile getroffen wurde. Zwei gleichzeitige Aufrufe liefern
  **beide** ein gültiges Token-Paar; beim zweiten trifft das UPDATE null Zeilen
  und niemand merkt es.
- Die Reihenfolge ist falsch. Die Sitzung entsteht, bevor die Einladung
  verbraucht ist. Schlägt Schritt 4 fehl, ist die Sitzung trotzdem in der Welt.

### Was zu tun ist

**Erst verbrauchen, dann minten.** Ein einziges atomares UPDATE, dessen
Rückgabe die Berechtigung ist:

```ts
const { data: verbraucht } = await admin
  .from("einladungen")
  .update({ eingeloest_am: new Date().toISOString() })
  .eq("hash", hash)
  .is("eingeloest_am", null)
  .gt("ablaufdatum", new Date().toISOString())
  .select("betrieb_id, mitarbeiter_id")
  .maybeSingle();

if (!verbraucht) return json({ error: "Einladung ungültig, abgelaufen oder bereits eingelöst" }, 409);
// ab hier — und nur hier — Session minten
```

Ablauf und Einmaligkeit gehören **in dieselbe WHERE-Klausel**. Getrennt
geprüft sind sie wieder ein Zeitfenster.

Kommt das Minten danach nicht durch, ist die Einladung verbraucht. Das ist die
richtige Richtung für einen Einmal-Token: lieber eine verbrauchte Einladung neu
ausstellen als eine, die zweimal gilt.

**Zusätzlich:** `mitarbeiter.auth_id` sollte die Funktion nicht selbst
schreiben, sondern `einladung_annehmen(p_mitarbeiter_id)` aufrufen. Die RPC ist
heute auf atomaren Verbrauch umgestellt — `UPDATE … WHERE auth_id IS NULL
RETURNING` — und ist damit die einzige Stelle, an der eine Anstellung mit einem
Konto verknüpft wird. Zwei Wege auf dieselbe Spalte sind zwei Gelegenheiten,
sich zu widersprechen.

### Vorher zu klären: wird sie überhaupt benutzt?

**Ich finde keinen Aufrufer.** Gesucht am 2026-09-11 in beiden Checkouts:

| Suche | Ergebnis |
| --- | --- |
| `einladung-einloesen` im App-Quelltext | kein Treffer |
| `einloesen` irgendwo im App-Repo (ts/tsx/json/md) | **kein Treffer** |
| `functions.invoke` im App-Repo | nur `plan-generieren` (`manager.tsx:1528`) |
| `functions.invoke` im Web-Repo | nur `plan-generieren` (per `fetch`) |
| `supabase/functions/` im App-Repo | nur `plan-generieren`, `push-versenden` |
| `supabase/` im Web-Repo | existiert nicht |

Der tatsächlich benutzte Einladungsweg ist in beiden Clients
`meine_einladungen()` → `einladung_annehmen()`.

**Damit steht `CLAUDE.md`s Einordnung „verwaister aktiver Datenweg" im
Quelltext bestätigt** — die Betreiberin ist für diese Runde von „aktiv genutzt"
ausgegangen, dafür finde ich keinen Belegpunkt. Das ändert nichts an der
Dringlichkeit: sie ist deployed, `ACTIVE` und mintet Sessions allein gegen
einen Hash. Ein Datenweg ohne Aufrufer ist nicht harmlos, er ist bloss
unbeobachtet.

**Also zuerst die Entscheidung, nicht der Fix:** wird sie gebraucht? Wenn nein,
ist Löschen die bessere Antwort als Härten. Wenn ja, gilt der Auftrag oben.
Ihr Quellcode liegt in **keinem** der beiden Repos — vor einer Änderung muss er
also überhaupt erst wieder auffindbar sein.

### Festhalten: die Funktion ist heute funktional tot

**Befund vom 2026-09-11, damit das nicht als vergessene Altlast liegen
bleibt.** Der Zustand in drei Sätzen:

- Sie ist **deployed und `ACTIVE`** (Version 1, `verify_jwt: true`).
- Sie hat **keinen Aufrufer** — nicht in der App, nicht in der Website, in
  keinem der beiden Checkouts (Suchtabelle oben).
- Ihr **Quellcode existiert in keinem Repo**. Nur das deployte Artefakt ist
  lesbar; es gibt keine Datei, die man bei einer Änderung anfassen könnte.

Damit ist sie funktional tot: sie tut nichts, weil niemand sie ruft — aber sie
ist erreichbar, und sie mintet eine Sitzung allein gegen einen Hash. Eine
ungenutzte Tür, die sich öffnen lässt, ist schlechter als eine benutzte, denn
niemand sieht hin.

**Empfehlung, eine von zwei — nicht „später entscheiden":**

1. **Löschen.** Wenn der Einladungsweg über `meine_einladungen()` /
   `einladung_annehmen()` der bleibende ist — und danach sieht es aus, beide
   Clients gehen ausschliesslich darüber —, ist das die richtige Antwort.
   Löschen entfernt die Angriffsfläche vollständig und kostet nichts, weil
   nichts davon abhängt. Rückholbar ist es ohnehin nicht schlechter als heute:
   der Quellcode ist so oder so verloren.

2. **Behalten mit Zieldatum.** Nur wenn sie für eine *konkrete* künftige
   Funktion vorgesehen ist — etwa Einladung per Link ohne vorhandenes Konto.
   Dann gehört sie bis zu diesem Datum **deaktiviert** (undeployed oder
   `verify_jwt` plus ein Feature-Flag, das sie hart ablehnen lässt), nicht
   aktiv liegen gelassen, und das Datum gehört in `DOCUMENTATION.md`. Ein
   „behalten, falls wir es mal brauchen" ohne Datum ist Variante 1 mit
   zusätzlichem Risiko.

**Von hier aus passiert an der Funktion nichts** — diese Sitzung hat keine
Deploy-Rechte dafür und der Quellcode liegt nicht hier. Das ist eine
Entscheidung für dich und die Betreiberin, und sie ist mit diesem Abschnitt
gestellt, nicht mehr offen im Raum.

---

## 3. Weitere angewendete Änderungen, die dich nicht brechen sollten

| Punkt | Änderung |
| --- | --- |
| A2 | `schuetze_mitarbeiter_spalten()` prüft jetzt per **Allowlist** (nur `telefon`, in den drei Sonderfällen erweitert) statt per Verbotsliste. `urlaubsanspruch_tage` war ungeschützt und liess sich vom Mitarbeiter selbst hochsetzen — mit direkter Wirkung auf die Kontingentprüfung in `urlaub_beantragen()`. Jede künftig hinzugefügte Spalte ist damit von vornherein geschützt |
| A3 | `schicht_notizen` hat statt drei unabhängiger Einzel-FKs jetzt zusammengesetzte auf `(betrieb_id, schicht_instanz_id)` und `(mitarbeiter_id, betrieb_id)`. Vorher liess sich eine Notiz aus Betrieb X an eine Schicht aus Betrieb Y hängen |
| A4 | `benachrichtigungen` hat `UNIQUE (betrieb_id, id)`; `umfrage_optionen` und `nachricht_anhaenge` hängen zusammengesetzt daran. **Bereits sauber und unangetastet:** `schicht_zuweisungen`, `mitarbeiter_rollen`, `urlaub`, `einladungen` |
| A7 | `einladung_annehmen()` verbraucht atomar (`WHERE auth_id IS NULL RETURNING`) statt SELECT-dann-UPDATE. Für denselben Nutzer weiterhin idempotent |
| A8 | `EXECUTE` entzogen: `urlaub_benachrichtigen()` (hatte als einzige Triggerfunktion `PUBLIC` **und `anon`**), `rls_auto_enable()`, und `anon` auf `umfrage_ergebnis()` |

**Nicht angefasst:** Testbetrieb 12, `plan-generieren`, `push-versenden`, alle
Solver-Pfade, `betrieb_abonnements`, jede Tabelle ohne Eintrag oben.

### Nebenbefund ohne Änderung

`konto_selbst_loeschen()` und `mitarbeiter_anonymisieren()` setzen
`app.guard_off` per `set_config()`. **`schuetze_mitarbeiter_spalten()` liest
diese Einstellung nirgends** — weder vorher noch jetzt. Der Mechanismus ist
wirkungslos; die beiden Funktionen kommen über die `ist_chef`-Abkürzung bzw.
den Selbstlösch-Zweig durch. Gemeldet, nicht angetastet: ich weiss nicht, ob
das ein Rest aus einer früheren Fassung ist oder für etwas anderes gedacht war.
