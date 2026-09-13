import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

/**
 * Supabase-Client für Client Components (Formulare, Passwort-Reset).
 *
 * `createBrowserClient` gibt pro Aufruf mit denselben Argumenten dieselbe
 * Instanz zurück — der Aufruf darf also in jedem Render stehen.
 */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}
