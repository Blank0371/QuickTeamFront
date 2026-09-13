# Backend-Befunde aus dem Website-Repo — 2026-09-07

Adressat: der Entwickler der Expo-App (`Blank0371/QuickTeamMobile`) und wer die
Supabase-Projekteinstellungen verwaltet.

Wie die früheren Sammlungen (`docs/backend-befunde-2026-08-28.md`,
`docs/projektstand-2026-08-26.md`) betrifft das hier die **gemeinsame
Supabase-Instanz** (`jqpfuotwsgnqihspsmmf`) und nicht den Website-Code. Von hier aus
wird weder das Schema noch die Projektkonfiguration geändert — **gemeldet, nicht
repariert.**

Gefunden bei der Bearbeitung der fünf Testrückmeldungen vom 2026-09-07.

---

## 11. Registrierung ist projektweit abgeschaltet (`disable_signup: true`)

**Fundstelle:** der öffentliche GoTrue-Endpunkt des Projekts.

```
GET /auth/v1/settings   →   { …, "disable_signup": true, … }
```

Gegenprobe mit einer Wegwerf-Adresse, die keinen Datensatz hinterlässt:

```
POST /auth/v1/signup
→ 422  {"code":422,"error_code":"signup_disabled",
        "msg":"Signups not allowed for this instance"}
```

**Warum das hier auffällt.** Aus dem Test kam „Betrieb/Account erstellen ist
deaktiviert". Der naheliegende Verdacht war der Soft-Launch-Schalter des
Website-Repos (`SOFT_LAUNCH`, siehe `CLAUDE.md`) — der sperrt `/registrieren`
tatsächlich, ist aber lokal mit `SOFT_LAUNCH=aus` abschaltbar. Diese Sperre hier
liegt **darunter** und lässt sich vom Repo aus überhaupt nicht abschalten: sie
steht im Supabase-Dashboard unter Authentication → Sign In / Providers → Email.

Wer also lokal alles richtig konfiguriert, kommt bis zum Absenden des
Registrierungsformulars — und scheitert dann an einer Ursache, die weder in der
`.env.local` noch im Code steht.

**Nebenbefund in unserem Code, hier bereits behoben:** `authFehlerText()` in
`src/lib/formular.ts` kennt `signup_disabled` nicht und fällt in den
`default`-Zweig — „Das hat nicht geklappt. Versuch es noch einmal." Das ist
gleich doppelt irreführend: es lädt zum Wiederholen ein, obwohl der Versuch nie
gelingen kann, und es nennt die Ursache nicht.

**Zu entscheiden ist nicht von hier aus:** ob die Abschaltung Absicht ist. Sie
passt zum Soft-Launch (`CLAUDE.md`: „Solange die Rechtstexte Entwürfe sind, darf
sich kein echter Betrieb registrieren") und wäre dann sogar die gründlichere
Sperre — nur eben eine, die auch jeden Entwicklungs- und Testzugang trifft.
Gebraucht wird eine Antwort auf: soll sie bis zum Launch stehen bleiben, und wie
kommen Testkonten in der Zwischenzeit zustande?

---

## 12. `mitarbeiter.email` hat keinen UNIQUE-Constraint — bestätigt

**Fundstelle:** `pg_indexes` und `pg_constraint` auf `public.mitarbeiter`.

```
mitarbeiter_email_idx
  CREATE INDEX (nicht UNIQUE) ON mitarbeiter (betrieb_id, lower(email))
  WHERE email IS NOT NULL
```

Kein Constraint vom Typ `u` auf `email`; die einzigen Eindeutigkeiten sind
`mitarbeiter_pkey (id)` und `mitarbeiter_id_betrieb_key (id, betrieb_id)`.

Kein neuer Fund, sondern eine **Bestätigung** der Angabe in `CLAUDE.md` — hier
festgehalten, weil aus dem Test „Mitarbeiter mit bereits vorhandener E-Mail nicht
anlegbar" gemeldet wurde und die Ursache damit eindeutig **nicht** in der
Datenbank liegt. Sie lag in einer zu strengen Prüfung im Website-Code
(`schonEingeladen()`), die am 2026-09-07 gelockert wurde: geprüft wird jetzt Name
**und** Kontakt statt Kontakt allein.

Das Datenmodell sieht mehrere Anstellungen je Adresse ausdrücklich vor, auch im
selben Betrieb — Testbetrieb 12 (`3a1d698e-…`) ist genau so gebaut, und
`holePositionen()` im Dashboard rechnet damit. Eine Eindeutigkeit auf `email`
nachzurüsten wäre also **kein** Bugfix, sondern würde diesen Fall zerstören.
Falls jemand darüber nachdenkt: bitte vorher hier melden.

---

## 13. `rollen` hat weiterhin keine DELETE-Policy — Auswirkung wächst

**Fundstelle:** bereits gemeldet (siehe `CLAUDE.md` und die Notiz
`rollen-delete-policy-fehlt`); hier nur die Folge, die im Test sichtbar wurde.

Eine im Einrichtungs-Assistenten angelegte Rolle liess sich nicht mehr entfernen:
RLS filtert das `DELETE` still heraus, `error` bleibt `null`, betroffen sind null
Zeilen. Der häufigste Handgriff der Einrichtung — anlegen, vertippt, weg damit,
neu anlegen — endete damit in einer Rolle, die dauerhaft in der Liste stand und
über `UNIQUE (betrieb_id, name)` zusätzlich ihren Namen blockierte.

**Im Website-Repo am 2026-09-07 kompensiert, nicht behoben:** Schritt 3 sammelt
Rollen jetzt im Formularzustand und schreibt sie erst beim Weitergehen (oder beim
ersten Einladen, weil eine Rollenzuweisung eine `rolle_id` braucht). Solange
nichts geschrieben ist, gibt es nichts zu löschen.

Das umgeht das Problem für neu angelegte Rollen. **Es löst es nicht:** wer aus
Schritt 4 zurückkommt oder eine Rolle über die Team-Seite des Dashboards
entfernen will, steht weiterhin davor. Eine DELETE-Policy auf `rollen` bleibt der
eigentliche Fix und kann nur ausserhalb dieses Repos entstehen.

---

# Nachtrag 2026-09-08

Gefunden bei der Vorbereitung des Erfassungsformulars für Vertragsdaten
(`docs/spezifikation-anstellungsdaten-2026-09-08.md`). Wie oben: **gemeldet,
nicht repariert** — beide Punkte sitzen in einem Trigger bzw. in der
Interpretation einer Spalte, und Schema-Änderungen finden von diesem Repo aus
nicht statt.

## 14. `max_stunden_hart` wird von zwei Verbrauchern widersprüchlich gelesen

**Fundstellen:** `public.pruefe_zuweisung_constraints()` (BEFORE-Trigger
`trg_zuweisung_constraints` auf `schicht_zuweisungen`) gegen
`supabase/functions/plan-generieren/index.ts:26` und `solver.ts:341-352`.

Dieselbe Spalte, zwei Perioden:

| Verbraucher | liest `max_stunden_hart` als | Bezugsgrösse |
| --- | --- | --- |
| DB-Trigger | **Wochen**grenze | Summe der **Netto**stunden der ISO-Kalenderwoche (`v_woche_summe`), Fehlertext „HC-5 … KW ab %" |
| Solver | **Monats**grenze | Zyklusstunden, zusätzlich anteilig gekürzt (`verfuegbarkeitsFaktor`) |

**Kein gespeicherter Wert erfüllt beide.** Ein Monatswert (z. B. 173) ist für den
Solver richtig; im Trigger wird er nie erreicht, weil unmittelbar davor die
gesetzliche Wochengrenze aus `gesetzliche_parameter` steht (AT wie DE 48 h) und
immer zuerst greift. Ein Wochenwert (z. B. 40) ist im Trigger richtig, lässt den
Solver die Person aber auf 40 Stunden im **Monat** einplanen.

**Der Bestand ist eindeutig monatlich:** alle 120 gesetzten Werte liegen zwischen
65 und 208, **keiner unter 48**. Damit feuert HC-5 im Trigger heute bei keiner
einzigen Zeile. Der persönliche Hartdeckel wird ausschliesslich vom Solver
durchgesetzt; eine **manuelle** Zuweisung über das Dashboard ist nur durch das
Gesetz begrenzt (48 h/Woche, 12 h/Tag AT bzw. 10 h/Tag DE) und kann jemanden auf
rund 208 Monatsstunden bringen, obwohl in `max_stunden_hart` 150 steht — ohne
Fehlermeldung.

**Empfehlung:** die Spalte aufteilen, etwa in `max_stunden_woche` (Trigger) und
`max_stunden_monat` (Solver) — dann sagt jeder Name, was er meint. Alternativ
einen der beiden Verbraucher auf die Lesart des anderen umstellen; wird der
Trigger auf „Monat" umgestellt, muss er die Zyklus- oder Kalendermonatssumme
bilden statt der Wochensumme.

**Folge für das Website-Repo:** `max_stunden_hart` wird im Erfassungsformular
vom 2026-09-08 **bewusst ausgelassen**. Ein Feld anzubieten, dessen Wert je nach
Leser etwas anderes bedeutet, hiesse, den Fehler in die Oberfläche zu tragen.

## 15. Mitarbeitende können ihren eigenen Urlaubsanspruch erhöhen

**Sicherheitsrelevant.** Fundstellen: Policy `mitarbeiter_update_selbst`,
Trigger-Funktion `public.schuetze_mitarbeiter_spalten()`, RPC
`public.urlaub_beantragen()`.

Die Policy erlaubt das UPDATE auf **Zeilen**ebene:

```
mitarbeiter_update_selbst   USING/WITH CHECK:  auth_id = auth.uid()
```

Eine Begrenzung auf einzelne Spalten gibt es dabei nicht. Die einzige
Spaltensperre ist der BEFORE-UPDATE-Trigger `schuetze_mitarbeiter_spalten()`,
dessen Schlusszweig aufzählt, was sich nicht ändern darf:

```
id, betrieb_id, auth_id, vorname, nachname, email, rolle_typ,
vertrag_typ, soll_stunden, max_stunden_hart, toleranz_ueberstunden,
ueberstunden_saldo, status, anonymisiert_am, erstellt_am
   → sonst: 'Nur telefon darf selbst geaendert werden'
```

**`urlaubsanspruch_tage` steht nicht auf dieser Liste** (`sprache` ebenfalls
nicht, dort ist es vermutlich gewollt).

Spaltenrechte fangen es nicht ab — geprüft, nicht vermutet:
`has_column_privilege('authenticated','public.mitarbeiter', <spalte>,'UPDATE')`
ist für **jede** Spalte wahr, und `information_schema.column_privileges` enthält
keine einschränkenden Einträge.

**Auswirkung:** jede angemeldete Person kann den `urlaubsanspruch_tage` ihrer
eigenen Zeile beliebig hochsetzen. `urlaub_beantragen()` prüft das Kontingent
gegen genau diese Spalte:

```
select coalesce(urlaubsanspruch_tage, 0) into v_anspruch
  from public.mitarbeiter where id = v_me;
...
if v_verbraucht + v_neu > v_anspruch then raise exception 'URLAUB_KONTINGENT';
```

Damit ist die Kontingentprüfung durch den Betroffenen selbst aushebelbar — die
Funktion ist zwar SECURITY DEFINER, liest aber einen Wert, den der Aufrufer
vorher setzen darf.

**Empfehlung:** `urlaubsanspruch_tage` in die Sperrliste von
`schuetze_mitarbeiter_spalten()` aufnehmen. Das ist eine Zeile und ändert nichts
am Chef-Weg, der ohnehin oben über `ist_chef(new.betrieb_id)` vorbei ist.

**Nicht von hier aus behoben**, und die Oberfläche kann es auch nicht auffangen:
der Weg führt über die PostgREST-API, nicht über unser Formular. Das
Erfassungsformular vom 2026-09-08 schreibt das Feld nur auf dem Chef-Weg —
das verhindert aber niemanden, der die API direkt anspricht.
