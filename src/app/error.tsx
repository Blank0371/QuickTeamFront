"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Container } from "@/components/container";
import { useKlientTexte } from "@/i18n/sprach-provider";

/**
 * Fehlergrenze innerhalb des Root-Layouts — Header und Footer bleiben
 * stehen, der Weg zurück ist also immer sichtbar.
 */
export default function Fehler({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { fehler } = useKlientTexte();

  useEffect(() => {
    // Ohne Logging bleibt in Produktion nur die Digest-ID übrig.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-20 sm:py-28">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-stop">Fehler</p>

      <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">{fehler.fehlerTitel}</h1>

      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">{fehler.fehlerText}</p>

      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-muted">Kennung: {error.digest}</p>
      ) : null}

      <div className="mt-9 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
        >
          {fehler.erneutVersuchen}
        </button>
        <Link
          href="/"
          className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          {fehler.zurStartseite}
        </Link>
      </div>
    </Container>
  );
}
