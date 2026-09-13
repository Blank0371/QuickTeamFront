import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { RadioGroupCard } from "@/components/ui/radio-group";

/**
 * Auswahl-Karten — die Karte selbst zeigt an, was gewählt ist.
 *
 * Drei Bausteine, eine Optik. Dass es drei sind und nicht einer, liegt
 * nicht am Aussehen, sondern daran, wie die Auswahl beim Server ankommt;
 * am 2026-08-29 gegen den laufenden Server nachgesehen:
 *
 *   `WahlKarte`  eine aus mehreren, im selben Formular abgeschickt.
 *                Radix-Radiogruppe — sie legt ein verstecktes echtes
 *                `<input type="radio">` dazu.
 *   `WahlChip`   mehrere gleichzeitig, im selben Formular abgeschickt.
 *                Bewusst ein natives `<input type="checkbox">`:
 *                `ToggleGroup` rendert **kein einziges Feld**, die
 *                angehakten Rollen kämen nie am Server an.
 *   `WahlKnopf`  schaltet sofort um, jede Karte ein eigenes Formular.
 *                Ein `<button type="submit">` mit `aria-pressed`.
 *
 * Die gemeinsamen Zustände stehen als `.wahl` in `globals.css`; dort
 * steht auch, warum sie nicht in Tailwind-Klassen passen.
 */

/** Grösse und Innenabstand der kleinen Form — Chip wie Knopf. */
const CHIP =
  "wahl [--wahl-skala:1.06] items-center gap-2 rounded-blk px-3.5 py-2 text-sm font-medium";

/**
 * Eine Karte in einer Radiogruppe.
 *
 * Muss innerhalb eines `<RadioGroup name=… defaultValue=…>` stehen —
 * daher kein eigenes `name`: das trägt die Gruppe.
 */
export function WahlKarte({
  wert,
  titel,
  text,
}: {
  wert: string;
  titel: string;
  text: string;
}) {
  return (
    <RadioGroupCard
      value={wert}
      className="w-full items-start gap-3 rounded-card px-4 py-4 sm:px-5"
    >
      {/*
        Weder Titel noch Text bekommen eine eigene Farbe: sie erben die
        der Karte und wandern damit von gedämpft nach deutlich, sobald
        gewählt wird. Eine feste Textfarbe würde genau den Unterschied
        wieder einebnen, um den es hier geht.
      */}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-base font-bold">{titel}</span>
        <span className="text-sm font-normal">{text}</span>
      </span>
      <Check className="wahl-haken mt-0.5 size-5 shrink-0" aria-hidden="true" />
    </RadioGroupCard>
  );
}

/**
 * Das Kästchen vor der Beschriftung — leerer Umriss oder gefüllter Haken.
 *
 * Warum überhaupt ein Kästchen und nicht nur ein Haken: der Haken muss
 * seinen Platz auch dann belegen, wenn er nicht zu sehen ist, sonst
 * ändert der Chip beim Anhaken seine Breite und schiebt alle Nachbarn
 * in der Reihe zur Seite. Mit `opacity: 0` allein blieb an dieser
 * Stelle eine leere, dunkle Fläche stehen — sichtbar als Loch im Chip,
 * ohne erkennbare Bedeutung.
 *
 * Ein leerer Umriss füllt denselben Platz und beantwortet dabei eine
 * Frage, die vorher offen blieb: dass hier etwas an- und abwählbar ist.
 * Genau die Auskunft, die WCAG 1.4.1 verlangt — die Auswahl darf nicht
 * allein an der Farbe hängen.
 */
function Kasten({ gross = false }: { gross?: boolean }) {
  return (
    <span className={`wahl-kasten ${gross ? "size-5" : "size-4"}`} aria-hidden="true">
      <Check className="wahl-haken" />
    </span>
  );
}

/**
 * Ein Chip zum Anhaken, mehrere davon nebeneinander.
 *
 * Das Feld ist `sr-only` statt `hidden`: unsichtbar, aber weiterhin
 * fokussierbar. Den sichtbaren Fokus übernimmt die Karte über
 * `.wahl:has(:focus-visible)`.
 */
export function WahlChip({
  name,
  wert,
  beschriftung,
  defaultChecked = false,
}: {
  name: string;
  wert: string;
  beschriftung: ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className={CHIP}>
      <input
        type="checkbox"
        name={name}
        value={wert}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <Kasten />
      {beschriftung}
    </label>
  );
}

/**
 * Ein Chip, der beim Klick sofort abschickt.
 *
 * `aria-pressed` ist hier nicht nur Beiwerk: es ist die einzige Auskunft
 * darüber, dass der Knopf einen Zustand hat und nicht bloss eine Aktion
 * auslöst — und es trägt gleichzeitig die Optik.
 */
export function WahlKnopf({
  gewaehlt,
  beschriftung,
}: {
  gewaehlt: boolean;
  beschriftung: ReactNode;
}) {
  return (
    <button type="submit" aria-pressed={gewaehlt} className={CHIP}>
      <Kasten />
      {beschriftung}
    </button>
  );
}
