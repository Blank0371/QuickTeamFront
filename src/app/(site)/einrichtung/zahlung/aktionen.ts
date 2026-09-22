"use server";

import { redirect } from "next/navigation";

import { holeValidierung } from "@/i18n/server";
import { holeAbo } from "@/lib/abo";
import { leseAbrechnung, vergissAbrechnung } from "@/lib/abrechnung-merker";
import { holeChefBetriebId, holeRechnungsangaben, type Rechnungsangaben } from "@/lib/betrieb";
import { feldFehler, type FormZustand } from "@/lib/formular";
import {
  erstelleAbo,
  holeAboFuerBetrieb,
  holeOderErstelleKunde,
  intervallVonAbo,
  merkePendingWahl,
  pruefePromotionCode,
  setzeUid,
  suchePendingKunde,
  wechslePlan,
} from "@/lib/stripe";
import { ABRECHNUNG_STANDARD, alsAbrechnung } from "@/lib/site";
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
  if (betriebId === null) redirect("/einrichtung/betrieb");

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
 * Seit dem 2026-09-14 gibt es die Testphase nur beim ersten Abo eines
 * Betriebs; wer nach einer Kündigung neu abschliesst, zahlt sofort und
 * kann nicht überspringen (`erstelleAbo`).
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

  /*
   * Monatlich oder jährlich: seit dem 2026-09-21 wählt der Umschalter in
   * Schritt 2 das Intervall unmittelbar (Feld `intervall`). Der Wert aus
   * dem Formular geht dem Preisseiten-Cookie (`abrechnung-merker.ts`) vor;
   * fehlt er, gilt weiterhin das Cookie und, ohne Cookie, der monatliche
   * Standard bzw. das Intervall eines bestehenden Abos (siehe unten).
   * `wechslePlan` unten setzt damit auch einen echten Intervall-Wechsel
   * eines schon bestehenden Abos um.
   */
  const ausFormular = formData.get("intervall");
  const gewaehlt =
    ausFormular != null ? alsAbrechnung(ausFormular) : await leseAbrechnung();

  /*
   * Die UID/USt-IdNr wird für Betriebe **beider** Länder angenommen
   * (Kursänderung 2026-09-21) — dasselbe Kriterium, nach dem die Seite das
   * Feld zeigt. In Schritt 2 ist sie noch freiwillig (der Test ist
   * kostenlos); Pflicht wird sie erst am Rechnungstor. Das Feldschema
   * lässt beide Formate und den leeren String zu.
   */
  let uid: string | null = null;
  if (rechnung && (rechnung.land === "AT" || rechnung.land === "DE")) {
    const roh = String(formData.get("uid") ?? "");
    const geprueft = uidSchema.safeParse({ uid: roh });
    if (!geprueft.success) {
      return {
        status: "fehler",
        nachricht: null,
        felder: feldFehler(geprueft.error, await holeValidierung()),
        werte: { uid: roh, plan, coupon: String(formData.get("coupon") ?? "") },
      };
    }
    uid = geprueft.data.uid || null;
  }

  /*
   * Stripe-Rabattcode (echter `promotion_code`, nicht der interne
   * Partner-Promo-Code). Freiwillig; leer heisst „keiner". Ein nicht
   * leerer, aber unbekannter/inaktiver Code ist ein Feldfehler — sonst
   * dächte der Kunde, der Rabatt greife, und zahlte den vollen Preis.
   */
  const couponRoh = String(formData.get("coupon") ?? "").trim();
  let promotionCodeId: string | null = null;
  if (couponRoh.length > 0) {
    promotionCodeId = await pruefePromotionCode(couponRoh);
    if (promotionCodeId === null) {
      const v = await holeValidierung();
      return {
        status: "fehler",
        nachricht: null,
        felder: { coupon: v["v.coupon.unbekannt"] },
        werte: { uid: String(formData.get("uid") ?? ""), plan, coupon: couponRoh },
      };
    }
  }

  try {
    const kunde = await holeOderErstelleKunde({ betriebId, email, kundeId, rechnung });
    await setzeUid(kunde.id, uid);

    const vorhanden = await holeAboFuerBetrieb({ betriebId, email, kundeId });

    /*
     * Zweiter Durchgang: es gibt schon ein Abo. Dann nicht noch eins,
     * sondern höchstens den Posten umstellen. Ein noch unbezahltes
     * (`incomplete`) geht an `erstelleAbo`, das es bei anderem Plan
     * ersetzt statt umstellt — siehe dort.
     */
    if (vorhanden && vorhanden.status !== "incomplete") {
      await wechslePlan(vorhanden, plan, gewaehlt ?? intervallVonAbo(vorhanden));
    } else {
      await erstelleAbo({
        betriebId,
        plan,
        intervall: gewaehlt ?? ABRECHNUNG_STANDARD,
        email,
        kundeId,
        rechnung,
        promotionCodeId,
      });
    }

    /*
     * Das Abo trägt das Intervall jetzt selbst (am Stripe-Price) — der
     * Merker hat ausgedient. Erst hier gelöscht, nicht schon beim Lesen:
     * scheitert das Anlegen und der Betrieb versucht es erneut, soll die
     * einmal getroffene Wahl noch stehen.
     */
    await vergissAbrechnung();
  } catch (ursache) {
    protokolliere("planWaehlen", ursache);
    return fehler(
      "Der gewählte Plan liess sich gerade nicht einrichten. Versuch es in einem Moment noch einmal — bleibt der Fehler, meld dich beim Support.",
    );
  }

  /*
   * Seit dem 2026-09-22 gibt es keine Testphase und kein Überspringen mehr:
   * jedes Abo ist sofort fällig, die erste Rechnung wird beim Hinterlegen
   * des Zahlungsmittels bezahlt. Weiter geht es also immer zur Zahlung.
   */
  redirect("/einrichtung/zahlung?zahlen=1");
}

/**
 * Parkt Plan, Intervall und Rabattcode für den **noch nicht angelegten**
 * Betrieb (Pending-Weg). Anders als `planWaehlen` entsteht hier kein Abo —
 * das legt erst `betriebAbschliessen` an, wenn die Karte bestätigt ist.
 */
export async function planMerken(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/registrieren");

  const kunde = await suchePendingKunde({ userId: user.id, email: user.email ?? "" });
  if (!kunde) redirect("/einrichtung/betrieb");

  const plan = planOderBasic(formData.get("plan"));
  const ausFormular = formData.get("intervall");
  const intervall = ausFormular != null ? alsAbrechnung(ausFormular) : await leseAbrechnung();

  /*
   * Stripe-Rabattcode (echter `promotion_code`). Freiwillig; ein nicht
   * leerer, aber unbekannter Code ist ein Feldfehler. Die geprüfte ID wird
   * geparkt und beim Abschluss aufs neue Abo gelegt.
   */
  const couponRoh = String(formData.get("coupon") ?? "").trim();
  let promotionCodeId: string | null = null;
  if (couponRoh.length > 0) {
    promotionCodeId = await pruefePromotionCode(couponRoh);
    if (promotionCodeId === null) {
      const v = await holeValidierung();
      return {
        status: "fehler",
        nachricht: null,
        felder: { coupon: v["v.coupon.unbekannt"] },
        werte: { plan, coupon: couponRoh },
      };
    }
  }

  try {
    await merkePendingWahl({
      kundeId: kunde.id,
      plan,
      intervall: intervall ?? ABRECHNUNG_STANDARD,
      promotionCodeId,
    });
    await vergissAbrechnung();
  } catch (ursache) {
    protokolliere("planMerken", ursache);
    return fehler(
      "Der gewählte Plan liess sich gerade nicht übernehmen. Versuch es in einem Moment noch einmal.",
    );
  }

  redirect("/einrichtung/zahlung?zahlen=1");
}
