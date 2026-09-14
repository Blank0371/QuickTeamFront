import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Invarianten des Zahlungswegs, die sich nicht sinnvoll durch Aufrufen
 * prüfen lassen — wohl aber am Quelltext.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum Quelltext-Prüfungen und nicht „richtige" Tests
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Aussagen hier sind **Abwesenheitsaussagen**: „auf diesem Pfad wird
 * nichts verlangt", „dieser Wert kommt nirgends aus dem Formular". Solche
 * Sätze lassen sich durch Aufrufen nicht belegen — ein Aufruf, der
 * funktioniert, beweist nur den einen Weg, den er nimmt. Ausserdem
 * bräuchte jeder echte Aufruf hier Stripe und Supabase, also genau die
 * beiden Dinge, die der Testlauf nicht hat.
 *
 * Was diese Prüfungen leisten, ist trotzdem nicht wenig: sie schlagen an,
 * wenn jemand die Kopplung wieder einführt, gegen die sie geschrieben
 * sind. Das ist ihr einziger Zweck — und für eine bewusst gezogene Grenze
 * ist es der richtige.
 *
 * Was sie **nicht** leisten: ein Beleg, dass der Ablauf mit Stripe
 * funktioniert. Dafür gibt es das Protokoll in
 * `docs/zahlung-testprotokoll.md`, und das ist offen.
 */

const WURZEL = path.resolve(import.meta.dirname, "..", "..");

function lies(relativ: string): string {
  return readFileSync(path.join(WURZEL, relativ), "utf8");
}

describe("Kostenloses Testen bleibt ohne Rechnungsdaten möglich", () => {
  const planwahl = lies("src/app/(site)/einrichtung/zahlung/aktionen.ts");

  it("verlangt in der Planwahl keine Vollständigkeitsprüfung", () => {
    /*
     * `planWaehlen` legt das Abo mit Testphase an — ohne Zahlungsmittel
     * und ohne Anschrift. In der Testphase ist nichts fällig und keine
     * Rechnung entsteht; eine Pflichtanschrift wäre eine Hürde vor einem
     * unentgeltlichen Angebot.
     *
     * Die Prüfung gehört ausschliesslich dorthin, wo eine Rechnung
     * entstehen kann: in `zahlungsmittelUebernehmen`.
     */
    assert.ok(
      !planwahl.includes("rechnungVollstaendig"),
      "planWaehlen darf keine vollständige Rechnungsanschrift verlangen",
    );
    assert.ok(
      !planwahl.includes("pruefeRechnung"),
      "planWaehlen darf die Rechnungsprüfung nicht aufrufen",
    );
  });

  it("kennt weiterhin den Überspringen-Weg", () => {
    assert.ok(
      planwahl.includes('formData.get("absicht") === "ueberspringen"'),
      "der Weg 'später hinterlegen' muss bestehen bleiben",
    );
  });
});

describe("Das Tor vor der Aktivierung liegt im Server, nicht im Formular", () => {
  const aktionen = lies("src/lib/zahlung-aktionen.ts");

  it("prüft die Vollständigkeit gegen Stripe, nicht gegen die Eingabe", () => {
    /*
     * Der Kern der Entscheidung vom 2026-09-14: `rechnungVollstaendig`
     * liest den Stand beim Zahlungsdienstleister. Damit greift das Tor
     * auch auf dem 3DS-Rückweg, auf dem es kein Formular mehr gibt, und
     * ein direkter Aufruf der Server Action kommt nicht daran vorbei.
     */
    assert.ok(aktionen.includes("rechnungVollstaendig(kundeId)"));
  });

  it("nimmt die Kunden-Id aus dem Abo, nicht aus der Eingabe", () => {
    assert.ok(
      aktionen.includes("typeof abo.customer === "),
      "die Kunden-Id muss aus dem gefundenen Abo stammen",
    );
    assert.ok(
      !/kundeId\s*=\s*.*formData/.test(aktionen),
      "keine Kunden-Id aus einem Formular",
    );
  });

  it("prüft den SetupIntent auf Kunde UND Status", () => {
    assert.ok(aktionen.includes("intentKunde !== kundeId"));
    assert.ok(aktionen.includes('intent.status !== "succeeded"'));
  });

  it("führt die Sicherheitsprüfungen vor der Rechnungsprüfung aus", () => {
    /*
     * Reihenfolge ist hier eine Sicherheitsaussage: eine vollständige
     * Rechnungsanschrift darf die Zugehörigkeitsprüfung nicht ersetzen,
     * sondern nur ergänzen. Stünde sie davor, wäre sie das erste, was
     * über die Aktivierung entscheidet.
     */
    const iKunde = aktionen.indexOf("intentKunde !== kundeId");
    const iStatus = aktionen.indexOf('intent.status !== "succeeded"');
    const iRechnung = aktionen.indexOf("rechnungVollstaendig(kundeId)");

    assert.ok(iKunde > 0 && iStatus > 0 && iRechnung > 0);
    assert.ok(iKunde < iRechnung, "Kundenprüfung vor Rechnungsprüfung");
    assert.ok(iStatus < iRechnung, "Statusprüfung vor Rechnungsprüfung");
  });
});

describe("3DS kehrt zu der Seite zurück, auf der das Formular stand", () => {
  const formular = lies("src/components/einrichtung/zahlungs-formular.tsx");

  it("verdrahtet keinen festen Rückweg", () => {
    /*
     * Der Fehler, den das behebt: mit fest verdrahtetem
     * `/einrichtung/zahlung` landete ein 3DS-Rückweg von der Sperrseite
     * auf dem Stepper-Schritt, wurde dort von `betreteSchritt` wegen
     * `gesperrt` umgeleitet — und verlor dabei `?setup_intent=`. Die
     * Zahlungsmethode war bestätigt und wurde nie übernommen.
     *
     * Am 2026-09-14 haben zwei Zweige diesen Fehler unabhängig gefunden
     * und verschieden gelöst: eine ausdrückliche `rueckkehrPfad`-Prop
     * gegen `window.location.pathname`. Zusammengeführt gilt beides —
     * und der Test prüft seither **die Eigenschaft**, nicht die
     * Schreibweise: es darf keinen Weg geben, auf dem ein fester Pfad
     * gewinnt.
     */
    const zeile = formular
      .split("\n")
      .find((z) => z.includes("return_url:"));
    assert.ok(zeile, "return_url nicht gefunden");

    assert.ok(
      !/return_url:.*\/einrichtung\//.test(zeile),
      "kein fester Pfad in return_url — genau das war der Fehler",
    );
    assert.ok(
      zeile.includes("rueckkehrPfad"),
      "die aufrufende Seite muss den Rückweg bestimmen können",
    );
    assert.ok(
      zeile.includes("window.location.pathname"),
      "und ohne Prop muss die aktuelle Seite der Rückfall sein — " +
        "eine feste Vorgabe würde den Fehler bei der nächsten Einbindung zurückholen",
    );

    // Die Prop darf keine feste Vorgabe haben, sonst ist der Rückfall tot.
    assert.ok(
      !/rueckkehrPfad\s*=\s*"/.test(formular),
      "rueckkehrPfad darf keinen Vorgabewert haben",
    );
  });

  it("wird von beiden Seiten ausgewertet", () => {
    for (const seite of [
      "src/app/(site)/einrichtung/zahlung/page.tsx",
      "src/app/(site)/einrichtung/testphase-abgelaufen/page.tsx",
    ]) {
      const quelle = lies(seite);
      assert.ok(
        quelle.includes('params["setup_intent"]'),
        `${seite} muss den 3DS-Rückweg auswerten`,
      );
      assert.ok(
        quelle.includes("zahlungsmittelUebernehmen"),
        `${seite} muss die Zahlungsmethode übernehmen`,
      );
    }
  });
});

const ZEILENUMBRUCH = String.fromCharCode(10);

describe("Die Sperre wird gegen Stripe gegengeprüft", () => {
  const einrichtung = lies("src/lib/einrichtung.ts");

  it("verlässt sich nicht allein auf die eigene Zeile", () => {
    /*
     * `betrieb_abonnements.status` schreibt allein der Webhook. Wer sein
     * pausiertes Abo gerade fortgesetzt hat, darf nicht vom nächsten
     * Seitenaufruf zurück auf die Sperrseite geworfen werden, nur weil
     * die Zustellung noch unterwegs ist.
     */
    const iAbfrage = einrichtung.indexOf("const abo = await holeAbo(supabase, betriebId);");
    assert.ok(iAbfrage > 0, "Abo-Abfrage nicht gefunden");
    const block = einrichtung.slice(iAbfrage, iAbfrage + 900);

    assert.ok(
      block.includes("aboLageBeiStripe"),
      "im Sperrfall muss Stripe gefragt werden",
    );
    /*
     * Zeilenweise statt per Regex: die Bedingung enthält verschachtelte
     * Klammern (`aboGekuendigt(abo)`), an denen ein Muster mit `[^)]*`
     * scheitert — und ein Test, der an seiner eigenen Regex scheitert,
     * behauptet einen Fehler, den es nicht gibt.
     */
    const zeilen = block.split(ZEILENUMBRUCH);
    const iBedingung = zeilen.findIndex(
      (z) => z.trimStart().startsWith("if (") && z.includes("testphaseAbgelaufen(abo)"),
    );
    assert.ok(iBedingung >= 0, "keine Bedingung, die `pausiert` einschliesst");
    assert.ok(
      zeilen.slice(iBedingung, iBedingung + 6).some((z) => z.includes("aboLageBeiStripe")),
      "auch `pausiert` muss die Stripe-Abfrage auslösen — sonst wirft der " +
        "nächste Seitenaufruf einen gerade zahlenden Kunden zurück auf die Sperrseite",
    );
    assert.ok(
      block.includes('lage === "pausiert"'),
      "gesperrt bleibt, wer bei Stripe wirklich pausiert ist",
    );
    assert.ok(
      block.includes('lage === "unbekannt"'),
      "antwortet Stripe nicht, darf die Sperre nicht aufgehen",
    );
  });
});

describe("Rechnungsland ändert das Betriebsland nicht", () => {
  it("keine Schreiboperation auf `betriebe` im Rechnungspfad", () => {
    for (const datei of ["src/lib/rechnung.ts", "src/lib/zahlung-aktionen.ts"]) {
      const quelle = lies(datei);
      assert.ok(
        !/from\("betriebe"\)[\s\S]{0,120}\.update\(/.test(quelle),
        `${datei} darf betriebe nicht ändern`,
      );
    }
  });

  it("das Betriebsland wird nur bei der Registrierung gesetzt", () => {
    // `registriere_betrieb` ist der einzige Schreibweg. Ein zweiter
    // wäre der stille Weg zurück zur Kopplung.
    const betrieb = lies("src/lib/betrieb.ts");
    assert.ok(betrieb.includes("p_land: geprueft.data.land"));
    assert.ok(!/from\("betriebe"\)[\s\S]{0,120}\.update\(/.test(betrieb));
  });
});
