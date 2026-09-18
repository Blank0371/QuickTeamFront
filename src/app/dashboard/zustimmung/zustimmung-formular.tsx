"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung } from "@/components/formular/felder";
import { ZustimmungFeld } from "@/components/formular/zustimmung-feld";
import type { Dictionary } from "@/i18n/de";
import { ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import { leererZustand } from "@/lib/formular";

import { zustimmen } from "./aktionen";

/**
 * Das Formular des Zustimmungs-Tors.
 *
 * Client-Insel nur wegen `useActionState` — die Fehlermeldung muss ohne
 * Neuladen an der Checkbox erscheinen. Der Haken selbst kommt aus
 * `ZustimmungFeld`, derselben Komponente wie bei der Registrierung.
 *
 * Das Ziel reist als verstecktes Feld mit, nicht als Teil der Adresse:
 * eine Server Action bekommt die Suchparameter der Seite nicht
 * automatisch, und der Wert wird serverseitig ohnehin durch
 * `sicheresZiel()` gefiltert.
 */
export function ZustimmungFormular({
  ziel,
  zustimmungTexte,
}: {
  ziel: string;
  /** Der Zustimmungssatz in der Sprache der Anfrage, vom Server-Elternteil. */
  zustimmungTexte: Dictionary["zustimmungFeld"];
}) {
  const [zustand, aktion] = useActionState(zustimmen, leererZustand);

  return (
    <form action={aktion} noValidate className="flex flex-col gap-5">
      {zustand.nachricht ? (
        <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
      ) : null}

      <input type="hidden" name={ZIEL_PARAMETER} value={ziel} />

      <ZustimmungFeld fehler={zustand.felder?.["zustimmung"]} texte={zustimmungTexte} />

      <div>
        <AbsendenButton laufend="Wird gespeichert …">
          Zustimmen und weiter
        </AbsendenButton>
      </div>
    </form>
  );
}
