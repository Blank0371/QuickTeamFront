import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Schichtvorlagen für Schritt 4.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  `schicht_vorlagen.wochentag` ist MONTAGSBASIERT:  0 = Montag
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das ist **nicht** die JavaScript-Konvention. `Date.getDay()` liefert
 * 0 = Sonntag; wer den Wert ungeprüft übernimmt, legt jede Schicht einen
 * Tag daneben ab, und niemand merkt es, bis ein Chef seinen Montagsdienst
 * am Sonntag angezeigt bekommt.
 *
 * Der CHECK in der Datenbank lautet nur `wochentag >= 0 AND wochentag <= 6`
 * — er prüft den Bereich, nicht die Bedeutung. Eine Verwechslung läuft
 * also stillschweigend durch.
 *
 * Am 2026-08-23 dreifach im App-Quelltext gegengeprüft:
 *
 *   1. `scheduling.tsx:37`
 *        const wochentagOf = (d: Date) => (d.getDay() + 6) % 7;
 *      Montag hat `getDay() === 1`, also (1 + 6) % 7 = 0.
 *
 *   2. `manager.tsx:30`
 *        WEEKDAY_KEYS = ["monday", …, "sunday"]
 *      wird mit `.map((key, day) => …)` über den Index auf `wochentag`
 *      abgebildet — Index 0 ist "monday".
 *
 *   3. `manager.tsx:1080`
 *        const monday = new Date(2024, 0, 1); // 2024-01-01 ist ein Montag
 *        d.setDate(monday.getDate() + wd);
 *      Für `wd = 0` kommt der Montag heraus.
 *
 * Wer diese Datei anfasst, prüft die drei Stellen erneut, statt der
 * Tabelle unten zu glauben.
 */

export const WOCHENTAGE = [
  { wert: 0, name: "Montag", kurz: "Mo" },
  { wert: 1, name: "Dienstag", kurz: "Di" },
  { wert: 2, name: "Mittwoch", kurz: "Mi" },
  { wert: 3, name: "Donnerstag", kurz: "Do" },
  { wert: 4, name: "Freitag", kurz: "Fr" },
  { wert: 5, name: "Samstag", kurz: "Sa" },
  { wert: 6, name: "Sonntag", kurz: "So" },
] as const;

/**
 * Rechnet ein JS-Datum in unseren Wochentag um — dieselbe Formel wie
 * `wochentagOf` in `scheduling.tsx`. Steht hier, damit der Zusammenhang
 * an einer Stelle nachlesbar ist, auch wenn der Wizard sie derzeit nicht
 * braucht: er lässt den Tag auswählen, statt ihn aus einem Datum
 * abzuleiten.
 */
export function wochentagAusDatum(datum: Date): number {
  return (datum.getDay() + 6) % 7;
}

export function wochentagName(wert: number): string {
  return WOCHENTAGE.find((tag) => tag.wert === wert)?.name ?? `Tag ${wert}`;
}

export type Bedarf = { rolleId: string; mindestanzahl: number };

export type Vorlage = {
  id: string;
  bezeichnung: string;
  wochentag: number;
  start_zeit: string;
  end_zeit: string;
  bedarf: Bedarf[];
};

/** `HH:MM:SS` aus der Datenbank auf `HH:MM` für die Anzeige. */
export function alsUhrzeit(wert: string): string {
  return wert.slice(0, 5);
}

/**
 * Vorlagen samt Mindestbesetzung.
 *
 * Beide Tabellen werden geholt und hier zusammengeführt statt über einen
 * Join: die Mindestbesetzung ist kein Detail der Vorlage, sondern die
 * Bedingung dafür, dass sie in der App überhaupt sichtbar wird. Getrennt
 * zu laden macht im Code sichtbar, dass eine Vorlage ohne Bedarf ein
 * möglicher — und unerwünschter — Zustand ist.
 */
export async function holeVorlagen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Vorlage[]> {
  const [vorlagen, bedarfe] = await Promise.all([
    supabase
      .from("schicht_vorlagen")
      .select("id, bezeichnung, wochentag, start_zeit, end_zeit")
      .eq("betrieb_id", betriebId)
      .eq("aktiv", true)
      .order("wochentag")
      .order("start_zeit"),
    supabase
      .from("schicht_vorlage_mindestbesetzung")
      .select("schicht_vorlage_id, rolle_id, mindestanzahl")
      .eq("betrieb_id", betriebId),
  ]);

  if (vorlagen.error) {
    console.error(`[schichten] vorlagen(${betriebId}): ${vorlagen.error.message}`);
    return [];
  }
  if (bedarfe.error) {
    console.error(`[schichten] mindestbesetzung(${betriebId}): ${bedarfe.error.message}`);
  }

  const proVorlage = new Map<string, Bedarf[]>();
  for (const zeile of bedarfe.data ?? []) {
    const bisher = proVorlage.get(zeile.schicht_vorlage_id) ?? [];
    bisher.push({ rolleId: zeile.rolle_id, mindestanzahl: zeile.mindestanzahl });
    proVorlage.set(zeile.schicht_vorlage_id, bisher);
  }

  return (vorlagen.data ?? []).map((vorlage) => ({
    ...vorlage,
    bezeichnung: vorlage.bezeichnung ?? "",
    bedarf: proVorlage.get(vorlage.id) ?? [],
  }));
}

/**
 * Zählt nur, was in der App auch ankommt.
 *
 * Eine Vorlage ohne Mindestbesetzung filtert `scheduling.tsx` heraus —
 * sie existiert, ist aber für niemanden sichtbar. Für die Frage „ist
 * Schritt 4 erledigt?" darf sie deshalb nicht mitzählen.
 */
export function sichtbareVorlagen(vorlagen: readonly Vorlage[]): Vorlage[] {
  return vorlagen.filter((vorlage) =>
    vorlage.bedarf.some((eintrag) => eintrag.mindestanzahl > 0),
  );
}
