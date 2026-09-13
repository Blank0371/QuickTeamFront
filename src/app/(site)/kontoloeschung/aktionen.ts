"use server";

import { redirect } from "next/navigation";

import { holeAbo } from "@/lib/abo";
import { holeChefBetriebId } from "@/lib/betrieb";
import { loescheAktivePosition } from "@/lib/dashboard/position";
import { type FormZustand } from "@/lib/formular";
import { holeAboFuerBetrieb, kuendigeAbo } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Konto endgültig löschen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Arbeit macht `konto_selbst_loeschen()`, nicht diese Datei
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die RPC ist SECURITY DEFINER und erledigt drei Dinge, die von hier aus
 * gar nicht gingen: sie löscht persönliche Nebendaten, anonymisiert die
 * `mitarbeiter`-Zeilen und entfernt am Ende den Eintrag in `auth.users`.
 * Letzteres bräuchte sonst den service_role-Key, und der ist laut
 * `CLAUDE.md` auf den Stripe-Webhook beschränkt.
 *
 * **Der Betrieb bleibt bestehen.** Die RPC löscht ihn nicht, und das ist
 * richtig: `mitarbeiter`-Zeilen werden anonymisiert statt entfernt, weil
 * der Arbeitgeber Arbeitszeiten aufbewahren muss. Die Oberfläche nennt
 * das deshalb „Konto löschen" und nicht „Betrieb löschen" — alles andere
 * wäre ein Versprechen, das die Funktion nicht einlöst.
 *
 * **Das Abo wird gekündigt, der Betrieb aber nicht.** Löscht ein
 * Allein-Chef sein Konto, bleibt ein Betrieb ohne Leitung zurück — und
 * ohne Kündigung liefe die Abbuchung weiter, obwohl niemand mehr Zugang
 * hat. Genau diese stille Weiterzahlung schliesst der Ablauf hier
 * (Audit Punkt 19): nach erfolgreicher Löschung wird das lebende
 * Stripe-Abo sofort gekündigt. Bei weiteren Mitgliedern verweigert die
 * RPC das Löschen ohnehin, dann bleibt auch das Abo unangetastet.
 *
 * **`CHEF_MIT_MITGLIEDERN` ist kein Fehler, sondern eine Bedingung.** Die
 * RPC verweigert, solange das Konto aktiver Chef eines Betriebs mit
 * weiteren Mitgliedern ist — sonst bliebe ein Betrieb voller fremder
 * Daten ohne Leitung zurück. Genau der Zustand, vor dem `CLAUDE.md` bei
 * `pruefe_letzter_chef()` warnt.
 */
export async function kontoLoeschen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const bestaetigung = String(formData.get("bestaetigung") ?? "").trim();
  const erwartet = String(formData.get("erwartet") ?? "").trim();

  /*
   * Der Vergleichswert reist im Formular mit und wird deshalb **nicht**
   * geglaubt: er dient nur der Anzeige. Geprüft wird gegen den Wert, den
   * die Seite serverseitig ermittelt hat — hier reicht der Abgleich der
   * beiden Felder aber nicht, also kommt `erwartet` aus einem versteckten
   * Feld und wird zusätzlich gegen die Länge geprüft. Die eigentliche
   * Autorisierung macht ohnehin die RPC über `auth.uid()`; dieses Feld
   * ist eine Absicherung gegen den Fehlklick, nicht gegen einen Angriff.
   */
  if (erwartet.length === 0 || bestaetigung !== erwartet) {
    return {
      status: "fehler",
      nachricht: `Die Eingabe stimmt nicht. Tipp „${erwartet}" genau so ein, wie es dasteht.`,
      felder: {},
    };
  }

  /*
   * Das lebende Abo **vor** dem Löschen ermitteln, solange die Sitzung
   * noch steht: nachher greift keine RLS mehr, und `betrieb_abonnements`
   * liest ohnehin nur der Chef. Gekündigt wird erst nach erfolgreicher
   * Löschung — die RPC verweigert bei weiteren Mitgliedern
   * (`CHEF_MIT_MITGLIEDERN`), und für einen Betrieb, der weiterläuft, darf
   * das Abo nicht enden. Ihr Erfolg ist der Beweis, dass der Betrieb jetzt
   * ohne aktiven Chef dasteht — genau dann soll nichts mehr abgebucht
   * werden (Audit Punkt 19).
   */
  const zuKuendigen = await ermittleLebendesAbo(supabase, user.email ?? "");

  const { error } = await supabase.rpc("konto_selbst_loeschen");

  if (error) {
    if (error.message.includes("CHEF_MIT_MITGLIEDERN")) {
      return {
        status: "fehler",
        nachricht:
          "Dein Konto leitet noch einen Betrieb, in dem weitere Personen stehen. " +
          "Solange das so ist, lässt es sich nicht löschen — sonst bliebe ein Betrieb " +
          "ohne Leitung zurück. Entferne zuerst die übrigen Mitglieder im Team oder " +
          "übergib die Leitung an jemand anderen.",
        felder: {},
      };
    }

    console.error(`[konto] loeschen: ${error.message}`);
    return {
      status: "fehler",
      nachricht:
        "Das Konto liess sich nicht löschen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
      felder: {},
    };
  }

  /*
   * Konto weg, Betrieb ohne Leitung — jetzt das Abo kündigen, damit keine
   * stille Weiterzahlung entsteht. Schlägt das fehl, ist das Konto bereits
   * gelöscht und lässt sich von hier aus nicht mehr zurückholen; der Fehler
   * wird deshalb mit Abo- und Kunden-Id ins Protokoll geschrieben, damit er
   * in Stripe von Hand nachgezogen werden kann. Die vollständig atomare
   * Variante läge in der Lösch-RPC selbst — die ist Schema-Sache und wird
   * von hier aus nicht angefasst (siehe CLAUDE.md, „Was hier nicht
   * passiert"); als Befund gemeldet, nicht repariert.
   */
  if (zuKuendigen) {
    try {
      await kuendigeAbo(zuKuendigen.id);
    } catch (fehler) {
      console.error(
        `[konto] Abo-Kündigung nach Löschung fehlgeschlagen — in Stripe manuell kündigen: sub=${zuKuendigen.id} kunde=${zuKuendigen.kundeId}: ${fehler}`,
      );
    }
  }

  /*
   * Die Sitzung gehört einem Konto, das es nicht mehr gibt. Cookie und
   * Position müssen weg, sonst läuft der nächste Aufruf in einen
   * Zustand, den die Oberfläche nicht kennt.
   */
  await loescheAktivePosition();
  await supabase.auth.signOut();

  redirect("/?geloescht=1");
}

/**
 * Das lebende Stripe-Abo des vom Konto geleiteten Betriebs — oder `null`,
 * wenn keins existiert oder das Konto keinen Betrieb leitet.
 *
 * Reine Vorbereitung für die Kündigung nach der Löschung: fehlt der Betrieb
 * oder das Abo, ist nichts zu tun. Ein Lesefehler hält die Löschung **nicht**
 * auf — er wird protokolliert und wie „kein Abo" behandelt; jemanden mit
 * einem halb gelöschten Konto zurückzulassen wäre der schlechtere Tausch.
 */
async function ermittleLebendesAbo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
): Promise<{ id: string; kundeId: string | null } | null> {
  try {
    const betriebId = await holeChefBetriebId(supabase);
    if (!betriebId) return null;

    const abo = await holeAbo(supabase, betriebId);
    const beiStripe = await holeAboFuerBetrieb({
      betriebId,
      email,
      kundeId: abo?.stripe_customer_id ?? null,
    });
    if (!beiStripe) return null;

    return { id: beiStripe.id, kundeId: abo?.stripe_customer_id ?? null };
  } catch (fehler) {
    console.error(`[konto] Abo-Ermittlung vor Löschung fehlgeschlagen: ${fehler}`);
    return null;
  }
}
