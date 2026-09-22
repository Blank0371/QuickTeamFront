"use server";

import { redirect } from "next/navigation";

import { sicheresZiel, ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import { holePositionen, gewuenschtePositionsId, waehleAktive } from "@/lib/dashboard/position";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { createClient } from "@/lib/supabase/server";
import { zustimmungSchema } from "@/lib/validierung";
import { holeValidierung } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { zustimmungHashes } from "@/lib/rechtstexte-inhalt";
import { aktuelleZustimmungVersionen, schreibeZustimmungen } from "@/lib/zustimmung";

/**
 * Nimmt die nachgeholte Zustimmung eines Bestandsbetriebs entgegen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Dieselbe Schreiblogik wie bei der Registrierung
 * ─────────────────────────────────────────────────────────────────────
 *
 * `schreibeZustimmungen()` ist dieselbe Funktion, die `betriebAnlegen()`
 * beim Anlegen des Betriebs aufruft — ein `insert` mit drei Zeilen,
 * idempotent über den eindeutigen Index. Hier steht keine zweite
 * Umsetzung, nur ein zweiter Aufrufer.
 *
 * Der Unterschied zum Betrieb-Schritt ist allein die Herkunft der
 * Fassungen: dort kann die Datenschutz-Fassung aus der Registrierung in
 * `user_metadata` stammen. Hier — im Nachfrage-Tor — gelten schlicht die
 * Fassungen, die in diesem Moment aktuell sind.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Position wird neu abgeleitet, nicht aus dem Formular geglaubt
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betrieb_id` und `auth_id` kommen aus `auth.uid()` und der Liste der
 * eigenen aktiven Anstellungen, nie aus einem Feld. Das ist dieselbe
 * Regel wie bei `qt_position` und bei jedem RPC — und die INSERT-Policy
 * würde eine hereingereichte fremde Id ohnehin abweisen. Doppelt, weil
 * eine Beweisspur nichts aufnehmen darf, was jemand frei wählen konnte.
 */
export async function zustimmen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const geprueft = zustimmungSchema.safeParse({
    zustimmung: String(formData.get("zustimmung") ?? ""),
  });

  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
    };
  }

  const alle = await holePositionen(supabase, user.id);
  const position = waehleAktive(alle, await gewuenschtePositionsId());

  if (position === null) redirect("/dashboard/wechseln");

  /*
   * Angestellte haben hier nichts zu bestätigen. Das Tor schickt sie gar
   * nicht erst her; wer die Adresse von Hand aufruft, soll trotzdem
   * keine Zeile erzeugen können — sonst stünde im Nachweis eine Person,
   * die den Vertrag nicht schliessen kann.
   */
  if (position.rolleTyp !== "chef") redirect("/dashboard");

  /*
   * Seit dem 2026-09-13 wandert der Nachweis vollständig mit: welche
   * Sprachfassung gelesen wurde und welchen Inhalt die angenommene
   * Fassung hatte. Beides sind Spalten, die es schon gab und die
   * niemand schrieb — die Begründung steht in `rechtstexte-inhalt.ts`.
   */
  const ergebnis = await schreibeZustimmungen(
    supabase,
    position.betriebId,
    user.id,
    aktuelleZustimmungVersionen(),
    { sprache: await leseSprache(), hashes: await zustimmungHashes() },
  );

  if (ergebnis.art === "fehler") {
    return {
      status: "fehler",
      nachricht:
        "Die Zustimmung liess sich gerade nicht speichern. Versuch es gleich noch einmal — bleibt der Fehler, meld dich beim Support.",
      felder: {},
    };
  }

  redirect(sicheresZiel(String(formData.get(ZIEL_PARAMETER) ?? "")));
}
