"use server";

import { revalidatePath } from "next/cache";

import { erlaubteKategorien } from "@/lib/dashboard/mitteilungen";
import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { mitteilungSchema } from "@/lib/validierung";
import { holeValidierung } from "@/i18n/server";

/**
 * Server Actions von Mitteilungen.
 *
 * Geschrieben wird ausschliesslich über die vier SECURITY-DEFINER-RPCs aus
 * dem Parity-Audit (`ankuendigung_erstellen`, `aufgabe_umschalten`,
 * `abstimmen`) — nicht direkt in `benachrichtigungen` & Co. Die RPCs
 * leiten die handelnde Person selbst aus `auth.uid()` ab (bzw. bei
 * `abstimmen` aus dem geprüften `p_mitarbeiter_id`); hier steht keine
 * zweite Autorisierungsebene, nur eine Anzeigefrage vorab, damit ein
 * untergeschobenes Formular eine verständliche Absage bekommt statt eines
 * rohen RPC-Fehlers.
 */

const PFAD = "/dashboard/mitteilungen";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

export async function mitteilungErstellen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  const chef = position.rolleTyp === "chef";

  const roh = {
    typ: String(formData.get("typ") ?? ""),
    titel: String(formData.get("titel") ?? ""),
    text: String(formData.get("text") ?? ""),
    prioritaet: String(formData.get("prioritaet") ?? "normal"),
    items: formData.getAll("items").map(String),
    optionen: formData.getAll("optionen").map(String),
    mehrfachauswahl: formData.get("mehrfachauswahl") === "true",
    anonym: formData.get("anonym") === "true",
  };

  const geprueft = mitteilungSchema.safeParse(roh);
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const daten = geprueft.data;

  if (!erlaubteKategorien(chef).includes(daten.typ)) {
    return fehler("Diese Kategorie steht dir nicht zur Verfügung.");
  }

  const { error } = await supabase.rpc("ankuendigung_erstellen", {
    p_betrieb_id: position.betriebId,
    p_typ: daten.typ,
    p_titel: daten.titel,
    p_text: daten.typ === "allgemein" ? daten.text : null,
    p_prioritaet: daten.prioritaet,
    p_angeheftet: false,
    p_items: daten.typ === "aufgabenliste" ? daten.items : [],
    p_optionen: daten.typ === "umfrage" ? daten.optionen : [],
    p_mehrfachauswahl: daten.mehrfachauswahl,
    p_anonym: daten.anonym,
  });

  if (error) {
    console.error(`[dashboard/mitteilungen] erstellen: ${error.message}`);
    return fehler("Die Mitteilung liess sich nicht senden. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/** Hakt eine Aufgabe an oder ab — jedes aktive Mitglied darf, nicht nur der Chef. */
export async function aufgabeUmschalten(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase } = await betreteDashboard();

  const aufgabeId = String(formData.get("aufgabe_id") ?? "");
  if (!aufgabeId) return fehler("Es wurde keine Aufgabe angegeben.");

  const { error } = await supabase.rpc("aufgabe_umschalten", { p_aufgabe_id: aufgabeId });
  if (error) {
    console.error(`[dashboard/mitteilungen] aufgabeUmschalten: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Gibt eine Stimme ab. `option_ids` trägt bereits den vollständigen
 * nächsten Stimmzettel (siehe `naechsteAuswahl()`) — die Server Action
 * berechnet ihn nicht selbst, sie reicht ihn nur weiter. `abstimmen()`
 * selbst löscht zuerst die bisherigen Stimmen dieser Person und fügt dann
 * die neuen ein, ist also ohnehin ein vollständiger Ersatz, kein Zufügen.
 */
export async function stimmeAbgeben(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const benachrichtigungId = String(formData.get("benachrichtigung_id") ?? "");
  const optionIds = formData.getAll("option_ids").map(String).filter(Boolean);
  if (!benachrichtigungId) return fehler("Es wurde keine Umfrage angegeben.");

  const { error } = await supabase.rpc("abstimmen", {
    p_benachrichtigung_id: benachrichtigungId,
    p_option_ids: optionIds,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/mitteilungen] abstimmen: ${error.message}`);
    return fehler("Die Stimme liess sich nicht speichern. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
