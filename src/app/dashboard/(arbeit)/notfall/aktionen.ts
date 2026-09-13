"use server";

import { revalidatePath } from "next/cache";

import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { notfallMeldungSchema } from "@/lib/validierung";
import { holeValidierung } from "@/i18n/server";

/**
 * Server Actions von Notfall.
 *
 * Geschrieben wird ausschliesslich über die drei SECURITY-DEFINER-RPCs aus
 * dem Parity-Audit (`notfall_melden`, `notfall_vertretung_ausschreiben`,
 * `notfall_vertretung_uebernehmen`) — `notfaelle` hat keine
 * Client-Schreib-Policy, nur `SELECT`. Die RPCs leiten die handelnde
 * Person aus `auth.uid()` ab (`meine_mitarbeiter_id`/`ist_chef`), nie aus
 * einem hereingereichten Wert.
 */

const PFAD = "/dashboard/notfall";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

export async function melden(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const roh = {
    zuweisungId: String(formData.get("zuweisung_id") ?? ""),
    grund: String(formData.get("grund") ?? ""),
  };

  const geprueft = notfallMeldungSchema.safeParse(roh);
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const daten = geprueft.data;

  const { error } = await supabase.rpc("notfall_melden", {
    p_zuweisung_id: daten.zuweisungId,
    p_grund: daten.grund,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/notfall] melden: ${error.message}`);
    /*
     * Der wahrscheinlichste Grund ist keine falsche Eingabe, sondern ein
     * überholter Formularzustand: die Schicht wurde inzwischen schon
     * gemeldet (RPC wirft „Fuer diese Schicht wurde bereits ein Notfall
     * gemeldet") oder liegt nicht mehr in der Zukunft.
     */
    return fehler("Das hat nicht geklappt — lad die Seite neu und versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Schreibt eine gemeldete Schicht als Vertretung aus. Ruft die RPC **ohne**
 * `p_mitarbeiter_id` — sie prüft `ist_chef(betrieb_id)` direkt gegen
 * `auth.uid()`, genau wie `tausch_entscheiden`.
 */
export async function ausschreiben(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  if (position.rolleTyp !== "chef") {
    return fehler("Nur die Betriebsleitung darf eine Vertretung ausschreiben.");
  }

  const notfallId = String(formData.get("notfall_id") ?? "");
  if (!notfallId) return fehler("Dieser Notfall gibt es nicht mehr.");

  const { error } = await supabase.rpc("notfall_vertretung_ausschreiben", {
    p_notfall_id: notfallId,
  });

  if (error) {
    console.error(`[dashboard/notfall] ausschreiben: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function uebernehmen(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const benachrichtigungId = String(formData.get("benachrichtigung_id") ?? "");
  if (!benachrichtigungId) return fehler("Diese Vertretung ist nicht mehr offen.");

  const { data: code, error } = await supabase.rpc("notfall_vertretung_uebernehmen", {
    p_benachrichtigung_id: benachrichtigungId,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/notfall] uebernehmen: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  const MELDUNG: Record<string, string> = {
    bereits_besetzt: "Diese Schicht ist schon vergeben.",
    nicht_qualifiziert: "Dir fehlt die erforderliche Rolle.",
    schon_zugewiesen: "Du bist für diese Schicht schon eingeteilt.",
    nicht_moeglich: "Das liess sich nicht zuweisen. Versuch es noch einmal.",
  };

  if (code !== "besetzt") {
    return fehler(MELDUNG[code as string] ?? "Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
