import type { createClient } from "@/lib/supabase/server";
import { feldSchemata } from "@/lib/validierung";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Schlüssel in `user_metadata`, unter dem der Promo-Code mitreist. */
export const PROMO_METADATEN_SCHLUESSEL = "promo_code";

/**
 * Liest den Promo-Code aus `user_metadata` — oder stellt fest, dass keiner
 * da ist.
 *
 * Er nimmt denselben Weg wie die Zustimmung (`src/lib/zustimmung.ts`):
 * eingetippt wird er in Abschnitt A, der Betrieb entsteht erst nach der
 * Code-Bestätigung, und dazwischen gibt es keine `betrieb_id`, an der eine
 * Zeile hängen könnte.
 *
 * Die Metadaten sind so vertrauenswürdig wie ein Formularfeld — sie
 * stammen aus derselben Quelle. Deshalb laufen sie noch einmal durch
 * `feldSchemata.promo_code`; was dort nicht besteht, wird nicht
 * geschrieben, statt am CHECK der Datenbank zu scheitern.
 */
export function promoCodeAusMetadaten(
  metadaten: Record<string, unknown> | null | undefined,
): string | null {
  const roh = metadaten?.[PROMO_METADATEN_SCHLUESSEL];
  if (typeof roh !== "string") return null;

  const geprueft = feldSchemata.promo_code.safeParse(roh);
  return geprueft.success && geprueft.data !== "" ? geprueft.data : null;
}

export type PromoPruefung = "gueltig" | "unbekannt" | "nicht-pruefbar";

/**
 * Steht der Code auf der Liste zugelassener Codes, und ist er aktiv?
 *
 * Gefragt wird über die RPC `promo_code_gueltig`, nicht über die
 * Tabelle: bei der Registrierung gibt es noch keine Session, und die
 * Liste ist für `anon` bewusst nicht lesbar
 * (`docs/backend/migration-2026-09-15-promo-code-liste.sql`).
 *
 * **Ein Fehler der Abfrage sperrt nicht.** Das Feld ist freiwillig; an
 * einer nicht erreichbaren Prüfung eine Registrierung scheitern zu
 * lassen, wäre der falsche Handel. Unbekannte Codes hält danach ohnehin
 * die Datenbank auf — Fremdschlüssel und INSERT-Policy —, nur eben
 * ohne Rückmeldung am Feld.
 */
export async function pruefePromoCode(
  supabase: SupabaseServerClient,
  promoCode: string,
): Promise<PromoPruefung> {
  const { data, error } = await supabase.rpc("promo_code_gueltig", { p_code: promoCode });

  if (error || typeof data !== "boolean") {
    console.error(`[promo] Prüfung: ${error?.message ?? "keine Antwort"}`);
    return "nicht-pruefbar";
  }

  return data ? "gueltig" : "unbekannt";
}

/**
 * Hält fest, welcher Betrieb welchen Promo-Code benutzt hat.
 *
 * `ignoreDuplicates` über den Primärschlüssel `betrieb_id`: ein zweimal
 * eingegebener Bestätigungscode oder ein nachgetragener Betrieb erzeugt
 * keine zweite Zeile, und der erste Eintrag bleibt stehen.
 *
 * Schlägt das Schreiben fehl, hält es die Einrichtung **nicht** auf —
 * dieselbe Abwägung wie bei der Zustimmung: Konto und Betrieb stehen an
 * dieser Stelle schon. Der Fehler landet im Serverprotokoll (`[promo] …`).
 */
export async function schreibePromoCode(
  supabase: SupabaseServerClient,
  betriebId: string,
  promoCode: string,
): Promise<{ art: "ok" } | { art: "fehler"; grund: string }> {
  const { error } = await supabase
    .from("betrieb_promo_codes")
    .upsert(
      { betrieb_id: betriebId, promo_code: promoCode },
      { onConflict: "betrieb_id", ignoreDuplicates: true },
    );

  if (error) {
    console.error(`[promo] ${betriebId}: ${error.message}`);
    return { art: "fehler", grund: error.message };
  }

  return { art: "ok" };
}
