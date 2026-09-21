"use client";

import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Ein Tag im Raster, aufklappbar.
 *
 * Bis hierher zeigte eine Zelle nur Uhrzeit und Bezeichnung; **wer
 * arbeitet, stand ausschliesslich in der Handy-Liste** — `Besetzung`
 * wurde im Raster gar nicht gerendert. Genau das ist der Grund, warum
 * die Ansicht statisch wirkte: die eigentliche Auskunft eines
 * Dienstplans war auf dem grossen Bildschirm nicht zu bekommen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum der Inhalt hier durchgereicht und nicht geladen wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * `children` kommt fertig gerendert aus der Server Component. Das ist
 * das eine Muster, das beides erhält: die Zelle bleibt serverseitig
 * gerendert und im HTML lesbar, und trotzdem öffnet sich das Detail
 * ohne Seitenwechsel. Die Alternative — die Schichtdaten als Props
 * hereinreichen und hier zusammenbauen — würde denselben Datensatz ein
 * zweites Mal durch die Leitung schicken und diese Komponente zur
 * Darstellungslogik machen, die sie nicht sein soll.
 *
 * Nur Tage **mit** Schichten bekommen das Aufklappen. Ein leerer Tag
 * hätte nichts zu zeigen, und 42 Radix-Instanzen je Monat für lauter
 * leere Kästen wären bezahltes Nichts.
 */
export function TagesDetail({
  tag,
  datum,
  titel,
  anzeigenLabel,
  istHeute,
  imMonat,
  versteckt = 0,
  children,
}: {
  tag: number;
  /** `YYYY-MM-DD` für das `datetime`-Attribut. */
  datum: string;
  /** „Samstag, 29. August" — die Überschrift im aufgeklappten Feld. */
  titel: string;
  /** Fertig gebautes aria-label, sprachabhängig im Server-Elternteil. */
  anzeigenLabel: string;
  istHeute: boolean;
  imMonat: boolean;
  /**
   * Wie viele Schichten die Zelle nicht mehr zeigt (`SICHTBARE_KACHELN`).
   *
   * Die Zahl steht **im Auslöser** und nicht als eigene Zeile unter den
   * Kacheln, und das ist keine Platzfrage. Radix erlaubt je Popover
   * genau einen Trigger; ein zweiter Auslöser hiesse ein zweites
   * `<Popover>` mit demselben `children` — und `children` ist hier
   * fertig gerendertes RSC-Markup, das dann doppelt in der Nutzlast
   * jeder Seite läge. Dieselbe Rechnung wie beim doppelten `SchichtChip`
   * (siehe `monats-raster.tsx`), nur teurer, weil die Namen mit
   * drinstehen.
   *
   * Der Auslöser ist ohnehin das richtige Ziel: aufgeklappt steht dort
   * der **ganze** Tag, nicht nur der abgeschnittene Rest.
   */
  versteckt?: number;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={`inline-flex h-6 items-center gap-1 rounded-blk px-1 text-xs font-semibold transition-colors hover:bg-signal-weak hover:text-signal ${
          istHeute
            ? "bg-signal text-signal-ink hover:bg-signal hover:text-signal-ink"
            : imMonat
              ? "text-text"
              : /* siehe `monats-raster.tsx`: Deckkraft statt Ton kostete
                   den Kontrast, ohne fuer die Daempfung noetig zu sein. */
                "text-muted"
        }`}
        aria-label={anzeigenLabel}
      >
        <time dateTime={datum}>{tag}</time>
        {versteckt > 0 ? (
          /*
           * `text-current` mit Deckkraft statt `text-muted`: am heutigen
           * Tag sitzt der Auslöser auf `bg-signal`, und ein gedämpftes
           * Grau darauf war praktisch nicht zu lesen. So folgt die Zahl
           * immer der Schriftfarbe ihres Auslösers — hell auf Bronze,
           * dunkel auf der Karte.
           */
          <span className="font-mono text-[0.625rem] font-normal opacity-70">
            +{versteckt}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] border-line bg-surface p-4"
      >
        <h3 className="font-display text-sm font-bold text-text">{titel}</h3>
        <div className="mt-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
