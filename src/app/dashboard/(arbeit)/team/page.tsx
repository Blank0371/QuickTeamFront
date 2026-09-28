import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import { holeAlleRollen, holeTeam } from "@/lib/dashboard/team";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { MitarbeiterAbschnitt } from "./mitarbeiter-abschnitt";
import { RollenAbschnitt } from "./rollen-abschnitt";

export async function generateMetadata(): Promise<Metadata> {
  const { teamVerwaltung } = await holeTexte();
  return {
    title: teamVerwaltung.metaTitel,
    description: teamVerwaltung.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

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

  const [team, rollen, texte] = await Promise.all([
    holeTeam(supabase, position.betriebId),
    holeAlleRollen(supabase, position.betriebId),
    holeTexte(),
  ]);
  const t = texte.teamVerwaltung;

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.lead}</p>

        <div className="mt-8">
          <RollenAbschnitt rollen={rollen} texte={t} />
        </div>

        <MitarbeiterAbschnitt
          team={team}
          rollen={rollen}
          eigeneId={position.mitarbeiterId}
          texte={t}
        />
      </div>
    </Container>
  );
}
