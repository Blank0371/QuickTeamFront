import type { createClient } from "@/lib/supabase/server";
import { betriebsMetadatenSchema, feldSchemata, type LandCode } from "@/lib/validierung";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Was Stripe über den Betrieb wissen muss: das Land als Steuerstandort
 * für Stripe Tax, der Name als Rechnungsempfänger.
 */
export type Rechnungsangaben = { name: string; land: LandCode };

/**
 * Liest Name und Land des Betriebs. `null`, wenn die Zeile nicht lesbar
 * ist oder ein Land trägt, das der CHECK gar nicht zuliesse — dann wird
 * lieber nichts an Stripe geschickt als ein geratener Steuerstandort.
 */
export async function holeRechnungsangaben(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Rechnungsangaben | null> {
  const { data, error } = await supabase
    .from("betriebe")
    .select("name, land")
    .eq("id", betriebId)
    .maybeSingle();

  if (error) {
    console.error(`[betrieb] betriebe(${betriebId}): ${error.message}`);
    return null;
  }

  const land = feldSchemata.land.safeParse(data?.land);
  if (!data || !land.success) return null;

  return { name: String(data.name), land: land.data };
}

/**
 * Bei Erfolg kommt die `betrieb_id` mit — der Aufrufer braucht sie
 * sofort, um das Abonnement zu lesen und die Checkout-Sitzung anzulegen.
 * Sie hinterher noch einmal über `meine_betriebe()` zu suchen wäre ein
 * zweiter Weg zur selben Antwort und damit eine Gelegenheit, sich zu
 * widersprechen.
 */
export type BetriebErgebnis =
  | { art: "angelegt"; betriebId: string }
  | { art: "vorhanden"; betriebId: string }
  | { art: "daten-fehlen" }
  | { art: "fehler" };

/**
 * Ergebnis der Chef-Suche. Drei Fälle, nicht zwei: „keiner gefunden" und
 * „konnte nicht nachsehen" dürfen sich nicht zu `null` vermischen.
 *
 * Für `stelleBetriebSicher` ist das der Unterschied zwischen richtig und
 * gefährlich: bei „keiner" wird ein Betrieb angelegt, bei „Fehler"
 * ausdrücklich nicht — sonst erzeugt ein hakender RPC-Aufruf genau die
 * Mehrfachanlage, gegen die die Prüfung überhaupt existiert.
 */
export type ChefSuche =
  | { art: "gefunden"; betriebId: string }
  | { art: "keiner" }
  | { art: "fehler" };

/**
 * Sucht den Betrieb, in dem diese Person Chef ist.
 *
 * `meine_betriebe()` allein reicht dafür nicht: die Funktion meldet
 * Mitgliedschaft, nicht Chef-Eigenschaft. Wer irgendwo als Mitarbeiter
 * aktiv ist, bekommt dort ein nicht-leeres Ergebnis, ohne einen eigenen
 * Betrieb zu haben. Erst `ist_chef` je ID beantwortet die Frage.
 */
export async function sucheChefBetrieb(
  supabase: SupabaseServerClient,
): Promise<ChefSuche> {
  const { data: betriebe, error } = await supabase.rpc("meine_betriebe");
  if (error) {
    console.error(`[betrieb] meine_betriebe: ${error.message}`);
    return { art: "fehler" };
  }

  const betriebIds: string[] = Array.isArray(betriebe) ? betriebe : [];
  for (const betriebId of betriebIds) {
    const { data: istChef, error: chefFehler } = await supabase.rpc("ist_chef", {
      p_betrieb_id: betriebId,
    });
    if (chefFehler) {
      console.error(`[betrieb] ist_chef(${betriebId}): ${chefFehler.message}`);
      return { art: "fehler" };
    }
    if (istChef === true) return { art: "gefunden", betriebId };
  }

  return { art: "keiner" };
}

/**
 * Bequeme Kurzform für Seiten, die nur wissen wollen, welchen Betrieb sie
 * anzeigen sollen. Fehler und „keiner" fallen hier absichtlich zusammen:
 * für eine Seite ist beides gleichbedeutend mit „nichts anzuzeigen".
 * Wer schreibt, nimmt `sucheChefBetrieb` und unterscheidet.
 */
export async function holeChefBetriebId(
  supabase: SupabaseServerClient,
): Promise<string | null> {
  const ergebnis = await sucheChefBetrieb(supabase);
  return ergebnis.art === "gefunden" ? ergebnis.betriebId : null;
}

/**
 * Legt nach bestätigter E-Mail-Adresse den Betrieb an — genau einmal.
 *
 * Ablauf laut CLAUDE.md:
 *   a. `meine_betriebe()` holen
 *   b. für JEDE ID `ist_chef(p_betrieb_id)` prüfen. Ist irgendwo `true`,
 *      existiert der Betrieb schon → nichts tun
 *   c. sonst `registriere_betrieb(...)` mit den Werten aus user_metadata
 *
 * Schritt (b) ist kein Feinschliff, sondern der Schutz gegen
 * Mehrfachanlage: `registriere_betrieb` hat keinen eigenen. Ein zweites
 * Mal eingegebener Code — oder ein zweiter Klick auf „Bestätigen" —
 * erzeugt sonst einen zweiten Betrieb.
 *
 * Ein blosser Leer-Test auf `meine_betriebe` genügt dafür nicht: die
 * Funktion meldet Mitgliedschaft, nicht Chef-Eigenschaft. Wer irgendwo als
 * Mitarbeiter aktiv ist, bekommt dort ein nicht-leeres Ergebnis, ohne
 * einen eigenen Betrieb zu haben.
 *
 * Die Metadaten stammen aus `options.data` beim `signUp` und sind damit
 * nicht vertrauenswürdiger als ein Formularfeld — sie gehen vor dem RPC
 * noch einmal durch dieselben Zod-Regeln.
 */
export async function stelleBetriebSicher(
  supabase: SupabaseServerClient,
  metadaten: Record<string, unknown>,
): Promise<BetriebErgebnis> {
  // (a) + (b)
  const suche = await sucheChefBetrieb(supabase);
  if (suche.art === "fehler") return { art: "fehler" };
  if (suche.art === "gefunden") return { art: "vorhanden", betriebId: suche.betriebId };

  // (c)
  const geprueft = betriebsMetadatenSchema.safeParse({
    betrieb_name: metadaten["betrieb_name"],
    land: metadaten["land"],
    vorname: metadaten["vorname"],
    nachname: metadaten["nachname"],
  });

  if (!geprueft.success) return { art: "daten-fehlen" };

  /*
   * Keine E-Mail als Parameter — die Funktion zieht sie selbst aus
   * `auth.jwt() ->> 'email'`. Einen solchen Parameter gibt es nicht.
   */
  const { data: neueId, error: rpcFehler } = await supabase.rpc("registriere_betrieb", {
    p_name: geprueft.data.betrieb_name,
    p_land: geprueft.data.land,
    p_vorname: geprueft.data.vorname,
    p_nachname: geprueft.data.nachname,
  });

  if (rpcFehler) {
    console.error(`[betrieb] registriere_betrieb: ${rpcFehler.message}`);
    return { art: "fehler" };
  }

  /*
   * Die Funktion gibt die neue `betrieb_id` zurück. Kommt dort etwas
   * anderes als ein String an, ist der Betrieb zwar angelegt, aber wir
   * wissen nicht, welcher — dann lieber ein ehrlicher Fehler als eine
   * Weiterleitung ins Nichts.
   */
  if (typeof neueId !== "string" || neueId.length === 0) {
    console.error("[betrieb] registriere_betrieb lieferte keine betrieb_id");
    return { art: "fehler" };
  }

  return { art: "angelegt", betriebId: neueId };
}
