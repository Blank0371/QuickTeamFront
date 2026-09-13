import type { Metadata } from "next";

import { Hero } from "@/components/landing/hero";
import { KalenderBuehne } from "@/components/landing/kalender-buehne";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PricingAbschnitt } from "@/components/landing/pricing-abschnitt";
import { versprechen } from "@/components/landing/story-daten";
import { holeTexte } from "@/i18n/server";
import { VersprechenKarten } from "@/components/landing/versprechen-karten";
import { softLaunchAktiv } from "@/lib/soft-launch";

/**
 * `generateMetadata` statt eines konstanten `metadata`-Objekts: Titel und
 * Beschreibung folgen jetzt dem Sprach-Cookie, und ein Konstantenobjekt
 * kann keine Anfrage lesen.
 *
 * `title.absolute`, weil `title.template` auf die eigene Layout-Ebene
 * nicht angewendet wird — sonst stünde die Startseite ohne Marke da.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await holeTexte();
  return {
    title: { absolute: t.landing.metaTitel },
    description: t.landing.metaText,
    alternates: { canonical: "/" },
  };
}

/**
 * Die Startseite.
 *
 * Server Component von oben bis unten, bis auf vier Client-Inseln
 * (`LichtEbene` und `LandingNavigation` im Layout, `Hero` und
 * `KalenderBuehne` hier), die trotzdem serverseitig vorgerendert werden:
 * `curl` auf `/` liefert den vollständigen sichtbaren Text.
 *
 * Vier Abschnitte in der Reihenfolge der Fragen, die jemand stellt, der
 * die Seite zum ersten Mal öffnet: was ist das (Hero), wie sieht das aus
 * (Kalender-Sequenz), was habe ich davon (Versprechen), was kostet es
 * (Preise) — und darunter der rechtliche Abschluss.
 */
export default async function StartSeite() {
  const t = await holeTexte();

  return (
    <>
      {/*
        Der Schalter wird hier gelesen und hereingereicht, nicht im Hero
        selbst: der ist eine Client-Insel, und `SOFT_LAUNCH` traegt
        bewusst kein `NEXT_PUBLIC_`-Praefix — der Wert gehoert nicht ins
        Browser-Buendel. Dieselbe eine Quelle wie in der Middleware.
      */}
      <Hero authOffen={!softLaunchAktiv()} texte={t.landing} />
      <KalenderBuehne versprechen={versprechen(t.versprechen)} />
      <VersprechenKarten />
      <PricingAbschnitt />
      <LandingFooter />
    </>
  );
}
