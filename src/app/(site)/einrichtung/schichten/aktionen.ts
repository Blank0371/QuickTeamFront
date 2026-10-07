"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { holeChefBetriebId } from "@/lib/betrieb";
import type { FormZustand } from "@/lib/formular";
import { bearbeiteVorlage, entferneVorlage, legeVorlageAn } from "@/lib/schichten-schreiben";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions von Schritt 4.
 *
 * Der Schreibweg selbst liegt in `src/lib/schichten-schreiben.ts` und
 * wird mit dem Dashboard geteilt; hier stehen nur Session, Betrieb und
 * der Pfad, der danach neu geladen wird.
 */

const PFAD = "/einrichtung/schichten";

async function kontext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const betriebId = await holeChefBetriebId(supabase);
  if (betriebId === null) redirect("/einrichtung/betrieb");

  return { supabase, betriebId };
}

export async function vorlageAnlegen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await kontext();
  const ergebnis = await legeVorlageAn(supabase, betriebId, formData);
  if (ergebnis.status === "erfolg") revalidatePath(PFAD);
  return ergebnis;
}

export async function vorlageBearbeiten(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await kontext();
  const ergebnis = await bearbeiteVorlage(supabase, betriebId, formData);
  if (ergebnis.status === "erfolg") revalidatePath(PFAD);
  return ergebnis;
}

export async function vorlageEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await kontext();
  const ergebnis = await entferneVorlage(supabase, betriebId, formData);
  if (ergebnis.status === "erfolg") revalidatePath(PFAD);
  return ergebnis;
}

/** Einrichtung abschliessen — die Ableitung entscheidet, ob das trägt. */
export async function zumAbschluss(): Promise<void> {
  redirect("/einrichtung");
}
