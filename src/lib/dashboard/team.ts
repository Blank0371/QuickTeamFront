import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Das Team im laufenden Betrieb — anders als im Wizard.
 *
 * `holeEingeladene()` in `src/lib/team.ts` blendet mit
 * `rolle_typ <> 'chef'` bewusst die eigene Zeile aus: im Wizard lädt man
 * sich nicht selbst ein. Für die laufende Verwaltung ist genau das
 * falsch — ein Betrieb kann mehrere Chefs haben, und wer die Liste
 * seines Teams ansieht, erwartet alle darin. Deshalb eine eigene
 * Abfrage statt eines Parameters an der alten: die beiden Fragen sind
 * verschieden, auch wenn die Tabelle dieselbe ist.
 *
 * Sortiert wird nach Nachname wie in `manager.tsx`.
 */

export type Status = "eingeladen" | "aktiv" | "pausiert" | "inaktiv";

export const STATUS_REIHE: readonly Status[] = [
  "eingeladen",
  "aktiv",
  "pausiert",
  "inaktiv",
];

export const STATUS_TEXT: Record<Status, string> = {
  eingeladen: "Eingeladen",
  aktiv: "Aktiv",
  pausiert: "Pausiert",
  inaktiv: "Inaktiv",
};

export const STATUS_ERKLAERUNG: Record<Status, string> = {
  eingeladen: "Hat die Einladung noch nicht angenommen.",
  pausiert: "Vorübergehend nicht einplanbar, bleibt im Team.",
  inaktiv: "Arbeitet nicht mehr hier.",
  aktiv: "Wird ganz normal eingeplant.",
};

export function istStatus(wert: string): wert is Status {
  return (STATUS_REIHE as readonly string[]).includes(wert);
}

export type TeamMitglied = {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  rolleTyp: "chef" | "mitarbeiter";
  status: Status;
  /** IDs der zugewiesenen Rollen. */
  rollen: string[];
  /** Anstellungsdaten. `max_stunden_hart` fehlt bewusst — siehe `holeTeam()`. */
  anstellung: Anstellung;
};

/**
 * Die Vertragsfelder einer Anstellung.
 *
 * `ueberstundenSaldo` ist der **Anfangssaldo**, nicht der laufende
 * Stand: den rechnen App und Solver bei jedem Aufruf neu aus
 * (`ueberstunden_saldo` + Σ gearbeitet − soll über alle vollen Monate
 * bis `betriebs_einstellungen.abrechnung_bis`) und schreiben ihn nie
 * zurück. Vollständig in
 * `docs/spezifikation-anstellungsdaten-2026-09-08.md`, §3.
 */
export type Anstellung = {
  vertragTyp: string | null;
  /** Monatsstunden. Erfasst wird in Wochenstunden × 4,33. */
  sollStunden: number | null;
  toleranzUeberstunden: number;
  ueberstundenSaldo: number;
  urlaubsanspruchTage: number;
};

export type Rolle = { id: string; name: string; aktiv: boolean };

/**
 * Team samt Anstellungsdaten.
 *
 * **`max_stunden_hart` wird bewusst nicht gelesen.** Der DB-Trigger
 * `pruefe_zuweisung_constraints()` prüft die Spalte gegen die Summe der
 * ISO-Kalenderwoche, der Solver gegen die des Monats — kein
 * gespeicherter Wert erfüllt beide, und der Bestand ist durchgehend
 * monatlich, womit die Trigger-Prüfung bei keiner Zeile je feuert.
 * Solange das so ist, wäre eine Anzeige dieser Zahl eine Behauptung über
 * eine Grenze, die es nicht gibt. Gemeldet in
 * `docs/backend-befunde-2026-09-07.md`, Punkt 14.
 */
export async function holeTeam(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<TeamMitglied[]> {
  const [leute, verknuepfungen] = await Promise.all([
    supabase
      .from("mitarbeiter")
      /*
       * Eine einzige Zeichenkette, nicht zusammengesetzt: supabase-js
       * leitet den Zeilentyp aus dem **Literal** ab. Sobald hier ein
       * `+` steht, sieht der Typprüfer nur noch `string` und liefert
       * `GenericStringError` statt der Spalten — der Code übersetzt
       * dann nicht mehr, obwohl die Abfrage zur Laufzeit stimmte.
       */
      .select("id, vorname, nachname, email, telefon, rolle_typ, status, vertrag_typ, soll_stunden, toleranz_ueberstunden, ueberstunden_saldo, urlaubsanspruch_tage")
      .eq("betrieb_id", betriebId)
      .is("anonymisiert_am", null)
      .order("nachname"),
    supabase
      .from("mitarbeiter_rollen")
      .select("mitarbeiter_id, rolle_id")
      .eq("betrieb_id", betriebId),
  ]);

  if (leute.error) {
    console.error(`[dashboard/team] mitarbeiter: ${leute.error.message}`);
    return [];
  }
  if (verknuepfungen.error) {
    console.error(`[dashboard/team] rollen: ${verknuepfungen.error.message}`);
  }

  const proPerson = new Map<string, string[]>();
  for (const eintrag of verknuepfungen.data ?? []) {
    const bisher = proPerson.get(eintrag.mitarbeiter_id) ?? [];
    bisher.push(eintrag.rolle_id);
    proPerson.set(eintrag.mitarbeiter_id, bisher);
  }

  return leute.data.map((person) => ({
    id: person.id,
    vorname: person.vorname,
    nachname: person.nachname,
    email: person.email,
    telefon: person.telefon,
    rolleTyp: person.rolle_typ === "chef" ? "chef" : "mitarbeiter",
    status: istStatus(person.status) ? person.status : "inaktiv",
    rollen: proPerson.get(person.id) ?? [],
    anstellung: {
      vertragTyp: person.vertrag_typ,
      /*
       * PostgREST liefert `numeric` als Zeichenkette, nicht als Zahl —
       * die Genauigkeit von `numeric` passt nicht verlustfrei in ein
       * JS-`number`, also überlässt es die Entscheidung dem Aufrufer.
       * Ohne `Number()` verglichen und gerechnet würde „173" hier zu
       * String-Arithmetik führen.
       */
      sollStunden: person.soll_stunden === null ? null : Number(person.soll_stunden),
      toleranzUeberstunden: Number(person.toleranz_ueberstunden ?? 0),
      ueberstundenSaldo: Number(person.ueberstunden_saldo ?? 0),
      urlaubsanspruchTage: Number(person.urlaubsanspruch_tage ?? 25),
    },
  }));
}

/**
 * Schreibt die fünf Anstellungsfelder einer Person.
 *
 * Nur der Chef kommt hier durch — `mitarbeiter_update_chef` trägt
 * `ist_chef(betrieb_id)` als USING und WITH CHECK. Zusätzlich filtert
 * `.eq("betrieb_id", …)`: die `betrieb_id` stammt aus der aktiven
 * Position und nicht aus dem Formular, womit eine fremde
 * `mitarbeiter_id` ins Leere läuft, statt sich auf einen anderen Betrieb
 * auszuwirken.
 *
 * `.select("id")` ist nicht schmückend: ohne RETURNING liefert ein von
 * RLS weggefiltertes UPDATE `error: null` und null betroffene Zeilen —
 * ein Fehlschlag, der wie ein Erfolg aussieht. Dieselbe Falle wie bei
 * `entferneRolle()` in `src/lib/team.ts`.
 */
export async function speichereAnstellung(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
  daten: {
    vertrag_typ: string | null;
    soll_stunden: number | null;
    toleranz_ueberstunden: number;
    ueberstunden_saldo: number;
    urlaubsanspruch_tage: number;
  },
): Promise<{ ok: true } | { ok: false; grund: "rls" | "fehler" }> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .update(daten)
    .eq("betrieb_id", betriebId)
    .eq("id", mitarbeiterId)
    .select("id");

  if (error) {
    console.error(`[dashboard/team] speichereAnstellung: ${error.message}`);
    return { ok: false, grund: "fehler" };
  }
  if (data.length === 0) {
    console.error(`[dashboard/team] speichereAnstellung: 0 Zeilen für ${mitarbeiterId}`);
    return { ok: false, grund: "rls" };
  }
  return { ok: true };
}

/**
 * Alle Rollen, auch die ausgeblendeten.
 *
 * `holeRollen()` im Wizard filtert auf `aktiv = true`, weil dort nur
 * zählt, womit sich arbeiten lässt. Hier wird das Flag mitgeliefert:
 * die App löscht Rollen weich, und eine weich gelöschte Rolle blockiert
 * ihren Namen weiter (`UNIQUE (betrieb_id, name)` kennt `aktiv` nicht).
 * Wer sie nicht sieht, versteht die Fehlermeldung beim Neuanlegen nicht.
 */
export async function holeAlleRollen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Rolle[]> {
  const { data, error } = await supabase
    .from("rollen")
    .select("id, name, aktiv")
    .eq("betrieb_id", betriebId)
    .order("name");

  if (error) {
    console.error(`[dashboard/team] rollen: ${error.message}`);
    return [];
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Die Sperre gegen den verlorenen Betrieb                             */
/* ------------------------------------------------------------------ */

/**
 * Darf der Status dieser Person geändert werden?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Der Trigger, der das eigentlich verhindern sollte, ist nicht
 *  angehängt. Am 2026-08-26 im Katalog nachgesehen.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `public.pruefe_letzter_chef()` existiert als Funktion und wirft
 * „Der letzte aktive Chef eines Betriebs kann nicht degradiert oder
 * deaktiviert werden". `DOCUMENTATION.md` im App-Repo führt sie unter
 * den Triggern, die Integrität erzwingen. **Sie hängt an keiner
 * Tabelle** — `pg_trigger` kennt für `mitarbeiter` nur
 * `trg_mitarbeiter_spaltenschutz`.
 *
 * Ohne sie ist der Weg offen: `schuetze_mitarbeiter_spalten` lässt einen
 * Chef alles ändern, also auch den eigenen Status auf `inaktiv`. Danach
 * liefert `meine_betriebe()` nichts mehr (es filtert `status = 'aktiv'`),
 * `ist_chef()` ist überall falsch, und damit greift keine einzige
 * Schreib-Policy des Betriebs mehr. Der Betrieb wäre für alle
 * verschlossen und nur noch mit einem Eingriff in die Datenbank zu
 * retten.
 *
 * Ein Trigger wäre die richtige Stelle dafür — von hier aus wird das
 * Schema nicht geändert, also übernimmt es die Oberfläche: **Chef-Zeilen
 * bekommen keine Status-Steuerung.** Das ist strenger als nötig (bei
 * zwei Chefs wäre einer entbehrlich), aber der Preis dafür ist ein
 * Klick weniger, und der Preis des Gegenteils ist ein verlorener
 * Betrieb.
 *
 * Gemeldet gehört der fehlende Trigger trotzdem.
 */
export function darfStatusAendern(mitglied: TeamMitglied): boolean {
  return mitglied.rolleTyp !== "chef";
}

/**
 * Welche Statuswerte lassen sich von hier aus setzen?
 *
 * `eingeladen` fehlt bewusst: dorthin führt kein Weg zurück. Der Wert
 * bedeutet „hat die Einladung noch nicht angenommen", und angenommen
 * wird sie durch `einladung_annehmen()`, das `auth_id` setzt. Eine
 * Person nachträglich wieder auf `eingeladen` zu stellen, hiesse, eine
 * bereits verknüpfte Anmeldung zu behaupten, die es nicht mehr gibt.
 */
export const SETZBARE_STATUS: readonly Status[] = ["aktiv", "pausiert", "inaktiv"];
