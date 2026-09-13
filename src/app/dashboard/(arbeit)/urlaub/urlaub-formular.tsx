"use client";

import { TreePalm } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { DatumWahl } from "@/components/formular/datum-wahl";
import { FormMeldung } from "@/components/formular/felder";
import { leererZustand } from "@/lib/formular";

import { beantragen } from "./aktionen";

function Absenden() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "…" : "Urlaub beantragen"}
    </button>
  );
}

/**
 * Antragsformular samt Anspruchs-Anzeige — Spiegel von `VacationSection`
 * in `scheduling.tsx`. Dort ist die Auswahl ein Monatsraster mit
 * Tage-Antippen; hier ist sie es seit dem Ersetzen der nativen Felder
 * ebenfalls (`DatumWahl`). Die Grenze bleibt dieselbe wie in der App —
 * heute bis zwölf Monate voraus, dort `MONTHS_AHEAD` —, sie sperrt jetzt
 * nur die Tage im Raster statt sich auf die Browserprüfung zu verlassen.
 */
export function UrlaubFormular({
  anspruch,
  verbraucht,
  heute,
  maxDatum,
}: {
  anspruch: number;
  verbraucht: number;
  heute: string;
  maxDatum: string;
}) {
  const [zustand, aktion] = useActionState(beantragen, leererZustand);
  const werte = zustand.werte ?? {};
  const rest = anspruch - verbraucht;

  return (
    <section
      aria-labelledby="urlaub-beantragen"
      className="rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center gap-4">
        <TreePalm className="size-8 shrink-0 text-signal" aria-hidden="true" />
        <div>
          <p className="font-display text-xl text-text">
            {rest} / {anspruch}
          </p>
          <p className="text-sm text-muted">Resttage in diesem Jahr</p>
        </div>
      </div>

      <h2 id="urlaub-beantragen" className="mt-6 font-display text-base text-text">
        Urlaub beantragen
      </h2>

      {zustand.status === "fehler" && zustand.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
        </div>
      ) : null}
      {zustand.status === "erfolg" ? (
        <div className="mt-4">
          <FormMeldung art="erfolg">Antrag gesendet — wartet auf Entscheidung.</FormMeldung>
        </div>
      ) : null}

      <form action={aktion} className="mt-5 flex flex-col gap-4">
        {/*
          `DatumWahl` statt zweier nativer Felder. `min`/`max` bleiben
          erhalten — heute bis zwölf Monate voraus, dieselbe Grenze wie
          `MONTHS_AHEAD` in `scheduling.tsx` —, nur sperrt sie jetzt die
          Tage im Raster, statt sich auf die Prüfung des Browsers zu
          verlassen. Die Server Action bekommt weiterhin `YYYY-MM-DD`.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DatumWahl
            name="von"
            label="Von"
            min={heute}
            max={maxDatum}
            defaultValue={werte["von"]}
            fehler={zustand.felder["von"]}
          />

          <DatumWahl
            name="bis"
            label="Bis"
            min={heute}
            max={maxDatum}
            defaultValue={werte["bis"]}
            fehler={zustand.felder["bis"]}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            Kommentar <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            type="text"
            name="kommentar"
            maxLength={50}
            defaultValue={werte["kommentar"]}
            className="w-full rounded-blk border border-line-strong bg-bg px-4 py-2.5 text-text"
          />
        </label>

        <div>
          <Absenden />
        </div>
      </form>
    </section>
  );
}
