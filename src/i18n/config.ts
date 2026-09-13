/**
 * Verfügbare Sprachen.
 *
 * Seit dem 2026-09-09 sind es zwei. Routen bleiben dabei **ohne
 * Locale-Präfix** — die Sprache steht in einem Cookie, nicht im Pfad.
 * Die Abwägung dahinter steht an `leseSprache()` in `sprache.ts`.
 *
 * `de` bleibt die Vorgabe: es ist die Sprache der Zielmärkte AT und DE,
 * und ein Konto ohne gesetzte Sprache soll nicht plötzlich englisch
 * dastehen.
 */

export const locales = ["de", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export function istLocale(wert: string): wert is Locale {
  return (locales as readonly string[]).includes(wert);
}
