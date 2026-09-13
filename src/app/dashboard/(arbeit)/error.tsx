"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Container } from "@/components/container";
import { useKlientTexte } from "@/i18n/sprach-provider";

/**
 * Fehlergrenze **innerhalb** der Dashboard-Schale.
 *
 * Bisher gab es unterhalb von `/dashboard` keine, und die Folge war
 * unangenehm: schlug eine einzige Abfrage fehl — `kalender_schichten`
 * etwa, oder eine der fünf auf der Übersicht —, fing das die Grenze im
 * Root-Layout ab. Die zeigt zwar eine ordentliche Fehlerseite, aber
 * eine **ohne Sidebar und ohne Kopfzeile**: wer einen Fehler im
 * Kalender bekam, stand plötzlich ausserhalb des Dashboards und musste
 * über die Startseite zurückfinden.
 *
 * Weil diese Datei in der Klammer-Gruppe liegt, bleibt `(arbeit)/
 * layout.tsx` darüber stehen. Navigation, Betriebsname und Abmelden
 * bleiben also da, und der Fehler betrifft sichtbar nur den Bereich, in
 * dem er entstanden ist.
 *
 * Zwei Wege heraus: `reset()` versucht dieselbe Seite noch einmal — bei
 * einer zeitweise gescheiterten Abfrage genügt das —, und der Weg zur
 * Übersicht führt in einen Bereich, der mit hoher Wahrscheinlichkeit
 * lädt. Ein Link zur Startseite steht hier bewusst **nicht**: das wäre
 * der Weg aus dem angemeldeten Bereich hinaus, und genau den soll diese
 * Grenze ja vermeiden.
 */
export default function DashboardFehler({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { fehler } = useKlientTexte();

  useEffect(() => {
    // In Produktion bleibt sonst nur die Digest-ID übrig.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-12 sm:py-16">
      <div className="w-full max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-stop">Fehler</p>

        <h1 className="mt-3 text-2xl leading-tight sm:text-3xl">
          {fehler.fehlerTitel}
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Dieser Bereich liess sich nicht laden. Die Anmeldung besteht weiter — du
          kannst es noch einmal versuchen oder in einen anderen Bereich wechseln.
        </p>

        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-muted">Kennung: {error.digest}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            {fehler.erneutVersuchen}
          </button>
          <Link
            href="/dashboard"
            className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    </Container>
  );
}
