import type { AboLage } from "@/lib/stripe";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Die Zeile aus `betrieb_abonnements`, am 2026-08-18 gegen die Live-DB
 * geprüft. Angelegt wird sie nicht von hier, sondern vom Trigger
 * `trg_betrieb_erstelle_einstellungen` beim Insert in `betriebe` — mit
 * `plan = 'basic'` und `status = 'trial'`.
 *
 * Gelesen wird mit der Session des Chefs unter `abonnement_select_chef`.
 * Geschrieben wird von hier aus nie: es gibt gar keine Policy dafür, das
 * macht ausschliesslich der Webhook.
 */
export type Abo = {
  betrieb_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  aktualisiert_am: string;
};

export async function holeAbo(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Abo | null> {
  const { data, error } = await supabase
    .from("betrieb_abonnements")
    .select(
      "betrieb_id, plan, status, stripe_customer_id, stripe_subscription_id, aktualisiert_am",
    )
    .eq("betrieb_id", betriebId)
    .maybeSingle();

  if (error) {
    console.error(`[abo] select(${betriebId}): ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Testphase abgelaufen, ohne dass je ein Zahlungsmittel hinterlegt wurde.
 *
 * Das ist der einzige Zustand, der website-seitig wirklich sperrt. Er
 * kommt nicht aus einer Datumsrechnung — `betrieb_abonnements` hat gar
 * keine Spalte für das Ende der Testphase. Stattdessen rechnet Stripe:
 * mit `trial_settings.end_behavior.missing_payment_method = "pause"`
 * geht das Abo beim Ablauf auf `paused`, schickt
 * `customer.subscription.paused`, und der Webhook schreibt `pausiert`.
 *
 * Nicht zu verwechseln mit „Zahlungseinzug pausieren" im Dashboard — das
 * ist `pause_collection` und lässt den Stripe-Status auf `active`.
 */
export function testphaseAbgelaufen(abo: Abo | null): boolean {
  return abo?.status === "pausiert";
}

/**
 * Das Abo ist gekündigt und kommt aus eigener Kraft nicht zurück.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das eine eigene Frage ist und nicht unter „kein Abo" fällt.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `stripe_subscription_id` bleibt bei einer Kündigung **stehen** — der
 * Webhook schreibt `status = 'gekuendigt'` und lässt die ID unangetastet,
 * weil sie weiterhin auf ein echtes Objekt bei Stripe zeigt. Wer den
 * Zustand nur an der ID abliest, sieht deshalb „Abo vorhanden", und ein
 * gekündigter Betrieb liefe unbegrenzt weiter.
 *
 * `testphaseAbgelaufen()` fängt ihn auch nicht: die prüft `pausiert`,
 * und das ist ein anderer Zustand mit einem anderen Ausgang — pausiert
 * wird durch Nachreichen einer Karte wieder flott, gekündigt nicht.
 * Der Weg zurück aus `gekuendigt` ist ein neuer Abschluss.
 *
 * Deshalb diese Funktion und nicht ein erweitertes
 * `testphaseAbgelaufen()`: zwei Zustände, die verschiedene Antworten
 * verlangen, dürfen sich nicht hinter einem Namen verstecken.
 */
export function aboGekuendigt(abo: Abo | null): boolean {
  return abo?.status === "gekuendigt";
}

/**
 * Was die Abo-Lage für den Zugang heisst — die eine Entscheidung, die
 * Stepper (`ermittleStandFuer`) und Dashboard-Tor (`pruefeSperre`)
 * gemeinsam haben. Beide übersetzen nur noch das Ergebnis: der Stepper
 * in einen `Stand`, das Tor in einen `redirect`. Vorher stand dieselbe
 * Bedingung in beiden Dateien wörtlich kopiert.
 *
 * - `frei`       — Stripe sagt, das Abo läuft
 * - `sperrseite` — bei Stripe pausiert, oder Stripe antwortet nicht und
 *                  unsere Zeile sagt `pausiert` (gesperrt bleibt gesperrt)
 * - `zahlung`    — alles andere: kein, ein unbezahltes oder ein
 *                  gekündigtes Abo, auch bei Funkstille von Stripe
 */
export type AboSperre = "frei" | "zahlung" | "sperrseite";

export function aboSperre(abo: Abo | null, lage: AboLage): AboSperre {
  if (lage === "laeuft") return "frei";
  if (lage === "pausiert" || (lage === "unbekannt" && testphaseAbgelaufen(abo))) {
    return "sperrseite";
  }
  return "zahlung";
}

/**
 * Ob die eigene Zeile Anlass gibt, Stripe zu fragen. Nur dann entsteht
 * ein Stripe-Aufruf — bei einem laufenden Abo kostet das Tor nichts.
 *
 * `auchOhneSubscription` ist der eine Unterschied zwischen den Toren, und
 * er steht hier als Argument, damit er an der Aufrufstelle sichtbar ist:
 * der Stepper fragt auch, wenn die Zeile noch keine Subscription-ID trägt
 * (vor dem ersten Abschluss, oder der Webhook ist unterwegs); das
 * Dashboard-Tor nicht — sonst sperrte es jeden Betrieb, der ohne Stripe
 * entstanden ist (etwa über die App), bei jedem Seitenaufruf aus.
 */
export function mussStripeFragen(
  abo: Abo | null,
  { auchOhneSubscription }: { auchOhneSubscription: boolean },
): boolean {
  if (aboGekuendigt(abo) || testphaseAbgelaufen(abo)) return true;
  return auchOhneSubscription && !abo?.stripe_subscription_id;
}

/*
 * Hier stand `naechsterSchritt()`, das zwischen Checkout und Wizard
 * entschied. Mit dem Wegfall der Weiterleitung zu Stripe ist die Frage
 * eine andere geworden: nicht mehr „hat bezahlt?", sondern „wie weit ist
 * die Einrichtung?". Die vollständige Ableitung — inklusive der Frage,
 * ob Rollen und Vorlagen schon stehen — entsteht mit dem Stepper-Gerüst
 * und braucht Daten, die diese Datei nicht kennt.
 */
