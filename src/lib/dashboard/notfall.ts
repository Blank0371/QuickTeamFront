import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Notfallvertretung. Referenz: `scheduling.tsx` (`EmergencySection`),
 * `shift/[id].tsx` (`reportEmergency`), `manager.tsx`
 * (`UrgentEmergencies`), `messages.tsx` (`EmergencyCard`/`EmergencyModal`)
 * in der Expo-App. Parity-Audit vom 2026-08-31.
 *
 * **`notfaelle` hat keine einzige Foreign Key auf `schicht_zuweisungen`,
 * `schicht_instanzen`, `rollen` oder `mitarbeiter`** — nur der PK und
 * `betrieb_id`. PostgREST kann darüber deshalb nicht eingebettet
 * selektieren (`select("…, schicht_instanzen(…)")` funktioniert nur über
 * echte FKs); jede Anreicherung hier läuft über eine zweite Abfrage und
 * eine Map, nicht über einen Join in der Abfrage selbst.
 */

export type NotfallStatus = "gemeldet" | "vertretung_gesucht" | "besetzt" | "storniert";

const CHEF_SICHTBARE_STATUS: readonly NotfallStatus[] = ["gemeldet", "vertretung_gesucht"];

/** Eine eigene, meldbare Schicht — Auswahl für das Melden-Formular. */
export type EigeneMeldbareSchicht = {
  zuweisungId: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string | null;
};

/** Eine eigene, bereits gemeldete Schicht — reine Statusanzeige, keine Aktion. */
export type MeineMeldung = {
  id: string;
  status: NotfallStatus;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string | null;
};

/** Ein offener Notfall aus Chef-Sicht — `gemeldet` oder `vertretung_gesucht`. */
export type ChefNotfall = {
  id: string;
  status: "gemeldet" | "vertretung_gesucht";
  melderName: string;
  rolleName: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string | null;
};

/** Eine ausgeschriebene Vertretung, für die die aktuelle Person infrage kommt. */
export type OffeneVertretung = {
  id: string;
  benachrichtigungId: string;
  melderName: string;
  rolleName: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string | null;
};

type InstanzZeile = {
  id: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  schicht_vorlage_id: string | null;
};

async function holeInstanzenUndLabels(
  supabase: SupabaseServerClient,
  instanzIds: string[],
): Promise<{ instanzen: Map<string, InstanzZeile>; labelVon: Map<string, string> }> {
  if (instanzIds.length === 0) return { instanzen: new Map(), labelVon: new Map() };

  const { data } = await supabase
    .from("schicht_instanzen")
    .select("id, datum, start_zeit, end_zeit, schicht_vorlage_id")
    .in("id", instanzIds);

  const instanzen = new Map((data ?? []).map((i) => [i.id, i as InstanzZeile]));

  const vorlagenIds = Array.from(
    new Set((data ?? []).flatMap((i) => (i.schicht_vorlage_id ? [i.schicht_vorlage_id] : []))),
  );
  const vorlagen =
    vorlagenIds.length > 0
      ? await supabase.from("schicht_vorlagen").select("id, bezeichnung").in("id", vorlagenIds)
      : { data: [] as { id: string; bezeichnung: string | null }[] };

  const bezeichnungVon = new Map((vorlagen.data ?? []).map((v) => [v.id, v.bezeichnung]));
  const labelVon = new Map<string, string>();
  for (const inst of instanzen.values()) {
    const bez = inst.schicht_vorlage_id ? bezeichnungVon.get(inst.schicht_vorlage_id) : null;
    if (bez) labelVon.set(inst.id, bez);
  }

  return { instanzen, labelVon };
}

/**
 * Eigene, in der Zukunft liegende und noch angetretene Schichten — Auswahl
 * für das Melden-Formular. Spiegel von `upcoming` in `scheduling.tsx`:
 * dort wie hier reicht der Filter auf `attendet = true`, ein separater
 * „schon gemeldet"-Ausschluss ist unnötig — `notfall_melden` setzt
 * `attendet = false` auf der eigenen Zuweisung, sobald gemeldet, und die
 * Schicht fällt beim nächsten Laden von selbst aus dieser Liste heraus.
 */
export async function holeEigeneMeldbareSchichten(
  supabase: SupabaseServerClient,
  mitarbeiterId: string,
): Promise<EigeneMeldbareSchicht[]> {
  const heute = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("schicht_zuweisungen")
    .select("id, schicht_instanz_id")
    .eq("mitarbeiter_id", mitarbeiterId)
    .eq("attendet", true);

  if (error) {
    console.error(`[dashboard/notfall] schicht_zuweisungen: ${error.message}`);
    return [];
  }
  const zeilen = data ?? [];
  if (zeilen.length === 0) return [];

  const { instanzen, labelVon } = await holeInstanzenUndLabels(
    supabase,
    zeilen.map((z) => z.schicht_instanz_id),
  );

  return zeilen
    .flatMap((z) => {
      const inst = instanzen.get(z.schicht_instanz_id);
      if (!inst || inst.datum < heute) return [];
      return [
        {
          zuweisungId: z.id,
          datum: inst.datum,
          start_zeit: inst.start_zeit,
          end_zeit: inst.end_zeit,
          label: labelVon.get(inst.id) ?? null,
        },
      ];
    })
    .sort((a, b) => (a.datum + a.start_zeit).localeCompare(b.datum + b.start_zeit));
}

/** Eigene Meldungen, jeder Status ausser `storniert` — reine Statusliste. */
export async function holeMeineMeldungen(
  supabase: SupabaseServerClient,
  mitarbeiterId: string,
): Promise<MeineMeldung[]> {
  const { data, error } = await supabase
    .from("notfaelle")
    .select("id, status, schicht_instanz_id, erstellt_am")
    .eq("melder_id", mitarbeiterId)
    .neq("status", "storniert")
    .order("erstellt_am", { ascending: false });

  if (error) {
    console.error(`[dashboard/notfall] meine meldungen: ${error.message}`);
    return [];
  }
  const zeilen = data ?? [];
  if (zeilen.length === 0) return [];

  const { instanzen, labelVon } = await holeInstanzenUndLabels(
    supabase,
    zeilen.map((z) => z.schicht_instanz_id),
  );

  return zeilen.flatMap((z) => {
    const inst = instanzen.get(z.schicht_instanz_id);
    if (!inst) return [];
    return [
      {
        id: z.id,
        status: z.status as NotfallStatus,
        datum: inst.datum,
        start_zeit: inst.start_zeit,
        end_zeit: inst.end_zeit,
        label: labelVon.get(inst.id) ?? null,
      },
    ];
  });
}

/**
 * Alle offenen Notfälle des Betriebs — nur für den Chef. Spiegel von
 * `UrgentEmergencies` in `manager.tsx`: `gemeldet` und `vertretung_gesucht`,
 * niemals `besetzt` (dann ist nichts mehr zu tun) oder `storniert`.
 */
export async function holeChefNotfaelle(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<ChefNotfall[]> {
  const { data, error } = await supabase
    .from("notfaelle")
    .select("id, status, schicht_instanz_id, rolle_id, melder_id, erstellt_am")
    .eq("betrieb_id", betriebId)
    .in("status", CHEF_SICHTBARE_STATUS)
    .order("erstellt_am", { ascending: true });

  if (error) {
    console.error(`[dashboard/notfall] chef notfaelle: ${error.message}`);
    return [];
  }
  const zeilen = data ?? [];
  if (zeilen.length === 0) return [];

  const [{ instanzen, labelVon }, rollenTab, namenAntwort] = await Promise.all([
    holeInstanzenUndLabels(
      supabase,
      zeilen.map((z) => z.schicht_instanz_id),
    ),
    supabase.from("rollen").select("id, name").eq("betrieb_id", betriebId),
    supabase.rpc("mitarbeiter_namen", {
      p_betrieb_id: betriebId,
      p_ids: Array.from(new Set(zeilen.map((z) => z.melder_id))),
    }),
  ]);

  const rolleName = new Map((rollenTab.data ?? []).map((r) => [r.id, r.name]));
  const nameVon = new Map<string, string>(
    (namenAntwort.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  return zeilen.flatMap((z) => {
    const inst = instanzen.get(z.schicht_instanz_id);
    if (!inst) return [];
    return [
      {
        id: z.id,
        status: z.status as "gemeldet" | "vertretung_gesucht",
        melderName: nameVon.get(z.melder_id) ?? "",
        rolleName: rolleName.get(z.rolle_id) ?? "—",
        datum: inst.datum,
        start_zeit: inst.start_zeit,
        end_zeit: inst.end_zeit,
        label: labelVon.get(inst.id) ?? null,
      },
    ];
  });
}

/**
 * Ausgeschriebene Vertretungen, für die die aktuelle Person infrage kommt
 * — Spiegel des `EmergencyCard`-Filters in `messages.tsx`:
 * `eligible = myRoleSet.has(rolle_id) && !isMelder`. Wie bei Tausch ist
 * das eine reine Anzeigefrage — `notfaelle_select` erlaubt jedem im
 * Betrieb, jede Zeile zu lesen, die Einschränkung existiert nur hier.
 */
export async function holeOffeneVertretungen(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
): Promise<OffeneVertretung[]> {
  const [{ data: zeilenRoh, error }, meineRollen] = await Promise.all([
    supabase
      .from("notfaelle")
      .select("id, vertretung_benachrichtigung_id, schicht_instanz_id, rolle_id, melder_id, erstellt_am")
      .eq("betrieb_id", betriebId)
      .eq("status", "vertretung_gesucht")
      .order("erstellt_am", { ascending: true }),
    supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", mitarbeiterId),
  ]);

  if (error) {
    console.error(`[dashboard/notfall] offene vertretungen: ${error.message}`);
    return [];
  }

  const meineRolleSet = new Set((meineRollen.data ?? []).map((r) => r.rolle_id));
  const zeilen = (zeilenRoh ?? []).filter(
    (z) => z.melder_id !== mitarbeiterId && meineRolleSet.has(z.rolle_id) && z.vertretung_benachrichtigung_id,
  );
  if (zeilen.length === 0) return [];

  const [{ instanzen, labelVon }, rollenTab, namenAntwort] = await Promise.all([
    holeInstanzenUndLabels(
      supabase,
      zeilen.map((z) => z.schicht_instanz_id),
    ),
    supabase.from("rollen").select("id, name").eq("betrieb_id", betriebId),
    supabase.rpc("mitarbeiter_namen", {
      p_betrieb_id: betriebId,
      p_ids: Array.from(new Set(zeilen.map((z) => z.melder_id))),
    }),
  ]);

  const rolleName = new Map((rollenTab.data ?? []).map((r) => [r.id, r.name]));
  const nameVon = new Map<string, string>(
    (namenAntwort.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  return zeilen.flatMap((z) => {
    const inst = instanzen.get(z.schicht_instanz_id);
    if (!inst) return [];
    return [
      {
        id: z.id,
        benachrichtigungId: z.vertretung_benachrichtigung_id as string,
        melderName: nameVon.get(z.melder_id) ?? "",
        rolleName: rolleName.get(z.rolle_id) ?? "—",
        datum: inst.datum,
        start_zeit: inst.start_zeit,
        end_zeit: inst.end_zeit,
        label: labelVon.get(inst.id) ?? null,
      },
    ];
  });
}
