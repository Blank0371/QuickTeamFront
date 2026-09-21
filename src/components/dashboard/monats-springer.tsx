"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Sprung auf einen beliebigen Monat.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was hier vorher stand, und warum es weg ist
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ein GET-Formular mit nativem `<select>` und einem eigenen
 * „Anzeigen"-Knopf. Das war ohne JavaScript bedienbar — ein echtes
 * Argument, das hier ausdrücklich dokumentiert war —, sah aber aus wie
 * ein Fremdkörper: das native Auswahlfeld bringt Systemschrift,
 * Systemrahmen und Systempfeil mit, und keines davon lässt sich an die
 * Palette angleichen. Dazu kam die Bedienung: **zwei** Handgriffe für
 * einen Sprung, weil die Auswahl allein nichts tat.
 *
 * Ersetzt durch dasselbe Popover, das im Monatsraster schon die
 * Tagesdetails trägt (`TagesDetail`) — kein neues Bauteil, kein zweites
 * Muster. Ein Klick öffnet, ein Klick springt.
 *
 * **Was das kostet, offen benannt:** ohne JavaScript öffnet dieses
 * Popover nicht, der Sprung ist dann nicht verfügbar. Der Kalender
 * bleibt trotzdem vollständig navigierbar — Vor, Zurück und „Heute"
 * sind weiterhin gewöhnliche Links, und der Monat steht weiterhin in
 * der Adresse. Verloren geht die Abkürzung, nicht der Weg.
 *
 * Die Ziele sind echte Links auf `?monat=YYYY-MM`, keine
 * Skript-Navigation: die Ansicht bleibt damit teilbar, und Mittelklick
 * oder „in neuem Tab öffnen" funktionieren wie überall sonst.
 */
export function MonatsSpringer({
  jahr,
  monat,
  ziel,
  monate,
  waehlenLabel,
  vorJahrLabel,
  nachJahrLabel,
}: {
  jahr: number;
  monat: number;
  /** Route, auf der das Ergebnis landet — `/dashboard/kalender`. */
  ziel: string;
  /** Monatsnamen der aktiven Sprache (`monatsnamen(locale)`). */
  monate: string[];
  waehlenLabel: string;
  vorJahrLabel: string;
  nachJahrLabel: string;
}) {
  const [offen, setOffen] = useState(false);
  /*
   * Das Jahr im Popover ist unabhängig vom angezeigten Monat: wer im
   * September 2026 steht und den Februar 2027 sucht, blättert erst das
   * Jahr weiter und wählt dann den Monat. Beim Schliessen fällt die
   * Ansicht auf das laufende Jahr zurück — sonst stünde beim nächsten
   * Öffnen ein Jahr da, das mit dem Kalender darunter nichts zu tun hat.
   */
  const [sichtJahr, setSichtJahr] = useState(jahr);

  return (
    <Popover
      open={offen}
      onOpenChange={(o) => {
        setOffen(o);
        if (!o) setSichtJahr(jahr);
      }}
    >
      <PopoverTrigger className="flex h-11 items-center gap-1.5 rounded-blk border border-line px-3 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal sm:h-9">
        <span>
          {monate[monat - 1]} {jahr}
        </span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{waehlenLabel}</span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto border-line bg-surface p-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSichtJahr((j) => j - 1)}
            className="flex size-8 items-center justify-center rounded-blk border border-line text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="sr-only">{vorJahrLabel}</span>
          </button>

          <p aria-live="polite" className="font-display text-sm font-bold text-text">
            {sichtJahr}
          </p>

          <button
            type="button"
            onClick={() => setSichtJahr((j) => j + 1)}
            className="flex size-8 items-center justify-center rounded-blk border border-line text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="sr-only">{nachJahrLabel}</span>
          </button>
        </div>

        <ul className="mt-3 grid grid-cols-3 gap-1.5">
          {monate.map((name, i) => {
            const wert = `${sichtJahr}-${String(i + 1).padStart(2, "0")}`;
            const aktiv = sichtJahr === jahr && i + 1 === monat;

            return (
              <li key={wert}>
                <Link
                  href={`${ziel}?monat=${wert}`}
                  /*
                   * Kein Prefetch: zwölf Links auf einmal hiessen zwölf
                   * RSC-Anfragen, sobald das Popover aufgeht — für einen,
                   * den am Ende jemand anklickt.
                   */
                  prefetch={false}
                  onClick={() => setOffen(false)}
                  aria-current={aktiv ? "page" : undefined}
                  className={`flex h-9 items-center justify-center rounded-blk border px-2 text-sm font-medium transition-colors ${
                    aktiv
                      ? "border-signal bg-signal text-signal-ink"
                      : "border-transparent text-text hover:border-line-control hover:bg-surface-sunk"
                  }`}
                >
                  {name.slice(0, 3)}
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
