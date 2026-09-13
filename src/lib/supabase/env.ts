/**
 * Zugriff auf die Supabase-Env-Variablen.
 *
 * Nur `NEXT_PUBLIC_*`. Autorisierung macht RLS.
 *
 * Der `service_role`-Key steht bewusst **nicht** hier und wird von hier
 * auch nicht ausgeliefert. Er existiert an genau einer Stelle im Projekt:
 * `src/app/api/stripe/webhook/route.ts` liest ihn dort lokal aus
 * `process.env`, weil `betrieb_abonnements` keine schreibende Policy hat.
 * Begründung und Bedingungen stehen in CLAUDE.md. Wer ihn ein zweites Mal
 * braucht, hat einen Fehler gemacht — nicht diese Datei erweitert.
 *
 * Die Werte werden hier statisch referenziert (nicht über einen
 * dynamischen Index), weil Next sonst beim Build nichts einsetzen kann.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True, sobald beide Werte gesetzt sind. */
export function supabaseKonfiguriert(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}

/**
 * Wirft mit klarer Ansage, statt Supabase einen leeren String schlucken
 * zu lassen und später an einer unverständlichen Stelle zu scheitern.
 */
export function supabaseEnv(): { url: string; anonKey: string } {
  if (!supabaseKonfiguriert()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen. " +
        "Werte aus .env.local.example nach .env.local übernehmen und ausfüllen.",
    );
  }
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}
