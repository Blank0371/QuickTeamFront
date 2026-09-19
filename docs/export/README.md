# Betriebsexport — was er enthält, was nicht, und was noch fehlt

**Stand: 2026-09-14.** Gehört zu `src/lib/export/` und
`src/app/api/betrieb-export/route.ts`.

## Wozu

§ 6 Abs. 4 und 5 der AGB versprechen dem Kunden seine Daten „in einem
strukturierten, gängigen und maschinenlesbaren Format". Bis zum
2026-09-13 gab es dafür keine Funktion — nur den Satz im Vertrag und die
E-Mail-Adresse des Betreibers. Der Export schliesst das; zugleich ist er
die Grundlage für den Anbieterwechsel nach Art. 23 ff. der Verordnung
(EU) 2023/2854 und für Auskunftsverlangen, die ein Kunde als
Verantwortlicher gegenüber seinen Beschäftigten erfüllen muss.

## Wie

```
GET /api/betrieb-export      →  quickteam-export-<betrieb>-<datum>.json
```

Ein Link, kein Formular. Erreichbar

- in `/dashboard/einstellungen` unter „Daten exportieren",
- auf der Sperrseite `/einrichtung/testphase-abgelaufen`,
- im Zustimmungs-Tor, wenn die Erstannahme fehlt.

Die letzten beiden sind kein Beiwerk: § 6 Abs. 4 gibt den Export **bis
dreissig Tage nach Vertragsende**. Ein Export, den die Zahlungssperre
abfängt, wäre keiner. Deshalb läuft die Route über `betreteOhneTore()`
und nicht über `betreteDashboard()`.

## Berechtigung

- Anmeldung, aktive Anstellung und Position werden serverseitig aus
  `auth.uid()` und dem geprüften `qt_position`-Cookie abgeleitet.
- **Es gibt keinen Parameter.** Kein `?betrieb=`, keine Id aus dem
  Formular — es soll auch keinen geben.
- Nur `rolle_typ = 'chef'`. Der Export enthält die Daten **aller**
  Beschäftigten; herausgeben darf sie der Verantwortliche, also der
  Kunde (§ 7 Abs. 2 AGB). Für die eigenen Daten einer angestellten
  Person ist Art. 15 DSGVO der Weg, und der führt über den Arbeitgeber.
- Jede Abfrage grenzt zusätzlich auf `betrieb_id` ein. RLS allein
  genügte nicht: Policies wie `na_select` lauten
  `betrieb_id IN (SELECT meine_betriebe())` und lieferten einem Konto
  mit zwei Anstellungen die Daten **beider** Betriebe.

## Inhalt

30 Tabellen (Stand 2026-09-15, zuletzt dazugekommen: `betrieb_promo_codes`),
dazu fünf abgeleitete Abschnitte. Die maßgebliche Liste
steht in `src/lib/export/tabellen.ts` und wird nicht aus dem Schema
erraten — eine neue Tabelle fehlt im Export, bis jemand sie einträgt,
und das ist der harmlosere Fehler.

Das Paket selbst trägt zu jedem Abschnitt eine Beschreibung
(`beschreibungen`), die Liste der Ausschlüsse mit Begründung
(`ausschluesse`) und die Auffälligkeiten des Laufs (`hinweise`).

### Vier Eingriffe, die keine Auslassung sind

| Eingriff | Grund |
| -------- | ----- |
| Einzelstimmen anonymer Umfragen fallen heraus, **auch die eigene** | `us_select` lässt die eigene Stimme durch; ohne den Filter verlöre eine zugesagte Anonymität durch den Export einen Teil ihrer Wirkung. Stattdessen die Auszählung über `umfrage_ergebnis()`. |
| Geheimnisse im Änderungsprotokoll werden zu `[entfernt]` | `plan_aenderungen` hält ganze Zeilen als JSON. Was heute aus einer Tabelle gefiltert wird — Einladungs-Hash, Token, Kennungen des Zahlungsdienstleisters —, steht dort noch im Klartext. |
| Der Notfallgrund fällt aus dem Änderungsprotokoll | Die App schlägt „Ich bin krank." vor; das ist regelmässig ein Gesundheitsdatum nach Art. 9 DSGVO. Solange `notfaelle.grund` breit lesbar ist (siehe `docs/backend/migration-2026-09-13-notfallgrund.sql`), soll der Export ihn wenigstens nicht dauerhaft aus dem Rechtekreis der Datenbank heraustragen. |
| Namen und Kontaktdaten pseudonymisierter Anstellungen fallen aus dem Änderungsprotokoll | Wer sein Konto gelöscht hat, ist in `mitarbeiter` anonymisiert — im Protokoll steht sein Name aber noch in `alte_werte`. Ein Export, der ihn mitnimmt, macht die Löschung rückgängig, und zwar ausserhalb unserer Reichweite. |

### Nicht enthalten

`push_tokens`, `konto_merge_token`, `einladungen.hash`, alles aus
`auth.users`, `benachrichtigung_prefs`, `bug_reports` und die
gemeinsame Referenztabelle `gesetzliche_parameter` (davon nur die Zeile
des eigenen Landes). Begründung je Eintrag in `AUSSCHLUESSE`; sie steht
wörtlich im Paket.

## Vollständigkeit: das Paket sagt es selbst

Seit dem 2026-09-14 trägt jedes Paket zwei Felder ganz oben:

```json
{ "vollstaendig": false, "unvollstaendig": ["nachricht_anhaenge: 3 Datei(en) nicht im Paket"] }
```

`vollstaendig` ist `false`, sobald **irgendetwas** fehlt: ein
verzeichneter Dateianhang ohne Datei, eine Tabelle, die nicht gelesen
werden konnte, eine erreichte Seitengrenze, eine nicht abrufbare
Umfrage-Auszählung. `unvollstaendig` nennt jeden dieser Punkte einzeln.

Der Unterschied zu `hinweise` ist beabsichtigt: **Hinweise erklären, was
der Export mit den Daten gemacht hat** (Redaktionen, Aggregationen) — das
ist Auskunft, kein Mangel. In `unvollstaendig` steht ausschliesslich, was
**fehlt**.

Dazu kommen zwei Dinge ausserhalb des JSON, weil eine archivierte Datei
oft nie wieder aufgemacht wird:

- der Dateiname endet auf `-UNVOLLSTAENDIG.json`,
- die Antwort trägt `X-QuickTeam-Export-Vollstaendig: nein`.

**Das hängt an den Zeilen dieses Laufs, nicht an einer Beobachtung von
gestern.** Entsteht morgen ein Upload-Weg, meldet der Export sich von
selbst als unvollständig — ohne dass jemand diese Datei anfassen muss.

## Konsistenz: die tatsächliche Garantie

### Was gilt

> **Jede Zeile, die während des gesamten Lesevorgangs einer Tabelle
> unverändert vorhanden ist, erscheint genau einmal.** Weder
> übersprungen noch doppelt.

Das ist keine Selbstverständlichkeit, sondern das Ergebnis einer
Korrektur. Die erste Fassung blätterte mit `range(n*1000, …)`, also über
einen **Zeilenversatz**, und das ist bei gleichzeitigen Änderungen
nachweislich falsch:

| Was währenddessen passiert | Folge bei Versatz-Blättern |
| -------------------------- | -------------------------- |
| Zeile eingefügt, Schlüssel **vor** dem Cursor | alles rutscht nach hinten → die Zeile an der Seitengrenze wird **übersprungen** |
| Zeile gelöscht, Schlüssel **vor** dem Cursor | alles rutscht nach vorn → die Zeile an der Grenze kommt **doppelt** |

Ein Dienstplan ändert sich während eines Exports ständig: der Solver
schreibt, jemand nimmt eine Schicht an, ein Trigger protokolliert. Bei
`plan_aenderungen` (rund 7.600 Zeilen, also acht Seiten) ist das kein
Randfall.

Jetzt wird per **Keyset** geblättert: sortiert nach dem Primärschlüssel,
mit der Bedingung „alles nach der zuletzt gelesenen Zeile". Für
zusammengesetzte Schlüssel baut `keysetBedingung()` die Übersetzung von
`(a,b) > (x,y)` in die Filtersprache von PostgREST, die
Zeilenwert-Vergleiche nicht kennt. Es gibt keinen Versatz, der
verrutschen könnte.

### Was nicht gilt

- **Kein Schnappschuss.** Eine Zeile, die während des Laufs entsteht,
  kann enthalten sein oder fehlen — je nachdem, ob ihr Schlüssel vor
  oder hinter dem Cursor liegt. Eine Zeile, die gelöscht wird, bevor der
  Cursor sie erreicht, fehlt.
- **Keine Konsistenz zwischen Tabellen.** Jede Tabelle ist eine eigene
  Anfrage und damit eine eigene Transaktion. Eine Schicht kann im Paket
  stehen, deren Zuweisung erst danach entstand.
- **Eine Ausnahme bei `einladungen`.** Ihr Primärschlüssel ist der
  Einladungs-Hash; den exportieren wir nicht und wollen ihn auch nicht
  als Sortierkriterium benutzen (eine Sortierung über ein
  Zugangsgeheimnis ist ein Seitenkanal). Ohne eindeutige Ordnung ist
  Keyset nicht korrekt, deshalb wird dort **eine Seite gelesen und ein
  Überlauf gemeldet** — bei einer durch die Mitarbeiterzahl des Tarifs
  begrenzten Tabelle eine Grenze, die praktisch nie greift und im
  Ernstfall unter `unvollstaendig` steht.

All das steht wörtlich in `meta.konsistenz` im Paket selbst.

`migration-export-schnappschuss.sql` daneben skizziert die Fassung mit
`repeatable read` in **einer** Transaktion — sie braucht eine
Datenbankfunktion und damit eine Freigabe, die dieses Repo nicht hat.

## Dateianhänge: was tatsächlich geprüft wurde

**Leere Buckets beweisen nichts.** Sie sind eine Momentaufnahme, und
eine Momentaufnahme ist keine Eigenschaft des Systems. Deshalb am
2026-09-14 vier Wege einzeln nachgesehen:

| Frage | Ergebnis |
| ----- | -------- |
| Gibt es Anhangszeilen? | `select count(*) from nachricht_anhaenge` → **0** |
| Gibt es Objekte im Speicher? | `select count(*) from storage.objects` → **0** |
| Gibt es überhaupt Buckets? | `select count(*) from storage.buckets` → **0** |
| Verweisen Mitteilungen auf Dateien? | alle `jsonb`-Schlüssel in `benachrichtigungen.inhalt` erhoben: `start_zeit`, `datum`, `schicht_instanz_id`, `end_zeit`, `zuweisung_id`, `anfrage_id`, `urlaub_id`, `von`, `bis`, `rolle_id`, `anbieter_*`, `praeferenz_tage`, `kommentar`, `begruendung`, `status`, `rollen`. **Kein Datei- oder URL-Schlüssel.** (Eine erste Suche nach `%url%` meldete 12 Treffer — das war `urlaub_id`.) |
| Gibt es einen Upload-Weg in der App? | `../QuickTeam App`: kein `supabase.storage`, kein `.upload(`, kein `DocumentPicker`, kein `ImagePicker`, kein `expo-file-system` in `package.json`. Der einzige Treffer auf „storage" ist `AsyncStorage`. `messages.tsx:314` **liest** `datei_name`, lädt aber nichts hoch. |
| Und im Web-Repo? | nur `src/lib/dashboard/mitteilungen.ts:201`, ebenfalls lesend. |

**Schlussfolgerung, und zwar eine vorsichtigere als „es gibt keine
Anhänge":** es existiert heute kein Weg, auf dem ein Anhang entstehen
könnte, und es existiert kein Speicher, gegen den sich signieren liesse.
Das kann sich ändern, ohne dass jemand diese Datei liest — deshalb
**entscheidet der Code zur Laufzeit**, nicht diese Beobachtung: sobald
`nachricht_anhaenge` auch nur eine Zeile liefert, ist das Paket
unvollständig und sagt es.

### Gespeicherte Pfade werden eingeordnet, nie abgerufen

`datei_pfad` ist eine gewöhnliche Textspalte, die jedes Betriebsmitglied
unter `na_insert` beschreiben kann. Ein Export, der diesen Wert
serverseitig abruft, ist eine **Server-Side Request Forgery mit
Ansage**: `http://169.254.169.254/…` holt Cloud-Metadaten,
`http://localhost:54321/…` erreicht Dienste, die von aussen nicht
erreichbar sind — jeweils mit den Rechten unseres Servers.

Der Export ruft deshalb **grundsätzlich nichts** ab. Jeder Eintrag unter
`dateien` trägt stattdessen:

| Feld | Bedeutung |
| ---- | --------- |
| `pfad_art` | `speicherpfad` \| `absolute-url` \| `leer` |
| `im_betriebsordner` | beginnt der Pfad mit `<betrieb_id>/`? |
| `datei_enthalten` | immer `false`, solange es keinen Objektspeicher gibt |

Pfade mit fremdem Ordner und absolute Adressen werden zusätzlich in
`hinweise` gemeldet. Die Tabellenzeile ist über `betrieb_id` eingegrenzt
— **der Pfad darin ist es nicht**, und wer eine Anhangszeile anlegen
darf, bestimmt ihn frei.

### Wenn ein Objektspeicher dazukommt

1. Bucketname in eine Umgebungsvariable (kein Literal — dieselbe Regel
   wie bei den Stripe-Price-Ids).
2. Signieren **nur** für Einträge mit `pfad_art === "speicherpfad"` und
   `im_betriebsordner === true`. Alles andere bleibt unsigniert und in
   den Hinweisen; eine absolute Adresse wird auch dann nicht aufgelöst.
3. `supabase.storage.from(bucket).createSignedUrls(pfade, ttl)` in
   Blöcken zu höchstens 100 Pfaden — das SDK signiert, es lädt nicht.
4. Gültigkeitsdauer der Adressen ins Paket schreiben. Ein Link, der
   schweigend abläuft, ist schlimmer als keiner.
5. `datei_enthalten` erst dann auf `true` setzen — und damit fällt der
   Mangel aus `unvollstaendig` von selbst weg.

## Prüfungen

`npm test` — `src/lib/export/paket.test.ts` deckt ab:

**Mandantentrennung**
- keine Zeile eines fremden Betriebs im Paket,
- **jede** Tabelle nachweislich auf `betrieb_id` eingegrenzt (der Test
  läuft über `EXPORT_TABELLEN` und fällt bei jeder neu eingetragenen
  Tabelle, die das vergisst),
- Referenzwerte nur des eigenen Landes.

**Blättern und Nebenläufigkeit**
- 2345 Zeilen über drei Seiten, keine Duplikate,
- **Einfügung vorne während des Laufs**: jede von Anfang an vorhandene
  Zeile ist im Paket — der Fall, den Versatz-Blättern überspringt,
- **Löschung vorne während des Laufs**: keine Zeile doppelt — der Fall,
  den Versatz-Blättern verdoppelt,
- zusammengesetzter Schlüssel (`verfuegbarkeiten`, 1500 Zeilen über drei
  Seiten): die `(a,b) > (x,y)`-Bedingung hält über den Seitenrand.

Die Client-Attrappe wertet die abgeschickte `or()`-Bedingung selbst aus,
sortiert und filtert also wie PostgREST — geprüft wird damit die
tatsächlich erzeugte Bedingung, nicht eine nachgebaute.

**Vollständigkeit**
- vollständiges Paket sagt `vollstaendig: true`,
- ein einziger verzeichneter Anhang macht es `false`, mit Eintrag unter
  `unvollstaendig`,
- eine nicht lesbare Tabelle ebenso,
- `meta.konsistenz` nennt sowohl die Zusage („genau einmal") als auch
  ihre Grenze („NICHT …", `einladungen`).

**Dateipfade**
- `http:`, `https:`, `file:`, `data:` und `//host` werden als absolute
  Adressen erkannt,
- `b-eigen/…` als Speicherpfad, Leeres als leer,
- fremder Ordner, `../`-Ausbruch und Präfix-Verwechslung
  (`b-eigen-anderer/`) werden erkannt,
- fremde Ordner und absolute Adressen landen in den Hinweisen,
  `datei_enthalten` bleibt überall `false`.

**Inhalt**
- anonyme Umfragen: Stimmen raus, Auszählung rein, Hinweis gesetzt,
- Redaktion von Geheimnissen und Notfallgrund im Änderungsprotokoll,
- Pseudonymisierung bleibt bestehen,
- betriebliche Annahme und persönliche Kenntnisnahme stehen getrennt,
- jeder Abschnitt beschrieben, keine Geheimnisse in den Spaltenlisten,
- keine Keyset-Tabelle ordnet nach einem Zeitstempel.

Die Testdaten sind vollständig erfunden; der Testlauf fasst keine
Datenbank an.
