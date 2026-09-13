"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { holeChefBetriebId } from "@/lib/betrieb";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { holeRollen } from "@/lib/team";
import { createClient } from "@/lib/supabase/server";
import { mindestanzahlSchema, vorlagenSchema } from "@/lib/validierung";
import { holeValidierung } from "@/i18n/server";

/**
 * Server Actions von Schritt 4.
 *
 * Die Konventionen stammen aus `manager.tsx` und sind dort am
 * 2026-08-23 nachgelesen worden:
 *
 *   · `wochentag` montagsbasiert, 0 = Montag (siehe `src/lib/schichten.ts`)
 *   · Zeiten als `HH:MM:00` — die App hängt die Sekunden ebenso an
 *   · `aktiv: true` beim Anlegen
 *   · in `schicht_vorlage_mindestbesetzung` landen nur Zeilen mit
 *     `mindestanzahl > 0`; die App filtert vor dem Insert genauso
 */

const PFAD = "/einrichtung/schichten";

async function kontext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const betriebId = await holeChefBetriebId(supabase);
  if (betriebId === null) redirect("/einrichtung/konto");

  return { supabase, betriebId };
}

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

export async function vorlageAnlegen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await kontext();

  const roh = {
    bezeichnung: String(formData.get("bezeichnung") ?? ""),
    wochentag: String(formData.get("wochentag") ?? ""),
    start_zeit: String(formData.get("start_zeit") ?? ""),
    end_zeit: String(formData.get("end_zeit") ?? ""),
  };

  const geprueft = vorlagenSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: roh,
    };
  }

  /*
   * Mindestbesetzung einsammeln, bevor irgendetwas geschrieben wird.
   *
   * Eine Vorlage ohne eine einzige Rolle mit Bedarf ist in der App
   * unsichtbar — `scheduling.tsx` behält nur Vorlagen, für die eine
   * Mindestbesetzungs-Zeile mit einer zugewiesenen Rolle existiert. Sie
   * anzulegen hiesse, dem Chef etwas zu bestätigen, das nie jemand zu
   * sehen bekommt. Deshalb ist das hier eine Eingabebedingung und keine
   * Nachbesserung.
   */
  const rollen = await holeRollen(supabase, betriebId);
  const bedarf: { rolle_id: string; mindestanzahl: number }[] = [];

  for (const rolle of rollen) {
    const eingabe = formData.get(`bedarf_${rolle.id}`);
    if (eingabe === null) continue;
    const anzahl = mindestanzahlSchema.safeParse(eingabe);
    if (!anzahl.success) {
      return fehler(`Die Anzahl für „${rolle.name}" ist keine gültige Zahl.`, {
        [`bedarf_${rolle.id}`]: "Bitte eine Zahl von 0 bis 99.",
      });
    }
    if (anzahl.data > 0) {
      bedarf.push({ rolle_id: rolle.id, mindestanzahl: anzahl.data });
    }
  }

  if (bedarf.length === 0) {
    return {
      status: "fehler",
      nachricht:
        "Trag bei mindestens einer Rolle ein, wie viele Leute gebraucht werden — sonst taucht die Schicht in der App gar nicht auf.",
      felder: {},
      werte: roh,
    };
  }

  const daten = geprueft.data;

  const { data: vorlage, error } = await supabase
    .from("schicht_vorlagen")
    .insert({
      betrieb_id: betriebId,
      bezeichnung: daten.bezeichnung,
      wochentag: daten.wochentag,
      start_zeit: `${daten.start_zeit}:00`,
      end_zeit: `${daten.end_zeit}:00`,
      aktiv: true,
    })
    .select("id")
    .single();

  if (error || !vorlage) {
    console.error(`[schichten] vorlageAnlegen: ${error?.message ?? "keine Zeile"}`);
    return fehler("Die Vorlage liess sich nicht anlegen. Versuch es noch einmal.");
  }

  const { error: bedarfFehler } = await supabase
    .from("schicht_vorlage_mindestbesetzung")
    .insert(
      bedarf.map((eintrag) => ({
        betrieb_id: betriebId,
        schicht_vorlage_id: vorlage.id,
        rolle_id: eintrag.rolle_id,
        mindestanzahl: eintrag.mindestanzahl,
      })),
    );

  if (bedarfFehler) {
    /*
     * Die Vorlage steht, der Bedarf nicht — genau der unsichtbare
     * Zustand, den wir vermeiden wollen. Also wieder wegräumen; der FK
     * ist ON DELETE CASCADE, halbe Zeilen bleiben nicht zurück.
     */
    console.error(`[schichten] mindestbesetzung: ${bedarfFehler.message}`);
    await supabase.from("schicht_vorlagen").delete().eq("id", vorlage.id);
    return fehler(
      "Die Mindestbesetzung liess sich nicht speichern, deshalb wurde die Vorlage nicht angelegt. Versuch es noch einmal.",
    );
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Entfernt eine Vorlage.
 *
 * Die Mindestbesetzung geht per `ON DELETE CASCADE` mit — anders als bei
 * den Rollen, wo der FK auf RESTRICT steht und von Hand aufgeräumt werden
 * muss.
 */
export async function vorlageEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await kontext();
  const vorlageId = String(formData.get("vorlage_id") ?? "");
  if (!vorlageId) return fehler("Es wurde keine Vorlage angegeben.");

  const { error } = await supabase
    .from("schicht_vorlagen")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("id", vorlageId);

  if (error) {
    console.error(`[schichten] vorlageEntfernen: ${error.message}`);
    return fehler("Die Vorlage liess sich nicht entfernen. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/** Einrichtung abschliessen — die Ableitung entscheidet, ob das trägt. */
export async function zumAbschluss(): Promise<void> {
  redirect("/einrichtung");
}
