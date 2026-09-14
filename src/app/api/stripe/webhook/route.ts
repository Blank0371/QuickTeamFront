import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { planAusPriceId } from "@/lib/stripe";

/**
 * Stripe-Webhook — die einzige Stelle im Projekt mit `service_role`.
 *
 * Warum überhaupt erhöhte Rechte: `betrieb_abonnements` trägt
 * ausschliesslich die SELECT-Policy `abonnement_select_chef`. Es gibt
 * keine Policy, unter der irgendwer die Zeile schreiben könnte — und ein
 * Request von Stripe bringt ohnehin keine Session mit. Ohne
 * `service_role` ist der Zahlungsstatus schlicht nicht speicherbar.
 *
 * Die Bedingungen aus CLAUDE.md, alle in dieser Datei eingelöst:
 *   1. nur hier, Route Handler mit `runtime = "nodejs"`
 *   2. der Key heisst `SUPABASE_SERVICE_ROLE_KEY`, nie mit `NEXT_PUBLIC_`
 *   3. der Client entsteht lokal in der Handler-Funktion, wird nirgends
 *      exportiert und ist aus keiner anderen Datei importierbar
 *   4. geschrieben wird ausschliesslich `betrieb_abonnements` (bei Stripe
 *      kündigt der Handler seit dem 2026-09-14 ausserdem ein Abo, dessen
 *      erste Lastschrift gescheitert ist — siehe unten)
 *   5. ohne gültige Signatur endet der Handler, bevor der Client existiert
 *   6. der Rohbody kommt aus `request.text()`, nicht aus `.json()`
 *
 * Taucht der Key in einer zweiten Datei auf, ist das ein Fehler.
 */

export const runtime = "nodejs";

/** Spiegelt den CHECK auf `betrieb_abonnements.status`. */
type AboStatus =
  | "trial"
  | "aktiv"
  | "zahlung_ausstehend"
  | "gekuendigt"
  | "pausiert";

/** Stripe liefert ID-Felder mal als String, mal als aufgelöstes Objekt. */
function alsId(wert: string | { id: string } | null | undefined): string | null {
  if (typeof wert === "string") return wert;
  return wert?.id ?? null;
}

function protokolliere(stelle: string, text: string): void {
  console.error(`[stripe-webhook] ${stelle}: ${text}`);
}

/* -------------------------------------------------------------------- */

/**
 * Übersetzt den Abo-Status von Stripe in unseren.
 *
 * Festgelegt am 2026-08-18 gegen die aktuelle Stripe-Doku, nicht aus dem
 * Gedächtnis. `null` heisst ausdrücklich „Status nicht anfassen" — für
 * Fälle, in denen der bestehende Wert richtiger ist als jeder neue.
 *
 * Der Zielwert ergibt sich nicht daraus, was ein Stripe-Status
 * *beschreibt*, sondern daraus, was das dreistufige Tor aus CLAUDE.md
 * damit *tut*. `gekuendigt` ist der einzige Wert, der jemanden zurück in
 * den Checkout schickt; er muss also „muss neu abschliessen" bedeuten und
 * nicht „schuldet uns gerade Geld". Deshalb liegen `unpaid` und
 * `incomplete_expired` auseinander, obwohl beide nach „hat nicht bezahlt"
 * klingen: im einen Fall steht noch ein lebendes Abo im Weg, im anderen
 * nicht.
 *
 *   trialing            → trial
 *   active              → aktiv
 *   past_due            → zahlung_ausstehend
 *   unpaid              → zahlung_ausstehend
 *   canceled            → gekuendigt
 *   incomplete          → null
 *   incomplete_expired  → gekuendigt
 *   paused              → pausiert
 *
 * Begründung je Fall steht am Zweig.
 */
function statusAusStripe(
  stripeStatus: Stripe.Subscription.Status,
): AboStatus | null {
  switch (stripeStatus) {
    case "trialing":
      return "trial";

    case "active":
      return "aktiv";

    /*
     * Stripe mahnt noch (Smart Retries laufen), das Abo lebt. Nicht
     * sperren: eine erfolgreiche Nachzahlung hebt es von allein wieder
     * auf `active`.
     */
    case "past_due":
      return "zahlung_ausstehend";

    /*
     * Retries erschöpft, Abo läuft aber weiter und Stripe versucht
     * keinen Einzug mehr. Nach unserer Dashboard-Einstellung („Abo
     * kündigen nach Ablauf der Retries") tritt dieser Zustand gar nicht
     * mehr auf — die Zeile bleibt als Netz, falls die Einstellung
     * jemand ändert.
     *
     * Nicht auf `gekuendigt`, obwohl Stripe empfiehlt, den Zugang zu
     * entziehen: `gekuendigt` schickt in den Checkout, das Abo existiert
     * aber noch. Es entstünde ein zweites daneben.
     */
    case "unpaid":
      return "zahlung_ausstehend";

    /*
     * Endstation, laut Stripe nicht mehr änderbar. Neu abschliessen ist
     * der vorgesehene Weg zurück — genau das tut Stufe 1.
     */
    case "canceled":
      return "gekuendigt";

    /*
     * Die allererste Zahlung hängt: Karte abgelehnt, 3DS offen oder
     * PaymentIntent in `processing`. Fenster von 23 Stunden, danach
     * fällt der Zustand von selbst nach `active` oder
     * `incomplete_expired`. Bis dahin wäre jeder geschriebene Wert eine
     * Behauptung über etwas, das noch nicht entschieden ist.
     */
    case "incomplete":
      return null;

    /*
     * Die 23 Stunden sind verstrichen. Das Abo ist tot und stellt
     * niemandem mehr etwas in Rechnung — es kommt aus eigener Kraft nie
     * zurück. Liessen wir den Status stehen, bliebe `trial` in der
     * Zeile, und weil `stripe_subscription_id` längst gesetzt ist,
     * griffe Stufe 1 nicht: dauerhafter Zugang ohne Zahlung. Ein zweites
     * Abo kann hier nicht entstehen, das erste ist erloschen.
     */
    case "incomplete_expired":
      return "gekuendigt";

    /*
     * Entsteht, wenn eine Testphase ohne hinterlegtes Zahlungsmittel
     * endet (`missing_payment_method: 'pause'`) — seit dem überspringbaren
     * Zahlungsschritt vom 2026-08-19 der Normalfall, nicht ausgeschlossen.
     * Nach 90 Tagen kündigt `api/cron/testphasen-beenden` bei Stripe.
     * Nicht zu verwechseln mit „Zahlungseinzug pausieren" im Dashboard —
     * das ist `pause_collection` und lässt `status` auf `active`.
     */
    case "paused":
      return "pausiert";

    /*
     * `Stripe.Subscription.Status` ist keine geschlossene Union, das SDK
     * hängt `| OtherString` an: TypeScript erzwingt hier keine
     * Vollständigkeit, und Stripe darf einen neunten Wert nachliefern.
     * Der Zweig ist deshalb kein Rest, sondern eine Regel — unbekannter
     * Status heisst Status nicht anfassen und ins Log schreiben.
     */
    default:
      protokolliere(
        "statusAusStripe",
        `unbekannter Stripe-Status "${stripeStatus}" — Status bleibt unverändert`,
      );
      return null;
  }
}

/* -------------------------------------------------------------------- */

/**
 * Kündigt ein Abo, dessen erste Zahlung per Lastschrift gescheitert ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das nötig ist
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bei Zahlungsmitteln mit verzögerter Bestätigung — für uns SEPA — setzt
 * Stripe ein Abo ohne Testphase **sofort** auf `active`, während die
 * erste Zahlung noch `processing` ist. Scheitert sie Tage später, storniert
 * Stripe die Rechnung, **und das Abo bleibt `active`** (Stripe-Doku „How
 * subscriptions work", Abschnitt „Payment methods with delayed payment
 * confirmation", am 2026-09-14 nachgelesen). Eine stornierte Rechnung zählt
 * für den Status nicht mehr; unsere Zeile stünde also bis zur nächsten
 * Monatsrechnung auf `aktiv` — ein Monat Zugang ohne Zahlung, und nach
 * der Kündigung beliebig oft wiederholbar.
 *
 * Betroffen ist der Neuabschluss nach Kündigung (`erstelleAbo` ohne
 * Testphase). Scheitert dagegen die Abbuchung am Ende einer Testphase,
 * ist das eine gewöhnliche Folgerechnung: `past_due`, Mahnlauf, danach
 * gekündigt — wie bei einer Karte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was hier geschieht — und was nicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Gekündigt wird **bei Stripe**, nicht in unserer Zeile. Eine Zeile auf
 * `gekuendigt` neben einem Abo, das bei Stripe weiterläuft, hielte nicht:
 * die Tore fragen bei `gekuendigt` nach und fänden ein lebendes Abo.
 * Das Kündigen löst `customer.subscription.deleted` aus, und erst dieses
 * Ereignis schreibt `gekuendigt` — über denselben Zweig wie jede andere
 * Kündigung. Den Status schreibt damit weiterhin nie ein `invoice.*`.
 *
 * Nachgeschlagen wird frisch, nicht aus dem Ereignis: eine spät
 * zugestellte Meldung über einen gescheiterten ersten Kartenversuch darf
 * kein Abo kündigen, das inzwischen mit einer anderen Karte bezahlt ist.
 * Gekündigt wird deshalb nur, wenn die Erstrechnung **jetzt** unbezahlt
 * ist und das Abo **jetzt** trotzdem `active`. Bei einer abgelehnten
 * Karte ist es `incomplete` und verfällt nach 23 Stunden von selbst.
 *
 * Wer gekündigt wird, landet beim nächsten Seitenaufruf im Zahlungsschritt
 * und schliesst neu ab — ohne Testphase, sofort fällig. Bleibt ein
 * Zeitfenster: bis die Bank die Lastschrift zurückgibt, läuft der Zugang.
 * Das sind Tage statt eines Monats; ganz schliessen liesse es sich nur,
 * indem man den Zugang bis zum Zahlungseingang zurückhält.
 */
async function kuendigeNachGescheiterterErstzahlung(
  stripe: Stripe,
  eingang: Stripe.Invoice,
): Promise<Response> {
  if (eingang.billing_reason !== "subscription_create") {
    return new Response("ok (keine Erstrechnung)", { status: 200 });
  }

  const aboId = alsId(eingang.parent?.subscription_details?.subscription);
  if (!aboId || !eingang.id) {
    return new Response("ok (ohne Abo)", { status: 200 });
  }

  const [rechnung, abo] = await Promise.all([
    stripe.invoices.retrieve(eingang.id),
    stripe.subscriptions.retrieve(aboId),
  ]);

  if (!abo.metadata?.["betrieb_id"]) {
    return new Response("ok (ohne Zuordnung)", { status: 200 });
  }

  if (rechnung.status === "paid" || abo.status !== "active") {
    return new Response("ok (nichts zu tun)", { status: 200 });
  }

  await stripe.subscriptions.cancel(abo.id, {
    cancellation_details: {
      comment: "Erstzahlung gescheitert, Abo blieb active (verzögerte Bestätigung)",
    },
  });

  protokolliere(
    "invoice.payment_failed",
    `Abo ${abo.id} gekündigt: Erstrechnung ${rechnung.id} ist ${rechnung.status}, Abo war active`,
  );
  return new Response("ok (gekündigt)", { status: 200 });
}

/* -------------------------------------------------------------------- */

export async function POST(request: Request): Promise<Response> {
  /*
   * Rohbody, nicht `.json()`. Stripe signiert die Bytes, wie sie
   * gesendet wurden — ein Umweg über Parsen und Neuserialisieren ändert
   * Reihenfolge und Whitespace, und die Signaturprüfung schlägt fehl.
   */
  const rohBody = await request.text();
  const signatur = request.headers.get("stripe-signature");

  /*
   * Statische Zugriffe auf `process.env`, kein dynamischer Index — sonst
   * kann Next beim Bündeln nichts einsetzen. Gelesen wird erst hier im
   * Handler und nicht modulweit: ein fehlender Wert soll diesen einen
   * Request beantworten und nicht den Build sprengen.
   */
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const konfiguration: ReadonlyArray<readonly [name: string, wert: string]> = [
    ["STRIPE_SECRET_KEY", stripeSecret],
    ["STRIPE_WEBHOOK_SECRET", webhookSecret],
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ];

  const fehlend = konfiguration
    .filter(([, wert]) => wert.length === 0)
    .map(([name]) => name);

  if (fehlend.length > 0) {
    protokolliere("konfiguration", `fehlende Variablen: ${fehlend.join(", ")}`);
    // 500, damit Stripe erneut zustellt, sobald die Konfiguration steht.
    return new Response("Konfiguration unvollständig", { status: 500 });
  }

  if (!signatur) {
    return new Response("Header stripe-signature fehlt", { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);

  /*
   * Bedingung 5 aus CLAUDE.md: alles vor dieser Prüfung kommt ohne
   * erhöhte Rechte aus. Erst danach entsteht der Supabase-Client.
   */
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rohBody, signatur, webhookSecret);
  } catch (fehler) {
    const text = fehler instanceof Error ? fehler.message : String(fehler);
    protokolliere("constructEvent", text);
    // 400 und kein Retry: eine ungültige Signatur wird beim zweiten
    // Zustellversuch auch nicht gültig.
    return new Response("Signatur ungültig", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /** Zeitpunkt des Ereignisses bei Stripe, nicht der Zustellung. */
  const ereignisZeit = new Date(event.created * 1000).toISOString();

  try {
    switch (event.type) {
      /*
       * Die Subscription-Ereignisse sind seit dem Stepper die einzige
       * Quelle für diese Zeile. Vorher schrieb `checkout.session.completed`
       * Plan und IDs und diese Ereignisse nur den Status; mit dem Wegfall
       * des Checkouts fällt jene Aufteilung weg — `customer.subscription.*`
       * trägt jetzt alles auf einmal.
       *
       * Der Status kommt weiterhin ausschliesslich von hier und nie aus
       * `invoice.*`: mit `trial_period_days` stellt Stripe zum
       * Trial-Beginn eine Rechnung über 0,00 aus und markiert sie als
       * bezahlt. Ein Handler auf `invoice.paid` würde daraus „aktiv"
       * machen und die Testphase in dem Moment beenden, in dem sie
       * beginnt.
       */
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const abo = event.data.object;

        const betriebId = abo.metadata?.["betrieb_id"];
        if (!betriebId) {
          protokolliere(
            event.type,
            `Abo ${abo.id} ohne betrieb_id in den Metadaten — nicht zuzuordnen`,
          );
          // 200: ein Retry liefert dieselben Metadaten. Das ist der
          // Normalfall für Abos, die im Dashboard von Hand entstanden sind.
          return new Response("ok (ohne Zuordnung)", { status: 200 });
        }

        const neuerStatus = statusAusStripe(abo.status);

        /*
         * Der Plan wird aus der Price-ID am Posten abgeleitet, nicht aus
         * den Metadaten. Der Preis *ist* der Plan; Metadaten wären eine
         * zweite Wahrheit, die bei jedem Wechsel mitgepflegt werden
         * müsste. Ist der Preis keiner der drei bekannten, bleibt `plan`
         * unangetastet statt geraten zu werden.
         */
        const plan = planAusPriceId(abo.items.data[0]?.price.id);
        if (plan === null) {
          protokolliere(
            event.type,
            `Preis von ${abo.id} gehört zu keinem bekannten Plan — plan bleibt unverändert`,
          );
        }

        /*
         * Zusammengesetzt statt starr: ein Feld, das wir nicht sicher
         * kennen, wird gar nicht erst geschrieben. Ein `null` an dieser
         * Stelle wäre eine Aussage, und zwar eine falsche.
         */
        const felder: Record<string, string> = {
          stripe_subscription_id: abo.id,
          aktualisiert_am: ereignisZeit,
        };

        const kundeId = alsId(abo.customer);
        if (kundeId) felder["stripe_customer_id"] = kundeId;
        if (plan !== null) felder["plan"] = plan;
        if (neuerStatus !== null) felder["status"] = neuerStatus;

        /*
         * Zustellungen kommen nicht zwingend in der Reihenfolge, in der
         * die Ereignisse entstanden sind. `aktualisiert_am` trägt die
         * Ereigniszeit, und ein älteres Ereignis darf ein jüngeres nicht
         * überschreiben. Bei Gleichstand gewinnt das später zugestellte —
         * innerhalb derselben Sekunde ist die Reihenfolge ohnehin
         * willkürlich, und ein wiederholt zugestelltes Ereignis schreibt
         * denselben Wert noch einmal, was folgenlos ist.
         *
         * Die Tabelle hat keinen Trigger auf `aktualisiert_am` — anders
         * als anderswo im Schema muss der Wert hier von Hand mit.
         */
        const treffer = await supabase
          .from("betrieb_abonnements")
          .update(felder)
          .eq("betrieb_id", betriebId)
          .lte("aktualisiert_am", ereignisZeit)
          .select("betrieb_id");

        if (treffer.error) {
          protokolliere(event.type, treffer.error.message);
          return new Response("Schreibfehler", { status: 500 });
        }

        if (treffer.data && treffer.data.length > 0) {
          return new Response("ok", { status: 200 });
        }

        /*
         * Nichts geschrieben — zwei Gründe, die auseinandergehalten
         * werden müssen. Entweder gibt es die Zeile nicht (dann stimmt
         * die betrieb_id nicht, und daran ändert kein Retry etwas), oder
         * das Ereignis war älter als der gespeicherte Stand.
         *
         * Die Zeile selbst legt der Trigger beim Anlegen des Betriebs an,
         * und das Abo entsteht immer erst danach. Ein fehlender Betrieb
         * ist hier also kein Wettlauf, sondern ein echter Fehlgriff.
         */
        const vorhanden = await supabase
          .from("betrieb_abonnements")
          .select("betrieb_id")
          .eq("betrieb_id", betriebId)
          .maybeSingle();

        if (vorhanden.error) {
          protokolliere(event.type, vorhanden.error.message);
          return new Response("Lesefehler", { status: 500 });
        }

        if (vorhanden.data) {
          protokolliere(
            event.type,
            `veraltetes Ereignis für ${abo.id} übergangen (${ereignisZeit})`,
          );
          return new Response("ok (veraltet)", { status: 200 });
        }

        protokolliere(event.type, `kein Betrieb mit id ${betriebId}`);
        return new Response("Betrieb nicht gefunden", { status: 404 });
      }

      /*
       * Das einzige `invoice.*`-Ereignis, das hier behandelt wird, und es
       * schreibt nichts in die Datenbank — es kündigt bei Stripe. Warum,
       * steht bei `kuendigeNachGescheiterterErstzahlung`. Ein Fehler beim
       * Nachschlagen oder Kündigen fällt in den `catch` unten: 500, und
       * Stripe stellt erneut zu. Ein zweiter Durchlauf findet das Abo dann
       * gekündigt und tut nichts.
       */
      case "invoice.payment_failed":
        return await kuendigeNachGescheiterterErstzahlung(stripe, event.data.object);

      default:
        // Alles andere ist bewusst unbeantwortet — mit 200, damit Stripe
        // es nicht tagelang erneut versucht.
        return new Response("ok (nicht behandelt)", { status: 200 });
    }
  } catch (fehler) {
    const text = fehler instanceof Error ? fehler.message : String(fehler);
    protokolliere(event.type, `unerwartet: ${text}`);
    return new Response("Fehler", { status: 500 });
  }
}
