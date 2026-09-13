import type { ReactNode } from "react";

import { Container } from "@/components/container";

/**
 * Gemeinsamer Rahmen aller Auth-Seiten: schmale Spalte, genau ein `<h1>`,
 * darunter die Karte mit dem Formular. Auf dem Handy fällt die Karte auf
 * volle Breite zurück.
 */
export function AuthRahmen({
  kicker,
  titel,
  lead,
  children,
  fuss,
}: {
  kicker: string;
  titel: string;
  lead: string;
  children: ReactNode;
  /** Querverweise unter der Karte, z. B. auf Login oder Registrierung. */
  fuss?: ReactNode;
}) {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">{kicker}</p>

        <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">{titel}</h1>

        <p className="mt-4 text-base leading-relaxed text-muted">{lead}</p>

        <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          {children}
        </div>

        {fuss ? <div className="mt-6 text-sm text-muted">{fuss}</div> : null}
      </div>
    </Container>
  );
}
