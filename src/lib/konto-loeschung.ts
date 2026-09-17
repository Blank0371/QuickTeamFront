import { holeAbo } from "@/lib/abo";
import { loescheAktivePosition, type Position } from "@/lib/dashboard/position";
import { holeAboFuerBetrieb, kuendigeAbo } from "@/lib/stripe";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Die Selbstlöschung eines Kontos.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine Seite, zwei Adressen
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Vorgang hat genau **einen** Ort: `/kontoloeschung`. Die Seite nimmt
 * die Anmeldung selbst entgegen, warnt in drei Stufen und lässt am Ende
 * den Betriebsnamen abtippen. `/datenloeschung` ist nur eine
 * Weiterleitung dorthin — die Adresse, die man sich merkt, ohne dass
 * daraus eine zweite Umsetzung wird.
 *
 * **`/kontoloeschung` ist die echte, nicht andersherum**, weil die
 * Datenschutzerklärung sie in Ziffer 15.2 wörtlich nennt. Ein Umzug
 * hätte den Rechtstext geändert, damit sein `Stand:`-Datum und den Wert
 * in `rechtstexte.ts` — und `pruefeZustimmung()` hätte anschliessend
 * jeden Bestandsbetrieb neu gefragt. Eine URL ist das nicht wert.
 *
 * Die Logik steht trotzdem hier und nicht in der Route: die Seite soll
 * bleiben, was sie ist — Anmeldung, Warnung, Vergleich —, und dieser
 * Teil bleibt ohne Bundler testbar.
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

export type LoeschErgebnis =
  /** Konto weg. `kuendigungOffen` heisst: mindestens ein Abo braucht Handarbeit in Stripe. */
  | { art: "erfolg"; kuendigungOffen: boolean }
  /** Abostatus nicht ermittelbar — es wurde **nichts** gelöscht. */
  | { art: "abo-unlesbar" }
  /** Die RPC verweigert: noch weitere Personen im geleiteten Betrieb. */
  | { art: "chef-mit-mitgliedern" }
  /** Alles andere; der Originalfehler steht im Serverprotokoll. */
  | { art: "fehlgeschlagen" };

/**
 * Das Wort, das abgetippt werden muss.
 *
 * Der Betriebsname, wo es einen gibt, sonst die eigene E-Mail-Adresse.
 * Beides ist etwas, das man kennt und nicht versehentlich trifft; eine
 * feste Formel wie „LÖSCHEN" wäre überall dieselbe und damit Routine.
 *
 * **Die Quelle ist immer der Server.** Weder Seite noch Server Action
 * lesen diesen Wert aus dem Formular — ein verstecktes Feld autorisiert
 * hier nichts (`TESTING.md` §5.2, und es gibt einen Test dafür).
 */
export function bestaetigungswort(
  positionen: readonly Position[],
  email: string | null | undefined,
): string {
  return (
    positionen.find((p) => p.rolleTyp === "chef")?.betriebName ??
    email ??
    ""
  ).trim();
}

/**
 * Löscht das Konto der übergebenen Anmeldung. Weiterleiten macht der Aufrufer.
 *
 * `trotzSoftLaunch` reicht nur `/datenloeschung` herein; die Begründung
 * steht an `createClientOhneRiegel()` in `src/lib/supabase/server.ts`.
 */
export async function fuehreLoeschungAus({
  supabase,
  email,
  positionen,
  trotzSoftLaunch = false,
}: {
  supabase: SupabaseServerClient;
  email: string;
  positionen: readonly Position[];
  trotzSoftLaunch?: boolean;
}): Promise<LoeschErgebnis> {
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
    zuKuendigen = await ermittleLebendeAbos(supabase, email, positionen, trotzSoftLaunch);
  } catch {
    return { art: "abo-unlesbar" };
  }

  const { error } = await supabase.rpc("konto_selbst_loeschen");

  if (error) {
    if (error.message.includes("CHEF_MIT_MITGLIEDERN")) {
      return { art: "chef-mit-mitgliedern" };
    }
    console.error(`[konto] loeschen: ${error.message}`);
    return { art: "fehlgeschlagen" };
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
      await kuendigeAbo(abo.id, trotzSoftLaunch);
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

  return { art: "erfolg", kuendigungOffen };
}

/**
 * Sätze für die Oberfläche, an einer Stelle statt in zwei Routen.
 *
 * `erfolg` steht hier nicht — der Erfolgsfall zeigt keine Meldung,
 * sondern leitet weiter.
 */
export function loeschFehlerText(
  ergebnis: Exclude<LoeschErgebnis, { art: "erfolg" }>,
): string {
  switch (ergebnis.art) {
    case "abo-unlesbar":
      return "Die Abonnements konnten nicht geprüft werden. Dein Konto wurde nicht gelöscht. Versuch es später erneut.";
    case "chef-mit-mitgliedern":
      return (
        "Dein Konto leitet noch einen Betrieb, in dem weitere Personen stehen. " +
        "Solange das so ist, lässt es sich nicht löschen — sonst bliebe ein Betrieb " +
        "ohne Leitung zurück. Entferne zuerst die übrigen Mitglieder im Team oder " +
        "übergib die Leitung an jemand anderen."
      );
    case "fehlgeschlagen":
      return "Das Konto liess sich nicht löschen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.";
  }
}

/** Alle geleiteten Betriebe prüfen, bevor die Anmeldung unwiderruflich entfällt. */
async function ermittleLebendeAbos(
  supabase: SupabaseServerClient,
  email: string,
  positionen: readonly Position[],
  trotzSoftLaunch: boolean,
): Promise<{ id: string; kundeId: string | null }[]> {
  const betriebIds = [
    ...new Set(positionen.filter((p) => p.rolleTyp === "chef").map((p) => p.betriebId)),
  ];
  const abos: { id: string; kundeId: string | null }[] = [];
  for (const betriebId of betriebIds) {
    const abo = await holeAbo(supabase, betriebId);
    // Eine fehlende/unerreichbare Abo-Zeile ist kein Beweis für "kein Abo".
    if (!abo) throw new Error("Abonnement nicht lesbar");
    const beiStripe = await holeAboFuerBetrieb({
      betriebId,
      email,
      kundeId: abo.stripe_customer_id,
      trotzSoftLaunch,
    });
    if (beiStripe) abos.push({ id: beiStripe.id, kundeId: abo.stripe_customer_id });
  }
  return abos;
}
