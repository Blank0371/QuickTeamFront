import Stripe from "stripe";
import type { Rechnungsangaben } from "@/lib/betrieb";
import { plaene, type Abrechnung, type PlanId } from "@/lib/site";
import type { LandCode } from "@/lib/validierung";
import { verlaufFuerKunde } from "@/lib/stripe-abo";
import { BETRIEB_SCHLUESSEL, priceIdFuer, stripeKlient } from "@/lib/stripe-konfiguration";
import { stelleSteuerstandortSicher } from "@/lib/stripe-rechnung";
import { bezahleOffeneRechnung, type AblehnungsArt } from "@/lib/stripe-zahlung";

/**
 * Schlüssel für einen **noch nicht angelegten** Betrieb.
 *
 * Seit dem 2026-09-22 entsteht die `betriebe`-Zeile erst, wenn Stripe die
 * Zahlung bestätigt hat (Nutzerwunsch: kein halber Betrieb in der DB). Bis
 * dahin gibt es keine `betrieb_id`, an der Kunde und Abo hängen könnten —
 * beide werden stattdessen über die Auth-User-ID des Chefs zugeordnet, und
 * die Betriebsdaten aus Schritt 1 reisen in der Kunden-Metadata mit. Beim
 * Anlegen des Betriebs wandert die Zuordnung von hier auf `BETRIEB_SCHLUESSEL`
 * (`verknuepfePendingMitBetrieb`).
 */
export const PENDING_SCHLUESSEL = "pending_user";

/** Metadata-Schlüssel der zwischengeparkten Betriebsdaten (Schritt 1/2). */
const P = {
  name: "p_name",
  land: "p_land",
  vorname: "p_vorname",
  nachname: "p_nachname",
  promo: "p_promo",
  plan: "p_plan",
  intervall: "p_intervall",
  promotion: "p_promotion",
} as const;

/** Die in der Kunden-Metadata geparkten Betriebs- und Planangaben. */
export type PendingBetrieb = {
  name: string;
  land: LandCode;
  vorname: string;
  nachname: string;
  /** Interner Partner-Promo-Code (nicht der Stripe-Rabattcode). */
  promoCode: string | null;
  plan: PlanId | null;
  intervall: Abrechnung | null;
  /** ID eines geprüften Stripe-`promotion_code`, oder `null`. */
  promotionCodeId: string | null;
};

/* ------------------------------------------------------------------ */
/* Pending-Betrieb: Kunde und Abo vor dem Anlegen des Betriebs         */
/* ------------------------------------------------------------------ */

/**
 * Findet den Stripe-Kunden, hinter dem der noch nicht angelegte Betrieb
 * dieser Person zwischengeparkt ist — rein lesend, ohne anzulegen.
 *
 * Erkennungsmerkmal: `pending_user` in der Metadata gleich der Auth-User-ID
 * **und** noch keine `betrieb_id`. Nach dem Anlegen des Betriebs trägt der
 * Kunde `betrieb_id` und gilt nicht mehr als pending.
 */
export async function suchePendingKunde({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<Stripe.Customer | null> {
  return (await listePendingLage({ userId, email })).pending;
}

async function listePendingLage({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<{ pending: Stripe.Customer | null; bisherige: number }> {
  const vorhandene = await stripeKlient().customers.list({ email, limit: 100 });
  const pending =
    vorhandene.data.find(
      (kunde) =>
        !kunde.deleted &&
        kunde.metadata?.[PENDING_SCHLUESSEL] === userId &&
        !kunde.metadata?.[BETRIEB_SCHLUESSEL],
    ) ?? null;
  return { pending, bisherige: vorhandene.data.length };
}

/**
 * Findet den Pending-Kunden oder legt ihn an und schreibt die
 * Betriebsdaten aus Schritt 1 in seine Metadata.
 *
 * Der Kunde trägt Land (für Stripe Tax) und den Betriebsnamen; die vollen
 * Rechnungsangaben kommen erst in Schritt 2. Ein erneuter Aufruf
 * aktualisiert die geparkten Werte, statt einen zweiten Kunden anzulegen.
 */
export async function holeOderErstellePendingKunde({
  userId,
  email,
  info,
}: {
  userId: string;
  email: string;
  info: {
    name: string;
    land: LandCode;
    vorname: string;
    nachname: string;
    promoCode: string | null;
  };
}): Promise<Stripe.Customer> {
  const stripe = stripeKlient();
  const geparkt: Record<string, string> = {
    [PENDING_SCHLUESSEL]: userId,
    [P.name]: info.name,
    [P.land]: info.land,
    [P.vorname]: info.vorname,
    [P.nachname]: info.nachname,
    [P.promo]: info.promoCode ?? "",
  };

  const { pending: vorhanden, bisherige } = await listePendingLage({ userId, email });
  if (vorhanden) {
    return stripe.customers.update(vorhanden.id, {
      name: info.name,
      address: { country: info.land },
      metadata: geparkt,
    });
  }

  return stripe.customers.create(
    {
      email,
      name: info.name,
      address: { country: info.land },
      preferred_locales: ["de"],
      metadata: geparkt,
    },
    /*
     * Die Anzahl der Kunden unter dieser Adresse steht im Schlüssel (wie
     * beim Abo). Ohne sie liefe ein zweiter Betrieb binnen 24 Stunden —
     * der erste ist verknüpft oder gelöscht, der Kunde also nicht mehr
     * pending — auf denselben Schlüssel: bei anderen Angaben wirft Stripe
     * wegen abweichender Parameter, bei gleichen kommt der alte, schon an
     * einen Betrieb gebundene Kunde zurück.
     */
    { idempotencyKey: `pending:${userId}:kunde:${bisherige}` },
  );
}

/** Parkt Plan, Intervall und geprüften Rabattcode am Pending-Kunden. */
export async function merkePendingWahl({
  kundeId,
  plan,
  intervall,
  promotionCodeId,
}: {
  kundeId: string;
  plan: PlanId;
  intervall: Abrechnung;
  promotionCodeId: string | null;
}): Promise<void> {
  await stripeKlient().customers.update(kundeId, {
    metadata: {
      [P.plan]: plan,
      [P.intervall]: intervall,
      [P.promotion]: promotionCodeId ?? "",
    },
  });
}

/** Liest die geparkten Betriebs- und Planangaben aus der Kunden-Metadata. */
export function lesePendingBetrieb(kunde: Stripe.Customer): PendingBetrieb | null {
  const m = kunde.metadata ?? {};
  const name = m[P.name];
  const land = m[P.land] === "AT" || m[P.land] === "DE" ? (m[P.land] as LandCode) : null;
  if (!name || !land) return null;

  const plan = plaene.find((p) => p.id === m[P.plan])?.id ?? null;
  const intervall =
    m[P.intervall] === "jahr" ? "jahr" : m[P.intervall] === "monat" ? "monat" : null;

  return {
    name,
    land,
    vorname: m[P.vorname] ?? "",
    nachname: m[P.nachname] ?? "",
    promoCode: m[P.promo] || null,
    plan,
    intervall,
    promotionCodeId: m[P.promotion] || null,
  };
}

/**
 * Wo steht die Einrichtung eines noch nicht angelegten Betriebs? Nur
 * lesend, für die Wiedereinstiegs-Ableitung.
 *
 *   - kein Pending-Kunde → Schritt 1 (Betriebsdaten fehlen)
 *   - Pending-Kunde      → Schritt 2 (Zahlung); ein dort schon bezahltes
 *                          Abo findet `schliessePendingAbo` wieder und
 *                          schliesst ab, statt ein zweites anzulegen
 *
 * Bis 2026-09-28 las das auch das lebende Abo (`aboBereit`, `aboId`) —
 * ein `subscriptions.list` je Stepper-Seite, dessen Ergebnis kein
 * Aufrufer verwendete.
 */
export type PendingLage = {
  kunde: Stripe.Customer | null;
};

export async function holePendingLage({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<PendingLage> {
  return { kunde: await suchePendingKunde({ userId, email }) };
}

/**
 * Legt das Abo des noch nicht angelegten Betriebs an und bezahlt die erste
 * Rechnung sofort mit der eben bestätigten Zahlungsmethode.
 *
 * Kein Trial: die Erstrechnung ist sofort fällig (ein 100-%-Rabattcode macht
 * sie 0,00). Bei Erfolg ist das Abo `active`; erst dann legt der Aufrufer
 * den Betrieb an und verknüpft ihn (`verknuepfePendingMitBetrieb`).
 *
 * Ein bereits lebendes Abo desselben Plans wird nicht ein zweites Mal
 * angelegt, sondern nur (erneut) bezahlt — das fängt einen Doppelklick ab.
 */
export async function schliessePendingAbo({
  userId,
  kundeId,
  plan,
  intervall,
  promotionCodeId,
  zahlungsmittelId,
  rechnung,
}: {
  userId: string;
  kundeId: string;
  plan: PlanId;
  intervall: Abrechnung;
  promotionCodeId: string | null;
  zahlungsmittelId: string;
  rechnung: Rechnungsangaben | null;
}): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();
  const preis = priceIdFuer(plan, intervall);
  const ablehnung: AblehnungsArt = "nicht-gestartet";

  await stelleSteuerstandortSicher(kundeId, rechnung);
  await stripe.customers.update(kundeId, {
    invoice_settings: { default_payment_method: zahlungsmittelId },
  });

  const { lebend, anzahl } = await verlaufFuerKunde(kundeId);
  if (lebend) {
    if (lebend.items.data[0]?.price.id === preis) {
      const abo = await stripe.subscriptions.update(lebend.id, {
        default_payment_method: zahlungsmittelId,
      });
      return bezahleOffeneRechnung(abo, ablehnung);
    }
    // Plan gewechselt, altes (noch unbezahltes) Abo verwerfen.
    await stripe.subscriptions.cancel(lebend.id);
  }

  const abo = await stripe.subscriptions.create(
    {
      customer: kundeId,
      items: [{ price: preis }],
      default_payment_method: zahlungsmittelId,
      payment_behavior: "default_incomplete",
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
      payment_settings: { save_default_payment_method: "on_subscription" },
      automatic_tax: { enabled: true },
      expand: ["latest_invoice"],
      metadata: { [PENDING_SCHLUESSEL]: userId },
    },
    /*
     * Derselbe Schlüsselaufbau wie in `erstelleAbo` (dort begründet). Ohne
     * ihn sahen zwei Tabs, die gleichzeitig abschliessen, beide „kein
     * lebendes Abo" und legten zwei an — beide sofort bezahlt. Mit ihm
     * bekommt der zweite Aufruf dasselbe Abo zurück oder, bei anderem
     * Zahlungsmittel, einen Idempotenzfehler statt einer zweiten Abbuchung.
     */
    {
      idempotencyKey: `pending:${userId}:abo:${plan}:${intervall}:${anzahl}${
        promotionCodeId ? ":r" : ""
      }`,
    },
  );

  return bezahleOffeneRechnung(abo, ablehnung);
}

/**
 * Verschiebt die Zuordnung von der Auth-User-ID auf den frisch angelegten
 * Betrieb: `betrieb_id` an Kunde und Abo, Pending-Felder geleert.
 *
 * Das `subscriptions.update` mit neuer `betrieb_id` löst
 * `customer.subscription.updated` aus — **daran** schreibt der Webhook die
 * Zeile in `betrieb_abonnements` (die der Insert-Trigger schon angelegt hat).
 * So bleibt der Webhook die einzige Stelle, die diese Tabelle schreibt.
 */
export async function verknuepfePendingMitBetrieb({
  kundeId,
  aboId,
  betriebId,
}: {
  kundeId: string;
  aboId: string;
  betriebId: string;
}): Promise<void> {
  const stripe = stripeKlient();

  const geleert = {
    [BETRIEB_SCHLUESSEL]: betriebId,
    [PENDING_SCHLUESSEL]: "",
    [P.name]: "",
    [P.land]: "",
    [P.vorname]: "",
    [P.nachname]: "",
    [P.promo]: "",
    [P.plan]: "",
    [P.intervall]: "",
    [P.promotion]: "",
  };

  /*
   * Erst das Abo, dann der Kunde. Umgekehrt liess ein Fehler zwischen den
   * beiden Aufrufen ein Abo ohne `betrieb_id` zurück, das der Webhook nie
   * zuordnen kann — und der Kunde galt schon nicht mehr als „pending", ein
   * erneuter Versuch fand ihn nicht. So bleibt er „pending", und derselbe
   * Abschluss läuft beim nächsten Klick durch (Abo wiedergefunden, Betrieb
   * `vorhanden`).
   */
  await stripe.subscriptions.update(aboId, {
    metadata: { [BETRIEB_SCHLUESSEL]: betriebId, [PENDING_SCHLUESSEL]: "" },
  });
  await stripe.customers.update(kundeId, { metadata: geleert });
}
