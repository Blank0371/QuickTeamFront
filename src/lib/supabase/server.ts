import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

import { verlangeSoftLaunchFrei } from "@/lib/soft-launch-riegel";

import { supabaseEnv } from "./env";

/**
 * Supabase-Client für Server Components, Server Actions und Route Handler.
 *
 * Muss pro Request neu erzeugt werden — der Cookie-Store ist
 * request-gebunden und darf nicht über Requests hinweg geteilt werden.
 *
 * **Zweite Ebene der Soft-Launch-Sperre.** Die Middleware sperrt Routen;
 * Server Actions sind aber über ihre ID adressierbar und liessen sich
 * grundsätzlich von jeder Route derselben Auslieferung aus aufrufen,
 * also auch von der offenen Startseite. Hier ist die Stelle, an der das
 * ins Leere läuft: ohne Datenbank-Client kommt keine Aktion an Daten.
 * Die Startseite selbst berührt Supabase nicht — sie ist von diesem
 * Riegel also nicht betroffen. Siehe `src/lib/soft-launch.ts`.
 */
export async function createClient() {
  verlangeSoftLaunchFrei();
  return createClientOhneRiegel();
}

/**
 * Derselbe Client ohne Soft-Launch-Sperre.
 *
 * **Einziger Aufrufer ist die Kontolöschung** (`/kontoloeschung`, Seite und
 * Server Actions; `/datenloeschung` leitet nur dorthin). Kommt eine zweite
 * Stelle dazu, ist das ein Fehler und kein Ausbau — dieselbe Regel wie
 * beim `service_role`-Key.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Löschung an der Sperre vorbei darf
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Soft-Launch verhindert, dass **ein Konto, eine Sitzung oder ein
 * Vertrag entsteht**, solange die Rechtstexte Entwürfe sind. Eine
 * Löschung erzeugt nichts davon — sie ist die Gegenrichtung. Und sie
 * hängt als einzige nicht davon ab, ob die Texte schon geprüft sind:
 * Art. 17 DSGVO gilt unabhängig vom Stand einer Datenschutzerklärung.
 * Eine Sperre, die das Löschen mitsperrt, sperrt ausgerechnet das weg,
 * was sie schützen soll.
 *
 * **Die Ausnahme ist eingefasst, nicht offen.** Diese Funktion erzeugt
 * zwar eine Sitzung, aber die kommt nirgendwo hin: `/dashboard`,
 * `/einrichtung` und `/login` hält die Middleware weiterhin zu, und jeder
 * andere Codepfad geht über `createClient()` oben, das unverändert
 * umleitet. Was hier entsteht, bleibt damit auf genau die Seite
 * beschränkt, die es erzeugt hat.
 *
 * **Der Preis, ausdrücklich benannt:** `/kontoloeschung` ist während des
 * Soft-Launches die einzige Adresse, an der ein Passwort geprüft wird.
 * Gegen Durchprobieren schützt die Ratenbegrenzung von GoTrue — dieselbe,
 * die `/login` nach dem Launch schützt —, nicht diese Datei.
 */
export async function createClientOhneRiegel() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  // Explizit typisiert: `cookies` nimmt eine Union aus aktueller und
  // veralteter Signatur an, deshalb greift die Kontext-Inferenz nicht.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Aus einer Server Component heraus ist `set` nicht erlaubt.
        // Die Middleware schreibt die aufgefrischten Cookies ohnehin —
        // hier ist Ignorieren korrekt, nicht bequem.
      }
    },
  };

  return createServerClient(url, anonKey, { cookies: cookieMethods });
}
