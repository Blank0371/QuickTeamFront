"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useKlientTexte } from "@/i18n/sprach-provider";
import {
  alsDatum,
  baueRaster,
  monatsnamen,
  wochentageKurz,
  wochentageLang,
} from "@/lib/dashboard/kalender";

/**
 * Datumsfeld mit eigenem Monatsraster statt `<input type="date">`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum überhaupt ersetzt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das native Feld bringt seine eigene Schrift, seinen eigenen Rahmen,
 * sein eigenes Kalendersymbol und seinen eigenen Auswahldialog mit —
 * keines davon lässt sich an die Palette angleichen, und im leeren
 * Zustand steht dort wörtlich „tt.mm.jjjj". Auf einer Seite mit drei
 * solchen Feldern nebeneinander war das der auffälligste Bruch im
 * ganzen Dashboard.
 *
 * **Das Raster kommt aus `baueRaster()`**, derselben Funktion, die den
 * Kalender unter `/dashboard/kalender` zeichnet. Das ist der Punkt:
 * kein zweites Datumsmodell, keine zweite Wochentagskonvention. Die
 * Woche beginnt hier am Montag, weil sie es dort tut, und wenn jemand
 * diese Konvention je ändert, ändert sie sich an einer Stelle.
 *
 * **Keine Bibliothek.** `react-day-picker` — was shadcn/ui für seinen
 * Calendar benutzt — wäre eine neue Abhängigkeit für eine Aufgabe, für
 * die dieses Projekt die Bausteine schon hat: ein Monatsraster und ein
 * Popover.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Wie der Wert beim Server ankommt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Über ein `<input type="hidden">` mit `YYYY-MM-DD` — genau das Format,
 * das ein natives Datumsfeld geliefert hat. Die Server Action bleibt
 * deshalb unverändert; sie prüft weiterhin gegen `DATUM` und meldet
 * „Der Beginn fehlt." bei leerem Wert. Die Prüfung liegt damit
 * unverändert auf dem Server, nicht in diesem Bauteil.
 *
 * **Ohne JavaScript ist dieses Feld nicht bedienbar** — das native war
 * es. Das Formular darum herum wird ohnehin über eine Server Action
 * abgeschickt und braucht JavaScript bereits; hier geht also nichts
 * verloren, was vorher funktioniert hätte.
 */

/** `YYYY-MM-DD` zu `DD.MM.YYYY`. Leerer Wert bleibt leer. */
function anzeige(wert: string): string {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert);
  if (!treffer) return "";
  return `${treffer[3]}.${treffer[2]}.${treffer[1]}`;
}

/** Ausgangsmonat des Rasters: der gewählte Tag, sonst der laufende. */
function startMonat(wert: string): { jahr: number; monat: number } {
  const treffer = /^(\d{4})-(\d{2})/.exec(wert);
  if (treffer) return { jahr: Number(treffer[1]), monat: Number(treffer[2]) };
  const heute = new Date();
  return { jahr: heute.getFullYear(), monat: heute.getMonth() + 1 };
}

export function DatumWahl({
  name,
  label,
  defaultValue = "",
  platzhalter,
  hinweis,
  fehler,
  loeschbar = false,
  min,
  max,
  className = "",
  onChange,
}: {
  name: string;
  label: ReactNode;
  /** `YYYY-MM-DD`. */
  defaultValue?: string;
  /** Ohne Angabe „Datum wählen" in der aktiven Sprache. */
  platzhalter?: string;
  hinweis?: ReactNode;
  fehler?: string;
  /** Optionale Felder bekommen ein „Leeren" — Pflichtfelder nicht. */
  loeschbar?: boolean;
  /**
   * Grenzen wie beim nativen Feld, `YYYY-MM-DD`. Tage ausserhalb sind
   * nicht anklickbar. Der Zeichenkettenvergleich genügt, weil das
   * Format von links nach rechts an Bedeutung verliert — dieselbe
   * Eigenschaft, auf der `ende <= start` in den Server Actions beruht.
   */
  min?: string;
  max?: string;
  className?: string;
  /** Meldet jede Wahl sofort — für Ansichten, die ohne Absenden reagieren. */
  onChange?: (wert: string) => void;
}) {
  const { locale, formular: ft } = useKlientTexte();

  /*
   * Monats- und Wochentagsnamen aus `Intl`, abgeleitet aus der Locale im
   * Context. Sie stehen bewusst in keinem Wörterbuch — die Begründung
   * steht an `monatsnamen()` in `src/lib/dashboard/kalender.ts`.
   */
  const MONATE = monatsnamen(locale);
  const TAGE_KURZ = wochentageKurz(locale);
  const TAGE_LANG = wochentageLang(locale);

  const [wert, setWertIntern] = useState(defaultValue);
  const setWert = (neu: string) => {
    setWertIntern(neu);
    onChange?.(neu);
  };
  const [offen, setOffen] = useState(false);
  const [sicht, setSicht] = useState(() => startMonat(defaultValue));

  const hinweisId = hinweis ? `${name}-hinweis` : undefined;
  const fehlerId = fehler ? `${name}-fehler` : undefined;
  const beschreibung = [hinweisId, fehlerId].filter(Boolean).join(" ") || undefined;

  /*
   * `new Date()` steht hier und nicht im Modulkopf: das Raster entsteht
   * erst, wenn das Popover offen ist — also nach einem Klick und damit
   * ausschliesslich im Browser. Beim Vorab-Rendern auf dem Server läuft
   * die Rasterberechnung nie, ein Unterschied zwischen Server- und
   * Browserdatum kann also keinen Hydrations-Konflikt auslösen.
   */
  const heute = new Date();
  const heuteIso = alsDatum(
    heute.getFullYear(),
    heute.getMonth() + 1,
    heute.getDate(),
  );
  const raster = baueRaster(sicht.jahr, sicht.monat, heute);

  const verschiebe = (um: number) => {
    const d = new Date(sicht.jahr, sicht.monat - 1 + um, 1);
    setSicht({ jahr: d.getFullYear(), monat: d.getMonth() + 1 });
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-text">{label}</span>

      <input type="hidden" name={name} value={wert} />

      <Popover open={offen} onOpenChange={setOffen}>
        <PopoverTrigger
          aria-describedby={beschreibung}
          aria-invalid={fehler ? true : undefined}
          className={`flex w-full items-center justify-between gap-2 rounded-blk border bg-bg px-4 py-2.5 text-left text-text transition-colors hover:border-line-control ${
            fehler ? "border-stop" : "border-line-strong"
          }`}
        >
          <span className={wert ? "" : "text-muted"}>
            {wert ? anzeige(wert) : (platzhalter ?? ft.datumWaehlen)}
          </span>
          <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => verschiebe(-1)}
              className="flex size-8 items-center justify-center rounded-blk border border-line text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">{ft.vorherigerMonat}</span>
            </button>

            <p aria-live="polite" className="font-display text-sm font-bold text-text">
              {MONATE[sicht.monat - 1]} {sicht.jahr}
            </p>

            <button
              type="button"
              onClick={() => verschiebe(1)}
              className="flex size-8 items-center justify-center rounded-blk border border-line text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
              <span className="sr-only">{ft.naechsterMonat}</span>
            </button>
          </div>

          <table className="mt-3 border-collapse">
            <caption className="sr-only">
              {MONATE[sicht.monat - 1]} {sicht.jahr}, {ft.wochenBeginn}
            </caption>
            <thead>
              <tr>
                {TAGE_KURZ.map((kurz, i) => (
                  <th
                    key={kurz}
                    scope="col"
                    className="px-0.5 pb-1 text-center font-display text-[0.625rem] font-bold uppercase tracking-wider text-muted"
                  >
                    <abbr title={TAGE_LANG[i]} className="no-underline">
                      {kurz}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raster.wochen.map((woche) => (
                <tr key={woche[0]?.datum}>
                  {woche.map((zelle) => {
                    const gewaehlt = zelle.datum === wert;
                    const gesperrt =
                      (min !== undefined && zelle.datum < min) ||
                      (max !== undefined && zelle.datum > max);

                    return (
                      <td key={zelle.datum} className="p-0.5">
                        <button
                          type="button"
                          disabled={gesperrt}
                          onClick={() => {
                            setWert(zelle.datum);
                            setOffen(false);
                          }}
                          aria-pressed={gewaehlt}
                          className={`flex size-8 items-center justify-center rounded-blk border text-sm tabular-nums transition-colors ${
                            gesperrt
                              ? "cursor-not-allowed border-transparent text-muted/50"
                              : gewaehlt
                                ? "border-signal bg-signal text-signal-ink"
                                : zelle.istHeute
                                  ? "border-signal/60 bg-signal-weak text-text"
                                  : zelle.imMonat
                                    ? "border-transparent text-text hover:border-line-control hover:bg-surface-sunk"
                                    : "border-transparent text-muted hover:border-line hover:bg-surface-sunk"
                          }`}
                        >
                          <time dateTime={zelle.datum}>{zelle.tag}</time>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
            {/*
              „Heute" nur, wenn heute überhaupt erlaubt ist. Bei einem
              Feld, das ausdrücklich in der Zukunft liegen muss, wäre der
              Knopf sonst eine Abkürzung in einen ungültigen Wert.
            */}
            {(min === undefined || heuteIso >= min) &&
            (max === undefined || heuteIso <= max) ? (
              <button
                type="button"
                onClick={() => {
                  setWert(heuteIso);
                  setOffen(false);
                }}
                className="rounded-blk px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-text"
              >
                Heute
              </button>
            ) : (
              <span />
            )}

            {loeschbar && wert ? (
              <button
                type="button"
                onClick={() => {
                  setWert("");
                  setOffen(false);
                }}
                className="flex items-center gap-1 rounded-blk px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-text"
              >
                <X className="size-3.5" aria-hidden="true" />
                {ft.leeren}
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {hinweis ? (
        <span id={hinweisId} className="text-xs leading-relaxed text-muted">
          {hinweis}
        </span>
      ) : null}

      {fehler ? (
        <span id={fehlerId} className="text-xs text-stop">
          {fehler}
        </span>
      ) : null}
    </div>
  );
}
