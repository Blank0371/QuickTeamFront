import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { VorlagenAbschnitt } from "@/components/schichten/vorlagen-abschnitt";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { wochentageKurz, wochentageLang } from "@/lib/dashboard/kalender";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { holeVorlagen } from "@/lib/schichten";
import { holeRollen } from "@/lib/team";

import { vorlageAnlegen, vorlageBearbeiten, vorlageEntfernen } from "./aktionen";

export async function generateMetadata(): Promise<Metadata> {
  const { schichtvorlagen } = await holeTexte();
  return {
    title: schichtvorlagen.metaTitel,
    description: schichtvorlagen.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Schichtvorlagen im Dauerbetrieb.
 *
 * Die Fortsetzung von Schritt 4 des Steppers, wie `/dashboard/team` die
 * von Schritt 3 ist: dort entsteht die Grundwoche, hier wird sie
 * gepflegt. In der App liegt dasselbe im Manager-Tab (`manager.tsx`,
 * `ShiftsSection`/`TemplateEditor`). Formular, Wochenraster und
 * Schreibweg teilen sich beide Oberflächen.
 *
 * Nur für Chefs — Angestellte bekommen weder Menüeintrag noch Seite.
 */
export default async function SchichtvorlagenSeite() {
  const { supabase, position } = await betreteDashboard();

  if (!istChef(position)) notFound();

  const [rollen, vorlagen, texte, locale] = await Promise.all([
    holeRollen(supabase, position.betriebId),
    holeVorlagen(supabase, position.betriebId),
    holeTexte(),
    leseSprache(),
  ]);
  const t = texte.schichtvorlagen;

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.lead}</p>

        <div className="mt-8">
          {rollen.length === 0 ? (
            /*
              Ohne Rolle gibt es keine Mindestbesetzung und damit keine
              Vorlage, die in der App ankäme — der Weg führt zuerst ins Team.
            */
            <p className="rounded-card border border-line bg-surface-sunk p-5 text-sm leading-relaxed text-muted">
              {t.keineRollen}{" "}
              <Link href="/dashboard/team" className="font-medium text-text underline underline-offset-4">
                {t.zumTeam}
              </Link>
            </p>
          ) : (
            <VorlagenAbschnitt
              rollen={rollen}
              vorlagen={vorlagen}
              texte={texte.stepper.schichten}
              tagKurz={wochentageKurz(locale)}
              tagLang={wochentageLang(locale)}
              anlegen={vorlageAnlegen}
              bearbeiten={vorlageBearbeiten}
        entfernen={vorlageEntfernen}
            />
          )}
        </div>
      </div>
    </Container>
  );
}
