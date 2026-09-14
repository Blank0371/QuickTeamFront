import { timingSafeEqual } from "node:crypto";

import { beendeUeberfaelligePausen } from "@/lib/stripe";

/**
 * Täglicher Vercel-Cron (`vercel.json`): kündigt bei Stripe, was seit mehr
 * als 90 Tagen pausiert ist. Warum, steht bei `beendeUeberfaelligePausen`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Wer das aufrufen darf
 * ─────────────────────────────────────────────────────────────────────
 *
 * Nur Vercel. Ist `CRON_SECRET` gesetzt, schickt Vercel ihn als
 * `Authorization: Bearer …` mit; alles andere endet mit 401, bevor Stripe
 * gefragt wird. Fehlt die Variable, antwortet der Endpunkt mit 500 statt
 * offen zu stehen — ein vergessener Wert soll den Lauf sichtbar scheitern
 * lassen, nicht jedem Besucher erlauben, Kündigungen auszulösen.
 *
 * Gelesen wird nur bei Stripe; die Datenbank kennt dieser Endpunkt nicht.
 * Von der Soft-Launch-Sperre ist er ausgenommen wie der Webhook: er bedient
 * bestehende Abonnements und schliesst keinen Vertrag.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function protokolliere(text: string): void {
  console.error(`[testphasen-beenden] ${text}`);
}

function istVercel(request: Request, secret: string): boolean {
  const erhalten = Buffer.from(request.headers.get("authorization") ?? "");
  const erwartet = Buffer.from(`Bearer ${secret}`);
  return erhalten.length === erwartet.length && timingSafeEqual(erhalten, erwartet);
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (secret.length === 0) {
    protokolliere("CRON_SECRET fehlt in der Umgebung — Lauf abgebrochen");
    return new Response("Konfiguration unvollständig", { status: 500 });
  }

  if (!istVercel(request, secret)) {
    return new Response("Nicht berechtigt", { status: 401 });
  }

  try {
    const bilanz = await beendeUeberfaelligePausen();

    for (const id of bilanz.gekuendigt) {
      console.info(`[testphasen-beenden] Abo ${id} gekündigt (90 Tage pausiert)`);
    }
    for (const eintrag of bilanz.fehler) {
      protokolliere(`Kündigung fehlgeschlagen — ${eintrag}`);
    }

    /*
     * 500, sobald auch nur eine Kündigung scheiterte: dann steht der Lauf im
     * Vercel-Dashboard als fehlgeschlagen, statt grün zu leuchten, während
     * ein Abo pausiert bleibt. Die übrigen sind trotzdem gekündigt.
     */
    return Response.json(
      {
        geprueft: bilanz.geprueft,
        gekuendigt: bilanz.gekuendigt.length,
        fehler: bilanz.fehler.length,
      },
      { status: bilanz.fehler.length > 0 ? 500 : 200 },
    );
  } catch (fehler) {
    const text = fehler instanceof Error ? fehler.message : String(fehler);
    protokolliere(`unerwartet: ${text}`);
    return new Response("Fehler", { status: 500 });
  }
}
