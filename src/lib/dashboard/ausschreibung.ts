import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Offene Schichtausschreibungen — lesen und übernehmen.
 *
 * Referenz für die Logik: `schicht_ausschreibung_annehmen` (beide
 * Überladungen im Quelltext gelesen), `messages.tsx` und
 * `shift/[id].tsx` in der Expo-App, Recherche vom 2026-09-06.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Kapazität hier gerechnet wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die beiden Funktionen, aus denen der Zustand „frei zu übernehmen"
 * sonst stammt, sind unterschiedlich gründlich:
 *
 *   `schicht_ansehen`      prüft die Kapazität mit
 *                          (`count(zuweisungen) < benoetigt`, Zeile 80/81)
 *                          und liefert in `claim.roles` nur Rollen, die
 *                          man hat **und** die noch Platz haben.
 *   `kalender_schichten`   prüft sie **nicht**. Dort ist `open` wahr,
 *                          solange irgendeine nicht gelöschte
 *                          Ausschreibung für eine eigene Rolle
 *                          existiert — auch wenn der letzte Platz längst
 *                          weg ist.
 *
 * Für die Liste auf `/dashboard/mitteilungen` gibt es keine fertige
 * Funktion, also wird hier gerechnet: `benoetigt` minus der Zahl
 * bestehender Zuweisungen für dieselbe `(schicht_instanz_id, rolle_id)`.
 * Beide Tabellen sind dafür lesbar — `ausschr_bedarf_select` hängt nur
 * an `meine_betriebe()`, und `zuweisungen_select` trägt eigens den
 * Zweig `OR schicht_offen_ausgeschrieben(schicht_instanz_id)`, der die
 * Zuweisungen einer ausgeschriebenen Schicht unabhängig von den
 * Sichtbarkeits-Einstellungen freigibt. Dasselbe gilt für
 * `instanzen_select`, deshalb sind Datum und Uhrzeit lesbar.
 *
 * **Die Vorausberechnung ist eine Höflichkeit, keine Garantie.** Zwischen
 * Anzeige und Klick vergeht Zeit; die verbindliche Prüfung macht der RPC
 * unter einer Zeilensperre (`select … for update` auf den Bedarfssatz).
 * Wer zu spät klickt, bekommt `voll` — das ist der Normalfall und kein
 * Fehler.
 */

/**
 * Das Minimum, das ein Übernehmen-Knopf braucht: welche Rolle, wie sie
 * heisst, und — wenn bekannt — wie viele Plätze noch frei sind.
 *
 * `frei` ist optional, weil die beiden Quellen unterschiedlich viel
 * wissen. Der Lader unten rechnet die Zahl aus; `schicht_ansehen`
 * dagegen filtert volle Rollen bereits selbst heraus und gibt nur
 * `rolle_id` und `name` zurück. Eine erfundene 1 wäre dort schlechter
 * als gar keine Angabe — sie behauptete Genauigkeit, die es nicht gibt.
 */
export type UebernehmbareRolle = {
  rolleId: string;
  name: string;
  frei?: number;
};

/** Eine Rolle innerhalb einer Ausschreibung, mit ihrem Restbedarf. */
export type OffeneRolle = UebernehmbareRolle & {
  benoetigt: number;
  besetzt: number;
  /** `benoetigt - besetzt`, nie kleiner als 0. */
  frei: number;
};

/**
 * Das `claim`-Feld von `schicht_ansehen` auslesen, soweit es eine
 * Ausschreibung beschreibt.
 *
 * Die Funktion liefert dort `{ kind, benachrichtigung_id, roles }`, wobei
 * `kind` `'posting'` (Ausschreibung) oder `'emergency'` (gesuchte
 * Vertretung) sein kann. Hier wird ausschliesslich `posting` erkannt —
 * die Vertretung läuft über `notfall_vertretung_uebernehmen` und gehört
 * dem Notfall-Bereich, nicht dieser Datei.
 *
 * **Die Kapazität ist an dieser Stelle schon geprüft.** `schicht_ansehen`
 * nimmt in `roles` nur Rollen auf, die die Person hat und für die
 * `count(zuweisungen) < benoetigt` gilt. Anders als bei
 * `kalender_schichten` muss hier also nichts nachgerechnet werden.
 */
export function leseAusschreibung(
  claim: unknown,
): { benachrichtigungId: string; rollen: UebernehmbareRolle[] } | null {
  if (typeof claim !== "object" || claim === null) return null;
  const roh = claim as Record<string, unknown>;
  if (roh["kind"] !== "posting") return null;

  const id = roh["benachrichtigung_id"];
  if (typeof id !== "string" || id.length === 0) return null;

  const roles = Array.isArray(roh["roles"]) ? roh["roles"] : [];
  const rollen: UebernehmbareRolle[] = [];
  for (const eintrag of roles) {
    if (typeof eintrag !== "object" || eintrag === null) continue;
    const r = eintrag as Record<string, unknown>;
    if (typeof r["rolle_id"] !== "string") continue;
    rollen.push({
      rolleId: r["rolle_id"],
      name: typeof r["name"] === "string" && r["name"].trim() ? r["name"] : "Ohne Rolle",
    });
  }

  return rollen.length > 0 ? { benachrichtigungId: id, rollen } : null;
}

export type OffeneAusschreibung = {
  /** ID der Benachrichtigung — der Schlüssel für den RPC. */
  benachrichtigungId: string;
  schichtInstanzId: string;
  titel: string | null;
  text: string | null;
  erstelltAm: string;
  /** `YYYY-MM-DD`, oder `null`, wenn die Instanz nicht lesbar ist. */
  datum: string | null;
  startZeit: string | null;
  endZeit: string | null;
  /**
   * Nur Rollen, die diese Person hat **und** die noch Platz haben.
   * Ausschreibungen ohne solche Rolle tauchen gar nicht erst auf.
   */
  rollen: OffeneRolle[];
  /** Diese Person ist auf dieser Schicht bereits eingeteilt. */
  schonDrauf: boolean;
};

/**
 * Alle offenen Ausschreibungen, die für diese Person übernehmbar sind.
 *
 * Gefiltert wird in derselben Reihenfolge, in der auch der RPC prüft —
 * eigene Rolle, nicht schon zugeteilt, noch Platz —, damit die Liste
 * nichts anbietet, was der Klick danach ablehnt.
 */
export async function holeOffeneAusschreibungen(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
): Promise<OffeneAusschreibung[]> {
  const { data: meldungen, error } = await supabase
    .from("benachrichtigungen")
    .select("id, titel, text, erstellt_am")
    .eq("betrieb_id", betriebId)
    .eq("typ", "schicht_ausschreibung")
    .is("geloescht_am", null)
    .order("erstellt_am", { ascending: false });

  if (error) {
    console.error(`[dashboard/ausschreibung] benachrichtigungen: ${error.message}`);
    return [];
  }

  const ids = (meldungen ?? []).map((zeile) => zeile.id);
  if (ids.length === 0) return [];

  const [bedarf, meineRollen] = await Promise.all([
    supabase
      .from("schicht_ausschreibung_bedarf")
      .select("benachrichtigung_id, schicht_instanz_id, rolle_id, benoetigt")
      .in("benachrichtigung_id", ids),
    supabase
      .from("mitarbeiter_rollen")
      .select("rolle_id")
      .eq("mitarbeiter_id", mitarbeiterId),
  ]);

  if (bedarf.error) {
    console.error(`[dashboard/ausschreibung] bedarf: ${bedarf.error.message}`);
    return [];
  }

  const bedarfZeilen = bedarf.data ?? [];
  if (bedarfZeilen.length === 0) return [];

  const eigene = new Set((meineRollen.data ?? []).map((zeile) => zeile.rolle_id));
  if (eigene.size === 0) return [];

  const instanzIds = Array.from(
    new Set(bedarfZeilen.map((zeile) => zeile.schicht_instanz_id)),
  );
  const rollenIds = Array.from(new Set(bedarfZeilen.map((zeile) => zeile.rolle_id)));

  const [zuweisungen, rollen, instanzen] = await Promise.all([
    supabase
      .from("schicht_zuweisungen")
      .select("schicht_instanz_id, rolle_id, mitarbeiter_id")
      .in("schicht_instanz_id", instanzIds),
    supabase.from("rollen").select("id, name").in("id", rollenIds),
    supabase
      .from("schicht_instanzen")
      .select("id, datum, start_zeit, end_zeit")
      .in("id", instanzIds),
  ]);

  /*
   * Besetzung je (Instanz, Rolle). Der Schlüssel ist zusammengesetzt,
   * weil dieselbe Instanz mehrere ausgeschriebene Rollen haben kann und
   * eine Rolle in mehreren Instanzen vorkommt.
   */
  const besetzung = new Map<string, number>();
  const meineInstanzen = new Set<string>();
  for (const zeile of zuweisungen.data ?? []) {
    const schluessel = `${zeile.schicht_instanz_id}|${zeile.rolle_id}`;
    besetzung.set(schluessel, (besetzung.get(schluessel) ?? 0) + 1);
    if (zeile.mitarbeiter_id === mitarbeiterId) {
      meineInstanzen.add(zeile.schicht_instanz_id);
    }
  }

  const rollenName = new Map((rollen.data ?? []).map((r) => [r.id, r.name]));
  const instanz = new Map((instanzen.data ?? []).map((i) => [i.id, i]));

  const proMeldung = new Map<string, typeof bedarfZeilen>();
  for (const zeile of bedarfZeilen) {
    const liste = proMeldung.get(zeile.benachrichtigung_id);
    if (liste) liste.push(zeile);
    else proMeldung.set(zeile.benachrichtigung_id, [zeile]);
  }

  const ergebnis: OffeneAusschreibung[] = [];

  for (const meldung of meldungen ?? []) {
    const zeilen = proMeldung.get(meldung.id) ?? [];
    if (zeilen.length === 0) continue;

    const instanzId = zeilen[0]!.schicht_instanz_id;
    const schonDrauf = meineInstanzen.has(instanzId);

    const rollenListe: OffeneRolle[] = [];
    for (const zeile of zeilen) {
      if (!eigene.has(zeile.rolle_id)) continue;
      const besetzt = besetzung.get(`${zeile.schicht_instanz_id}|${zeile.rolle_id}`) ?? 0;
      const frei = Math.max(0, zeile.benoetigt - besetzt);
      if (frei === 0) continue;
      rollenListe.push({
        rolleId: zeile.rolle_id,
        name: rollenName.get(zeile.rolle_id) ?? "Ohne Rolle",
        benoetigt: zeile.benoetigt,
        besetzt,
        frei,
      });
    }

    if (rollenListe.length === 0) continue;

    const i = instanz.get(instanzId);
    ergebnis.push({
      benachrichtigungId: meldung.id,
      schichtInstanzId: instanzId,
      titel: meldung.titel,
      text: meldung.text,
      erstelltAm: meldung.erstellt_am,
      datum: i?.datum ?? null,
      startZeit: i?.start_zeit ?? null,
      endZeit: i?.end_zeit ?? null,
      rollen: rollenListe,
      schonDrauf,
    });
  }

  return ergebnis;
}

/* ------------------------------------------------------------------ */
/* Rückgabecodes                                                       */
/* ------------------------------------------------------------------ */

/**
 * Die fünf Textcodes von `schicht_ausschreibung_annehmen`.
 *
 * **Codes, keine Ausnahmen** — sie kommen als `data` zurück, nicht als
 * `error`. Die Funktion wirft daneben vier echte Ausnahmen
 * (`Ausschreibung nicht gefunden`, `Rolle gehoert nicht zu dieser
 * Ausschreibung`, `Profil gehoert nicht zum angemeldeten Konto`, `Kein
 * Mitglied dieses Betriebs`); die landen in `error` und werden getrennt
 * behandelt.
 */
export const UEBERNAHME_CODES = [
  "angenommen",
  "schon_zugewiesen",
  "voll",
  "nicht_qualifiziert",
  "nicht_moeglich",
] as const;

export type UebernahmeCode = (typeof UEBERNAHME_CODES)[number];

export function istUebernahmeCode(wert: unknown): wert is UebernahmeCode {
  return typeof wert === "string" && (UEBERNAHME_CODES as readonly string[]).includes(wert);
}

/**
 * Was die Person zu sehen bekommt, je Code.
 *
 * `nicht_moeglich` ist bewusst vage, und das ist keine Nachlässigkeit:
 * die Funktion fängt den Einfügefehler mit `exception when others` ab und
 * gibt diesen einen Code zurück. Der echte Grund — meist der Trigger
 * `pruefe_zuweisung_constraints` mit Ruhezeit oder Höchstarbeitszeit —
 * kommt nicht mit. Einen technischen Fehlertext zu erfinden, den wir
 * nicht kennen, wäre schlechter als zu sagen, woran es typischerweise
 * liegt.
 */
export const UEBERNAHME_MELDUNG: Record<UebernahmeCode, string> = {
  angenommen: "Übernommen — die Schicht steht jetzt in deinem Plan.",
  schon_zugewiesen: "Du bist auf dieser Schicht schon eingeteilt.",
  voll:
    "Zu spät — der letzte Platz für diese Rolle ist gerade vergeben worden. " +
    "Die Ausschreibung stand noch, weil sie erst der Chef schliesst.",
  nicht_qualifiziert:
    "Für diese Rolle bist du nicht eingetragen. Wenn das nicht stimmt, sag es der Betriebsleitung.",
  nicht_moeglich:
    "Übernahme aktuell nicht möglich — zum Beispiel wegen Ruhezeit- oder " +
    "Höchstarbeitszeit-Grenzen. Die Prüfung liegt in der Datenbank und nennt den " +
    "genauen Grund leider nicht.",
};

/** Nur `angenommen` ist ein Erfolg; die übrigen vier sind Absagen. */
export function istErfolg(code: UebernahmeCode): boolean {
  return code === "angenommen";
}
