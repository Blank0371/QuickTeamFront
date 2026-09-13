"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Uhrzeitfeld mit eigenem Raster statt `<input type="time">`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ersetzt — dieselbe Begründung wie bei `DatumWahl`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das native Feld bringt Schrift, Rahmen, Uhrsymbol und Auswahldialog
 * des Betriebssystems mit; keines davon lässt sich an die Palette
 * angleichen, und die Darstellung unterscheidet sich zwischen Firefox,
 * Safari und Chrome so stark, dass zwei Zeitfelder nebeneinander je nach
 * Browser verschieden hoch sind. Auf der Schichtseite stehen genau zwei
 * davon nebeneinander.
 *
 * **Keine Bibliothek für das Raster.** Radix hat keinen Zeitwähler, und
 * die verbreiteten Alternativen bringen entweder eine eigene
 * Datumsbibliothek mit oder ein Design, das nicht zur Palette passt. Was
 * hier gebraucht wird, sind zwei Spalten mit Knöpfen — dafür lohnt keine
 * Abhängigkeit. Das Popover selbst kommt von Radix, wie bei `DatumWahl`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Raster **und** Freitext, nicht das eine oder das andere
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das Raster deckt den Normalfall in zwei Klicks ab: volle und
 * Viertelstunden. Krumme Zeiten gibt es trotzdem — eine Übergabe um
 * 10:45, ein Küchenschluss um 22:20 —, und ein Raster, das sie nicht
 * zulässt, macht aus einem Sonderfall eine Sackgasse. Deshalb steht
 * unter dem Raster ein freies Feld, das jede gültige Uhrzeit annimmt.
 *
 * **Nachtschichten bleiben eingebbar.** Dieses Feld liefert nur eine
 * Uhrzeit; ob `22:00` vor oder nach `06:00` liegt, entscheidet die
 * Schicht, nicht der Wähler. `chk_instanz_zeiten_verschieden` in der
 * Datenbank verbietet ausschliesslich `start = end` — über Mitternacht
 * ist ausdrücklich erlaubt, und `schichtFelderSchema` prüft genau
 * dasselbe. Der Wähler kennt deshalb keine „Ende nach Beginn"-Regel und
 * darf keine bekommen.
 *
 * Der Wert reist über ein `<input type="hidden">` als `HH:MM` — dasselbe
 * Format, das die Server Action ohnehin erwartet, und damit
 * funktioniert das Feld auch dann, wenn das Popover nie geöffnet wird.
 */

/** Volle Stunden 00–23. */
const STUNDEN = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

/** Viertelstundenraster — der Normalfall im Dienstplan. */
const MINUTEN = ["00", "15", "30", "45"];

/** `HH:MM`, sonst `null`. Auch `H:M` und `HH.MM` werden angenommen. */
function lies(roh: string): string | null {
  const treffer = /^(\d{1,2})[:.]?(\d{2})$/u.exec(roh.trim());
  if (!treffer) return null;
  const stunde = Number(treffer[1]);
  const minute = Number(treffer[2]);
  if (stunde > 23 || minute > 59) return null;
  return `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function ZeitWahl({
  id,
  name,
  label,
  defaultValue,
  fehler,
  hinweis,
}: {
  id: string;
  name: string;
  label: string;
  /** `HH:MM` oder `HH:MM:SS` — Sekunden werden abgeschnitten. */
  defaultValue: string;
  fehler?: string;
  hinweis?: string;
}) {
  const start = defaultValue.slice(0, 5);
  const [wert, setWert] = useState(start);
  const [offen, setOffen] = useState(false);
  const [freitext, setFreitext] = useState(start);

  const [stunde, minute] = wert.split(":");

  function setzeTeil(neueStunde: string, neueMinute: string) {
    const neu = `${neueStunde}:${neueMinute}`;
    setWert(neu);
    setFreitext(neu);
  }

  function uebernimmFreitext() {
    const geprueft = lies(freitext);
    if (geprueft === null) {
      // Ungültig: auf den letzten guten Wert zurück, statt ihn zu leeren.
      setFreitext(wert);
      return;
    }
    setWert(geprueft);
    setFreitext(geprueft);
    setOffen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>

      {hinweis ? (
        <p id={`${id}-hinweis`} className="text-xs leading-relaxed text-muted">
          {hinweis}
        </p>
      ) : null}

      <input type="hidden" name={name} value={wert} />

      <Popover open={offen} onOpenChange={setOffen}>
        <PopoverTrigger
          id={id}
          type="button"
          aria-invalid={fehler ? true : undefined}
          aria-describedby={hinweis ? `${id}-hinweis` : undefined}
          className={`flex w-full items-center justify-between gap-2 rounded-blk border bg-surface px-3.5 py-2.5 text-left font-mono text-base text-text transition-colors hover:border-line-strong ${
            fehler ? "border-stop" : "border-line-strong"
          }`}
        >
          {wert}
          <Clock className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto border-line bg-surface p-3">
          <div className="flex gap-3">
            {/*
              Zwei scrollende Spalten statt eines langen Rasters aus 96
              Knöpfen: Stunde und Minute sind unabhängige Entscheidungen,
              und wer 17:30 sucht, sucht erst die 17.
            */}
            <Spalte
              titel="Stunde"
              werte={STUNDEN}
              aktiv={stunde ?? ""}
              beiWahl={(s) => setzeTeil(s, minute ?? "00")}
            />
            <Spalte
              titel="Minute"
              werte={MINUTEN}
              aktiv={minute ?? ""}
              beiWahl={(m) => setzeTeil(stunde ?? "00", m)}
            />
          </div>

          <div className="mt-3 border-t border-line pt-3">
            <label
              htmlFor={`${id}-frei`}
              className="block text-xs font-medium text-muted"
            >
              Andere Zeit
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={`${id}-frei`}
                type="text"
                inputMode="numeric"
                value={freitext}
                onChange={(e) => setFreitext(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  uebernimmFreitext();
                }}
                placeholder="10:45"
                className="w-24 rounded-blk border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-sm text-text"
              />
              <button
                type="button"
                onClick={uebernimmFreitext}
                className="rounded-blk bg-signal px-3 py-1.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {fehler ? <p className="text-sm font-medium text-stop">{fehler}</p> : null}
    </div>
  );
}

function Spalte({
  titel,
  werte,
  aktiv,
  beiWahl,
}: {
  titel: string;
  werte: readonly string[];
  aktiv: string;
  beiWahl: (wert: string) => void;
}) {
  const aktivRef = useRef<HTMLButtonElement | null>(null);

  /*
   * Den gewählten Eintrag beim Öffnen sichtbar machen.
   *
   * Ohne das beginnt die Stundenspalte immer bei 00, und wer eine
   * Schicht ab 17:00 bearbeitet, sieht 00 bis 06 und keinen markierten
   * Eintrag — die Auswahl sieht dann aus, als wäre keine getroffen.
   * `block: "nearest"` scrollt nur die Spalte selbst, nicht die Seite
   * darunter; `scrollIntoView` würde sonst das ganze Popover aus dem
   * Bild schieben.
   */
  useEffect(() => {
    aktivRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <div>
      <p className="mb-1.5 font-display text-[0.625rem] font-bold uppercase tracking-[0.12em] text-muted">
        {titel}
      </p>
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-1">
        {werte.map((w) => (
          <button
            key={w}
            ref={w === aktiv ? aktivRef : undefined}
            type="button"
            onClick={() => beiWahl(w)}
            aria-pressed={w === aktiv}
            className={`rounded-blk px-3 py-1.5 text-center font-mono text-sm transition-colors ${
              w === aktiv
                ? "bg-signal text-signal-ink"
                : "text-text hover:bg-surface-sunk"
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
