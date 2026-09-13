"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import { leererZustand } from "@/lib/formular";

import { kontoLoeschen } from "./aktionen";

function LoeschKnopf({ freigeschaltet }: { freigeschaltet: boolean }) {
  const { pending } = useFormStatus();
  const gesperrt = pending || !freigeschaltet;

  return (
    <button
      type="submit"
      disabled={gesperrt}
      aria-disabled={gesperrt}
      className="rounded-blk border border-stop/60 px-5 py-2.5 text-sm font-semibold text-stop transition-colors hover:bg-stop/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Wird gelöscht …" : "Konto endgültig löschen"}
    </button>
  );
}

/**
 * Die letzte Stufe: abtippen, ankreuzen, löschen.
 *
 * Drei Hürden hintereinander, und jede fängt einen anderen Fehler ab:
 *
 *   · **Abtippen** fängt den Fehlklick. Ein Knopf allein wird gedrückt,
 *     ein Name muss gelesen und geschrieben werden.
 *   · **Häkchen** fängt das Abtippen ohne Lesen — wer den Namen kopiert,
 *     hat den Text darüber noch nicht bestätigt.
 *   · **Knopf in `stop`-Rot**, das laut `CLAUDE.md` destruktiven
 *     Aktionen vorbehalten ist. Hier ist es am Platz.
 *
 * Der Knopf bleibt gesperrt, bis beides stimmt — sichtbar gesperrt, nicht
 * unsichtbar: ein Knopf, der erst auftaucht, wenn man alles richtig
 * gemacht hat, verrät nicht, was noch fehlt.
 */
export function LoeschFormular({ erwartet }: { erwartet: string }) {
  const [zustand, aktion] = useActionState(kontoLoeschen, leererZustand);
  const [eingabe, setEingabe] = useState("");
  const [verstanden, setVerstanden] = useState(false);

  const passt = eingabe.trim() === erwartet;

  return (
    <form action={aktion} className="mt-6 flex flex-col gap-5">
      <input type="hidden" name="erwartet" value={erwartet} />

      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bestaetigung" className="text-sm font-medium text-text">
          Tipp zur Bestätigung <span className="font-mono text-text">{erwartet}</span> ein
        </label>
        <input
          id="bestaetigung"
          name="bestaetigung"
          type="text"
          autoComplete="off"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          aria-describedby="bestaetigung-hinweis"
          className={`w-full rounded-blk border bg-surface px-3.5 py-2.5 text-base text-text ${
            eingabe.length > 0 && !passt ? "border-stop" : "border-line-strong"
          }`}
        />
        <p id="bestaetigung-hinweis" className="text-xs leading-relaxed text-muted">
          Genau so, wie es oben steht — Gross- und Kleinschreibung zählt.
        </p>
      </div>

      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-text">
        <input
          type="checkbox"
          checked={verstanden}
          onChange={(e) => setVerstanden(e.target.checked)}
          className="mt-1"
        />
        <span>
          Mir ist klar, dass mein Zugang danach nicht mehr existiert und sich nicht
          wiederherstellen lässt.
        </span>
      </label>

      <div>
        <LoeschKnopf freigeschaltet={passt && verstanden} />
      </div>
    </form>
  );
}
