import { defaultLocale, type Locale } from "./config";
import { de, type Dictionary } from "./de";
import { en } from "./en";

const dictionaries: Record<Locale, Dictionary> = { de, en };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

export { defaultLocale, locales, istLocale } from "./config";
export type { Locale } from "./config";
export type { Dictionary } from "./de";
