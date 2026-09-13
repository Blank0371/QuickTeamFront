"use server";



import {
  UEBERNAHME_MELDUNG,
  istErfolg,
  istUebernahmeCode,
} from "@/lib/dashboard/ausschreibung";
import { betreteDashboard } from "@/lib/dashboard/zugang";
import type { FormZustand } from "@/lib/formular";

/**
 * Eine offene Schicht übernehmen.
 *
 * Die Aktion liegt in `src/lib/dashboard/` und nicht neben einer Route,
 * weil sie von zweien benutzt wird — der Mitteilungsliste und der
 * Schicht-Detailseite. Zwei Kopien wären zwei Gelegenheiten, die
 * Rückgabecodes verschieden zu behandeln.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Immer die Drei-Parameter-Überladung
 * ─────────────────────────────────────────────────────────────────────
 *
 * `schicht_ausschreibung_annehmen` existiert zweimal: `(uuid, uuid)` und
 * `(uuid, uuid, uuid)`. Wer nur zwei Schlüssel schickt, bekommt von
 * PostgREST `PGRST203` — der Aufruf ist zwischen den Überladungen
 * mehrdeutig. `p_mitarbeiter_id` steht deshalb **immer** in der
 * Nutzlast, auch wenn der Wert derselbe wäre.
 *
 * Der inhaltliche Grund wiegt schwerer als der technische: die
 * Zwei-Parameter-Fassung leitet die handelnde Person über
 * `meine_mitarbeiter_id()` ab, und das ist `select … limit 1` **ohne
 * `order by`**. Wer mehrere Anstellungen im selben Betrieb hält — laut
 * `CLAUDE.md` ein realer Fall — übernähme die Schicht dann womöglich
 * als das falsche Profil. Die Drei-Parameter-Fassung prüft die
 * übergebene ID gegen `auth.uid()`, den Betrieb und `status = 'aktiv'`
 * und wirft sonst. Die ID wird also nicht geglaubt, sondern nachgeprüft
 * — die Regel aus `.claude/rules/security.md` ist damit auf beiden
 * Seiten erfüllt.
 *
 * **Keine Chef-Freigabe.** Die Funktion schreibt die Zuweisung sofort;
 * es gibt keinen Zwischenstatus und kein Gegenstück zu
 * `ask_chef_for_shift_switch`, das den Schichttausch steuert. Die
 * Website bildet das unverändert ab.
 *
 * **Keine Benachrichtigung.** Weder die Funktion noch ein Trigger auf
 * `schicht_zuweisungen` schreibt eine Meldung; die Betriebsleitung
 * erfährt die Übernahme nur über das Änderungsprotokoll
 * (`plan_aenderungen`). Hier wird bewusst nichts nachgereicht — eine
 * Meldung, die nur die Website erzeugt, entstünde bei einer Übernahme
 * aus der App nicht, und ein Kanal, der je nach Gerät funktioniert oder
 * nicht, ist schlechter als keiner. Sinnvoll wäre das erst als Trigger
 * oder im RPC, also im Repo des Kollegen — Kandidat für eine spätere
 * Phase.
 */
export async function schichtUebernehmen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const benachrichtigungId = String(formData.get("benachrichtigung_id") ?? "").trim();
  const rolleId = String(formData.get("rolle_id") ?? "").trim();

  if (!benachrichtigungId || !rolleId) {
    return {
      status: "fehler",
      nachricht: "Diese Ausschreibung gibt es nicht mehr.",
      felder: {},
      werte: {},
    };
  }

  const { supabase, position } = await betreteDashboard();

  const { data, error } = await supabase.rpc("schicht_ausschreibung_annehmen", {
    p_benachrichtigung_id: benachrichtigungId,
    p_rolle_id: rolleId,
    p_mitarbeiter_id: position.mitarbeiterId,
  });

  if (error) {
    /*
     * Hier landen die vier `raise exception`-Fälle der Funktion. Alle
     * vier bedeuten für die bedienende Person dasselbe: die Grundlage
     * der Anzeige stimmt nicht mehr. Der Rohtext hilft ihr nicht — er
     * ist unübersetzt und nennt Interna —, deshalb ein Satz und der
     * genaue Grund ins Log.
     */
    console.error(
      `[dashboard/ausschreibung] annehmen(${benachrichtigungId}): ${error.message}`,
    );
    return {
      status: "fehler",
      nachricht:
        "Das hat nicht geklappt. Wahrscheinlich ist die Ausschreibung inzwischen zurückgezogen worden — lad die Seite neu.",
      felder: {},
      werte: {},
    };
  }

  if (!istUebernahmeCode(data)) {
    console.error(
      `[dashboard/ausschreibung] unbekannter Rückgabewert: ${JSON.stringify(data)}`,
    );
    return {
      status: "fehler",
      nachricht: "Das hat nicht geklappt. Versuch es noch einmal.",
      felder: {},
      werte: {},
    };
  }

  /*
   * ─────────────────────────────────────────────────────────────────
   *  Hier wird bewusst **nicht** neu validiert
   * ─────────────────────────────────────────────────────────────────
   *
   * Zuerst stand hier ein `revalidatePath` auf Mitteilungen, Kalender
   * und Schichtdetail — der Reflex, nach einer Schreiboperation den
   * sichtbaren Stand nachzuziehen.
   *
   * Am 2026-09-06 im Test hat sich das als falsch erwiesen, und zwar in
   * **beide** Richtungen. `Uebernehmen` zeigt das Ergebnis an, und das
   * Bauteil steht innerhalb der Karte, die der Lader nach der
   * Neuberechnung nicht mehr ausgibt: bei `angenommen` bin ich
   * eingeteilt und die Ausschreibung fällt für mich weg, bei `voll` ist
   * die Rolle voll und fällt ebenfalls weg. In beiden Fällen wird die
   * Karte abgebaut, mit ihr die Komponente, und mit dieser der Zustand
   * aus `useActionState`. Beobachtet: Klick auf „Als Bar übernehmen",
   * die Zuweisung entsteht in der Datenbank — und im Browser passiert
   * sichtbar **nichts**.
   *
   * Eine Rückmeldung, die genau dann verschwindet, wenn sie etwas zu
   * sagen hat, ist schlimmer als eine Ansicht, die einen Moment
   * veraltet ist. Die Karte bleibt deshalb stehen und trägt das
   * Ergebnis: bei Erfolg grün und ohne Knöpfe, bei einer Absage mit dem
   * Grund. Frisch wird die Ansicht bei der nächsten Navigation — und
   * dorthin geht ohnehin, wer gerade eine Schicht übernommen hat.
   *
   * Wer das wieder einbauen will, muss die Meldung zuerst aus dem
   * Teilbaum herausheben, der dabei verschwindet.
   */

  return {
    status: istErfolg(data) ? "erfolg" : "fehler",
    nachricht: UEBERNAHME_MELDUNG[data],
    felder: {},
    werte: {},
  };
}
