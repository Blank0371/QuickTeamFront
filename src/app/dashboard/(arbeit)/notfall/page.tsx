import type { Metadata } from "next";

import { Container } from "@/components/container";
import {
  holeChefNotfaelle,
  holeEigeneMeldbareSchichten,
  holeMeineMeldungen,
  holeOffeneVertretungen,
} from "@/lib/dashboard/notfall";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { ChefNotfaelleListe, MeineMeldungenListe, OffeneVertretungenListe } from "./notfall-liste";
import { NotfallFormular } from "./notfall-formular";

export const metadata: Metadata = {
  title: "Notfall",
  description: "Notfälle melden, Vertretungen ausschreiben und übernehmen.",
  robots: { index: false, follow: false },
};

/**
 * Notfallvertretung — für beide Rollensichten. Referenz:
 * `scheduling.tsx` (`EmergencySection`), `manager.tsx`
 * (`UrgentEmergencies`), `messages.tsx` (`EmergencyCard`) in der
 * Expo-App, Parity-Audit vom 2026-08-31.
 *
 * Drei Abschnitte, dieselbe Sichtbarkeits-Stufung wie in der App: die
 * eigenen Meldungen sieht nur man selbst, offene (`gemeldet`/
 * `vertretung_gesucht`) Notfälle nur der Chef, ausgeschriebene
 * Vertretungen nur qualifizierte Kolleg:innen ausser dem Melder — jeweils
 * serverseitig in `lib/dashboard/notfall.ts` gefiltert, nicht der RLS
 * überlassen (die erlaubt jedem im Betrieb, jede Zeile zu lesen).
 */
export default async function NotfallSeite() {
  const { supabase, position } = await betreteDashboard();
  const chef = istChef(position);

  const [meldbareSchichten, meineMeldungen, chefNotfaelle, offeneVertretungen] = await Promise.all([
    holeEigeneMeldbareSchichten(supabase, position.mitarbeiterId),
    holeMeineMeldungen(supabase, position.mitarbeiterId),
    chef ? holeChefNotfaelle(supabase, position.betriebId) : Promise.resolve([]),
    holeOffeneVertretungen(supabase, position.betriebId, position.mitarbeiterId),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">Notfall</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Eigene Schichten als Notfall melden, Vertretungen ausschreiben und übernehmen.
        </p>

        <div className="mt-8">
          <NotfallFormular schichten={meldbareSchichten} />
        </div>

        <MeineMeldungenListe meldungen={meineMeldungen} />
        {chef ? <ChefNotfaelleListe notfaelle={chefNotfaelle} /> : null}
        <OffeneVertretungenListe vertretungen={offeneVertretungen} />
      </div>
    </Container>
  );
}
