"use client";

import { TreePalm } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { DatumWahl } from "@/components/formular/datum-wahl";
import { FormMeldung } from "@/components/formular/felder";
import type { Dictionary } from "@/i18n";
import { leererZustand } from "@/lib/formular";

import { beantragen } from "./aktionen";

type UrlaubTexte = Dictionary["urlaub"];

function Absenden({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "…" : label}
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
  texte,
}: {
  anspruch: number;
  verbraucht: number;
  heute: string;
  maxDatum: string;
  texte: UrlaubTexte;
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
          <p className="text-sm text-muted">{texte.resttage}</p>
        </div>
      </div>

      <h2 id="urlaub-beantragen" className="mt-6 font-display text-base text-text">
        {texte.beantragen}
      </h2>

      {zustand.status === "fehler" && zustand.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
        </div>
      ) : null}
      {zustand.status === "erfolg" ? (
        <div className="mt-4">
          <FormMeldung art="erfolg">{texte.gesendet}</FormMeldung>
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
            label={texte.von}
            min={heute}
            max={maxDatum}
            defaultValue={werte["von"]}
            fehler={zustand.felder["von"]}
          />

          <DatumWahl
            name="bis"
            label={texte.bis}
            min={heute}
            max={maxDatum}
            defaultValue={werte["bis"]}
            fehler={zustand.felder["bis"]}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            {texte.kommentar}{" "}
            <span className="font-normal text-muted">{texte.optional}</span>
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
          <Absenden label={texte.beantragen} />
        </div>
      </form>
    </section>
  );
}
