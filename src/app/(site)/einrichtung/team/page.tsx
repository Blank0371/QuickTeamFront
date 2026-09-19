import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { betreteSchritt } from "@/lib/einrichtung";
import { holeEingeladene, holeRollen } from "@/lib/team";
import { createClient } from "@/lib/supabase/server";
import { holeTexte } from "@/i18n/server";

import { TeamSchritt } from "./team-schritt";

export const metadata: Metadata = {
  title: "Rollen und Team",
  description:
    "Leg die Rollen deines Betriebs an und lade deine Mitarbeiter ein — beides in einem Schritt.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Schritt 3 des Einrichtungs-Steppers: Rollen und Mitarbeiter.
 *
 * Beides steht zusammen, weil die Zuweisung genau dazwischen passiert —
 * eine Rolle ohne jemanden, der sie hat, und eine Person ohne Rolle sind
 * beide unvollständig. Der Schnitt zu Schritt 4 verläuft entlang der
 * Fremdschlüssel: `mitarbeiter_rollen` und
 * `schicht_vorlage_mindestbesetzung` brauchen beide eine Rolle, also
 * kommen Rollen zuerst.
 *
 * Weiter geht es, sobald mindestens eine Rolle steht. Mitarbeiter sind
 * ausdrücklich kein Kriterium: ein Betrieb, in dem vorerst nur der Chef
 * arbeitet, ist zulässig.
 */
export default async function TeamSeite() {
  const stand = await betreteSchritt("team");
  if (stand === null || stand.betriebId === null) redirect("/einrichtung/konto");

  const supabase = await createClient();
  const [rollen, leute] = await Promise.all([
    holeRollen(supabase, stand.betriebId),
    holeEingeladene(supabase, stand.betriebId),
  ]);

  const st = (await holeTexte()).stepper.team;

  return (
    <SchrittRahmen
      schritt="team"
      stand={stand}
      titel={st.titel}
      lead={st.lead}
    >
      {/*
        Rollen, Mitarbeiter und der Weiter-Knopf hängen seit dem
        2026-09-07 an einem gemeinsamen Zustand: die Rollen werden
        gesammelt statt sofort geschrieben, und alle drei brauchen
        dieselbe Liste. Die Begründung steht an `TeamSchritt` und an
        `schreibeRollen()` in `src/lib/team.ts`.
      */}
      <TeamSchritt bestehendeRollen={rollen} leute={leute} texte={st} />
    </SchrittRahmen>
  );
}
