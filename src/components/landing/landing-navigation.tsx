"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Schmale, mitlaufende Section-Navigation der Landingpage.
 *
 * **`position: sticky`, nicht `fixed`.** Sticky bleibt Teil des
 * Textflusses und reserviert seinen Platz selbst — ein `fixed` Header
 * haette ueber dem Hero gelegen und die erste Bildschirmhoehe um seine
 * eigene Hoehe verkuerzt.
 *
 * **Kein `backdrop-filter`.** Eine Glasleiste ueber einer Seite, deren
 * Hintergrund bei jedem Scrollframe seine Position aendert (die
 * `LichtEbene`), muesste bei jedem Frame neu gefiltert werden — genau
 * die Art Arbeit, die das gerade behobene Ruckeln erzeugt hat. Statt
 * dessen eine zu 92 % deckende Carbonflaeche: subtil durchscheinend
 * genug, dass das Licht dahinter erahnbar bleibt, aber mit stabilem
 * Textkontrast und ohne Filterkosten.
 *
 * **Aktive Section ueber `IntersectionObserver`.** Kein
 * Scroll-Listener, kein State-Update pro Frame: der Observer meldet
 * sich nur, wenn eine Section das mittlere Sichtband betritt oder
 * verlaesst, und der State wird nur geschrieben, wenn sich die ID
 * tatsaechlich aendert. Bei einer 380vh langen Kalender-Sequenz sind
 * das ueber die gesamte Seite weniger als ein Dutzend Renders.
 */
const PUNKTE = [
  { id: "kalender", label: "Was ist QuickTeam?" },
  { id: "versprechen", label: "Versprechen" },
  { id: "pricing", label: "Preise" },
  { id: "rechtliches", label: "Rechtliches" },
] as const;

/*
 * Die zwei Wege ins Produkt — einmal definiert, zweimal ausgegeben
 * (Leiste und Klappmenue). Zwei getrennte Listen waeren zwei
 * Gelegenheiten, dass die eine auf `/login` zeigt und die andere nicht
 * mehr.
 */
const AUTH_PUNKTE = [
  { href: "/registrieren", label: "Kostenlos testen", stark: true },
  { href: "/login", label: "Anmelden", stark: false },
] as const;

/**
 * `authOffen` kommt als Prop aus `src/app/(landing)/layout.tsx`.
 *
 * Diese Leiste ist eine Client-Insel, und `SOFT_LAUNCH` traegt bewusst
 * kein `NEXT_PUBLIC_`-Praefix — sie kann den Schalter also nicht selbst
 * lesen. Derselbe Weg wie bei `Hero` und `MobileMenu`: der Server liest
 * `softLaunchAktiv()` und reicht das Ergebnis herein. Eine eigene
 * Bedingung waere die zweite Gelegenheit, in die falsche Richtung zu
 * zeigen, vor der `CLAUDE.md` warnt.
 */
/**
 * `promoHref` / `promoLabel` sind die Registerkarte zur
 * Promo-Code-Anfrageseite — gesetzt nur, wenn `PROMO_CODE=an`. Wie
 * `authOffen` kommen sie als Prop aus `src/app/(landing)/layout.tsx`,
 * weil diese Client-Insel den serverseitigen Schalter nicht selbst lesen
 * kann. Anders als die Auth-Knöpfe hängt sie **nicht** am Soft-Launch:
 * die Seite legt kein Konto an, sondern bietet ein Formular an.
 */
export function LandingNavigation({
  authOffen,
  promoHref,
  promoLabel,
}: {
  authOffen: boolean;
  promoHref?: string;
  promoLabel?: string;
}) {
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [offen, setOffen] = useState(false);
  const knopfRef = useRef<HTMLButtonElement>(null);

  /**
   * `scroll-padding-top` gehoert auf das scrollende Element, also auf
   * `<html>` — dorthin kommt man aus einer Komponente nur ueber das
   * DOM. Es steht bewusst nicht in `globals.css`: dort waere es eine
   * Aenderung an der produktiven Seite, und die hat diese Leiste nicht.
   *
   * Wofuer: `scroll-margin-top` an den Sections deckt nur Ankerspruenge
   * ab. Beim Durchtabben scrollt der Browser das fokussierte Element
   * selbst ins Bild — ohne Polsterung landet es beim Rueckwaertstabben
   * unter der klebenden Leiste, und der Fokusring ist verdeckt.
   */
  useEffect(() => {
    const wurzel = document.documentElement;
    const vorher = wurzel.style.scrollPaddingTop;
    wurzel.style.scrollPaddingTop = "4.5rem";
    return () => {
      wurzel.style.scrollPaddingTop = vorher;
    };
  }, []);

  useEffect(() => {
    const ziele = PUNKTE.map((p) => document.getElementById(p.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (ziele.length === 0) return;

    // Aktiv ist die Section, die eine gedachte Linie bei 35 % der
    // Viewporthoehe kreuzt. Der Observer entscheidet das nicht selbst,
    // er sagt nur, *wann* neu entschieden werden muss — deshalb
    // mehrere Schwellen und kein `rootMargin`-Band.
    //
    // Der Grund fuer diesen Umweg steht am Seitenende: die letzte
    // Section (der Footer) ist kuerzer als der Viewport. Ihre
    // Oberkante erreicht die 35-%-Linie nie, weil die Seite vorher
    // aufhoert — mit einem reinen Band waere „Rechtliches" nicht
    // markierbar. Ist der Seitenboden erreicht, gewinnt deshalb
    // ausdruecklich der letzte Eintrag.
    const bewerten = () => {
      const linie = window.innerHeight * 0.35;
      const amBoden =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;

      let treffer: string | null = null;
      if (amBoden) {
        treffer = ziele[ziele.length - 1]!.id;
      } else {
        for (const el of ziele) {
          const r = el.getBoundingClientRect();
          if (r.top <= linie && r.bottom > linie) treffer = el.id;
        }
      }
      setAktiv((vorher) => (vorher === treffer ? vorher : treffer));
    };

    const beobachter = new IntersectionObserver(bewerten, {
      threshold: [0, 0.15, 0.35, 0.6, 0.85, 1],
    });

    ziele.forEach((el) => beobachter.observe(el));
    return () => beobachter.disconnect();
  }, []);

  useEffect(() => {
    if (!offen) return;
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOffen(false);
      knopfRef.current?.focus();
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [offen]);

  const linkKlasse = (id: string) =>
    [
      "relative touch-manipulation rounded-blk px-3 py-2 text-sm font-medium transition-colors",
      aktiv === id ? "text-[var(--qt-c-bone)]" : "text-[color-mix(in_oklab,var(--qt-c-bone)_62%,transparent)]",
      "hover:text-[var(--qt-c-bone)]",
    ].join(" ");

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "color-mix(in oklab, var(--qt-c-carbon) 92%, transparent)",
        borderBottom: "1px solid color-mix(in oklab, var(--qt-c-bone) 10%, transparent)",
      }}
    >
      <nav
        aria-label="Abschnitte dieser Seite"
        className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <a
          href="#start"
          className="flex shrink-0 touch-manipulation items-center gap-2 rounded-blk py-1 text-[0.9375rem] font-bold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 grid-cols-2 gap-[2px] rounded-[0.25rem] p-[3px]"
            style={{ border: "1px solid color-mix(in oklab, var(--qt-c-bronze) 55%, transparent)" }}
          >
            <span className="rounded-[1px]" style={{ background: "var(--qt-landing-marke-gruen)" }} />
            <span className="rounded-[1px]" style={{ background: "var(--qt-c-bronze-hi)" }} />
            <span className="rounded-[1px]" style={{ background: "var(--qt-c-bronze)" }} />
            <span className="rounded-[1px]" style={{ background: "var(--qt-c-red-hi)" }} />
          </span>
          <span>
            <span style={{ color: "var(--qt-c-bronze-hi)" }}>Quick</span>
            <span style={{ color: "var(--qt-landing-marke-gruen)" }}>Team</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {PUNKTE.map((punkt) => (
            <li key={punkt.id}>
              <a
                href={`#${punkt.id}`}
                aria-current={aktiv === punkt.id ? "true" : undefined}
                className={linkKlasse(punkt.id)}
              >
                {punkt.label}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-[3px] h-[2px] rounded-full transition-opacity"
                  style={{
                    background: "var(--qt-c-bronze)",
                    opacity: aktiv === punkt.id ? 1 : 0,
                  }}
                />
              </a>
            </li>
          ))}
        </ul>

        {/*
          Rechts neben den Abschnitten, nicht zwischen ihnen: die
          Sprungmarken beschreiben **diese** Seite, die uebrigen Punkte
          fuehren von ihr weg. In derselben Liste haetten sie
          ausgesehen, als gaebe es einen Abschnitt „Anmelden".

          Die Promo-Registerkarte steht hier ausserhalb der
          Soft-Launch-Bedingung: sie fuehrt nicht in einen
          Vertragsabschluss.
        */}
        {promoHref || authOffen ? (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {promoHref ? (
              <Link
                href={promoHref}
                className="touch-manipulation rounded-blk px-3 py-2 text-sm font-medium transition-colors hover:text-[var(--qt-c-bone)]"
                style={{ color: "color-mix(in oklab, var(--qt-c-bone) 62%, transparent)" }}
              >
                {promoLabel}
              </Link>
            ) : null}
            {authOffen
              ? AUTH_PUNKTE.map((punkt) => (
              <Link
                key={punkt.href}
                href={punkt.href}
                className="touch-manipulation rounded-blk px-3.5 py-2 text-sm font-semibold transition-colors"
                style={
                  punkt.stark
                    ? { background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }
                    : {
                        border:
                          "1px solid color-mix(in oklab, var(--qt-c-bone) 24%, transparent)",
                        color: "var(--qt-c-bone)",
                      }
                }
              >
                {punkt.label}
              </Link>
                ))
              : null}
          </div>
        ) : null}

        <button
          ref={knopfRef}
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          aria-controls="landing-nav-menue"
          className="flex h-11 touch-manipulation items-center gap-2 rounded-blk px-3 text-sm font-medium md:hidden"
          style={{
            border: "1px solid var(--qt-border-control)",
            color: "var(--qt-c-bone)",
          }}
        >
          {offen ? (
            <X aria-hidden="true" className="size-4" strokeWidth={2} />
          ) : (
            <Menu aria-hidden="true" className="size-4" strokeWidth={2} />
          )}
          Abschnitte
        </button>
      </nav>

      {offen ? (
        <ul
          id="landing-nav-menue"
          className="flex flex-col gap-1 px-5 pb-4 md:hidden"
          style={{ borderTop: "1px solid color-mix(in oklab, var(--qt-c-bone) 8%, transparent)" }}
        >
          {PUNKTE.map((punkt) => (
            <li key={punkt.id}>
              <a
                href={`#${punkt.id}`}
                onClick={() => setOffen(false)}
                aria-current={aktiv === punkt.id ? "true" : undefined}
                className="flex min-h-[2.75rem] touch-manipulation items-center rounded-blk px-2 text-base font-medium"
                style={{
                  color:
                    aktiv === punkt.id
                      ? "var(--qt-c-bone)"
                      : "color-mix(in oklab, var(--qt-c-bone) 70%, transparent)",
                }}
              >
                {punkt.label}
              </a>
            </li>
          ))}

          {promoHref ? (
            <li>
              <Link
                href={promoHref}
                onClick={() => setOffen(false)}
                className="flex min-h-[2.75rem] touch-manipulation items-center rounded-blk px-2 text-base font-medium"
                style={{ color: "color-mix(in oklab, var(--qt-c-bone) 70%, transparent)" }}
              >
                {promoLabel}
              </Link>
            </li>
          ) : null}

          {authOffen ? (
            <li
              className="mt-2 flex flex-col gap-2 pt-3"
              style={{
                borderTop:
                  "1px solid color-mix(in oklab, var(--qt-c-bone) 8%, transparent)",
              }}
            >
              {AUTH_PUNKTE.map((punkt) => (
                <Link
                  key={punkt.href}
                  href={punkt.href}
                  onClick={() => setOffen(false)}
                  className="flex min-h-[2.75rem] touch-manipulation items-center justify-center rounded-blk px-3 text-base font-semibold"
                  style={
                    punkt.stark
                      ? { background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }
                      : {
                          border:
                            "1px solid color-mix(in oklab, var(--qt-c-bone) 24%, transparent)",
                          color: "var(--qt-c-bone)",
                        }
                  }
                >
                  {punkt.label}
                </Link>
              ))}
            </li>
          ) : null}
        </ul>
      ) : null}
    </header>
  );
}
