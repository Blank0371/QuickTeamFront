"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { ErneutSendenButton } from "@/components/formular/erneut-senden";
import { CodeFeld, FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";
import { CODE_LAENGE } from "@/lib/validierung";

import { bestaetigen } from "./aktionen";

/**
 * Abschnitt B der Kontoerstellung: Code-Eingabe.
 *
 * Die Adresse ist ein echtes, änderbares Feld und kein verstecktes —
 * genau das macht den Wechsel des Geräts möglich: E-Mail auf dem Handy
 * öffnen, Code am Laptop eintippen. Eine Sitzung gibt es an dieser Stelle
 * noch nicht, aus der sich die Adresse ziehen liesse; sie entsteht erst
 * mit der Bestätigung.
 */
export function CodeAbschnitt({
  email,
  texte,
  versandTexte,
}: {
  email: string | null;
  texte: Dictionary["registrierung"];
  versandTexte: Dictionary["codeVersand"];
}) {
  const [zustand, aktion] = useActionState(bestaetigen, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["email", "code"]);

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
        label={texte.code.label.replace("{n}", String(CODE_LAENGE))}
        laenge={CODE_LAENGE}
        fehler={fehlerFuer("code", zustand.felder)}
        hinweis={texte.code.hinweis}
      />

      <TextFeld
        id="email"
        name="email"
        type="email"
        label={texte.felder.email}
        autoComplete="email"
        defaultValue={zustand.werte?.["email"] ?? email ?? ""}
        fehler={fehlerFuer("email", zustand.felder)}
        hinweis={texte.code.emailHinweis}
      />

      <AbsendenButton laufend={texte.code.wirdGeprueft}>{texte.code.bestaetigen}</AbsendenButton>

      <ErneutSendenButton neuGesendet={zustand.status === "erfolg"} texte={versandTexte} />
    </form>
  );
}
