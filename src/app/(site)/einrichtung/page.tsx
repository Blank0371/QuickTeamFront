import { redirect } from "next/navigation";

import { ermittleStand, pfadFuer } from "@/lib/einrichtung";

export const dynamic = "force-dynamic";

/**
 * Der Einstiegspunkt: `/einrichtung` zeigt selbst nichts, sondern schickt
 * dorthin, wo diese Person gerade steht.
 *
 * Damit gibt es genau eine Adresse, die man sich merken oder verlinken
 * kann, ohne wissen zu müssen, wie weit jemand gekommen ist — Login,
 * Bestätigung und ein Lesezeichen laufen alle hierüber.
 */
export default async function EinrichtungSeite() {
  const stand = await ermittleStand();

  if (stand === "nicht-angemeldet") redirect("/registrieren");

  /*
   * Seit dem 2026-09-22: ein angemeldetes Konto ohne eigenen Betrieb wird
   * **nicht** in die Betrieb-Anlage gezwungen, sondern landet auf seiner
   * Übersicht (`/dashboard/wechseln`) — dort stehen Mitgliedschaften und
   * Einladungen, und von dort führt der Knopf „Betrieb einrichten" bewusst
   * nach `/einrichtung/betrieb`. `/einrichtung` ohne Betrieb heisst „bring
   * mich nach Hause", nicht „leg jetzt einen Betrieb an".
   */
  if (stand.betriebId === null) redirect("/dashboard/wechseln");

  redirect(pfadFuer(stand));
}
