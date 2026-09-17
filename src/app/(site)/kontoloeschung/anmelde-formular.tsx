"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { leererZustand } from "@/lib/formular";

import { anmeldenZurLoeschung } from "./aktionen";

/**
 * Stufe 1: E-Mail und Passwort, auf der Löschseite selbst.
 *
 * **Warum hier und nicht über `/login`.** Wer sein Konto loswerden will,
 * soll nicht erst durch die Anmeldung geschickt werden, die ihn danach
 * weiterreicht — `anmelden()` leitet grundsätzlich auf `/einrichtung`,
 * und von dort kommt man je nach Stand des Betriebs an ganz anderen
 * Stellen heraus. Für einen Weg hinaus ist das die falsche Richtung.
 *
 * Geprüft wird trotzdem genau dasselbe: `loginSchema` und
 * `signInWithPassword`. Eine Löschseite mit schwächerer Anmeldung wäre
 * ein Werkzeug gegen fremde Konten.
 *
 * Wie auf `/login` wird im Browser nur die E-Mail geprüft. Das Passwort
 * gegen die Mindestlänge zu prüfen wäre falsch: wer ein älteres,
 * kürzeres hat, muss trotzdem an sein Konto kommen — gerade hier.
 */
export function AnmeldeFormular() {
  const [zustand, aktion] = useActionState(anmeldenZurLoeschung, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["email"]);

  return (
    <form
      action={aktion}
      noValidate
      onBlur={beiVerlassen}
      className="mt-6 flex flex-col gap-5"
    >
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <TextFeld
        id="email"
        name="email"
        type="email"
        label="E-Mail-Adresse"
        autoComplete="email"
        defaultValue={zustand.werte?.["email"]}
        fehler={fehlerFuer("email", zustand.felder)}
      />

      <TextFeld
        id="passwort"
        name="passwort"
        type="password"
        label="Passwort"
        autoComplete="current-password"
        fehler={fehlerFuer("passwort", zustand.felder)}
      />

      <AbsendenButton laufend="Wird geprüft …">Weiter</AbsendenButton>
    </form>
  );
}
