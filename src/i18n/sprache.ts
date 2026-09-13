import { cookies } from "next/headers";

import { defaultLocale, istLocale, type Locale } from "./config";

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

export const SPRACH_COOKIE = "qt_sprache";

/** Ein Jahr — eine Sprachwahl ist keine Sitzungssache. */
const MAX_ALTER = 60 * 60 * 24 * 365;

export async function leseSprache(): Promise<Locale> {
  const laden = await cookies();
  const wert = laden.get(SPRACH_COOKIE)?.value;
  return wert && istLocale(wert) ? wert : defaultLocale;
}

/**
 * Schreibt die Sprachwahl. Nur aus Server Actions und Route Handlern —
 * Server Components dürfen keine Cookies setzen.
 */
export async function setzeSprache(locale: Locale): Promise<void> {
  const laden = await cookies();
  laden.set(SPRACH_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    /*
     * Wie bei `qt_position`: `Secure` folgt dem tatsächlichen Protokoll
     * und nicht `NODE_ENV`. Ein Produktionsbuild über schlichtes http://
     * setzte das Cookie sonst mit `Secure`, der Browser verwürfe es
     * still, und die Sprachwahl fiele bei jedem Klick zurück — genau
     * der Fehler, der am 2026-09-07 für die Positionswahl gemeldet
     * wurde.
     */
    secure: await ueberHttps(),
    path: "/",
    maxAge: MAX_ALTER,
  });
}

async function ueberHttps(): Promise<boolean> {
  const { headers } = await import("next/headers");
  const kopf = await headers();
  const proto = kopf.get("x-forwarded-proto");
  if (proto === null) return false;
  return proto.split(",")[0]?.trim().toLowerCase() === "https";
}
