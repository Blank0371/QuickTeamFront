import Stripe from "stripe";
import type { Locale } from "@/i18n/config";
import type { Rechnungsangaben } from "@/lib/betrieb";
import { stripeKlient } from "@/lib/stripe-konfiguration";
import { stelleSteuerstandortSicher } from "@/lib/stripe-rechnung";
import { stripeSprache } from "@/lib/stripe-sprache";

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
  sprache: Locale;
}): Promise<string> {
  const sitzung = await stripeKlient().billingPortal.sessions.create({
    customer: kundeId,
    return_url: rueckkehrUrl,
    locale: stripeSprache(sprache),
  });
  return sitzung.url;
}

/**
 * In welcher Lage eine Zahlung abgelehnt wurde — bestimmt den Satz, den
 * der Kunde sieht (`zahlung.ablehnung` im Wörterbuch).
 *
 *   `nicht-gestartet`   neues Abo, Erstrechnung abgelehnt
 *   `noch-nicht`        bestehendes, noch unbezahltes Abo (`incomplete`)
 *   `testphase`         pausiertes Abo nach der Testphase, Wiederaufnahme
 */
export type AblehnungsArt = "nicht-gestartet" | "noch-nicht" | "testphase";

/**
 * Fehler, der dem Kunden gezeigt werden darf — die Karte hat nicht
 * funktioniert, und das ist keine Panne auf unserer Seite.
 *
 * Trägt die Lage, nicht den Satz: diese Datei kennt die Sprache der
 * Anfrage nicht. Übersetzt wird beim Aufrufer (`zahlung-aktionen.ts`).
 */
export class ZahlungAbgelehnt extends Error {
  readonly art: AblehnungsArt;

  constructor(art: AblehnungsArt) {
    super(`Zahlung abgelehnt (${art})`);
    this.name = "ZahlungAbgelehnt";
    this.art = art;
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

  return bezahleOffeneRechnung(abo, "testphase");
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
export async function bezahleOffeneRechnung(
  abo: Stripe.Subscription,
  ablehnung: AblehnungsArt,
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
    return bezahleOffeneRechnung(abo, "noch-nicht");
  }

  return abo;
}
