"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "./config";
import type { Dictionary } from "./de";
import type { Textblock } from "./text";

/**
 * Die Sprachbrücke zu den Client-Inseln.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum hier Texte stehen und keine Locale
 * ─────────────────────────────────────────────────────────────────────
 *
 * Naheliegend wäre, die Locale durchzureichen und jede Insel selbst
 * nachschlagen zu lassen. Das ginge nicht ohne Preis: eine Insel, die
 * `getDictionary()` aufruft, zieht **beide** Wörterbücher ins
 * Client-Bündel — auf der Landing Page, deren First Load JS laut
 * `CLAUDE.md` unter 150 KB gzipped bleiben muss, wäre das der falsche
 * Posten. Und es wären zwangsläufig beide, weil zur Bauzeit niemand
 * weiss, welche Sprache ein Besucher mitbringt.
 *
 * Aufgelöst wird deshalb auf dem Server, und über die Grenze geht nur
 * das Ergebnis: ein flaches Objekt aus Zeichenketten. Die Wörterbücher
 * bleiben vollständig serverseitig.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum überhaupt ein Context und nicht durchgehend Props
 * ─────────────────────────────────────────────────────────────────────
 *
 * Props sind der Normalfall in diesem Projekt und bleiben es: was eine
 * Insel an eigenen Beschriftungen braucht, reicht ihr Server-Elternteil
 * herein — so wie `site-header.tsx` es mit `mobile-menu.tsx` hält.
 *
 * Zwei Textsorten sperren sich dagegen, und für die ist der Context da:
 *
 *   · **Fehlergrenzen.** `error.tsx` bekommt von React genau zwei Props,
 *     `error` und `reset`. Ein dritter lässt sich nicht hineinreichen —
 *     wohl aber ein Context, denn die Grenze rendert als Kind ihres
 *     Layouts.
 *   · **Validierungsmeldungen.** Sie sind querschnittlich: `pruefeFeld()`
 *     braucht sie in jedem Formular. Durch alle Formular-Inseln
 *     durchgereicht wären das dutzende gleichlautende Props, die nichts
 *     über die jeweilige Seite aussagen.
 *
 * `global-error.tsx` erreicht dieser Context bewusst nicht: es ersetzt
 * das Root-Layout und damit auch den Provider. Der Fall ist dort
 * gesondert gelöst und begründet.
 */

export type KlientTexte = {
  /**
   * Die aktive Sprache als Code — **kein Text, sondern ein Schlüssel für
   * `Intl`**.
   *
   * Damit formatiert eine Client-Insel Datums-, Zahl- und Währungswerte
   * korrekt, ohne dass dafür ein einziger String über die Grenze müsste.
   * Der Datumswähler holt sich seine Monats- und Wochentagsnamen so
   * (`monatsnamen(locale)` in `src/lib/dashboard/kalender.ts`); zwölf
   * Monatsnamen in der RSC-Nutzlast **jeder** Seite mit einem Datumsfeld
   * wären der schlechtere Handel, und `Intl` steht im Browser ohnehin
   * bereit.
   *
   * Ein Code ist ausdrücklich kein Wörterbuch: er lädt nichts nach und
   * hebelt die Regel oben nicht aus.
   */
  locale: Locale;
  /**
   * Beschriftungen der geteilten Formular-Bausteine (`SelectFeld`,
   * `DatumWahl`).
   *
   * Dritter querschnittlicher Block aus demselben Grund wie
   * `validierung`: es sind wiederverwendete Bedienelemente, deren
   * Beschriftungen nichts über die jeweilige Seite aussagen. Durch jedes
   * Server-Elternteil einzeln durchgereicht wären es dutzende
   * gleichlautende Props ohne Aussage.
   */
  formular: Dictionary["formular"];
  /**
   * Fehlergrenzen — `error.tsx` auf beiden Ebenen.
   *
   * Fest getippt und nicht als `Textblock`: die Grenzen greifen auf
   * benannte Felder zu (`fehlerTitel`, `erneutVersuchen`), und ein
   * Vertipper soll den Typecheck brechen statt leeren Text zu rendern.
   */
  fehler: Dictionary["fehler"];
  /**
   * Meldungen der Zod-Schemata.
   *
   * Hier umgekehrt bewusst lose: `loeseMeldung()` schlägt zur Laufzeit
   * über einen String nach, der aus dem Schema kommt. Eine feste Typung
   * brächte hier nichts, weil der Schlüssel ohnehin erst zur Laufzeit
   * feststeht — geprüft wird er dafür an seiner Quelle, über
   * `ValidierungsSchluessel` in `src/lib/validierung.ts`.
   */
  validierung: Textblock;
};

const SprachContext = createContext<KlientTexte | null>(null);

export function SprachProvider({
  texte,
  children,
}: {
  texte: KlientTexte;
  children: ReactNode;
}) {
  return <SprachContext.Provider value={texte}>{children}</SprachContext.Provider>;
}

/**
 * Wirft, wenn kein Provider darüber steht.
 *
 * Ein stiller Rückfall auf Deutsch wäre hier die schlechtere Wahl: er
 * sähe im Test richtig aus und wäre erst in Produktion und erst auf
 * Englisch falsch. Eine fehlende Klammer soll beim ersten Aufruf
 * auffallen, nicht beim ersten englischen Nutzer.
 */
export function useKlientTexte(): KlientTexte {
  const texte = useContext(SprachContext);
  if (texte === null) {
    throw new Error(
      "useKlientTexte() ohne <SprachProvider> — das Layout über dieser Komponente muss ihn rendern.",
    );
  }
  return texte;
}
