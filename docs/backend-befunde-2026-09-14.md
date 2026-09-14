# Backend-Befunde 2026-09-14: Löschung nach Vertragsende — Umsetzungsvorschlag

**Teile A und D an den App-Entwickler, Teile B und C für dieses Repo.** Alle
Angaben am 2026-09-14 gegen die Live-DB (`jqpfuotwsgnqihspsmmf`) geprüft.

> **Stand 2026-09-14, später am Tag: Teil A ist eingespielt — von hier aus, auf
> ausdrückliche Anweisung der Betreiberin**, entgegen der sonst geltenden Regel
> in `.claude/rules/supabase.md`. Vier Migrationen, im Migrationsverlauf des
> Projekts sichtbar:
>
> | Migration | Inhalt |
> | --------- | ------ |
> | `loeschung_a1_abo_beendet_am` | Schema `private`, Spalte `beendet_am`, Trigger `trg_abo_beendet_am` |
> | `loeschung_a2_zustimmungsarchiv_und_loeschfunktion` | `private.zustimmungsarchiv` samt zwei Triggern, `private.betrieb_endgueltig_loeschen()` |
> | `loeschung_a3_taeglicher_job` | `private.loeschprotokoll`, View `private.faellige_loeschungen`, `private.betriebe_aufraeumen()`, Cron `betriebe-aufraeumen` (03:30 UTC) |
> | `loeschung_a4_betrieb_vertrag_beendet` | `public.betrieb_vertrag_beendet()`, nur für `authenticated` |
>
> **Nicht getestet** — Entscheidung der Betreiberin. Die erste echte Löschung
> ist der Test; scheitert sie, steht der Fehler in `private.loeschprotokoll`,
> und der Betrieb bleibt unangetastet (Subtransaktion). Nach der ersten
> fälligen Löschung also dort nachsehen.
>
> Die Entscheidungen unten sind gefallen, siehe „Entschieden am 2026-09-14".
>
> **Teile B und C sind gebaut** (2026-09-14, noch nicht deployt):
> `src/app/api/cron/testphasen-beenden/route.ts` + `beendeUeberfaelligePausen()`
> in `src/lib/stripe.ts` + `vercel.json`; `pruefeVertragsende()` in
> `src/lib/dashboard/zugang.ts` + `src/app/dashboard/beendet/page.tsx`. Wirksam
> erst mit Deploy **und** gesetztem `CRON_SECRET` in Vercel. Einzelheiten in
> `CLAUDE.md`, „Änderung vom 2026-09-14: Vertragsende sperrt alle".
> **Teil D (App) ist offen.**

Das ist die Fortsetzung von `backend-befunde-2026-09-13.md`, Punkte 5 und 6.
Dort steht, **dass** nichts löscht. Hier steht, **wie** es gehen könnte — und
warum ein einfaches `DELETE FROM betriebe` dafür nicht reicht.

---

## Ausgangslage

**Versprochen** (AGB § 5 Abs. 3, § 6 Abs. 2 und 4; Datenschutzerklärung 15.3):

| Fall | Zugang | Daten |
| ---- | ------ | ----- |
| Vertrag endet (Kündigung, Nichtzahlung, Allein-Chef löscht Konto) | endet mit dem Vertrag | 30 Tage Export auf Anfrage, dann gelöscht |
| Testphase ohne Zahlungsmittel abgelaufen | nur Verwaltung darf gesperrt werden | 90 Tage fortsetzbar, danach Vertragsende und **sofortige** Löschung |

**Tatsächlich:**

- Der Webhook setzt `betrieb_abonnements.status` auf `gekuendigt` bzw.
  `pausiert`. Sonst passiert nichts. `cron.job` enthält nur
  `cleanup-unconfirmed-users`; keine Funktion löscht aus `betriebe`.
- Im Web-Dashboard wird nur der Chef umgeleitet (`src/lib/dashboard/zugang.ts:114`
  kehrt für alle anderen sofort zurück). **Angestellte behalten den Zugang
  unbegrenzt** — das widerspricht AGB § 6 Abs. 2.
- Die App fragt den Abo-Status **überhaupt nicht** ab (`QuickTeamMobile/src`
  enthält `betrieb_abonnements` nirgends ausser in `legalDocs.ts`). Dort
  arbeitet nach Vertragsende auch der Chef ungehindert weiter.
- Pausierte Abos bleiben bei Stripe ewig `paused`; nichts beendet sie nach 90
  Tagen.
- `betrieb_abonnements` hat keine Spalte für „seit wann beendet".
  `aktualisiert_am` taugt nicht dafür: der Webhook schreibt die Spalte bei
  **jedem** Abo-Ereignis, auch beim `incomplete`-Versuch eines Neuabschlusses,
  der den Status gar nicht ändert. Die Frist fiele dadurch still zurück auf null.

Derzeit steht kein Betrieb auf `gekuendigt` oder `pausiert` — es ist also noch
nichts überfällig. Die erste echte Kündigung nach dem Start setzt die Uhr in
Gang.

---

## Überblick

```
Stripe                     Webhook (dieses Repo)        Datenbank (App-Entwickler)
------                     ---------------------        --------------------------
Abo gekündigt ───────────► status = gekuendigt ───────► Trigger setzt beendet_am
Testphase ohne Karte ────► status = pausiert ─────────► Trigger setzt beendet_am
                                                         │
B: Cron hier kündigt       ◄── nach 90 Tagen pausiert    │
   pausierte Abos bei ─────► status = gekuendigt ───────► beendet_am bleibt stehen
   Stripe                                                │
                                                         ▼
                                            A3: Job täglich, beendet_am + 30 Tage
                                                → A2: betrieb_endgueltig_loeschen()
```

Die Aufteilung folgt der bestehenden Grenze: an Stripe schreibt nur dieses Repo
(ohne `service_role`), in das Schema nur der App-Entwickler.

---

## Teil A — Datenbank (App-Entwickler)

### A1. `beendet_am` samt Trigger

```sql
alter table public.betrieb_abonnements add column beendet_am timestamptz;

create or replace function public.setze_abo_beendet_am()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status in ('gekuendigt', 'pausiert') then
    if old.status in ('gekuendigt', 'pausiert') and old.beendet_am is not null then
      new.beendet_am := old.beendet_am;   -- Uhr läuft weiter, wird nie neu gestellt
    else
      new.beendet_am := coalesce(new.aktualisiert_am, now());
    end if;
  else
    new.beendet_am := null;               -- wieder zahlend: Uhr aus
  end if;
  return new;
end $$;

create trigger trg_abo_beendet_am
  before update on public.betrieb_abonnements
  for each row execute function public.setze_abo_beendet_am();

-- Bestand (derzeit 0 Zeilen, der Trigger füllt den Wert):
update public.betrieb_abonnements set aktualisiert_am = aktualisiert_am
 where status in ('gekuendigt', 'pausiert');
```

Warum ein Trigger und nicht der Webhook: so gilt die Regel für jeden Schreiber,
auch für eine Korrektur von Hand. Der Webhook muss dafür nicht geändert werden.
`aktualisiert_am` ist dort die **Ereigniszeit bei Stripe**, nicht die Zustellzeit.

So verhält sich die Uhr in den bekannten Fällen:

| Übergang | `beendet_am` |
| -------- | ------------ |
| `aktiv` → `gekuendigt` | Zeitpunkt der Kündigung |
| `trial` → `pausiert` | Ende der Testphase |
| `pausiert` → `gekuendigt` | **bleibt** Ende der Testphase |
| `gekuendigt` + `incomplete`-Neuabschluss (Status unverändert) | bleibt |
| `gekuendigt` → `gekuendigt` (`incomplete_expired`) | bleibt |
| `pausiert`/`gekuendigt` → `aktiv` | `null` |

Dass `pausiert` → `gekuendigt` die Uhr **nicht** neu stellt, ist der Kern: die
Kündigung nach 90 Tagen (Teil B) führt so ohne weitere Wartezeit zur Löschung,
wie es § 5 Abs. 3 verlangt. Die Kehrseite steht unter „Offene Entscheidungen", 2.

### A2. `betrieb_endgueltig_loeschen(p_betrieb_id)`

Ein einzelnes `DELETE FROM betriebe` scheitert nach den Definitionen an drei
Stellen:

1. **`RESTRICT` auf `rollen`**, sofort geprüft, auch wenn die verweisenden Zeilen
   im selben Statement noch kaskadiert würden: `mitarbeiter_rollen`,
   `schicht_zuweisungen`, `schicht_instanz_mindestbesetzung`,
   `schicht_vorlage_mindestbesetzung`. Jeder Betrieb, in dem eine Rolle benutzt
   wird, bleibt damit hängen.
2. **`benachrichtigungen` und `einladungen` hängen nicht an `betriebe`**, sondern
   mit `NO ACTION` an `mitarbeiter` (bzw. `schichttausch_anfragen`). Sie
   werden nie mitgelöscht und blockieren das Löschen der Mitarbeiter-Zeilen.
3. **`trg_audit_instanzen` / `trg_audit_zuweisungen`** (AFTER DELETE) schreiben
   für jede gelöschte Schicht eine Zeile in `plan_aenderungen` — mit der
   `betrieb_id` des Betriebs, der in diesem Moment schon gelöscht ist. Das ergibt
   eine FK-Verletzung.

`pruefe_letzter_chef()` ist dagegen **kein** Hindernis: die Funktion lässt
das Löschen durch, wenn der Betrieb selbst nicht mehr existiert — für genau
diesen Fall gebaut. Deshalb darf `mitarbeiter` auch **nicht** vorab von Hand
gelöscht werden, sondern nur über die Kaskade.

Vorgeschlagene Reihenfolge:

```sql
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.betrieb_endgueltig_loeschen(p_betrieb_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_logins uuid[];
begin
  if p_betrieb_id = '3a1d698e-2a17-4612-8acd-7f3aa90b5153' then
    raise exception 'Testbetrieb 12 ist ein Fixture und wird nie gelöscht';
  end if;

  select coalesce(array_agg(distinct auth_id), '{}') into v_logins
    from mitarbeiter where betrieb_id = p_betrieb_id and auth_id is not null;

  -- 1. Was nicht an betriebe kaskadiert oder per RESTRICT/NO ACTION blockiert
  delete from benachrichtigungen    where betrieb_id = p_betrieb_id;  -- nimmt aufgaben, gelesen, anhaenge, umfrage_*, ausschreibung_bedarf mit
  delete from aufgaben              where betrieb_id = p_betrieb_id;  -- Reste; FK auf betriebe ist NO ACTION
  delete from benachrichtigung_gelesen where betrieb_id = p_betrieb_id;
  delete from umfrage_stimmen       where betrieb_id = p_betrieb_id;
  delete from umfrage_optionen      where betrieb_id = p_betrieb_id;
  delete from nachricht_anhaenge    where betrieb_id = p_betrieb_id;
  delete from einladungen           where betrieb_id = p_betrieb_id;
  delete from mitarbeiter_rollen    where betrieb_id = p_betrieb_id;
  delete from mitarbeiter_schicht_tagesvorlieben where betrieb_id = p_betrieb_id;
  delete from mitarbeiter_schicht_vorlieben      where betrieb_id = p_betrieb_id;
  delete from schicht_vorlage_mindestbesetzung   where betrieb_id = p_betrieb_id;

  -- 2. Schichten, solange der Betrieb noch steht — die Audit-Zeilen landen
  --    in plan_aenderungen und gehen in Schritt 3 mit
  delete from schicht_instanzen     where betrieb_id = p_betrieb_id;  -- nimmt zuweisungen, tausch, verfuegbarkeiten, mindestbesetzung, notizen mit

  -- 3. Der Rest kaskadiert: mitarbeiter (→ urlaub, abwesenheit, prefs),
  --    rollen, vorlagen, zyklen, notfaelle, einstellungen, abonnements,
  --    zustimmungen, plan_aenderungen
  delete from betriebe where id = p_betrieb_id;

  -- 4. Logins ohne verbleibende Anstellung (siehe Offene Entscheidungen, 1)
  delete from auth.users u
   where u.id = any(v_logins)
     and not exists (select 1 from mitarbeiter m where m.auth_id = u.id);
end $$;

revoke all on function private.betrieb_endgueltig_loeschen(uuid) from public, anon, authenticated;
```

**Nicht in `public` anlegen.** Eine SECURITY-DEFINER-Funktion in `public` ist
über PostgREST für jeden angemeldeten Nutzer aufrufbar; das `revoke` ist die
zweite Sicherung, nicht die erste. `auth.users` direkt zu löschen hat
Vorbild in `cleanup_unconfirmed_users()` und `konto_selbst_loeschen()`;
`push_tokens`, Sitzungen und Identitäten kaskadieren von dort.

Storage ist derzeit nicht betroffen: `storage.objects` und
`nachricht_anhaenge` sind leer, es gibt keinen Bucket. Sobald Anhänge echte
Dateien bekommen, müssen die über die Storage-API mit gelöscht werden — ein
SQL-Delete auf `storage.objects` entfernt die Datei nicht.

**Die Reihenfolge ist aus den Definitionen abgeleitet, nicht ausgeführt.**
Vor dem ersten Einsatz auf einem Supabase-Branch prüfen, siehe „Test".

### A3. Der tägliche Job

```sql
create table private.loeschprotokoll (
  betrieb_id   uuid        not null,
  status       text        not null,
  beendet_am   timestamptz not null,
  ausgefuehrt  timestamptz not null default now(),
  fehler       text                                  -- null = gelöscht
);

create or replace view private.faellige_loeschungen as
select betrieb_id, status, beendet_am
  from public.betrieb_abonnements
 where status = 'gekuendigt'
   and beendet_am < now() - interval '30 days'
   and aktualisiert_am < now() - interval '24 hours'   -- kein Neuabschluss in der Schwebe
   and betrieb_id <> '3a1d698e-2a17-4612-8acd-7f3aa90b5153';

create or replace function private.betriebe_aufraeumen()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in select * from private.faellige_loeschungen loop
    begin
      perform private.betrieb_endgueltig_loeschen(r.betrieb_id);
      insert into private.loeschprotokoll (betrieb_id, status, beendet_am)
      values (r.betrieb_id, r.status, r.beendet_am);
    exception when others then
      insert into private.loeschprotokoll (betrieb_id, status, beendet_am, fehler)
      values (r.betrieb_id, r.status, r.beendet_am, sqlerrm);
    end;
  end loop;
end $$;

select cron.schedule('betriebe-aufraeumen', '30 3 * * *',
                     $$select private.betriebe_aufraeumen()$$);
```

Drei Punkte, die leicht durchrutschen:

- **Nur `gekuendigt` wird gelöscht, nie `pausiert`.** Ein pausiertes Abo lebt bei
  Stripe noch und liesse sich wieder aufnehmen, dann würde für einen gelöschten
  Betrieb abgebucht. Pausierte Betriebe erreichen die Löschung nur über Teil B.
- **24 Stunden Karenz** nach der letzten Webhook-Änderung. Ein Neuabschluss
  nach Kündigung entsteht `incomplete` und schreibt dabei `aktualisiert_am`,
  aber keinen Status. Wer an Tag 29 neu abschliesst, darf an Tag 30 nicht
  gelöscht werden, während die Zahlung läuft. `incomplete` entscheidet sich
  nach spätestens 23 Stunden.
- **Ein Fehler hält die übrigen nicht auf.** Der `begin … exception`-Block ist
  eine Subtransaktion je Betrieb; der Fehler steht im Protokoll statt den
  ganzen Lauf zurückzurollen. `betrieb_id` im Protokoll ist nach der Löschung
  kein Personenbezug mehr, belegt aber, dass die Frist eingehalten wurde.

**Erst Trockenlauf.** Den Cron-Eintrag erst anlegen, wenn die View einige Wochen
lang von Hand angesehen wurde und der Branch-Test durch ist. Zusätzlich lohnt
eine Alarm-Abfrage für den Fall, dass Teil B ausfällt:

```sql
select betrieb_id from public.betrieb_abonnements
 where status = 'pausiert' and beendet_am < now() - interval '100 days';
```

### A4. `betrieb_vertrag_beendet(p_betrieb_id)` für Teil C und D

Angestellte können `betrieb_abonnements` nicht lesen (nur
`abonnement_select_chef`). Die Tore brauchen deshalb eine schmale RPC:

```sql
create or replace function public.betrieb_vertrag_beendet(p_betrieb_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_betrieb_id in (select meine_betriebe())
     and exists (select 1 from betrieb_abonnements
                  where betrieb_id = p_betrieb_id and status = 'gekuendigt');
$$;
```

Für Nicht-Mitglieder liefert sie immer `false`, gibt also nichts über fremde
Betriebe preis. **Nur `gekuendigt`, nicht `pausiert`**: während der Pause darf
laut § 5 Abs. 3 nur die Verwaltung gesperrt werden, der Dienstplan der
Angestellten läuft weiter.

---

## Teil B — Pausierte Abos nach 90 Tagen beenden (dieses Repo)

Stripe beendet ein pausiertes Abo nie von selbst. Vorschlag: ein täglicher
Vercel-Cron.

- Route `src/app/api/cron/testphasen-beenden/route.ts`, `runtime = "nodejs"`,
  prüft `Authorization: Bearer ${CRON_SECRET}` (Vercel schickt ihn mit) und endet
  sonst mit 401.
- `vercel.json` (existiert noch nicht):
  `{ "crons": [{ "path": "/api/cron/testphasen-beenden", "schedule": "0 2 * * *" }] }`
  — eine Stunde vor dem DB-Job, damit derselbe Tag noch greift.
- Ablauf: pausierte Abos bei Stripe auflisten (`subscriptions.list` mit Status
  `paused`, automatisch paginiert). Für jedes mit `metadata.betrieb_id` und
  `trial_end` älter als 90 Tage `kuendigeAbo()` aus `src/lib/stripe.ts`, mit
  `cancellation_details.comment` „90 Tage pausiert, AGB § 5 Abs. 3".
  Der Webhook schreibt daraufhin `gekuendigt`, `beendet_am` bleibt beim Ende der
  Testphase (A1), und der DB-Job löscht beim nächsten Lauf.
- **Braucht nur `STRIPE_SECRET_KEY`.** Keine Datenbank, kein `service_role`,
  die Regel aus `CLAUDE.md` bleibt unberührt. Die Frist kommt aus Stripes
  `trial_end`, nicht aus unserer Zeile.
- Vor dem Bau gegen die aktuelle Stripe-Doku prüfen, dass `status: "paused"` als
  Listenfilter unterstützt wird; sonst `subscriptions.search`.

Nebenbei: der Kommentar am Zweig `paused` in `api/stripe/webhook/route.ts:138-146`
(„Unser Checkout nimmt die Karte sofort, der Fall ist damit ausgeschlossen")
ist seit dem Stepper vom 2026-08-19 falsch. `pausiert` ist der Normalfall
einer abgelaufenen Testphase ohne Karte.

---

## Teil C — Angestellte im Web-Dashboard sperren (dieses Repo, wartet auf A4)

In `pruefeSperre()` (`src/lib/dashboard/zugang.ts:114`) statt der frühen Rückkehr
für Nicht-Chefs:

- `rpc('betrieb_vertrag_beendet', { p_betrieb_id: position.betriebId })`, bei
  `true` Weiterleitung auf eine neue Seite `/dashboard/beendet`.
- Die Seite liegt **neben** `(arbeit)`, wie `dashboard/wechseln` — sonst
  leitete das Tor auf sich selbst um. Inhalt: der Betrieb nutzt QuickTeam nicht
  mehr, bei mehreren Anstellungen ein Link auf `/dashboard/wechseln`, sonst
  Abmelden. Texte ins Wörterbuch, nicht ins JSX.
- Ohne A4 nicht baubar: eine Angestellte bekommt aus `betrieb_abonnements`
  keine Zeile, und „keine Zeile" heisst nicht „gekündigt".

Wie die Chef-Sperre ist das eine Sperre der Oberfläche, keine RLS. Wer
die API direkt anspricht, liest weiter. Das gilt heute schon für Chefs und ist
bis zur Löschung nach 30 Tagen vertretbar; eine Durchsetzung in allen Policies
wäre ein erheblich grösserer Umbau.

## Teil D — Die App (App-Entwickler)

Die App kennt den Abo-Status nicht. Vorschlag, parallel zu C: nach der Auswahl
des Betriebs `betrieb_vertrag_beendet` aufrufen und bei `true` für **alle**
Rollen einen Sperrbildschirm zeigen; der Chef bekommt dort einen Link auf die
Website zum Neuabschluss. Ob die App bei `pausiert` zusätzlich die Verwaltung
des Chefs sperrt, wie die Website es tut, ist eine Produktfrage; die AGB
erlauben es, verlangen es aber nicht.

---

## Entschieden am 2026-09-14 (Betreiberin)

1. **Logins werden mitgelöscht**, sobald ihnen keine Anstellung mehr bleibt —
   Chefs wie Beschäftigte. So eingespielt.
2. **Kündigung während der Pause stellt die Uhr nicht neu.** Überraschte Kunden
   sind in Kauf genommen.
3. **Zustimmungsnachweise bleiben erhalten** — nur AGB und AVV, bis zum Ende des
   dritten Kalenderjahres nach Vertragsende. Umgesetzt anders als unten zunächst
   skizziert: **kopiert wird beim Zustimmen, nicht beim Löschen**
   (`trg_zustimmung_archivieren`, AFTER INSERT auf `rechtliche_zustimmungen`).
   Bis zur Löschung kann die zustimmende Person ihr Konto längst gelöscht haben;
   dann ist `auth_id` NULL und das Profil anonymisiert, und eine Kopie beim
   Löschen fände keinen Namen mehr. Das Archiv hält Betriebsname und -land, Name
   und E-Mail der Person, Dokument, Fassung, Sprache, `inhalt_hash`, Zeitpunkt.
   Die Frist setzt `trg_betrieb_befriste_zustimmungsarchiv` (BEFORE DELETE auf
   `betriebe`, also gleich auf welchem Weg der Betrieb verschwindet) als
   1. Januar des vierten Jahres nach `beendet_am`; der tägliche Job räumt ab.
   Die 5 bestehenden Zustimmungen sind nachgetragen, Name und E-Mail nach dem
   Stand vom 2026-09-14.
4. **Datenschutzerklärung angepasst und Fassung erhöht** (`2026-09-14-draft`),
   Ziffern 5.2, 5.3, 15 und 15.3, siehe `docs/rechtliches/legals/README.md`,
   „Amendment 2026-09-14". Die Kopie in der App ist damit wieder veraltet.

Zur Einordnung, was vorher hier als offen stand:

## Offene Entscheidungen (Betreiberin, teils Anwalt) — Stand vor der Entscheidung

1. **Logins mitlöschen?** A2 löscht `auth.users` von Personen, die danach
   nirgends mehr angestellt sind. Ein Login ohne Betrieb hat keinen Zweck mehr.
   Ziffer 15.3 nennt aber nur „alle Daten des Betriebs, einschliesslich der
   Profile der Mitarbeitenden"; ob Logins darunter fallen, sollte der Text
   ausdrücklich sagen. **Empfehlung:** löschen und einen Halbsatz ergänzen.
2. **Kündigung während der Pause.** Weil `pausiert` → `gekuendigt` die Uhr
   nicht neu stellt, wird ein Kunde, der an Tag 45 der Pause im Portal kündigt,
   beim nächsten Lauf gelöscht (Ende Testphase + 30 Tage liegt schon zurück).
   Das deckt AGB § 6 Abs. 2 („Wirkung zum Ende der Testphase") mit Abs. 4, ist
   für den Kunden aber überraschend. Die Uhr neu zu stellen ginge nur, wenn
   sich die eigene 90-Tage-Kündigung (B) von der des Kunden unterscheiden
   liesse, und würde § 5 Abs. 3 dann um 30 Tage überziehen. **Empfehlung:** so
   lassen.
3. **Zustimmungsnachweise** (09-13, Punkt 6). Mit dem Job wird ihr Verlust
   real. Muss **vor** dem Einschalten entschieden werden. Möglich wäre, vor
   Schritt 3 in A2 Fassung, Zeitpunkt und Betriebsname in eine Archivtabelle
   ohne Mitarbeiterbezug zu kopieren, mit eigener Frist von 3 Jahren.
4. **Vorwarnung per Mail** einige Tage vor der Löschung — nicht versprochen,
   aber freundlich. Bräuchte einen Mailversand aus der DB oder aus B.
5. **Stripe-Kunde** bleibt bestehen. Stripe ist eigener Verantwortlicher und
   hält die Rechnungen ohnehin aufbewahrungspflichtig. Kein Handlungsbedarf.

## Test

Auf einem Supabase-Branch, nicht in der Live-DB:

1. Wegwerfbetrieb mit **jeder** betroffenen Tabelle befüllen: benutzte Rolle,
   Vorlage mit Mindestbesetzung, Zyklus mit Instanzen und Zuweisungen,
   Tauschanfrage samt Benachrichtigung, Ankündigung mit Umfrage und Checkliste,
   Urlaub, Einladung, Vorlieben.
2. Gegenprobe: `delete from betriebe where id = …` muss scheitern. Sonst ist
   die Begründung in A2 falsch und die Funktion unnötig kompliziert.
3. `betrieb_endgueltig_loeschen()` ausführen; danach in **allen** 29 Tabellen
   mit `betrieb_id` null Zeilen für den Betrieb (dazu `benachrichtigung_prefs`
   über `mitarbeiter_id`), Login weg, Login mit zweiter Anstellung noch da.
4. Stripe-Testuhr: Testphase ohne Karte → `pausiert` → 91 Tage vor → B kündigt
   → Webhook `gekuendigt`, `beendet_am` = Testphasenende → Job löscht.
5. Stripe-Testuhr: Kündigung → an Tag 29 Neuabschluss, bezahlt → `aktiv`,
   `beendet_am` = `null`, nichts gelöscht.

## Reihenfolge der Einführung

Ursprünglich vorgeschlagen: A1 sofort, A2/A3 erst nach Branch-Test, Cron
zuletzt. **Tatsächlich** am 2026-09-14 A1–A4 samt Cron in einem Zug, ohne
Test. Offen, in dieser Reihenfolge:

1. ~~B~~ und ~~C~~ gebaut am 2026-09-14. Bis zum Deploy mit `CRON_SECRET`:
   pausierte Abos nach 90 Tagen in Stripe von Hand kündigen.
2. **D** (App) — A4 steht bereit.
3. Alarm-Abfrage aus A3 (pausiert > 100 Tage) irgendwo regelmässig ansehen; sie
   schlägt an, wenn der Cron still ausfällt.
