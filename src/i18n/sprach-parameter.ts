import type { NextRequest } from "next/server";

import { istLocale } from "./config";

/**
 * `?lang=de` / `?lang=en` — die Sprache für genau diese Anfrage.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Wofür
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Expo-App öffnet `/datenschutz`, `/agb` und `/avv` im In-App-Browser
 * und gibt ihre Sprache mit. Ohne den Parameter sähe jeder dort Deutsch,
 * weil die Seite die Sprache nur aus dem Cookie `qt_sprache` kennt und das
 * im In-App-Browser nicht gesetzt ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum eine Kopfzeile und kein Cookie
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Datenschutzerklärung (Ziffer 4) sagt über `qt_sprache`: gesetzt
 * „nur wenn Sie die Sprache umschalten". Ein Link, der das Cookie setzt,
 * machte diesen Satz falsch — und eine Änderung am Rechtstext hiesse neue
 * Fassung und erneute Zustimmung aller. Die Middleware reicht die Sprache
 * deshalb als Kopfzeile an `leseSprache()` weiter; gespeichert wird nichts.
 * Der Preis: ein Klick auf einen internen Link fällt auf Cookie bzw.
 * Vorgabe zurück. Für ein einzelnes aus der App geöffnetes Dokument ist
 * das hinnehmbar, und der Umschalter oben rechts bleibt.
 *
 * **Nur GET/HEAD.** Der Umschalter ist eine Server Action, die an die
 * aktuelle Adresse postet — samt `?lang=`. Gälte der Parameter auch dort,
 * rendert die Antwort wieder in der Parametersprache, und „DE" auf einer
 * `?lang=en`-Seite täte nichts. Genau den Widerspruch zweier Schalter
 * gab es schon einmal (der alte `?sprache=` auf `/datenschutz`, entfernt
 * am 2026-09-10).
 *
 * Eine vom Client mitgeschickte Kopfzeile gleichen Namens wird immer
 * entfernt; die Sprache kommt ausschliesslich aus dem Parameter.
 */

export const SPRACH_PARAMETER = "lang";
export const SPRACH_KOPFZEILE = "x-qt-sprache";

export function mitSprachKopfzeile(request: NextRequest): Headers {
  const kopfzeilen = new Headers(request.headers);
  kopfzeilen.delete(SPRACH_KOPFZEILE);

  const wunsch = request.nextUrl.searchParams.get(SPRACH_PARAMETER);
  const lesend = request.method === "GET" || request.method === "HEAD";
  if (lesend && wunsch && istLocale(wunsch)) {
    kopfzeilen.set(SPRACH_KOPFZEILE, wunsch);
  }

  return kopfzeilen;
}
