import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ReactNode } from "react";

import { Container } from "@/components/container";
import { MarkdownText } from "@/components/markdown-text";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import type { Locale } from "@/i18n";

/**
 * Ein Rechtstext aus `docs/rechtliches/`, in der aktiven Sprache.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Sprache aus dem Cookie kommt und nicht mehr aus `?sprache=`
 * ─────────────────────────────────────────────────────────────────────
 *
 * `/datenschutz` trug bis hierher einen **eigenen** Umschalter als Link
 * mit `?sprache=en`. Die Begründung dafür stand in der Seite selbst: die
 * Locale-Struktur liefere „bis heute ausschliesslich `de` aus", ein
 * Präfix nur für zwei Rechtstexte wäre eine vorweggenommene
 * Routing-Entscheidung. Das stimmte — bis zum 2026-09-09.
 *
 * Seither gibt es `qt_sprache` und einen Umschalter in der Kopfzeile.
 * Zwei Umschalter auf derselben Seite, die sich nicht kennen, sind
 * schlimmer als einer: wer oben auf „EN" klickt, bekommt eine englische
 * Navigation um einen deutschen Rechtstext — und der zweite Schalter
 * daneben behauptet, die Seite sei deutsch. Der Rechtstext folgt deshalb
 * demselben Cookie wie alles andere, und der eigene Schalter entfällt.
 *
 * Die Abwägung zum Pfad-Präfix bleibt davon unberührt; sie steht
 * unverändert in `src/i18n/sprache.ts` und gilt für die ganze Seite.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Gelesen wird zur Laufzeit, nicht importiert
 * ─────────────────────────────────────────────────────────────────────
 *
 * Übernommen aus der bisherigen Datenschutz-Seite und weiterhin richtig:
 * ein `import` von Markdown bräuchte einen Loader, `readFile` braucht
 * nichts und hält die Datei ausserhalb des Bundles.
 * `outputFileTracingRoot` in `next.config.ts` steht bereits auf dem
 * Projektwurzelverzeichnis, damit `docs/` in der serverseitigen Funktion
 * landet. Ein Rechtstext gehört ausserdem in eine Datei, die der
 * Betreiber pflegen kann — sonst ist jede Fassungsänderung ein Deploy.
 */
export async function RechtsDokument({
  dateien,
  titel,
  hinweis,
}: {
  /** Dateiname je Sprache, relativ zu `docs/rechtliches/`. */
  dateien: Record<Locale, string>;
  /** Überschrift je Sprache. Steht nicht im Dokument, damit `<h1>` uns gehört. */
  titel: Record<Locale, string>;
  /**
   * Kasten über dem Text — ein Slot, kein `boolean`.
   *
   * Dieselbe Überlegung wie bei `RechtstextSeite`: die Dokumente stehen
   * an unterschiedlichen Punkten. AGB und Datenschutzerklärung sind
   * fertige Fassungen und brauchen nichts; der AVV ist eine Vorlage mit
   * kundenspezifischen Lücken und muss das sagen, bevor jemand die
   * eckigen Klammern für einen Fehler hält.
   */
  hinweis?: ReactNode;
}) {
  const sprache = await leseSprache();
  const t = await holeTexte();

  /*
   * Fehlt die Datei, steht das als Satz da statt als 500er. Ein
   * Rechtstext, der wegen eines Dateipfads eine Fehlerseite zeigt, ist
   * schlechter als einer, der sagt, dass er gerade nicht da ist.
   */
  let quelle: string | null = null;
  try {
    quelle = await readFile(
      path.join(process.cwd(), "docs", "rechtliches", dateien[sprache]),
      "utf8",
    );
  } catch (fehler) {
    console.error(`[rechtstext] ${dateien[sprache]}: ${String(fehler)}`);
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">
          {t.rechtliches.bereich}
        </p>

        <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">{titel[sprache]}</h1>

        {hinweis}

        <div className="mt-8">
          {quelle === null ? (
            <p className="text-sm leading-relaxed text-stop">{t.rechtliches.nichtAbrufbar}</p>
          ) : (
            <MarkdownText quelle={quelle} />
          )}
        </div>
      </div>
    </Container>
  );
}
