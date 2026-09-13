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

  if (stand === "nicht-angemeldet") redirect("/einrichtung/konto");

  redirect(pfadFuer(stand));
}
