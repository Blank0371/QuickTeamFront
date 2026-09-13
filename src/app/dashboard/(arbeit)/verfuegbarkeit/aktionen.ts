"use server";

import { revalidatePath } from "next/cache";

import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { holeValidierung } from "@/i18n/server";
import {
  tagesPraeferenzLoeschenSchema,
  tagesPraeferenzSchema,
  wiederkehrendePraeferenzenSchema,
} from "@/lib/validierung";

/**
 * Server Actions von Verfügbarkeit.
 *
 * Keine RPC — `mitarbeiter_schicht_vorlieben` und
 * `mitarbeiter_schicht_tagesvorlieben` tragen nur eine `ALL`-Policy auf
 * `mitarbeiter_id = meine_mitarbeiter_id(betrieb_id)`, geschrieben wird
 * direkt wie in `scheduling.tsx`.
 */

const PFAD = "/dashboard/verfuegbarkeit";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

/**
 * Speichert alle gesammelten wiederkehrenden Wünsche in einem Zug —
 * Entscheidung vom 2026-09-01: erst auswählen, dann speichern oder
 * verwerfen, statt wie `toggleRecur()` in `scheduling.tsx` pro Klick
 * sofort zu schreiben. Die Auswahl selbst (welcher Klick welchen
 * bestehenden Wunsch umschaltet) läuft clientseitig in
 * `verfuegbarkeit-liste.tsx`; hier kommt nur noch die fertige Liste an.
 *
 * `praeferenz: null` heisst „entfernen" (`.delete()`), sonst wird
 * upsertet — beides in je einem Aufruf für alle betroffenen Vorlagen,
 * nicht pro Zeile einzeln.
 */
export async function speichereWiederkehrendePraeferenzen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  let roh: unknown;
  try {
    roh = JSON.parse(String(formData.get("aenderungen") ?? "[]"));
  } catch {
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  const geprueft = wiederkehrendePraeferenzenSchema.safeParse(roh);
  if (!geprueft.success) {
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }
  const aenderungen = geprueft.data;
  if (aenderungen.length === 0) {
    return { status: "erfolg", nachricht: null, felder: {} };
  }

  const zuLoeschen = aenderungen.filter((a) => a.praeferenz === null).map((a) => a.schichtVorlageId);
  const zuSetzen = aenderungen.filter((a) => a.praeferenz !== null);

  if (zuLoeschen.length > 0) {
    const { error } = await supabase
      .from("mitarbeiter_schicht_vorlieben")
      .delete()
      .eq("mitarbeiter_id", position.mitarbeiterId)
      .in("schicht_vorlage_id", zuLoeschen);

    if (error) {
      console.error(`[dashboard/verfuegbarkeit] wiederkehrend loeschen: ${error.message}`);
      return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  if (zuSetzen.length > 0) {
    const { error } = await supabase.from("mitarbeiter_schicht_vorlieben").upsert(
      zuSetzen.map((a) => ({
        betrieb_id: position.betriebId,
        mitarbeiter_id: position.mitarbeiterId,
        schicht_vorlage_id: a.schichtVorlageId,
        praeferenz: a.praeferenz,
      })),
      { onConflict: "mitarbeiter_id,schicht_vorlage_id" },
    );

    if (error) {
      console.error(`[dashboard/verfuegbarkeit] wiederkehrend setzen: ${error.message}`);
      return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: "Gespeichert.", felder: {} };
}

export async function setzeTagesPraeferenz(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const geprueft = tagesPraeferenzSchema.safeParse({
    schichtVorlageId: String(formData.get("schicht_vorlage_id") ?? ""),
    datum: String(formData.get("datum") ?? ""),
    praeferenz: String(formData.get("praeferenz") ?? ""),
  });
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const { schichtVorlageId, datum, praeferenz } = geprueft.data;

  const { data: bestehend } = await supabase
    .from("mitarbeiter_schicht_tagesvorlieben")
    .select("praeferenz, geloescht_am")
    .eq("mitarbeiter_id", position.mitarbeiterId)
    .eq("schicht_vorlage_id", schichtVorlageId)
    .eq("datum", datum)
    .maybeSingle();

  const aktiv = bestehend !== null && bestehend.geloescht_am === null;

  const { error } =
    aktiv && bestehend?.praeferenz === praeferenz
      ? await supabase
          .from("mitarbeiter_schicht_tagesvorlieben")
          .update({ geloescht_am: new Date().toISOString() })
          .eq("mitarbeiter_id", position.mitarbeiterId)
          .eq("schicht_vorlage_id", schichtVorlageId)
          .eq("datum", datum)
      : await supabase.from("mitarbeiter_schicht_tagesvorlieben").upsert(
          {
            betrieb_id: position.betriebId,
            mitarbeiter_id: position.mitarbeiterId,
            schicht_vorlage_id: schichtVorlageId,
            datum,
            praeferenz,
            geloescht_am: null,
          },
          { onConflict: "mitarbeiter_id,schicht_vorlage_id,datum" },
        );

  if (error) {
    console.error(`[dashboard/verfuegbarkeit] tagesvorlieben: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function loescheTagesPraeferenz(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const geprueft = tagesPraeferenzLoeschenSchema.safeParse({
    schichtVorlageId: String(formData.get("schicht_vorlage_id") ?? ""),
    datum: String(formData.get("datum") ?? ""),
  });
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const { schichtVorlageId, datum } = geprueft.data;

  const { error } = await supabase
    .from("mitarbeiter_schicht_tagesvorlieben")
    .update({ geloescht_am: new Date().toISOString() })
    .eq("mitarbeiter_id", position.mitarbeiterId)
    .eq("schicht_vorlage_id", schichtVorlageId)
    .eq("datum", datum);

  if (error) {
    console.error(`[dashboard/verfuegbarkeit] loeschen: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
