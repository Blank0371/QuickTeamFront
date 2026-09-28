"use server";

import { revalidatePath } from "next/cache";

import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { tauschAngebotSchema } from "@/lib/validierung";
import { holeTexte, holeValidierung } from "@/i18n/server";

/**
 * Server Actions von Tausch.
 *
 * Geschrieben wird ausschliesslich über die fünf SECURITY-DEFINER-RPCs aus
 * dem Parity-Audit (`tausch_anbieten`, `tausch_annehmen`,
 * `tausch_anbieter_entscheiden`, `tausch_entscheiden`,
 * `tausch_zurueckziehen`) — `schichttausch_anfragen` hat keine
 * Client-Schreib-Policy, nur `SELECT`. Jede Aktion prüft zusätzlich eine
 * Anzeigefrage vorab (bin ich überhaupt die richtige Person für diesen
 * Knopf?), verlässt sich für die eigentliche Berechtigung aber auf die
 * RPCs selbst — die leiten die handelnde Person aus `auth.uid()` ab
 * (`_tausch_akteur`/`ist_chef`), nie aus einem hereingereichten Wert.
 */

const PFAD = "/dashboard/tausch";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

async function texte() {
  return (await holeTexte()).tausch;
}

export async function angebotErstellen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const roh = {
    instanzId: String(formData.get("instanz_id") ?? ""),
    praeferenzTage: formData.getAll("praeferenz_tage").map(String),
  };

  const geprueft = tauschAngebotSchema.safeParse(roh);
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const daten = geprueft.data;

  const { data: benachrichtigungId, error } = await supabase.rpc("tausch_anbieten", {
    p_instanz_id: daten.instanzId,
    p_praeferenz_tage: daten.praeferenzTage,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/tausch] anbieten: ${error.message}`);
    return fehler((await texte()).anlegenFehler);
  }

  /*
   * `null` heisst: niemand im Betrieb könnte diesen Tausch gerade
   * abschliessen (Rolle, Verfügbarkeit, Wunschtage) — die RPC legt dann
   * bewusst nichts an. Kein Fehler, sondern eine ehrliche Auskunft,
   * genau wie in `compose.tsx`s „notPossibleTitle/notPossibleBody".
   */
  if (!benachrichtigungId) {
    return fehler((await texte()).niemandPasst);
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function antworten(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const benachrichtigungId = String(formData.get("benachrichtigung_id") ?? "");
  const gegenZuweisungId = String(formData.get("gegen_zuweisung_id") ?? "");
  const t = await texte();
  if (!benachrichtigungId) return fehler(t.ungueltigNeuLaden);
  if (!gegenZuweisungId) return fehler(t.eigeneWaehlen);

  const { data: code, error } = await supabase.rpc("tausch_annehmen", {
    p_benachrichtigung_id: benachrichtigungId,
    p_gegen_zuweisung_id: gegenZuweisungId,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/tausch] annehmen: ${error.message}`);
    return fehler(t.nochmal);
  }

  const meldung: Record<string, string> = t.code;

  if (code !== "angefragt") {
    return fehler(meldung[code as string] ?? t.nochmal);
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function anbieterEntscheiden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const anfrageId = String(formData.get("anfrage_id") ?? "");
  const zustimmen = String(formData.get("zustimmen") ?? "") === "true";
  const t = await texte();
  if (!anfrageId) return fehler(t.anfrageWeg);

  const { error } = await supabase.rpc("tausch_anbieter_entscheiden", {
    p_anfrage_id: anfrageId,
    p_zustimmen: zustimmen,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/tausch] anbieterEntscheiden: ${error.message}`);
    return fehler(t.nochmal);
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Chef-Freigabe. Ruft `tausch_entscheiden` **ohne** `p_mitarbeiter_id` —
 * die RPC prüft `ist_chef(betrieb_id)` direkt gegen `auth.uid()`, nimmt
 * also gar keine Positions-ID entgegen. `p_grund` bleibt `null`: die
 * Referenz-App hat dafür kein Eingabefeld (Parity-Audit, Punkt 2), ein
 * eigenes wäre eine neue Funktion, keine Portierung.
 */
export async function chefEntscheiden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  const t = await texte();
  if (position.rolleTyp !== "chef") {
    return fehler(t.nurChef);
  }

  const anfrageId = String(formData.get("anfrage_id") ?? "");
  const genehmigt = String(formData.get("genehmigt") ?? "") === "true";
  if (!anfrageId) return fehler(t.anfrageWeg);

  const { error } = await supabase.rpc("tausch_entscheiden", {
    p_anfrage_id: anfrageId,
    p_genehmigt: genehmigt,
    p_grund: null,
  });

  if (error) {
    console.error(`[dashboard/tausch] chefEntscheiden: ${error.message}`);
    return fehler(t.nochmal);
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Nimmt ein eigenes Angebot zurück. Die RPC selbst erlaubt das noch bis
 * `wartet_auf_chef`, die Referenz-UI zeigt den Knopf aber nur bei
 * `offen` (`SwapModal` in `messages.tsx`) — dieselbe Beschränkung gilt
 * hier, siehe `tausch-liste.tsx`.
 */
export async function zurueckziehen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const anfrageId = String(formData.get("anfrage_id") ?? "");
  const t = await texte();
  if (!anfrageId) return fehler(t.anfrageWeg);

  const { error } = await supabase.rpc("tausch_zurueckziehen", {
    p_anfrage_id: anfrageId,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/tausch] zurueckziehen: ${error.message}`);
    return fehler(t.nochmal);
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
