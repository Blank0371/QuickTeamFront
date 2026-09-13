"use server";

import { redirect } from "next/navigation";

import { holeAbo } from "@/lib/abo";
import { holeChefBetriebId } from "@/lib/betrieb";
import type { FormZustand } from "@/lib/formular";
import { erstelleAbo, holeAboFuerBetrieb, wechslePlan } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { planOderBasic } from "@/lib/validierung";

/**
 * Server Actions von Schritt 2.
 *
 * Geschrieben wird hier ausschliesslich bei Stripe. Die Zeile in
 * `betrieb_abonnements` rührt allein der Webhook an — deshalb steht nach
 * keiner dieser Aktionen der neue Stand sofort in unserer Datenbank, und
 * deshalb fragt die Wiedereinstiegs-Ableitung bei leerer
 * `stripe_subscription_id` direkt bei Stripe nach.
 */

type Kontext = {
  betriebId: string;
  email: string;
  /**
   * `betrieb_abonnements.stripe_customer_id`, oder `null`, solange der
   * Webhook noch nicht gelaufen ist.
   *
   * Steht hier und nicht in den einzelnen Aktionen, weil jede von ihnen
   * denselben Wert braucht: seit dem 2026-08-28 sucht `sucheKunde()` den
   * Stripe-Kunden zuerst über diese ID und erst danach über die
   * E-Mail-Adresse. Wer sie nicht mitgibt, bekommt stillschweigend das
   * alte Verhalten — und damit das Risiko eines zweiten Abos, wenn
   * jemand seine Anmelde-Adresse geändert hat.
   */
  kundeId: string | null;
};

/** Session und Betrieb — ohne beides gibt es hier nichts zu tun. */
async function kontext(): Promise<Kontext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const betriebId = await holeChefBetriebId(supabase);
  if (betriebId === null) redirect("/einrichtung/konto");

  const abo = await holeAbo(supabase, betriebId);

  return {
    betriebId,
    email: user.email ?? "",
    kundeId: abo?.stripe_customer_id ?? null,
  };
}

function fehler(nachricht: string): FormZustand {
  return { status: "fehler", nachricht, felder: {} };
}

function protokolliere(stelle: string, ursache: unknown): void {
  const text = ursache instanceof Error ? ursache.message : String(ursache);
  console.error(`[zahlung] ${stelle}: ${text}`);
}

/**
 * Legt das Abonnement an — oder passt den Plan eines bestehenden an.
 *
 * Beide Knöpfe des Plan-Formulars landen hier, „Weiter zur Zahlung" und
 * „Später hinterlegen". Der Unterschied ist allein das Ziel danach: das
 * Abonnement entsteht in beiden Fällen, weil es der Träger der Testphase
 * ist und nicht der Beleg einer Zahlung.
 */
export async function planWaehlen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { betriebId, email, kundeId } = await kontext();
  const plan = planOderBasic(formData.get("plan"));
  const ueberspringen = formData.get("absicht") === "ueberspringen";

  try {
    const vorhanden = await holeAboFuerBetrieb({ betriebId, email, kundeId });

    if (vorhanden) {
      // Zweiter Durchgang: es gibt schon ein Abo. Dann nicht noch eins,
      // sondern höchstens den Posten umstellen.
      await wechslePlan(vorhanden, plan);
    } else {
      await erstelleAbo({ betriebId, plan, email, kundeId });
    }
  } catch (ursache) {
    protokolliere("planWaehlen", ursache);
    return fehler(
      "Der gewählte Plan liess sich gerade nicht einrichten. Versuch es in einem Moment noch einmal — bleibt der Fehler, meld dich beim Support.",
    );
  }

  redirect(ueberspringen ? "/einrichtung" : "/einrichtung/zahlung?zahlen=1");
}
