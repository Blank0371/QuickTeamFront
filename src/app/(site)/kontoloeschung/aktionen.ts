"use server";

import { redirect } from "next/navigation";

import { holeAbo } from "@/lib/abo";
import { holePositionen, loescheAktivePosition, type Position } from "@/lib/dashboard/position";
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
  const positionen = await holePositionen(supabase, user.id);
  const erwartet = (positionen.find((p) => p.rolleTyp === "chef")?.betriebName ?? user.email ?? "").trim();

  // Bestätigungswort aus derselben vertrauenswürdigen Quelle wie auf der Seite.
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
  let zuKuendigen: { id: string; kundeId: string | null }[];
  try {
    zuKuendigen = await ermittleLebendeAbos(supabase, user.email ?? "", positionen);
  } catch {
    return {
      status: "fehler",
      nachricht: "Die Abonnements konnten nicht geprüft werden. Dein Konto wurde nicht gelöscht. Versuch es später erneut.",
      felder: {},
    };
  }

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
  let kuendigungOffen = false;
  for (const abo of zuKuendigen) {
    try {
      await kuendigeAbo(abo.id);
    } catch (fehler) {
      kuendigungOffen = true;
      console.error(
        `[konto] Abo-Kündigung nach Löschung fehlgeschlagen — in Stripe manuell kündigen: sub=${abo.id} kunde=${abo.kundeId}: ${fehler}`,
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

  if (kuendigungOffen) redirect("/login?meldung=konto-geloescht&fehler=abo-kuendigung-offen");
  redirect("/?geloescht=1");
}

/** Alle geleiteten Betriebe prüfen, bevor die Anmeldung unwiderruflich entfällt. */
async function ermittleLebendeAbos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  positionen: readonly Position[],
): Promise<{ id: string; kundeId: string | null }[]> {
  const betriebIds = [...new Set(positionen.filter((p) => p.rolleTyp === "chef").map((p) => p.betriebId))];
  const abos: { id: string; kundeId: string | null }[] = [];
  for (const betriebId of betriebIds) {
    const abo = await holeAbo(supabase, betriebId);
    // Eine fehlende/unerreichbare Abo-Zeile ist kein Beweis für "kein Abo".
    if (!abo) throw new Error("Abonnement nicht lesbar");
    const beiStripe = await holeAboFuerBetrieb({
      betriebId, email, kundeId: abo.stripe_customer_id,
    });
    if (beiStripe) abos.push({ id: beiStripe.id, kundeId: abo.stripe_customer_id });
  }
  return abos;
}
