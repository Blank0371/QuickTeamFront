import type { ReactNode } from "react";

import { Container } from "@/components/container";

/**
 * Gerüst für alle Seiten dieser Session. Liefert genau ein `<h1>`, einen
 * Lead-Absatz und eine sichtbare Liste dessen, was hier noch entsteht —
 * damit `curl` auf jede Route echten Text findet und niemand rät, ob eine
 * Seite fertig ist.
 */
export function PlatzhalterSeite({
  kicker,
  titel,
  lead,
  offen,
  hinweis,
  children,
}: {
  kicker: string;
  titel: string;
  lead: string;
  offen: readonly string[];
  hinweis?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Container className="py-14 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">{kicker}</p>

      <h1 className="mt-3 max-w-3xl text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
        {titel}
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{lead}</p>

      {hinweis ? (
        <div className="mt-8 max-w-2xl rounded-card border border-line bg-signal-weak p-5 text-sm leading-relaxed text-text">
          {hinweis}
        </div>
      ) : null}

      <section className="mt-12 max-w-2xl rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Baustand
        </h2>
        <p className="mt-3 text-sm text-muted">
          Diese Route steht als Gerüst. Es fehlt noch:
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {offen.map((eintrag) => (
            <li key={eintrag} className="flex items-start gap-3 text-sm text-text">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-schicht"
              />
              <span>{eintrag}</span>
            </li>
          ))}
        </ul>
      </section>

      {children}
    </Container>
  );
}
