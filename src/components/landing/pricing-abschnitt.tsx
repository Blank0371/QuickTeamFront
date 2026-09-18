import { Container } from "@/components/container";
import { PricingKarten } from "@/components/landing/pricing-karten";
import { holeTexte } from "@/i18n/server";
import { bauePreisKarten } from "@/lib/preis-karten";
import { softLaunchAktiv } from "@/lib/soft-launch";

/**
 * Preisübersicht der Landingpage.
 *
 * **Die Zahlen kommen aus `src/lib/site.ts`, nicht aus einer eigenen
 * Liste** — über `bauePreisKarten`, das dieselbe Quelle auch für `/preise`
 * anzeigefertig macht. `/preise` und `/` zeigten sonst zwei Preislisten,
 * die nur so lange übereinstimmen, wie jemand daran denkt.
 *
 * Diese Server Component trägt nur den Rahmen: dunkle Bühne, Überschrift,
 * B2B-Hinweis. Umschalter, Karten und Weiter-Knopf leben in der Client
 * Component `PricingKarten` — den Monatlich/Jährlich-Wechsel ohne
 * Serveraufruf gibt es nur dort (Jahresabo seit dem 2026-09-17).
 *
 * **Ob hier gebucht werden kann, entscheidet der Soft-Launch-Schalter.**
 * Steht die Sperre, wird kein Vertrag geschlossen; statt des Knopfes steht
 * dann ein nicht bedienbarer Hinweis. Ist die Sperre offen, führt der Knopf
 * in die Einrichtung und nimmt die gewählte Abrechnung als
 * `?abrechnung=…` mit.
 */
export async function PricingAbschnitt() {
  const t = await holeTexte();
  const authOffen = !softLaunchAktiv();

  return (
    <section
      id="pricing"
      data-licht-szene="pricing"
      aria-labelledby="pricing-titel"
      className="relative w-full overflow-hidden"
      style={{ scrollMarginTop: "3.5rem" }}
    >
      <Container className="relative pb-28 pt-10 sm:pb-32 sm:pt-12 lg:pb-40 xl:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-xs font-medium uppercase tracking-[0.14em]"
            style={{ color: "color-mix(in oklab, var(--qt-c-bronze-hi) 85%, transparent)" }}
          >
            {authOffen ? t.landing.preiseKennzeichen : t.landing.preiseBald}
          </p>
          <h2
            id="pricing-titel"
            className="mt-5 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
            style={{ color: "var(--qt-c-bone)" }}
          >
            {t.landing.preiseTitel}
          </h2>
        </div>

        <PricingKarten
          karten={bauePreisKarten(t)}
          proMonat={t.landing.proMonat}
          proJahr={t.landing.proJahr}
          monatlich={t.landing.preiseMonatlich}
          jaehrlich={t.landing.preiseJaehrlich}
          vorteil={t.landing.preiseJahrVorteil}
          ustHinweis={t.landing.preiseUst}
          empfehlung={t.landing.preiseEmpfehlung}
          b2b={t.landing.preiseB2b}
          authOffen={authOffen}
          ctaText={t.landing.preiseTesten}
          gesperrtText={t.landing.preiseGesperrt}
        />
      </Container>
    </section>
  );
}
