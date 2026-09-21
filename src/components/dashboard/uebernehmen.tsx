"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import type { UebernehmbareRolle } from "@/lib/dashboard/ausschreibung";
import { schichtUebernehmen } from "@/lib/dashboard/ausschreibung-aktionen";
import { leererZustand } from "@/lib/formular";

/**
 * „Übernehmen" für eine offene Ausschreibung.
 *
 * Ein Bauteil für beide Stellen — die Mitteilungsliste und die
 * Schicht-Detailseite —, damit die fünf Rückgabecodes nicht an zwei
 * Orten verschieden ausgelegt werden.
 *
 * **Je Rolle ein Knopf, und der Rollenname steht drauf.** Der RPC
 * verlangt `p_rolle_id`; eine Ausschreibung kann mehrere Rollen
 * enthalten, und welche man übernimmt, ist keine Nebensache — davon
 * hängt ab, was man an dem Abend tut. Bei genau einer Rolle bleibt es
 * trotzdem bei einem Knopf mit Rollennamen: „Übernehmen" allein liesse
 * offen, wofür.
 *
 * Der Restbedarf steht daneben, wenn mehr als ein Platz frei ist. Bei
 * einem einzigen wäre „noch 1 frei" nur Lärm — dass es frei ist, sagt
 * schon der Knopf.
 */
type UebernehmenTexte = {
  wirdUebernommen: string;
  /** „Als {rolle} übernehmen". */
  uebernehmen: string;
  /** „{n} frei". */
  frei: string;
};

export function Uebernehmen({
  benachrichtigungId,
  instanzId,
  rollen,
  texte,
}: {
  benachrichtigungId: string;
  instanzId: string;
  rollen: readonly UebernehmbareRolle[];
  texte: UebernehmenTexte;
}) {
  const [zustand, aktion] = useActionState(schichtUebernehmen, leererZustand);

  return (
    <div className="mt-3 flex flex-col gap-3">
      {zustand.status !== "leer" && zustand.nachricht ? (
        <FormMeldung art={zustand.status === "erfolg" ? "erfolg" : "fehler"}>
          {zustand.nachricht}
        </FormMeldung>
      ) : null}

      {/*
        Nach einer erfolgreichen Übernahme verschwinden die Knöpfe. Die
        Seite lädt durch `revalidatePath` ohnehin neu und würde die
        Ausschreibung dann nicht mehr anbieten; bis das durch ist, soll
        aber niemand ein zweites Mal klicken und `schon_zugewiesen`
        vorgesetzt bekommen.
      */}
      {zustand.status === "erfolg" ? null : (
        <div className="flex flex-wrap gap-2">
          {rollen.map((rolle) => (
            <form key={rolle.rolleId} action={aktion}>
              <input type="hidden" name="benachrichtigung_id" value={benachrichtigungId} />
              <input type="hidden" name="rolle_id" value={rolle.rolleId} />
              <input type="hidden" name="instanz_id" value={instanzId} />
              <Knopf rolle={rolle} texte={texte} />
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function Knopf({
  rolle,
  texte,
}: {
  rolle: UebernehmbareRolle;
  texte: UebernehmenTexte;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="flex items-center gap-2 rounded-blk bg-signal px-4 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending
        ? texte.wirdUebernommen
        : texte.uebernehmen.replace("{rolle}", rolle.name)}
      {rolle.frei !== undefined && rolle.frei > 1 && !pending ? (
        <span className="font-mono text-xs opacity-80">
          {texte.frei.replace("{n}", String(rolle.frei))}
        </span>
      ) : null}
    </button>
  );
}
