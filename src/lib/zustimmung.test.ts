import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECHTSTEXT_VERSIONEN } from "@/lib/rechtstexte";
import {
  ermittleZustimmungBefund,
  offeneDokumente,
  sperrtZugang,
} from "@/lib/zustimmung";

/**
 * Die Prüfung, die entscheidet, ob ein Betrieb arbeiten darf.
 *
 * Getestet wird vor allem die **Unterscheidung**, die am 2026-09-13
 * eingeführt wurde: eine nie erfolgte Erstannahme sperrt, eine noch
 * nicht angenommene Vertragsänderung nicht. Der Fall „Versionswechsel
 * sperrt alle Bestandskunden" ist genau der, den niemand im Betrieb
 * bemerken würde, bevor er passiert ist — ein Test dafür ist billiger
 * als die Beschwerde.
 */

const BETRIEB = "b-1";
const ICH = "auth-ich";
const ANDERER = "auth-anderer";

type Zeile = {
  dokument: string;
  version: string;
  art: string;
  auth_id: string;
};

/**
 * Ein Supabase-Client, der genau so viel kann wie `ermittleZustimmungBefund`
 * von ihm verlangt: `.from(…).select(…).eq(…)`.
 *
 * Absichtlich kein Nachbau der Bibliothek — die Kette ist drei Glieder
 * lang, und ein Test, der eine ganze Client-Attrappe pflegt, prüft
 * irgendwann die Attrappe.
 */
function klientMit(zeilen: Zeile[] | { fehler: string }) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return Array.isArray(zeilen)
                ? Promise.resolve({ data: zeilen, error: null })
                : Promise.resolve({ data: null, error: { message: zeilen.fehler } });
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function zeile(dokument: string, version: string, authId = ICH): Zeile {
  return {
    dokument,
    version,
    art: dokument === "datenschutz" ? "persoenlich" : "betrieblich",
    auth_id: authId,
  };
}

const AKTUELL = (dokument: "agb" | "avv" | "datenschutz") =>
  zeile(dokument, RECHTSTEXT_VERSIONEN[dokument]);

describe("ermittleZustimmungBefund", () => {
  it("erkennt die vollständige Zustimmung in aktueller Fassung", async () => {
    const befund = await ermittleZustimmungBefund(
      klientMit([AKTUELL("agb"), AKTUELL("avv"), AKTUELL("datenschutz")]),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "zugestimmt");
    assert.equal(sperrtZugang(befund), false);
    assert.deepEqual(offeneDokumente(befund), []);
  });

  it("sperrt, wenn AGB und AVV nie angenommen wurden", async () => {
    const befund = await ermittleZustimmungBefund(klientMit([]), BETRIEB, ICH);

    assert.equal(befund.art, "erstannahme-fehlt");
    assert.equal(sperrtZugang(befund), true);
  });

  it("sperrt NICHT, wenn nur eine neue Fassung offen ist", async () => {
    /*
     * Der Kern der Änderung vom 2026-09-13 und zugleich der teuerste
     * denkbare Fehler: ein einziger geänderter Wert in
     * `rechtstexte.ts` hätte vorher jeden zahlenden Bestandskunden
     * gleichzeitig ausgesperrt — entgegen § 13 Abs. 3 der AGB, der bis
     * zur Zustimmung ausdrücklich die bisherigen Bedingungen
     * weitergelten lässt.
     */
    const befund = await ermittleZustimmungBefund(
      klientMit([
        zeile("agb", "2026-01-01-alt"),
        zeile("avv", "2026-01-01-alt"),
        zeile("datenschutz", "2026-01-01-alt"),
      ]),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "aenderung-offen");
    assert.equal(sperrtZugang(befund), false);
    assert.deepEqual(offeneDokumente(befund).sort(), ["agb", "avv", "datenschutz"]);
  });

  it("sperrt nicht wegen einer fehlenden Datenschutz-Kenntnisnahme", async () => {
    // Kenntnisnahme, keine Willenserklärung: Art. 13 DSGVO verlangt,
    // dass informiert wird, nicht dass jemand zustimmt.
    const befund = await ermittleZustimmungBefund(
      klientMit([AKTUELL("agb"), AKTUELL("avv")]),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "aenderung-offen");
    assert.equal(sperrtZugang(befund), false);
    assert.deepEqual(offeneDokumente(befund), ["datenschutz"]);
  });

  it("zählt die betriebliche Annahme eines anderen Chefs mit", async () => {
    // Der Vertrag besteht mit dem Betrieb. Ein zweiter Chef schliesst ihn
    // nicht noch einmal.
    const befund = await ermittleZustimmungBefund(
      klientMit([
        zeile("agb", RECHTSTEXT_VERSIONEN.agb, ANDERER),
        zeile("avv", RECHTSTEXT_VERSIONEN.avv, ANDERER),
        AKTUELL("datenschutz"),
      ]),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "zugestimmt");
  });

  it("zählt die persönliche Kenntnisnahme eines anderen NICHT mit", async () => {
    /*
     * Bis zum 2026-09-13 zählte auch die Datenschutzerklärung je
     * Betrieb — damit galt die Kenntnisnahme des einen Chefs
     * stillschweigend für jeden weiteren, was den Sinn einer
     * persönlichen Angabe aufhebt.
     */
    const befund = await ermittleZustimmungBefund(
      klientMit([
        AKTUELL("agb"),
        AKTUELL("avv"),
        zeile("datenschutz", RECHTSTEXT_VERSIONEN.datenschutz, ANDERER),
      ]),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "aenderung-offen");
    assert.deepEqual(offeneDokumente(befund), ["datenschutz"]);
  });

  it("wertet eine Zeile mit falscher Art nicht als Annahme", async () => {
    // Die Datenbank verhindert das über die generierte Spalte `art` und
    // die getrennten INSERT-Policies; geprüft wird hier, dass das Gate
    // sich nicht auf „Zeile mit passendem Namen vorhanden" verlässt.
    const befund = await ermittleZustimmungBefund(
      klientMit([
        { dokument: "agb", version: RECHTSTEXT_VERSIONEN.agb, art: "persoenlich", auth_id: ICH },
        AKTUELL("avv"),
        AKTUELL("datenschutz"),
      ]),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "erstannahme-fehlt");
    assert.equal(sperrtZugang(befund), true);
  });

  it("behandelt einen Lesefehler als eigenen Zustand, nicht als Zustimmung", async () => {
    const befund = await ermittleZustimmungBefund(
      klientMit({ fehler: "connection reset" }),
      BETRIEB,
      ICH,
    );

    assert.equal(befund.art, "pruefung-fehlgeschlagen");
    assert.equal(sperrtZugang(befund), true);
    assert.deepEqual(offeneDokumente(befund), []);
  });
});
