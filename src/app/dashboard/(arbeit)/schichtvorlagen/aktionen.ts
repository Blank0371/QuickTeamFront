"use server";

import { revalidatePath } from "next/cache";

import { betreteDashboard } from "@/lib/dashboard/zugang";
import type { FormZustand } from "@/lib/formular";
import { entferneVorlage, legeVorlageAn } from "@/lib/schichten-schreiben";
import { holeTexte } from "@/i18n/server";

/**
 * Server Actions der laufenden Vorlagenpflege.
 *
 * Derselbe Schreibweg wie Schritt 4 (`src/lib/schichten-schreiben.ts`),
 * nur mit dem Dashboard-Kontext: Betrieb aus der aktiven Position, nie
 * aus dem Formular. Die Chef-Prüfung ist — wie in der Team-Verwaltung —
 * eine Anzeigefrage, keine zweite Autorisierungsebene; `vorlagen_write_chef`
 * und `svm_write_chef` hängen an `ist_chef(betrieb_id)`.
 */

const PFAD = "/dashboard/schichtvorlagen";

async function alsChef() {
  const { supabase, position } = await betreteDashboard();
  return { supabase, betriebId: position.betriebId, chef: position.rolleTyp === "chef" };
}

async function nurChef(): Promise<FormZustand> {
  const t = (await holeTexte()).schichtvorlagen;
  return { status: "fehler", nachricht: t.nurChef, felder: {} };
}

export async function vorlageAnlegen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return nurChef();
  const ergebnis = await legeVorlageAn(supabase, betriebId, formData);
  if (ergebnis.status === "erfolg") revalidatePath(PFAD);
  return ergebnis;
}

export async function vorlageEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return nurChef();
  const ergebnis = await entferneVorlage(supabase, betriebId, formData);
  if (ergebnis.status === "erfolg") revalidatePath(PFAD);
  return ergebnis;
}
