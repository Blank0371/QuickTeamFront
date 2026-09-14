import { NextResponse, type NextRequest } from "next/server";

import { mitSprachKopfzeile } from "@/i18n/sprach-parameter";
import { istGesperrt, softLaunchAktiv } from "@/lib/soft-launch";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  /*
   * Die Soft-Launch-Sperre steht **vor** dem Auffrischen der Sitzung.
   *
   * Zwei Gründe. Erstens spart es je gesperrter Anfrage einen Aufruf an
   * Supabase — die Antwort steht ohnehin fest. Zweitens, und wichtiger:
   * eine gesperrte Route soll nicht als Nebenwirkung Cookies erneuern.
   * Wer während des Soft-Launches `/dashboard` aufruft, bekommt `/`,
   * nicht eine still verlängerte Sitzung.
   *
   * Das Ziel ist immer `/` und nicht eine eigene „Bald verfügbar"-Seite:
   * die Startseite *ist* die Soft-Launch-Seite. Eine zweite Seite mit
   * derselben Aussage wäre eine zweite Stelle, die man pflegen müsste.
   */
  if (istGesperrt(request.nextUrl.pathname)) {
    const ziel = new URL("/", request.url);
    /*
     * 303 für alles, was kein GET ist. Ein 307 würde die Methode
     * erhalten, der Browser also erneut POSTen — auf `/`, wo nichts
     * darauf wartet. 303 sagt ausdrücklich „hol das mit GET", und genau
     * das soll ein abgeschicktes Anmeldeformular oder ein
     * Server-Action-POST hier tun.
     *
     * 307 statt 308 für GET: die Sperre ist vorübergehend. Ein dauerhaft
     * gecachter Redirect auf `/` bliebe in den Browsern der ersten
     * Besucher stehen, lange nachdem die Sperre gefallen ist.
     */
    return NextResponse.redirect(ziel, request.method === "GET" ? 307 : 303);
  }

  /*
   * Solange die Sperre steht, wird gar keine Sitzung mehr angefasst.
   *
   * `updateSession()` frischt das Supabase-Token auf. Das ist sinnvoll,
   * solange es Seiten gibt, die eine Sitzung brauchen — während des
   * Soft-Launches gibt es die nicht: alles hinter einer Anmeldung ist
   * oben schon abgebogen. Was hier bliebe, wäre eine Anfrage an Supabase
   * bei jedem Aufruf der Startseite, ohne dass irgendjemand ihr Ergebnis
   * liest.
   *
   * Dazu kommt eine Fehlerquelle, die im Browser aufgefallen ist: ein
   * beschädigtes oder fremdes `sb-…-auth-token`-Cookie lässt
   * `getUser()` mit „Invalid UTF-8 sequence" werfen, und weil das in
   * der Middleware passiert, endet **jede** öffentliche Seite mit 500 —
   * auch das Impressum. Ein Besucher, der so ein Cookie noch von einem
   * früheren Test im Browser hat, sähe die Website überhaupt nicht.
   * Ohne Sitzungsauffrischung gibt es diesen Weg nicht mehr.
   */
  if (softLaunchAktiv()) {
    return NextResponse.next({ request: { headers: mitSprachKopfzeile(request) } });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alles ausser statischen Assets und Bild-Endpunkten. Die
     * Metadata-Dateien sind einzeln ausgenommen, damit die Middleware
     * nicht bei jedem Favicon-Request eine Session anfasst.
     *
     * Der Stripe-Webhook ist ebenfalls ausgenommen: er bringt nie ein
     * Session-Cookie mit, das aufzufrischen wäre. Jeder Aufruf löste
     * sonst eine überflüssige Anfrage an Supabase aus — vor einem
     * Endpunkt, dessen Antwortzeit Stripe misst und bei Verzögerung
     * wiederholt. Dasselbe gilt für `api/cron/…`: Vercel ruft dort ohne
     * Sitzung auf.
     */
    "/((?!api/stripe/webhook|api/cron|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
