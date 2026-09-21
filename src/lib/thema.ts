import { cookies, headers } from "next/headers";

import { THEMA_COOKIE, istThema, type Thema } from "./thema-basis";

export { THEMA_COOKIE, istThema, type Thema };

/**
 * Hell/Dunkel — die ausdrückliche Themenwahl (Server-Teil).
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Drei Zustände, ein Cookie
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Farben folgen von Haus aus dem Betriebssystem
 * (`prefers-color-scheme`, siehe `globals.css`). Der Umschalter im
 * Dashboard setzt sich darüber: er schreibt `qt_theme = "hell" | "dunkel"`
 * und das Root-Layout hängt daraus `data-theme` an das `<html>`. Fehlt das
 * Cookie, gilt weiter der Systemwunsch — deshalb ist „System" kein
 * gespeicherter Wert, sondern schlicht das fehlende Cookie.
 *
 * Cookie-Name und Typ liegen in `thema-basis.ts` (ohne `next/headers`),
 * damit die Client-Insel `ThemaWahl` sie nutzen kann, ohne dieses
 * Server-Modul ins Bündel zu ziehen.
 *
 * Wie bei `qt_sprache` ist das Cookie **nicht** `httpOnly`: es trägt keine
 * Berechtigung, nur eine Anzeigevorliebe. Und wie dort folgt `Secure` dem
 * tatsächlichen Protokoll, nicht `NODE_ENV` — ein Produktionsbuild über
 * http:// setzte es sonst mit `Secure`, der Browser verwürfe es still, und
 * die Wahl fiele bei jedem Klick zurück.
 */

/** Ein Jahr — eine Themenwahl ist keine Sitzungssache. */
const MAX_ALTER = 60 * 60 * 24 * 365;

/** `null` heisst „keine ausdrückliche Wahl" → dem System folgen. */
export async function leseThema(): Promise<Thema | null> {
  const laden = await cookies();
  const wert = laden.get(THEMA_COOKIE)?.value;
  return istThema(wert) ? wert : null;
}

/**
 * Schreibt oder löscht die Themenwahl. `"system"` entfernt das Cookie und
 * überlässt die Entscheidung wieder dem Betriebssystem. Nur aus Server
 * Actions und Route Handlern — Server Components dürfen keine Cookies
 * setzen.
 */
export async function setzeThema(wunsch: Thema | "system"): Promise<void> {
  const laden = await cookies();
  if (wunsch === "system") {
    laden.delete(THEMA_COOKIE);
    return;
  }
  laden.set(THEMA_COOKIE, wunsch, {
    httpOnly: false,
    sameSite: "lax",
    secure: await ueberHttps(),
    path: "/",
    maxAge: MAX_ALTER,
  });
}

async function ueberHttps(): Promise<boolean> {
  const kopf = await headers();
  const proto = kopf.get("x-forwarded-proto");
  if (proto === null) return false;
  return proto.split(",")[0]?.trim().toLowerCase() === "https";
}
