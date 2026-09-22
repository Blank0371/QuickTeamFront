"use server";

/**
 * Die Server Actions des **Betrieb-Schritts** (Schritt 1 des Steppers).
 *
 * Seit dem 2026-09-22 (Nutzerwunsch, siehe `CLAUDE.md`) legt dieser Schritt
 * den Betrieb **nicht** mehr an. Er sammelt nur die allgemeinen Angaben
 * (Name, Land, Chef-Name, Promo-Code, AGB/AVV-Zustimmung) und parkt sie in
 * der Metadata eines Stripe-Kunden. Die `betriebe`-Zeile entsteht erst,
 * wenn Stripe die Zahlung bestätigt hat (`betriebAbschliessen` in Schritt 2)
 * — so gibt es keinen halben Betrieb ohne Abo in der Datenbank.
 */

import { redirect } from "next/navigation";

import { holeValidierung } from "@/i18n/server";
import { feldFehler, type FormZustand } from "@/lib/formular";
import {
  pruefePromoCode,
  type PromoPruefung,
} from "@/lib/promo-code";
import { holeOderErstellePendingKunde } from "@/lib/stripe";
import { holeChefBetriebId } from "@/lib/betrieb";
import { createClient } from "@/lib/supabase/server";
import { betriebSchema, feldSchemata } from "@/lib/validierung";

function text(formData: FormData, feld: string): string {
  const wert = formData.get(feld);
  return typeof wert === "string" ? wert : "";
}

/**
 * Parkt die Betriebsdaten und führt zur Zahlung.
 *
 * Ablauf: Session prüfen → Formular validieren → Promo-Code prüfen →
 * Angaben in die Stripe-Kunden-Metadata schreiben
 * (`holeOderErstellePendingKunde`, idempotent) → weiter zu `/einrichtung/zahlung`.
 *
 * Wer bereits Chef ist, hat den Betrieb schon — dann geht es direkt weiter
 * über `/einrichtung`, nicht in ein zweites Formular.
 */
export async function pendingInfoSpeichern(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/registrieren");

  // Wer bereits Chef eines Betriebs ist, legt keinen zweiten an.
  if ((await holeChefBetriebId(supabase)) !== null) redirect("/einrichtung");

  const roh = {
    betrieb_name: text(formData, "betrieb_name"),
    land: text(formData, "land"),
    vorname: text(formData, "vorname"),
    nachname: text(formData, "nachname"),
    zustimmung: text(formData, "zustimmung"),
    promo_code: text(formData, "promo_code"),
  };

  const werte = { ...roh };

  const geprueft = betriebSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte,
    };
  }

  const daten = geprueft.data;

  /*
   * Ein Vertipper im Promo-Code soll am Feld auffallen. `nicht-pruefbar`
   * sperrt bewusst nicht — das Feld ist freiwillig.
   */
  if (daten.promo_code && (await pruefePromoCode(supabase, daten.promo_code)) === "unbekannt") {
    return {
      status: "fehler",
      nachricht: null,
      felder: { promo_code: (await holeValidierung())["v.promo.unbekannt"] },
      werte,
    };
  }

  try {
    await holeOderErstellePendingKunde({
      userId: user.id,
      email: user.email ?? "",
      info: {
        name: daten.betrieb_name,
        land: daten.land,
        vorname: daten.vorname,
        nachname: daten.nachname,
        promoCode: daten.promo_code || null,
      },
    });
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[betrieb] pendingInfoSpeichern: ${text}`);
    return {
      status: "fehler",
      nachricht:
        "Die Angaben liessen sich gerade nicht speichern. Versuch es gleich noch einmal — bleibt der Fehler, meld dich beim Support.",
      felder: {},
      werte,
    };
  }

  redirect("/einrichtung/zahlung");
}

/**
 * Prüft einen einzelnen Promo-Code für den „Prüfen"-Knopf.
 */
export async function promoCodePruefen(code: string): Promise<PromoPruefung> {
  const geprueft = feldSchemata.promo_code.safeParse(code);
  if (!geprueft.success || geprueft.data === "") return "nicht-pruefbar";

  const supabase = await createClient();
  return pruefePromoCode(supabase, geprueft.data);
}
