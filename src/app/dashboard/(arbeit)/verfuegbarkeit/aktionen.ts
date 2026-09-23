"use server";

import { revalidatePath } from "next/cache";

import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { holeValidierung } from "@/i18n/server";
import {
  tagesNotizSchema,
  tagesPraeferenzLoeschenSchema,
  tageswuenscheSchema,
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

/**
 * Speichert die gesammelten Tageswünsche aus `TagesWunschEditor` in einem
 * Zug — erst auswählen (Wunsch, optional Notiz), dann bestätigen, wie bei
 * den wiederkehrenden Wünschen. Ersetzt das sofortige Schreiben pro Klick
 * (`toggleSpecial()` in `scheduling.tsx`).
 *
 * `praeferenz: null` löscht weich (wie die App) und leert die Notiz mit;
 * sonst wird upsertet — mit `notiz` und `geloescht_am: null`, damit eine
 * weich gelöschte Zeile samt alter Notiz nicht wieder auftaucht.
 */
export async function speichereTageswuensche(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  let roh: unknown;
  try {
    roh = JSON.parse(String(formData.get("aenderungen") ?? "[]"));
  } catch {
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  const geprueft = tageswuenscheSchema.safeParse(roh);
  if (!geprueft.success) {
    const felder = feldFehler(geprueft.error, await holeValidierung());
    return fehler(Object.values(felder)[0] ?? "Das hat nicht geklappt. Versuch es noch einmal.");
  }
  const aenderungen = geprueft.data;
  if (aenderungen.length === 0) {
    return { status: "erfolg", nachricht: null, felder: {} };
  }

  for (const a of aenderungen.filter((a) => a.praeferenz === null)) {
    const { error } = await supabase
      .from("mitarbeiter_schicht_tagesvorlieben")
      .update({ geloescht_am: new Date().toISOString(), notiz: null })
      .eq("mitarbeiter_id", position.mitarbeiterId)
      .eq("schicht_vorlage_id", a.schichtVorlageId)
      .eq("datum", a.datum);

    if (error) {
      console.error(`[dashboard/verfuegbarkeit] tageswunsch loeschen: ${error.message}`);
      return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  const zuSetzen = aenderungen.filter((a) => a.praeferenz !== null);
  if (zuSetzen.length > 0) {
    const { error } = await supabase.from("mitarbeiter_schicht_tagesvorlieben").upsert(
      zuSetzen.map((a) => ({
        betrieb_id: position.betriebId,
        mitarbeiter_id: position.mitarbeiterId,
        schicht_vorlage_id: a.schichtVorlageId,
        datum: a.datum,
        praeferenz: a.praeferenz,
        notiz: a.notiz,
        geloescht_am: null,
      })),
      { onConflict: "mitarbeiter_id,schicht_vorlage_id,datum" },
    );

    if (error) {
      console.error(`[dashboard/verfuegbarkeit] tageswunsch setzen: ${error.message}`);
      return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
    }
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: "Gespeichert.", felder: {} };
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
    .update({ geloescht_am: new Date().toISOString(), notiz: null })
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

/**
 * Notiz zu einem bestehenden Tageswunsch setzen oder (leer) entfernen.
 * Web-eigen, kein Gegenstück in `scheduling.tsx`. Schreibt nur auf eine
 * aktive Zeile — ohne Wunsch keine Notiz; `.select()` zeigt, ob eine
 * Zeile getroffen wurde (RLS filtert still, statt zu werfen).
 */
export async function speichereTagesNotiz(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  const geprueft = tagesNotizSchema.safeParse({
    schichtVorlageId: String(formData.get("schicht_vorlage_id") ?? ""),
    datum: String(formData.get("datum") ?? ""),
    notiz: String(formData.get("notiz") ?? ""),
  });
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const { schichtVorlageId, datum, notiz } = geprueft.data;

  const { data, error } = await supabase
    .from("mitarbeiter_schicht_tagesvorlieben")
    .update({ notiz })
    .eq("mitarbeiter_id", position.mitarbeiterId)
    .eq("schicht_vorlage_id", schichtVorlageId)
    .eq("datum", datum)
    .is("geloescht_am", null)
    .select("datum");

  if (error) {
    console.error(`[dashboard/verfuegbarkeit] notiz: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }
  if (!data || data.length === 0) {
    return fehler("Diesen Wunsch gibt es nicht mehr.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: notiz ? "Notiz gespeichert." : "Notiz entfernt.", felder: {} };
}
