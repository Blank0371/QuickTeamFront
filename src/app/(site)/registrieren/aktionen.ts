"use server";

/**
 * Die Server Actions der **Kontoerstellung**.
 *
 * Seit dem 2026-09-22 (siehe `CLAUDE.md`, „Registrierungs-Flow", und
 * `docs/claude-md-historie.md`) legt `/registrieren` nur noch ein
 * Nutzerkonto an — **keinen Betrieb**. Die Betriebsanlage ist ein eigener,
 * späterer Schritt (`/einrichtung/betrieb`). Zwei Abschnitte einer Seite:
 * A (E-Mail, Passwort, Datenschutz-Kenntnisnahme) und B (Code-Eingabe).
 *
 * Nach bestätigtem Code entsteht die Session, und die Person landet auf
 * ihrer Übersicht (`/dashboard/wechseln`) — dort entscheidet sie, ob sie
 * einen Betrieb einrichtet oder eine Einladung annimmt.
 */

import { redirect } from "next/navigation";

import { leseSprache } from "@/i18n/sprache";
import { zustimmungHashes } from "@/lib/rechtstexte-inhalt";
import {
  datenschutzSignupVersionen,
  ZUSTIMMUNG_METADATEN_SCHLUESSEL,
  ZUSTIMMUNG_NACHWEIS_SCHLUESSEL,
} from "@/lib/zustimmung";
import {
  authFehlerText,
  feldFehler,
  protokolliereAuthFehler,
  type FormZustand,
} from "@/lib/formular";
import { createClient } from "@/lib/supabase/server";
import { holeAuthTexte, holeValidierung } from "@/i18n/server";
import {
  bestaetigungSchema,
  kontoSchema,
  passwortVergessenSchema,
} from "@/lib/validierung";

/**
 * Bestätigt die Kontoerstellung mit dem Code aus der E-Mail.
 *
 * `type: "email"` ist der aktuelle Wert für die Signup-Bestätigung; `resend`
 * verlangt weiter unten dagegen `"signup"`. Das ist kein Versehen — die
 * beiden Aufrufe erwarten laut Typ verschiedene Werte.
 *
 * Anders als bis zum 2026-09-22 wird hier **kein Betrieb** mehr angelegt und
 * **keine** Zustimmungszeile geschrieben: es gibt noch keine `betrieb_id`,
 * an der eine hängen könnte. Die Datenschutz-Fassung reist in
 * `user_metadata` mit und wird erst beim Anlegen des Betriebs eingetragen.
 */
export async function bestaetigen(
  vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  if (formData.get("absicht") === "erneut") {
    return erneutSenden(vorher, formData);
  }

  const roh = {
    email: String(formData.get("email") ?? ""),
    code: String(formData.get("code") ?? ""),
  };

  const geprueft = bestaetigungSchema.safeParse(roh);
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
    type: "email",
  });

  if (error || !data.session) {
    if (error) protokolliereAuthFehler("verifyOtp/email", error);
    return {
      status: "fehler",
      nachricht: error
        ? authFehlerText(error, await holeAuthTexte())
        : "Der Code liess sich nicht bestätigen. Fordere einen neuen an.",
      felder: {},
      werte: { email: geprueft.data.email },
    };
  }

  /*
   * Das Konto steht. Weiter zur Übersicht, wo die Person ihre
   * Mitgliedschaften und Einladungen sieht — und den Weg zum eigenen
   * Betrieb findet. `/dashboard` würde über das Tor ohnehin genau dorthin
   * umleiten (keine Position); der direkte Weg spart die Stripe-Prüfungen
   * des Tors bei einem Konto, das noch gar keinen Betrieb hat.
   */
  redirect("/dashboard/wechseln");
}

/**
 * Schickt den Bestätigungscode noch einmal.
 *
 * Kein `emailRedirectTo`: die Vorlage verschickt `{{ .Token }}` und
 * enthält gar keinen Link, den ein Redirect-Ziel bräuchte.
 */
export async function erneutSenden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const geprueft = passwortVergessenSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht:
        "Ohne E-Mail-Adresse lässt sich nichts erneut verschicken. Geh zurück zur Registrierung.",
      felder: feldFehler(geprueft.error, await holeValidierung()),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: geprueft.data.email,
  });

  if (error) {
    protokolliereAuthFehler("resend", error);
    return { status: "fehler", nachricht: authFehlerText(error, await holeAuthTexte()), felder: {} };
  }

  return {
    status: "erfolg",
    nachricht: "Ein neuer Code ist unterwegs. Schau auch im Spam-Ordner nach.",
    felder: {},
  };
}

/* ------------------------------------------------------------------ */
/* Abschnitt A: Zugangsdaten                                           */
/* ------------------------------------------------------------------ */

function text(formData: FormData, feld: string): string {
  const wert = formData.get(feld);
  return typeof wert === "string" ? wert : "";
}

export async function registrieren(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const roh = {
    email: text(formData, "email"),
    passwort: text(formData, "passwort"),
    wiederholung: text(formData, "wiederholung"),
    zustimmung: text(formData, "zustimmung"),
  };

  // Nach einem Fehler wird das Formular wieder gefüllt — Passwörter nie.
  const werte = { email: roh.email, zustimmung: roh.zustimmung };

  const geprueft = kontoSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte,
    };
  }

  const daten = geprueft.data;
  const supabase = await createClient();

  /*
   * Nur die Datenschutz-Kenntnisnahme reist mit — AGB und AVV
   * (betriebliche Vertragsannahme) folgen beim Anlegen des Betriebs, wo es
   * auch erst eine `betrieb_id` gibt. Die Fassung wird mitgeführt, damit
   * später nicht eine andere eingetragen wird als die, der jemand
   * tatsächlich zugestimmt hat.
   *
   * Kein `emailRedirectTo`: die Vorlage verschickt `{{ .Token }}` und
   * enthält keinen Link, für den ein Rücksprungziel nötig wäre.
   */
  const datenschutzHash = (await zustimmungHashes()).datenschutz;
  const { error } = await supabase.auth.signUp({
    email: daten.email,
    password: daten.passwort,
    options: {
      data: {
        [ZUSTIMMUNG_METADATEN_SCHLUESSEL]: datenschutzSignupVersionen(),
        [ZUSTIMMUNG_NACHWEIS_SCHLUESSEL]: {
          sprache: await leseSprache(),
          hashes: datenschutzHash ? { datenschutz: datenschutzHash } : {},
        },
      },
    },
  });

  if (error) {
    protokolliereAuthFehler("signUp", error);
    return {
      status: "fehler",
      nachricht: authFehlerText(error, await holeAuthTexte()),
      felder: {},
      werte,
    };
  }

  /*
   * Gibt es die Adresse bereits, liefert Supabase bei aktivierter
   * Bestätigungspflicht trotzdem einen Erfolg zurück und verschickt
   * stattdessen einen Hinweis an den bestehenden Account. Das ist
   * Absicht: sonst liesse sich über diese Seite herausfinden, wer
   * registriert ist. Wir behandeln beide Fälle deshalb gleich.
   *
   * Bleibt auf dieser Route. Der Parameter klappt Abschnitt B auf und
   * fuellt die Adresse vor — deshalb eine Weiterleitung und kein
   * Client-Zustand: so uebersteht der Schritt einen Reload, und der Link
   * fuehrt auf einem zweiten Geraet an dieselbe Stelle.
   */
  redirect(`/registrieren?email=${encodeURIComponent(daten.email)}`);
}
