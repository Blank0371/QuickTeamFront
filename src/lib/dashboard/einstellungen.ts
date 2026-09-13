import type { EinstellungenEingabe } from "@/lib/validierung";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Betriebseinstellungen. Referenz: `manager.tsx` (`BusinessSection`) in
 * der Expo-App, Logik-Recherche vom 2026-09-06.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Nur UPDATE, nie INSERT — und das ist keine Vorsicht, sondern Pflicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Auf `betriebs_einstellungen` liegen genau zwei Policies:
 * `einstellungen_select` (jedes Mitglied, über `meine_betriebe()`) und
 * `einstellungen_update_chef` (`ist_chef(betrieb_id)` als USING **und**
 * WITH CHECK). Es gibt **keine INSERT- und keine DELETE-Policy.**
 *
 * Die Zeile entsteht ausschliesslich über den Trigger
 * `trg_betrieb_erstelle_einstellungen` beim Anlegen des Betriebs; zu
 * jedem Betrieb existiert also immer genau eine. Ein `upsert()` wäre
 * hier deshalb doppelt falsch: er verspricht ein Einfügen, das RLS
 * still verhindert, und er verdeckt den einzigen Fall, in dem wirklich
 * etwas nicht stimmt — eine fehlende Zeile.
 *
 * `aktualisiert_am` wird nie mitgeschickt. Das setzt
 * `trg_einstellungen_aktualisiert_am` (BEFORE UPDATE) selbst; ein
 * eigener Wert würde vom Trigger ohnehin überschrieben und wäre nur eine
 * zweite Meinung über dieselbe Zeitangabe.
 */

/** Die sieben schreibbaren Felder, so wie sie in der Tabelle heissen. */
export type Betriebseinstellungen = EinstellungenEingabe;

/*
 * `weitere_einstellungen` (jsonb) fehlt in dieser Liste mit Absicht: die
 * Spalte ist in beiden Anwendungen unbelegt und hat keinen Verbraucher.
 * Ein Formularfeld für einen freien JSON-Blob, den niemand liest, wäre
 * eine Einladung, Daten zu erzeugen, die nichts bewirken.
 */
const SPALTEN =
  "sprache_standard, verfuegbarkeit_deadline_tag, notfall_stunden_anrechnen, " +
  "mitarbeiter_sehen_andere_schichten, mitarbeiter_sehen_andere_mitarbeiter, " +
  "abrechnung_bis, ask_chef_for_shift_switch";

/**
 * Die Einstellungen eines Betriebs, oder `null`, wenn keine Zeile da ist.
 *
 * `null` heisst hier zweierlei, und die Seite muss beides gleich
 * behandeln: entweder fehlt die Zeile wirklich (dann ist beim Anlegen
 * des Betriebs etwas schiefgegangen — der Trigger hätte sie erzeugen
 * müssen), oder die Abfrage lief in einen Fehler. In beiden Fällen gibt
 * es nichts zu bearbeiten, und ein leeres Formular mit Standardwerten
 * anzubieten wäre die schlechteste Antwort: das erste Speichern schriebe
 * dann sieben Werte, die niemand gewählt hat.
 */
export async function holeEinstellungen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Betriebseinstellungen | null> {
  const { data, error } = await supabase
    .from("betriebs_einstellungen")
    .select(SPALTEN)
    .eq("betrieb_id", betriebId)
    .maybeSingle();

  if (error) {
    console.error(`[dashboard/einstellungen] laden: ${error.message}`);
    return null;
  }

  if (!data) {
    console.error(`[dashboard/einstellungen] keine Zeile für Betrieb ${betriebId}`);
    return null;
  }

  const zeile = data as unknown as Record<string, unknown>;

  return {
    sprache_standard: zeile["sprache_standard"] === "en" ? "en" : "de",
    verfuegbarkeit_deadline_tag: Number(zeile["verfuegbarkeit_deadline_tag"] ?? 5),
    notfall_stunden_anrechnen: Boolean(zeile["notfall_stunden_anrechnen"]),
    mitarbeiter_sehen_andere_schichten: Boolean(zeile["mitarbeiter_sehen_andere_schichten"]),
    mitarbeiter_sehen_andere_mitarbeiter: Boolean(
      zeile["mitarbeiter_sehen_andere_mitarbeiter"],
    ),
    abrechnung_bis: (zeile["abrechnung_bis"] as string | null) ?? null,
    ask_chef_for_shift_switch: Boolean(zeile["ask_chef_for_shift_switch"]),
  };
}

/**
 * Alle sieben Felder in **einem** Update.
 *
 * Die App schreibt gemischt — `ask_chef_for_shift_switch` sofort beim
 * Umschalten, die übrigen fünf erst über den Speichern-Knopf, und
 * `sprache_standard` gar nicht. Wer dort die Seite verlässt, ohne zu
 * speichern, verliert fünf von sechs Änderungen. Hier gilt eine Regel
 * für alle: nichts wirkt, bevor gespeichert wurde, und dann wirkt alles.
 *
 * `.select("betrieb_id")` hängt dran, damit ein von RLS gefilterter
 * Treffer auffällt. Ohne RETURNING ist ein Update, das keine Zeile
 * erwischt hat, von einem erfolgreichen nicht zu unterscheiden — genau
 * die Falle, in die `entferneRolle()` in `src/lib/team.ts` gelaufen ist.
 * Hier wäre der Auslöser eine Person, die zwischen Seitenaufbau und
 * Absenden ihre Chef-Rolle verloren hat.
 */
export async function speichereEinstellungen(
  supabase: SupabaseServerClient,
  betriebId: string,
  werte: Betriebseinstellungen,
): Promise<{ ok: true } | { ok: false; grund: "rls" | "fehler" }> {
  const { data, error } = await supabase
    .from("betriebs_einstellungen")
    .update({
      sprache_standard: werte.sprache_standard,
      verfuegbarkeit_deadline_tag: werte.verfuegbarkeit_deadline_tag,
      notfall_stunden_anrechnen: werte.notfall_stunden_anrechnen,
      mitarbeiter_sehen_andere_schichten: werte.mitarbeiter_sehen_andere_schichten,
      mitarbeiter_sehen_andere_mitarbeiter: werte.mitarbeiter_sehen_andere_mitarbeiter,
      abrechnung_bis: werte.abrechnung_bis,
      ask_chef_for_shift_switch: werte.ask_chef_for_shift_switch,
    })
    .eq("betrieb_id", betriebId)
    .select("betrieb_id");

  if (error) {
    console.error(`[dashboard/einstellungen] speichern: ${error.message}`);
    return { ok: false, grund: "fehler" };
  }

  if (!data || data.length === 0) {
    console.error(
      `[dashboard/einstellungen] speichern: 0 Zeilen für ${betriebId} — Chef-Rolle verloren?`,
    );
    return { ok: false, grund: "rls" };
  }

  return { ok: true };
}
