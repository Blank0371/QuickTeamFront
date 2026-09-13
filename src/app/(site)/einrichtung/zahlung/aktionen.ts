"use server";

import { redirect } from "next/navigation";

import { holeValidierung } from "@/i18n/server";
import { holeAbo } from "@/lib/abo";
import { holeChefBetriebId, holeRechnungsangaben, type Rechnungsangaben } from "@/lib/betrieb";
import { feldFehler, type FormZustand } from "@/lib/formular";
import {
  erstelleAbo,
  holeAboFuerBetrieb,
  holeOderErstelleKunde,
  setzeUid,
  wechslePlan,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { planOderBasic, uidSchema } from "@/lib/validierung";

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
  /**
   * Name und Land des Betriebs. Stripe Tax braucht das Land als
   * Steuerstandort; ohne es lehnt Stripe ein Abo mit `automatic_tax` ab.
   */
  rechnung: Rechnungsangaben | null;
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
    rechnung: await holeRechnungsangaben(supabase, betriebId),
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
 *
 * Seit dem 2026-09-13 steht der Kunde vor dem Abo fest: erst Land und
 * gegebenenfalls UID-Nummer an den Stripe-Kunden, dann das Abo mit
 * `automatic_tax`. In umgekehrter Reihenfolge berechnete Stripe Tax die
 * Steuer auf einem Kunden ohne Standort oder ohne Reverse-Charge-Grundlage.
 */
export async function planWaehlen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { betriebId, email, kundeId, rechnung } = await kontext();
  const plan = planOderBasic(formData.get("plan"));
  const ueberspringen = formData.get("absicht") === "ueberspringen";

  /*
   * Die UID wird nur für österreichische Betriebe angenommen — dasselbe
   * Kriterium, nach dem die Seite das Feld zeigt. Ein hereingereichter
   * Wert eines deutschen Betriebs wird nicht geprüft, sondern ignoriert.
   */
  let uid: string | null = null;
  if (rechnung?.land === "AT") {
    const roh = String(formData.get("uid") ?? "");
    const geprueft = uidSchema.safeParse({ uid: roh });
    if (!geprueft.success) {
      return {
        status: "fehler",
        nachricht: null,
        felder: feldFehler(geprueft.error, await holeValidierung()),
        werte: { uid: roh, plan },
      };
    }
    uid = geprueft.data.uid || null;
  }

  try {
    const kunde = await holeOderErstelleKunde({ betriebId, email, kundeId, rechnung });
    await setzeUid(kunde.id, uid);

    const vorhanden = await holeAboFuerBetrieb({ betriebId, email, kundeId });

    if (vorhanden) {
      // Zweiter Durchgang: es gibt schon ein Abo. Dann nicht noch eins,
      // sondern höchstens den Posten umstellen.
      await wechslePlan(vorhanden, plan);
    } else {
      await erstelleAbo({ betriebId, plan, email, kundeId, rechnung });
    }
  } catch (ursache) {
    protokolliere("planWaehlen", ursache);
    return fehler(
      "Der gewählte Plan liess sich gerade nicht einrichten. Versuch es in einem Moment noch einmal — bleibt der Fehler, meld dich beim Support.",
    );
  }

  redirect(ueberspringen ? "/einrichtung" : "/einrichtung/zahlung?zahlen=1");
}
