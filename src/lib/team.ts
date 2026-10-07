import type { createClient } from "@/lib/supabase/server";
import { telefonZiffern } from "@/lib/validierung";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Lesezugriffe für Schritt 3 — Rollen und eingeladene Mitarbeiter.
 *
 * Am 2026-08-23 gegen die Live-DB und gegen `manager.tsx` im App-Repo
 * abgeglichen. Die Konventionen der App gelten hier, weil beide Seiten in
 * dieselben Tabellen schreiben:
 *
 *   · `rollen` trägt ein `aktiv`-Flag; die App legt mit `aktiv = true` an
 *     und blendet mit `aktiv = false` aus, statt zu löschen
 *   · `mitarbeiter_rollen` braucht alle drei Spalten
 *     (`betrieb_id, mitarbeiter_id, rolle_id`)
 *   · der Chef liest den Bestand direkt aus `mitarbeiter` — genau das tut
 *     `manager.tsx` auf seinem Chef-Screen ebenfalls
 */

export type Rolle = { id: string; name: string };

export type Eingeladener = {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  status: string;
  rollen: string[];
};

/** Nur aktive Rollen — ausgeblendete sind für den Wizard nicht vorhanden. */
export async function holeRollen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Rolle[]> {
  const { data, error } = await supabase
    .from("rollen")
    .select("id, name")
    .eq("betrieb_id", betriebId)
    .eq("aktiv", true)
    .order("name");

  if (error) {
    console.error(`[team] rollen(${betriebId}): ${error.message}`);
    return [];
  }
  return data ?? [];
}

/**
 * Die Mitarbeiter dieses Betriebs ohne den Chef selbst.
 *
 * `rolle_typ <> 'chef'` blendet die eigene Zeile aus, die
 * `registriere_betrieb` beim Anlegen erzeugt hat. Sie im Wizard
 * aufzulisten wäre verwirrend — man lädt sich nicht selbst ein — und sie
 * versehentlich löschbar zu machen wäre gefährlich: der Trigger
 * `pruefe_letzter_chef` verhindert das zwar, aber erst mit einem Fehler,
 * den niemand einordnen kann.
 *
 * `anonymisiert_am is null` spiegelt die Bedingung der Lese-Policy; eine
 * anonymisierte Person käme ohnehin nicht zurück, aber die Absicht steht
 * so in der Abfrage statt nur in der Policy.
 */
export async function holeEingeladene(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Eingeladener[]> {
  const [leute, verknuepfungen] = await Promise.all([
    supabase
      .from("mitarbeiter")
      .select("id, vorname, nachname, email, telefon, status")
      .eq("betrieb_id", betriebId)
      .neq("rolle_typ", "chef")
      .is("anonymisiert_am", null)
      .order("nachname"),
    supabase
      .from("mitarbeiter_rollen")
      .select("mitarbeiter_id, rolle_id")
      .eq("betrieb_id", betriebId),
  ]);

  if (leute.error) {
    console.error(`[team] mitarbeiter(${betriebId}): ${leute.error.message}`);
    return [];
  }
  if (verknuepfungen.error) {
    console.error(`[team] mitarbeiter_rollen(${betriebId}): ${verknuepfungen.error.message}`);
  }

  const proPerson = new Map<string, string[]>();
  for (const eintrag of verknuepfungen.data ?? []) {
    const bisher = proPerson.get(eintrag.mitarbeiter_id) ?? [];
    bisher.push(eintrag.rolle_id);
    proPerson.set(eintrag.mitarbeiter_id, bisher);
  }

  return (leute.data ?? []).map((person) => ({
    ...person,
    rollen: proPerson.get(person.id) ?? [],
  }));
}

/**
 * Ist das hier derselbe Datensatz, der eben schon abgeschickt wurde?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Geprüft wird Name **und** Kontakt, nicht der Kontakt allein.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-07 reichte eine übereinstimmende E-Mail-Adresse, um
 * das Anlegen abzulehnen. Der Zweck war richtig und bleibt es: die
 * Datenbank hilft nicht, `mitarbeiter.email` hat **keinen**
 * UNIQUE-Constraint — `mitarbeiter_email_idx` ist ein gewöhnlicher Index
 * auf `(betrieb_id, lower(email))`, am 2026-09-07 in `pg_indexes`
 * nachgesehen. Ein doppelt abgeschicktes Formular, der Klassiker
 * „Klick, nichts passiert sichtbar, noch ein Klick", erzeugt sonst zwei
 * Einladungen an dieselbe Adresse.
 *
 * Die Prüfung war aber zu weit gefasst und verbot dabei etwas, das das
 * Datenmodell ausdrücklich vorsieht: **eine Adresse kann mehrere
 * Anstellungen tragen, auch im selben Betrieb.** `mitarbeiter` ist eine
 * Anstellungs- und keine Personentabelle; der Testzugang des
 * App-Entwicklers hält drei Zeilen in Testbetrieb 12 (Chef, Anna, Tim)
 * unter einer einzigen Adresse, und `holePositionen()` in
 * `src/lib/dashboard/position.ts` ist genau darauf ausgelegt. Ein
 * Familienbetrieb mit einer gemeinsamen Adresse ist derselbe Fall. Wer
 * das blockt, blockt eine Gestalt, die das übrige System überall sonst
 * annimmt — und gibt dafür keinen Ausweg.
 *
 * Der Doppelklick unterscheidet sich vom zweiten Profil an genau einer
 * Stelle: beim Doppelklick steht **auch derselbe Name** im Formular.
 * Zwei Menschen unter einer Adresse heissen verschieden. Verglichen wird
 * deshalb das ganze Paar. Der Schutz bleibt, die Sackgasse fällt weg.
 *
 * Verglichen wird so, wie `meine_einladungen()` sucht: E-Mail
 * kleingeschrieben, Telefon auf Ziffern reduziert. Namen ebenfalls ohne
 * Rücksicht auf Gross-/Kleinschreibung — „anna" und „Anna" sind derselbe
 * Doppelklick, nicht zwei Personen.
 */
export function schonEingeladen(
  bestand: readonly Eingeladener[],
  vorname: string,
  nachname: string,
  email: string | null,
  telefon: string | null,
): Eingeladener | null {
  const zielMail = email?.toLowerCase() ?? null;
  const zielZiffern = telefon ? telefonZiffern(telefon) : null;
  const zielName = `${vorname.trim().toLowerCase()} ${nachname.trim().toLowerCase()}`;

  return (
    bestand.find((person) => {
      const name = `${person.vorname.trim().toLowerCase()} ${person.nachname
        .trim()
        .toLowerCase()}`;
      if (name !== zielName) return false;

      if (zielMail && person.email?.toLowerCase() === zielMail) return true;
      if (
        zielZiffern &&
        person.telefon &&
        telefonZiffern(person.telefon) === zielZiffern
      ) {
        return true;
      }
      return false;
    }) ?? null
  );
}

/* ------------------------------------------------------------------ */
/* Schreibwege, die sich Wizard und Dashboard teilen                   */
/* ------------------------------------------------------------------ */

/**
 * Warum das hier steht und nicht zweimal daneben.
 *
 * Seit der Kursänderung vom 2026-08-26 verwalten zwei Oberflächen
 * dieselben Tabellen: der Einrichtungs-Stepper legt den Erstbestand an,
 * das Dashboard führt ihn fort. `CLAUDE.md` verlangt für zwei
 * Schreibwege auf dieselbe Tabelle genau eine Konvention — und die
 * billigste Art, sie zu halten, ist genau eine Implementierung.
 *
 * Die beiden Funktionen unten sind mehrstufige Löschungen ohne
 * gemeinsame Transaktion. Genau dort wäre eine zweite Fassung teuer:
 * sie würde nicht einfach anders aussehen, sondern in anderen Fällen
 * Daten verlieren.
 */

/**
 * Legt gesammelte Rollen in einem Zug an und gibt den vollständigen
 * Bestand zurück.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum der Wizard Rollen sammelt, statt sie sofort zu schreiben.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Entscheidung vom 2026-09-07. Bis dahin ging jede Rolle beim Klick auf
 * „Hinzufügen" unmittelbar in die Tabelle — und war damit **nicht mehr
 * wegzubekommen**: `rollen` hatte keine DELETE-Policy, RLS filterte das
 * DELETE still heraus, betroffen waren null Zeilen (siehe
 * `entferneRolle()` unten; die Policy gibt es seit 2026-10-06). Ausgerechnet der häufigste Handgriff der
 * Einrichtung — anlegen, vertippt, weg damit, neu anlegen — endete
 * deshalb in einer Rolle, die für immer in der Liste stand, und beim
 * zweiten Anlauf zusätzlich am UNIQUE-Constraint über den Namen.
 *
 * Solange nichts geschrieben ist, gibt es nichts zu löschen. Der Schritt
 * hält die Rollen deshalb im Zustand des Formulars und schreibt sie
 * gebündelt — ursprünglich die Kompensation für die fehlende Policy,
 * heute einfach der sparsamere Weg.
 *
 * **Geschrieben wird beim Weitergehen oder beim ersten Einladen — was
 * zuerst kommt.** Das Weitergehen ist der eigentliche Abschluss; die
 * Einladung muss aber ebenfalls flüssig sein, weil eine Rollenzuweisung
 * eine `rolle_id` braucht und ein Entwurf keine hat. Beides liegt hinter
 * dem Rollen-Editor: wer noch an den Rollen arbeitet, hat weder das eine
 * noch das andere getan, und genau dort greift das freie Entfernen.
 *
 * Idempotent: bereits vorhandene Namen werden übersprungen statt in den
 * UNIQUE-Constraint zu laufen. Das ist kein Luxus — wer aus Schritt 4
 * zurückkommt, bringt seine Entwürfe erneut mit.
 */
export async function schreibeRollen(
  supabase: SupabaseServerClient,
  betriebId: string,
  namen: readonly string[],
): Promise<Rolle[] | null> {
  const vorhanden = await holeRollen(supabase, betriebId);
  const bekannt = new Set(vorhanden.map((rolle) => rolle.name.toLowerCase()));

  /*
   * Auch innerhalb der Entwürfe entdoppeln: die Liste kommt aus einem
   * Formular und ist damit so vertrauenswürdig wie jedes Formularfeld.
   * Zwei gleiche Namen in einem Insert scheitern sonst am Constraint,
   * und zwar erst, nachdem der Rest schon geschrieben wäre.
   */
  const neue: string[] = [];
  for (const name of namen) {
    const schluessel = name.toLowerCase();
    if (bekannt.has(schluessel)) continue;
    bekannt.add(schluessel);
    neue.push(name);
  }

  if (neue.length === 0) return vorhanden;

  const { error } = await supabase
    .from("rollen")
    .insert(neue.map((name) => ({ betrieb_id: betriebId, name, aktiv: true })));

  if (error) {
    console.error(`[team] schreibeRollen(${betriebId}): ${error.message}`);
    return null;
  }

  return holeRollen(supabase, betriebId);
}

/** Was beim Entfernen einer Rolle herauskommen kann. */
export type RollenEntfernung =
  | { art: "ok" }
  /** Mindestens eine Person trägt die Rolle noch (`mitarbeiter_rollen`). */
  | { art: "zugewiesen" }
  /**
   * RLS hat das DELETE verschluckt: null Zeilen, kein Fehler. Seit
   * `rollen_delete_chef` (2026-10-06) heisst das „nicht Chef" oder „schon
   * weg" — vorher war es jeder Klick.
   */
  | { art: "gesperrt" }
  /** Eine Schichtvorlage oder Zuweisung hängt noch daran (FK RESTRICT). */
  | { art: "belegt" }
  | { art: "fehler" };

/**
 * Entfernt eine Rolle hart — aber nur, wenn niemand sie mehr trägt.
 *
 * **Kursänderung 2026-10-06 (auf Anweisung des Nutzers).** *Vorher*
 * löschte diese Funktion erst alle `mitarbeiter_rollen` der Rolle und
 * dann die Rolle, und schrieb die Zuweisungen zurück, wenn die Rolle
 * nicht wegging. *Jetzt* wird eine noch zugewiesene Rolle gar nicht
 * angefasst (`zugewiesen`): wer sie entfernen will, nimmt sie zuerst den
 * Personen weg. Damit entfällt auch die Kompensation — es wird nichts
 * gelöscht, was zurückgeschrieben werden müsste.
 *
 * Hart und nicht über `aktiv = false`, weil `UNIQUE (betrieb_id, name)`
 * das Flag nicht kennt: eine weich gelöschte „Küche" blockiert ihren
 * Namen für immer. Der weiche Weg der App bleibt im Dashboard als
 * „ausblenden" daneben stehen.
 *
 * Die Prüfung vorab ist eine Anzeigefrage, keine Sperre: zwischen Lesen
 * und Löschen kann jemand die Rolle zuweisen. Dann hält der FK
 * (`mitarbeiter_rollen` → `rollen`, ON DELETE RESTRICT) das Löschen auf,
 * und ein zweiter Blick entscheidet, welche Meldung stimmt. Dieselbe
 * RESTRICT-Regel gilt für Schichtvorlagen, geplante Schichten und
 * Zuweisungen (`belegt`).
 *
 * **Seit 2026-10-06 gibt es `rollen_delete_chef`** (`ist_chef(betrieb_id)`,
 * freigegebene Schema-Ausnahme, siehe `CLAUDE.md`). Vorher filterte RLS
 * jedes DELETE still heraus. `.select("id")` bleibt: null Zeilen ohne
 * Fehler heisst jetzt „nicht Chef" oder „schon weg" (`gesperrt`).
 */
export async function entferneRolle(
  supabase: SupabaseServerClient,
  betriebId: string,
  rolleId: string,
): Promise<RollenEntfernung> {
  const zugewiesen = async (): Promise<boolean | null> => {
    const { count, error } = await supabase
      .from("mitarbeiter_rollen")
      .select("mitarbeiter_id", { count: "exact", head: true })
      .eq("betrieb_id", betriebId)
      .eq("rolle_id", rolleId);
    if (error) {
      console.error(`[team] entferneRolle/lesen: ${error.message}`);
      return null;
    }
    return (count ?? 0) > 0;
  };

  const vorher = await zugewiesen();
  if (vorher === null) return { art: "fehler" };
  if (vorher) return { art: "zugewiesen" };

  /*
   * `schicht_ausschreibung_bedarf` ist die eine Stelle, die **nicht** auf
   * RESTRICT steht, sondern ON DELETE CASCADE: das Löschen ginge durch und
   * nähme einer laufenden Ausschreibung still ihre Zeile für diese Rolle.
   * Deshalb hier von Hand dieselbe Absage wie beim FK.
   */
  const { count: ausgeschrieben, error: ausschreibungFehler } = await supabase
    .from("schicht_ausschreibung_bedarf")
    .select("id", { count: "exact", head: true })
    .eq("betrieb_id", betriebId)
    .eq("rolle_id", rolleId);
  if (ausschreibungFehler) {
    console.error(`[team] entferneRolle/ausschreibung: ${ausschreibungFehler.message}`);
    return { art: "fehler" };
  }
  if ((ausgeschrieben ?? 0) > 0) return { art: "belegt" };

  const { data: geloescht, error } = await supabase
    .from("rollen")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("id", rolleId)
    .select("id");

  if (error) {
    console.error(`[team] entferneRolle: ${error.message}`);
    return (await zugewiesen()) ? { art: "zugewiesen" } : { art: "belegt" };
  }

  if (geloescht.length === 0) {
    console.error(
      `[team] entferneRolle: 0 Zeilen für ${rolleId} — nicht Chef oder schon entfernt`,
    );
    return { art: "gesperrt" };
  }

  return { art: "ok" };
}

/**
 * Entfernt eine Person aus dem Betrieb — erst ihre Rollen, dann sie
 * selbst.
 *
 * Die Reihenfolge ist vorgegeben: der Rollen-FK in `mitarbeiter_rollen`
 * ist ON DELETE RESTRICT, der Mitarbeiter-FK hat gar keine Regel.
 *
 * Anders als bei den Rollen gibt es hier eine DELETE-Policy
 * (`mitarbeiter_delete_chef`), das Löschen kommt also durch. Sie trägt
 * allerdings `auth_id IS DISTINCT FROM auth.uid()`: sich selbst kann
 * niemand entfernen, auch nicht als Chef. Das ist die einzige Sperre,
 * die den Betrieb davor bewahrt, seinen letzten Chef zu verlieren —
 * siehe `darfStatusAendern()`.
 */
export async function entferneMitglied(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
): Promise<boolean> {
  const { error: rollenFehler } = await supabase
    .from("mitarbeiter_rollen")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("mitarbeiter_id", mitarbeiterId);

  if (rollenFehler) {
    console.error(`[team] entferneMitglied/rollen: ${rollenFehler.message}`);
    return false;
  }

  const { data: geloescht, error } = await supabase
    .from("mitarbeiter")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("id", mitarbeiterId)
    .select("id");

  if (error) {
    console.error(`[team] entferneMitglied: ${error.message}`);
    return false;
  }

  if (geloescht.length === 0) {
    console.error(`[team] entferneMitglied: 0 Zeilen für ${mitarbeiterId}`);
    return false;
  }

  return true;
}
