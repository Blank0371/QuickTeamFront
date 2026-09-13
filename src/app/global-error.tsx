"use client";

import { useEffect, useState } from "react";

import "./globals.css";

/**
 * Greift nur, wenn das Root-Layout selbst scheitert. Ersetzt dann das
 * gesamte Dokument — deshalb eigenes `<html>` und `<body>` und keine
 * Abhängigkeit zu Header, Footer oder den Font-Variablen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Texte hier doppelt stehen statt aus dem Wörterbuch zu kommen
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Regel wie bei den Schriften, eine Ebene weiter: die Datei
 * springt genau dann ein, wenn das Root-Layout **nicht** gelaufen ist.
 * Damit gibt es weder `<SprachProvider>` — der steht in eben diesem
 * Layout — noch irgendetwas anderes, das der Server aufgelöst hätte.
 *
 * `getDictionary()` von hier aus aufzurufen ginge, zöge aber beide
 * vollständigen Wörterbücher ins Client-Bündel, für sechs Sätze. Das ist
 * derselbe Handel, den `sprach-provider.tsx` ausführlich ablehnt — und
 * ausgerechnet an der Stelle, die im Normalbetrieb nie rendert.
 *
 * Also stehen die paar Sätze hier, und zwar bewusst als Dopplung. Wer
 * `fehler.fehlerTitel` in `de.ts` ändert, muss hier nachziehen; das ist
 * der Preis dafür, dass diese Datei ohne alles auskommt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Sprache aus einem Effekt kommt und nicht sofort
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das Cookie ist ausdrücklich **nicht** `httpOnly` (siehe `sprache.ts`)
 * — ein Client-Skript darf es lesen. Gelesen wird es trotzdem erst nach
 * dem ersten Rendern: würde der erste Durchgang schon Englisch zeigen,
 * der servergerenderte HTML-Stand aber Deutsch, wäre das ein
 * Hydration-Mismatch auf einer Seite, die ohnehin schon einen schweren
 * Fehler meldet.
 *
 * Der Preis ist ein Bild lang Deutsch für englische Leser. Auf dieser
 * einen Seite ist das hinnehmbar; überall sonst löst der Server auf und
 * es gibt kein Aufblitzen.
 */

const TEXTE = {
  de: {
    kennzeichen: "Schwerer Fehler",
    titel: "Die Seite konnte nicht geladen werden",
    text: "Beim Aufbau der Seite ist etwas grundlegend schiefgelaufen. Lad die Seite neu — bleibt der Fehler bestehen, meld dich beim Support und gib die Kennung unten an.",
    kennung: "Kennung",
    erneut: "Erneut versuchen",
    start: "Zur Startseite",
  },
  en: {
    kennzeichen: "Fatal error",
    titel: "The page could not be loaded",
    text: "Something went fundamentally wrong while building this page. Reload it — if the error persists, get in touch with support and quote the reference below.",
    kennung: "Reference",
    erneut: "Try again",
    start: "Go to home page",
  },
} as const;

type Sprache = keyof typeof TEXTE;

function spracheAusCookie(): Sprache {
  const treffer = /(?:^|;\s*)qt_sprache=(de|en)(?:;|$)/u.exec(document.cookie);
  return treffer?.[1] === "en" ? "en" : "de";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [sprache, setSprache] = useState<Sprache>("de");
  const t = TEXTE[sprache];

  useEffect(() => {
    setSprache(spracheAusCookie());
  }, []);

  return (
    <html lang={sprache}>
      <body className="bg-bg text-text antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center px-5 py-20 sm:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-stop">
            {t.kennzeichen}
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            {t.titel}
          </h1>

          <p className="mt-5 max-w-xl leading-relaxed text-muted">{t.text}</p>

          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-muted">
              {t.kennung}: {error.digest}
            </p>
          ) : null}

          <div className="mt-9 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              {t.erneut}
            </button>
            <a
              href="/"
              className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
            >
              {t.start}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
