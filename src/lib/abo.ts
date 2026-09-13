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
 * Stripe mahnt gerade. Kein Grund zu sperren, aber einer, es zu sagen —
 * sonst erfährt der Betrieb erst davon, wenn das Abo weg ist.
 */
export function zahlungStockt(abo: Abo | null): boolean {
  return abo?.status === "zahlung_ausstehend";
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

/*
 * Hier stand `naechsterSchritt()`, das zwischen Checkout und Wizard
 * entschied. Mit dem Wegfall der Weiterleitung zu Stripe ist die Frage
 * eine andere geworden: nicht mehr „hat bezahlt?", sondern „wie weit ist
 * die Einrichtung?". Die vollständige Ableitung — inklusive der Frage,
 * ob Rollen und Vorlagen schon stehen — entsteht mit dem Stepper-Gerüst
 * und braucht Daten, die diese Datei nicht kennt.
 */
