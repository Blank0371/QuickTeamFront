"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung } from "@/components/formular/felder";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";

import { betriebNachtragen } from "./aktionen";

/**
 * Ein Formular ohne Felder — die Angaben stehen schon in `user_metadata`,
 * hier wird nur der zweite Versuch ausgelöst.
 *
 * Trotzdem ein `<form>` und kein Link: das Anlegen des Betriebs ist eine
 * Schreiboperation, und die gehört hinter ein POST. Ein Link dorthin
 * würde von jedem Prefetch und jedem Crawler ausgelöst.
 */
export function NachtragenFormular({
  texte,
}: {
  /** Vom Server-Elternteil in der Sprache der Anfrage hereingereicht. */
  texte: Dictionary["registrierung"];
}) {
  const [zustand, aktion] = useActionState(betriebNachtragen, leererZustand);

  return (
    <form action={aktion} className="flex flex-col gap-4">
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <AbsendenButton laufend={texte.wirdAngelegt}>{texte.nachtragen.button}</AbsendenButton>
    </form>
  );
}
