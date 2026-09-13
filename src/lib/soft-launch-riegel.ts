import { redirect } from "next/navigation";

import { softLaunchAktiv } from "@/lib/soft-launch";

/**
 * Zweite Ebene der Soft-Launch-Sperre, aufgerufen aus `createClient()`
 * (Supabase) und `stripeKlient()`.
 *
 * **Warum das nötig ist, obwohl die Middleware schon sperrt.** Server
 * Actions werden nicht über die Adresse der Seite gefunden, zu der sie
 * gehören, sondern über eine ID im `Next-Action`-Kopf. Ein POST mit
 * dieser ID an eine *offene* Route — etwa `/` — kommt an der
 * Routensperre vorbei und würde die Aktion ausführen. Hier endet das:
 * ohne Datenbank- und ohne Stripe-Client hat keine dieser Aktionen
 * etwas zu tun.
 *
 * **`redirect()` statt `throw`, und das ist keine Kosmetik.** Ein
 * geworfener Fehler bricht das Vorab-Rendern beim Build ab — die
 * Dashboard-Seiten werden dabei angefasst, und der Build endete mit
 * „Export encountered an error". `redirect()` ist der von Next
 * vorgesehene Weg, aus einer Server Component, einer Server Action oder
 * einem Route Handler auszusteigen; beim Vorab-Rendern wird daraus eine
 * Weiterleitung statt eines Fehlers. Ziel ist die Startseite, weil sie
 * während des Soft-Launches die einzige Antwort ist, die diese Website
 * geben kann.
 *
 * Der Schalter selbst und die Routenliste stehen in
 * `src/lib/soft-launch.ts`; diese Datei fügt nur das Verhalten hinzu.
 */
export function verlangeSoftLaunchFrei(): void {
  if (softLaunchAktiv()) redirect("/");
}
