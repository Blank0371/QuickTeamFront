import type { Metadata } from "next";

import { Container } from "@/components/container";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import {
  holeChefUrlaubsantraege,
  holeMeineUrlaube,
  holeUrlaubsanspruch,
  verbrauchteTage,
} from "@/lib/dashboard/urlaub";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { ChefUrlaubsantraegeListe, MeineUrlaubeListe } from "./urlaub-liste";
import { UrlaubFormular } from "./urlaub-formular";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await leseSprache());
  return {
    title: t.urlaub.metaTitel,
    description: t.urlaub.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

const MONATE_VORAUS = 12;

function isoTag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Urlaub — für beide Rollensichten. Referenz: `scheduling.tsx`
 * (`VacationSection`) für die Mitarbeiter-Seite, `manager.tsx`
 * (`EmployeesSection`) für die Chef-Seite. Parity-Audit vom 2026-09-01.
 *
 * Wie bei Tausch und Notfall ist die Chef-Freigabe hier ein Sonderfall
 * innerhalb desselben Bereichs, kein eigener: „Tausch, Urlaub und Notfall
 * sind ihrem Wesen nach Mitarbeiter-Funktionen“ (`CLAUDE.md`).
 */
export default async function UrlaubSeite() {
  const { supabase, position } = await betreteDashboard();
  const chef = istChef(position);
  const sprache = await leseSprache();
  const t = getDictionary(sprache).urlaub;

  const [meineUrlaube, anspruch, chefAntraege] = await Promise.all([
    holeMeineUrlaube(supabase, position.mitarbeiterId),
    holeUrlaubsanspruch(supabase, position.mitarbeiterId),
    chef ? holeChefUrlaubsantraege(supabase, position.betriebId) : Promise.resolve([]),
  ]);

  const heute = new Date();
  const maxDatum = new Date(heute.getFullYear(), heute.getMonth() + MONATE_VORAUS, heute.getDate());
  const verbraucht = verbrauchteTage(meineUrlaube, heute.getFullYear());

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.intro}</p>

        <div className="mt-8">
          <UrlaubFormular
            anspruch={anspruch}
            verbraucht={verbraucht}
            heute={isoTag(heute)}
            maxDatum={isoTag(maxDatum)}
            texte={t}
          />
        </div>

        <MeineUrlaubeListe urlaube={meineUrlaube} texte={t} locale={sprache} />
        {chef ? (
          <ChefUrlaubsantraegeListe antraege={chefAntraege} texte={t} locale={sprache} />
        ) : null}
      </div>
    </Container>
  );
}
