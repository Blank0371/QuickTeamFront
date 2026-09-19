"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";

import { anmelden } from "./aktionen";

export function LoginFormular({ texte }: { texte: Dictionary["login"] }) {
  const [zustand, aktion] = useActionState(anmelden, leererZustand);

  /*
   * Nur die E-Mail wird im Browser geprüft. Das Passwort beim Anmelden
   * gegen die Mindestlänge zu prüfen wäre falsch: wer ein älteres,
   * kürzeres hat, soll sich damit trotzdem anmelden können.
   */
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["email"]);

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
      />

      <TextFeld
        id="passwort"
        name="passwort"
        type="password"
        label={texte.passwortLabel}
        autoComplete="current-password"
        fehler={fehlerFuer("passwort", zustand.felder)}
      />

      <AbsendenButton laufend={texte.absendenLaufend}>{texte.absenden}</AbsendenButton>
    </form>
  );
}
