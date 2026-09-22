import Stripe from "stripe";

import type { Rechnungsangaben } from "@/lib/betrieb";
import { plaene, type Abrechnung, type PlanId } from "@/lib/site";
import type { LandCode } from "@/lib/validierung";
import type { RechnungsProfil } from "@/lib/rechnung-pruefung";
import { verlangeSoftLaunchFrei } from "@/lib/soft-launch-riegel";

/**
 * Alles, was mit Stripe spricht — ausser dem Webhook, der wegen des
 * `service_role`-Keys bewusst für sich steht.
 *
 * Diese Datei ist serverseitig. Sie wird ausschliesslich aus Server
 * Actions und Server Components importiert; ein Import aus einer
 * `"use client"`-Datei zöge das ganze Stripe-SDK und damit den Secret Key
 * ins Browser-Bundle. Wer hier etwas ergänzt, prüft danach mit
 * `grep -r "sk_test" .next-build/static`, dass nichts hinübergerutscht ist.
 *
 * Geschrieben wird hier ausschliesslich bei Stripe, nie in unserer
 * Datenbank. Die Zeile in `betrieb_abonnements` rührt allein der Webhook
 * an — siehe CLAUDE.md.
 */

/** Schlüssel, unter dem die Betriebszuordnung an Stripe-Objekten hängt. */
const BETRIEB_SCHLUESSEL = "betrieb_id";

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
const PENDING_SCHLUESSEL = "pending_user";

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

/**
 * Eine fehlende Konfiguration ist kein Nutzerfehler und keine Ausnahme,
 * die man wegfangen sollte — sie gehört ins Log und auf eine ehrliche
 * Fehlerseite. Ein stiller Ausweichplan auf einen anderen Plan wäre das
 * Schlimmste: dann kauft jemand Business und bekommt Basic.
 */
export class KonfigurationsFehler extends Error {
  constructor(nachricht: string) {
    super(nachricht);
    this.name = "KonfigurationsFehler";
  }
}

/**
 * Statische Zugriffe, kein dynamischer Index über Plan-Namen oder Intervall
 * — sonst kann Next beim Bündeln nichts einsetzen und die Werte sind zur
 * Laufzeit leer. Die Aufzählung ist über `PlanId` vollständig; kommt ein
 * vierter Plan dazu, meldet sich der Compiler hier.
 *
 * Ein Plan hat zwei Preise: die Basisvariable ist der Monatspreis, die
 * `_JAHR`-Variante der Jahrespreis (Jahresabo seit dem 2026-09-17). Das
 * Intervall ist damit eine zweite Dimension neben dem Plan und **keine**
 * eigene Plan-ID — siehe `Abrechnung` in `src/lib/site.ts`.
 */
function priceIdAusEnv(plan: PlanId, intervall: Abrechnung): string {
  const jahr = intervall === "jahr";
  switch (plan) {
    case "basic":
      return (jahr ? process.env.STRIPE_PRICE_BASIC_JAHR : process.env.STRIPE_PRICE_BASIC)?.trim() ?? "";
    case "pro":
      return (jahr ? process.env.STRIPE_PRICE_PRO_JAHR : process.env.STRIPE_PRICE_PRO)?.trim() ?? "";
    case "business":
      return (jahr ? process.env.STRIPE_PRICE_BUSINESS_JAHR : process.env.STRIPE_PRICE_BUSINESS)?.trim() ?? "";
  }
}

/** Wirft mit dem Namen der fehlenden Variablen, nicht mit „undefined". */
export function priceIdFuer(plan: PlanId, intervall: Abrechnung): string {
  const priceId = priceIdAusEnv(plan, intervall);
  if (priceId.length === 0) {
    const variable = `STRIPE_PRICE_${plan.toUpperCase()}${intervall === "jahr" ? "_JAHR" : ""}`;
    throw new KonfigurationsFehler(
      `Für den Plan "${plan}" (${intervall === "jahr" ? "jährlich" : "monatlich"}) ist keine ` +
        `Stripe-Price-ID hinterlegt. Erwartet wird ${variable} in der Umgebung.`,
    );
  }
  return priceId;
}

/**
 * Rückweg: von der Price-ID auf unseren Plan.
 *
 * Der Webhook nimmt diesen Weg statt `subscription.metadata.plan` zu
 * lesen. Metadaten wären eine zweite Wahrheit, die beim Planwechsel
 * mitgepflegt werden müsste — der Preis am Abo dagegen *ist* der Plan.
 * Wer im Stripe-Dashboard den Posten ändert, ändert damit auch das, was
 * bei uns steht, und nicht nur die Hälfte davon.
 *
 * `null`, wenn der Preis keiner der bekannten ist. Das ist kein Fehler,
 * sondern eine Beobachtung: dann gehört das Abo nicht zu unseren Plänen,
 * und wir schreiben lieber nichts als etwas Geratenes.
 *
 * Beide Intervalle desselben Plans führen auf **dieselbe** Plan-ID —
 * `betrieb_abonnements.plan` kennt kein Intervall, das steht am Price. Ein
 * Betrieb, der von monatlich auf jährlich wechselt, bleibt also `pro`, und
 * der Webhook schreibt nichts Falsches.
 */
export function planAusPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of plaene) {
    if (priceIdAusEnv(plan.id, "monat") === priceId || priceIdAusEnv(plan.id, "jahr") === priceId) {
      return plan.id;
    }
  }
  return null;
}

/**
 * **Zweite Ebene der Soft-Launch-Sperre**, aus demselben Grund wie in
 * `src/lib/supabase/server.ts`: während des Soft-Launches wird kein
 * Vertrag geschlossen, also spricht auch nichts mit Stripe. Der Webhook
 * ist davon nicht betroffen — er erzeugt seinen Client selbst und
 * bedient bestehende Abonnements.
 */
export function stripeKlient(): Stripe {
  verlangeSoftLaunchFrei();
  return stripeKlientOhneRiegel();
}

/**
 * Derselbe Client ohne Soft-Launch-Sperre — nur für Arbeit an **bestehenden**
 * Abonnements, die keinen Vertrag schliesst. Zwei Aufrufer:
 * `beendeUeberfaelligePausen()` (Cron) und die Kontolöschung über
 * `klientFuer()` unten. Die Begründung ist dieselbe wie beim Webhook in
 * `soft-launch.ts`.
 */
function stripeKlientOhneRiegel(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (secret.length === 0) {
    throw new KonfigurationsFehler("STRIPE_SECRET_KEY fehlt in der Umgebung.");
  }
  return new Stripe(secret);
}

/**
 * Der Client für die Lesewege, die auch die **Datenlöschung** geht.
 *
 * `trotzSoftLaunch` ist kein Bequemlichkeitsschalter, sondern der einzige
 * Weg, auf dem `/kontoloeschung` während des Soft-Launches überhaupt
 * arbeiten kann: `stripeKlient()` leitet dort auf `/` um, und ein
 * ungeprüftes Abo lässt `fuehreLoeschungAus()` die Löschung verweigern —
 * ausgerechnet für Chefs, also für die, bei denen etwas abgebucht wird.
 * Die Begründung im Ganzen steht an `createClientOhneRiegel()` in
 * `src/lib/supabase/server.ts`.
 *
 * Bewusst ein durchgereichtes Argument und kein globaler Zustand: so
 * steht an jeder Aufrufstelle im Klartext, ob sie an der Sperre vorbei
 * arbeitet, und der Compiler zeigt beim Suchen jede einzelne.
 */
function klientFuer(trotzSoftLaunch: boolean): Stripe {
  return trotzSoftLaunch ? stripeKlientOhneRiegel() : stripeKlient();
}

/* ------------------------------------------------------------------ */
/* Kunde                                                               */
/* ------------------------------------------------------------------ */

/**
 * Findet den Stripe-Kunden zu diesem Betrieb — ohne ihn anzulegen.
 *
 * Getrennt von `holeOderErstelleKunde`, weil die Trennung hier
 * verhaltensrelevant ist: die Wiedereinstiegs-Ableitung fragt bei jedem
 * Seitenaufruf, ob es ein Abo gibt. Liefe das über die anlegende Variante,
 * entstünde allein durchs Hinschauen ein Stripe-Kunde — für jeden, der die
 * Einrichtung nur öffnet und wieder verlässt. Lesewege legen nichts an.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Wege, in dieser Reihenfolge — und die Reihenfolge ist der Punkt.
 * ─────────────────────────────────────────────────────────────────────
 *
 * **1. Die gespeicherte `stripe_customer_id`** aus `betrieb_abonnements`,
 * geschrieben vom Webhook. Sie ist die einzige Angabe, die einen Betrieb
 * dauerhaft mit seinem Stripe-Kunden verbindet.
 *
 * **2. Erst wenn die fehlt: die Suche über die E-Mail-Adresse.**
 *
 * Bis zum 2026-08-28 gab es nur den zweiten Weg, und darin lag ein
 * stiller Fehler: die Adresse ist **kein stabiler Schlüssel.** Ändert ein
 * Chef seine Anmelde-Adresse, sucht `customers.list({ email })` mit der
 * neuen und findet den unter der alten angelegten Kunden nicht mehr. Für
 * die Aufrufer heisst `null` aber „kein Kunde, also kein Abo" — es
 * entstünde ein zweiter Kunde und, sobald der 24-Stunden-Idempotenz-
 * schlüssel aus `erstelleAbo` abgelaufen ist, **ein zweites Abonnement
 * neben dem laufenden.** Doppelte Abbuchung, ohne dass irgendwo ein
 * Fehler geworfen würde. Die gespeicherte ID hat das Problem nicht: sie
 * ändert sich nie.
 *
 * **Der Fallback bleibt trotzdem**, für genau ein Fenster: zwischen dem
 * Anlegen des allerersten Kunden und dem ersten Webhook-Durchlauf steht
 * in unserer Zeile noch nichts. Wer in diesen Sekunden neu lädt, erzeugte
 * ohne ihn einen zweiten Kunden — also denselben Fehler, nur eine
 * Sekunde früher.
 *
 * **Auch der gespeicherten ID wird die Zugehörigkeit nicht geglaubt.**
 * Beide Wege prüfen am Ende dasselbe: steht `betrieb_id` in den Metadaten
 * des Kunden. Eine ID, die auf einen fremden oder gelöschten Kunden
 * zeigt, fällt damit auf die Suche zurück, statt ein Abo an den falschen
 * Kunden zu hängen — dieselbe Haltung wie beim Positions-Cookie und bei
 * der SetupIntent-Prüfung: eine hereingereichte ID ist ein Hinweis, kein
 * Nachweis.
 *
 * Gesucht wird über `customers.list({ email })` und **nicht** über die
 * Search API. Der Unterschied ist hier entscheidend: die Suche läuft über
 * einen Index, der bis zu einer Minute hinterherhinkt — ein Kunde, den wir
 * gerade angelegt haben, wäre dort noch nicht zu finden.
 */
export async function sucheKunde({
  betriebId,
  email,
  kundeId = null,
  trotzSoftLaunch = false,
}: {
  betriebId: string;
  email: string;
  /** `betrieb_abonnements.stripe_customer_id`, sofern der Webhook schon lief. */
  kundeId?: string | null;
  /** Siehe `klientFuer()`. Nur die Kontolöschung setzt das. */
  trotzSoftLaunch?: boolean;
}): Promise<Stripe.Customer | null> {
  const stripe = klientFuer(trotzSoftLaunch);

  if (kundeId) {
    try {
      const kunde = await stripe.customers.retrieve(kundeId);

      /*
       * Ein gelöschter Kunde kommt nicht als Fehler zurück, sondern als
       * Zeile mit `deleted: true` und ohne Metadaten. Ohne diese Abfrage
       * liefe er in den Metadaten-Vergleich und käme als „passt nicht"
       * heraus — richtiges Ergebnis aus dem falschen Grund. Ausdrücklich
       * geprüft bleibt es lesbar.
       */
      if (!kunde.deleted && kunde.metadata?.[BETRIEB_SCHLUESSEL] === betriebId) {
        return kunde;
      }

      console.error(
        `[stripe] gespeicherte Kunden-ID ${kundeId} passt nicht zu Betrieb ${betriebId} — weiter über E-Mail`,
      );
    } catch (ursache) {
      /*
       * Unbekannte ID — etwa nach einem Wechsel zwischen Sandbox und
       * Produktion. Kein Abbruch: der Fallback darunter kann die Lage
       * noch retten, und ein harter Fehler nähme ihm die Gelegenheit.
       */
      const text = ursache instanceof Error ? ursache.message : String(ursache);
      console.error(`[stripe] customers.retrieve(${kundeId}): ${text}`);
    }
  }

  const vorhandene = await stripe.customers.list({ email, limit: 100 });
  return (
    vorhandene.data.find(
      (kunde) => kunde.metadata?.[BETRIEB_SCHLUESSEL] === betriebId,
    ) ?? null
  );
}

/**
 * Findet den Stripe-Kunden zu diesem Betrieb oder legt ihn an.
 *
 * Der Idempotenz-Schlüssel fängt ab, was die Suche nicht kann: zwei
 * Anfragen im selben Augenblick, bei denen beide die Liste noch leer
 * gesehen haben.
 *
 * Neu angelegte Kunden tragen seit dem 2026-09-13 Betriebsname und Land
 * (siehe `stelleSteuerstandortSicher`); vorhandene bekommen beides
 * nachgetragen, falls es fehlt.
 */
export async function holeOderErstelleKunde({
  betriebId,
  email,
  kundeId = null,
  rechnung,
}: {
  betriebId: string;
  email: string;
  kundeId?: string | null;
  rechnung: Rechnungsangaben | null;
}): Promise<Stripe.Customer> {
  const stripe = stripeKlient();

  const passend = await sucheKunde({ betriebId, email, kundeId });
  if (passend) return stelleSteuerstandortSicher(passend, rechnung);

  if (!rechnung) {
    throw new Error(
      `Betrieb ${betriebId}: ohne Name und Land lässt sich kein Stripe-Kunde mit Steuerstandort anlegen.`,
    );
  }

  return stripe.customers.create(
    {
      email,
      name: rechnung.name,
      address: { country: rechnung.land },
      preferred_locales: ["de"],
      metadata: { [BETRIEB_SCHLUESSEL]: betriebId },
    },
    /*
     * `:steuer` im Schlüssel, weil sich die Parameter am 2026-09-13
     * geändert haben: ein Schlüssel aus den 24 Stunden davor mit den alten
     * Parametern würde sonst mit einem Idempotenzfehler abgelehnt.
     */
    { idempotencyKey: `betrieb:${betriebId}:kunde:steuer` },
  );
}

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
  const stripe = stripeKlient();
  const vorhandene = await stripe.customers.list({ email, limit: 100 });
  return (
    vorhandene.data.find(
      (kunde) =>
        !kunde.deleted &&
        kunde.metadata?.[PENDING_SCHLUESSEL] === userId &&
        !kunde.metadata?.[BETRIEB_SCHLUESSEL],
    ) ?? null
  );
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

  const vorhanden = await suchePendingKunde({ userId, email });
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
    { idempotencyKey: `pending:${userId}:kunde` },
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
 *   - kein Pending-Kunde        → Schritt 1 (Betriebsdaten fehlen)
 *   - Pending-Kunde, kein Abo    → Schritt 2 (Zahlung)
 *   - Pending-Kunde, aktives Abo → das Anlegen des Betriebs steht aus
 */
export type PendingLage = {
  kunde: Stripe.Customer | null;
  /** Ein bezahltes/aktives Abo liegt vor — der Betrieb kann angelegt werden. */
  aboBereit: boolean;
  aboId: string | null;
};

export async function holePendingLage({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<PendingLage> {
  const kunde = await suchePendingKunde({ userId, email });
  if (!kunde) return { kunde: null, aboBereit: false, aboId: null };

  const { lebend } = await verlaufFuerKunde(kunde.id);
  const aboBereit = lebend?.status === "active" || lebend?.status === "trialing";
  return { kunde, aboBereit, aboId: lebend?.id ?? null };
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
  const ablehnung =
    "Die Zahlung wurde abgelehnt, das Abo ist nicht gestartet. Versuch es mit einer anderen Zahlungsmethode.";

  await stelleSteuerstandortSicher(kundeId, rechnung);
  await stripe.customers.update(kundeId, {
    invoice_settings: { default_payment_method: zahlungsmittelId },
  });

  const { lebend } = await verlaufFuerKunde(kundeId);
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

  const abo = await stripe.subscriptions.create({
    customer: kundeId,
    items: [{ price: preis }],
    default_payment_method: zahlungsmittelId,
    payment_behavior: "default_incomplete",
    ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
    payment_settings: { save_default_payment_method: "on_subscription" },
    automatic_tax: { enabled: true },
    expand: ["latest_invoice"],
    metadata: { [PENDING_SCHLUESSEL]: userId },
  });

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

  await stripe.customers.update(kundeId, { metadata: geleert });
  await stripe.subscriptions.update(aboId, {
    metadata: { [BETRIEB_SCHLUESSEL]: betriebId, [PENDING_SCHLUESSEL]: "" },
  });
}

/* ------------------------------------------------------------------ */
/* Umsatzsteuer (Stripe Tax)                                           */
/* ------------------------------------------------------------------ */

/**
 * Sorgt dafür, dass Stripe Tax den Kunden verorten kann.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das Land genügt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Stripe Tax braucht für Rechnungen einen Standort des Kunden, sonst
 * lehnt es ein Abo mit `automatic_tax` ab (`customer_tax_location_invalid`).
 * Für Deutschland und Österreich genügt dafür das Land; eine Postleitzahl
 * verlangt Stripe nur in den USA und Kanada. Das Land steht ohnehin fest:
 * `betriebe.land`, per CHECK `AT` oder `DE`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein vorhandenes Land nicht überschrieben wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * Im Kundenportal kann der Kunde seine Rechnungsadresse selbst pflegen.
 * Steht dort schon ein Land, ist es entweder unseres oder seins — in
 * beiden Fällen ist es neuer als ein Nachtrag von hier. Nachgetragen wird
 * nur, wo gar nichts steht: bei Kunden aus der Zeit vor Stripe Tax.
 */
export async function stelleSteuerstandortSicher(
  kunde: Stripe.Customer | string,
  rechnung: Rechnungsangaben | null,
): Promise<Stripe.Customer> {
  const stripe = stripeKlient();
  const vorhanden =
    typeof kunde === "string" ? await stripe.customers.retrieve(kunde) : kunde;

  if (vorhanden.deleted) {
    throw new Error(`Stripe-Kunde ${vorhanden.id} ist gelöscht.`);
  }
  if (vorhanden.address?.country) return vorhanden;

  if (!rechnung) {
    throw new Error(
      `Stripe-Kunde ${vorhanden.id} hat kein Land, und die Betriebsdaten sind nicht lesbar — Stripe Tax kann ihn nicht verorten.`,
    );
  }

  return stripe.customers.update(vorhanden.id, {
    address: { country: rechnung.land },
    ...(vorhanden.name ? {} : { name: rechnung.name }),
  });
}

/* ------------------------------------------------------------------ */
/* Rechnungsangaben                                                     */
/* ------------------------------------------------------------------ */

/**
 * Liest die vorhandenen Rechnungsangaben eines Stripe-Kunden — für die
 * Vorbelegung des Formulars.
 *
 * Bewusst nachsichtig: fehlt der Kunde, fehlt ein Feld oder schlägt der
 * Abruf fehl, kommt `null` bzw. ein leeres Feld zurück. Eine
 * Vorbelegung ist eine Bequemlichkeit, kein Nachweis — sie darf die
 * Seite nicht zum Absturz bringen, und der Kunde füllt die Lücke
 * ohnehin selbst.
 */
export async function holeRechnungsProfil(
  kundeId: string | null,
): Promise<Partial<RechnungsProfil> | null> {
  if (!kundeId) return null;

  try {
    const stripe = stripeKlient();
    const kunde = await stripe.customers.retrieve(kundeId);
    if (kunde.deleted) return null;

    const uid = await holeUid(kundeId);

    return {
      firma: kunde.name ?? "",
      strasse: kunde.address?.line1 ?? "",
      plz: kunde.address?.postal_code ?? "",
      ort: kunde.address?.city ?? "",
      ...(kunde.address?.country === "AT" || kunde.address?.country === "DE"
        ? { land: kunde.address.country as LandCode }
        : {}),
      uid: uid ?? "",
    };
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] Rechnungsangaben von ${kundeId} nicht lesbar: ${text}`);
    return null;
  }
}

/**
 * Schreibt die vollständige Rechnungsanschrift an **diesen** Kunden.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Kunden-Id ein Parameter ist und nicht hier ermittelt wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * Damit der Aufrufer sie aus derselben Quelle bezieht wie das Abo, an
 * dem gleich die Zahlungsmethode hängt. Zwei getrennte Ermittlungen —
 * einmal für die Adresse, einmal für das Abo — könnten bei einer
 * geänderten Anmeldeadresse zwei verschiedene Kunden treffen, und dann
 * stünde die Anschrift am einen und die Karte am anderen.
 * `zahlungsmittelUebernehmen` leitet beide aus dem gefundenen Abo ab.
 *
 * Anders als `stelleSteuerstandortSicher()` **überschreibt** diese
 * Funktion vorhandene Werte: sie läuft nur, wenn jemand das Formular
 * ausgefüllt und abgeschickt hat. Genau das ist dann die neuere Angabe.
 */
export async function speichereRechnungAmKunden(
  kundeId: string,
  profil: RechnungsProfil,
): Promise<void> {
  const stripe = stripeKlient();

  await stripe.customers.update(kundeId, {
    name: profil.firma,
    address: {
      line1: profil.strasse,
      postal_code: profil.plz,
      city: profil.ort,
      country: profil.land,
    },
  });

  /*
   * ─────────────────────────────────────────────────────────────────
   *  Die UID/USt-IdNr wird für beide Länder gesetzt (seit 2026-09-21).
   * ─────────────────────────────────────────────────────────────────
   *
   * `setzeUid` ersetzt eine abweichende EU-Nummer und lässt bei leerer
   * Angabe eine im Kundenportal gepflegte stehen. Der Wert kommt aus dem
   * geprüften Profil und trägt beim Rechnungsland AT das Format `ATU…`,
   * bei DE `DE…` — den Länderwechsel deckt das mit ab: eine `ATU…` wird
   * durch die neue `DE…` ersetzt, weil `setzeUid` andere EU-Nummern vor
   * dem Anlegen entfernt.
   *
   * Da die UID seit dem 2026-09-21 am Rechnungstor für beide Länder
   * Pflicht ist, ist `profil.uid` beim aktiven Speichern nicht leer; der
   * Fallback `|| null` (keine Änderung) fängt nur den Speicherweg ab, der
   * ausnahmsweise ohne Nummer läuft.
   */
  await setzeUid(kundeId, profil.uid || null);
}

/**
 * Liegen am Kunden vollständige Rechnungsangaben vor?
 *
 * Das Tor vor der Aktivierung eines kostenpflichtigen Abonnements
 * (Entscheidung vom 2026-09-14). Bewusst **hier** und nicht im Formular:
 *
 *  - Es greift auch auf dem 3DS-Rückweg, auf dem der Browser die Seite
 *    verlassen hat und kein Formularinhalt mehr existiert.
 *  - Es liest den Zustand bei Stripe, statt einer Eingabe zu glauben.
 *    Wer `zahlungsmittelUebernehmen()` direkt aufruft, kommt nicht
 *    vorbei.
 *
 * Verlangt werden genau die Felder, die § 14 Abs. 4 UStG für eine
 * Rechnung an einen Unternehmer braucht und die wir nicht selbst
 * kennen: Firma, Straße, Postleitzahl, Ort, Land. **Die UID/USt-IdNr
 * zählt seit dem 2026-09-18 dazu, seit dem 2026-09-21 für AT und DE**
 * (Produktentscheidung — QuickTeam verkauft nur an Unternehmer; siehe
 * `rechnungSchema`). Dieselbe Prüfung läuft schon beim Speichern über
 * `pruefeRechnung`, aber sie wird hier wiederholt, weil dieser Riegel
 * auch auf dem 3DS-Rückweg und bei direktem Aufruf von
 * `zahlungsmittelUebernehmen()` greift, wo kein Formularinhalt mehr
 * existiert — und weil eine Anschrift auch über das Kundenportal ohne
 * UID an den Kunden geraten kann.
 *
 * Ein Fehlschlag beim Abruf gilt als „nicht vollständig". Das ist die
 * sichere Richtung: lieber eine Aktivierung zu viel verweigern als eine
 * Rechnung ohne Anschrift ausstellen.
 */
export async function rechnungVollstaendig(kundeId: string): Promise<boolean> {
  try {
    const kunde = await stripeKlient().customers.retrieve(kundeId);
    if (kunde.deleted) return false;

    const a = kunde.address;
    const anschriftDa = Boolean(
      kunde.name?.trim() &&
        a?.line1?.trim() &&
        a?.postal_code?.trim() &&
        a?.city?.trim() &&
        a?.country?.trim(),
    );
    if (!anschriftDa) return false;

    /*
     * Rechnungsempfänger ohne UID/USt-IdNr: unvollständig. Seit dem
     * 2026-09-21 gilt das für **beide** Länder (Kursänderung, siehe
     * `CLAUDE.md`) — QuickTeam verkauft nur an Unternehmer. Der Wert steht
     * als `eu_vat`-Steuer-ID am Kunden (`setzeUid`), nicht in der Adresse
     * — deshalb ein eigener Abruf. Da `betriebe.land` per CHECK nur AT/DE
     * kennt, verlangt die Bedingung die Nummer praktisch immer; die
     * ausdrückliche Länderprüfung bleibt als lesbare Grenze stehen.
     */
    if ((a?.country === "AT" || a?.country === "DE") && !(await holeUid(kundeId)))
      return false;

    return true;
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] Rechnungsangaben von ${kundeId} nicht prüfbar: ${text}`);
    return false;
  }
}

/** Die hinterlegte EU-USt-IdNr. des Kunden, oder `null`. */
export async function holeUid(kundeId: string): Promise<string | null> {
  const ids = await stripeKlient().customers.listTaxIds(kundeId, { limit: 10 });
  return ids.data.find((id) => id.type === "eu_vat")?.value ?? null;
}

/**
 * Hinterlegt die UID/USt-IdNr als `eu_vat`-Steuer-ID am Kunden — für
 * österreichische (`ATU…`) wie deutsche (`DE…`) Rechnungsempfänger.
 *
 * Daran entscheidet Stripe Tax, ob ein grenzüberschreitender Umsatz an
 * einen österreichischen Betrieb nach dem Reverse-Charge-Verfahren läuft;
 * für einen deutschen Inlandsumsatz ändert die Nummer die Steuer nicht,
 * wird aber als Unternehmernachweis auf der Rechnung geführt. Stripe prüft
 * die Nummer danach selbst gegen VIES.
 *
 * `null` heisst „keine Angabe" und ändert nichts — eine im Kundenportal
 * gepflegte Nummer bleibt stehen. Eine abweichende wird ersetzt, damit
 * nicht zwei EU-Nummern nebeneinander stehen und Stripe die falsche nimmt.
 */
export async function setzeUid(kundeId: string, uid: string | null): Promise<void> {
  if (!uid) return;

  const stripe = stripeKlient();
  const ids = await stripe.customers.listTaxIds(kundeId, { limit: 10 });
  const euIds = ids.data.filter((id) => id.type === "eu_vat");

  if (euIds.some((id) => id.value === uid)) return;

  for (const alt of euIds) {
    await stripe.customers.deleteTaxId(kundeId, alt.id);
  }
  await stripe.customers.createTaxId(kundeId, { type: "eu_vat", value: uid });
}

/*
 * Hier stand `entferneUids()`, das bei einem Rechnungsland ausserhalb
 * Österreichs alle EU-Steuernummern des Kunden löschte. Mit der
 * Kursänderung vom 2026-09-21 (UID/USt-IdNr für AT **und** DE Pflicht,
 * siehe CLAUDE.md) trägt auch ein deutscher Kunde eine `eu_vat`-Nummer;
 * ein Länderwechsel ersetzt sie über `setzeUid`, statt sie zu entfernen.
 * Ein pauschales Löschen hätte keinen Aufrufer mehr und wäre falsch.
 */

/* ------------------------------------------------------------------ */
/* Abonnement                                                          */
/* ------------------------------------------------------------------ */

/**
 * Abgeschlossene Abos, die nicht mehr zählen. `canceled` ist laut Stripe
 * endgültig, `incomplete_expired` ebenso — beide stellen niemandem mehr
 * etwas in Rechnung. Wer nur solche hat, hat kein Abo.
 */
const ERLEDIGT: ReadonlyArray<Stripe.Subscription.Status> = [
  "canceled",
  "incomplete_expired",
];

/**
 * Das lebende Abo dieses Betriebs, oder `null`. Rein lesend — gibt es
 * noch keinen Kunden, gibt es auch kein Abo, und angelegt wird hier nichts.
 *
 * Auch hier `list` statt Search, aus demselben Grund wie beim Kunden.
 */
export async function holeAboFuerBetrieb({
  betriebId,
  email,
  kundeId = null,
  trotzSoftLaunch = false,
}: {
  betriebId: string;
  email: string;
  /** Siehe `klientFuer()`. Nur die Kontolöschung setzt das. */
  trotzSoftLaunch?: boolean;
  /**
   * `betrieb_abonnements.stripe_customer_id`. Wird durchgereicht an
   * `sucheKunde`, dessen Kommentar erklärt, warum sie der E-Mail vorgeht.
   *
   * Der Parameter ist ein Objektfeld und nicht ein drittes Argument,
   * damit der Umbau vom 2026-08-28 **jede** Aufrufstelle durch den
   * Compiler schickt: die Signatur hiess vorher `(betriebId, email)`,
   * und ein optionales drittes Argument hätte alle Aufrufer stillschweigend
   * weiterlaufen lassen — mit dem alten Verhalten und ohne Hinweis darauf.
   * Bei einer Änderung am Zahlungspfad ist ein Compilerfehler je Stelle
   * das billigere Signal.
   */
  kundeId?: string | null;
}): Promise<Stripe.Subscription | null> {
  return (await holeAboVerlauf({ betriebId, email, kundeId, trotzSoftLaunch })).lebend;
}

/**
 * Das lebende Abo **und** wie viele Abos dieser Betrieb je hatte,
 * gekündigte und verfallene eingeschlossen.
 *
 * Die Anzahl beantwortet die Frage „steht ihm noch eine Testphase zu?"
 * — siehe `erstelleAbo`. Gezählt wird bei Stripe, nicht in unserer
 * Zeile: `betrieb_abonnements` kennt nur das jeweils letzte Abo, und
 * `status: "all"` liefert auch die gekündigten.
 */
export type AboVerlauf = {
  lebend: Stripe.Subscription | null;
  anzahl: number;
};

export async function holeAboVerlauf({
  betriebId,
  email,
  kundeId = null,
  trotzSoftLaunch = false,
}: {
  betriebId: string;
  email: string;
  kundeId?: string | null;
  /** Siehe `klientFuer()`. Nur die Kontolöschung setzt das. */
  trotzSoftLaunch?: boolean;
}): Promise<AboVerlauf> {
  const kunde = await sucheKunde({ betriebId, email, kundeId, trotzSoftLaunch });
  if (!kunde) return { lebend: null, anzahl: 0 };
  return verlaufFuerKunde(kunde.id, trotzSoftLaunch);
}

async function verlaufFuerKunde(
  kundeId: string,
  trotzSoftLaunch = false,
): Promise<AboVerlauf> {
  const abos = await klientFuer(trotzSoftLaunch).subscriptions.list({
    customer: kundeId,
    status: "all",
    limit: 100,
  });

  return {
    lebend: abos.data.find((abo) => !ERLEDIGT.includes(abo.status)) ?? null,
    anzahl: abos.data.length,
  };
}

/**
 * Was Stripe zu einem Betrieb sagt, dessen Zeile nicht für sich spricht —
 * `pausiert`, `gekuendigt` oder noch ohne Subscription-ID.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Tore nicht allein aus unserer Zeile lesen
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Zeile schreibt der Webhook, mit ein paar Sekunden Verzögerung. Genau
 * in diese Sekunden fällt der Moment, in dem es darauf ankommt: jemand hat
 * gerade bezahlt, das Abo ist bei Stripe `active`, und die Weiterleitung
 * kommt an, bevor der Webhook durch ist. Aus der Zeile allein abgeleitet
 * stand er wieder vor der Sperrseite oder der Planwahl.
 *
 * Gefragt wird nur in diesen Fällen. Eine Zeile mit Subscription-ID und
 * `trial` / `aktiv` / `zahlung_ausstehend` gilt ohne Nachfrage — der
 * Normalfall kostet damit keinen Aufruf bei Stripe.
 *
 *   - `laeuft`    — Testphase, aktiv oder in der Mahnung: Zugang
 *   - `pausiert`  — Testphase ohne Zahlungsmittel abgelaufen: Sperrseite
 *   - `unbezahlt` — neues Abo ohne Testphase, erste Rechnung offen
 *                   (`incomplete`); zählt wie kein Abo, sonst wäre das
 *                   Anlegen allein schon der Zugang
 *   - `kein-abo`  — nichts Lebendes: Zahlungsschritt
 *   - `unbekannt` — Stripe antwortet nicht. Die Aufrufer entscheiden dann
 *                   gegen den Zugang: ein Tor, das bei einem Netzfehler
 *                   aufgeht, ist keins.
 */
export type AboLage = "laeuft" | "pausiert" | "unbezahlt" | "kein-abo" | "unbekannt";

export async function aboLageBeiStripe({
  betriebId,
  email,
  kundeId = null,
}: {
  betriebId: string;
  email: string;
  kundeId?: string | null;
}): Promise<AboLage> {
  try {
    const abo = await holeAboFuerBetrieb({ betriebId, email, kundeId });
    if (abo === null) return "kein-abo";
    if (abo.status === "paused") return "pausiert";
    if (abo.status === "incomplete") return "unbezahlt";
    return "laeuft";
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] aboLageBeiStripe(${betriebId}): ${text}`);
    return "unbekannt";
  }
}

/**
 * Prüft einen vom Kunden eingegebenen **Stripe-Rabattcode** und gibt die
 * ID des zugehörigen Promotion-Codes zurück, oder `null`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Nicht zu verwechseln mit dem internen Partner-Promo-Code
 * ─────────────────────────────────────────────────────────────────────
 *
 * `promo_codes` / `betrieb_promo_codes` (siehe `src/lib/promo-code.ts`)
 * ist eine eigene Tabelle, mit der QuickTeam festhält, über welchen
 * Werbepartner ein Betrieb gekommen ist — sie gewährt **keinen** Rabatt
 * und der Betrieb zahlt denselben Preis. Dieser hier ist das Gegenteil:
 * ein echter Stripe-Rabattcode (`promotion_code`), der auf das Abo einen
 * Nachlass legt. Beide Wege stehen bewusst nebeneinander und teilen sich
 * kein Feld.
 *
 * Gesucht wird nur unter **aktiven** Codes. Ein leerer oder unbekannter
 * Code ist kein Fehler, sondern `null` — der Aufrufer entscheidet, ob er
 * das dem Kunden als „Code ungültig" zeigt oder (bei leerer Eingabe)
 * einfach ohne Rabatt fortfährt. Der Code selbst ist kundenseitig
 * unkritisch: er wirkt nur, wenn Stripe ihn kennt und aktiv hält.
 */
export async function pruefePromotionCode(code: string): Promise<string | null> {
  const bereinigt = code.trim();
  if (bereinigt.length === 0) return null;

  try {
    const treffer = await stripeKlient().promotionCodes.list({
      code: bereinigt,
      active: true,
      limit: 1,
    });
    return treffer.data[0]?.id ?? null;
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] promotionCodes.list(${bereinigt}): ${text}`);
    return null;
  }
}

/**
 * Legt das Abonnement an — mit Testphase beim ersten Abo des Betriebs,
 * ohne bei jedem weiteren.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine Testphase je Betrieb (seit dem 2026-09-14)
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher bekam jedes neue Abo 14 Tage geschenkt. Ein gekündigter Betrieb
 * landet aber im Zahlungsschritt, um neu abzuschliessen — und bekam dort
 * die nächste Testphase, ohne Karte. Kündigen im Kundenportal während der
 * Testphase, neu abschliessen, wieder kündigen: unbegrenzt kostenlos. AGB
 * § 5 Abs. 2 lässt die Testphase ohnehin nur mit der Tarifwahl „im
 * Anschluss an die Registrierung" beginnen.
 *
 * Ob der Betrieb schon ein Abo hatte, sagt Stripe (`holeAboVerlauf`),
 * nicht unsere Zeile — die kennt nur das letzte.
 *
 * **Mit Testphase** ist nichts fällig: Stripe stellt eine Rechnung über
 * 0,00 mit dem Posten „Free trial" aus, und das Abo geht direkt auf
 * `trialing`.
 *
 * **Ohne Testphase** ist die erste Rechnung sofort fällig, aber noch kein
 * Zahlungsmittel da — das kommt erst im nächsten Schritt. Deshalb
 * `payment_behavior: "default_incomplete"`: das Abo entsteht `incomplete`
 * mit offener Rechnung, ohne dass Stripe einen Einzug versucht, der
 * mangels Karte nur scheitern könnte. `uebernimmZahlungsmittel` bezahlt
 * die Rechnung, sobald die Karte da ist. Kommt keine, verfällt das Abo
 * nach 23 Stunden von selbst (`incomplete_expired`) und kostet nichts.
 *
 * `missing_payment_method: "pause"` ist die tragende Einstellung des
 * ganzen Flows: läuft die Testphase ohne hinterlegte Karte ab, setzt
 * Stripe das Abo auf `paused`, der Webhook schreibt daraus `pausiert`,
 * und daran erkennt die Website den Ablauf — ohne eigene Datumsrechnung
 * und ohne eine Spalte, die es in `betrieb_abonnements` nicht gibt.
 * `cancel` wäre endgültig und `create_invoice` würde nur mahnen.
 *
 * Ist bereits ein Abo da, wird keins angelegt. Der Aufrufer bekommt das
 * vorhandene zurück und kann darauf `wechslePlan` anwenden. Ausnahme: ein
 * noch unbezahltes (`incomplete`) Abo mit anderem Plan wird gekündigt und
 * neu angelegt statt umgestellt — an ihm hängt eine offene Rechnung über
 * den alten Betrag, und das Kündigen stoppt deren Einzug.
 *
 * `automatic_tax` seit dem 2026-09-13: vorher schlug nichts die
 * Umsatzsteuer auf, obwohl AGB § 5 Abs. 1 und jede Preisangabe „zzgl. USt."
 * sagen — abgebucht wurde der Nettopreis als Bruttobetrag. Setzt voraus,
 * dass Stripe Tax im Dashboard aktiviert ist und die Preise als
 * „exklusive Steuern" angelegt sind (`pruefePreisGleichstand` meldet es,
 * wenn nicht).
 */
export async function erstelleAbo({
  betriebId,
  plan,
  intervall,
  email,
  kundeId = null,
  rechnung,
  promotionCodeId = null,
}: {
  betriebId: string;
  plan: PlanId;
  /** Monatlich oder jährlich — bestimmt den Stripe-Price (siehe `priceIdFuer`). */
  intervall: Abrechnung;
  email: string;
  kundeId?: string | null;
  rechnung: Rechnungsangaben | null;
  /**
   * ID eines geprüften Stripe-Promotion-Codes (`pruefePromotionCode`), oder
   * `null`. Wird als `discounts` aufs neue Abo gelegt und wirkt ab der
   * ersten echten Abbuchung; während der Testphase ist ohnehin nichts
   * fällig. Der interne Partner-Promo-Code hat damit nichts zu tun.
   */
  promotionCodeId?: string | null;
}): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();
  const preis = priceIdFuer(plan, intervall);

  const kunde = await holeOderErstelleKunde({ betriebId, email, kundeId, rechnung });

  /*
   * Eine Liste für beides — ob schon eins lebt, und wie viele es je gab.
   * Zwei getrennte Abfragen liessen zwischen sich Platz für einen
   * Doppelklick, der das eine schon und das andere noch nicht sieht.
   */
  const { lebend, anzahl } = await verlaufFuerKunde(kunde.id);

  if (lebend) {
    const unbezahltMitAnderemPlan =
      lebend.status === "incomplete" && lebend.items.data[0]?.price.id !== preis;
    if (!unbezahltMitAnderemPlan) return lebend;
    await stripe.subscriptions.cancel(lebend.id);
  }

  /*
   * Seit dem 2026-09-22 (Nutzerwunsch): **keine Testphase mehr.** Ein
   * kostenloser erster Monat läuft über einen Stripe-Rabattcode (100 %),
   * nicht über `trial_period_days`. Jedes Abo entsteht `incomplete` mit
   * offener Erstrechnung; das Zahlungsmittel bezahlt sie. Für einen
   * **neuen** Betrieb läuft das über den Pending-Weg (`schliessePendingAbo`);
   * `erstelleAbo` bedient nur noch den Neuabschluss eines **bestehenden**
   * Betriebs (nach Kündigung), der ohnehin nie eine Testphase bekam.
   */
  return stripe.subscriptions.create(
    {
      customer: kunde.id,
      items: [{ price: preis }],
      payment_behavior: "default_incomplete",
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
      payment_settings: { save_default_payment_method: "on_subscription" },
      automatic_tax: { enabled: true },
      metadata: { [BETRIEB_SCHLUESSEL]: betriebId },
    },
    /*
     * Plan, Intervall und Anzahl der bisherigen Abos stehen im Schlüssel,
     * alles mit Absicht. Der Schlüssel soll genau den Doppelklick abfangen
     * — zwei Anfragen, die dieselbe Liste gesehen haben — und sonst nichts:
     *
     *   - ohne den Plan liefe ein späterer Wechsel auf denselben
     *     Schlüssel, und Stripe würfe, weil die Parameter nicht passen
     *   - ohne das Intervall bekäme jemand, der monatlich anlegt und
     *     gleich darauf auf jährlich umstellt, mit demselben Schlüssel das
     *     monatliche Abo zurück — die andere Preis-ID würde ignoriert
     *   - ohne die Anzahl bekäme ein Betrieb, der binnen 24 Stunden
     *     kündigt und neu abschliesst, von Stripe das alte, gekündigte
     *     Abo als Antwort zurück — und es entstünde gar keins
     *   - ohne den Rabatt-Marker würde ein zweiter Versuch mit jetzt
     *     eingegebenem Code auf denselben Schlüssel laufen und Stripe
     *     würfe wegen abweichender Parameter (`discounts`)
     */
    {
      idempotencyKey: `betrieb:${betriebId}:abo:${plan}:${intervall}:${anzahl}${
        promotionCodeId ? ":r" : ""
      }`,
    },
  );
}

/**
 * Das Abrechnungsintervall eines bestehenden Abos als unser `Abrechnung`.
 *
 * Damit ein Wechsel, für den keine neue Intervall-Wahl vorliegt, das Abo auf
 * seinem bisherigen Intervall lässt, statt es auf den monatlichen Standard
 * zurückzustellen. Alles ausser einem ausdrücklichen Jahres-Price gilt als
 * monatlich — dieselbe sichere Richtung wie in `alsAbrechnung`.
 */
export function intervallVonAbo(abo: Stripe.Subscription): Abrechnung {
  return abo.items.data[0]?.price.recurring?.interval === "year" ? "jahr" : "monat";
}

/**
 * Setzt einen anderen Plan auf ein bestehendes Abo.
 *
 * `proration_behavior: "none"` weil während der Testphase ohnehin nichts
 * berechnet wird und der Wechsel hier immer in Schritt 2 stattfindet —
 * eine anteilige Verrechnung über 0,00 wäre nur Rauschen in der
 * Rechnungshistorie.
 *
 * Schaltet dabei `automatic_tax` ein, falls das Abo aus der Zeit davor
 * stammt. Der Kunde muss dafür schon ein Land tragen — der Aufrufer ruft
 * vorher `holeOderErstelleKunde`, das es nachträgt.
 */
export async function wechslePlan(
  abo: Stripe.Subscription,
  plan: PlanId,
  intervall: Abrechnung,
): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();
  const preis = priceIdFuer(plan, intervall);

  const posten = abo.items.data[0];
  if (!posten) {
    throw new Error(`Abo ${abo.id} hat keinen Posten, den man wechseln könnte.`);
  }
  if (posten.price.id === preis && abo.automatic_tax.enabled) return abo;

  return stripe.subscriptions.update(abo.id, {
    items: [{ id: posten.id, price: preis }],
    proration_behavior: "none",
    automatic_tax: { enabled: true },
  });
}

/**
 * Kündigt ein Abonnement sofort und endgültig.
 *
 * Eingesetzt bei der Kontolöschung eines Allein-Chefs: verschwindet der
 * Zugang, darf auch nichts mehr abgebucht werden (Audit Punkt 19). `cancel`
 * beendet **sofort** statt zum Periodenende — wer sein Konto löscht, nutzt
 * den Rest des Zeitraums nicht mehr, und eine Weiterzahlung ohne Zugang ist
 * genau das, was hier verhindert werden soll.
 *
 * Den Status in `betrieb_abonnements` schreibt wie immer allein der Webhook
 * (`customer.subscription.deleted` → `gekuendigt`); hier wird nur bei Stripe
 * gekündigt. Aufgerufen wird das nur mit der Id eines Abos, das kurz zuvor
 * als lebend gefunden wurde.
 */
export async function kuendigeAbo(
  aboId: string,
  /** Siehe `klientFuer()`. Nur die Kontolöschung setzt das. */
  trotzSoftLaunch = false,
): Promise<Stripe.Subscription> {
  return klientFuer(trotzSoftLaunch).subscriptions.cancel(aboId);
}

/** AGB § 5 Abs. 3: so lange lässt sich ein pausiertes Abo fortsetzen. */
export const PAUSE_HOECHSTENS_TAGE = 90;

export type PausenBilanz = {
  /** Pausierte Abos, die Stripe geliefert hat — auch fremde und noch nicht fällige. */
  geprueft: number;
  gekuendigt: string[];
  fehler: string[];
};

/**
 * Kündigt pausierte Abos, deren Testphase vor mehr als 90 Tagen endete.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das hier passiert und nicht in der Datenbank
 * ─────────────────────────────────────────────────────────────────────
 *
 * Läuft eine Testphase ohne Karte ab, pausiert Stripe das Abo
 * (`missing_payment_method: 'pause'`) — und lässt es dann für immer so.
 * Einen „nach 90 Tagen kündigen"-Schalter gibt es nicht. Der tägliche Job in
 * der Datenbank (`private.betriebe_aufraeumen()`, siehe
 * `docs/backend-befunde-2026-09-14.md`) löscht aber nur `gekuendigt`, nie
 * `pausiert`: ein pausiertes Abo liesse sich noch fortsetzen, und dann würde
 * für einen gelöschten Betrieb abgebucht.
 *
 * Also wird hier bei Stripe gekündigt. Der Webhook schreibt daraus wie bei
 * jeder Kündigung `gekuendigt`; der Trigger stellt `beendet_am` dabei auf den
 * Zeitpunkt der Kündigung (Migration `loeschung_a5`), und der Job löscht 30
 * Tage später. Das ist § 5 Abs. 3 in der AGB-Fassung r2: Vertragsende nach 90
 * Tagen, Export und Löschung danach nach § 6 Abs. 4 — also Tag 90 + 30.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Frist kommt von Stripe, nicht aus unserer Zeile
 * ─────────────────────────────────────────────────────────────────────
 *
 * Gerechnet wird ab `trial_end` — dort pausiert Stripe. Die Datenbank wird
 * dafür nicht gefragt; diese Funktion braucht nur den Stripe-Key, keinen
 * Supabase-Client und schon gar nicht `service_role`.
 *
 * Abos ohne `betrieb_id` in den Metadaten bleiben unberührt: die sind im
 * Stripe-Dashboard von Hand entstanden und nicht unsere (dieselbe Regel wie
 * im Webhook).
 *
 * Ein Fehler bei einem Abo hält die übrigen nicht auf. Er landet in der
 * Bilanz, und der nächste Lauf versucht es erneut — ein fälliges Abo bleibt
 * so lange in der Liste, bis es gekündigt ist.
 */
export async function beendeUeberfaelligePausen(
  jetzt: Date = new Date(),
): Promise<PausenBilanz> {
  const stripe = stripeKlientOhneRiegel();
  const grenze = Math.floor(jetzt.getTime() / 1000) - PAUSE_HOECHSTENS_TAGE * 24 * 60 * 60;
  const bilanz: PausenBilanz = { geprueft: 0, gekuendigt: [], fehler: [] };

  for await (const abo of stripe.subscriptions.list({ status: "paused", limit: 100 })) {
    bilanz.geprueft += 1;

    if (!abo.metadata?.[BETRIEB_SCHLUESSEL]) continue;
    if (abo.trial_end === null || abo.trial_end > grenze) continue;

    try {
      await stripe.subscriptions.cancel(abo.id, {
        cancellation_details: {
          comment: `Testphase ohne Zahlungsmittel, seit mehr als ${PAUSE_HOECHSTENS_TAGE} Tagen pausiert (AGB § 5 Abs. 3)`,
        },
      });
      bilanz.gekuendigt.push(abo.id);
    } catch (fehler) {
      const text = fehler instanceof Error ? fehler.message : String(fehler);
      bilanz.fehler.push(`${abo.id}: ${text}`);
    }
  }

  return bilanz;
}

/**
 * Was der Kunde unmittelbar vor dem Hinterlegen einer Zahlungsmethode
 * wissen muss — gelesen aus dem Abo selbst, nicht aus Konstanten.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum aus Stripe und nicht aus `plaene` / `TESTPHASE_TAGE`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die rechtliche Durchsicht vom 2026-09-13 hat zwei Dinge bemängelt:
 * Die Zahlungsansicht sagte bei jedem Aufruf „die ersten 14 Tage sind
 * kostenlos" — auch am zwölften Tag einer laufenden Testphase —, und sie
 * nannte keinen Betrag. Beides kommt jetzt von dort, wo abgerechnet
 * wird: der Betrag vom Price des Abo-Postens, das Testphasenende aus
 * `trial_end`. Die Anzeigepreise in `plaene` pflegt niemand automatisch
 * mit (CLAUDE.md, „Nichts im Code hält beide synchron") — was hier steht,
 * ist deshalb der Betrag, der tatsächlich abgebucht wird.
 *
 * `current_period_end` liegt seit der Stripe-API `2025-03-31` am Posten,
 * nicht mehr am Abo.
 */
export type AboKonditionen = {
  /** Betrag je Abrechnungszeitraum in der kleinsten Einheit (Cent), netto. */
  betragCent: number | null;
  waehrung: string;
  intervall: Stripe.Price.Recurring.Interval | null;
  /** Ende der Testphase, solange sie läuft — sonst `null`. */
  testphaseEnde: Date | null;
  /** Ende des laufenden Abrechnungszeitraums. */
  periodeEnde: Date | null;
  /** Gesetzt, wenn das Abo gekündigt ist und zu diesem Zeitpunkt endet. */
  endetAm: Date | null;
  /**
   * Ob der Preis netto (`exclusive`) angelegt ist. Nur dann stimmt
   * „zzgl. USt." neben `betragCent`.
   */
  steuerverhalten: Stripe.Price.TaxBehavior | null;
  /** Ob Stripe Tax auf diesem Abo die Umsatzsteuer aufschlägt. */
  steuerAutomatisch: boolean;
};

export function aboKonditionen(abo: Stripe.Subscription): AboKonditionen {
  const posten = abo.items.data[0];
  const preis = posten?.price;
  const alsDatum = (sekunden: number | null | undefined) =>
    typeof sekunden === "number" ? new Date(sekunden * 1000) : null;

  const periodeEnde = alsDatum(posten?.current_period_end);

  return {
    betragCent: preis?.unit_amount ?? null,
    waehrung: preis?.currency ?? "eur",
    intervall: preis?.recurring?.interval ?? null,
    testphaseEnde: abo.status === "trialing" ? alsDatum(abo.trial_end) : null,
    periodeEnde,
    endetAm: abo.cancel_at_period_end ? periodeEnde : alsDatum(abo.cancel_at),
    steuerverhalten: preis?.tax_behavior ?? null,
    steuerAutomatisch: abo.automatic_tax.enabled,
  };
}

/**
 * Öffnet das Stripe-Kundenportal für einen Kunden.
 *
 * Dort kündigt der Kunde zum Ende des bezahlten Zeitraums (AGB § 6 Abs. 2),
 * ändert sein Zahlungsmittel und ruft Rechnungen ab. Welche dieser
 * Funktionen das Portal anbietet, steht **nicht** hier, sondern in der
 * Portal-Konfiguration im Stripe-Dashboard (Settings → Billing → Customer
 * portal). Ohne gespeicherte Konfiguration wirft Stripe beim Anlegen der
 * Sitzung — der Aufrufer fängt das ab und zeigt eine Meldung.
 *
 * Der Status in `betrieb_abonnements` ändert sich dadurch nicht direkt:
 * eine Kündigung zum Periodenende lässt das Abo bis dahin `active`, und
 * erst `customer.subscription.deleted` führt über den Webhook zu
 * `gekuendigt`.
 */
export async function erstelleKundenportal({
  kundeId,
  rueckkehrUrl,
  sprache,
}: {
  kundeId: string;
  rueckkehrUrl: string;
  sprache: "de" | "en";
}): Promise<string> {
  const sitzung = await stripeKlient().billingPortal.sessions.create({
    customer: kundeId,
    return_url: rueckkehrUrl,
    locale: sprache,
  });
  return sitzung.url;
}

/**
 * Fehler, der dem Kunden gezeigt werden darf — die Karte hat nicht
 * funktioniert, und das ist keine Panne auf unserer Seite.
 */
export class ZahlungAbgelehnt extends Error {
  constructor(nachricht: string) {
    super(nachricht);
    this.name = "ZahlungAbgelehnt";
  }
}

/** Stripe liefert ID-Felder mal als String, mal als aufgelöstes Objekt. */
function alsId(wert: string | { id?: string } | null | undefined): string | null {
  if (typeof wert === "string") return wert;
  return wert?.id ?? null;
}

/**
 * Weckt ein Abo auf, das mangels Zahlungsmittel `paused` war — und zwar
 * wirklich.
 *
 * `subscriptions.resume` allein genügt nicht. Am 2026-08-23 mit einer
 * Stripe-Testuhr beobachtet: der Aufruf erzeugt eine **offene Rechnung**
 * über den vollen Monatsbetrag mit `auto_advance: false`, und das Abo
 * bleibt `paused`, bis diese Rechnung bezahlt ist. Stripe zieht sie
 * irgendwann von selbst ein — im Test dauerte das über eine Stunde.
 *
 * Für die Sperrseite wäre das die schlechteste denkbare Reihenfolge: der
 * Kunde hinterlegt seine Karte, bekommt „danke" zu sehen und steht danach
 * weiter vor der Sperre, ohne zu wissen warum. Deshalb wird die Rechnung
 * hier sofort bezahlt; danach ist das Abo `active`, und die Ableitung
 * lässt ihn im selben Moment durch — weil sie bei `pausiert` Stripe
 * nachfragt, statt auf den Webhook zu warten (`aboLageBeiStripe`).
 *
 * `billing_cycle_anchor: "now"` startet den Zyklus bei der Wiederaufnahme.
 * Ohne das würde anteilig für die Zeit abgerechnet, in der das Abo
 * pausiert war — also für Tage, an denen niemand die Software nutzen
 * konnte.
 */
export async function nimmAboWiederAuf(
  aboId: string,
): Promise<Stripe.Subscription> {
  const abo = await stripeKlient().subscriptions.resume(aboId, {
    billing_cycle_anchor: "now",
  });

  return bezahleOffeneRechnung(
    abo,
    "Die Karte wurde abgelehnt. Deine Testphase ist abgelaufen und die erste Abbuchung steht an — versuch es mit einer anderen Zahlungsmethode.",
  );
}

/**
 * Bezahlt die offene letzte Rechnung eines Abos sofort — nach dem
 * Wiederaufnehmen (`nimmAboWiederAuf`) und beim ersten Zahlungsmittel
 * eines Abos ohne Testphase (`uebernimmZahlungsmittel`). In beiden Fällen
 * hängt das Abo, bis die Rechnung bezahlt ist, und in beiden Fällen soll
 * das nicht erst Stripes eigener Einzug irgendwann erledigen.
 *
 * Bei einer Lastschrift (SEPA) kehrt `invoices.pay` zurück, während die
 * Zahlung noch `processing` ist; Stripe setzt das Abo dabei laut Doku
 * gleich auf `active`.
 */
async function bezahleOffeneRechnung(
  abo: Stripe.Subscription,
  ablehnung: string,
): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();

  const rechnungId = alsId(abo.latest_invoice);
  if (!rechnungId) return abo;

  const rechnung = await stripe.invoices.retrieve(rechnungId);
  if (rechnung.status !== "open" || (rechnung.amount_due ?? 0) === 0) return abo;

  try {
    await stripe.invoices.pay(rechnungId);
  } catch (ursache) {
    /*
     * Karte abgelehnt, Deckung fehlt, 3DS nachträglich verlangt. Das Abo
     * bleibt, wo es war — der Aufrufer muss das sehen und darf keinen
     * Erfolg melden.
     */
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] invoices.pay(${rechnungId}): ${text}`);
    throw new ZahlungAbgelehnt(ablehnung);
  }

  return stripe.subscriptions.retrieve(abo.id);
}

/* ------------------------------------------------------------------ */
/* Zahlungsmittel                                                      */
/* ------------------------------------------------------------------ */

/**
 * Erzeugt den SetupIntent, dessen `client_secret` das Payment Element
 * füttert.
 *
 * Bewusst ein eigener SetupIntent und **nicht**
 * `subscription.pending_setup_intent`. Jenes Feld ist bei einem Trial
 * ohne Karte entgegen der naheliegenden Annahme gefüllt und benutzbar
 * (am 2026-08-19 gegen die Sandbox geprüft) — es kommt aber mit
 * `payment_method_types: ["card", "link"]` und ohne
 * `automatic_payment_methods`. Es zeigt also Karte und Link und sonst
 * nichts; SEPA-Lastschrift, im Zielmarkt AT/DE oft das bevorzugte
 * Zahlungsmittel, fiele weg.
 *
 * Ausserdem entsteht der `pending_setup_intent` einmalig beim Anlegen des
 * Abos. Gebraucht wird einer an zwei Zeitpunkten — in Schritt 2 und
 * womöglich Wochen später auf der Sperrseite. Einen frisch erzeugten kann
 * man einfach neu erzeugen; einen geteilten, dessen Zustand an einem
 * früheren Versuch hängt, nicht.
 *
 * `usage: "off_session"` ist die Zusage an die Bank, dass später ohne
 * anwesenden Kunden abgebucht wird. Genau das passiert am Ende der
 * Testphase; ohne diese Angabe lehnen Aussteller die spätere Belastung
 * eher ab.
 */
export async function erstelleSetupIntent(kundeId: string): Promise<{
  id: string;
  clientSecret: string;
}> {
  const intent = await stripeKlient().setupIntents.create({
    customer: kundeId,
    usage: "off_session",
    automatic_payment_methods: { enabled: true },
  });

  if (!intent.client_secret) {
    throw new Error(`SetupIntent ${intent.id} kam ohne client_secret zurück.`);
  }

  return { id: intent.id, clientSecret: intent.client_secret };
}

/**
 * Macht die frisch bestätigte Zahlungsmethode zur Standardmethode — und
 * weckt ein pausiertes Abo gleich mit auf.
 *
 * Gesetzt wird an **beiden** Stellen. Stripe schaut beim Abbuchen zuerst
 * auf das Abo und erst dann auf den Kunden; nur am Kunden zu setzen
 * genügt, solange das Abo keine eigene Methode trägt, und das ist eine
 * Bedingung, auf die man sich nicht verlassen sollte.
 *
 * Hier wird auch `automatic_tax` nachgezogen. Jedes Abo, das je etwas
 * abbucht, kommt durch diese Funktion — ein Abo aus der Zeit vor Stripe
 * Tax bekommt die Steuer damit spätestens hier, und zwar bevor
 * `nimmAboWiederAuf` die erste Rechnung erzeugt. Nur wenn sie fehlt: ein
 * `incomplete`-Abo trägt sie seit dem Anlegen, und an einem solchen wird
 * nur geändert, was die Stripe-Doku dafür vorsieht — das Zahlungsmittel.
 *
 * Ein Abo ohne Testphase (`incomplete`, siehe `erstelleAbo`) wird hier
 * bezahlt: seine erste Rechnung ist offen, seit es angelegt wurde.
 */
export async function uebernimmZahlungsmittel({
  kundeId,
  aboId,
  zahlungsmittelId,
  rechnung,
}: {
  kundeId: string;
  aboId: string;
  zahlungsmittelId: string;
  rechnung: Rechnungsangaben | null;
}): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();

  await stelleSteuerstandortSicher(kundeId, rechnung);

  await stripe.customers.update(kundeId, {
    invoice_settings: { default_payment_method: zahlungsmittelId },
  });

  const vorher = await stripe.subscriptions.retrieve(aboId);
  const abo = await stripe.subscriptions.update(aboId, {
    default_payment_method: zahlungsmittelId,
    ...(vorher.automatic_tax.enabled ? {} : { automatic_tax: { enabled: true } }),
  });

  /*
   * War die Testphase mangels Karte schon abgelaufen, liegt das Abo auf
   * `paused`. Jetzt, mit Zahlungsmittel, darf es weiterlaufen — das ist
   * der Weg zurück von der Sperrseite in den normalen Betrieb.
   */
  if (abo.status === "paused") {
    return nimmAboWiederAuf(abo.id);
  }

  if (abo.status === "incomplete") {
    return bezahleOffeneRechnung(
      abo,
      "Die Zahlung wurde abgelehnt, das Abo ist noch nicht gestartet. Versuch es mit einer anderen Zahlungsmethode.",
    );
  }

  return abo;
}
