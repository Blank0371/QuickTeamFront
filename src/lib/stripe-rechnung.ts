import Stripe from "stripe";
import type { Rechnungsangaben } from "@/lib/betrieb";
import type { LandCode } from "@/lib/validierung";
import type { RechnungsProfil } from "@/lib/rechnung-pruefung";
import { stripeKlient } from "@/lib/stripe-konfiguration";

/* ------------------------------------------------------------------ */
/* Umsatzsteuer (Stripe Tax)                                           */
/* ------------------------------------------------------------------ */

/**
 * Sorgt dafür, dass Stripe Tax den Kunden verorten kann.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das Land genügt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Stripe Tax braucht für Rechnungen einen Standort des Kunden, sonst
 * lehnt es ein Abo mit `automatic_tax` ab (`customer_tax_location_invalid`).
 * Für Deutschland und Österreich genügt dafür das Land; eine Postleitzahl
 * verlangt Stripe nur in den USA und Kanada. Das Land steht ohnehin fest:
 * `betriebe.land`, per CHECK `AT` oder `DE`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein vorhandenes Land nicht überschrieben wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * Im Kundenportal kann der Kunde seine Rechnungsadresse selbst pflegen.
 * Steht dort schon ein Land, ist es entweder unseres oder seins — in
 * beiden Fällen ist es neuer als ein Nachtrag von hier. Nachgetragen wird
 * nur, wo gar nichts steht: bei Kunden aus der Zeit vor Stripe Tax.
 */
export async function stelleSteuerstandortSicher(
  kunde: Stripe.Customer | string,
  rechnung: Rechnungsangaben | null,
): Promise<Stripe.Customer> {
  const stripe = stripeKlient();
  const vorhanden =
    typeof kunde === "string" ? await stripe.customers.retrieve(kunde) : kunde;

  if (vorhanden.deleted) {
    throw new Error(`Stripe-Kunde ${vorhanden.id} ist gelöscht.`);
  }
  if (vorhanden.address?.country) return vorhanden;

  if (!rechnung) {
    throw new Error(
      `Stripe-Kunde ${vorhanden.id} hat kein Land, und die Betriebsdaten sind nicht lesbar — Stripe Tax kann ihn nicht verorten.`,
    );
  }

  return stripe.customers.update(vorhanden.id, {
    address: { country: rechnung.land },
    ...(vorhanden.name ? {} : { name: rechnung.name }),
  });
}

/* ------------------------------------------------------------------ */
/* Rechnungsangaben                                                     */
/* ------------------------------------------------------------------ */

/**
 * Liest die vorhandenen Rechnungsangaben eines Stripe-Kunden — für die
 * Vorbelegung des Formulars.
 *
 * Bewusst nachsichtig: fehlt der Kunde, fehlt ein Feld oder schlägt der
 * Abruf fehl, kommt `null` bzw. ein leeres Feld zurück. Eine
 * Vorbelegung ist eine Bequemlichkeit, kein Nachweis — sie darf die
 * Seite nicht zum Absturz bringen, und der Kunde füllt die Lücke
 * ohnehin selbst.
 */
export async function holeRechnungsProfil(
  kundeId: string | null,
): Promise<Partial<RechnungsProfil> | null> {
  if (!kundeId) return null;

  try {
    const stripe = stripeKlient();
    const kunde = await stripe.customers.retrieve(kundeId);
    if (kunde.deleted) return null;

    const uid = await holeUid(kundeId);

    return {
      firma: kunde.name ?? "",
      strasse: kunde.address?.line1 ?? "",
      plz: kunde.address?.postal_code ?? "",
      ort: kunde.address?.city ?? "",
      ...(kunde.address?.country === "AT" || kunde.address?.country === "DE"
        ? { land: kunde.address.country as LandCode }
        : {}),
      uid: uid ?? "",
    };
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] Rechnungsangaben von ${kundeId} nicht lesbar: ${text}`);
    return null;
  }
}

/**
 * Schreibt die vollständige Rechnungsanschrift an **diesen** Kunden.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Kunden-Id ein Parameter ist und nicht hier ermittelt wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * Damit der Aufrufer sie aus derselben Quelle bezieht wie das Abo, an
 * dem gleich die Zahlungsmethode hängt. Zwei getrennte Ermittlungen —
 * einmal für die Adresse, einmal für das Abo — könnten bei einer
 * geänderten Anmeldeadresse zwei verschiedene Kunden treffen, und dann
 * stünde die Anschrift am einen und die Karte am anderen.
 * `zahlungsmittelUebernehmen` leitet beide aus dem gefundenen Abo ab.
 *
 * Anders als `stelleSteuerstandortSicher()` **überschreibt** diese
 * Funktion vorhandene Werte: sie läuft nur, wenn jemand das Formular
 * ausgefüllt und abgeschickt hat. Genau das ist dann die neuere Angabe.
 */
export async function speichereRechnungAmKunden(
  kundeId: string,
  profil: RechnungsProfil,
): Promise<void> {
  const stripe = stripeKlient();

  await stripe.customers.update(kundeId, {
    name: profil.firma,
    address: {
      line1: profil.strasse,
      postal_code: profil.plz,
      city: profil.ort,
      country: profil.land,
    },
  });

  /*
   * ─────────────────────────────────────────────────────────────────
   *  Die UID/USt-IdNr wird für beide Länder gesetzt (seit 2026-09-21).
   * ─────────────────────────────────────────────────────────────────
   *
   * `setzeUid` ersetzt eine abweichende EU-Nummer und lässt bei leerer
   * Angabe eine im Kundenportal gepflegte stehen. Der Wert kommt aus dem
   * geprüften Profil und trägt beim Rechnungsland AT das Format `ATU…`,
   * bei DE `DE…` — den Länderwechsel deckt das mit ab: eine `ATU…` wird
   * durch die neue `DE…` ersetzt, weil `setzeUid` andere EU-Nummern vor
   * dem Anlegen entfernt.
   *
   * Da die UID seit dem 2026-09-21 am Rechnungstor für beide Länder
   * Pflicht ist, ist `profil.uid` beim aktiven Speichern nicht leer; der
   * Fallback `|| null` (keine Änderung) fängt nur den Speicherweg ab, der
   * ausnahmsweise ohne Nummer läuft.
   */
  await setzeUid(kundeId, profil.uid || null);
}

/**
 * Liegen am Kunden vollständige Rechnungsangaben vor?
 *
 * Das Tor vor der Aktivierung eines kostenpflichtigen Abonnements
 * (Entscheidung vom 2026-09-14). Bewusst **hier** und nicht im Formular:
 *
 *  - Es greift auch auf dem 3DS-Rückweg, auf dem der Browser die Seite
 *    verlassen hat und kein Formularinhalt mehr existiert.
 *  - Es liest den Zustand bei Stripe, statt einer Eingabe zu glauben.
 *    Wer `zahlungsmittelUebernehmen()` direkt aufruft, kommt nicht
 *    vorbei.
 *
 * Verlangt werden genau die Felder, die § 14 Abs. 4 UStG für eine
 * Rechnung an einen Unternehmer braucht und die wir nicht selbst
 * kennen: Firma, Straße, Postleitzahl, Ort, Land. **Die UID/USt-IdNr
 * zählt seit dem 2026-09-18 dazu, seit dem 2026-09-21 für AT und DE**
 * (Produktentscheidung — QuickTeam verkauft nur an Unternehmer; siehe
 * `rechnungSchema`). Dieselbe Prüfung läuft schon beim Speichern über
 * `pruefeRechnung`, aber sie wird hier wiederholt, weil dieser Riegel
 * auch auf dem 3DS-Rückweg und bei direktem Aufruf von
 * `zahlungsmittelUebernehmen()` greift, wo kein Formularinhalt mehr
 * existiert — und weil eine Anschrift auch über das Kundenportal ohne
 * UID an den Kunden geraten kann.
 *
 * Ein Fehlschlag beim Abruf gilt als „nicht vollständig". Das ist die
 * sichere Richtung: lieber eine Aktivierung zu viel verweigern als eine
 * Rechnung ohne Anschrift ausstellen.
 */
export async function rechnungVollstaendig(kundeId: string): Promise<boolean> {
  try {
    const kunde = await stripeKlient().customers.retrieve(kundeId);
    if (kunde.deleted) return false;

    const a = kunde.address;
    const anschriftDa = Boolean(
      kunde.name?.trim() &&
        a?.line1?.trim() &&
        a?.postal_code?.trim() &&
        a?.city?.trim() &&
        a?.country?.trim(),
    );
    if (!anschriftDa) return false;

    /*
     * Rechnungsempfänger ohne UID/USt-IdNr: unvollständig. Seit dem
     * 2026-09-21 gilt das für **beide** Länder (Kursänderung, siehe
     * `CLAUDE.md`) — QuickTeam verkauft nur an Unternehmer. Der Wert steht
     * als `eu_vat`-Steuer-ID am Kunden (`setzeUid`), nicht in der Adresse
     * — deshalb ein eigener Abruf. Da `betriebe.land` per CHECK nur AT/DE
     * kennt, verlangt die Bedingung die Nummer praktisch immer; die
     * ausdrückliche Länderprüfung bleibt als lesbare Grenze stehen.
     */
    if ((a?.country === "AT" || a?.country === "DE") && !(await holeUid(kundeId)))
      return false;

    return true;
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[stripe] Rechnungsangaben von ${kundeId} nicht prüfbar: ${text}`);
    return false;
  }
}

/** Die hinterlegte EU-USt-IdNr. des Kunden, oder `null`. */
export async function holeUid(kundeId: string): Promise<string | null> {
  const ids = await stripeKlient().customers.listTaxIds(kundeId, { limit: 10 });
  return ids.data.find((id) => id.type === "eu_vat")?.value ?? null;
}

/**
 * Hinterlegt die UID/USt-IdNr als `eu_vat`-Steuer-ID am Kunden — für
 * österreichische (`ATU…`) wie deutsche (`DE…`) Rechnungsempfänger.
 *
 * Daran entscheidet Stripe Tax, ob ein grenzüberschreitender Umsatz an
 * einen österreichischen Betrieb nach dem Reverse-Charge-Verfahren läuft;
 * für einen deutschen Inlandsumsatz ändert die Nummer die Steuer nicht,
 * wird aber als Unternehmernachweis auf der Rechnung geführt. Stripe prüft
 * die Nummer danach selbst gegen VIES.
 *
 * `null` heisst „keine Angabe" und ändert nichts — eine im Kundenportal
 * gepflegte Nummer bleibt stehen. Eine abweichende wird ersetzt, damit
 * nicht zwei EU-Nummern nebeneinander stehen und Stripe die falsche nimmt.
 */
export async function setzeUid(kundeId: string, uid: string | null): Promise<void> {
  if (!uid) return;

  const stripe = stripeKlient();
  const ids = await stripe.customers.listTaxIds(kundeId, { limit: 10 });
  const euIds = ids.data.filter((id) => id.type === "eu_vat");

  if (euIds.some((id) => id.value === uid)) return;

  for (const alt of euIds) {
    await stripe.customers.deleteTaxId(kundeId, alt.id);
  }
  await stripe.customers.createTaxId(kundeId, { type: "eu_vat", value: uid });
}

/*
 * Hier stand `entferneUids()`, das bei einem Rechnungsland ausserhalb
 * Österreichs alle EU-Steuernummern des Kunden löschte. Mit der
 * Kursänderung vom 2026-09-21 (UID/USt-IdNr für AT **und** DE Pflicht,
 * siehe CLAUDE.md) trägt auch ein deutscher Kunde eine `eu_vat`-Nummer;
 * ein Länderwechsel ersetzt sie über `setzeUid`, statt sie zu entfernen.
 * Ein pauschales Löschen hätte keinen Aufrufer mehr und wäre falsch.
 */
