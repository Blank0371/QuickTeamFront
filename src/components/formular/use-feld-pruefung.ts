"use client";

import { useState, type FocusEvent } from "react";

import { useKlientTexte } from "@/i18n/sprach-provider";
import { pruefeFeld } from "@/lib/validierung";

/**
 * Client-Prüfung beim Verlassen eines Feldes.
 *
 * Der Handler hängt am `<form>` und nicht an jedem einzelnen Feld —
 * `blur` steigt nicht auf, `focusout` schon, und React bildet `onBlur`
 * auf `focusout` ab. Das Ereignisziel ist deshalb das Formular; das
 * tatsächliche Feld steht in `event.target`.
 *
 * Geprüft wird bewusst nicht bei jedem Tastendruck: jemandem beim Tippen
 * der E-Mail-Adresse „ungültig" entgegenzuwerfen, ist keine Hilfe.
 *
 * Die Meldungstexte kommen aus dem Sprach-Context und nicht als Prop:
 * `pruefeFeld()` liefert einen Schlüssel, und dieselben paar Sätze durch
 * jede Formular-Insel durchzureichen wäre Ballast ohne Aussage. Die
 * Begründung im Ganzen steht in `src/i18n/sprach-provider.tsx`.
 */
export function useFeldPruefung(nurFelder?: readonly string[]) {
  const [clientFehler, setClientFehler] = useState<Record<string, string>>({});
  const { validierung } = useKlientTexte();

  function beiVerlassen(event: FocusEvent<HTMLFormElement>) {
    const ziel = event.target;
    if (!(ziel instanceof HTMLInputElement) && !(ziel instanceof HTMLSelectElement)) {
      return;
    }
    if (nurFelder && !nurFelder.includes(ziel.name)) return;

    const meldung = pruefeFeld(ziel.name, ziel.value, validierung);
    setClientFehler((bisher) => ({ ...bisher, [ziel.name]: meldung ?? "" }));
  }

  /** Die Client-Meldung schlägt die Server-Meldung — sie ist die neuere. */
  function fehlerFuer(
    feld: string,
    serverFehler: Record<string, string>,
  ): string | undefined {
    const client = clientFehler[feld];
    if (client !== undefined) return client === "" ? undefined : client;
    return serverFehler[feld];
  }

  return { beiVerlassen, fehlerFuer };
}
