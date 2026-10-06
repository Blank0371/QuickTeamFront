/**
 * Verfügbare Sprachen.
 *
 * Seit dem 2026-09-09 Deutsch und Englisch, seit dem 2026-10-04 auch
 * Albanisch (`sq`, auf Anweisung des Nutzers; die Expo-App kennt es
 * nicht) und — am selben Tag, ebenfalls auf Anweisung — die übrigen
 * Sprachen der Expo-App: Spanisch, Französisch, Russisch, Türkisch,
 * Ukrainisch, seit dem 2026-10-05 auch Italienisch und Portugiesisch
 * (`../QuickTeamMobile/src/i18n/I18nProvider.tsx`, `SUPPORTED`). Routen
 * bleiben dabei **ohne Locale-Präfix** — die Sprache steht in einem
 * Cookie, nicht im Pfad. Die Abwägung dahinter steht an `leseSprache()`
 * in `sprache.ts`.
 *
 * `de` bleibt die Vorgabe: es ist die Sprache der Zielmärkte AT und DE,
 * und ein Konto ohne gesetzte Sprache soll nicht plötzlich englisch
 * dastehen.
 */

export const locales = ["de", "en", "es", "fr", "it", "pt", "ru", "sq", "tr", "uk"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

/**
 * Jede Sprache in ihrem eigenen Namen — so steht sie im Umschalter.
 *
 * Bewusst **nicht** im Wörterbuch: wer die Oberfläche versehentlich auf
 * Russisch gestellt hat, muss „Deutsch" finden, nicht „Немецкий". Diese
 * Namen sind in jeder Oberfläche dieselben und werden nie übersetzt.
 */
export const SPRACH_NAMEN: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  sq: "Shqip",
  tr: "Türkçe",
  uk: "Українська",
};

/**
 * Vollständige Locale für `Intl`, wo die Region das Format ändert
 * (Datumsreihenfolge, 24-h-Uhr). `de-AT`/`en-GB` sind die Zielmärkte;
 * für die übrigen Sprachen das Land, in dem sie Amtssprache ist.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  de: "de-AT",
  en: "en-GB",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-PT",
  ru: "ru-RU",
  sq: "sq-AL",
  tr: "tr-TR",
  uk: "uk-UA",
};

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
