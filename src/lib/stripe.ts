import Stripe from "stripe";

import type { Rechnungsangaben } from "@/lib/betrieb";
import { plaene, TESTPHASE_TAGE, type PlanId } from "@/lib/site";
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
 * Statische Zugriffe, kein dynamischer Index über den Plan-Namen — sonst
 * kann Next beim Bündeln nichts einsetzen und alle drei Werte sind zur
 * Laufzeit leer. Die Aufzählung ist über `PlanId` vollständig; kommt ein
 * vierter Plan dazu, meldet sich der Compiler hier.
 */
function priceIdAusEnv(plan: PlanId): string {
  switch (plan) {
    case "basic":
      return process.env.STRIPE_PRICE_BASIC?.trim() ?? "";
    case "pro":
      return process.env.STRIPE_PRICE_PRO?.trim() ?? "";
    case "business":
      return process.env.STRIPE_PRICE_BUSINESS?.trim() ?? "";
  }
}

/** Wirft mit dem Namen der fehlenden Variablen, nicht mit „undefined". */
export function priceIdFuer(plan: PlanId): string {
  const priceId = priceIdAusEnv(plan);
  if (priceId.length === 0) {
    throw new KonfigurationsFehler(
      `Für den Plan "${plan}" ist keine Stripe-Price-ID hinterlegt. ` +
        `Erwartet wird STRIPE_PRICE_${plan.toUpperCase()} in der Umgebung.`,
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
 * `null`, wenn der Preis keiner der drei ist. Das ist kein Fehler,
 * sondern eine Beobachtung: dann gehört das Abo nicht zu unseren Plänen,
 * und wir schreiben lieber nichts als etwas Geratenes.
 */
export function planAusPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of plaene) {
    if (priceIdAusEnv(plan.id) === priceId) return plan.id;
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
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (secret.length === 0) {
    throw new KonfigurationsFehler("STRIPE_SECRET_KEY fehlt in der Umgebung.");
  }
  return new Stripe(secret);
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
}: {
  betriebId: string;
  email: string;
  /** `betrieb_abonnements.stripe_customer_id`, sofern der Webhook schon lief. */
  kundeId?: string | null;
}): Promise<Stripe.Customer | null> {
  const stripe = stripeKlient();

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

/** Die hinterlegte EU-USt-IdNr. des Kunden, oder `null`. */
export async function holeUid(kundeId: string): Promise<string | null> {
  const ids = await stripeKlient().customers.listTaxIds(kundeId, { limit: 10 });
  return ids.data.find((id) => id.type === "eu_vat")?.value ?? null;
}

/**
 * Hinterlegt die UID-Nummer als Steuer-ID am Kunden.
 *
 * Daran entscheidet Stripe Tax, ob ein grenzüberschreitender Umsatz an
 * einen österreichischen Betrieb nach dem Reverse-Charge-Verfahren läuft.
 * Stripe prüft die Nummer danach selbst gegen VIES.
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
}: {
  betriebId: string;
  email: string;
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
  const kunde = await sucheKunde({ betriebId, email, kundeId });
  if (!kunde) return null;

  const abos = await stripeKlient().subscriptions.list({
    customer: kunde.id,
    status: "all",
    limit: 100,
  });

  return abos.data.find((abo) => !ERLEDIGT.includes(abo.status)) ?? null;
}

/**
 * Legt das Abonnement mit Testphase an — ohne Zahlungsmittel.
 *
 * Bei einem Trial ist nichts fällig: Stripe stellt eine Rechnung über
 * 0,00 mit dem Posten „Free trial" aus, und das Abo geht direkt auf
 * `trialing`. `payment_behavior` bleibt deshalb ungesetzt; der Parameter
 * regelt, was bei einer *fälligen* ersten Zahlung geschieht, und die gibt
 * es hier nicht.
 *
 * `missing_payment_method: "pause"` ist die tragende Einstellung des
 * ganzen Flows: läuft die Testphase ohne hinterlegte Karte ab, setzt
 * Stripe das Abo auf `paused`, der Webhook schreibt daraus `pausiert`,
 * und daran erkennt die Website den Ablauf — ohne eigene Datumsrechnung
 * und ohne eine Spalte, die es in `betrieb_abonnements` nicht gibt.
 * `cancel` wäre endgültig und `create_invoice` würde nur mahnen.
 *
 * Ist bereits ein Abo da, wird keins angelegt. Der Aufrufer bekommt das
 * vorhandene zurück und kann darauf `wechslePlan` anwenden.
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
  email,
  kundeId = null,
  rechnung,
}: {
  betriebId: string;
  plan: PlanId;
  email: string;
  kundeId?: string | null;
  rechnung: Rechnungsangaben | null;
}): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();
  const preis = priceIdFuer(plan);

  const vorhanden = await holeAboFuerBetrieb({ betriebId, email, kundeId });
  if (vorhanden) return vorhanden;

  const kunde = await holeOderErstelleKunde({ betriebId, email, kundeId, rechnung });

  return stripe.subscriptions.create(
    {
      customer: kunde.id,
      items: [{ price: preis }],
      trial_period_days: TESTPHASE_TAGE,
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      payment_settings: { save_default_payment_method: "on_subscription" },
      automatic_tax: { enabled: true },
      metadata: { [BETRIEB_SCHLUESSEL]: betriebId },
    },
    /*
     * Der Plan steht im Schlüssel, und das ist Absicht. Ohne ihn würde
     * ein späterer Wechsel auf denselben Schlüssel laufen und Stripe
     * einen Fehler werfen, weil die Parameter nicht mehr passen. Mit ihm
     * schützt der Schlüssel genau das, wogegen er schützen soll — den
     * Doppelklick — und steht einem echten Planwechsel nicht im Weg.
     * `:steuer` aus demselben Grund wie beim Kunden.
     */
    { idempotencyKey: `betrieb:${betriebId}:abo:${plan}:steuer` },
  );
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
): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();
  const preis = priceIdFuer(plan);

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
export async function kuendigeAbo(aboId: string): Promise<Stripe.Subscription> {
  return stripeKlient().subscriptions.cancel(aboId);
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
 * lässt ihn im selben Moment durch.
 *
 * `billing_cycle_anchor: "now"` startet den Zyklus bei der Wiederaufnahme.
 * Ohne das würde anteilig für die Zeit abgerechnet, in der das Abo
 * pausiert war — also für Tage, an denen niemand die Software nutzen
 * konnte.
 */
export async function nimmAboWiederAuf(
  aboId: string,
): Promise<Stripe.Subscription> {
  const stripe = stripeKlient();
  const abo = await stripe.subscriptions.resume(aboId, {
    billing_cycle_anchor: "now",
  });

  const rechnungId = alsId(abo.latest_invoice);
  if (!rechnungId) return abo;

  const rechnung = await stripe.invoices.retrieve(rechnungId);
  if (rechnung.status !== "open" || (rechnung.amount_due ?? 0) === 0) return abo;

  try {
    await stripe.invoices.pay(rechnungId);
  } catch (ursache) {
    /*
     * Karte abgelehnt, Deckung fehlt, 3DS nachträglich verlangt. Das Abo
     * bleibt pausiert — der Aufrufer muss das sehen und darf keinen
     * Erfolg melden.
     */
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] invoices.pay(${rechnungId}): ${text}`);
    throw new ZahlungAbgelehnt(
      "Die Karte wurde abgelehnt. Deine Testphase ist abgelaufen und die erste Abbuchung steht an — versuch es mit einer anderen Zahlungsmethode.",
    );
  }

  return stripe.subscriptions.retrieve(aboId);
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
 * `nimmAboWiederAuf` die erste Rechnung erzeugt.
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

  const abo = await stripe.subscriptions.update(aboId, {
    default_payment_method: zahlungsmittelId,
    automatic_tax: { enabled: true },
  });

  /*
   * War die Testphase mangels Karte schon abgelaufen, liegt das Abo auf
   * `paused`. Jetzt, mit Zahlungsmittel, darf es weiterlaufen — das ist
   * der Weg zurück von der Sperrseite in den normalen Betrieb.
   */
  if (abo.status === "paused") {
    return nimmAboWiederAuf(abo.id);
  }

  return abo;
}
