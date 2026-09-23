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
 * `plan-generieren`. Web-eigene Ausnahme seit 2026-09-23: der Chef sieht
 * auf derselben Seite statt der Eingabe eine Übersicht aller
 * Tageswünsche seines Teams samt Notiz (`holeTeamTagesPraeferenzen`).
 *
 * **Kein RPC.** Die Schreib-Policies beider Tabellen lauten seit
 * 2026-09-23 `ist_meine_position(mitarbeiter_id, betrieb_id)` (vorher
 * `meine_mitarbeiter_id()`, das bei mehreren Anstellungen im selben
 * Betrieb eine beliebige wählte) — geschrieben wird direkt, wie die App
 * es tut.
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
  notiz: string | null;
};

/** Ein Tageswunsch aus dem Team, wie ihn der Chef sieht. */
export type TeamTagesPraeferenz = TagesPraeferenz & {
  mitarbeiterId: string;
  name: string;
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
    .select("schicht_vorlage_id, datum, praeferenz, notiz")
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
    notiz: r.notiz,
  }));
}

/**
 * Tageswünsche des ganzen Betriebs — für den Chef. Web-eigen: die App
 * zeigt dem Chef keine Tageswünsche, der Solver liest sie direkt.
 * `tagesvorlieben_select` gibt einem Chef alle Zeilen des Betriebs, allen
 * anderen nur die eigenen; eingegrenzt wird trotzdem selbst auf
 * `betrieb_id` (ein Konto kann in mehreren Betrieben stehen).
 *
 * Ohne `filter` alle künftigen Wünsche (Chef-Übersicht auf
 * `/dashboard/verfuegbarkeit`), sonst die für genau eine Vorlage an einem
 * Tag (Schichtdetail) — jeweils mit oder ohne Notiz.
 */
export async function holeTeamTagesPraeferenzen(
  supabase: SupabaseServerClient,
  betriebId: string,
  filter?: { schichtVorlageId: string; datum: string },
): Promise<TeamTagesPraeferenz[]> {
  let abfrage = supabase
    .from("mitarbeiter_schicht_tagesvorlieben")
    .select("mitarbeiter_id, schicht_vorlage_id, datum, praeferenz, notiz")
    .eq("betrieb_id", betriebId)
    .is("geloescht_am", null);

  abfrage = filter
    ? abfrage.eq("schicht_vorlage_id", filter.schichtVorlageId).eq("datum", filter.datum)
    : abfrage.gte("datum", new Date().toISOString().slice(0, 10));

  const { data, error } = await abfrage.order("datum", { ascending: true }).limit(500);
  if (error) {
    console.error(`[dashboard/verfuegbarkeit] team-tagesvorlieben: ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) return [];

  const namen = await holeNamen(supabase, betriebId, data.map((r) => r.mitarbeiter_id));

  return data
    .map((r) => ({
      mitarbeiterId: r.mitarbeiter_id,
      name: namen.get(r.mitarbeiter_id) ?? "Ohne Namen",
      schichtVorlageId: r.schicht_vorlage_id,
      datum: r.datum,
      praeferenz: r.praeferenz as Praeferenz,
      notiz: r.notiz,
    }))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.name.localeCompare(b.name));
}

/** Ein wiederkehrender Wunsch aus dem Team, wie ihn der Chef sieht. */
export type TeamWiederkehrendePraeferenz = {
  mitarbeiterId: string;
  name: string;
  schichtVorlageId: string;
  praeferenz: Praeferenz;
};

/**
 * Wiederkehrende Wünsche des ganzen Betriebs — Chef-Übersicht auf
 * `/dashboard/verfuegbarkeit`. Dieselbe RLS-Lage wie bei den
 * Tageswünschen (`vorlieben_select`), eingegrenzt auf `betrieb_id`.
 */
export async function holeTeamWiederkehrendePraeferenzen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<TeamWiederkehrendePraeferenz[]> {
  const { data, error } = await supabase
    .from("mitarbeiter_schicht_vorlieben")
    .select("mitarbeiter_id, schicht_vorlage_id, praeferenz")
    .eq("betrieb_id", betriebId)
    .limit(1000);

  if (error) {
    console.error(`[dashboard/verfuegbarkeit] team-wiederkehrend: ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) return [];

  const namen = await holeNamen(supabase, betriebId, data.map((r) => r.mitarbeiter_id));
  return data
    .map((r) => ({
      mitarbeiterId: r.mitarbeiter_id,
      name: namen.get(r.mitarbeiter_id) ?? "Ohne Namen",
      schichtVorlageId: r.schicht_vorlage_id,
      praeferenz: r.praeferenz as Praeferenz,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Anzeigenamen je `mitarbeiter.id`, auf den Betrieb eingegrenzt. */
async function holeNamen(
  supabase: SupabaseServerClient,
  betriebId: string,
  ids: string[],
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select("id, vorname, nachname")
    .eq("betrieb_id", betriebId)
    .in("id", [...new Set(ids)]);
  if (error) {
    console.error(`[dashboard/verfuegbarkeit] team-namen: ${error.message}`);
  }
  return new Map(
    (data ?? []).map((p) => [p.id, `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim() || "Ohne Namen"]),
  );
}

/** Montagsbasierter Wochentag (0 = Montag) aus einem `YYYY-MM-DD`-Datum. */
export function wochentagVon(datum: string): number {
  return (new Date(`${datum}T00:00:00`).getDay() + 6) % 7;
}
