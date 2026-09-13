"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { holeValidierung } from "@/i18n/server";
import {
  schichtFelderSchema,
  schichtLoeschenSchema,
  schichtZuweisenSchema,
  schichtZuweisungEntfernenSchema,
} from "@/lib/validierung";

/**
 * Server Actions der manuellen Schichtzuweisung — Spiegel von `assign()`/
 * `unassign()` in `shift/[id].tsx`. Beide RPCs sind SECURITY DEFINER und
 * prüfen `ist_chef(betrieb_id)` selbst gegen `auth.uid()`; die Prüfung
 * hier ist nur bessere Fehlermeldung, keine zweite Autorisierungsebene.
 *
 * `schicht_zuweisen` deckt sowohl „neu zuweisen" als auch „Rolle ändern"
 * ab — ein Upsert auf `(schicht_instanz_id, mitarbeiter_id)`, genau wie
 * im Quelltext der App.
 */

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

/**
 * Übersetzt die Ausnahmen aus `pruefe_zuweisung_constraints` — Spiegel
 * von `assignFailureReason()`/`translateShiftError()` in der App. Die
 * Codes (`HC-1`..`HC-5`) stehen wörtlich im Trigger, am 2026-09-01 gegen
 * `pg_proc` nachgesehen.
 */
function zuweisungsFehlerText(message: string): string {
  if (message.includes("HC-1") || message.includes("Urlaub")) {
    return "Diese Person hat an diesem Tag genehmigten Urlaub.";
  }
  if (message.includes("HC-2") || message.includes("ueberlappende")) {
    return "Diese Person ist an diesem Tag schon für eine andere Schicht eingeteilt.";
  }
  if (message.includes("HC-4") || message.includes("Ruhezeit")) {
    return "Das unterschreitet die gesetzliche Mindestruhezeit dieser Person.";
  }
  if (message.includes("Tageshoechstarbeitszeit")) {
    return "Das überschreitet die gesetzliche Tageshöchstarbeitszeit dieser Person.";
  }
  if (
    message.includes("Wochenhoechstarbeitszeit") ||
    message.includes("HC-5") ||
    message.includes("max_stunden_hart")
  ) {
    return "Das überschreitet die Wochenhöchstarbeitszeit dieser Person.";
  }
  if (message.includes("HC-3") || message.includes("qualifiziert")) {
    return "Diese Person ist für diese Rolle nicht qualifiziert.";
  }
  if (message.includes("deaktiviert")) {
    return "Diese Person ist deaktiviert und kann nicht eingeteilt werden.";
  }
  if (message.includes("Nur Chef")) {
    return "Dafür fehlt dir die Berechtigung.";
  }
  if (message.includes("nicht gefunden")) {
    return "Diese Schicht gibt es nicht mehr.";
  }
  return "Das hat nicht geklappt. Versuch es noch einmal.";
}

export async function mitarbeiterZuweisen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  if (!istChef(position)) {
    return fehler("Dafür fehlt dir die Berechtigung.");
  }

  const geprueft = schichtZuweisenSchema.safeParse({
    instanzId: String(formData.get("instanz_id") ?? ""),
    mitarbeiterId: String(formData.get("mitarbeiter_id") ?? ""),
    rolleId: String(formData.get("rolle_id") ?? ""),
  });
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const { instanzId, mitarbeiterId, rolleId } = geprueft.data;

  const { error } = await supabase.rpc("schicht_zuweisen", {
    p_instanz_id: instanzId,
    p_mitarbeiter_id: mitarbeiterId,
    p_rolle_id: rolleId,
  });

  if (error) {
    console.error(`[dashboard/schicht] zuweisen: ${error.message}`);
    return fehler(zuweisungsFehlerText(error.message));
  }

  revalidatePath(`/dashboard/schicht/${instanzId}`);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function zuweisungEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  if (!istChef(position)) {
    return fehler("Dafür fehlt dir die Berechtigung.");
  }

  const geprueft = schichtZuweisungEntfernenSchema.safeParse({
    instanzId: String(formData.get("instanz_id") ?? ""),
    mitarbeiterId: String(formData.get("mitarbeiter_id") ?? ""),
  });
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const { instanzId, mitarbeiterId } = geprueft.data;

  const { error } = await supabase.rpc("schicht_zuweisung_loeschen", {
    p_instanz_id: instanzId,
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/schicht] entfernen: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(`/dashboard/schicht/${instanzId}`);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Spiegel von `saveDetails()` — Datum, Start, Ende, Kommentar direkt auf
 * `schicht_instanzen`, keine RPC (`instanzen_write_chef` erlaubt es dem
 * Chef direkt). Anders als die App wird der Schreibfehler hier geprüft
 * und gemeldet, nicht verschluckt — Entscheidung vom 2026-09-01, um die
 * Konvention der übrigen Server Actions in diesem Projekt nicht zu
 * brechen.
 */
export async function schichtFelderSpeichern(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  if (!istChef(position)) {
    return fehler("Dafür fehlt dir die Berechtigung.");
  }

  const roh = {
    instanzId: String(formData.get("instanz_id") ?? ""),
    datum: String(formData.get("datum") ?? ""),
    startZeit: String(formData.get("start_zeit") ?? ""),
    endZeit: String(formData.get("end_zeit") ?? ""),
    kommentar: String(formData.get("kommentar") ?? ""),
  };

  const geprueft = schichtFelderSchema.safeParse(roh);
  if (!geprueft.success) {
    /*
     * `werte` reicht die Eingabe zurück, sonst fiele das Formular nach
     * einem Fehler auf die zuletzt gespeicherten `defaultValue`-Props
     * zurück — die Fehlermeldung spräche dann über eine Uhrzeit, die gar
     * nicht mehr im Feld steht. Am 2026-09-01 beim eigenen Test bemerkt.
     */
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: { datum: roh.datum, start_zeit: roh.startZeit, end_zeit: roh.endZeit, kommentar: roh.kommentar },
    };
  }
  const { instanzId, datum, startZeit, endZeit, kommentar } = geprueft.data;

  const { error } = await supabase
    .from("schicht_instanzen")
    .update({ datum, start_zeit: startZeit, end_zeit: endZeit, kommentar })
    .eq("id", instanzId);

  if (error) {
    console.error(`[dashboard/schicht] felder: ${error.message}`);
    return fehler(
      error.message.includes("chk_instanz_zeiten_verschieden")
        ? "Start und Ende dürfen nicht gleich sein."
        : "Das hat nicht geklappt. Versuch es noch einmal.",
    );
  }

  revalidatePath(`/dashboard/schicht/${instanzId}`);
  return { status: "erfolg", nachricht: "Gespeichert.", felder: {} };
}

/**
 * Spiegel von `deleteShift()` — löscht die Instanz, verlässt sich auf
 * `ON DELETE CASCADE` für Zuweisungen, Notizen und Ausschreibungen
 * (am 2026-09-01 gegen `pg_constraint` bestätigt). **Nicht** kaskadiert:
 * `notfaelle.schicht_instanz_id`/`schicht_zuweisung_id` — keine FK.
 * Gemeldet, nicht repariert; betrifft auch die App gleichermassen.
 *
 * Erfolgreich verlässt die Funktion die Seite per `redirect()`, wie
 * `onClose()`/`router.back()` in der App — es gibt danach nichts mehr,
 * das die Seite noch zeigen könnte.
 */
export async function schichtLoeschen(_vorher: FormZustand, formData: FormData): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();
  if (!istChef(position)) {
    return fehler("Dafür fehlt dir die Berechtigung.");
  }

  const geprueft = schichtLoeschenSchema.safeParse({
    instanzId: String(formData.get("instanz_id") ?? ""),
  });
  if (!geprueft.success) {
    return { status: "fehler", nachricht: null, felder: feldFehler(geprueft.error, await holeValidierung()) };
  }
  const { instanzId } = geprueft.data;
  const monat = String(formData.get("monat") ?? "");

  const { error } = await supabase.from("schicht_instanzen").delete().eq("id", instanzId);

  if (error) {
    console.error(`[dashboard/schicht] loeschen: ${error.message}`);
    return fehler("Die Schicht liess sich nicht löschen. Versuch es noch einmal.");
  }

  redirect(/^\d{4}-\d{2}$/.test(monat) ? `/dashboard/kalender?monat=${monat}` : "/dashboard/kalender");
}
