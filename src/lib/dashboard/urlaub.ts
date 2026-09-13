import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Urlaub. Referenz: `scheduling.tsx` (`VacationSection`) für die
 * Mitarbeiter-Sicht, `manager.tsx` (`EmployeesSection`, `decide`,
 * `approvedDays`, `allowanceOf`) für die Chef-Sicht. Parity-Audit vom
 * 2026-09-01.
 *
 * Anders als Mitteilungen/Tausch/Notfall schreibt der Chef hier **direkt**
 * in die Tabelle (`urlaub_update_chef`, `ist_chef(betrieb_id)`), nicht über
 * eine RPC — nur `urlaub_beantragen` (Mitarbeiter-Seite) ist eine RPC.
 */

export type UrlaubStatus = "requested" | "approved" | "denied";

export type MeinUrlaub = {
  id: string;
  von: string;
  bis: string;
  status: UrlaubStatus;
  kommentar: string | null;
  begruendung: string | null;
};

export type ChefUrlaubsantrag = MeinUrlaub & {
  mitarbeiterId: string;
  mitarbeiterName: string;
};

/** Inklusive Tagesdifferenz — Spiegel von `dayDiff` in `manager.tsx`. */
export function tageDiff(von: string, bis: string): number {
  const ms = new Date(`${bis}T00:00:00`).getTime() - new Date(`${von}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000) + 1);
}

/**
 * Verbrauchte Tage im laufenden Jahr für die Anspruchs-Anzeige — Spiegel
 * von `usedDays` in `scheduling.tsx`: `approved` **und** `requested`
 * zählen mit, und ein Zeitraum, der über den Jahreswechsel reicht, wird an
 * beiden Rändern gekappt.
 *
 * Das ist bewusst eine andere Rechnung als `genehmigteTageOhne()` unten
 * (Spiegel von `approvedDays` in `manager.tsx`): dort zählt nur `approved`,
 * ungekappt, gefiltert nach dem Jahr von `von` — die App führt beide
 * Berechnungen nebeneinander, für zwei verschiedene Fragen.
 */
export function verbrauchteTage(
  urlaube: readonly MeinUrlaub[],
  jahr: number = new Date().getFullYear(),
): number {
  const jahresanfang = new Date(jahr, 0, 1).getTime();
  const jahresende = new Date(jahr, 11, 31).getTime();

  return urlaube
    .filter((u) => u.status === "approved" || u.status === "requested")
    .reduce((summe, u) => {
      const start = Math.max(new Date(`${u.von}T00:00:00`).getTime(), jahresanfang);
      const ende = Math.min(new Date(`${u.bis}T00:00:00`).getTime(), jahresende);
      const tage = Math.floor((ende - start) / 86_400_000) + 1;
      return summe + Math.max(0, tage);
    }, 0);
}

/**
 * Bereits genehmigte Tage dieses Mitarbeiters im laufenden Jahr, optional
 * ohne einen Antrag (den gerade (neu) entschiedenen) — Spiegel von
 * `approvedDays` in `manager.tsx`. Gebraucht als Kontingent-Wächter vor
 * einer Genehmigung.
 */
export function genehmigteTageOhne(
  antraege: readonly { id: string; mitarbeiterId: string; von: string; bis: string; status: UrlaubStatus }[],
  mitarbeiterId: string,
  ausschlussId?: string,
  jahr: number = new Date().getFullYear(),
): number {
  return antraege
    .filter(
      (a) =>
        a.id !== ausschlussId &&
        a.mitarbeiterId === mitarbeiterId &&
        a.status === "approved" &&
        new Date(`${a.von}T00:00:00`).getFullYear() === jahr,
    )
    .reduce((summe, a) => summe + tageDiff(a.von, a.bis), 0);
}

export async function holeMeineUrlaube(
  supabase: SupabaseServerClient,
  mitarbeiterId: string,
): Promise<MeinUrlaub[]> {
  const { data, error } = await supabase
    .from("urlaub")
    .select("id, von, bis, status, kommentar, begruendung")
    .eq("mitarbeiter_id", mitarbeiterId)
    .order("von", { ascending: false });

  if (error) {
    console.error(`[dashboard/urlaub] meine urlaube: ${error.message}`);
    return [];
  }
  return (data ?? []) as MeinUrlaub[];
}

export async function holeUrlaubsanspruch(
  supabase: SupabaseServerClient,
  mitarbeiterId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select("urlaubsanspruch_tage")
    .eq("id", mitarbeiterId)
    .single();

  if (error) {
    console.error(`[dashboard/urlaub] urlaubsanspruch: ${error.message}`);
    return 0;
  }
  return data?.urlaubsanspruch_tage ?? 0;
}

/** Alle Urlaubsanträge des Betriebs — nur für den Chef. Spiegel von `EmployeesSection`. */
export async function holeChefUrlaubsantraege(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<ChefUrlaubsantrag[]> {
  const { data, error } = await supabase
    .from("urlaub")
    .select("id, mitarbeiter_id, von, bis, status, kommentar, begruendung")
    .eq("betrieb_id", betriebId)
    .order("von", { ascending: false });

  if (error) {
    console.error(`[dashboard/urlaub] chef antraege: ${error.message}`);
    return [];
  }
  const zeilen = data ?? [];
  if (zeilen.length === 0) return [];

  const { data: namenAntwort } = await supabase.rpc("mitarbeiter_namen", {
    p_betrieb_id: betriebId,
    p_ids: Array.from(new Set(zeilen.map((z) => z.mitarbeiter_id))),
  });
  const nameVon = new Map<string, string>(
    (namenAntwort ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  return zeilen.map((z) => ({
    id: z.id,
    mitarbeiterId: z.mitarbeiter_id,
    mitarbeiterName: nameVon.get(z.mitarbeiter_id) ?? "—",
    von: z.von,
    bis: z.bis,
    status: z.status as UrlaubStatus,
    kommentar: z.kommentar,
    begruendung: z.begruendung,
  }));
}
