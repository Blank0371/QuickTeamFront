"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";

import { passwortZuruecksetzen } from "./aktionen";

export function PasswortVergessenFormular({
  texte,
}: {
  texte: Dictionary["passwort"]["vergessen"];
}) {
  const [zustand, aktion] = useActionState(passwortZuruecksetzen, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["email"]);

  /*
   * Kein Erfolgs-Zweig mehr: die Action leitet nach dem Versand direkt
   * auf /passwort-neu weiter, wo der Code eingetippt wird. Sie tut das
   * auch bei unbekannten Adressen — sonst wäre an der Weiterleitung
   * ablesbar, wer hier ein Konto hat.
   */
  return (
    <form action={aktion} noValidate onBlur={beiVerlassen} className="flex flex-col gap-5">
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <TextFeld
        id="email"
        name="email"
        type="email"
        label={texte.emailLabel}
        autoComplete="email"
        defaultValue={zustand.werte?.["email"]}
        fehler={fehlerFuer("email", zustand.felder)}
        hinweis={texte.emailHinweis}
      />

      <AbsendenButton laufend={texte.absendenLaufend}>{texte.absenden}</AbsendenButton>
    </form>
  );
}
