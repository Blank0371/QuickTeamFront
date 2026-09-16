import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { mitSprachKopfzeile } from "@/i18n/sprach-parameter";
import { PFAD_KOPFZEILE } from "@/lib/dashboard/pfad";

import { beschaedigteSessionCookies } from "./session-cookie";

import { supabaseAnonKey, supabaseKonfiguriert, supabaseUrl } from "./env";

/**
 * Frischt das Auth-Token auf und schreibt die erneuerten Cookies in die
 * Antwort. Ohne diesen Schritt läuft die Session serverseitig ab, während
 * der Browser noch ein gültig aussehendes Cookie hält.
 *
 * Wichtig für das Muster von `@supabase/ssr`:
 * 1. `supabaseResponse` wird neu erzeugt, wenn Cookies gesetzt werden —
 *    inklusive Übernahme der bereits gesetzten Request-Cookies.
 * 2. Zwischen `createServerClient` und `getUser()` darf nichts stehen.
 * 3. Es wird immer genau dieses `supabaseResponse`-Objekt zurückgegeben.
 *    Ein frisches `NextResponse.next()` würde die Cookies verwerfen und
 *    Nutzer sporadisch ausloggen.
 */
export async function updateSession(request: NextRequest) {
  /*
   * Der angefragte Pfad reist als Kopfzeile mit weiter nach unten.
   *
   * Server Components kennen ihre eigene Adresse nicht; das
   * Dashboard-Tor braucht sie aber, um beim Umleiten auf die
   * Positionswahl das eigentliche Ziel mitgeben zu können. Begründung im
   * Einzelnen in `src/lib/dashboard/pfad.ts`.
   *
   * Die Kopfzeile wird bei **jedem** Aufbau der Antwort neu gesetzt, und
   * zwar aus einer frischen Kopie von `request.headers`. Ein einmal
   * gezogener Schnappschuss wäre falsch: `request.cookies.set()` unten
   * schreibt in genau diese Kopfzeilen zurück, und eine vorher gezogene
   * Kopie trüge dann noch die alten, abgelaufenen Auth-Cookies.
   */
  const antwort = () => {
    const kopfzeilen = mitSprachKopfzeile(request);
    kopfzeilen.set(PFAD_KOPFZEILE, request.nextUrl.pathname);
    return NextResponse.next({ request: { headers: kopfzeilen } });
  };

  let supabaseResponse = antwort();

  // Ohne Env-Werte gibt es nichts aufzufrischen. Die Seite soll trotzdem
  // ausliefern — die Marketing-Routen brauchen keine Session.
  if (!supabaseKonfiguriert()) {
    return supabaseResponse;
  }

  // Schon vor der SDK-Initialisierung bereinigen: ungültiges UTF-8 kann
  // sonst sowohl die Middleware als auch öffentliche Rechtsseiten lahmlegen.
  const defekt = beschaedigteSessionCookies(request.cookies.getAll(), supabaseUrl);
  for (const name of defekt) request.cookies.delete(name);
  if (defekt.length) {
    supabaseResponse = antwort();
    for (const name of defekt) supabaseResponse.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  // Explizit typisiert: `cookies` nimmt eine Union aus aktueller und
  // veralteter Signatur an, deshalb greift die Kontext-Inferenz nicht.
  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      supabaseResponse = antwort();
      for (const name of defekt) supabaseResponse.cookies.set(name, "", { path: "/", maxAge: 0 });
      for (const { name, value, options } of cookiesToSet) {
        supabaseResponse.cookies.set(name, value, options);
      }
    },
  };

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, { cookies });

  const { data } = await supabase.auth.getUser();

  const ziel = zielFuerAngemeldete(request.nextUrl.pathname, data.user !== null);
  if (ziel) {
    return NextResponse.redirect(new URL(ziel, request.url), {
      headers: supabaseResponse.headers,
    });
  }

  return supabaseResponse;
}

/**
 * Wohin eine bereits angemeldete Person geschickt wird, die eine
 * Auth-Seite aufruft. `null` bedeutet: Seite normal ausliefern.
 *
 * Entschieden: niemand wird umgeleitet — weder von `/login` noch von
 * `/registrieren`. Auf einem geteilten Gerät im Lokal muss der
 * Kontowechsel möglich bleiben, und wer einen zweiten Standort anlegt,
 * braucht das Registrierungsformular trotz bestehender Session.
 *
 * Den Hinweis auf die laufende Sitzung übernimmt stattdessen
 * `SessionHinweis` über dem Formular. Die Funktion bleibt als Angelpunkt
 * stehen, falls sich das je ändert.
 */
function zielFuerAngemeldete(pfad: string, angemeldet: boolean): string | null {
  void pfad;
  void angemeldet;
  return null;
}
