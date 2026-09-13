import type { ReactNode } from "react";

import { gabarito } from "@/components/schriften";

/**
 * Setzt die Schrift des Dashboards — und sonst nichts.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum diese Ebene und nicht `(arbeit)`
 * ─────────────────────────────────────────────────────────────────────
 *
 * `dashboard/(arbeit)/layout.tsx` trägt die Schale **und das Tor**;
 * `dashboard/wechseln` liegt bewusst daneben, weil es die Antwort auf
 * „keine Position gewählt" ist und sich sonst selbst aufriefe. Läge die
 * Schriftregel in `(arbeit)`, bekäme die Positionswahl sie nicht — man
 * meldet sich an, wählt eine Position in Archivo/Inter und landet einen
 * Klick später in Gabarito.
 *
 * Diese Ebene umfasst beide. Sie prüft nichts und lädt nichts nach: das
 * Tor bleibt genau dort, wo es war. Ein Layout, das aussieht, als
 * schütze es etwas, wäre die schlechtere Lösung als eines, das
 * offensichtlich nur Aussehen setzt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine gescopte Regel statt globaler Tokens
 * ─────────────────────────────────────────────────────────────────────
 *
 * `--font-display` und `--font-sans` in `globals.css` umzuhängen wäre
 * kürzer und würde die öffentliche Website mitziehen — Landing, Preise,
 * Rechtstexte, Auth, Stepper. Verlangt war das Dashboard.
 *
 * Überschrieben wird deshalb innerhalb dieses Teilbaums — und zwar auf
 * **zwei** Ebenen, weil eine nicht reicht:
 *
 *   `--font-qt-display` / `--font-qt-sans`   die Quellvariablen aus dem
 *                                            Root-Layout
 *   `--font-display` / `--font-sans`         die Theme-Tokens
 *
 * Der erste Anlauf setzte nur die Theme-Tokens, und im Browser standen
 * `h2` und jede `font-display`-Utility weiter in Archivo. Der Grund
 * steht in `globals.css`: die Tokens liegen in einem **`@theme
 * inline`**-Block. Tailwind setzt dort nicht `var(--font-display)` in
 * die Utility, sondern deren aufgelösten Wert — `.font-display` liest
 * also direkt `--font-qt-display` und hat vom Token nie gehört. Wer nur
 * das Token umhängt, erwischt die globale `h1..h4`-Regel und sonst
 * nichts.
 *
 * Sichtbar wurde das nur, weil `h1` und `h2` auseinanderfielen: `h1`
 * trägt auf den Dashboard-Seiten keine Klasse und folgt der
 * Elementregel, `h2` trägt `font-display` — und eine Klasse (0,1,0)
 * schlägt einen Elementselektor (0,0,1).
 *
 * **`font-family` am Container selbst ist zusätzlich nötig.** Der
 * Fliesstext erbt seine Familie vom `<body>`, und `<body>` hat
 * `var(--font-sans)` längst zu „Inter" ausgerechnet, bevor unsere
 * Überschreibung greift. Vererbt wird der *berechnete* Wert, nicht die
 * Variable.
 *
 * `--font-qt-mono` steht bewusst in keiner der beiden Listen; die
 * Begründung dazu an `gabarito` in `src/components/schriften.ts`.
 *
 * Knöpfe und Eingabefelder brauchen keinen eigenen Eintrag: Tailwinds
 * Preflight setzt `font: inherit` auf `button, input, optgroup, select,
 * textarea`, sie hängen also an derselben Vererbung wie der Fliesstext.
 * Nachgesehen in `node_modules/tailwindcss/preflight.css`, nicht
 * angenommen.
 */
const SCHRIFT_REGEL =
  `.qt-dashboard{` +
  `--font-qt-display:var(--font-gabarito);` +
  `--font-qt-sans:var(--font-gabarito);` +
  `--font-display:var(--font-gabarito),ui-sans-serif,system-ui,sans-serif;` +
  `--font-sans:var(--font-gabarito),ui-sans-serif,system-ui,sans-serif;` +
  `font-family:var(--font-gabarito),ui-sans-serif,system-ui,sans-serif}`;

export default function DashboardSchriftLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    /*
     * `flex flex-1 flex-col` spiegelt genau das, was `(arbeit)/layout`
     * als Wurzel hat: diese Zwischenebene soll in der Flex-Kette vom
     * `<main>` abwärts nichts verändern, nur eine Klasse tragen.
     */
    <div className={`qt-dashboard ${gabarito.variable} flex flex-1 flex-col`}>
      <style>{SCHRIFT_REGEL}</style>
      {children}
    </div>
  );
}
