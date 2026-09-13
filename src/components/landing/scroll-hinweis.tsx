"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Minimalistischer Hinweis, dass die Seite gescrollt werden kann: eine
 * schmale senkrechte Schiene, in der ein kleiner Punkt langsam nach
 * unten wandert, darueber das Wort „Scrollen".
 *
 * Rein informativ, deshalb `aria-hidden` und `pointer-events: none` —
 * es gibt nichts zu bedienen und nichts vorzulesen, was der Inhalt
 * nicht schon saegte. Keine zusaetzliche Abhaengigkeit: die Schiene ist
 * ein `div` mit Rahmenfarbe, der Punkt ein zweites, die Bewegung
 * kommt aus dem ohnehin geladenen GSAP.
 *
 * Position: auf grossen Schirmen seitlich rechts mit deutlichem
 * Abstand zum Fensterrand, auf kleinen unten mittig — seitlich waere
 * es dort entweder im Daumenbereich oder unter dem Text.
 *
 * Auf schmalen Schirmen ist der Hinweis kompakter (kuerzere Schiene,
 * engerer Abstand, naeher an der Unterkante). Grund: seit der Hero
 * niedriger ist, ruecken Knoepfe und Hinweis zusammen — mit der
 * Desktop-Groesse lag das Wort „Scrollen" gemessene 15 px ueber dem
 * „Anmelden"-Knopf. Kompakt bleiben 17 px Abstand.
 *
 * Der Hinweis gehoert zum Hero und verschwindet mit ihm: ein
 * gescrubbter Ausblender an der Hero-Unterkante, damit er nicht ueber
 * der Kalender-Sequenz stehen bleibt.
 *
 * Bei `prefers-reduced-motion` steht der Punkt still. Die Schiene
 * bleibt sichtbar — die Information „hier geht es weiter" ist dann
 * immer noch da, nur ohne wiederkehrende Bewegung.
 */
export function ScrollHinweis() {
  const wurzelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wurzel = wurzelRef.current;
      const punkt = wurzel?.querySelector<HTMLElement>("[data-scroll-punkt]");
      const hero = wurzel?.closest<HTMLElement>("[data-hero]");
      if (!wurzel || !punkt) return;

      // Der Weg des Punktes ist die Schiene, nicht eine feste Zahl:
      // die Schiene ist auf schmalen Schirmen kuerzer (siehe unten),
      // ein fester Wert liefe dort unten heraus.
      const weg = Math.max(16, (punkt.parentElement?.clientHeight ?? 48) - 8);

      const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduziert) {
        gsap.set(punkt, { y: 0, autoAlpha: 1 });
      } else {
        // Zwei Durchlaeufe, dann Ruhe — bewusst keine Endlosschleife.
        //
        // WCAG 2.2.2 verlangt fuer Bewegung, die von selbst startet,
        // laenger als fuenf Sekunden dauert und neben anderem Inhalt
        // steht, eine Moeglichkeit zum Anhalten. Fuer einen 5px grossen
        // Punkt einen Pausenknopf zu bauen waere absurd; die
        // Bewegung von vornherein unter der Grenze zu halten ist die
        // ehrlichere Loesung. Zwei Durchlaeufe zu je 1,95 s samt Pause
        // ergeben rund 4,4 s. Danach bleibt der Punkt oben stehen: der
        // Hinweis „hier geht es weiter" bleibt sichtbar, er bewegt
        // sich nur nicht mehr.
        gsap
          .timeline({ repeat: 1, repeatDelay: 0.5, onComplete: () => gsap.set(punkt, { y: 0, autoAlpha: 1 }) })
          .fromTo(punkt, { y: 0, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "none" })
          .to(punkt, { y: weg, duration: 1.6, ease: "power1.inOut" }, 0)
          .to(punkt, { autoAlpha: 0, duration: 0.4, ease: "none" }, 1.2);
      }

      if (!hero || reduziert) return;

      gsap.to(wurzel, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "bottom 95%",
          end: "bottom 72%",
          scrub: 0.5,
        },
      });
    },
    { scope: wurzelRef },
  );

  return (
    <div
      ref={wurzelRef}
      aria-hidden="true"
      className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-12 lg:left-auto lg:right-10 lg:translate-x-0 lg:gap-3 xl:right-16"
      // Auf Geraeten mit Gestenleiste sitzt der Hinweis sonst genau
      // darunter. Bei Geraeten ohne Einzug ist der Wert 0.
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <span
        className="text-[0.6875rem] font-medium uppercase tracking-[0.26em]"
        style={{ color: "color-mix(in oklab, var(--qt-c-bone) 52%, transparent)" }}
      >
        Scrollen
      </span>
      <span
        className="relative block h-8 w-px lg:h-12"
        style={{ background: "color-mix(in oklab, var(--qt-c-bone) 20%, transparent)" }}
      >
        {/*
          Waagrecht zentriert ueber `left`, nicht ueber
          `-translate-x-1/2`: GSAP animiert an diesem Punkt `y`, und
          eine CSS-Transform auf demselben Element wuerde von der
          GSAP-Matrix im ersten Frame ueberschrieben — der Punkt
          spraenge um seine halbe Breite zur Seite. Die Schiene ist 1px
          breit, der Punkt 5px, also -2px.
        */}
        <span
          data-scroll-punkt
          className="absolute top-0 block size-[5px] rounded-full"
          style={{ left: "-2px", background: "var(--qt-c-bronze-hi)" }}
        />
      </span>
    </div>
  );
}
