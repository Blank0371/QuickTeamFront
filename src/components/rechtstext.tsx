import type { ReactNode } from "react";

import { Container } from "@/components/container";

/**
 * Kasten für einen Hinweis über dem Text.
 *
 * **Bis zum 2026-09-10 standen hier zwei weitere Bausteine:** `PH` für
 * einen markierten Platzhalter und `EntwurfsHinweis` für den Satz „diese
 * Seite enthält nur die Gliederung". Beide gab es, weil `/agb` eine
 * Gliederung mit Leerstellen war. Seit dort der ausformulierte
 * Vertragstext steht, hatten sie keinen Aufrufer mehr — und ein
 * Baustein, der „noch nicht veröffentlichungsreif" über einen fertigen
 * Vertrag setzen kann, ist schlimmer als kein Baustein.
 *
 * Geblieben ist der Kasten selbst, und er wird gebraucht: `/avv` trägt
 * damit den Hinweis, dass die eckigen Klammern im Vertragstext
 * kundenspezifische Angaben sind und kein Versehen.
 */
export function Hinweis({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div
      role="note"
      className="mt-8 max-w-2xl rounded-card border border-dashed border-schicht bg-surface p-5"
    >
      <h2 className="font-display text-sm font-bold text-text">{titel}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/**
 * Rahmen für Impressum, Datenschutz und AGB.
 *
 * `hinweis` ist bewusst ein Slot und kein `boolean`: die drei Seiten
 * stehen an unterschiedlichen Punkten, und ein Schalter „Entwurf ja/
 * nein" hätte die Datenschutzerklärung gezwungen, sich entweder als
 * blosse Gliederung auszugeben oder ganz ohne Vorbehalt dazustehen —
 * beides wäre unzutreffend.
 */
export function RechtstextSeite({
  titel,
  lead,
  hinweis,
  children,
}: {
  titel: string;
  lead: string;
  hinweis?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container className="py-14 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">Rechtliches</p>

      <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">{titel}</h1>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">{lead}</p>

      {hinweis}

      <div className="prose-qt mt-12">{children}</div>
    </Container>
  );
}
