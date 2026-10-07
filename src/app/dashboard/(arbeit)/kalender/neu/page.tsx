import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import { holeZuweisbareMitarbeiter } from "@/lib/dashboard/schicht";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { heuteImBetrieb, istKalendertag } from "@/lib/datum";

import { SchichtNeuFormular } from "./schicht-neu-formular";

export async function generateMetadata(): Promise<Metadata> {
  const { schichtNeu } = await holeTexte();
  return {
    title: schichtNeu.metaTitel,
    description: schichtNeu.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Eine einzelne Schicht anlegen — Spiegel von `CreateShiftModal` in
 * `calendar.tsx` (Knopf mit Plus-Kalender, nur für Chefs).
 *
 * Eigene Adresse statt Überblendung, wie die Schichtseite: der Tag kommt
 * als `?datum=` aus dem Plus der Kalenderzelle und überlebt einen Reload.
 * Ein vergangener oder unsinniger Tag fällt still auf heute zurück — eine
 * Schicht in der Vergangenheit lässt die Action ohnehin nicht zu.
 */
export default async function NeueSchichtSeite({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>;
}) {
  const { supabase, position } = await betreteDashboard();
  if (!istChef(position)) notFound();

  const t = (await holeTexte()).schichtNeu;
  const { datum: datumParam } = await searchParams;
  const heute = heuteImBetrieb();
  const datum =
    datumParam && istKalendertag(datumParam) && datumParam >= heute ? datumParam : heute;

  const [team, { data: rollen }] = await Promise.all([
    holeZuweisbareMitarbeiter(supabase, position.betriebId),
    supabase
      .from("rollen")
      .select("id, name")
      .eq("betrieb_id", position.betriebId)
      .eq("aktiv", true)
      .order("name"),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <Link
          href={`/dashboard/kalender?monat=${datum.slice(0, 7)}`}
          className="text-sm font-medium text-muted transition-colors hover:text-text"
        >
          <span aria-hidden="true">‹</span> {t.zurueck}
        </Link>

        <h1 className="mt-4 text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{t.einleitung}</p>

        <SchichtNeuFormular
          datum={datum}
          heute={heute}
          team={team}
          rollen={(rollen ?? []).map((r) => ({ id: r.id as string, name: r.name as string }))}
          texte={t}
        />
      </div>
    </Container>
  );
}
