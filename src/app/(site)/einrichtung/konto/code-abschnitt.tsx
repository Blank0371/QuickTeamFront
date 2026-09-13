"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { ErneutSendenButton } from "@/components/formular/erneut-senden";
import { CodeFeld, FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { leererZustand } from "@/lib/formular";
import { CODE_LAENGE } from "@/lib/validierung";

import { bestaetigen } from "./aktionen";

/**
 * Abschnitt B von Schritt 1: Code-Eingabe.
 *
 * Die Adresse ist ein echtes, änderbares Feld und kein verstecktes —
 * genau das macht den Wechsel des Geräts möglich: E-Mail auf dem Handy
 * öffnen, Code am Laptop eintippen. Eine Sitzung gibt es an dieser Stelle
 * noch nicht, aus der sich die Adresse ziehen liesse; sie entsteht erst
 * mit der Bestätigung.
 */
export function CodeAbschnitt({ email }: { email: string | null }) {
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
        label={`Code aus der E-Mail (${CODE_LAENGE} Ziffern)`}
        laenge={CODE_LAENGE}
        fehler={fehlerFuer("code", zustand.felder)}
        hinweis="Der Code gilt 60 Minuten."
      />

      <TextFeld
        id="email"
        name="email"
        type="email"
        label="E-Mail-Adresse"
        autoComplete="email"
        defaultValue={zustand.werte?.["email"] ?? email ?? ""}
        fehler={fehlerFuer("email", zustand.felder)}
        hinweis="Die Adresse, an die wir den Code geschickt haben."
      />

      <AbsendenButton laufend="Wird geprüft …">Bestätigen</AbsendenButton>

      <ErneutSendenButton neuGesendet={zustand.status === "erfolg"} />
    </form>
  );
}
