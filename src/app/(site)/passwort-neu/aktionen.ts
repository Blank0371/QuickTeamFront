"use server";

import { redirect } from "next/navigation";

import {
  authFehlerText,
  feldFehler,
  protokolliereAuthFehler,
  type FormZustand,
} from "@/lib/formular";
import { createClient } from "@/lib/supabase/server";
import { passwortNeuSchema, passwortVergessenSchema } from "@/lib/validierung";
import { holeAuthTexte, holeValidierung } from "@/i18n/server";

/**
 * Passwort-Reset in einem Schritt: Code prüfen, dann Passwort setzen.
 *
 * `type: "recovery"` — anders als bei der Registrierung, die `"email"`
 * verlangt. Der Code aus der Recovery-Mail wird von GoTrue nur unter
 * diesem Typ akzeptiert.
 *
 * `verifyOtp` erzeugt die Sitzung, die `updateUser` gleich darauf
 * braucht. Vorher gibt es keine — deshalb steht die E-Mail-Adresse im
 * Formular und nicht in einem Cookie, und deshalb funktioniert der
 * Vorgang auch auf einem anderen Gerät als dem, das ihn angestossen hat.
 */
export async function passwortSetzen(
  vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  if (formData.get("absicht") === "erneut") {
    return erneutSenden(vorher, formData);
  }

  const roh = {
    email: String(formData.get("email") ?? ""),
    code: String(formData.get("code") ?? ""),
    passwort: String(formData.get("passwort") ?? ""),
    wiederholung: String(formData.get("wiederholung") ?? ""),
  };

  const geprueft = passwortNeuSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: { email: roh.email },
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: geprueft.data.email,
    token: geprueft.data.code,
    type: "recovery",
  });

  if (error || !data.session) {
    if (error) protokolliereAuthFehler("verifyOtp/recovery", error);
    return {
      status: "fehler",
      nachricht: error
        ? authFehlerText(error, await holeAuthTexte())
        : "Der Code liess sich nicht bestätigen. Fordere einen neuen an.",
      felder: {},
      werte: { email: geprueft.data.email },
    };
  }

  const { error: setzFehler } = await supabase.auth.updateUser({
    password: geprueft.data.passwort,
  });

  if (setzFehler) {
    protokolliereAuthFehler("updateUser", setzFehler);
    return {
      status: "fehler",
      nachricht: authFehlerText(setzFehler, await holeAuthTexte()),
      felder: {},
      werte: { email: geprueft.data.email },
    };
  }

  /*
   * Die Sitzung bleibt gültig — kein Grund, zur erneuten Anmeldung zu
   * zwingen.
   *
   * Ziel war bis zum 2026-08-29 `appUrl`, also die native App, mit
   * `/login?fehler=app-url-fehlt` als Rückfall. Beides ist überholt: seit
   * der Kursänderung vom 2026-08-26 wird hier gearbeitet, und ein
   * frisch gesetztes Passwort gehört nicht mit einem Konfigurationsfehler
   * quittiert. `/einrichtung` ist derselbe Angelpunkt wie nach dem
   * Anmelden — die Ableitung entscheidet, wohin.
   */
  redirect("/einrichtung");
}

/**
 * Schickt einen neuen Recovery-Code.
 *
 * Nicht `resend()`: das nimmt laut Typ nur `"signup"` und
 * `"email_change"`. Für einen Reset ist der Weg derselbe wie beim ersten
 * Mal — `resetPasswordForEmail`.
 */
async function erneutSenden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const geprueft = passwortVergessenSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(geprueft.data.email);

  if (error) {
    protokolliereAuthFehler("resetPasswordForEmail", error);
    return { status: "fehler", nachricht: authFehlerText(error, await holeAuthTexte()), felder: {} };
  }

  return {
    status: "erfolg",
    nachricht: "Ein neuer Code ist unterwegs. Schau auch im Spam-Ordner nach.",
    felder: {},
    werte: { email: geprueft.data.email },
  };
}
