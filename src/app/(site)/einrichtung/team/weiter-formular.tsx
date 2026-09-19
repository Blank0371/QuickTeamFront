"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import { leererZustand } from "@/lib/formular";
import type { Dictionary } from "@/i18n/de";

import { weiterZuSchichten } from "./aktionen";
import { EntwurfsFelder } from "./entwurfs-felder";

/**
 * Der Abschluss von Schritt 3.
 *
 * Trägt die gesammelten Rollen als versteckte Felder mit — hier werden
 * sie geschrieben. Bis zu diesem Klick steht in der Datenbank nichts von
 * ihnen, und genau deshalb liessen sie sich vorher frei wieder
 * entfernen; die Begründung an `schreibeRollen()` in `src/lib/team.ts`.
 *
 * Der Knopf war vorher ein reiner `redirect()` ohne Rückmeldung. Jetzt
 * kann er scheitern — das Schreiben ist ein Datenbankzugriff —, also
 * braucht er einen Zustand und eine sichtbare Meldung. Ohne die stünde
 * man nach einem fehlgeschlagenen Insert auf derselben Seite, ohne dass
 * sich etwas gerührt hätte.
 */
function WeiterButton({
  kannWeiter,
  texte,
}: {
  kannWeiter: boolean;
  texte: Dictionary["stepper"]["team"];
}) {
  const { pending } = useFormStatus();
  const gesperrt = pending || !kannWeiter;

  return (
    <button
      type="submit"
      disabled={gesperrt}
      aria-disabled={gesperrt}
      className="w-full rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? texte.weiterLaufend : texte.weiter}
    </button>
  );
}

export function WeiterFormular({
  entwuerfe,
  kannWeiter,
  texte,
}: {
  entwuerfe: readonly string[];
  kannWeiter: boolean;
  texte: Dictionary["stepper"]["team"];
}) {
  const [zustand, aktion] = useActionState(weiterZuSchichten, leererZustand);

  return (
    <form action={aktion} className="mt-10 border-t border-line pt-6">
      <EntwurfsFelder entwuerfe={entwuerfe} />

      {zustand.nachricht ? (
        <div className="mb-4">
          <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
        </div>
      ) : null}

      <WeiterButton kannWeiter={kannWeiter} texte={texte} />

      {!kannWeiter ? (
        <p className="mt-3 text-sm text-muted">{texte.ersteRolle}</p>
      ) : null}
    </form>
  );
}
