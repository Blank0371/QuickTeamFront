"use server";

import { redirect } from "next/navigation";

import {
  authFehlerText,
  feldFehler,
  protokolliereAuthFehler,
  type FormZustand,
} from "@/lib/formular";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validierung";
import { holeAuthTexte, holeValidierung } from "@/i18n/server";

export async function anmelden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const email = String(formData.get("email") ?? "");
  const passwort = String(formData.get("passwort") ?? "");

  const geprueft = loginSchema.safeParse({ email, passwort });
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: { email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: geprueft.data.email,
    password: geprueft.data.passwort,
  });

  if (error) {
    protokolliereAuthFehler("signInWithPassword", error);
    return {
      status: "fehler",
      nachricht: authFehlerText(error, await holeAuthTexte()),
      felder: {},
      werte: { email },
    };
  }

  /*
   * Immer über `/einrichtung`, nie direkt woandershin. Dort läuft die
   * Ableitung aus CLAUDE.md und entscheidet, wohin: offener Schritt,
   * Sperrseite bei abgelaufener Testphase, oder — bei fertig
   * eingerichtetem Betrieb — direkt `/dashboard`.
   *
   * Dass hier kein Ziel mehr steht, ist der Punkt: gleicher Zustand,
   * gleiche Antwort, unabhängig davon, über welchen Weg jemand ankommt.
   * Ein zweiter Entscheidungsort wäre ein zweiter Ort zum Auseinanderlaufen.
   */
  redirect("/einrichtung");
}
