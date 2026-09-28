import Stripe from "stripe";
import type { Rechnungsangaben } from "@/lib/betrieb";
import { type Abrechnung, type PlanId } from "@/lib/site";
import { BETRIEB_SCHLUESSEL, klientFuer, priceIdFuer, stripeKlient, stripeKlientOhneRiegel } from "@/lib/stripe-konfiguration";
import { holeOderErstelleKunde, sucheKunde } from "@/lib/stripe-kunde";

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

export async function verlaufFuerKunde(
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
