import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { holeAlleRollen, holeTeam } from "@/lib/dashboard/team";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { MitarbeiterAbschnitt } from "./mitarbeiter-abschnitt";
import { RollenAbschnitt } from "./rollen-abschnitt";

export const metadata: Metadata = {
  title: "Team",
  description: "Mitarbeiter einladen, Rollen vergeben, Status pflegen.",
  robots: { index: false, follow: false },
};

/**
 * Laufende Team- und Rollenverwaltung.
 *
 * Das ist die Fortsetzung von Schritt 3 des Einrichtungs-Steppers, nicht
 * seine Kopie: dort entsteht der Erstbestand, hier wird er gepflegt. Die
 * Unterschiede sind entsprechend — die Liste zeigt alle Statuswerte statt
 * nur die Eingeladenen, sie enthält die Betriebsleitung, und sie kennt
 * ausgeblendete Rollen.
 *
 * Die riskanten Schreibwege teilen sich beide Oberflächen
 * (`entferneRolle`, `entferneMitglied` in `src/lib/team.ts`). Zwei
 * Fassungen desselben mehrstufigen Löschens wären zwei Gelegenheiten,
 * an verschiedenen Stellen Daten zu verlieren.
 *
 * Nur für Chefs. Für Angestellte gibt es den Bereich nicht — die
 * Navigation zeigt ihn gar nicht erst an, und wer die Adresse errät,
 * bekommt „nicht gefunden" statt einer Seite, die ihm alles verweigert.
 */
export default async function TeamSeite() {
  const { supabase, position } = await betreteDashboard();

  if (!istChef(position)) notFound();

  const [team, rollen] = await Promise.all([
    holeTeam(supabase, position.betriebId),
    holeAlleRollen(supabase, position.betriebId),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">Team und Rollen</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Wer bei dir arbeitet, wofür er eingeteilt werden kann und wer gerade
          pausiert.
        </p>

        <div className="mt-8">
          <RollenAbschnitt rollen={rollen} />
        </div>

        <MitarbeiterAbschnitt
          team={team}
          rollen={rollen}
          eigeneId={position.mitarbeiterId}
        />
      </div>
    </Container>
  );
}
