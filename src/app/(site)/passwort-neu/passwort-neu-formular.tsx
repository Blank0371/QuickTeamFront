"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { ErneutSendenButton } from "@/components/formular/erneut-senden";
import { CodeFeld, FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import type { Dictionary } from "@/i18n/de";
import { fuelle } from "@/i18n/text";
import { leererZustand } from "@/lib/formular";
import { CODE_LAENGE, PASSWORT_MIN } from "@/lib/validierung";

import { passwortSetzen } from "./aktionen";

export function PasswortNeuFormular({
  email,
  versandTexte,
  texte,
}: {
  email: string | null;
  /** „Code erneut senden" in der Sprache der Anfrage, vom Server-Elternteil. */
  versandTexte: Dictionary["codeVersand"];
  texte: Dictionary["passwort"]["neu"];
}) {
  const [zustand, aktion] = useActionState(passwortSetzen, leererZustand);

  /*
   * Passwort und Wiederholung: nur das erste Feld wird im Browser
   * geprüft. Ob beide übereinstimmen, entscheidet die Server Action —
   * beim Verlassen des zweiten Feldes steht der erste Wert hier gar
   * nicht zur Verfügung.
   */
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["email", "code", "passwort"]);

  return (
    <form action={aktion} noValidate onBlur={beiVerlassen} className="flex flex-col gap-5">
      {zustand.nachricht ? (
        <FormMeldung art={zustand.status === "erfolg" ? "erfolg" : "fehler"}>
          {zustand.nachricht}
        </FormMeldung>
      ) : null}

      <CodeFeld
        id="code"
        name="code"
        label={fuelle(texte.codeLabel, { n: CODE_LAENGE })}
        laenge={CODE_LAENGE}
        fehler={fehlerFuer("code", zustand.felder)}
        hinweis={texte.codeHinweis}
      />

      <TextFeld
        id="email"
        name="email"
        type="email"
        label={texte.emailLabel}
        autoComplete="email"
        defaultValue={zustand.werte?.["email"] ?? email ?? ""}
        fehler={fehlerFuer("email", zustand.felder)}
        hinweis={texte.emailHinweis}
      />

      <TextFeld
        id="passwort"
        name="passwort"
        type="password"
        label={texte.passwortLabel}
        autoComplete="new-password"
        fehler={fehlerFuer("passwort", zustand.felder)}
        hinweis={fuelle(texte.passwortHinweis, { n: PASSWORT_MIN })}
      />

      <TextFeld
        id="wiederholung"
        name="wiederholung"
        type="password"
        label={texte.wiederholungLabel}
        autoComplete="new-password"
        fehler={fehlerFuer("wiederholung", zustand.felder)}
      />

      <AbsendenButton laufend={texte.absendenLaufend}>{texte.absenden}</AbsendenButton>

      <ErneutSendenButton neuGesendet={zustand.status === "erfolg"} texte={versandTexte} />
    </form>
  );
}
