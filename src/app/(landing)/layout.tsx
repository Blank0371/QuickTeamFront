import type { Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";

import { LandingNavigation } from "@/components/landing/landing-navigation";
import { LichtEbene } from "@/components/landing/licht-ebene";
import { gabarito } from "@/components/schriften";
import { softLaunchAktiv } from "@/lib/soft-launch";

/**
 * Rahmen der Startseite.
 *
 * **Eigene Klammer-Gruppe, nicht `(site)`.** Die Landingpage bringt ihre
 * eigene Kopfzeile mit (Abschnitts-Navigation statt Seiten-Navigation)
 * und ihren eigenen Fussbereich; `SiteHeader` und `SiteFooter` gehören
 * weiterhin zu `/preise` und den Rechtstexten. Zwei Rahmen, zwei
 * Gruppen — die Adressen ändern sich dadurch nicht, `/` bleibt `/`.
 *
 * **Theme Lock:** die Startseite bleibt fest dunkel — nicht über die
 * `prefers-color-scheme`-gesteuerten Ebene-2-Tokens (`bg-surface`,
 * `text-muted`, …), sondern direkt über die Ebene-1-Rohwerte
 * (`--qt-c-carbon`, `--qt-c-bone`, …), die sich nicht mit dem
 * Systemmodus umfärben. Grund: die Kalender-Erzählung ist eine
 * durchgezogene, absichtlich dunkle Bühne; ein Sprung auf helles Papier
 * mitten in der Farbreise — weil der Betrachter zufällig im hellen
 * System-Modus surft — wäre genau der Bruch, den diese Seite vermeidet.
 * Bewusste, auf diese eine Route begrenzte Ausnahme; die übrigen Seiten
 * behalten die Hell/Dunkel-Automatik.
 *
 * **Grundfarbe und Licht:** der Carbon-Grund liegt genau einmal hier,
 * darüber die seitenweite `LichtEbene` (fest im Viewport, `z-0`),
 * darüber der Inhalt (`z-10`). Keine Section trägt einen eigenen
 * Hintergrund — deshalb gibt es keine Sektionsgrenze, an der zwei
 * Verläufe aneinanderstossen könnten.
 */

/**
 * `colorScheme: "dark"` und `themeColor` gehören zum Theme Lock oben:
 * ohne sie bliebe `color-scheme: light dark` vom Root-Layout bestehen,
 * und ein Browser im hellen System-Modus würde native Bedienelemente
 * (Scrollbar-Track) hell gegen den festen Carbon-Hintergrund rendern —
 * sichtbar in Chrome/Edge auf Windows.
 */
export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0d100e",
};

/**
 * Eine einzige gescopte Regel setzt Gabarito auf die gesamte Seite.
 *
 * Warum eine Regel und nicht `fontFamily` auf dem Wurzel-`div`:
 * `globals.css` setzt `h1 … h6 { font-family: var(--font-display) }`
 * (also Archivo). Eine Elementregel schlägt jede Vererbung, ein
 * Wurzel-Style allein hätte also sämtliche Überschriften weiter in
 * Archivo gerendert. Der Selektor ist auf `.qt-landing` begrenzt und
 * damit auf diesen Teilbaum — `globals.css` bleibt unangetastet, die
 * übrigen Seiten behalten Archivo/Inter/JetBrains.
 *
 * Warum zentral statt an jedem Element: sonst trägt jede Überschrift
 * ihr eigenes `style={{ fontFamily: … }}`, und beim nächsten Bauteil
 * wird eine Stelle vergessen. „Die ganze Seite verwendet Gabarito" ist
 * eine Aussage über alles, nicht über die Stellen, an die man gedacht
 * hat.
 */
const SCHRIFT_REGEL = `.qt-landing,.qt-landing h1,.qt-landing h2,.qt-landing h3,.qt-landing h4,.qt-landing h5,.qt-landing h6,.qt-landing button,.qt-landing input,.qt-landing select,.qt-landing textarea{font-family:var(--font-gabarito),ui-sans-serif,system-ui,sans-serif}`;

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`qt-landing ${gabarito.variable} relative flex min-h-dvh flex-col bg-[var(--qt-c-carbon)]`}
      style={
        {
          /*
           * Markengrün für die Wortmarke, gemessen statt geschätzt.
           *
           * `--qt-c-green-light` (#4a6b58) ist der einzige helle Grünton
           * der Palette, und er reicht hier nicht: gegen den grün
           * beleuchteten Hero-Grund misst er im Browser 1,61:1 — für
           * einen 160px-Schriftzug sind 3:1 verlangt, für die kleine
           * Wortmarke in der Leiste 4,5:1 (dort kommt er auf 3,2:1).
           * „Team" stand dadurch sichtbar als Schatten neben dem hellen
           * „Quick"; das war nicht nur ein Prüfwert, sondern das
           * eigentliche Ungleichgewicht der zweifarbigen Marke.
           *
           * Kein neuer Hex-Wert und kein geändertes Ebene-1-Token: zwei
           * vorhandene Palettenwerte anders gemischt, genau nach dem
           * Muster von `--qt-border-control` in `globals.css`. 70 % Grün ist die obere Grenze des Machbaren
           * — mehr Bone hebt den Kontrast weiter, nimmt aber sichtbar
           * Farbe heraus; bei 45 % war „Team" ein helles Graugrün und
           * die Marke nicht mehr zweifarbig grün/gold, sondern
           * grau/gold. Stattdessen ist zusätzlich das grüne Hero-Licht
           * gedimmt worden (`LichtEbene`, Hero-Pose).
           *
           * Im Browser gemessen (Textfarbe gegen die tatsächlich
           * gerenderten Hintergrundpixel, nicht gegen eine angenommene
           * Fläche): „Team" 3,44:1 gegen den Hero-Grund bei 160px —
           * verlangt sind dort 3:1 —, „Quick" 6,03:1, und 5,47:1 für
           * die kleine Wortmarke in der Leiste, wo 4,5:1 gelten.
           */
          "--qt-landing-marke-gruen":
            "color-mix(in oklab, var(--qt-c-green-light) 70%, var(--qt-c-bone))",
        } as CSSProperties
      }
    >
      <style>{SCHRIFT_REGEL}</style>

      <LichtEbene />

      {/*
        Bewusst ohne umschliessendes `<div>`: ein `position: sticky`
        haftet nur innerhalb der Box seines Elternelements. In einem
        eigenen Wrapper, der genau so hoch ist wie die Leiste selbst,
        hätte sie exakt null Pixel Spielraum zum Kleben. Direkt als Kind
        dieser Seitenspalte ist ihr Elternelement die ganze Seite.
      */}
      <LandingNavigation authOffen={!softLaunchAktiv()} />

      <div className="relative z-10 flex-1">{children}</div>
    </div>
  );
}
