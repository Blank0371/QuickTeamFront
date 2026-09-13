import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  description:
    "Diese Adresse führt ins Leere. Über die Navigation kommst du zurück zur Startseite oder zu den Preisen.",
};

export default async function NichtGefunden() {
  const t = await holeTexte();

  return (
    <Container className="py-20 sm:py-28">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">Fehler 404</p>

      <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">{t.fehler.nichtGefundenTitel}</h1>

      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
        {t.fehler.nichtGefundenText}
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
        >
          {t.fehler.zurStartseite}
        </Link>
        <Link
          href="/preise"
          className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          Preise ansehen
        </Link>
        <Link
          href="/impressum"
          className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          Impressum
        </Link>
      </div>
    </Container>
  );
}
