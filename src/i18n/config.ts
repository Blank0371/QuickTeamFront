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

/**
 * Name des Sprach-Cookies.
 *
 * Steht hier und nicht in `sprache.ts`, weil diese Datei
 * client-sicher ist (kein `next/headers`): so darf ihn auch der
 * client-seitige `SprachWahl` schreiben, ohne den Server-Code ins
 * Browser-Bündel zu ziehen — dieselbe Trennung wie bei `thema-basis.ts`.
 * `sprache.ts` liest den Wert von hier.
 */
export const SPRACH_COOKIE = "qt_sprache";
