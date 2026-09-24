"use client";

import { Printer } from "lucide-react";

/**
 * Der einzige Grund, warum die Druckseite überhaupt eine Client-Insel hat:
 * `window.print()` gibt es nur im Browser.
 *
 * Bewusst so klein: alles andere auf der Seite — Zeitraumwahl, Blättern, der
 * CSV-Download — sind gewöhnliche Links und laufen ohne JavaScript. Bliebe
 * der Knopf ohne JavaScript wirkungslos, verliert niemand etwas: der Browser
 * druckt auch über sein eigenes Menü, und der Ausdruck sieht genauso aus.
 */
export function DruckKnopf({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-blk border border-signal bg-signal-weak px-3 sm:h-9 sm:flex-none text-sm font-medium text-signal transition-colors hover:bg-signal hover:text-signal-ink"
    >
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
