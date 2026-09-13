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
