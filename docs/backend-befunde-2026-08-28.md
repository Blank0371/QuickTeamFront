# Backend-Befunde aus dem Website-Repo — 2026-08-28

Adressat: der Entwickler der Expo-App (`Blank0371/QuickTeamMobile`).

Diese Punkte betreffen die **gemeinsame Supabase-Instanz** (`jqpfuotwsgnqihspsmmf`),
nicht das Website-Repo. Von hier aus wird am Schema nichts geändert — das ist eine
feste Regel des Website-Projekts, und sie gilt auch für die Befunde unten. Sie sind
**gemeldet, nicht repariert.**

Die sechs bereits bekannten Befunde stehen in `docs/projektstand-2026-08-26.md` und
zusammengefasst in `docs/quickteam-gesamtkonzept.md`, Abschnitt 4. Dieses Dokument
ergänzt sie um vier neue, gefunden bei einem Durchgang am 2026-08-28.

Gefunden wurden sie über die Supabase-Advisors plus gezielte Katalogabfragen, nicht
durch Lesen der Dokumentation — nach demselben Muster wie die bisherigen Funde: die
Doku beschreibt mehrfach Schutz, den der Katalog nicht bestätigt.

---

## 7. `urlaub_benachrichtigen()` ist für `anon` ausführbar

**Fundstelle:** `pg_proc`, bestätigt über `has_function_privilege`.

```sql
select array(
  select r.rolname from pg_roles r
  where has_function_privilege(r.rolname, p.oid, 'EXECUTE')
    and r.rolname in ('anon','authenticated')
)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'urlaub_benachrichtigen';
-- → {authenticated,anon}
```

Die Funktion ist `SECURITY DEFINER` und über `POST /rest/v1/rpc/urlaub_benachrichtigen`
erreichbar — **auch ohne Anmeldung**, allein mit dem öffentlichen anon-Key.

**Wie schlimm ist es wirklich:** vermutlich nicht sehr. Es ist eine
*Trigger*-Funktion — sie liest `tg_op` und `new`, und beide sind ausserhalb eines
Trigger-Kontexts nicht definiert. Ein Direktaufruf endet deshalb mit einem Fehler,
bevor etwas geschrieben wird. Der Befund ist Hygiene, kein offenes Tor.

**Warum trotzdem melden:** die Funktion schreibt im regulären Betrieb in
`benachrichtigungen`, und sie tut das als `SECURITY DEFINER`, also an RLS vorbei.
Eine Funktion mit dieser Kombination sollte gar nicht erst auf der öffentlichen
API-Oberfläche stehen — der Schutz beruht derzeit allein darauf, dass PL/pgSQL beim
Zugriff auf `new` abbricht, und das ist ein Nebeneffekt, keine Absicht.

**Vorschlag:**

```sql
revoke execute on function public.urlaub_benachrichtigen() from anon, authenticated;
```

Trigger-Funktionen brauchen kein `EXECUTE` für API-Rollen; der Trigger läuft als
Tabelleneigentümer. Lohnend wäre, dabei gleich **alle** Trigger-Funktionen im Schema
durchzusehen — wenn diese eine so freigegeben ist, sind es die anderen vermutlich auch.

---

## 8. `konto_merge_token` hat RLS aktiv, aber keine einzige Policy

**Fundstelle:** Supabase-Advisor, `rls_enabled_no_policy`.

RLS ohne Policies heisst: für `anon` und `authenticated` ist die Tabelle vollständig
dicht — kein Select, kein Insert. Das ist der sichere Ausgang und deshalb **kein
Datenleck.**

Der Punkt ist ein anderer: der Name deutet auf einen Kontozusammenführungs-Weg, und
falls dafür noch Code existiert oder geplant ist, läuft er entweder über
`service_role` (dann ist es Absicht und gehört dokumentiert) oder er ist schlicht
kaputt und niemand merkt es, weil eine leere Ergebnismenge wie „nichts da" aussieht
und nicht wie „nicht erlaubt". Das ist dieselbe Fehlerform wie bei der fehlenden
`rollen`-DELETE-Policy (Befund 1): **lautloses Scheitern.**

**Zu klären:** wird die Tabelle noch gebraucht? Falls nein, weg damit. Falls ja,
braucht sie Policies oder einen ausdrücklichen Vermerk, dass sie ausschliesslich
`service_role` gehört.

---

## 9. `pg_net` liegt im `public`-Schema

**Fundstelle:** Supabase-Advisor, `extension_in_public`.

Die Standardempfehlung von Supabase. `pg_net` macht ausgehende HTTP-Requests aus der
Datenbank heraus; im `public`-Schema liegen seine Funktionen im Standard-`search_path`
und sind damit leichter erreichbar, als sie sein müssten — besonders in Kombination
mit `SECURITY DEFINER`-Funktionen, von denen dieses Projekt rund fünfzig hat.

**Vorschlag:** in ein eigenes Schema verschieben (`extensions`). Das ist eine
Migration mit Nebenwirkungen — alles, was `net.http_post` o. ä. aufruft, muss den
neuen Pfad kennen. Kein dringender Punkt, aber einer für die nächste Aufräumrunde.

---

## 10. Leaked-Password-Protection ist abgeschaltet

**Fundstelle:** Supabase-Advisor, `auth_leaked_password_protection`.

Supabase Auth kann Passwörter beim Setzen gegen HaveIBeenPwned prüfen (k-Anonymity,
das Passwort verlässt den Server nicht). Die Funktion ist derzeit **aus**.

Das ist der billigste Punkt auf dieser Liste: **ein Schalter im Dashboard**, keine
Migration, kein Code, weder in der App noch auf der Website. Betroffen sind beide
Oberflächen gleichermassen, weil beide dieselbe Auth-Instanz benutzen —
Registrierung und Passwort-Reset laufen über die Website, also profitiert die App
unmittelbar mit.

**Wo genau** (am 2026-08-28 in der Supabase-Doku nachgesehen, nicht aus dem
Gedächtnis — eine frühere Fassung dieses Dokuments nannte fälschlich
„Authentication → Policies"):

> Authentication → Sign In / Providers → Email → **„Prevent use of leaked passwords"**
>
> Direktlink: `/dashboard/project/jqpfuotwsgnqihspsmmf/auth/providers?provider=Email`

Das ist **dieselbe Seite**, auf der laut `CLAUDE.md` schon die „Email OTP Length" auf
8 gestellt wurde — wer den Schalter sucht, war also bereits dort.

**Voraussetzung:** Leaked Password Protection gibt es erst ab dem **Pro-Plan**. Am
2026-08-28 geprüft: die Organisation `Blank0371's Org` läuft auf `pro`, die Funktion
steht also zur Verfügung.

Einzige Nebenwirkung: Nutzer mit einem in Leaks bekannten Passwort bekommen beim
Registrieren oder Zurücksetzen eine Absage und müssen ein anderes wählen. Für eine
Anwendung, hinter der Dienstpläne und Kontaktdaten von Angestellten liegen, ist das
der richtige Tausch.

---

## Nachtrag: nicht Backend, aber verwandt

Drei Punkte aus demselben Durchgang, die **im Website-Repo** liegen und dort bereits
behandelt sind — hier nur, damit sie beim Gegenlesen nicht doppelt gemeldet werden:

- **`sharp` schleppt vier High-Severity-CVEs aus libvips** (CVE-2026-33327/33328,
  CVE-2026-35590/35591). Transitiv über Next 15.5.22, ausschliesslich zur Bauzeit für
  `next/og`. Es gibt keine hochgeladenen Bilder, also keine fremden Daten im Decoder.
  Der von npm angebotene Fix erzwingt `next@16` und damit einen Breaking Change; wir
  warten stattdessen auf einen 15.x-Patch. **Für die App nur relevant, falls dort
  ebenfalls `sharp` in der Kette hängt** — das wäre kurz zu prüfen.

- **Gekündigte Abos gewährten weiter vollen Zugang.** Am 2026-08-28 in der Website
  behoben (`ermittleStandFuer()` und `pruefeSperre()` behandeln `gekuendigt` jetzt wie
  „kein Abo"). Rein website-seitig; die App hat keine Abo-Sperre und soll auch keine
  bekommen — die Frage, ob unbezahlte Betriebe in der App eingeschränkt werden, ist
  weiterhin offen und ausdrücklich nicht von der Website aus zu entscheiden.

- **Der Stripe-Kunde wurde über die E-Mail-Adresse gesucht.** Ebenfalls am
  2026-08-28 behoben: `sucheKunde()` geht jetzt zuerst über die gespeicherte
  `betrieb_abonnements.stripe_customer_id` und nur ersatzweise über die Adresse.
  Vorher hätte eine geänderte Anmelde-Adresse dazu geführt, dass der bestehende
  Kunde nicht mehr gefunden wird — und damit, nach Ablauf des
  24-Stunden-Idempotenzschlüssels, zu einem **zweiten Abonnement neben dem
  laufenden**.

  **Für die App relevant, falls sie je selbst mit Stripe spricht:** die Adresse ist
  kein stabiler Schlüssel, die `stripe_customer_id` schon. Nach heutigem Stand ruft
  die App Stripe nirgends auf, der Punkt ist also reine Vorsorge.
