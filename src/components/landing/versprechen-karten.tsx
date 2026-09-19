import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";

import { versprechenKarten, type Kachelfarbe } from "./story-daten";

/**
 * Ersetzt die vorige „Vertrauen"-Liste. Drei grosszügige Karten statt
 * einer Zeilenliste, bewusst dieselbe Familie wie die drei Farben aus
 * der Kalender-Erzählung darüber — die kleinen farbigen Quadrate greifen
 * das Kachelmotiv des Logos auf, kein beliebiges Deko-Element.
 *
 * Andere Formulierung als die Versprechen der Scroll-Sequenz (siehe
 * `VERSPRECHEN_KARTEN` in `story-daten.ts`): eine Zusammenfassung, keine
 * wortgleiche Wiederholung.
 */
const GLOW: Record<Kachelfarbe, string> = {
  green: "radial-gradient(circle at 24% 18%, var(--qt-c-green-light) 0%, transparent 60%)",
  gold: "radial-gradient(circle at 76% 20%, var(--qt-c-bronze) 0%, transparent 62%)",
  red: "radial-gradient(circle at 50% 92%, var(--qt-c-red-hi) 0%, transparent 58%)",
};

const KACHEL_FARBE: Record<Kachelfarbe, string> = {
  green: "var(--qt-c-green-light)",
  gold: "var(--qt-c-bronze-hi)",
  red: "var(--qt-c-red-hi)",
};

export async function VersprechenKarten() {
  const t = await holeTexte();
  const karten = versprechenKarten(t.versprechenKarten);

  return (
    <section
      id="versprechen"
      data-licht-szene="versprechen"
      aria-labelledby="versprechen-titel"
      className="relative w-full overflow-hidden"
      style={{ scrollMarginTop: "3.5rem" }}
    >
      <Container className="relative pb-10 pt-10 sm:pb-12 sm:pt-28 lg:pb-16 lg:pt-32 xl:pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="versprechen-titel"
            className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
            style={{ color: "var(--qt-c-bone)" }}
          >
            {t.landing.versprechenTitel}
          </h2>
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: "color-mix(in oklab, var(--qt-c-bone) 78%, transparent)" }}
          >
            {t.landing.versprechenText}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:mt-20 lg:grid-cols-3 lg:gap-8">
          {karten.map((karte) => (
            <li
              key={karte.id}
              className="relative flex lg:min-h-[22rem] flex-col overflow-hidden rounded-panel p-6 sm:p-8 lg:p-10"
              style={{
                background: "var(--qt-c-graphite)",
                border: "1px solid color-mix(in oklab, var(--qt-c-bone) 12%, transparent)",
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-55"
                style={{ background: GLOW[karte.farbe] }}
              />

              <div className="relative">
                <span
                  aria-hidden="true"
                  className="block size-3.5 rounded-[0.2rem]"
                  style={{ background: KACHEL_FARBE[karte.farbe] }}
                />
                <h3
                  className="mt-4 text-xl sm:mt-6 sm:text-2xl font-semibold leading-snug"
                  style={{ color: "var(--qt-c-bone)" }}
                >
                  {karte.titel}
                </h3>
                <p
                  className="mt-3 text-base sm:mt-5 leading-relaxed"
                  style={{ color: "color-mix(in oklab, var(--qt-c-bone) 80%, transparent)" }}
                >
                  {karte.zeilen[0]}
                </p>
                <p
                  className="mt-3 text-base leading-relaxed"
                  style={{ color: "color-mix(in oklab, var(--qt-c-bone) 80%, transparent)" }}
                >
                  {karte.zeilen[1]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
