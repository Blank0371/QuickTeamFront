import type { Metadata } from "next";

import { RechtsDokument } from "@/components/rechtsdokument";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description:
    "Vertragsbedingungen für die Nutzung von QuickTeam: Vertragsschluss, Leistungsumfang, Testphase, Entgelte, Laufzeit und Kündigung.",
  alternates: { canonical: "/agb" },
};

/**
 * AGB — gerendert aus `docs/rechtliches/legals/`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was hier vorher stand
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-10 war diese Seite eine **Gliederung**: zwölf
 * Überschriften, darunter jeweils ein `<PH>`-Platzhalter mit dem Hinweis,
 * was hineingehört, und ein `EntwurfsHinweis` darüber. Das war richtig,
 * solange es keinen Text gab — eine erfundene Klausel wäre schlimmer als
 * eine sichtbare Lücke.
 *
 * Jetzt gibt es einen: fünfzehn ausformulierte Paragraphen,
 * platzhalterfrei, mit englischer Fassung daneben. Der Platzhalter-Weg
 * hat damit seinen Zweck erfüllt und geht weg.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Nicht weg ist der Vorbehalt — er steht nur woanders
 * ─────────────────────────────────────────────────────────────────────
 *
 * `docs/rechtliches/legals/README.md` bezeichnet alle vier Dokumente
 * ausdrücklich als **„pre-lawyer drafts"**. Damit bleibt die Bedingung
 * aus `CLAUDE.md` unerfüllt: die Soft-Launch-Sperre fällt, wenn die
 * Rechtstexte final sind, und das sind sie nicht. `SOFT_LAUNCH` wird von
 * hier aus **nicht** angefasst.
 *
 * Ein sichtbarer „Entwurf"-Kasten steht trotzdem nicht mehr über dem
 * Text, und das ist eine bewusste Unterscheidung: er sagte „hier steht
 * nur die Gliederung, der Fliesstext ist noch zu verfassen". Das träfe
 * jetzt nicht mehr zu und würde einen fertigen Vertragstext
 * kleinreden. Dass er noch nicht anwaltlich geprüft ist, ist eine Frage
 * an den Betreiber vor dem Launch — nicht ein Hinweis an Besucher einer
 * Seite, auf der sich ohnehin niemand registrieren kann.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die deutsche Fassung ist die verbindliche
 * ─────────────────────────────────────────────────────────────────────
 *
 * § 14 Abs. 6 der AGB legt das fest; die englische ist eine
 * Übersetzung zur Information. Das steht im Dokument selbst und wird
 * hier nicht zusätzlich behauptet — eine zweite Stelle für dieselbe
 * Aussage ist eine Stelle, an der sie veralten kann.
 */
export default function AgbSeite() {
  return (
    <RechtsDokument
      dateien={{
        de: "legals/AGB-QuickTeam-de.md",
        en: "legals/Terms-QuickTeam-en.md",
      }}
      titel={{
        de: "Allgemeine Geschäftsbedingungen",
        en: "General Terms and Conditions",
      }}
    />
  );
}
