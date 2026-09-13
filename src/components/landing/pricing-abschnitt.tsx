import Link from "next/link";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import { plaene } from "@/lib/site";
import { softLaunchAktiv } from "@/lib/soft-launch";

/**
 * Preisübersicht der Landingpage.
 *
 * **Die Zahlen kommen aus `src/lib/site.ts`, nicht aus einer eigenen
 * Liste.** `/preise` und `/` zeigten sonst zwei Preislisten, die nur so
 * lange übereinstimmen, wie jemand daran denkt. Eine Zahl, eine
 * Quelle.
 *
 * Hervorgehoben wird der mittlere Plan. Das ist eine Gestaltungsfrage
 * und steht deshalb hier und nicht in `site.ts`, wo `plaene` die
 * Datenbank-IDs abbildet.
 *
 * Grosszügiges Finale in derselben dunklen Farbwelt wie Hero und
 * Kalender-Bühne (`--qt-c-carbon` plus Grün- und Goldlicht) statt eines
 * Wechsels auf helle Flächen. Eine Karte optisch hervorgehoben statt
 * drei gleicher Kacheln.
 *
 * **Ob hier gebucht werden kann, entscheidet der Soft-Launch-Schalter.**
 * Steht die Sperre, wird kein Vertrag geschlossen; ein Knopf, der auf
 * eine gesperrte Route zeigt, wäre ein Versprechen, das die Seite nicht
 * halten kann. An seiner Stelle steht dann ein nicht bedienbarer Hinweis
 * — kein Formular, kein Link, keine Datenverarbeitung. Ist die Sperre
 * offen, steht dort der Weg in die Einrichtung, in derselben Form wie
 * der primäre Hero-Knopf.
 */
const HERVORGEHOBEN = "pro";
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

        <ul className="mt-16 grid gap-6 sm:mt-20 lg:grid-cols-3 lg:items-end lg:gap-8">
          {plaene.map((plan) => {
            const hervorgehoben = plan.id === HERVORGEHOBEN;
            return (
            <li
              key={plan.id}
              className={
                hervorgehoben
                  ? "flex flex-col rounded-panel p-10 lg:scale-105"
                  : "flex flex-col rounded-panel p-10"
              }
              style={{
                background: "var(--qt-c-graphite)",
                border: hervorgehoben
                  ? "1px solid var(--qt-c-bronze)"
                  : "1px solid color-mix(in oklab, var(--qt-c-bone) 12%, transparent)",
                boxShadow: hervorgehoben
                  ? "0 24px 60px -20px color-mix(in oklab, var(--qt-c-bronze) 45%, transparent)"
                  : undefined,
              }}
            >
              {hervorgehoben ? (
                <p
                  className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--qt-c-bronze-hi)" }}
                >
                  {t.landing.preiseEmpfehlung}
                </p>
              ) : null}

              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--qt-c-bone)" }}
              >
                {plan.name}
              </h3>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span
                  className="text-4xl font-bold"
                  style={{ color: "var(--qt-c-bone)" }}
                >
                  {plan.preis} €
                </span>
                <span
                  className="text-sm"
                  style={{ color: "color-mix(in oklab, var(--qt-c-bone) 65%, transparent)" }}
                >
                  {t.landing.proMonat}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "color-mix(in oklab, var(--qt-c-bone) 55%, transparent)" }}
                >
                  {t.landing.preiseUst}
                </span>
              </p>

              <p
                className="mt-5 text-sm font-medium"
                style={{ color: "color-mix(in oklab, var(--qt-c-bone) 85%, transparent)" }}
              >
                {t.planGrenzen[plan.id]}
              </p>
            </li>
            );
          })}
        </ul>

        <p
          className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed"
          style={{ color: "color-mix(in oklab, var(--qt-c-bone) 60%, transparent)" }}
        >
          {t.landing.preiseB2b}
        </p>

        {authOffen ? (
          <div className="mt-16 flex justify-center sm:mt-20">
            <Link
              href="/registrieren"
              className="flex min-h-[3.5rem] touch-manipulation items-center justify-center rounded-blk px-10 text-base font-semibold transition-colors hover:bg-[var(--qt-c-bronze-hi)] active:translate-y-px"
              style={{ background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }}
            >
              {t.landing.preiseTesten}
            </Link>
          </div>
        ) : (
          <p
            className="mx-auto mt-16 max-w-md text-center text-base leading-relaxed sm:mt-20"
            style={{ color: "color-mix(in oklab, var(--qt-c-bone) 78%, transparent)" }}
          >
            {t.landing.preiseGesperrt}
          </p>
        )}
      </Container>
    </section>
  );
}
