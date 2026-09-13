"use server";

import { redirect } from "next/navigation";

import { holeAbo } from "@/lib/abo";
import { holeChefBetriebId, holeRechnungsangaben, type Rechnungsangaben } from "@/lib/betrieb";
import {
  holeAboFuerBetrieb,
  stripeKlient,
  uebernimmZahlungsmittel,
  ZahlungAbgelehnt,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Das Übernehmen einer Zahlungsmethode — geteilt zwischen Schritt 2 und
 * der Sperrseite nach abgelaufener Testphase.
 *
 * Beide Stellen zeigen dasselbe eingebettete Formular und unterscheiden
 * sich nur im Text darum herum. Zwei Umsetzungen wären zwei
 * Gelegenheiten, sich zu widersprechen — und eine davon würde seltener
 * benutzt und damit seltener bemerkt, wenn sie kaputt ist.
 */

function protokolliere(stelle: string, ursache: unknown): void {
  const text = ursache instanceof Error ? ursache.message : String(ursache);
  console.error(`[zahlung] ${stelle}: ${text}`);
}

/**
 * `kundeId` ist `betrieb_abonnements.stripe_customer_id` — seit dem
 * 2026-08-28 der erste Weg, auf dem `sucheKunde()` den Stripe-Kunden
 * findet; die E-Mail-Adresse ist nur noch der Rückfall.
 *
 * Hier wiegt das schwerer als anderswo: der Kunde, den diese Datei
 * ermittelt, ist derselbe, gegen den unten die SetupIntent-Zugehörigkeit
 * geprüft wird. Fände die E-Mail-Suche nach einer Adressänderung den
 * falschen — oder gar keinen — Kunden, liefe die Prüfung gegen die
 * falsche Bezugsgrösse.
 */
type Kontext = {
  betriebId: string;
  email: string;
  kundeId: string | null;
  /** Land und Name für Stripe Tax — siehe `stelleSteuerstandortSicher`. */
  rechnung: Rechnungsangaben | null;
};

async function kontext(): Promise<Kontext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const betriebId = await holeChefBetriebId(supabase);
  if (betriebId === null) redirect("/einrichtung/konto");

  const abo = await holeAbo(supabase, betriebId);

  return {
    betriebId,
    email: user.email ?? "",
    kundeId: abo?.stripe_customer_id ?? null,
    rechnung: await holeRechnungsangaben(supabase, betriebId),
  };
}

/**
 * Übernimmt die im Payment Element bestätigte Zahlungsmethode.
 *
 * Die SetupIntent-ID kommt vom Browser und wird deshalb nicht geglaubt,
 * sondern nachgeschlagen: nur wenn der Intent tatsächlich `succeeded` ist
 * **und** am Kunden dieses Betriebs hängt, wird etwas übernommen. Sonst
 * liesse sich mit einer fremden ID eine fremde Zahlungsmethode an das
 * eigene Abo hängen.
 */
export async function zahlungsmittelUebernehmen(
  setupIntentId: string,
): Promise<{ ok: true } | { ok: false; nachricht: string }> {
  /*
   * `gespeicherteKundeId` und das `kundeId` weiter unten sind bewusst
   * zwei Namen für zwei verschiedene Dinge, und sie dürfen sich nicht
   * vermischen:
   *
   *   - hier oben: der **Hinweis** aus unserer Datenbank, mit dem der
   *     Kunde bei Stripe gefunden wird
   *   - unten: der Kunde, an dem das gefundene Abo **tatsächlich** hängt
   *
   * Verglichen wird der SetupIntent gegen den unteren. Nähme man dafür
   * den gespeicherten Wert, prüfte man die hereingereichte ID gegen eine
   * zweite hereingereichte Angabe statt gegen den Stand bei Stripe — und
   * genau das soll die Prüfung ja ausschliessen.
   */
  const { betriebId, email, kundeId: gespeicherteKundeId, rechnung } = await kontext();

  try {
    const abo = await holeAboFuerBetrieb({
      betriebId,
      email,
      kundeId: gespeicherteKundeId,
    });
    if (!abo) {
      return {
        ok: false,
        nachricht:
          "Zu deinem Betrieb ist kein Abonnement hinterlegt. Wähl oben einen Plan aus.",
      };
    }

    const kundeId = typeof abo.customer === "string" ? abo.customer : abo.customer.id;
    const intent = await stripeKlient().setupIntents.retrieve(setupIntentId);
    const intentKunde =
      typeof intent.customer === "string" ? intent.customer : (intent.customer?.id ?? null);

    if (intentKunde !== kundeId) {
      console.error(
        `[zahlung] SetupIntent ${setupIntentId} gehört zu ${intentKunde}, erwartet ${kundeId}`,
      );
      return {
        ok: false,
        nachricht: "Diese Zahlungsmethode gehört nicht zu deinem Betrieb.",
      };
    }

    if (intent.status !== "succeeded") {
      return {
        ok: false,
        nachricht:
          "Die Zahlungsmethode ist noch nicht bestätigt. Versuch es bitte noch einmal.",
      };
    }

    const zahlungsmittelId =
      typeof intent.payment_method === "string"
        ? intent.payment_method
        : (intent.payment_method?.id ?? null);

    if (!zahlungsmittelId) {
      return {
        ok: false,
        nachricht: "Stripe hat keine Zahlungsmethode zurückgemeldet. Versuch es noch einmal.",
      };
    }

    await uebernimmZahlungsmittel({
      kundeId,
      aboId: abo.id,
      zahlungsmittelId,
      rechnung,
    });

    return { ok: true };
  } catch (ursache) {
    /*
     * Eine abgelehnte Karte ist kein Systemfehler — der Grund gehört dem
     * Kunden gesagt, nicht hinter einer Sammelmeldung versteckt.
     */
    if (ursache instanceof ZahlungAbgelehnt) {
      return { ok: false, nachricht: ursache.message };
    }
    protokolliere("zahlungsmittelUebernehmen", ursache);
    return {
      ok: false,
      nachricht:
        "Die Zahlungsmethode liess sich nicht übernehmen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    };
  }
}
