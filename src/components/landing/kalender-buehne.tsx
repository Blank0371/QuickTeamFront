"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import type { Kachelfarbe, Versprechen } from "./story-daten";
import { KalenderLogo } from "./kalender-logo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Architektur: `ScrollTrigger` mit `pin: true` (egal ob `pinType:
 * "fixed"` oder `"transform"`) hielt die Buehne per JavaScript fest,
 * das bei jedem Scroll-Tick die Position neu berechnete und schrieb —
 * sichtbar als Zittern an Logo und Text sowie gelegentliche
 * Ein-Pixel-Luecken am oberen und unteren Rand, weil die JS-getriebene
 * Neuberechnung nicht immer im selben Frame wie der native
 * Scroll/Compositor-Schritt lag. Jetzt uebernimmt der Browser das
 * Pinnen selbst ueber natives `position: sticky` — `ScrollTrigger`
 * steuert nur noch den Fortschritt der Timeline, ohne selbst zu pinnen.
 * Diese Aufteilung bleibt unangetastet; alles Neue haengt an Kindern,
 * nie am Sticky-Wrapper selbst.
 *
 * **Scrollstrecke, gekuerzt am 2026-09-02.** Vorher 560vh Track mit
 * einem Scrub von „top top" bis „bottom bottom", also 460vh gescrubbte
 * Strecke — im Browser bei 900px Viewport als 4140px gemessen. Jetzt
 * 380vh Track, Scrub von „top 55%" bis „bottom bottom-=50vh":
 * 380 - 100 - 50 + 55 = 285vh, also 2565px. Das sind 38 % weniger.
 *
 * Am 2026-09-03 ist der Beginn vorgezogen worden (25 % -> 55 %) und das
 * Ende eine halbe Bildschirmhoehe vor das Trackende gezogen; der Track
 * ist im selben Zug auf 380vh angepasst. Die gescrubbte Strecke ist
 * damit unveraendert 285vh lang, faengt aber frueher an und ist frueher
 * fertig.
 *
 * Gekuerzt wurde nicht nur die Strecke, sondern auch die Dramaturgie
 * darin: die drei Ruhepausen zwischen den Farbphasen lagen bei
 * 0.55/0.55/0.7 Zeiteinheiten und sind auf 0.3/0.3/0.4 zusammengezogen.
 * Waere nur der Track kuerzer geworden, haetten die Pausen anteilig
 * dieselbe Laenge behalten und der ereignisreiche Teil waere im selben
 * Verhaeltnis mit-beschleunigt worden.
 *
 * Struktur: `data-buehne` (die `<section>`) ist der hohe Scroll-Track.
 * `data-buehne-stage` darin wird `position: sticky; top: 0; height:
 * 100dvh` und bleibt dadurch fuer die gesamte Tracklaenge am
 * Viewportrand kleben, rein ueber CSS.
 *
 * **Kein eigener Sektionshintergrund mehr.** Track und Stage sind
 * durchsichtig; der Grund kommt aus der seitenweiten `LichtEbene`.
 * Damit gibt es an Ober- und Unterkante der Buehne keine eigene
 * Flaeche, die gegen die Nachbarsection abfallen koennte — der
 * frueher sichtbare dunkle Streifen an der Sektionsgrenze hat keine
 * Ursache mehr. Was bleibt, ist `data-glow-gold`: ein Kind der Stage,
 * das waehrend der Goldphase den Scheinwerfer auf dem Logo enger und
 * waermer macht. `overflow-clip` auf der Stage haelt diesen Glow auch
 * dann im Kasten, wenn er beim Austritt skaliert wird.
 *
 * Logo- und Textzentrierung laufen ueber `inset: 0; margin: auto`
 * (Logo) bzw. `left/right: 0; margin: 0 auto` (Text) statt ueber eine
 * `xPercent/yPercent`-Transformkette: beides sind Layout-Eigenschaften,
 * die der Browser einmal aufloest, nicht Teil der pro Frame
 * geschriebenen `transform`-Matrix. GSAP animiert an Logo und Kacheln
 * ausschliesslich `scale`/`autoAlpha`.
 *
 * `scrub: 0.5` statt `scrub: true`: reines `scrub: true` bildet jeden
 * diskreten Wheel-Tick 1:1 ab und macht die einzelnen Scrollschritte
 * sichtbar. `0.5` glaettet zwischen den Wheel-Deltas, ohne spuerbar
 * nachzuziehen. `ease: "none"` als Timeline-Default, weil jede
 * zusaetzliche Ease-Kurve in einer gescrubbten Timeline das Timing
 * gegen den tatsaechlichen Scrollfortschritt verschiebt.
 *
 * Grundzustand ohne JavaScript oder bei reduzierter Bewegung: ein
 * normaler, ungepinnter Fluss mit vollstaendigem Logo und drei
 * lesbaren Versprechen untereinander.
 */
export function KalenderBuehne({ versprechen }: { versprechen: readonly Versprechen[] }) {
  const wurzelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduziert) return;

      /*
       * Genau **ein** Refresh, und zwar erst, wenn beides steht:
       * Schriften und die Bildebenen des Logos.
       *
       * Schriften, weil `font-display: swap` sie nach dem ersten Paint
       * nachreicht und der Wechsel Texthoehen verschiebt, nachdem
       * ScrollTrigger die Tracklaenge schon berechnet hat.
       *
       * Bilder, weil am 2026-09-04 ein unsichtbares Logo gemeldet wurde:
       * die Ebenen waren angefordert, aber nicht dekodiert. Seit sie
       * `unoptimized` aus `_next/static/media` kommen, ist der Weg kurz
       * — trotzdem wird hier abgewartet statt gehofft. `decode()`
       * beantwortet als einziges die Frage, die zaehlt: ist das Bild
       * wirklich malbar? `complete` und ein 200er sagen das nicht.
       *
       * `Promise.allSettled` und nicht `all`: ein einzelnes Bild, das
       * scheitert, darf den Refresh der uebrigen Sequenz nicht
       * verhindern. Und `bereitsAufgefrischt` verhindert, dass aus zwei
       * Ausloesern zwei Laeufe werden — eine Refresh-Schleife waere
       * schlimmer als ein verpasster Refresh.
       */
      let bereitsAufgefrischt = false;
      const einmalAuffrischen = () => {
        if (bereitsAufgefrischt) return;
        bereitsAufgefrischt = true;
        ScrollTrigger.refresh();
      };

      const ebenen = gsap.utils.toArray<HTMLImageElement>(
        "[data-logo-ebene]",
        wurzelRef.current,
      );

      void Promise.allSettled([
        document.fonts?.ready ?? Promise.resolve(),
        ...ebenen.map((bild) =>
          bild.complete && bild.naturalWidth > 0
            ? Promise.resolve()
            : bild.decode().catch(() => undefined),
        ),
      ]).then(einmalAuffrischen);

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const wurzel = wurzelRef.current;
        const buehne = wurzel?.querySelector<HTMLElement>("[data-buehne]");
        const stage = buehne?.querySelector<HTMLElement>("[data-buehne-stage]");
        if (!buehne || !stage) return;

        const logoWrap = stage.querySelector<HTMLElement>("[data-logo-wrap]");
        const versprechenBlock = stage.querySelector<HTMLElement>("[data-versprechen-block]");
        const versprechenItems = gsap.utils.toArray<HTMLElement>("[data-versprechen-item]", stage);
        const kacheln = gsap.utils.toArray<HTMLElement>("[data-kachel]", stage);
        const glowGold = stage.querySelector<HTMLElement>("[data-glow-gold]");
        const [item0, item1, item2] = versprechenItems;
        if (!logoWrap || !versprechenBlock || !item0 || !item1 || !item2 || !glowGold) return;

        const gruppe = (farbe: Kachelfarbe) => kacheln.filter((el) => el.dataset.kachelFarbe === farbe);

        // Track + native Sticky-Buehne. Nur hier, zur Laufzeit, nur in
        // diesem Zweig — der Grundzustand in der JSX bleibt ein
        // normaler, ungepinnter Fluss.
        // Der negative Aussenabstand unten ist kein Trick, sondern die
        // Antwort auf eine Eigenheit von `position: sticky`: sobald der
        // Track zu Ende ist, loest sich die 100dvh hohe Stage und
        // braucht noch eine volle Bildschirmhoehe, um aus dem Bild zu
        // scrollen. Da Logo und Scheinwerfer bis dahin ausgeblendet
        // sind, war das im Browser eine ganze leere Bildschirmhoehe
        // Scrollweg zwischen dem fertigen Logo und der naechsten
        // Ueberschrift — genau die inhaltslose Strecke, die es nicht
        // geben soll. Die naechste Section rueckt deshalb um 50vh
        // hoch und ueberdeckt den bereits leeren Rest der Stage.
        // Zulaessig, weil die Stage durchsichtig und zu diesem
        // Zeitpunkt inhaltsleer ist; `sticky` und der Triggerbereich
        // bleiben unberuehrt, weil beide die Randbox messen und nicht
        // den Aussenabstand.
        gsap.set(buehne, { height: "380vh", marginBottom: "-50vh" });
        gsap.set(stage, { position: "sticky", top: 0, height: "100dvh" });

        gsap.set(logoWrap, {
          position: "absolute",
          inset: 0,
          margin: "auto",
          autoAlpha: 0,
          scale: 0.9,
        });
        gsap.set(versprechenBlock, {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "7%",
          margin: "0 auto",
          width: "min(36rem, 90%)",
          height: "8rem",
        });
        gsap.set(versprechenItems, { position: "absolute", inset: 0, autoAlpha: 0, y: 14, force3D: false });
        gsap.set(kacheln, { autoAlpha: 0, scale: 0.85 });
        // Der Scheinwerfer startet unsichtbar. Vorher stand er von
        // Anfang an auf 0.18 — und weil er ein `inset: 0`-Kind der
        // `overflow-clip`-Buehne ist, schnitt die Buehnenoberkante ihn
        // hart ab. Solange diese Kante durch den Viewport wanderte
        // (also genau im Uebergang Hero -> Sequenz), war sie als
        // waagrechte Farbunterbrechung sichtbar: unten Bronze, oben
        // nichts. Das war der gemeldete Gradient-Cut. Jetzt ist bis
        // zum Eintritt der Sequenz nichts da, was abgeschnitten werden
        // koennte, und die Maske am Element selbst faengt den Rest ab.
        gsap.set(glowGold, { autoAlpha: 0, scale: 1 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: buehne,
            // 55 % Viewport frueher als „top top" — vorher waren es
            // 25 %. Die Stage ist zu diesem Zeitpunkt schon im Bild
            // (sie schiebt sich von unten herein, sie klebt nur noch
            // nicht), der Rahmen steigt also von unten auf, waehrend
            // der Hero sich zurueckzieht. Zusammen mit dem niedrigeren
            // Hero erscheint der erste neue Bildinhalt dadurch bei
            // Scrollstand 335 statt 676 — die Haelfte des Weges.
            //
            // Die gescrubbte Strecke bleibt trotzdem gleich lang: der
            // Track ist im Gegenzug von 360vh auf 330vh gekuerzt
            // (330 - 100 + 55 = 285vh, exakt wie vorher 360 - 100 +
            // 25). Ein frueherer Beginn haette sie sonst wieder
            // verlaengert.
            start: "top 55%",
            // Der Versatz sitzt am *Trigger* („bottom-=450 bottom"),
            // nicht am Scroller: `bottom bottom-=450` schiebt die
            // Bezugslinie im Viewport nach oben und laesst den Scrub
            // dadurch spaeter enden statt frueher. Im Browser genau so
            // beobachtet — das Logo stand danach bis 700 px in die
            // Versprechen-Section hinein.
            //
            // Eine halbe Bildschirmhoehe vor dem Trackende — exakt der
            // Betrag, um den die naechste Section per negativem
            // Aussenabstand hochrueckt. Dadurch faellt das Ende der
            // Timeline mit dem Moment zusammen, in dem die Oberkante
            // der Versprechen-Section unten ins Bild kommt: das Logo
            // ist weg, bevor deren Ueberschrift da ist.
            //
            // Vorher endete der Scrub am Trackende, und weil die
            // naechste Section 450 px frueher hochgezogen wird, stand
            // „Unser Versprechen an dein Team" im Browser mitten im
            // noch zu 18 % sichtbaren Logo. Der Track ist im Gegenzug
            // von 330vh auf 380vh gewachsen, damit die gescrubbte
            // Strecke unveraendert 285vh lang bleibt.
            end: () => `bottom-=${window.innerHeight * 0.5} bottom`,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        // 1 — kurzer Eintritt des Rahmens, zusammen mit dem
        // Grundschein. Der Glow kommt erst hier dazu, nie vorher.
        tl.to(logoWrap, { autoAlpha: 1, scale: 1, duration: 0.4 }).to(
          glowGold,
          { autoAlpha: 0.18, duration: 0.4 },
          "<",
        );

        // 2 — erstes Versprechen, gruene Kacheln.
        tl.to(item0, { autoAlpha: 1, y: 0, duration: 0.35, force3D: false })
          .to(gruppe("green"), { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.06 }, "<0.05")
          .to({}, { duration: 0.3 });

        // 3 — zweites Versprechen, goldene Kacheln, Licht wird waermer.
        tl.to(item0, { autoAlpha: 0, y: -14, duration: 0.25, force3D: false })
          .to(item1, { autoAlpha: 1, y: 0, duration: 0.35, force3D: false })
          .to(gruppe("gold"), { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.06 }, "<0.05")
          .to(glowGold, { autoAlpha: 0.38, duration: 0.6 }, "<")
          .to({}, { duration: 0.3 });

        // 4 — drittes Versprechen, die eine rote Kachel.
        tl.to(item1, { autoAlpha: 0, y: -14, duration: 0.25, force3D: false })
          .to(item2, { autoAlpha: 1, y: 0, duration: 0.35, force3D: false })
          .to(gruppe("red"), { autoAlpha: 1, scale: 1, duration: 0.45 }, "<0.08")
          .to({}, { duration: 0.4 });

        // 5 — ruhiger Moment mit dem fertigen Logo: der Text geht weg,
        // das Logo waechst und steht kurz allein. Kein Label darunter.
        tl.to(item2, { autoAlpha: 0, y: -14, duration: 0.28, force3D: false })
          .to(glowGold, { autoAlpha: 0.5, scale: 1.3, duration: 0.7 }, "<")
          .to(logoWrap, { scale: 1.16, duration: 0.7 }, "<")
          .to({}, { duration: 0.25 });

        // 6 — fliessender Austritt. Logo und Scheinwerfer blenden im
        // letzten Stueck der Strecke aus, bevor die Stage aufhoert zu
        // kleben.
        //
        // Ohne das war der Austritt der haesslichste Moment der ganzen
        // Sequenz: das Logo stand bei voller Deckkraft, die Stage loeste
        // sich vom Viewportrand, und das fertige Logo schob sich halb
        // abgeschnitten unter die Navigationsleiste. Dazu kam eine
        // sichtbare waagrechte Kante — `overflow-clip` schneidet den
        // Goldglow exakt an der Stage-Unterkante ab, und solange der
        // Glow leuchtet, sieht man genau diese Schnittlinie durchs Bild
        // wandern. Ist am Ende der Strecke beides auf 0, gibt es weder
        // ein halbes Logo noch eine Kante, sondern eine Ueberblendung
        // in die naechste Section.
        tl.to(logoWrap, { autoAlpha: 0, scale: 1.24, duration: 0.35 })
          .to(glowGold, { autoAlpha: 0, duration: 0.35 }, "<");
      });

      /*
       * ─────────────────────────────────────────────────────────────
       *  Unter 1024px passiert nichts mehr — und das ist die Aenderung.
       * ─────────────────────────────────────────────────────────────
       *
       * Hier stand bis zum 2026-09-13 ein eigener Mobilzweig: der
       * Kalenderrahmen und **jeder** der drei Versprechen-Bloecke
       * bekamen `autoAlpha: 0` und wurden erst von einem ScrollTrigger
       * bei „top 82%" eingeblendet. Damit waren Ueberschrift und Text
       * der drei Kernaussagen im Auslieferungszustand unsichtbar und
       * haengten daran, dass GSAP geladen, ausgewertet und der Trigger
       * ausgeloest wurde.
       *
       * Drei Wege, auf denen das schiefgeht, und alle drei sind auf
       * einem Telefon der Normalfall statt der Ausnahme:
       *
       * 1. **Kein oder spaetes JavaScript.** Der Text steht im HTML —
       *    aber unsichtbar, sobald das Skript einmal gelaufen ist und
       *    der Trigger nicht feuert.
       * 2. **Schnelles Wischen.** ScrollTrigger wertet im
       *    Scroll-Callback aus; ein Schwung ueber mehrere
       *    Bildschirmhoehen konnte einen Block ueberspringen, der
       *    danach dauerhaft auf `autoAlpha: 0` stand.
       * 3. **Sprungmarke.** Ein Klick auf „Was ist QuickTeam?" springt
       *    mitten in den Abschnitt. Was dabei uebersprungen wird, bleibt
       *    leer — der Besucher landet auf einer Seite, die aussieht, als
       *    haette sie keinen Inhalt.
       *
       * Gegen alle drei gibt es keinen Handgriff, der die Animation
       * rettet, ohne genau das Problem zu behalten: sie versteckt
       * tragenden Inhalt, bis ein Ereignis eintritt. Der mobile
       * Abschnitt ist deshalb jetzt reines, statisches HTML — sofort
       * lesbar, unabhaengig von Skript, Scrollrichtung und
       * Sprungnavigation. Die Farbdramaturgie bleibt trotzdem sichtbar:
       * jeder Block traegt das Logo mit genau den Kacheln, die bis
       * dahin gefuellt sind, und zwar als gerendertes Markup, nicht als
       * Animationszustand.
       *
       * Die Desktop-Sequenz darueber ist unberuehrt.
       */

      return () => mm.revert();
    },
    { scope: wurzelRef },
  );

  return (
    /*
      Die Sprungmarke sitzt am Wrapper, nicht an der Desktop-Section.

      Vorher trug `id="kalender"` die Buehne selbst — und die ist unter
      1024px `display: none`. Ein Anker auf ein nicht dargestelltes
      Element scrollt nirgendwohin: der Hauptknopf des Hero („Funktionen
      entdecken", der waehrend des Soft-Launches angezeigte Zweig) und
      der Navigationspunkt „Was ist QuickTeam?" taten auf dem Handy
      schlicht nichts. Dasselbe galt zwischen 768px und 1023px, wo die
      Navigationsleiste schon sichtbar, die Desktop-Buehne aber noch
      abgeschaltet ist.

      Der Wrapper umfasst beide Fassungen und ist immer dargestellt.
      Die `IntersectionObserver`-Markierung der Navigationsleiste
      (`document.getElementById("kalender")`) findet ihn genauso, und
      weil er beide Sections enthaelt, stimmt der markierte Bereich in
      beiden Ansichten.
    */
    <div ref={wurzelRef} id="kalender" style={{ scrollMarginTop: "3.5rem" }}>
      <section
        data-buehne
        data-licht-szene="kalender-eintritt"
        aria-label="QuickTeam: vom leeren Kalenderrahmen zum vollständigen Plan"
        className="relative hidden w-full lg:block"
      >
        {/*
          Zwei unsichtbare Marker fuer die `LichtEbene`. Ohne sie koennte
          das seitenweite Licht nur an Sektionsgrenzen umschalten — und
          diese Section ist 380vh lang, das Licht stuende die ganze
          Sequenz ueber still. Die Marker sitzen bei 42 % und 78 % der
          Tracklaenge, also ungefaehr auf der Gold- und der Schlussphase
          der Timeline. Sie sind Kinder des Tracks (nicht der Stage) und
          scrollen deshalb normal durch den Viewport, so wie eine
          gewoehnliche Section es taete.
        */}
        <span
          aria-hidden="true"
          data-licht-szene="kalender-gold"
          className="pointer-events-none absolute left-0 h-px w-px"
          style={{ top: "42%" }}
        />
        <span
          aria-hidden="true"
          data-licht-szene="kalender-finale"
          className="pointer-events-none absolute left-0 h-px w-px"
          style={{ top: "78%" }}
        />

        {/*
          Grundzustand (kein JavaScript, reduzierte Bewegung): ein
          normaler Fluss, Logo mittig, die drei Versprechen
          untereinander. `position: sticky` und die exakte
          Viewport-Zentrierung setzt ausschliesslich GSAP weiter oben.

          Der Goldglow ist Kind DIESER Stage, nicht des 380vh-Tracks —
          sonst waere `inset: 0` relativ zum Track berechnet statt zum
          100dvh-Fenster, und der beim Austritt skalierte Glow liefe
          ungeklippt ueber die Trackbreite hinaus. Genau das war die
          Ursache eines gemessenen horizontalen Overflows.
        */}
        <div
          data-buehne-stage
          className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-14 overflow-clip px-8 py-24"
        >
          <div
            data-glow-gold
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(circle at 50% 46%, var(--qt-c-bronze) 0%, transparent 52%)",
              // Weicher Auslauf an Ober- und Unterkante der Buehne.
              // `overflow-clip` schneidet sonst hart; jede Kante, die
              // durchs Bild wandert, ist eine sichtbare waagrechte
              // Linie. Die Maske sorgt dafuer, dass an der Schnittkante
              // ohnehin nichts mehr leuchtet.
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)",
            }}
          />

          <div
            data-logo-wrap
            className="relative"
            style={{ height: "min(48vh, 28rem)", aspectRatio: "1264 / 1180" }}
          >
            <KalenderLogo aktivFarben={["green", "gold", "red"]} animiert className="h-full w-full" />
          </div>

          <div data-versprechen-block className="relative grid w-full max-w-xl gap-14 text-center">
            {versprechen.map((v) => (
              <div key={v.id} data-versprechen-item data-versprechen-farbe={v.farbe}>
                <h2
                  className="text-2xl font-bold leading-tight lg:text-3xl"
                  style={{ color: "var(--qt-c-bone)" }}
                >
                  {v.titel}
                </h2>
                <p
                  className="mx-auto mt-3 max-w-md text-base leading-relaxed"
                  style={{ color: "color-mix(in oklab, var(--qt-c-bone) 82%, transparent)" }}
                >
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        data-mobil-buehne
        data-licht-szene="kalender-eintritt"
        aria-label="QuickTeam: vom leeren Kalenderrahmen zum vollständigen Plan"
        className="relative w-full overflow-hidden px-5 pb-14 pt-4 sm:px-8 sm:pb-16 sm:pt-6 lg:hidden"
      >
        {/*
          Abstaende enger als zuvor (`pb-20 pt-6` / `mt-16` / `gap-14`).

          Sie waren aus der Desktop-Komposition uebernommen, wo sie den
          Atem zwischen zwei grossen Szenen tragen. Auf einem Telefon
          kostet derselbe Abstand ein Drittel Bildschirmhoehe pro Fuge:
          zwischen Logo und erstem Versprechen lag mehr Leerraum als
          Text, und es waren vier zusaetzliche Wischer noetig, um an drei
          kurzen Absaetzen vorbeizukommen. Die Abstaende richten sich
          jetzt nach dem, was dazwischen steht, statt nach einer
          Dramaturgie, die es mobil gar nicht gibt.
        */}
        <div className="relative mx-auto flex w-40 justify-center sm:w-48">
          <div className="w-full">
            <KalenderLogo aktivFarben={["green", "gold", "red"]} />
          </div>
        </div>

        <div className="relative mt-10 grid gap-10 sm:mt-12 sm:gap-12">
          {versprechen.map((v, index) => (
            <div key={v.id} data-versprechen-farbe={v.farbe}>
              <div className="mb-3 w-16">
                <KalenderLogo
                  aktivFarben={versprechen.slice(0, index + 1).map((eintrag) => eintrag.farbe)}
                  animiert
                />
              </div>
              <h2
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--qt-c-bone)" }}
              >
                {v.titel}
              </h2>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "color-mix(in oklab, var(--qt-c-bone) 82%, transparent)" }}
              >
                {v.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
