"use client";

import type { Abrechnung } from "@/lib/site";

/**
 * Der Monatlich/Jährlich-Umschalter der Preisseiten (Jahresabo seit dem
 * 2026-09-17).
 *
 * Ein **kontrolliertes** Bauteil ohne eigenen Zustand: die Wahl hält das
 * umgebende Karten-Bauteil, damit Umschalter und Preise garantiert dasselbe
 * Intervall zeigen. Zwei echte Knöpfe statt eines `<select>` — dieselbe
 * Begründung wie beim Sprachumschalter (`src/components/sprach-wahl.tsx`):
 * zwei Optionen sind zwei Knöpfe, und `aria-pressed` sagt der
 * Bildschirmleser­stimme, welche gerade gilt.
 *
 * `variante` trägt die zwei Farbwelten der Seiten: `dunkel` für die
 * Landing-Bühne (CSS-Variablen `--qt-c-*`), `hell` für `/preise` (die
 * semantischen Tokens `surface`/`line`/`signal`). Eine Variante für beide
 * gäbe es nicht — die dunkle Sektion nutzt bewusst nicht die hellen Tokens.
 */
export function AbrechnungUmschalter({
  wert,
  beiWechsel,
  monatlich,
  jaehrlich,
  vorteil,
  variante,
}: {
  wert: Abrechnung;
  beiWechsel: (intervall: Abrechnung) => void;
  monatlich: string;
  jaehrlich: string;
  /** Kleiner Hinweis am „Jährlich"-Knopf, z. B. „2 Monate geschenkt". */
  vorteil: string;
  variante: "hell" | "dunkel";
}) {
  const dunkel = variante === "dunkel";

  const gruppe = dunkel
    ? "inline-flex items-center gap-1 rounded-full p-1"
    : "inline-flex items-center gap-1 rounded-blk border border-line p-1";
  const gruppeStil = dunkel
    ? {
        background: "var(--qt-c-graphite)",
        border: "1px solid color-mix(in oklab, var(--qt-c-bone) 12%, transparent)",
      }
    : undefined;

  function knopf(intervall: Abrechnung, beschriftung: string) {
    const aktiv = wert === intervall;
    const basis =
      "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors touch-manipulation";

    if (dunkel) {
      return (
        <button
          type="button"
          aria-pressed={aktiv}
          onClick={() => beiWechsel(intervall)}
          className={basis}
          style={
            aktiv
              ? { background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }
              : { color: "color-mix(in oklab, var(--qt-c-bone) 70%, transparent)" }
          }
        >
          {beschriftung}
        </button>
      );
    }

    return (
      <button
        type="button"
        aria-pressed={aktiv}
        onClick={() => beiWechsel(intervall)}
        className={
          aktiv
            ? `${basis} bg-signal text-signal-ink`
            : `${basis} text-muted hover:text-text`
        }
      >
        {beschriftung}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className={gruppe} style={gruppeStil} role="group" aria-label={`${monatlich} / ${jaehrlich}`}>
        {knopf("monat", monatlich)}
        {knopf("jahr", jaehrlich)}
      </div>

      <span
        className={
          dunkel
            ? "rounded-full px-3 py-1 text-xs font-semibold"
            : "rounded-full bg-signal-weak px-3 py-1 text-xs font-semibold text-text"
        }
        style={
          dunkel
            ? {
                background: "color-mix(in oklab, var(--qt-c-bronze) 22%, transparent)",
                color: "var(--qt-c-bronze-hi)",
              }
            : undefined
        }
      >
        {vorteil}
      </span>
    </div>
  );
}
