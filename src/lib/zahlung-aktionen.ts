"use server";

import { redirect } from "next/navigation";

import { stelleBetriebSicher } from "@/lib/betrieb";
import {
  holeAboFuerBetrieb,
  holeOderErstelleKunde,
  lesePendingBetrieb,
  pruefePromotionCode,
  rechnungVollstaendig,
  schliessePendingAbo,
  stripeKlient,
  uebernimmZahlungsmittel,
  verknuepfePendingMitBetrieb,
  ZahlungAbgelehnt,
} from "@/lib/stripe";
import { holeValidierung } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { schreibePromoCode } from "@/lib/promo-code";
import { zustimmungHashes } from "@/lib/rechtstexte-inhalt";
import {
  schreibeZustimmungen,
  zustimmungFuerBetrieb,
  zustimmungNachweisAusMetadaten,
} from "@/lib/zustimmung";
import { speichereRechnungsangaben } from "@/lib/rechnung";
import { pruefeRechnung } from "@/lib/rechnung-pruefung";
import { bewerteSetupIntent } from "@/lib/setup-intent";
import {
  betriebZahlungKontext as kontext,
  pendingZahlungKontext as pendingKontext,
  protokolliereZahlung as protokolliere,
} from "@/lib/zahlung-kontext";

/**
 * Das Übernehmen einer Zahlungsmethode — geteilt zwischen Schritt 2 und
 * der Sperrseite nach abgelaufener Testphase.
 *
 * Beide Stellen zeigen dasselbe eingebettete Formular und unterscheiden
 * sich nur im Text darum herum. Zwei Umsetzungen wären zwei
 * Gelegenheiten, sich zu widersprechen — und eine davon würde seltener
 * benutzt und damit seltener bemerkt, wenn sie kaputt ist.
 */

/**
 * Übernimmt die im Payment Element bestätigte Zahlungsmethode.
 *
 * Die SetupIntent-ID kommt vom Browser und wird deshalb nicht geglaubt,
 * sondern nachgeschlagen: nur wenn der Intent tatsächlich `succeeded` ist
 * **und** am Kunden dieses Betriebs hängt, wird etwas übernommen. Sonst
 * liesse sich mit einer fremden ID eine fremde Zahlungsmethode an das
 * eigene Abo hängen.
 */
export type UebernahmeErgebnis =
  | { ok: true }
  | { ok: false; nachricht: string; felder?: Record<string, string> };

type Fehlschlag = Extract<UebernahmeErgebnis, { ok: false }>;

/**
 * Schlägt den hereingereichten SetupIntent bei Stripe nach und prüft ihn
 * gegen den serverseitig ermittelten Kunden (`bewerteSetupIntent`). Eine
 * Stelle für beide Wege — bestehender Betrieb und Pending-Kunde.
 */
async function pruefeSetupIntent(
  setupIntentId: string,
  kundeId: string,
  fremdNachricht: string,
): Promise<{ ok: true; zahlungsmittelId: string } | Fehlschlag> {
  const intent = await stripeKlient().setupIntents.retrieve(setupIntentId);
  const bewertung = bewerteSetupIntent(intent, kundeId);
  if (bewertung.ok) return bewertung;

  switch (bewertung.grund) {
    case "fremd":
      console.error(
        `[zahlung] SetupIntent ${setupIntentId} gehört zu ${bewertung.intentKunde}, erwartet ${kundeId}`,
      );
      return { ok: false, nachricht: fremdNachricht };
    case "unbestaetigt":
      return {
        ok: false,
        nachricht: "Die Zahlungsmethode ist noch nicht bestätigt. Versuch es bitte noch einmal.",
      };
    case "ohne-zahlungsmittel":
      return {
        ok: false,
        nachricht: "Stripe hat keine Zahlungsmethode zurückgemeldet. Versuch es noch einmal.",
      };
  }
}

/**
 * Das Tor vor der Aktivierung: UID und Anschrift müssen vollständig bei
 * Stripe stehen, bevor abgebucht wird. Gelesen statt entgegengenommen —
 * `rechnungVollstaendig()` fragt Stripe. Damit greift das Tor auch auf dem
 * 3DS-Rückweg, auf dem es kein Formular mehr gibt, und es lässt sich nicht
 * durch einen direkten Aufruf der Action umgehen.
 */
async function rechnungsTor(kundeId: string): Promise<Fehlschlag | null> {
  if (await rechnungVollstaendig(kundeId)) return null;
  return {
    ok: false,
    nachricht:
      "Für die Rechnung fehlen noch Angaben. Füll die Felder über dem Zahlungsformular aus und schick das Formular erneut ab.",
  };
}

/**
 * Speichert die Rechnungsangaben am Stripe-Kunden — **bevor** das
 * Zahlungsmittel bestätigt wird.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein eigener Schritt und nicht ein Parameter der Übernahme
 * ─────────────────────────────────────────────────────────────────────
 *
 * Wegen 3DS. Verlangt die Bank eine Freigabe, verlässt der Browser die
 * Seite und kommt als `?setup_intent=…` zurück — die Server Component
 * ruft dann `zahlungsmittelUebernehmen()` auf, und **das Formular gibt
 * es zu diesem Zeitpunkt nicht mehr**. Ein Parameter mit den
 * Rechnungsdaten wäre ausgerechnet auf dem Weg leer, auf dem am meisten
 * schiefgehen kann.
 *
 * Deshalb die Aufteilung: die Angaben gehen zuerst an den Kunden, dann
 * erst läuft `confirmSetup`. Die Übernahme liest sie danach dort, wo sie
 * hingehören — bei Stripe — statt sie sich durch eine Weiterleitung
 * reichen zu lassen.
 *
 * Der Nebeneffekt ist erwünscht: wer das Formular ausfüllt und dann
 * abbricht, hat seine Anschrift trotzdem gespeichert. Eine
 * Rechnungsanschrift ohne Zahlungsmittel schadet niemandem, und beim
 * nächsten Anlauf ist das Formular vorbelegt.
 */
export async function rechnungSpeichern(
  eingabe: Record<string, string>,
): Promise<UebernahmeErgebnis> {
  const { betriebId, email, kundeId: gespeicherteKundeId } = await kontext();

  const geprueft = pruefeRechnung(eingabe, await holeValidierung());
  if (!geprueft.ok) {
    return {
      ok: false,
      nachricht: "Bitte vervollständige die Rechnungsangaben.",
      felder: geprueft.felder,
    };
  }

  try {
    /*
     * `holeOderErstelleKunde` statt `sucheKunde`: auf der Sperrseite und
     * in Schritt 2 existiert der Kunde praktisch immer (die Planwahl legt
     * ihn an), aber „praktisch immer" ist keine Bedingung, auf die sich
     * ein Zahlungsweg stützen sollte. Entsteht er hier, trägt er die
     * Angaben von Anfang an.
     */
    /*
     * Der Kunde entsteht mit den **Rechnungsangaben**, nicht mit dem
     * Betriebsland. Seit dem 2026-09-14 sind das zwei verschiedene
     * Dinge (siehe `speichereRechnungsangaben`), und für einen
     * Rechnungsempfänger zählt das, was gerade im Formular geprüft
     * wurde — nicht der Standort, an dem gearbeitet wird.
     */
    const kunde = await holeOderErstelleKunde({
      betriebId,
      email,
      kundeId: gespeicherteKundeId,
      rechnung: { name: geprueft.profil.firma, land: geprueft.profil.land },
    });

    await speichereRechnungsangaben(kunde.id, geprueft.profil);

    return { ok: true };
  } catch (ursache) {
    protokolliere("rechnungSpeichern", ursache);
    return {
      ok: false,
      nachricht:
        "Die Rechnungsangaben liessen sich nicht speichern. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    };
  }
}

/**
 * Legt einen Stripe-Rabattcode auf das bestehende Abo des Betriebs.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum hier und nicht nur in der Plan-Auswahl
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Code lässt sich auf beiden Ansichten von Schritt 2 eingeben
 * (Nutzerwunsch 2026-09-22): auf der Plan-Auswahl geht er als `discounts`
 * ins **neu entstehende** Abo (`planWaehlen` → `erstelleAbo`); hier, auf
 * der Zahlungsansicht, existiert das Abo bereits — der Nachlass wird ihm
 * per `subscriptions.update` nachträglich aufgelegt.
 *
 * Aufgerufen **vor** `confirmSetup`, damit der Rabatt schon am Abo hängt,
 * wenn eine Karte über 3DS die Seite verlässt oder eine offene
 * Erstrechnung sofort bezahlt wird. Ein leerer Code ist kein Fehler,
 * sondern schlicht „kein Rabatt" (`ok: true`); ein unbekannter/inaktiver
 * kommt als Feldfehler zurück, damit niemand glaubt, der Rabatt greife.
 */
export async function rabattAnwenden(code: string): Promise<UebernahmeErgebnis> {
  const roh = code.trim();
  if (roh.length === 0) return { ok: true };

  const { betriebId, email, kundeId } = await kontext();

  try {
    const abo = await holeAboFuerBetrieb({ betriebId, email, kundeId });
    if (!abo) {
      return {
        ok: false,
        nachricht:
          "Zu deinem Betrieb ist kein Abonnement hinterlegt. Wähl oben einen Plan aus.",
      };
    }

    const promotionCodeId = await pruefePromotionCode(roh);
    if (promotionCodeId === null) {
      const v = await holeValidierung();
      return { ok: false, nachricht: v["v.coupon.unbekannt"], felder: { coupon: v["v.coupon.unbekannt"] } };
    }

    await stripeKlient().subscriptions.update(abo.id, {
      discounts: [{ promotion_code: promotionCodeId }],
    });

    return { ok: true };
  } catch (ursache) {
    protokolliere("rabattAnwenden", ursache);
    return {
      ok: false,
      nachricht:
        "Der Rabattcode liess sich nicht anwenden. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    };
  }
}

export async function zahlungsmittelUebernehmen(
  setupIntentId: string,
): Promise<UebernahmeErgebnis> {
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
    const intent = await pruefeSetupIntent(
      setupIntentId,
      kundeId,
      "Diese Zahlungsmethode gehört nicht zu deinem Betrieb.",
    );
    if (!intent.ok) return intent;
    const { zahlungsmittelId } = intent;

    /*
     * Geprüft wird gegen **denselben** Kunden, an dem gleich die
     * Zahlungsmethode hängt: `kundeId` stammt aus dem gefundenen Abo,
     * nicht aus unserer gespeicherten Id und erst recht nicht aus einem
     * Formular. Hätte jemand seine Anmeldeadresse geändert, könnten zwei
     * getrennte Ermittlungen zwei verschiedene Kunden treffen — und die
     * Anschrift stünde am einen, die Karte am anderen.
     */
    const fehltRechnung = await rechnungsTor(kundeId);
    if (fehltRechnung) return fehltRechnung;

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

/* ------------------------------------------------------------------ */
/* Neuer Betrieb: Zahlung bestätigen, dann Betrieb anlegen            */
/* ------------------------------------------------------------------ */

/**
 * Speichert die Rechnungsangaben am **Pending**-Kunden — das Gegenstück zu
 * `rechnungSpeichern` für den noch nicht angelegten Betrieb. Gleiche
 * Reihenfolge, gleicher Grund (siehe dort): erst die Angaben, dann die Karte.
 */
export async function rechnungPendingSpeichern(
  eingabe: Record<string, string>,
): Promise<UebernahmeErgebnis> {
  const { kunde } = await pendingKontext();

  const geprueft = pruefeRechnung(eingabe, await holeValidierung());
  if (!geprueft.ok) {
    return {
      ok: false,
      nachricht: "Bitte vervollständige die Rechnungsangaben.",
      felder: geprueft.felder,
    };
  }

  try {
    await speichereRechnungsangaben(kunde.id, geprueft.profil);
    return { ok: true };
  } catch (ursache) {
    protokolliere("rechnungPendingSpeichern", ursache);
    return {
      ok: false,
      nachricht:
        "Die Rechnungsangaben liessen sich nicht speichern. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    };
  }
}

/**
 * Der Abschluss des neuen Betriebs: Zahlung bestätigen → Abo anlegen und
 * bezahlen → **erst danach** den Betrieb in der Datenbank anlegen, die
 * Stripe-Objekte mit ihm verknüpfen, Zustimmung und Promo-Code festhalten.
 *
 * Die `betriebe`-Zeile entsteht also nur, wenn Stripe die Zahlung bestätigt
 * hat — genau das war der Wunsch (kein halber Betrieb ohne Abo). Der Aufruf
 * ist idempotent: ein zweiter Durchlauf findet das Abo lebend und den
 * Betrieb schon als Chef und richtet keinen Schaden an.
 */
export async function betriebAbschliessen(
  setupIntentId: string,
): Promise<UebernahmeErgebnis> {
  const { supabase, user, kunde } = await pendingKontext();

  const pending = lesePendingBetrieb(kunde);
  if (!pending || !pending.plan || !pending.intervall) {
    redirect("/einrichtung/zahlung");
  }

  try {
    const intent = await pruefeSetupIntent(
      setupIntentId,
      kunde.id,
      "Diese Zahlungsmethode gehört nicht zu deinem Konto.",
    );
    if (!intent.ok) return intent;
    const { zahlungsmittelId } = intent;

    // Dasselbe Rechnungstor wie beim bestehenden Betrieb.
    const fehltRechnung = await rechnungsTor(kunde.id);
    if (fehltRechnung) return fehltRechnung;

    // Abo anlegen und Erstrechnung sofort bezahlen (100-%-Code ⇒ 0,00).
    const abo = await schliessePendingAbo({
      userId: user.id,
      kundeId: kunde.id,
      plan: pending.plan,
      intervall: pending.intervall,
      promotionCodeId: pending.promotionCodeId,
      zahlungsmittelId,
      rechnung: { name: pending.name, land: pending.land },
    });

    if (abo.status !== "active" && abo.status !== "trialing") {
      return {
        ok: false,
        nachricht:
          "Die Zahlung ist noch nicht bestätigt. Bitte versuch es in einem Moment erneut — bei einer Lastschrift kann das kurz dauern.",
      };
    }

    // Jetzt erst den Betrieb anlegen.
    const ergebnis = await stelleBetriebSicher(supabase, {
      betrieb_name: pending.name,
      land: pending.land,
      vorname: pending.vorname,
      nachname: pending.nachname,
    });

    if (ergebnis.art !== "angelegt" && ergebnis.art !== "vorhanden") {
      console.error(`[zahlung] betriebAbschliessen: stelleBetriebSicher = ${ergebnis.art}`);
      return {
        ok: false,
        nachricht:
          "Die Zahlung ist eingegangen, aber der Betrieb liess sich nicht anlegen. Lad die Seite neu — bleibt der Fehler, meld dich beim Support.",
      };
    }

    const betriebId = ergebnis.betriebId;

    // Stripe-Objekte mit dem Betrieb verknüpfen — löst den Webhook aus, der
    // `betrieb_abonnements` schreibt.
    await verknuepfePendingMitBetrieb({ kundeId: kunde.id, aboId: abo.id, betriebId });

    // Zustimmung festhalten (AGB/AVV geltend, Datenschutz aus dem Signup).
    const nachweisSignup = zustimmungNachweisAusMetadaten(user.user_metadata);
    const hashes = { ...(await zustimmungHashes()) };
    if (nachweisSignup.hashes?.datenschutz) hashes.datenschutz = nachweisSignup.hashes.datenschutz;

    await schreibeZustimmungen(
      supabase,
      betriebId,
      user.id,
      zustimmungFuerBetrieb(user.user_metadata),
      { sprache: await leseSprache(), hashes },
    );

    if (pending.promoCode) {
      await schreibePromoCode(supabase, betriebId, pending.promoCode);
    }

    return { ok: true };
  } catch (ursache) {
    if (ursache instanceof ZahlungAbgelehnt) {
      return { ok: false, nachricht: ursache.message };
    }
    protokolliere("betriebAbschliessen", ursache);
    return {
      ok: false,
      nachricht:
        "Der Abschluss ist gerade fehlgeschlagen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    };
  }
}
