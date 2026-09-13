# Backend-Befunde 2026-09-10

An den Entwickler der Expo-App (`Blank0371/QuickTeamMobile`).

Aus der Arbeit am Web-Repo. Alle Angaben am 2026-09-10 gegen das geteilte
Supabase-Projekt `jqpfuotwsgnqihspsmmf` geprüft, ausschliesslich lesend.
**Von hier aus ist an eurem Bestand nichts geändert worden** — keine Migration, kein DDL, keine
Policy. Die Punkte 4 und 5 sind bereits bekannt und stehen hier nur, damit der
Stand an einer Stelle vollständig ist.

**Ausnahme: Punkt 6.** Am 2026-09-10 ist mit Freigabe des Betreibers **eine
neue Tabelle** angelegt worden — `rechtliche_zustimmungen`, additiv, ohne
Berührung bestehender Tabellen, Policies oder Funktionen. Sie steht als eigener
Abschnitt unten, damit sie nicht zwischen den Befunden untergeht.

Keine Einschätzung der Dringlichkeit — das ist deine Entscheidung, nicht unsere.

---

## 1. `urlaub_benachrichtigen()` ist ohne Anmeldung ausführbar

**Quelle:** Supabase-Advisor `anon_security_definer_function_executable`
(`lint 0028`), abgerufen 2026-09-10.

Die Funktion ist `SECURITY DEFINER` und für die Rolle `anon` über
`/rest/v1/rpc/urlaub_benachrichtigen` aufrufbar — also ohne Sitzung, allein mit
dem öffentlichen Publishable Key.

Sie ist die **einzige** der 52 gemeldeten `SECURITY DEFINER`-Funktionen, die
`anon` erreicht; die übrigen 51 stehen auf `authenticated`, was zur
RPC-Architektur des Projekts passt und hier nicht als Befund gemeint ist.

Signatur ist parameterlos (`urlaub_benachrichtigen()`), Sprache `plpgsql`. Der
Name legt eine Trigger-Funktion nahe. Ob ein Aufruf von aussen etwas bewirkt,
ist von hier aus nicht geprüft worden — wir rufen sie nicht auf, weil sie
Benachrichtigungen schreiben könnte und ein `ROLLBACK` einen bereits abgesetzten
Nebeneffekt nicht zurückholt.

Zu prüfen wäre, ob `EXECUTE` für `anon` beabsichtigt ist.

## 2. `konto_merge_token`: RLS aktiv, aber keine Policy

**Quelle:** Advisor `rls_enabled_no_policy` (`lint 0008`); gegengeprüft in
`pg_policies` und `pg_class.relrowsecurity`.

```
relrowsecurity = true
Policies       = 0
```

Wirkung ist deny-by-default: ohne Policy kommt weder `anon` noch
`authenticated` an Zeilen. Die Tabelle ist damit **nicht offen** — sie ist
zu.

Gemeldet wird es trotzdem, weil der Zustand aussieht wie eine vergessene
Policy und nicht wie eine Absicht. Wenn der Zugriff ausschliesslich über
`konto_merge_start()` / `konto_merge_confirm(p_token)` laufen soll (beide
`SECURITY DEFINER`), dann ist „keine Policy" genau richtig und ein Kommentar an
der Tabelle würde die nächste Person davon abhalten, eine hinzuzufügen.

## 3. `einladung-einloesen`: deployed, aktiv, ohne Aufrufer

**Quelle:** `list_edge_functions`; Aufrufersuche im App- und Web-Quelltext.

| Feld | Wert |
| ---- | ---- |
| Slug | `einladung-einloesen` |
| Status | `ACTIVE`, Version 1 |
| `verify_jwt` | `true` |

Die Funktion nimmt einen `hash` entgegen, legt bei Bedarf einen
`auth.users`-Eintrag mit einer synthetischen Adresse
(`mitarbeiter-<uuid>@invite.local`) an, schreibt `mitarbeiter.auth_id` und gibt
ein Token-Paar zurück. Sie erzeugt also eine Sitzung im Wesentlichen gegen einen
Hash-Wert, mit Service-Role-Rechten.

**Aufrufer gibt es keinen.** Sie liegt nicht im App-Repo (`supabase/functions/`
enthält `plan-generieren` und `push-versenden`), und weder App- noch
Web-Quelltext ruft sie auf. `select.tsx` geht über `meine_einladungen()` /
`einladung_annehmen()`.

**Aktuell ist sie wirkungslos**, und zwar aus zwei Gründen zugleich:

```
public.einladungen : 0 Zeilen
Policies           : 3, alle an ist_chef(betrieb_id) gebunden
                     (SELECT / INSERT / DELETE)
```

Ohne Zeilen gibt es keinen Hash, der passt; und `verify_jwt: true` heisst, dass
ohnehin schon ein gültiges JWT vorliegen muss.

Zu klären vor dem Launch: wird sie noch gebraucht? Wenn nein, wäre das
Abschalten die kleinere Angriffsfläche. Wenn ja, gehört der vorgesehene Weg
dokumentiert — eine aktive Funktion ohne Aufrufer ist schwerer zu bemerken als
eine fehlende.

**`DOCUMENTATION.md` im App-Repo führt `einladungen` weiterhin als den aktiven
Einladungsweg.** Das deckt sich weder mit `TESTING.md` noch mit dem Datenstand.

## 4. `pruefe_letzter_chef()` hängt an keiner Tabelle *(bekannt)*

**Quelle:** `pg_proc` / `pg_trigger`, erneut geprüft 2026-09-10.

```
Funktion existiert            : ja (1)
Trigger, die sie verwenden    : 0
Trigger auf public.mitarbeiter: 1  (trg_mitarbeiter_spaltenschutz)
```

Die Funktion wirft die passende Meldung — und läuft nie.

Folge unverändert: `schuetze_mitarbeiter_spalten` lässt einen Chef jede Spalte
ändern, auch den eigenen `status`. Steht danach kein aktiver Chef mehr im
Betrieb, liefert `meine_betriebe()` nichts (es filtert `status = 'aktiv'`),
`ist_chef()` ist überall falsch, und keine Schreib-Policy des Betriebs greift
mehr.

`DOCUMENTATION.md` führt sie unter den Triggern, die Integrität erzwingen; das
trifft nicht zu.

Das Web fängt es in der Oberfläche ab (`darfStatusAendern()` in
`src/lib/dashboard/team.ts`: keine Status-Steuerung und kein Anonymisieren für
Chef-Zeilen). Das ist eine Kompensation, kein Ersatz — sie wirkt nur für diese
eine Oberfläche.

## 5. `status = 'gekuendigt'` fehlt in der Wiedereinstiegs-Ableitung *(bekannt)*

Betrifft das Web-Repo, steht hier der Vollständigkeit halber.

`betrieb_abonnements.status` lässt `trial`, `aktiv`, `zahlung_ausstehend`,
`gekuendigt` und `pausiert` zu. Die Ableitung, die nach dem Login entscheidet,
wo jemand landet, kennt `gekuendigt` nicht — der Fall fällt durch bis ins
Dashboard.

Solange aktive Kündigungen im Flow nicht vorkommen, ist das folgenlos. Sobald
es sie gibt (eigene Kündigen-Funktion, Kundenportal, oder `unpaid` durch eine
geänderte Dashboard-Einstellung), braucht er eine eigene Zeile und ein eigenes
Ziel. Das wird im Web-Repo entschieden, nicht hier — vermerkt, damit die
Statuswerte auf beiden Seiten denselben Stand haben.

---


---

## 6. Neue Tabelle `rechtliche_zustimmungen` *(Änderung, kein Befund)*

**Das ist die eine Stelle, an der dieses Dokument von seinem eigenen Vorsatz
abweicht: hier ist etwas geändert worden.** Angelegt am 2026-09-10 aus dem
Web-Repo, mit ausdrücklicher Freigabe des Betreibers. Bitte den Absatz oben
(„Von hier aus ist nichts geändert worden") entsprechend gelesen: er gilt für
die Punkte 1 bis 5, nicht für diesen.

**Was neu ist:** genau eine Tabelle, `public.rechtliche_zustimmungen`. **An
bestehenden Tabellen, Policies, Funktionen oder Triggern wurde nichts
geändert.** Kein Feld hinzugefügt, keine Policy angefasst, kein Trigger
angelegt.

```
rechtliche_zustimmungen
  id            bigint identity, PK
  betrieb_id    uuid  NOT NULL  -> betriebe(id)      ON DELETE CASCADE
  auth_id       uuid            -> auth.users(id)    ON DELETE SET NULL
  dokument      text  NOT NULL  CHECK ('agb'|'avv'|'datenschutz')
  version       text  NOT NULL  CHECK (nicht leer)
  akzeptiert_am timestamptz NOT NULL DEFAULT now()

  UNIQUE (betrieb_id, auth_id, dokument, version)
  INDEX  (betrieb_id, akzeptiert_am DESC)

  RLS an:
    SELECT  ist_chef(betrieb_id) OR auth_id = auth.uid()
    INSERT  auth_id = auth.uid() AND betrieb_id IN (SELECT meine_betriebe())
    UPDATE  — keine Policy (Absicht)
    DELETE  — keine Policy (Absicht)
```

**Warum:** eine rechtliche Vorprüfung hat beanstandet, dass die Web-Registrierung
AGB, AVV und Datenschutzerklärung nirgends einbezieht — keine Checkbox, kein
Link. § 7 Abs. 3 der AGB setzt aber voraus, dass der Kunde den AVV bei der
Registrierung schliesst. Seit dem 2026-09-10 gibt es im Web ein
Pflicht-Kontrollkästchen, und die Zustimmung wird hier festgehalten.

**Was dich betrifft — und was nicht.**

Die App schreibt in diese Tabelle **nicht**, und sie muss es auch nicht. Nichts
an eurem bestehenden Verhalten ändert sich; die Tabelle ist additiv, und ohne
Zeile darin funktioniert alles wie bisher. Es gibt keine Sperre, die daran
hängt.

Interessant ist sie trotzdem aus einem Grund: **euer `LegalConsentGate` legt die
Zustimmung nur in `AsyncStorage` ab** (`consentStorageKey`,
`legal:accepted:${id}`). Das ist gerätelokal — nach einer Neuinstallation ist der
Nachweis weg, und serverseitig existiert er gar nicht. Falls ihr das irgendwann
serverseitig ablegen wollt, ist die Tabelle da, und die INSERT-Policy passt auch
für Angestellte (sie prüft `meine_betriebe()`, nicht `ist_chef`).

Zwei Dinge, die dann abzustimmen wären, aber **jetzt bewusst nicht entschieden
sind**:

- **Die Dokumentnamen unterscheiden sich.** Ihr sagt `terms` und `privacy`, die
  Tabelle kennt `agb`, `avv`, `datenschutz`. Der CHECK liesse sich erweitern —
  das wäre dann eure Entscheidung, und der Web-Code müsste sie kennen.
- **Der AVV ist im Web dabei, bei euch nicht.** Das ist vermutlich richtig so:
  den AVV schliesst der Betriebsinhaber, nicht die angestellte Person, die eure
  App benutzt.

**Fassungsformat** ist von euch übernommen: `YYYY-MM-DD` mit optionalem Zusatz,
wie `TERMS_VERSION = "2026-08-07-draft"` in `src/lib/terms.ts`. Die Web-Werte
stehen in `src/lib/rechtstexte.ts`.

**Bestandsdaten:** die Tabelle ist heute leer. Betriebe, die vor dem 2026-09-10
registriert wurden, haben keine Zeile — rückwirkend zu heilen ist eine offene,
noch nicht getroffene Entscheidung.

## Nicht Gegenstand dieses Dokuments

- **`pg_net` im `public`-Schema** (Advisor `extension_in_public`, WARN) — Hinweis
  ohne erkennbaren Bezug zu unserer Arbeit.
- **Leaked-Password-Protection ist aus** (Advisor, WARN). Das ist eine
  Projekteinstellung im Supabase-Dashboard, keine Schema-Frage.
- Die 51 `SECURITY DEFINER`-Funktionen auf `authenticated`. Sie sind die
  RPC-Oberfläche des Produkts; ihre Aufzählung wäre kein Befund, sondern eine
  Beschreibung der Architektur.
