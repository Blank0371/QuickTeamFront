import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Verfügbarkeit — wiederkehrende Schichtvorlieben und Wünsche für
 * einzelne Tage. Referenz: `scheduling.tsx` (`PlanningSection`,
 * `SpecialDates`) in der Expo-App. Parity-Audit vom 2026-09-01.
 *
 * `scheduling.tsx` bündelt drei Reiter — Notfall, Planung, Urlaub — in
 * einer Seite; die ersten beiden dieser drei sind hier bereits als eigene
 * Bereiche gebaut (`/dashboard/notfall`, `/dashboard/urlaub`). Dieser
 * Bereich trägt den dritten. Genannt „Verfügbarkeit“, nicht „Planung": das
 * Wort ist im Dashboard bereits vergeben — `/dashboard/planung` ist der
 * Chef-Bereich für Planungszyklen und Solver-Aufruf. Beide schreiben in
 * dieselbe Deadline-Einstellung (`verfuegbarkeit_deadline_tag`), aber
 * dieser Bereich hier ist ausschliesslich Mitarbeiter-Seite — die App hat
 * dafür keine Chef-Ansicht, der Solver liest die Wünsche über
 * `plan-generieren`.
 *
 * **Kein RPC.** Beide Tabellen tragen nur eine `ALL`-Policy auf
 * `mitarbeiter_id = meine_mitarbeiter_id(betrieb_id)` — geschrieben wird
 * direkt, wie die App es tut.
 */

export type Praeferenz = "gerne" | "ungerne";

export type MeineVorlage = {
  id: string;
  bezeichnung: string;
  wochentag: number;
  start_zeit: string;
  end_zeit: string;
};

export type TagesPraeferenz = {
  schichtVorlageId: string;
  datum: string;
  praeferenz: Praeferenz;
};

/**
 * Vorlagen, die zu den eigenen Rollen passen — Spiegel von `load()` in
 * `scheduling.tsx`: nur Vorlagen mit einer Mindestbesetzungs-Zeile für
 * eine Rolle, die diese Person hat, montagsbasiert sortiert.
 */
export async function holeMeineVorlagen(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
): Promise<MeineVorlage[]> {
  const [{ data: meineRollen }, { data: mindest }, { data: vorlagen }] = await Promise.all([
    supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", mitarbeiterId),
    supabase
      .from("schicht_vorlage_mindestbesetzung")
      .select("schicht_vorlage_id, rolle_id")
      .eq("betrieb_id", betriebId),
    supabase
      .from("schicht_vorlagen")
      .select("id, bezeichnung, wochentag, start_zeit, end_zeit")
      .eq("betrieb_id", betriebId)
      .eq("aktiv", true),
  ]);

  const rolleSet = new Set((meineRollen ?? []).map((r) => r.rolle_id));
  const vorlagenMitRolle = new Set(
    (mindest ?? []).filter((m) => rolleSet.has(m.rolle_id)).map((m) => m.schicht_vorlage_id),
  );

  return (vorlagen ?? [])
    .filter((v) => vorlagenMitRolle.has(v.id))
    .map((v) => ({
      id: v.id,
      bezeichnung: v.bezeichnung ?? "Schicht",
      wochentag: v.wochentag,
      start_zeit: v.start_zeit,
      end_zeit: v.end_zeit,
    }))
    .sort((a, b) => a.wochentag - b.wochentag || a.start_zeit.localeCompare(b.start_zeit));
}

/** Eigene wiederkehrende Vorlieben, je `schicht_vorlage_id`. */
export async function holeWiederkehrendePraeferenzen(
  supabase: SupabaseServerClient,
  mitarbeiterId: string,
): Promise<Record<string, Praeferenz>> {
  const { data, error } = await supabase
    .from("mitarbeiter_schicht_vorlieben")
    .select("schicht_vorlage_id, praeferenz")
    .eq("mitarbeiter_id", mitarbeiterId);

  if (error) {
    console.error(`[dashboard/verfuegbarkeit] wiederkehrend: ${error.message}`);
    return {};
  }
  return Object.fromEntries((data ?? []).map((r) => [r.schicht_vorlage_id, r.praeferenz as Praeferenz]));
}

/** Eigene, noch nicht (weich) gelöschte Wünsche für einzelne Tage — künftige zuerst. */
export async function holeTagesPraeferenzen(
  supabase: SupabaseServerClient,
  mitarbeiterId: string,
): Promise<TagesPraeferenz[]> {
  const heute = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("mitarbeiter_schicht_tagesvorlieben")
    .select("schicht_vorlage_id, datum, praeferenz")
    .eq("mitarbeiter_id", mitarbeiterId)
    .is("geloescht_am", null)
    .gte("datum", heute)
    .order("datum", { ascending: true });

  if (error) {
    console.error(`[dashboard/verfuegbarkeit] tagesvorlieben: ${error.message}`);
    return [];
  }
  return (data ?? []).map((r) => ({
    schichtVorlageId: r.schicht_vorlage_id,
    datum: r.datum,
    praeferenz: r.praeferenz as Praeferenz,
  }));
}

/** Montagsbasierter Wochentag (0 = Montag) aus einem `YYYY-MM-DD`-Datum. */
export function wochentagVon(datum: string): number {
  return (new Date(`${datum}T00:00:00`).getDay() + 6) % 7;
}
