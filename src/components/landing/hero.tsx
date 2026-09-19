"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { useRef } from "react";

import { ScrollHinweis } from "./scroll-hinweis";
import type { Dictionary } from "@/i18n/de";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * Geometrie und Farbe der beiden Hero-Knoepfe, einmal. Beide Zweige
 * unten — gesperrt und offen — benutzen dieselben Werte; ausgeschrieben
 * waeren es vier Stellen, an denen ein Wert abweichen kann, ohne dass es
 * jemandem auffaellt.
 */
const PRIMAER =
  "flex min-h-[3.5rem] touch-manipulation items-center justify-center rounded-blk px-10 text-base font-semibold transition-colors hover:bg-[var(--qt-c-bronze-hi)] active:translate-y-px";

const SEKUNDAER =
  "flex min-h-[3.5rem] touch-manipulation items-center justify-center rounded-blk px-10 text-base font-semibold transition-colors hover:border-[var(--qt-c-bronze-hi)] hover:text-[var(--qt-c-bronze-hi)] active:translate-y-px";

const SEKUNDAER_STIL = {
  border: "1px solid var(--qt-border-control)",
  color: "var(--qt-c-bone)",
} as const;

/**
 * Der Hero traegt kein Kalender-Logo — das leere Rahmenbild wirkte hier
 * unfertig, bevor der Betrachter ueberhaupt weiss, dass es sich fuellen
 * wird. Sein erster Auftritt ist die `KalenderBuehne`, dort beginnt
 * seine Geschichte.
 *
 * **Kein eigener Hintergrund.** Das Licht kommt aus der seitenweiten
 * `LichtEbene`, die hinter allen Sections liegt. Genau dieser Wechsel
 * loest den harten Sektionsuebergang: es gibt keinen Hero-Gradient
 * mehr, der an einem Kalender-Gradient enden koennte.
 *
 * **Zwei Hauptaktionen, klar unterschieden.** Die gefuellte
 * Bronzeflaeche ist unstrittig primaer; der Outline-Knopf liegt daneben
 * auf derselben Groesse — gleich gut auffindbar, aber nicht gleich
 * laut.
 *
 * **Wohin sie zeigen, haengt am Soft-Launch-Schalter, nicht an dieser
 * Datei.** Steht die Sperre (`SOFT_LAUNCH` nicht `aus`, der Default),
 * sind `/registrieren` und `/login` serverseitig gesperrt; ein Knopf
 * dorthin waere kein Angebot, sondern eine Sackgasse. Dann fuehren
 * beide auf Abschnitte dieser Seite — „Funktionen entdecken" und
 * „Preise ansehen". Ist die Sperre offen, stehen wieder „Kostenlos
 * testen" und „Anmelden" da.
 *
 * Die Form bleibt in beiden Faellen dieselbe: zwei Knoepfe, gleiche
 * Groesse, gleiche Rangfolge, gleiche Klassen. Es aendern sich nur Ziel
 * und Beschriftung, damit in der Komposition weder eine Luecke noch ein
 * Sprung entsteht.
 *
 * `authOffen` kommt als Prop von `src/app/(landing)/page.tsx` herein.
 * Diese Datei ist eine Client-Insel und kann `process.env.SOFT_LAUNCH`
 * nicht lesen — der Wert traegt bewusst kein `NEXT_PUBLIC_`-Praefix.
 *
 * **Hoehe: eine Bildschirmhoehe minus einem bewussten Vorgriff.** Der
 * Hero fuellt nicht mehr exakt den ersten Bildschirm, sondern laesst
 * unten ein Stueck der naechsten Szene angeschnitten stehen. Vorher war
 * er genau eine Viewporthoehe hoch und der Kalenderrahmen begann erst
 * danach — zwischen den Knoepfen und dem ersten neuen Bildinhalt lagen
 * dadurch rund 800 px Scrollweg, auf dem nichts passierte ausser einem
 * langsam verblassenden Hero. Der abgezogene Betrag ist der Hebel
 * dafuer und je Breakpoint eigen, weil die Kopfleisten unterschiedlich
 * hoch sind und der Hero-Inhalt selbst unterschiedlich viel Platz
 * braucht.
 */
/**
 * `texte` kommt als Prop, nicht aus dem Context: es sind die
 * Beschriftungen **dieser** Seite und nicht Querschnittliches. Dieselbe
 * Aufteilung wie beim Soft-Launch-Schalter darüber — der Server liest,
 * die Insel bekommt das Ergebnis (`src/i18n/sprach-provider.tsx`).
 */
export function Hero({
  authOffen,
  texte,
}: {
  authOffen: boolean;
  texte: Dictionary["landing"];
}) {
  const wurzelRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduziert) return;

      /*
       * ─────────────────────────────────────────────────────────────
       *  Alles Folgende laeuft ausschliesslich ab 1024px.
       * ─────────────────────────────────────────────────────────────
       *
       * Bis zum 2026-09-13 lief beides auf jeder Breite: der Auftritt
       * setzte Wortmarke, Untertitel und Knoepfe zuerst auf
       * `autoAlpha: 0`, und der Rueckzug haengte Deckkraft, Verschiebung
       * und Skalierung des gesamten Hero-Inhalts an die Scrollposition.
       *
       * Auf dem Schreibtisch ist das die Ouvertuere zur Kalender-Sequenz
       * darunter — auf dem Handy gibt es diese Sequenz gar nicht, die
       * Desktop-Buehne ist unter 1024px per `display: none` abgeschaltet.
       * Der Rueckzug bezog sich dort also auf nichts: die Ueberschrift
       * verblasste und schrumpfte, waehrend darunter nur der naechste
       * Textblock kam. Dazu ist auf einem Telefon der Hero-Inhalt fast
       * der ganze erste Bildschirm, und ein Wischer verschiebt mehr
       * Anteil davon als ein Mausrad — die Bewegung war entsprechend
       * heftiger, genau dort, wo sie am wenigsten hilft.
       *
       * Mobil steht der Hero deshalb einfach da: voll deckend, unbewegt,
       * ohne dass ein Skript ihn erst sichtbar machen muesste. Faellt
       * JavaScript aus oder kommt es spaet, aendert das nichts mehr.
       *
       * `gsap.matchMedia()` und nicht ein `if` mit `matchMedia`: der
       * Zweig wird beim Unterschreiten der Breite automatisch
       * zurueckgenommen, inklusive aller gesetzten Inline-Stile und der
       * ScrollTrigger. Ein Wechsel der Fensterbreite — Drehen des
       * Geraets, aufgeklappte Entwicklerwerkzeuge — laesst sonst einen
       * halbtransparenten Hero stehen, den nichts mehr zurueckstellt.
       */
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .set(".qt-hero-marke, .qt-hero-sub, .qt-hero-cta", {
            autoAlpha: 0,
            y: 18,
          })
          .to(".qt-hero-marke", { autoAlpha: 1, y: 0, duration: 1 })
          .to(".qt-hero-sub", { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.55")
          .to(".qt-hero-cta", { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.4");

        // Kontrollierter Rueckzug beim Verlassen des Hero: der Inhalt
        // weicht zurueck, waehrend die Kalender-Buehne darunter ihren
        // eigenen Einblend-Scrub startet. Beide haengen an der echten
        // Scrollposition und laufen dadurch zusammen, ohne eine
        // gemeinsame Timeline zu brauchen.
        //
        // `scrub: 0.5` statt `true`: reines `scrub: true` bildet jeden
        // diskreten Wheel-Tick 1:1 ab und macht Text sichtbar in Stufen
        // springen. `ease: "none"`, weil jede Ease-Kurve innerhalb einer
        // gescrubbten Animation das Timing gegen den tatsaechlichen
        // Scrollfortschritt verschiebt. `force3D: false`, weil
        // GPU-Layer-Transforms auf Fliesstext ein leichtes
        // Subpixel-Flimmern verursachen koennen.
        gsap.to("[data-hero-inhalt]", {
          autoAlpha: 0,
          y: -36,
          scale: 0.97,
          ease: "none",
          force3D: false,
          scrollTrigger: {
            trigger: wurzelRef.current,
            // Kuerzer als vorher („bottom 85%" bis „bottom top"): der
            // Rueckzug lief ueber fast eine ganze Bildschirmhoehe, ein
            // halbdurchsichtiger Hero stand lange im Bild, waehrend noch
            // nichts Neues da war. Jetzt ist er fertig, sobald der
            // Kalenderrahmen von unten hereinkommt.
            //
            // Der Anfangsanker sitzt bewusst am Hero-*Kopf*, nicht an
            // seinem Fuss: der Hero ist niedriger als ein Bildschirm,
            // seine Unterkante steht also schon bei Scrollstand 0 im
            // Bild — jedes „bottom X%" waere damit sofort ausgeloest.
            start: "top top-=80",
            end: "bottom 20%",
            scrub: 0.5,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: wurzelRef },
  );

  return (
    <section
      ref={wurzelRef}
      id="start"
      data-hero
      data-licht-szene="hero"
      className="relative w-full"
      style={{ scrollMarginTop: "3.5rem" }}
    >
      {/* Mobil bestimmt der Inhalt die Höhe; nur Desktop nutzt die Bühnenhöhe. */}
      <div className="relative mx-auto flex min-h-0 lg:min-h-[calc(100dvh-3.5rem-9.5rem)] w-full max-w-6xl flex-col items-center justify-center px-5 pb-10 pt-12 text-center sm:px-8 sm:pb-12 sm:pt-16 lg:pb-8 lg:pt-20">
        <div data-hero-inhalt className="flex w-full min-w-0 flex-col items-center">
          <h1
            className="qt-hero-marke text-[clamp(2.75rem,12.5vw,4.5rem)] font-bold leading-[0.95] sm:text-[5.5rem] lg:text-[8.5rem] xl:text-[10rem]"
            style={{
              // Gabarito laeuft bei Displaygroessen leicht offen.
              // -0.025em zieht „QuickTeam" zu einem Wort zusammen, ohne
              // dass sich das k an das T anlegt.
              letterSpacing: "-0.025em",
              // Gabaritos Q traegt einen Schwanz, der unter die
              // Grundlinie laeuft. `leading-[0.95]` haelt die Zeilenbox
              // knapp; dieser Innenabstand gibt dem Schwanz seinen
              // Platz zurueck, damit er weder am Absatz darunter noch
              // an einer Maske haengt.
              paddingBottom: "0.08em",
            }}
          >
            <span style={{ color: "var(--qt-c-bronze-hi)" }}>Quick</span>
            <span style={{ color: "var(--qt-landing-marke-gruen)" }}>Team</span>
          </h1>

          <p
            className="qt-hero-sub mx-auto mt-6 max-w-md text-lg leading-relaxed lg:max-w-2xl sm:mt-8 sm:text-2xl"
            style={{ color: "var(--qt-c-bone)" }}
          >
            {texte.heroSub}
          </p>

          <div className="qt-hero-cta mt-7 flex w-full max-w-sm flex-col gap-3 sm:mt-10 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4">
            {authOffen ? (
              <>
                <Link
                  href="/registrieren"
                  className={PRIMAER}
                  style={{ background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }}
                >
                  {texte.heroTesten}
                </Link>
                <Link href="/login" className={SEKUNDAER} style={SEKUNDAER_STIL}>
                  {texte.heroAnmelden}
                </Link>
              </>
            ) : (
              <>
                <a
                  href="#kalender"
                  className={PRIMAER}
                  style={{ background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }}
                >
                  {texte.heroFunktionen}
                </a>
                <a href="#pricing" className={SEKUNDAER} style={SEKUNDAER_STIL}>
                  {texte.heroPreise}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollHinweis />
    </section>
  );
}
