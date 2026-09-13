"use server";

import { redirect } from "next/navigation";

import { loescheAktivePosition } from "@/lib/dashboard/position";
import { createClient } from "@/lib/supabase/server";

/**
 * Abmelden. Nötig, damit auf einem geteilten Gerät im Lokal überhaupt
 * jemand anders an die Formulare kommt — der Grund, aus dem angemeldete
 * Personen auf `/login` nicht weitergeleitet werden.
 *
 * Die gewählte Position wird mit vergessen. Sicherheitsrelevant ist das
 * nicht — sie wird ohnehin bei jedem Zugriff gegen die Anmeldung geprüft
 * und liefe für ein fremdes Konto einfach ins Leere. Es geht um das
 * geteilte Gerät hinter der Theke: die nächste Person soll nicht die
 * Auswahl der vorigen vorfinden.
 */
export async function abmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await loescheAktivePosition();
  redirect("/login?meldung=abgemeldet");
}
