import type { ReactNode } from "react";

import { Container } from "@/components/container";
import { Fortschritt } from "@/components/einrichtung/fortschritt";
import type { Schritt, Stand } from "@/lib/einrichtung";

/**
 * Gemeinsamer Rahmen aller Stepper-Seiten: Fortschritt, genau ein `<h1>`,
 * darunter die Karte mit dem Inhalt des Schritts.
 *
 * Bewusst eine Komponente und kein `layout.tsx`. Ein Layout weiss auf dem
 * Server nicht, welcher Pfad gerade gerendert wird — es müsste also
 * entweder raten oder den Fortschritt an eine Client-Komponente abgeben.
 * So gibt jede Seite ihren Schritt selbst an, und der Balken bleibt
 * JavaScript-frei.
 */
export function SchrittRahmen({
  schritt,
  stand,
  titel,
  lead,
  children,
}: {
  schritt: Schritt;
  stand: Stand | null;
  titel: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Fortschritt aktuell={schritt} stand={stand} />

        <h1 className="text-3xl leading-[1.1] sm:text-4xl">{titel}</h1>

        <p className="mt-4 text-base leading-relaxed text-muted">{lead}</p>

        <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          {children}
        </div>
      </div>
    </Container>
  );
}

/**
 * Platzhalterinhalt für die Schritte, die noch entstehen. Sagt, was hier
 * hinkommt, statt eine leere Karte zu zeigen — `curl` auf die Route
 * liefert damit auch jetzt schon echten Text.
 */
export function NochNicht({ punkte }: { punkte: readonly string[] }) {
  return (
    <>
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Baustand
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Dieser Schritt ist als Gerüst da. Es fehlt noch:
      </p>
      <ul className="mt-5 flex flex-col gap-3">
        {punkte.map((punkt) => (
          <li key={punkt} className="flex items-start gap-3 text-sm text-text">
            <span
              aria-hidden="true"
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-schicht"
            />
            <span>{punkt}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
