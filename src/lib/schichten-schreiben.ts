import type { createClient } from "@/lib/supabase/server";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { holeRollen } from "@/lib/team";
import { mindestanzahlSchema, vorlagenSchema } from "@/lib/validierung";
import { holeTexte, holeValidierung } from "@/i18n/server";
import { fuelle } from "@/i18n/text";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Schreibwege für Schichtvorlagen — geteilt von Schritt 4 des Steppers
 * (`/einrichtung/schichten`) und dem Dashboard (`/dashboard/schichtvorlagen`).
 *
 * Wizard und Dashboard schreiben in dieselben Tabellen; zwei Fassungen
 * desselben Inserts wären zwei Gelegenheiten, die Konventionen
 * auseinanderlaufen zu lassen. Die Server Actions beider Oberflächen
 * leiten nur Session und Betrieb ab und rufen dann hierher.
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

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

export async function legeVorlageAn(
  supabase: SupabaseServerClient,
  betriebId: string,
  formData: FormData,
): Promise<FormZustand> {
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
  const m = (await holeTexte()).stepper.schichten.meldung;
  const rollen = await holeRollen(supabase, betriebId);
  const bedarf: { rolle_id: string; mindestanzahl: number }[] = [];

  for (const rolle of rollen) {
    const eingabe = formData.get(`bedarf_${rolle.id}`);
    if (eingabe === null) continue;
    const anzahl = mindestanzahlSchema.safeParse(eingabe);
    if (!anzahl.success) {
      return fehler(fuelle(m.anzahlUngueltig, { rolle: rolle.name }), {
        [`bedarf_${rolle.id}`]: m.anzahlFeld,
      });
    }
    if (anzahl.data > 0) {
      bedarf.push({ rolle_id: rolle.id, mindestanzahl: anzahl.data });
    }
  }

  if (bedarf.length === 0) {
    return {
      status: "fehler",
      nachricht: m.keinBedarf,
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
    return fehler(m.anlegenFehler);
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
    return fehler(m.bedarfFehler);
  }

  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Entfernt eine Vorlage — hart, wie `manager.tsx` (`TemplateEditor.remove`).
 *
 * Was am FK hängt (am 2026-10-06 in `pg_constraint` nachgesehen):
 * Mindestbesetzung und die Schicht-/Tagesvorlieben der Mitarbeiter gehen
 * per ON DELETE CASCADE mit; `schicht_instanzen.schicht_vorlage_id` wird
 * ON DELETE SET NULL — schon erzeugte Schichten bleiben stehen, verlieren
 * nur den Bezug zur Vorlage.
 */
export async function entferneVorlage(
  supabase: SupabaseServerClient,
  betriebId: string,
  formData: FormData,
): Promise<FormZustand> {
  const vorlageId = String(formData.get("vorlage_id") ?? "");
  const m = (await holeTexte()).stepper.schichten.meldung;
  if (!vorlageId) return fehler(m.keineVorlage);

  const { error } = await supabase
    .from("schicht_vorlagen")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("id", vorlageId);

  if (error) {
    console.error(`[schichten] vorlageEntfernen: ${error.message}`);
    return fehler(m.entfernenFehler);
  }

  return { status: "erfolg", nachricht: null, felder: {} };
}
