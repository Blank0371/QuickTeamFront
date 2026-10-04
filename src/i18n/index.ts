import { defaultLocale, type Locale } from "./config";
import { de, type Dictionary } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ru } from "./ru";
import { sq } from "./sq";
import { tr } from "./tr";
import { uk } from "./uk";

const dictionaries: Record<Locale, Dictionary> = { de, en, es, fr, ru, sq, tr, uk };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

export { defaultLocale, locales, istLocale } from "./config";
export type { Locale } from "./config";
export type { Dictionary } from "./de";
