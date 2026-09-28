"use server";

import { revalidatePath } from "next/cache";

import { genehmigteTageOhne, tageImJahr } from "@/lib/dashboard/urlaub";
import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { urlaubAntragSchema, urlaubEntscheidungSchema } from "@/lib/validierung";
import { holeTexte, holeValidierung } from "@/i18n/server";
import { fuelle } from "@/i18n/text";

/**
 * Server Actions von Urlaub.
 *
 * Mitarbeiter-Seite: ausschliesslich über die SECURITY-DEFINER-RPC
 * `urlaub_beantragen` — sie leitet `p_mitarbeiter_id` gegen `auth.uid()`
 * neu ab und prüft Datum, Kontingent, verplante Schichten und
 * veröffentlichte Pläne serverseitig; die vier Fehlercodes (`URLAUB_*`)
 * spiegeln `ERR_KEYS` aus `scheduling.tsx`.
 *
 * Chef-Seite: `urlaub` hat keine RPC dafür, nur die Policy
 * `urlaub_update_chef` (`ist_chef(betrieb_id)`) — geschrieben wird direkt.
 * Der Kontingent-Wächter vor einer Genehmigung ist in der App reines
 * Client-JavaScript (`decide()` in `manager.tsx`); hier läuft dieselbe
 * Rechnung in der Server Action statt im Browser — das ist eine
 * Verlagerung an denselben Vertrauensrang (die Aktion läuft ohnehin unter
 * der Sitzung des Chefs), keine neue Prüfung.
 */

const PFAD = "/dashboard/urlaub";

function fehler(
  nachricht: string,
  felder: Record<string, string> = {},
  werte?: Record<string, string>,
): FormZustand {
  return { status: "fehler", nachricht, felder, werte };
}

async function texte() {
  return (await holeTexte()).urlaub;
}

export async function beantragen(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const roh = {
    von: String(formData.get("von") ?? ""),
    bis: String(formData.get("bis") ?? ""),
    kommentar: String(formData.get("kommentar") ?? ""),
  };

  const geprueft = urlaubAntragSchema.safeParse(roh);
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()), werte: roh };
  }
  const daten = geprueft.data;

  const { error } = await supabase.rpc("urlaub_beantragen", {
    p_betrieb_id: position.betriebId,
    p_mitarbeiter_id: position.mitarbeiterId,
    p_von: daten.von,
    p_bis: daten.bis,
    p_kommentar: daten.kommentar,
  });

  if (error) {
    const code = error.message.trim();
    console.error(`[dashboard/urlaub] beantragen: ${error.message}`);
    const t = await texte();
    const rpcFehler: Record<string, string> = t.rpc;
    return fehler(rpcFehler[code] ?? t.nochmal, {}, roh);
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function entscheiden(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  const t = await texte();
  if (position.rolleTyp !== "chef") {
    return fehler(t.nurChef);
  }

  const roh = {
    urlaubId: String(formData.get("urlaub_id") ?? ""),
    status: String(formData.get("status") ?? ""),
    begruendung: String(formData.get("begruendung") ?? ""),
  };
  const geprueft = urlaubEntscheidungSchema.safeParse(roh);
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const daten = geprueft.data;

  if (daten.status === "approved") {
    const { data: antrag, error: antragFehler } = await supabase
      .from("urlaub")
      .select("id, mitarbeiter_id, von, bis")
      .eq("id", daten.urlaubId)
      .eq("betrieb_id", position.betriebId)
      .single();

    if (antragFehler || !antrag) {
      return fehler(t.antragWeg);
    }

    const [{ data: mitarbeiterZeile, error: mitarbeiterFehler }, { data: genehmigt, error: urlaubFehler }] = await Promise.all([
      supabase.from("mitarbeiter").select("urlaubsanspruch_tage").eq("id", antrag.mitarbeiter_id).single(),
      supabase
        .from("urlaub")
        .select("id, mitarbeiter_id, von, bis, status")
        .eq("mitarbeiter_id", antrag.mitarbeiter_id)
        .eq("status", "approved"),
    ]);

    if (mitarbeiterFehler || urlaubFehler || !mitarbeiterZeile || !genehmigt) {
      return fehler(t.anspruchUnlesbar);
    }
    const anspruch = mitarbeiterZeile.urlaubsanspruch_tage ?? 0;
    for (let jahr = Number(antrag.von.slice(0, 4)); jahr <= Number(antrag.bis.slice(0, 4)); jahr++) {
      const bereits = genehmigteTageOhne(
        genehmigt.map((g) => ({ id: g.id, mitarbeiterId: g.mitarbeiter_id, von: g.von, bis: g.bis, status: "approved" as const })),
        antrag.mitarbeiter_id,
        antrag.id,
        jahr,
      );
      const beantragt = tageImJahr(antrag.von, antrag.bis, jahr);
      if (bereits + beantragt > anspruch) {
        const rest = Math.max(0, anspruch - bereits);
        return fehler(fuelle(t.anspruchUeberschritten, { jahr, rest, anspruch, beantragt }));
      }
    }
  }

  const { data: aktualisiert, error } = await supabase
    .from("urlaub")
    .update({ status: daten.status, begruendung: daten.begruendung })
    .eq("id", daten.urlaubId)
    .eq("betrieb_id", position.betriebId)
    .select("id");

  if (error) {
    console.error(`[dashboard/urlaub] entscheiden: ${error.message}`);
    return fehler(t.nochmal);
  }

  if (!aktualisiert?.length) return fehler(t.antragWegNeuLaden);

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
