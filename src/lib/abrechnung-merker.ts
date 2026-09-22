import { cookies } from "next/headers";

import {
  ABRECHNUNG_COOKIE,
  ABRECHNUNG_COOKIE_MAX_AGE,
  alsAbrechnung,
  type Abrechnung,
} from "@/lib/site";

/**
 * Merkt sich, ob der Besucher auf der Preisseite monatlich oder jährlich
 * gewählt hat — vom Klick auf „Kostenlos testen" bis zum Anlegen des Abos
 * in Schritt 2 (Jahresabo seit dem 2026-09-17).
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein eigener Merker und nicht `qt_registrierung`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Intervall-Wahl muss den ganzen Trichter überdauern: Preisseite →
 * Registrierung → Bestätigung → Betrieb anlegen → Schritt 2. Setzen und
 * Lesen liegen damit in verschiedenen Routenbäumen (`/registrieren` und
 * `/einrichtung/…`), deren einziger gemeinsamer Präfix `/` ist — deshalb
 * liegt dieses Cookie auf `/` und nicht eng auf einer Route. Der Preis
 * dafür ist ein winziger, mitreisender Wert („monat" | „jahr").
 *
 * (Bis zum 2026-09-22 gab es daneben einen `registrierung-merker`, der die
 * Betriebsdaten über die Bestätigungsmail trug; er entfiel, als Konto- und
 * Betrieb-Anlage getrennt wurden — der Betrieb entsteht seither mit
 * bestehender Session direkt aus dem Formular.)
 *
 * Der Umschalter auf den Marketing-Seiten ist die einzige Stelle, die den
 * Wert setzt; er reist als `?abrechnung=jahr` an die Registrierung, wo er
 * ins Cookie wandert. Fehlt er, wird monatlich abgerechnet — der bisherige
 * Normalfall.
 */

const MERKER = ABRECHNUNG_COOKIE;

export async function merkeAbrechnung(intervall: Abrechnung): Promise<void> {
  const store = await cookies();
  store.set(MERKER, intervall, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ABRECHNUNG_COOKIE_MAX_AGE,
  });
}

/**
 * Liest die gemerkte Wahl — oder `null`, wenn keine getroffen wurde.
 *
 * `null` (kein Cookie) und `"monat"` (ausdrücklich monatlich) sind
 * absichtlich zwei verschiedene Antworten. Beim Anlegen eines **neuen** Abos
 * laufen beide auf monatlich hinaus. Beim **Wechsel** eines bestehenden Abos
 * aber nicht: „nicht gewählt" darf ein Jahresabo, das schon steht, nicht
 * stillschweigend auf monatlich zurückstellen — dann bliebe dessen Intervall
 * erhalten (siehe `planWaehlen`). Ein vorhandener, aber verfälschter Wert
 * fällt über `alsAbrechnung` auf `"monat"` — ein Jahresabo entsteht nur nach
 * ausdrücklicher Wahl.
 */
export async function leseAbrechnung(): Promise<Abrechnung | null> {
  const roh = (await cookies()).get(MERKER)?.value;
  return roh ? alsAbrechnung(roh) : null;
}

/** Nach dem Anlegen des Abos trägt der Stripe-Price das Intervall — der Merker hat ausgedient. */
export async function vergissAbrechnung(): Promise<void> {
  (await cookies()).delete({ name: MERKER, path: "/" });
}
