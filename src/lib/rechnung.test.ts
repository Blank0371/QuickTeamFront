import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { de } from "@/i18n/de";
import { pruefeRechnung } from "@/lib/rechnung-pruefung";

/**
 * Die Rechnungsangaben, die seit dem 2026-09-14 vor der Aktivierung
 * eines kostenpflichtigen Abonnements vorliegen müssen.
 *
 * Geprüft wird die **Server**-Seite. Die Browserprüfung benutzt dasselbe
 * Zod-Schema; was hier gilt, gilt dort auch — umgekehrt ist die
 * Browserprüfung aber umgehbar, und deshalb ist diese hier die, auf die
 * es ankommt.
 */

const TEXTE = de.validierung;

const VOLLSTAENDIG_AT = {
  rechnung_firma: "Marktcafé Huber GmbH",
  rechnung_strasse: "Hauptplatz 4",
  rechnung_plz: "5020",
  rechnung_ort: "Salzburg",
  land: "AT",
  uid: "ATU12345678",
};

const VOLLSTAENDIG_DE = {
  rechnung_firma: "Huber Gastro GmbH",
  rechnung_strasse: "Marktstraße 12",
  rechnung_plz: "10115",
  rechnung_ort: "Berlin",
  land: "DE",
  uid: "",
};

describe("pruefeRechnung", () => {
  it("nimmt vollständige österreichische Angaben an", () => {
    const ergebnis = pruefeRechnung(VOLLSTAENDIG_AT, TEXTE);
    assert.equal(ergebnis.ok, true);
    if (!ergebnis.ok) return;
    assert.deepEqual(ergebnis.profil, {
      firma: "Marktcafé Huber GmbH",
      strasse: "Hauptplatz 4",
      plz: "5020",
      ort: "Salzburg",
      land: "AT",
      uid: "ATU12345678",
    });
  });

  it("nimmt vollständige deutsche Angaben ohne UID an", () => {
    const ergebnis = pruefeRechnung(VOLLSTAENDIG_DE, TEXTE);
    assert.equal(ergebnis.ok, true);
    if (!ergebnis.ok) return;
    assert.equal(ergebnis.profil.uid, "");
  });

  it("lehnt jedes fehlende Pflichtfeld einzeln ab", () => {
    for (const feld of [
      "rechnung_firma",
      "rechnung_strasse",
      "rechnung_plz",
      "rechnung_ort",
    ] as const) {
      const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_DE, [feld]: "" }, TEXTE);
      assert.equal(ergebnis.ok, false, `${feld} leer wurde angenommen`);
      if (ergebnis.ok) continue;
      assert.ok(ergebnis.felder[feld], `${feld}: Meldung muss am Feld hängen`);
    }
  });

  it("lehnt Felder ab, die nur aus Leerzeichen bestehen", () => {
    // `betriebe.name` hat einen trim-CHECK, die Stripe-Felder haben
    // keinen. Ohne diese Prüfung stünde eine Rechnung mit leerer Zeile da.
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_DE, rechnung_ort: "   " }, TEXTE);
    assert.equal(ergebnis.ok, false);
  });

  it("prüft die Postleitzahl gegen das Land", () => {
    // Österreich: vier Ziffern, Deutschland: fünf. Die fünfstellige
    // Zahl in einem österreichischen Betrieb ist genau der Fehler, der
    // beim Umzug eines Betriebs entsteht.
    const atMitDe = pruefeRechnung({ ...VOLLSTAENDIG_AT, rechnung_plz: "10115" }, TEXTE);
    assert.equal(atMitDe.ok, false);
    if (!atMitDe.ok) assert.ok(atMitDe.felder["rechnung_plz"]);

    const deMitAt = pruefeRechnung({ ...VOLLSTAENDIG_DE, rechnung_plz: "5020" }, TEXTE);
    assert.equal(deMitAt.ok, false);
    if (!deMitAt.ok) assert.ok(deMitAt.felder["rechnung_plz"]);
  });

  it("lehnt eine Postleitzahl mit Buchstaben ab", () => {
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_DE, rechnung_plz: "1011A" }, TEXTE);
    assert.equal(ergebnis.ok, false);
  });

  it("lässt nur AT und DE als Land zu", () => {
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_DE, land: "CH" }, TEXTE);
    assert.equal(ergebnis.ok, false);
    if (!ergebnis.ok) assert.ok(ergebnis.felder["land"]);
  });

  it("verwirft eine UID bei einem deutschen Betrieb, statt sie abzulehnen", () => {
    /*
     * Das Feld wird deutschen Betrieben gar nicht angezeigt — ein Wert
     * kann also nur aus einer manipulierten Anfrage stammen. Ihn
     * abzulehnen hiesse, eine Meldung zu einem Feld zu zeigen, das der
     * Absender nie gesehen hat; für einen Inlandsumsatz ändert er
     * ohnehin nichts.
     */
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_DE, uid: "ATU12345678" }, TEXTE);
    assert.equal(ergebnis.ok, true);
    if (!ergebnis.ok) return;
    assert.equal(ergebnis.profil.uid, "");
  });

  it("lehnt eine formal falsche österreichische UID ab", () => {
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_AT, uid: "DE123456789" }, TEXTE);
    assert.equal(ergebnis.ok, false);
    if (!ergebnis.ok) assert.ok(ergebnis.felder["uid"]);
  });

  it("räumt die UID auf, statt an Leerzeichen zu scheitern", () => {
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_AT, uid: "atu 123-456.78" }, TEXTE);
    assert.equal(ergebnis.ok, true);
    if (!ergebnis.ok) return;
    assert.equal(ergebnis.profil.uid, "ATU12345678");
  });

  it("lehnt eine leere UID bei österreichischen Betrieben ab", () => {
    // Seit dem 2026-09-18 Pflicht: QuickTeam verkauft nur an Unternehmer,
    // ein AT-Rechnungsempfänger ohne UID würde von Stripe Tax wie ein
    // Privatkunde behandelt — genau das soll nicht vorkommen.
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_AT, uid: "" }, TEXTE);
    assert.equal(ergebnis.ok, false);
    if (ergebnis.ok) return;
    assert.ok(ergebnis.felder["uid"]);
  });

  it("lässt eine leere UID bei deutschen Betrieben zu", () => {
    // Für einen Inlandsumsatz ist die UID belanglos; das Feld wird
    // deutschen Betrieben gar nicht erst angezeigt.
    const ergebnis = pruefeRechnung({ ...VOLLSTAENDIG_DE, uid: "" }, TEXTE);
    assert.equal(ergebnis.ok, true);
  });

  it("behandelt fehlende Schlüssel wie leere Felder", () => {
    // Eine manipulierte Anfrage schickt womöglich gar keine Felder mit.
    const ergebnis = pruefeRechnung({}, TEXTE);
    assert.equal(ergebnis.ok, false);
    if (ergebnis.ok) return;
    assert.ok(ergebnis.felder["rechnung_firma"]);
    assert.ok(ergebnis.felder["land"]);
  });

  it("schneidet umgebende Leerzeichen ab, statt sie zu speichern", () => {
    const ergebnis = pruefeRechnung(
      { ...VOLLSTAENDIG_DE, rechnung_firma: "  Huber Gastro GmbH  " },
      TEXTE,
    );
    assert.equal(ergebnis.ok, true);
    if (!ergebnis.ok) return;
    assert.equal(ergebnis.profil.firma, "Huber Gastro GmbH");
  });
});
