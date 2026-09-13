"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";

/**
 * Anzahl-Eingabe mit eigenen +/- Knöpfen.
 *
 * Gebaut aus `ButtonGroup` + `Button` + `Input` von shadcn. Bewusst
 * **nicht** aus `InputGroup`: dessen Addon-Knöpfe kennen nur die Grössen
 * `xs` und `sm` — 24 bis 28 Pixel. Gefordert war das Gegenteil, und
 * unsere Formularfelder liegen ohnehin bei 44 Pixeln, damit sie mit dem
 * Daumen treffbar sind. `ButtonGroup` gibt dagegen nur die verschmolzene
 * Form vor und überlässt die Höhe uns.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum jede Hover-Regel eine `dark:`-Zwillingsklasse hat
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die `outline`-Variante des shadcn-Buttons bringt eigene Farben mit,
 * und zwar zweimal: einmal für hell (`hover:bg-secondary`) und einmal
 * für dunkel (`dark:hover:bg-input/50`). `cn()` läuft über `twMerge`,
 * das gleichartige Utilities zusammenstreicht und die später
 * übergebene gewinnen lässt — aber `hover:` und `dark:hover:` gelten
 * ihm als **zwei verschiedene Gruppen**. Wer nur die erste überschreibt,
 * bekommt im hellen Modus den eigenen Hover und im dunklen den von
 * shadcn. Genau deshalb steht unten beides.
 *
 * Die Radien passen ohne Zutun: `ButtonGroup` rundet mit `rounded-lg`,
 * und `--radius` zeigt im Mapping auf dieselben 0.625rem wie
 * `--radius-blk`.
 */

/** Trefferfläche wie bei den Textfeldern — 44 Pixel, nicht verhandelbar. */
const KNOPF =
  "h-11 w-11 border-line-strong bg-surface text-text " +
  "hover:border-signal hover:bg-signal-weak hover:text-signal " +
  "dark:border-line-strong dark:bg-surface " +
  "dark:hover:border-signal dark:hover:bg-signal-weak dark:hover:text-signal " +
  "disabled:bg-surface-sunk disabled:text-muted disabled:opacity-40";

/*
 * `flex-none!` ist kein Schoenheitsfehler, sondern noetig: `ButtonGroup`
 * setzt `[&>input]:flex-1` auf jedes Eingabefeld darin. Diese Regel
 * kommt vom Elternteil und ist damit spezifischer als jede Klasse am
 * Feld selbst — und `flex-basis: 0%` schlaegt `width`. Ohne das `!`
 * wuerde das Feld auf die Standardbreite eines Inputs aufgehen (rund
 * 180 Pixel) statt auf die vier Zeichen, die eine Anzahl braucht.
 */
const FELD =
  "zahl-feld h-11 w-16 flex-none! border-line-strong bg-surface text-center " +
  "font-mono text-base text-text md:text-base dark:bg-surface";

export function ZahlStepper({
  id,
  name,
  label,
  defaultValue = 0,
  min = 0,
  max = 99,
  fehler,
}: {
  id: string;
  name: string;
  /**
   * Wofür gezählt wird — steht nicht sichtbar in der Komponente, trägt
   * aber die Beschriftung der beiden Knöpfe. „Küche: einer mehr" ist
   * vorgelesen brauchbar, ein blosses „mehr" bei vier Rollen
   * untereinander nicht.
   */
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  fehler?: string;
}) {
  /*
   * Der Rohtext, nicht die Zahl: `Number("")` ist 0, und wer das Feld
   * zum Neutippen leert, bekäme sonst sofort eine 0 vorgesetzt und
   * müsste sie wieder wegräumen.
   */
  const [text, setText] = useState(String(defaultValue));
  const [ansage, setAnsage] = useState<string | null>(null);

  const zahl = Number(text);
  const gueltig = text.trim() !== "" && Number.isInteger(zahl);
  const aktuell = gueltig ? zahl : min;

  const klemme = (n: number) => Math.min(max, Math.max(min, n));

  function stufe(um: number) {
    const neu = klemme(aktuell + um);
    setText(String(neu));
    setAnsage(`${label}: ${neu}`);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <ButtonGroup aria-label={label}>
        <Button
          type="button"
          variant="outline"
          className={KNOPF}
          onClick={() => stufe(-1)}
          disabled={aktuell <= min}
          aria-label={`${label}: einer weniger`}
        >
          <Minus className="size-5" aria-hidden="true" />
        </Button>

        <Input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onChange={(ereignis) => setText(ereignis.target.value)}
          /*
           * Erst beim Verlassen klemmen, nicht bei jedem Tastendruck:
           * wer „12" tippen will, hat nach der ersten Ziffer eine 1
           * stehen — die dürfte nicht schon auf `max` gezogen werden.
           */
          onBlur={() => setText(String(klemme(aktuell)))}
          aria-invalid={fehler ? true : undefined}
          aria-describedby={fehler ? `${id}-fehler` : undefined}
          className={FELD}
        />

        <Button
          type="button"
          variant="outline"
          className={KNOPF}
          onClick={() => stufe(1)}
          disabled={aktuell >= max}
          aria-label={`${label}: einer mehr`}
        >
          <Plus className="size-5" aria-hidden="true" />
        </Button>
      </ButtonGroup>

      {/*
        Der Knopfdruck ändert einen Wert, auf dem der Fokus nicht liegt —
        ohne diese Zeile bliebe die Änderung für Screenreader stumm.
        Getippte Ziffern lösen sie nicht aus; die liest der Screenreader
        ohnehin selbst mit.
      */}
      <span aria-live="polite" className="sr-only">
        {ansage}
      </span>

      {fehler ? (
        <p id={`${id}-fehler`} className="text-sm font-medium text-stop">
          {fehler}
        </p>
      ) : null}
    </div>
  );
}
