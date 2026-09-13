import Link from "next/link";

import { Container } from "@/components/container";

/**
 * Nicht gefunden — innerhalb des Dashboards.
 *
 * Eigene Datei, damit der Weg zurück ins Dashboard führt und nicht auf
 * die Startseite: wer hier landet, arbeitet gerade und hat sich nicht
 * verlaufen.
 *
 * Der häufigste Fall ist keine falsche Adresse, sondern eine Schicht,
 * die es nicht gibt **oder** die nicht gezeigt werden darf.
 * `schicht_ansehen` unterscheidet das bewusst nicht — täte es das,
 * verriete schon die Fehlermeldung, dass eine fremde Schicht existiert.
 * Der Text hier muss also beides abdecken, ohne sich festzulegen.
 */
export default function DashboardNichtGefunden() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">Nichts gefunden</h1>

        <p className="mt-4 text-base leading-relaxed text-muted">
          Diese Seite gibt es nicht — oder sie gehört zu etwas, das du nicht sehen
          darfst. Bei einer Schicht heisst das meistens: sie wurde inzwischen
          gelöscht, sie gehört zu einem anderen Betrieb, oder dein Betrieb zeigt
          Schichten ohne dich nicht an.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/kalender"
            className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            Zum Kalender
          </Link>
          <Link
            href="/dashboard"
            className="rounded-blk border border-line px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-sunk"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    </Container>
  );
}
