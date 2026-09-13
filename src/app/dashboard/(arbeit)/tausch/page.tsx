import type { Metadata } from "next";

import { Container } from "@/components/container";
import { holeEigeneSchichten, holeFreieTage, holeTauschAngebote } from "@/lib/dashboard/tausch";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { TauschAngebotFormular } from "./tausch-angebot-formular";
import { TauschListe } from "./tausch-liste";

export const metadata: Metadata = {
  title: "Tausch",
  description: "Eigene Schichten zum Tausch anbieten und auf Angebote reagieren.",
  robots: { index: false, follow: false },
};

/**
 * Schichttausch — für beide Rollensichten, nicht nur für Chefs.
 *
 * Referenz: `messages.tsx` (`SwapCard`/`SwapModal`), `compose.tsx`
 * (`aenderungswunsch`), `manager.tsx` (`SwapApprovals`) in der Expo-App,
 * Parity-Audit vom 2026-08-31. `CLAUDE.md`: „Tausch, Urlaub und Notfall
 * sind ihrem Wesen nach Mitarbeiter-Funktionen" — die Chef-Freigabe ist
 * hier deshalb ein Sonderfall innerhalb derselben Liste, kein eigener
 * Bereich.
 */
export default async function TauschSeite() {
  const { supabase, position } = await betreteDashboard();
  const chef = istChef(position);

  const eigeneSchichten = await holeEigeneSchichten(supabase, position.betriebId, position.mitarbeiterId);
  const freieTage = holeFreieTage(eigeneSchichten);
  const angebote = await holeTauschAngebote(supabase, position.betriebId, position.mitarbeiterId, chef);

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">Tausch</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Eigene Schichten anbieten, auf Angebote reagieren
          {chef ? ", Freigaben erteilen." : "."}
        </p>

        <div className="mt-8">
          <TauschAngebotFormular eigeneSchichten={eigeneSchichten} freieTage={freieTage} />
        </div>

        <TauschListe angebote={angebote} chef={chef} />
      </div>
    </Container>
  );
}
