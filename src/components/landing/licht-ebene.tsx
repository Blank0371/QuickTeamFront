"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Eine einzige Lichtquelle fuer die ganze Seite statt eines eigenen
 * Gradients je Section.
 *
 * **Warum ueberhaupt.** Vorher trug jede Section ihren eigenen
 * `radial-gradient` auf eigenem `--qt-c-carbon`-Grund. Genau dort
 * entstanden die harten Kanten: zwei unabhaengige Verlaeufe stossen an
 * einer Sektionsgrenze aneinander, beide laufen gegen `transparent`
 * aus, und an der Naht bleibt eine schmale, deutlich dunklere Zone
 * stehen. Jetzt gibt es zwei Lichtebenen fuer die gesamte Seite, und
 * die Sections selbst sind durchsichtig — es gibt keine Naht mehr, an
 * der etwas aneinanderstossen koennte.
 *
 * **Warum `position: fixed`.** Die Ebene scrollt nicht mit. Damit kann
 * an keiner Stelle eine Gradient-Kante durchs Bild wandern; das Licht
 * steht im Viewport und aendert nur Position, Groesse und Deckkraft.
 * Das ist zugleich die guenstigste Variante: nur `transform` und
 * `opacity`, also Compositor-Arbeit — kein animiertes `filter: blur()`,
 * kein animiertes `background-position`, kein Repaint der Flaeche.
 *
 * **Warum getrennt von der Buehne.** Diese Ebene liegt ausserhalb der
 * `KalenderBuehne` und fasst deren Sticky-Wrapper nicht an. Der
 * stabile Sticky-Container bleibt unbewegt; animiert werden
 * ausschliesslich diese beiden Hintergrundkinder hier. Die erreichte
 * Jitter-Freiheit der Sequenz haengt an keiner Stelle von der
 * Lichtbewegung ab.
 *
 * **Warum eine einzige Timeline und nicht ein Trigger je Szene.** Der
 * naheliegende Weg — pro Szene ein eigener gescrubbter Trigger — ist
 * hier falsch: gescrubbte Tweens werden auch dann gerendert, wenn ihr
 * Bereich noch gar nicht erreicht ist (sie stehen dann auf Fortschritt
 * 0 und schreiben ihren Startwert). Sieben solche Tweens auf denselben
 * zwei Elementen wuerden sich beim Laden gegenseitig ueberschreiben,
 * und beim Rueckwaertsscrollen spraenge das Licht auf den Startwert des
 * zuletzt erzeugten Tweens. Stattdessen: eine Timeline mit Dauer 1,
 * deren Keyframes an der tatsaechlichen Scrollposition jeder Szene
 * sitzen, gefahren von genau einem ScrollTrigger ueber die gesamte
 * Seitenlaenge. Damit ist der Zustand in beide Richtungen eindeutig.
 *
 * Bewegt wird ueber `xPercent`/`yPercent`/`scale` relativ zur eigenen
 * Groesse der Lichtscheibe. Die Zentrierung laeuft ueber `left/top: 50%`
 * plus negative Margins statt ueber `-translate-x-1/2` — CSS-Transform
 * und GSAP-Transform auf demselben Element waeren zwei Schreiber auf
 * derselben Matrix, und GSAP wuerde die Zentrierung im ersten Frame
 * wegschreiben.
 */
type Pose = { xPercent: number; yPercent: number; scale: number; autoAlpha: number };

const POSEN: Record<string, { gruen: Pose; gold: Pose }> = {
  // Hero: breites gruenes Grundlicht hinter dem Schriftzug, darueber
  // ein enger goldener Kern — der Lichtpunkt, der spaeter zum Kalender
  // wandert.
  // Die Deckkraft ist hier ein Kontrastwert, keine Geschmacksfrage: das
  // gruene „Team" der Wortmarke steht direkt davor. Gegen den hellsten
  // gemessenen Pixel dieses Lichts kam es bei 0.55/0.26 auf 2,95:1 —
  // knapp unter den 3:1, die WCAG fuer grossen Text verlangt. Mit
  // 0.46/0.19 sind es 3,44:1. Gemessen wurde im Browser gegen die
  // tatsaechlich gerenderten Hintergrundpixel oberhalb der Wortmarke,
  // nicht gegen eine angenommene Flaeche. Farben und Verlaeufe bleiben
  // unveraendert; nur die Helligkeit dieser einen Pose ist gesenkt.
  hero: {
    gruen: { xPercent: 0, yPercent: -8, scale: 0.78, autoAlpha: 0.46 },
    gold: { xPercent: 0, yPercent: -17, scale: 0.4, autoAlpha: 0.19 },
  },
  // Eintritt in die Sequenz: das Licht faehrt in die Bildmitte und
  // zieht sich zusammen — aus Raumbeleuchtung wird Scheinwerfer.
  "kalender-eintritt": {
    gruen: { xPercent: 0, yPercent: -1, scale: 0.66, autoAlpha: 1 },
    gold: { xPercent: 0, yPercent: -3, scale: 0.3, autoAlpha: 0.2 },
  },
  // Goldphase: der warme Kern waechst und uebernimmt.
  "kalender-gold": {
    gruen: { xPercent: 0, yPercent: -1, scale: 0.74, autoAlpha: 0.72 },
    gold: { xPercent: 0, yPercent: -3, scale: 0.55, autoAlpha: 0.55 },
  },
  // Fertiges Logo: das Licht oeffnet sich, bleibt zentriert.
  "kalender-finale": {
    gruen: { xPercent: 0, yPercent: 0, scale: 0.95, autoAlpha: 0.62 },
    gold: { xPercent: 0, yPercent: -2, scale: 0.85, autoAlpha: 0.44 },
  },
  // Versprechen: breiter und ruhiger, damit Kartentext ruhig steht.
  versprechen: {
    gruen: { xPercent: 0, yPercent: -6, scale: 1.3, autoAlpha: 0.7 },
    gold: { xPercent: 0, yPercent: 8, scale: 1.1, autoAlpha: 0.12 },
  },
  // Pricing: warmer goldener Schwerpunkt, gruen sinkt nach unten ab.
  pricing: {
    gruen: { xPercent: 0, yPercent: 14, scale: 1.15, autoAlpha: 0.5 },
    gold: { xPercent: 0, yPercent: -10, scale: 0.9, autoAlpha: 0.34 },
  },
  // Footer: das Licht klingt in dunklem Gruen aus.
  footer: {
    gruen: { xPercent: 0, yPercent: 20, scale: 0.95, autoAlpha: 0.55 },
    gold: { xPercent: 0, yPercent: 14, scale: 0.8, autoAlpha: 0.06 },
  },
};

export function LichtEbene() {
  const wurzelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wurzel = wurzelRef.current;
      const gruen = wurzel?.querySelector<HTMLElement>("[data-licht=gruen]");
      const gold = wurzel?.querySelector<HTMLElement>("[data-licht=gold]");
      if (!gruen || !gold) return;

      const heroPose = POSEN.hero!;
      gsap.set(gruen, heroPose.gruen);
      gsap.set(gold, heroPose.gold);

      // Bei reduzierter Bewegung bleibt es bei genau dieser einen,
      // ruhigen Grundbeleuchtung — kein ScrollTrigger, keine Bewegung.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      let tl: gsap.core.Timeline | undefined;

      const bauen = () => {
        tl?.scrollTrigger?.kill();
        tl?.kill();
        tl = undefined;

        // `offsetParent === null` filtert die jeweils andere
        // Breakpoint-Fassung der Kalender-Buehne heraus: Desktop- und
        // Mobilvariante stehen beide im DOM, eine davon ist per
        // `display: none` abgeschaltet. Ein `getBoundingClientRect()`
        // darauf liefert Nullen — die Szene laege dann bei
        // Scrollfortschritt 0 und wuerde die Keyframe-Reihenfolge
        // zerstoeren.
        const szenen = gsap.utils
          .toArray<HTMLElement>("[data-licht-szene]")
          .filter((el) => POSEN[el.dataset.lichtSzene ?? ""] && el.offsetParent !== null);
        const gesamt = document.documentElement.scrollHeight - window.innerHeight;
        if (szenen.length < 2 || gesamt <= 0) return;

        // Normalisierter Scrollfortschritt (0..1), bei dem eine Szene
        // ihre Pose erreicht haben soll: wenn ihre Oberkante die
        // Bildschirmmitte passiert.
        const zeit = (el: HTMLElement) =>
          gsap.utils.clamp(
            0,
            1,
            (el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5) / gesamt,
          );

        gsap.set(gruen, heroPose.gruen);
        gsap.set(gold, heroPose.gold);

        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        });

        for (let i = 1; i < szenen.length; i += 1) {
          const pose = POSEN[szenen[i]!.dataset.lichtSzene!]!;
          const von = zeit(szenen[i - 1]!);
          const bis = zeit(szenen[i]!);
          const dauer = Math.max(0.02, bis - von);
          timeline.to(gruen, { ...pose.gruen, duration: dauer }, von);
          timeline.to(gold, { ...pose.gold, duration: dauer }, von);
        }

        // Auf Dauer 1 normiert, damit der Fortschritt der Timeline
        // eins zu eins dem Scrollfortschritt der Seite entspricht.
        timeline.totalDuration(1);
        tl = timeline;
      };

      // Erst bauen, wenn die Schriften stehen: ein spaeter Font-Swap
      // aendert Texthoehen und damit jede gemessene Szenenposition.
      let abgebrochen = false;
      const start = () => {
        if (!abgebrochen) bauen();
      };
      if (document.fonts?.ready) void document.fonts.ready.then(start);
      else start();

      // Die Keyframe-Zeiten sind gemessene Werte. Ein Resize aendert
      // sie, also wird die Timeline neu gebaut statt nur aufgefrischt.
      let timer = 0;
      const beiResize = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          bauen();
          ScrollTrigger.refresh();
        }, 200);
      };
      window.addEventListener("resize", beiResize);

      return () => {
        abgebrochen = true;
        window.clearTimeout(timer);
        window.removeEventListener("resize", beiResize);
        tl?.scrollTrigger?.kill();
        tl?.kill();
      };
    },
    { scope: wurzelRef },
  );

  return (
    <div
      ref={wurzelRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        data-licht="gruen"
        className="absolute left-1/2 top-1/2 h-[130vmax] w-[130vmax]"
        style={{
          marginLeft: "-65vmax",
          marginTop: "-65vmax",
          willChange: "transform, opacity",
          background:
            "radial-gradient(circle at 50% 50% in oklab, var(--qt-c-green) 0%, color-mix(in oklab, var(--qt-c-green) 62%, transparent) 26%, color-mix(in oklab, var(--qt-c-green-deep) 55%, transparent) 46%, transparent 68%)",
        }}
      />
      <div
        data-licht="gold"
        className="absolute left-1/2 top-1/2 h-[130vmax] w-[130vmax]"
        style={{
          marginLeft: "-65vmax",
          marginTop: "-65vmax",
          willChange: "transform, opacity",
          background:
            "radial-gradient(circle at 50% 50% in oklab, var(--qt-c-bronze) 0%, color-mix(in oklab, var(--qt-c-bronze) 42%, transparent) 26%, color-mix(in oklab, var(--qt-c-bronze-lo) 22%, transparent) 44%, transparent 62%)",
        }}
      />

      {/*
        Dither gegen Gradient-Banding. Zwei sehr grosse, sehr flache
        Verlaeufe auf fast schwarzem Grund durchlaufen ueber hunderte
        Pixel nur eine Handvoll 8-Bit-Stufen — die Stufengrenzen werden
        als konzentrische Ringe sichtbar. Im Browser nachgesehen: bei
        1440x900 waren sie im Uebergang Hero/Kalender deutlich zu
        erkennen. Eine feine Rauschtextur bricht die Stufengrenzen auf,
        weil benachbarte Pixel zufaellig auf die eine oder andere Stufe
        fallen.
        `in oklab` in den Verlaeufen oben hilft bereits, reicht aber
        allein nicht: es glaettet die Farbinterpolation, nicht die
        8-Bit-Quantisierung am Ende.
        Kein Bild, keine Abhaengigkeit — `feTurbulence` als Data-URI.
        Statisch, nie animiert, also einmal gerastert und danach
        kostenlos.
      */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundRepeat: "repeat",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23r)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
