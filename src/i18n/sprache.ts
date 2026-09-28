import { cookies, headers } from "next/headers";

import { defaultLocale, istLocale, SPRACH_COOKIE, type Locale } from "./config";
import { SPRACH_KOPFZEILE } from "./sprach-parameter";

export { SPRACH_COOKIE } from "./config";

/**
 * Welche Sprache gilt für diese Anfrage?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Cookie statt Pfad-Präfix — und was das kostet
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der übliche Weg wäre `/de/…` und `/en/…`. Er ist für die
 * **öffentlichen** Seiten auch der bessere: zwei Adressen, zwei
 * indexierbare Fassungen, `hreflang` dazwischen. Genommen wird er hier
 * trotzdem nicht, und zwar aus einem konkreten Grund und nicht aus
 * Bequemlichkeit:
 *
 *   · Ein Präfix verdoppelt den Routenbaum oder verlangt ein
 *     `[locale]`-Segment über **allem** — auch über `/dashboard`, das
 *     per `robots: index:false` ohnehin nie im Index landet. Für den
 *     Teil der Anwendung, der aus vierzig Seiten besteht, wäre das
 *     Aufwand ohne Gegenwert.
 *   · `src/middleware.ts` gleicht Pfade gegen `GESPERRTE_PRAEFIXE` ab.
 *     Mit einem Präfix müsste jede dieser Prüfungen die Locale
 *     überspringen — eine zusätzliche Fehlerquelle in genau der Datei,
 *     die die Soft-Launch-Sperre trägt.
 *
 * **Der Preis ist benannt, nicht verschwiegen:** eine Adresse trägt
 * damit zwei Inhalte, und Suchmaschinen sehen nur den deutschen. Für
 * `/preise` und die Landing ist das ein echter Nachteil. Wird Englisch
 * einmal ein Markt und nicht nur eine Bedienhilfe, gehören die
 * öffentlichen Seiten unter ein Präfix — die Wörterbücher hier bleiben
 * dabei unverändert, es ändert sich nur, woher die Locale kommt. Genau
 * deshalb steht die Auflösung in dieser einen Funktion.
 *
 * Das Cookie ist bewusst **nicht** `httpOnly`: anders als
 * `qt_position` trägt es keine Berechtigung, sondern eine
 * Anzeigevorliebe, und ein Client-Skript darf sie lesen dürfen.
 */

export async function leseSprache(): Promise<Locale> {
  // `?lang=` aus einem App-Link geht dem Cookie vor — nur für diese Anfrage,
  // ohne etwas zu speichern. Begründung in `sprach-parameter.ts`.
  const ausLink = (await headers()).get(SPRACH_KOPFZEILE);
  if (ausLink && istLocale(ausLink)) return ausLink;

  const laden = await cookies();
  const wert = laden.get(SPRACH_COOKIE)?.value;
  return wert && istLocale(wert) ? wert : defaultLocale;
}
