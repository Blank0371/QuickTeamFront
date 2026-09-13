import type { createClient } from "@/lib/supabase/server";
import {
  RECHTSTEXT_VERSIONEN,
  ZUSTIMMUNG_ART,
  ZUSTIMMUNG_DOKUMENTE,
  type ZustimmungDokument,
} from "@/lib/rechtstexte";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ZustimmungVersionen = Record<ZustimmungDokument, string>;

/** Schlüssel in `user_metadata`, unter dem die Zustimmung mitreist. */
export const ZUSTIMMUNG_METADATEN_SCHLUESSEL = "zustimmung_versionen";

/**
 * Liest die Zustimmung aus `user_metadata` — oder stellt fest, dass keine
 * da ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Zustimmung überhaupt durch die Metadaten reist
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Haken wird in Abschnitt A gesetzt, der Betrieb entsteht aber erst
 * nach der Code-Bestätigung — dazwischen liegen eine Mail, bis zu 24
 * Stunden und womöglich ein Gerätewechsel. `betrieb_id` gibt es zum
 * Zeitpunkt des Hakens noch nicht, und eine Zustimmungszeile ohne
 * Betrieb wäre kein Nachweis, sondern eine Waise. Die Zustimmung nimmt
 * deshalb denselben Weg wie die vier Betriebsfelder: `options.data` beim
 * `signUp`.
 *
 * **Mitgeführt werden die Fassungen, nicht nur ein Ja.** Ändert sich ein
 * Rechtstext zwischen Abschicken und Bestätigen, hat die Person der
 * alten Fassung zugestimmt — die neue einzutragen wäre eine falsche
 * Angabe in genau dem Datensatz, der sie widerlegen soll.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein fehlender Eintrag ist kein Fehler
 * ─────────────────────────────────────────────────────────────────────
 *
 * Über `auth.admin.createUser()` angelegte Testkonten
 * (`.claude/rules/security.md`) durchlaufen das Formular nie und tragen
 * die Metadaten folglich nicht. Sie bekommen dann auch keine
 * Zustimmungszeile — das ist richtig so und darf die Anlage des Betriebs
 * nicht aufhalten.
 */
export function zustimmungAusMetadaten(
  metadaten: Record<string, unknown> | null | undefined,
): ZustimmungVersionen | null {
  const roh = metadaten?.[ZUSTIMMUNG_METADATEN_SCHLUESSEL];
  if (typeof roh !== "object" || roh === null) return null;

  const versionen: Partial<ZustimmungVersionen> = {};
  for (const dokument of ZUSTIMMUNG_DOKUMENTE) {
    const wert = (roh as Record<string, unknown>)[dokument];
    if (typeof wert !== "string" || wert.trim() === "") return null;
    versionen[dokument] = wert;
  }

  return versionen as ZustimmungVersionen;
}

/** Die Fassungen, die beim Abschicken des Formulars gegolten haben. */
export function aktuelleZustimmungVersionen(): ZustimmungVersionen {
  return { ...RECHTSTEXT_VERSIONEN };
}

/**
 * Schreibt die drei Zustimmungszeilen.
 *
 * Ein einziges `insert` mit drei Zeilen, nicht drei Aufrufe: entweder
 * stehen alle drei da oder keine. Drei getrennte Anfragen könnten
 * teilweise durchlaufen, und „hat den AGB zugestimmt, dem AVV
 * vielleicht" ist der schlechteste aller Zustände.
 *
 * `ignoreDuplicates` fängt den zweiten Anlauf ab — ein doppelt
 * eingegebener Code, ein Reload auf der Bestätigungsseite. Einmalig ist
 * die Zeile ohnehin durch den Index
 * `(betrieb_id, auth_id, dokument, version)`; hier wird nur der Fehler
 * vermieden, den er sonst würfe.
 */
export async function schreibeZustimmungen(
  supabase: SupabaseServerClient,
  betriebId: string,
  authId: string,
  versionen: ZustimmungVersionen,
): Promise<{ art: "ok" } | { art: "fehler"; grund: string }> {
  const zeilen = ZUSTIMMUNG_DOKUMENTE.map((dokument) => ({
    betrieb_id: betriebId,
    auth_id: authId,
    dokument,
    version: versionen[dokument],
  }));

  const { error } = await supabase
    .from("rechtliche_zustimmungen")
    .upsert(zeilen, {
      onConflict: "betrieb_id,auth_id,dokument,version",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(`[zustimmung] ${betriebId}: ${error.message}`);
    return { art: "fehler", grund: error.message };
  }

  return { art: "ok" };
}

/**
 * Drei mögliche Antworten auf „liegt eine Zustimmung vor?" — und genau
 * drei, weil ein Datenbankfehler **keine** davon ist.
 *
 * - `"zugestimmt"` — alle drei Dokumente in der aktuellen Fassung vorhanden.
 * - `"fehlend"` — mindestens eins fehlt; das Tor führt auf die Zustimmung.
 * - `"pruefung-fehlgeschlagen"` — die Abfrage selbst ist gescheitert; wir
 *   wissen es schlicht nicht.
 */
export type ZustimmungStand = "zugestimmt" | "fehlend" | "pruefung-fehlgeschlagen";

/**
 * Ermittelt, ob für diesen Betrieb eine Zustimmung zu **allen drei**
 * Dokumenten in der **aktuell gültigen** Fassung vorliegt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein Lesefehler ist keine Zustimmung
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-12 gab diese Funktion bei einem Abfragefehler `true`
 * zurück — „im Zweifel nicht sperren", um keinen zahlenden Betrieb an
 * einer wackeligen Abfrage scheitern zu lassen. Der Audit (Punkt 12) hat
 * das als Fehler benannt: ein Datenbankfehler darf nicht als erfolgreiche
 * Zustimmung durchgehen, sonst ist der Nachweis wertlos — er wäre genau
 * dann „vorhanden", wenn wir ihn nicht lesen können.
 *
 * Die Entscheidung des Betreibers (2026-09-12) ist deshalb der Mittelweg:
 * ein Lesefehler ist ein **eigener** Zustand, weder Zustimmung noch
 * Dauer­sperre. Das Tor führt in diesem Fall auf dieselbe Zustimmungsseite,
 * die aber „Prüfung fehlgeschlagen, bitte erneut versuchen" zeigt statt
 * das Formular — bei einer vorübergehenden Störung genügt der nächste
 * Versuch, und ein zahlender Betrieb sitzt nicht fest, weil er sich nur
 * neu laden muss.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Gefragt wird nach dem Betrieb, nicht nach der Person
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Vertrag besteht zwischen Anbieter und **Betrieb**; wer ihn
 * seinerzeit angenommen hat, ist für die Frage „liegt eine Zustimmung
 * vor" unerheblich. Ein zweiter Chef, der später dazukommt, wird
 * deshalb nicht erneut gefragt — sonst müsste jede Person dieselbe
 * Vereinbarung für denselben Betrieb noch einmal schliessen.
 *
 * Lesen darf das ohnehin nur, wer unter
 * `zustimmung_select_chef_oder_selbst` fällt: für den Betrieb also der
 * Chef. Für eine angestellte Person liefert die Abfrage nur ihre
 * eigenen Zeilen — deshalb fragt das Tor sie gar nicht erst (siehe
 * `pruefeZustimmung` in `dashboard/zugang.ts`).
 *
 * **Eine Fassungsänderung fragt neu.** Das ist kein Nebeneffekt,
 * sondern der Zweck: wird ein Rechtstext geändert und der Wert in
 * `rechtstexte.ts` mitgezogen, passt keine bestehende Zeile mehr, und
 * das Tor greift beim nächsten Aufruf. Genau so fällt auch der
 * `-draft`-Zusatz irgendwann weg.
 */
export async function ermittleZustimmungStand(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<ZustimmungStand> {
  const { data, error } = await supabase
    .from("rechtliche_zustimmungen")
    .select("dokument, version, art")
    .eq("betrieb_id", betriebId);

  if (error) {
    console.error(`[zustimmung] Prüfung ${betriebId}: ${error.message}`);
    return "pruefung-fehlgeschlagen";
  }

  /*
   * Eine Zeile zählt nur, wenn sie die **richtige Art** trägt (Punkt 11):
   * die betriebliche Freischaltung hängt an AGB/AVV als `art='betrieblich'`,
   * die persönliche Kenntnisnahme an der Datenschutzerklärung als
   * `art='persoenlich'`. Die Datenbank stellt das über die generierte Spalte
   * und die getrennten INSERT-Policies bereits sicher — nur ein Chef kann
   * eine betriebliche Zeile anlegen. Dass das Gate die Art hier trotzdem
   * ausdrücklich prüft, ist die sichtbare Kopplung an genau diese Trennung:
   * gezählt wird die betriebliche Annahme, nicht irgendeine Zeile mit
   * passendem Dokumentnamen.
   *
   * Wer prüft, ist der Betrieb, nicht die Person (Modell A, 2026-09-12):
   * eine vorhandene `betrieblich`-Zeile eines Chefs schaltet den Betrieb
   * frei, ein zweiter Chef wird nicht erneut gefragt. Der Nachweis „durch
   * wen als Vertreter" liegt in `auth_id` + der Chef-Policy.
   */
  const vorhanden = new Set(
    (data ?? [])
      .filter((zeile) => zeile.art === ZUSTIMMUNG_ART[zeile.dokument as ZustimmungDokument])
      .map((zeile) => `${zeile.dokument}:${zeile.version}`),
  );

  const vollstaendig = ZUSTIMMUNG_DOKUMENTE.every((dokument) =>
    vorhanden.has(`${dokument}:${RECHTSTEXT_VERSIONEN[dokument]}`),
  );

  return vollstaendig ? "zugestimmt" : "fehlend";
}
