import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

  it("kennt keinen Überspringen-Weg mehr", () => {
    /*
     * Kursänderung 2026-09-22 (Nutzerwunsch): keine Testphase mehr, also
     * auch kein „später hinterlegen". Jedes Abo ist sofort fällig; ein
     * kostenloser erster Monat läuft über einen 100-%-Rabattcode.
     */
    assert.ok(
      !planwahl.includes('=== "ueberspringen"'),
      "der Überspringen-Weg ist entfallen und darf nicht zurückkehren",
    );
  });

  it("legt kein Abo mehr mit Testphase an", () => {
    // Seit 2026-09-28 ist `stripe.ts` ein Sammel-Export über `stripe-*.ts`.
    const dateien = readdirSync(path.join(WURZEL, "src/lib")).filter((d) =>
      /^stripe(-[a-z]+)?\.ts$/.test(d),
    );
    assert.ok(dateien.length > 1, "Stripe-Module nicht gefunden");
    for (const datei of dateien) {
      assert.ok(
        !lies(`src/lib/${datei}`).includes("trial_period_days:"),
        `${datei}: seit dem 2026-09-22 gibt es keine Testphase — kein trial_period_days-Parameter`,
      );
    }
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
    /*
     * Die Regel selbst (Kunde, Status, Zahlungsmittel) prüft
     * `setup-intent.test.ts` am Verhalten. Hier nur: die Aktionen laufen
     * durch genau diese Regel.
     */
    assert.ok(aktionen.includes("bewerteSetupIntent(intent, kundeId)"));
    assert.ok(!aktionen.includes("setupIntents.retrieve(setupIntentId);\n    const intentKunde"));
  });

  it("führt die Sicherheitsprüfungen vor der Rechnungsprüfung aus", () => {
    /*
     * Reihenfolge ist hier eine Sicherheitsaussage: eine vollständige
     * Rechnungsanschrift darf die Zugehörigkeitsprüfung nicht ersetzen,
     * sondern nur ergänzen. Stünde sie davor, wäre sie das erste, was
     * über die Aktivierung entscheidet. Geprüft an **jeder** Stelle, an
     * der das Rechnungstor steht (bestehender Betrieb und Pending-Weg).
     */
    const tore = [...aktionen.matchAll(/await rechnungsTor\(/g)].map((m) => m.index ?? -1);
    assert.equal(tore.length, 2, "Rechnungstor an beiden Übernahmestellen");
    let vorher = 0;
    for (const iTor of tore) {
      const iIntent = aktionen.indexOf("await pruefeSetupIntent(", vorher);
      assert.ok(iIntent > 0 && iIntent < iTor, "SetupIntent-Prüfung vor dem Rechnungstor");
      vorher = iTor + 1;
    }
    assert.ok(aktionen.includes("rechnungVollstaendig(kundeId)"));
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
    /*
     * Beide Seiten werten `?setup_intent=` aus und schliessen den 3DS-Rückweg
     * ab — nur mit verschiedenen Aktionen: die Zahlungsseite legt für einen
     * **neuen** Betrieb erst nach der Zahlung den Betrieb an
     * (`betriebAbschliessen`), die Sperrseite übernimmt für einen
     * **bestehenden** Betrieb das Zahlungsmittel (`zahlungsmittelUebernehmen`).
     */
    const seiten: ReadonlyArray<readonly [string, readonly string[]]> = [
      [
        "src/app/(site)/einrichtung/zahlung/page.tsx",
        ["betriebAbschliessen", "zahlungsmittelUebernehmen"],
      ],
      ["src/app/(site)/einrichtung/testphase-abgelaufen/page.tsx", ["zahlungsmittelUebernehmen"]],
    ];
    for (const [seite, abschluesse] of seiten) {
      const quelle = lies(seite);
      assert.ok(
        quelle.includes('params["setup_intent"]'),
        `${seite} muss den 3DS-Rückweg auswerten`,
      );
      assert.ok(
        abschluesse.some((name) => quelle.includes(name)),
        `${seite} muss den 3DS-Rückweg abschliessen`,
      );
    }
  });
});

describe("Die Sperre wird gegen Stripe gegengeprüft", () => {
  /*
   * Das Verhalten (pausiert → Sperrseite, Funkstille öffnet nichts, …)
   * prüft `abo.test.ts` an `aboSperre()`/`mussStripeFragen()` selbst.
   * Hier steht nur die Kopplung: beide Tore müssen durch genau diese
   * Entscheidung laufen, statt wieder eine eigene Bedingung zu tragen —
   * so ist die Stelle, an der sie früher auseinanderliefen, verschwunden.
   */
  for (const datei of ["src/lib/einrichtung.ts", "src/lib/dashboard/zugang.ts"]) {
    it(`${datei} entscheidet über aboSperre()`, () => {
      const quelle = lies(datei);
      for (const name of ["mussStripeFragen(", "aboLageBeiStripe(", "aboSperre("]) {
        assert.ok(quelle.includes(name), `${datei} ruft ${name}) nicht auf`);
      }
      assert.ok(
        !quelle.includes('lage === "pausiert"'),
        `${datei} trägt wieder eine eigene Sperr-Bedingung`,
      );
    });
  }
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
