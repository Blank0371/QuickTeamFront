"use server";

import { redirect } from "next/navigation";

import {
  authFehlerText,
  feldFehler,
  protokolliereAuthFehler,
  type FormZustand,
} from "@/lib/formular";
import { createClient } from "@/lib/supabase/server";
import { passwortVergessenSchema } from "@/lib/validierung";
import { holeAuthTexte, holeValidierung } from "@/i18n/server";

export async function passwortZuruecksetzen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const email = String(formData.get("email") ?? "");

  const geprueft = passwortVergessenSchema.safeParse({ email });
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: { email },
    };
  }

  const supabase = await createClient();

  /*
   * Kein `redirectTo`: die Vorlage verschickt `{{ .Token }}`, der Code
   * wird auf /passwort-neu eingetippt. Ein Rücksprungziel gibt es nicht
   * mehr.
   *
   * Supabase meldet keinen Fehler, wenn die Adresse unbekannt ist — die
   * Weiterleitung unten passiert deshalb in beiden Fällen. Alles andere
   * würde verraten, wer hier ein Konto hat.
   */
  const { error } = await supabase.auth.resetPasswordForEmail(geprueft.data.email);

  if (error) {
    protokolliereAuthFehler("resetPasswordForEmail", error);
    return {
      status: "fehler",
      nachricht: authFehlerText(error, await holeAuthTexte()),
      felder: {},
      werte: { email },
    };
  }

  /*
   * Weiter zur Code-Eingabe. Die Adresse wandert als Parameter mit, damit
   * das Feld dort vorausgefüllt ist — bestätigt wird sie erst durch den
   * Code, sie ist hier also kein Geheimnis und kein Vertrauensanker.
   */
  redirect(`/passwort-neu?email=${encodeURIComponent(geprueft.data.email)}`);
}
