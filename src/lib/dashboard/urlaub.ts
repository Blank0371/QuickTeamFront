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
  const ms = Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${von}T00:00:00Z`);
  return Math.max(0, Math.floor(ms / 86_400_000) + 1);
}

export function tageImJahr(von: string, bis: string, jahr: number): number {
  return tageDiff(von < `${jahr}-01-01` ? `${jahr}-01-01` : von,
    bis > `${jahr}-12-31` ? `${jahr}-12-31` : bis);
}

/**
 * Verbrauchte Tage im laufenden Jahr für die Anspruchs-Anzeige — Spiegel
 * von `usedDays` in `scheduling.tsx`: `approved` **und** `requested`
 * zählen mit, und ein Zeitraum, der über den Jahreswechsel reicht, wird an
 * beiden Rändern gekappt.
 *
 * Bei Genehmigungen zählt nur `approved`; die Jahresgrenzen sind gleich.
 */
export function verbrauchteTage(
  urlaube: readonly Pick<MeinUrlaub, "von" | "bis" | "status">[],
  jahr: number = new Date().getFullYear(),
): number {
  return urlaube
    .filter((u) => u.status === "approved" || u.status === "requested")
    .reduce((summe, u) => summe + tageImJahr(u.von, u.bis, jahr), 0);
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
        a.status === "approved",
    )
    .reduce((summe, a) => summe + tageImJahr(a.von, a.bis, jahr), 0);
}

/**
 * „Genommener Urlaub" — überall dieselbe Rechnung (Nutzerentscheidung
 * 2026-10-04):
 *
 *     genommen = Vorab (`urlaub_vorab`) + offene + genehmigte Anträge, je Jahr
 *
 * Ein Antrag zählt ab dem Absenden, Ablehnen nimmt ihn heraus, Genehmigen
 * ändert nichts. **Berechnet, nicht mitgeführt** — `urlaub_vorab` trägt
 * nur, was vor QuickTeam lag, eine Zeile je Person und Jahr. Zeilen
 * anderer Jahre zählen nicht und werden nicht gelöscht. Dieselbe Summe
 * bildet `urlaub_beantragen` in der Datenbank.
 */
export function genommeneTage(
  vorab: number,
  urlaube: readonly Pick<MeinUrlaub, "von" | "bis" | "status">[],
  jahr: number,
): number {
  return vorab + verbrauchteTage(urlaube, jahr);
}

/**
 * Umkehrung fürs Profilfeld: der Chef trägt die **Gesamtzahl** ein,
 * gespeichert wird nur, was nicht schon als Antrag erfasst ist. Weniger
 * als die erfassten Anträge geht nicht — die nimmt nur ein Ablehnen heraus.
 */
export function vorabAusGesamt(
  gesamt: number,
  erfasst: number,
): { ok: true; vorab: number } | { ok: false; mindestens: number } {
  return gesamt < erfasst ? { ok: false, mindestens: erfasst } : { ok: true, vorab: gesamt - erfasst };
}

export type VorabZeile = { mitarbeiter_id: string; jahr: number; tage: number };

export function vorabFuer(zeilen: readonly VorabZeile[], mitarbeiterId: string, jahr: number): number {
  return zeilen.find((z) => z.mitarbeiter_id === mitarbeiterId && z.jahr === jahr)?.tage ?? 0;
}

/**
 * `urlaub_vorab` eines Betriebs für die genannten Jahre, optional nur eine
 * Person. Eingegrenzt auf den Betrieb, nicht nur über RLS (ein Konto mit
 * zwei Anstellungen sähe sonst beide). `null` bei Lesefehler — „nicht
 * lesbar" ist nicht „nichts vorab".
 */
export async function holeVorab(
  supabase: SupabaseServerClient,
  betriebId: string,
  jahre: readonly number[],
  mitarbeiterId?: string,
): Promise<VorabZeile[] | null> {
  let abfrage = supabase
    .from("urlaub_vorab")
    .select("mitarbeiter_id, jahr, tage")
    .eq("betrieb_id", betriebId)
    .in("jahr", [...jahre]);
  if (mitarbeiterId) abfrage = abfrage.eq("mitarbeiter_id", mitarbeiterId);
  const { data, error } = await abfrage;
  if (error) {
    console.error(`[dashboard/urlaub] vorab: ${error.message}`);
    return null;
  }
  return data ?? [];
}

/**
 * Schreibt die Vorab-Tage einer Person für ein Jahr (eine Zeile je Person
 * und Jahr, `upsert`); 0 entfernt die Zeile, statt für jedes gespeicherte
 * Profil eine Null-Zeile anzulegen. Nur der Chef kommt durch
 * (`urlaub_vorab_write_chef`); `.select()` macht ein von RLS geschlucktes
 * Schreiben sichtbar.
 */
export async function speichereVorab(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
  jahr: number,
  tage: number,
): Promise<boolean> {
  if (tage === 0) {
    const { error } = await supabase
      .from("urlaub_vorab")
      .delete()
      .eq("betrieb_id", betriebId)
      .eq("mitarbeiter_id", mitarbeiterId)
      .eq("jahr", jahr);
    if (error) console.error(`[dashboard/urlaub] vorab entfernen: ${error.message}`);
    return !error;
  }
  const { data, error } = await supabase
    .from("urlaub_vorab")
    .upsert(
      { betrieb_id: betriebId, mitarbeiter_id: mitarbeiterId, jahr, tage, geaendert_am: new Date().toISOString() },
      { onConflict: "mitarbeiter_id,jahr" },
    )
    .select("mitarbeiter_id");
  if (error || !data?.length) {
    console.error(`[dashboard/urlaub] vorab speichern: ${error?.message ?? "0 Zeilen"}`);
    return false;
  }
  return true;
}

/**
 * Offene und genehmigte Urlaubstage je Person in einem Jahr — der Teil von
 * „genommen", der aus `urlaub` kommt. `null` bei Lesefehler.
 */
export async function holeErfassteTage(
  supabase: SupabaseServerClient,
  betriebId: string,
  jahr: number,
  mitarbeiterId?: string,
): Promise<Map<string, number> | null> {
  let abfrage = supabase
    .from("urlaub")
    .select("mitarbeiter_id, von, bis, status")
    .eq("betrieb_id", betriebId)
    .in("status", ["approved", "requested"])
    .lte("von", `${jahr}-12-31`)
    .gte("bis", `${jahr}-01-01`);
  if (mitarbeiterId) abfrage = abfrage.eq("mitarbeiter_id", mitarbeiterId);
  const { data, error } = await abfrage;
  if (error) {
    console.error(`[dashboard/urlaub] erfasste tage: ${error.message}`);
    return null;
  }
  const jePerson = new Map<string, number>();
  for (const z of data ?? []) {
    jePerson.set(z.mitarbeiter_id, (jePerson.get(z.mitarbeiter_id) ?? 0) + tageImJahr(z.von, z.bis, jahr));
  }
  return jePerson;
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
