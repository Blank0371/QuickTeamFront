import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Schichttausch. Referenz: `messages.tsx` (`SwapCard`/`SwapModal`),
 * `compose.tsx` (Kategorie `aenderungswunsch`), `shift/[id].tsx`
 * (`offerSwap`/`withdrawSwap`), `manager.tsx` (`SwapApprovals`) — alle in
 * der Expo-App. Parity-Audit vom 2026-08-31.
 *
 * **Bewusste Vereinfachung gegenüber der App:** die App liest offene
 * Tauschanfragen über den Broadcast-Umweg `benachrichtigungen` (Typ
 * `schicht_tausch`). Für die Anzeige wird hier stattdessen direkt aus
 * `schichttausch_anfragen` gelesen — dieselbe RLS (`betrieb_id IN
 * meine_betriebe()`), dieselben Zeilen, ohne die Broadcast-Hülle, die im
 * Dashboard keinen eigenen Zweck hätte. Für `tausch_annehmen` allein
 * braucht es trotzdem eine `benachrichtigung_id` — die RPC nimmt keine
 * `anfrage_id` entgegen, siehe `holeBenachrichtigungId()` unten.
 */

export type TauschStatus =
  | "offen"
  | "angefragt"
  | "wartet_auf_chef"
  | "bestaetigt"
  | "abgelehnt_system"
  | "abgelehnt_chef"
  | "zurueckgezogen";

const AKTIVE_STATUS: readonly TauschStatus[] = ["offen", "angefragt", "wartet_auf_chef"];

/** Eine eigene, anbietbare Schicht — für das Formular „Schicht anbieten". */
export type EigeneSchicht = {
  id: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string | null;
};

/** Eine eigene Schicht, die als Gegenangebot taugen könnte. */
export type GegenKandidat = {
  zuweisungId: string;
  rolleId: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
};

export type TauschAngebot = {
  id: string;
  /** `null`, solange die zugehörige Mitteilung nicht (mehr) existiert — dann nicht handlungsfähig. */
  benachrichtigungId: string | null;
  status: TauschStatus;
  erstelltAm: string;

  angebotenDatum: string;
  angebotenStart: string;
  angebotenEnd: string;
  angebotenRolleName: string;

  anbieterId: string;
  anbieterName: string;
  uebernehmerId: string | null;
  uebernehmerName: string | null;

  gegenDatum: string | null;
  gegenStart: string | null;
  gegenEnd: string | null;

  praeferenzTage: string[];

  isAnbieter: boolean;
  isUebernehmer: boolean;
  /** Darf die aktuelle Person antworten (nur relevant bei `status === "offen"`). */
  eligible: boolean;
  /** Eigene Schichten, die als Gegenangebot passen — nur gefüllt, wenn `eligible`. */
  kandidaten: GegenKandidat[];
};

function istAktiverStatus(wert: string): wert is TauschStatus {
  return (AKTIVE_STATUS as readonly string[]).includes(wert);
}

/**
 * Eigene, in der Zukunft liegende Schichten — Auswahl für das
 * Anbieten-Formular. Spiegel von `upcomingShifts` in `compose.tsx`:
 * dieselbe RPC, derselbe Zeitraum (60 Tage), derselbe Filter
 * (`mine && !canceled && datum >= heute`).
 */
export async function holeEigeneSchichten(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
): Promise<EigeneSchicht[]> {
  const heute = new Date().toISOString().slice(0, 10);
  const bis = new Date();
  bis.setDate(bis.getDate() + 60);
  const bisStr = bis.toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("kalender_schichten", {
    p_betrieb_id: betriebId,
    p_von: heute,
    p_bis: bisStr,
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/tausch] kalender_schichten: ${error.message}`);
    return [];
  }

  type Zeile = {
    id: string;
    datum: string;
    start_zeit: string;
    end_zeit: string;
    label: string | null;
    mine: boolean;
    canceled: boolean;
  };

  return ((data as Zeile[] | null) ?? [])
    .filter((s) => s.mine && !s.canceled && s.datum >= heute)
    .map((s) => ({ id: s.id, datum: s.datum, start_zeit: s.start_zeit, end_zeit: s.end_zeit, label: s.label }))
    .sort((a, b) => (a.datum + a.start_zeit).localeCompare(b.datum + b.start_zeit));
}

/**
 * Freie Tage der nächsten 30 Tage — Spiegel von `freeDates` in
 * `compose.tsx`: alle Tage ausser denen, an denen man selbst schon
 * arbeitet. Bis zu drei davon werden als Wunschtage mitgegeben.
 */
export function holeFreieTage(eigeneSchichten: readonly EigeneSchicht[]): string[] {
  const belegt = new Set(eigeneSchichten.map((s) => s.datum));
  const heute = new Date();
  const tage: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(heute);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (!belegt.has(iso)) tage.push(iso);
  }
  return tage;
}

/**
 * Alle für die aktuelle Person sichtbaren, aktiven Tauschanfragen —
 * Spiegel von `loadSwaps()` in `messages.tsx`, inklusive derselben
 * Sichtbarkeitsregel wie der Feed-Filter dort:
 *
 *     isAnbieter || isUebernehmer → immer sichtbar
 *     status === "offen"          → nur wenn `eligible`
 *     status === "wartet_auf_chef"→ nur für den Chef
 *     sonst                       → nicht sichtbar
 *
 * `schichttausch_anfragen` selbst kennt diese Unterscheidung nicht (die
 * SELECT-Policy lässt jedes Betriebsmitglied jede Zeile lesen) — die
 * Filterung ist reine Anzeigefrage, keine zweite Autorisierungsebene.
 */
export async function holeTauschAngebote(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
  chef: boolean,
): Promise<TauschAngebot[]> {
  const heute = new Date().toISOString().slice(0, 10);

  const { data: anfragenRoh, error: anfragenFehler } = await supabase
    .from("schichttausch_anfragen")
    .select(
      "id, schicht_zuweisung_id, gegen_schicht_zuweisung_id, anbietender_mitarbeiter_id, uebernehmender_mitarbeiter_id, status, praeferenz_tage, gegen_datum, gegen_start, gegen_end, erstellt_am",
    )
    .eq("betrieb_id", betriebId)
    .in("status", AKTIVE_STATUS)
    .order("erstellt_am", { ascending: true });

  if (anfragenFehler) {
    console.error(`[dashboard/tausch] schichttausch_anfragen: ${anfragenFehler.message}`);
    return [];
  }
  const anfragen = anfragenRoh ?? [];
  if (anfragen.length === 0) return [];

  const zuweisungIds = anfragen.map((a) => a.schicht_zuweisung_id);
  const anbieterIds = Array.from(new Set(anfragen.map((a) => a.anbietender_mitarbeiter_id)));

  const [benachrichtigungen, angeboteneZuweisungen, anbieterRollen, anbieterZuweisungen, meineRollen, meineZuweisungen, rollenTab] =
    await Promise.all([
      supabase
        .from("benachrichtigungen")
        .select("id, tausch_anfrage_id")
        .eq("betrieb_id", betriebId)
        .eq("typ", "schicht_tausch")
        .is("geloescht_am", null),
      supabase
        .from("schicht_zuweisungen")
        .select("id, rolle_id, schicht_instanz_id, schicht_instanzen(datum, start_zeit, end_zeit)")
        .in("id", zuweisungIds),
      supabase.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").in("mitarbeiter_id", anbieterIds),
      supabase
        .from("schicht_zuweisungen")
        .select("mitarbeiter_id, schicht_instanz_id, schicht_instanzen(datum)")
        .in("mitarbeiter_id", anbieterIds)
        .eq("attendet", true),
      supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", mitarbeiterId),
      supabase
        .from("schicht_zuweisungen")
        .select("id, rolle_id, schicht_instanz_id, schicht_instanzen(datum, start_zeit, end_zeit)")
        .eq("mitarbeiter_id", mitarbeiterId)
        .eq("attendet", true),
      supabase.from("rollen").select("id, name").eq("betrieb_id", betriebId),
    ]);

  type EmbeddedInstanz = { datum: string; start_zeit: string; end_zeit: string } | { datum: string; start_zeit: string; end_zeit: string }[] | null;
  const eineInstanz = (v: EmbeddedInstanz) => (Array.isArray(v) ? (v[0] ?? null) : v);

  const benachrichtigungNach = new Map<string, string>(
    (benachrichtigungen.data ?? [])
      .filter((b) => b.tausch_anfrage_id)
      .map((b) => [b.tausch_anfrage_id as string, b.id]),
  );

  const zuweisungById = new Map(
    (angeboteneZuweisungen.data ?? []).map((z) => [
      z.id,
      { rolleId: z.rolle_id, instanz: eineInstanz(z.schicht_instanzen as EmbeddedInstanz) },
    ]),
  );

  const rolleName = new Map((rollenTab.data ?? []).map((r) => [r.id, r.name]));

  const anbieterRollenNach = new Map<string, Set<string>>();
  for (const r of anbieterRollen.data ?? []) {
    const set = anbieterRollenNach.get(r.mitarbeiter_id) ?? new Set<string>();
    set.add(r.rolle_id);
    anbieterRollenNach.set(r.mitarbeiter_id, set);
  }

  const anbieterTageNach = new Map<string, Set<string>>();
  for (const z of anbieterZuweisungen.data ?? []) {
    const inst = eineInstanz(z.schicht_instanzen as EmbeddedInstanz);
    if (!inst) continue;
    const set = anbieterTageNach.get(z.mitarbeiter_id) ?? new Set<string>();
    set.add(inst.datum);
    anbieterTageNach.set(z.mitarbeiter_id, set);
  }

  const meineRolleSet = new Set((meineRollen.data ?? []).map((r) => r.rolle_id));
  const meineSchichten: GegenKandidat[] = (meineZuweisungen.data ?? []).flatMap((z) => {
    const inst = eineInstanz(z.schicht_instanzen as EmbeddedInstanz);
    if (!inst || inst.datum < heute) return [];
    return [{ zuweisungId: z.id, rolleId: z.rolle_id, datum: inst.datum, start_zeit: inst.start_zeit, end_zeit: inst.end_zeit }];
  });
  const meineTageSet = new Set(meineSchichten.map((s) => s.datum));

  const nameIds = Array.from(
    new Set([
      ...anfragen.map((a) => a.anbietender_mitarbeiter_id),
      ...anfragen.flatMap((a) => (a.uebernehmender_mitarbeiter_id ? [a.uebernehmender_mitarbeiter_id] : [])),
    ]),
  );
  const namenAntwort =
    nameIds.length > 0
      ? await supabase.rpc("mitarbeiter_namen", { p_betrieb_id: betriebId, p_ids: nameIds })
      : { data: [] as { id: string; name: string }[] };
  const nameVon = new Map<string, string>(
    (namenAntwort.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  const ergebnis: TauschAngebot[] = [];

  for (const a of anfragen) {
    const status = a.status as TauschStatus;
    if (!istAktiverStatus(status)) continue;

    const angeboten = zuweisungById.get(a.schicht_zuweisung_id);
    if (!angeboten || !angeboten.instanz) continue;

    const isAnbieter = a.anbietender_mitarbeiter_id === mitarbeiterId;
    const isUebernehmer = a.uebernehmender_mitarbeiter_id === mitarbeiterId;

    let eligible = false;
    let kandidaten: GegenKandidat[] = [];

    if (status === "offen" && !isAnbieter) {
      const offMonat = angeboten.instanz.datum.slice(0, 7);
      const prefTage = (a.praeferenz_tage ?? []) as string[];
      const anbieterRollenSet = anbieterRollenNach.get(a.anbietender_mitarbeiter_id) ?? new Set<string>();
      const anbieterBelegt = anbieterTageNach.get(a.anbietender_mitarbeiter_id) ?? new Set<string>();

      const qualifiziert = meineRolleSet.has(angeboten.rolleId);
      const heuteFrei = !meineTageSet.has(angeboten.instanz.datum);

      if (qualifiziert && heuteFrei) {
        kandidaten = meineSchichten.filter(
          (s) =>
            s.zuweisungId !== a.schicht_zuweisung_id &&
            anbieterRollenSet.has(s.rolleId) &&
            !anbieterBelegt.has(s.datum) &&
            (prefTage.length > 0 ? prefTage.includes(s.datum) : s.datum.slice(0, 7) === offMonat),
        );
      }
      eligible = kandidaten.length > 0;
    }

    /*
     * Sichtbarkeitsregel aus `messages.tsx` — wer weder beteiligt noch
     * antwortberechtigt noch (bei wartender Chef-Freigabe) Chef ist,
     * bekommt diese Zeile gar nicht erst zurück.
     */
    const sichtbar =
      isAnbieter ||
      isUebernehmer ||
      (status === "offen" && eligible) ||
      (status === "wartet_auf_chef" && chef);
    if (!sichtbar) continue;

    ergebnis.push({
      id: a.id,
      benachrichtigungId: benachrichtigungNach.get(a.id) ?? null,
      status,
      erstelltAm: a.erstellt_am,
      angebotenDatum: angeboten.instanz.datum,
      angebotenStart: angeboten.instanz.start_zeit,
      angebotenEnd: angeboten.instanz.end_zeit,
      angebotenRolleName: rolleName.get(angeboten.rolleId) ?? "—",
      anbieterId: a.anbietender_mitarbeiter_id,
      anbieterName: nameVon.get(a.anbietender_mitarbeiter_id) ?? "",
      uebernehmerId: a.uebernehmender_mitarbeiter_id,
      uebernehmerName: a.uebernehmender_mitarbeiter_id ? (nameVon.get(a.uebernehmender_mitarbeiter_id) ?? "") : null,
      gegenDatum: a.gegen_datum,
      gegenStart: a.gegen_start,
      gegenEnd: a.gegen_end,
      praeferenzTage: (a.praeferenz_tage ?? []) as string[],
      isAnbieter,
      isUebernehmer,
      eligible,
      kandidaten,
    });
  }

  return ergebnis;
}
