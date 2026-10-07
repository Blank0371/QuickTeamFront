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
 *   · ein Tag je Vorlage — mehrere gewählte Tage ergeben mehrere Zeilen
 *     mit gleicher Bezeichnung, Zeit und Mindestbesetzung
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
  const tage = formData.getAll("wochentag").map(String);
  const roh = {
    bezeichnung: String(formData.get("bezeichnung") ?? ""),
    /* Für das Wiederbefüllen nach einem Fehler: `werte` trägt nur Text. */
    wochentag: tage.join(","),
    start_zeit: String(formData.get("start_zeit") ?? ""),
    end_zeit: String(formData.get("end_zeit") ?? ""),
  };

  const geprueft = vorlagenSchema.safeParse({ ...roh, wochentag: tage });
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

  /*
   * Ein Insert für alle Tage: PostgREST schreibt ein Array in einer
   * Anweisung, also entweder alle Vorlagen oder keine.
   */
  const { data: vorlagen, error } = await supabase
    .from("schicht_vorlagen")
    .insert(
      daten.wochentag.map((wochentag) => ({
        betrieb_id: betriebId,
        bezeichnung: daten.bezeichnung,
        wochentag,
        start_zeit: `${daten.start_zeit}:00`,
        end_zeit: `${daten.end_zeit}:00`,
        aktiv: true,
      })),
    )
    .select("id");

  if (error || !vorlagen || vorlagen.length !== daten.wochentag.length) {
    console.error(`[schichten] vorlageAnlegen: ${error?.message ?? "Zeilenzahl weicht ab"}`);
    if (vorlagen?.length) {
      await supabase
        .from("schicht_vorlagen")
        .delete()
        .in("id", vorlagen.map((v) => v.id));
    }
    return fehler(m.anlegenFehler);
  }

  const { error: bedarfFehler } = await supabase
    .from("schicht_vorlage_mindestbesetzung")
    .insert(
      vorlagen.flatMap((vorlage) =>
        bedarf.map((eintrag) => ({
          betrieb_id: betriebId,
          schicht_vorlage_id: vorlage.id,
          rolle_id: eintrag.rolle_id,
          mindestanzahl: eintrag.mindestanzahl,
        })),
      ),
    );

  if (bedarfFehler) {
    /*
     * Die Vorlagen stehen, der Bedarf nicht — genau der unsichtbare
     * Zustand, den wir vermeiden wollen. Also wieder wegräumen; der FK
     * ist ON DELETE CASCADE, halbe Zeilen bleiben nicht zurück.
     */
    console.error(`[schichten] mindestbesetzung: ${bedarfFehler.message}`);
    await supabase
      .from("schicht_vorlagen")
      .delete()
      .in("id", vorlagen.map((v) => v.id));
    return fehler(m.bedarfFehler);
  }

  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Ändert eine bestehende Vorlage — Bezeichnung, Wochentag, Zeiten und
 * Mindestbesetzung, wie `TemplateEditor` in `manager.tsx`.
 *
 * Eine Vorlage ist eine Zeile mit genau einem Tag; das Formular wählt
 * deshalb einzeln, und hier wird genau ein Tag verlangt.
 *
 * Die Mindestbesetzung wird **nicht** wie in der App erst ganz gelöscht
 * und dann neu geschrieben: zwischen beiden Schritten wäre die Vorlage
 * ohne Bedarf und damit in der App unsichtbar, und scheiterte der zweite
 * Schritt, bliebe sie es. Stattdessen erst die Zeilen > 0 upserten, dann
 * die auf 0 gesetzten löschen — es gibt keinen Zwischenstand ohne Bedarf.
 * Zeilen zu ausgeblendeten Rollen (`rollen.aktiv = false`) erscheinen
 * im Formular nicht und bleiben deshalb unberührt.
 *
 * Schon erzeugte `schicht_instanzen` tragen eigene Zeiten und ändern
 * sich nicht mit.
 */
export async function bearbeiteVorlage(
  supabase: SupabaseServerClient,
  betriebId: string,
  formData: FormData,
): Promise<FormZustand> {
  const vorlageId = String(formData.get("vorlage_id") ?? "");
  const tage = formData.getAll("wochentag").map(String);
  const roh = {
    vorlage_id: vorlageId,
    bezeichnung: String(formData.get("bezeichnung") ?? ""),
    wochentag: tage.join(","),
    start_zeit: String(formData.get("start_zeit") ?? ""),
    end_zeit: String(formData.get("end_zeit") ?? ""),
  };
  /* `werte` trägt die Vorlagen-ID mit: das Formular zeigt Fehler nur an
     der Vorlage, für die sie entstanden sind. */
  const abgelehnt = (nachricht: string | null, felder: Record<string, string> = {}): FormZustand => ({
    status: "fehler",
    nachricht,
    felder,
    werte: roh,
  });

  const m = (await holeTexte()).stepper.schichten.meldung;
  if (!vorlageId) return abgelehnt(m.keineVorlage);

  const geprueft = vorlagenSchema.safeParse({ ...roh, wochentag: tage });
  if (!geprueft.success) {
    return abgelehnt(null, feldFehler(geprueft.error, await holeValidierung()));
  }
  const daten = geprueft.data;
  const [wochentag] = daten.wochentag;
  if (daten.wochentag.length !== 1 || wochentag === undefined) {
    return abgelehnt(null, { wochentag: m.einTag });
  }

  const rollen = await holeRollen(supabase, betriebId);
  const bedarf: { rolle_id: string; mindestanzahl: number }[] = [];
  const ohneBedarf: string[] = [];

  for (const rolle of rollen) {
    const eingabe = formData.get(`bedarf_${rolle.id}`);
    if (eingabe === null) continue;
    const anzahl = mindestanzahlSchema.safeParse(eingabe);
    if (!anzahl.success) {
      return abgelehnt(fuelle(m.anzahlUngueltig, { rolle: rolle.name }), {
        [`bedarf_${rolle.id}`]: m.anzahlFeld,
      });
    }
    if (anzahl.data > 0) bedarf.push({ rolle_id: rolle.id, mindestanzahl: anzahl.data });
    else ohneBedarf.push(rolle.id);
  }

  if (bedarf.length === 0) return abgelehnt(m.keinBedarf);

  const { data: geaendert, error } = await supabase
    .from("schicht_vorlagen")
    .update({
      bezeichnung: daten.bezeichnung,
      wochentag,
      start_zeit: `${daten.start_zeit}:00`,
      end_zeit: `${daten.end_zeit}:00`,
    })
    .eq("betrieb_id", betriebId)
    .eq("id", vorlageId)
    .select("id");

  if (error) {
    console.error(`[schichten] vorlageBearbeiten: ${error.message}`);
    return abgelehnt(m.bearbeitenFehler);
  }
  /* Keine Zeile: inzwischen gelöscht, oder nicht aus diesem Betrieb. */
  if (!geaendert || geaendert.length === 0) return abgelehnt(m.nichtGefunden);

  const { error: upsertFehler } = await supabase
    .from("schicht_vorlage_mindestbesetzung")
    .upsert(
      bedarf.map((eintrag) => ({
        betrieb_id: betriebId,
        schicht_vorlage_id: vorlageId,
        rolle_id: eintrag.rolle_id,
        mindestanzahl: eintrag.mindestanzahl,
      })),
      { onConflict: "schicht_vorlage_id,rolle_id" },
    );

  if (upsertFehler) {
    console.error(`[schichten] mindestbesetzung bearbeiten: ${upsertFehler.message}`);
    return abgelehnt(m.bearbeitenBedarfFehler);
  }

  if (ohneBedarf.length > 0) {
    const { error: loeschFehler } = await supabase
      .from("schicht_vorlage_mindestbesetzung")
      .delete()
      .eq("betrieb_id", betriebId)
      .eq("schicht_vorlage_id", vorlageId)
      .in("rolle_id", ohneBedarf);

    if (loeschFehler) {
      console.error(`[schichten] mindestbesetzung leeren: ${loeschFehler.message}`);
      return abgelehnt(m.bearbeitenBedarfFehler);
    }
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
