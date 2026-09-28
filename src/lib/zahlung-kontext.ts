import "server-only";

import type Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { holeAbo } from "@/lib/abo";
import { holeChefBetriebId, holeRechnungsangaben, type Rechnungsangaben } from "@/lib/betrieb";
import { suchePendingKunde } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Wer zahlt — für die Server Actions des Zahlungsschritts
 * (`einrichtung/zahlung/aktionen.ts`, `zahlung-aktionen.ts`).
 *
 * Bis 2026-09-28 stand `kontext()` wörtlich in beiden Dateien und
 * `pendingKontext()` einmal als Funktion und einmal eingebettet in
 * `betriebAbschliessen`. Jede Kopie leitet dasselbe serverseitig ab —
 * nichts davon kommt aus dem Formular (`.claude/rules/security.md`).
 */

/**
 * Der bestehende Betrieb.
 *
 * `kundeId` ist `betrieb_abonnements.stripe_customer_id` (oder `null`,
 * solange der Webhook noch nicht gelaufen ist) — seit dem 2026-08-28 der
 * erste Weg, auf dem `sucheKunde()` den Stripe-Kunden findet; die
 * E-Mail-Adresse ist nur noch der Rückfall. Wer sie nicht mitgibt, bekommt
 * stillschweigend das alte Verhalten — und damit das Risiko eines zweiten
 * Abos, wenn jemand seine Anmelde-Adresse geändert hat.
 */
export type BetriebZahlungKontext = {
  betriebId: string;
  email: string;
  kundeId: string | null;
  /** Name und Land für Stripe Tax — siehe `stelleSteuerstandortSicher`. */
  rechnung: Rechnungsangaben | null;
};

/** Session und Betrieb — ohne beides gibt es hier nichts zu tun. */
export async function betriebZahlungKontext(): Promise<BetriebZahlungKontext> {
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

/**
 * Der noch nicht angelegte Betrieb: der angemeldete Nutzer und sein
 * Pending-Stripe-Kunde (Betriebsdaten in der Metadata). Ohne Pending-Kunde
 * ist Schritt 1 noch offen — zurück dorthin.
 */
export type PendingZahlungKontext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  kunde: Stripe.Customer;
};

export async function pendingZahlungKontext(): Promise<PendingZahlungKontext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/registrieren");

  const kunde = await suchePendingKunde({ userId: user.id, email: user.email ?? "" });
  if (!kunde) redirect("/einrichtung/betrieb");

  return { supabase, user, kunde };
}

export function protokolliereZahlung(stelle: string, ursache: unknown): void {
  const text = ursache instanceof Error ? ursache.message : String(ursache);
  console.error(`[zahlung] ${stelle}: ${text}`);
}
