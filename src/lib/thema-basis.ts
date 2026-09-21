/**
 * Client-sichere Grundlagen der Themenwahl.
 *
 * Bewusst **ohne** `next/headers`: sowohl der Server-Teil (`thema.ts`,
 * liest/schreibt das Cookie) als auch die Client-Insel (`ThemaWahl`, setzt
 * es sofort im Browser) brauchen den Cookie-Namen und den Typ. Läge beides
 * in `thema.ts`, zöge der Client `next/headers` ins Bündel — im Build ein
 * Fehler. Deshalb hier die reinen Werte, dort die Server-Funktionen.
 */

export const THEMA_COOKIE = "qt_theme";

export type Thema = "hell" | "dunkel";

export function istThema(wert: unknown): wert is Thema {
  return wert === "hell" || wert === "dunkel";
}
