import Stripe from "stripe";
import { plaene, type Abrechnung, type PlanId } from "@/lib/site";
import { verlangeSoftLaunchFrei } from "@/lib/soft-launch-riegel";

/** Schlüssel, unter dem die Betriebszuordnung an Stripe-Objekten hängt. */
export const BETRIEB_SCHLUESSEL = "betrieb_id";

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
export function stripeKlientOhneRiegel(): Stripe {
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
export function klientFuer(trotzSoftLaunch: boolean): Stripe {
  return trotzSoftLaunch ? stripeKlientOhneRiegel() : stripeKlient();
}
