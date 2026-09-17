import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serialisierePaket } from "./serialisierung";

/**
 * Der Serialisierer des Exportpakets.
 *
 * Zwei Zusagen stehen auf dem Spiel, und die zweite ist die
 * gefährlichere: die Datei soll **kürzer** werden, und sie muss
 * **gültiges JSON mit unverändertem Inhalt** bleiben. Ein eigener
 * Schreiber, der an einer Stelle ein Komma verliert, produziert eine
 * Datei, die niemand mehr einlesen kann — und zwar ausgerechnet die
 * Datei, die jemand nach einer Kündigung als einziges noch hat.
 */
describe("serialisierePaket", () => {
  it("gibt denselben Inhalt wie JSON.stringify", () => {
    const paket = {
      format: "quickteam-betriebsexport/3",
      meta: { betrieb: { id: "b1", name: "Café \"Eck\"" }, groesse_bytes: 0 },
      hinweise: ["ein Satz", "noch einer"],
      tabellen: {
        mitarbeiter: [
          { id: "m1", vorname: "Anna", soll_stunden: null, aktiv: true },
          { id: "m2", vorname: "Tim\nZeilenumbruch", soll_stunden: 38.5, aktiv: false },
        ],
        leer: [],
      },
      verschachtelt: [{ a: { b: [1, 2, { c: "d" }] } }],
    };

    assert.deepEqual(JSON.parse(serialisierePaket(paket)), JSON.parse(JSON.stringify(paket)));
  });

  it("schreibt einen Datensatz auf eine Zeile, die Struktur bleibt eingerückt", () => {
    const text = serialisierePaket({
      tabellen: {
        mitarbeiter: [
          { id: "m1", vorname: "Anna" },
          { id: "m2", vorname: "Tim" },
        ],
      },
    });

    assert.equal(
      text,
      [
        "{",
        '  "tabellen": {',
        '    "mitarbeiter": [',
        '      {"id":"m1","vorname":"Anna"},',
        '      {"id":"m2","vorname":"Tim"}',
        "    ]",
        "  }",
        "}",
      ].join("\n"),
    );
  });

  it("ist bei vielen Datensätzen um Grössenordnungen kürzer als eingerückte Ausgabe", () => {
    const zeilen = Array.from({ length: 500 }, (_, n) => ({
      id: `z${n}`,
      betrieb_id: "b1",
      aktion: "insert",
      neue_werte: { id: `s${n}`, datum: "2026-09-01", status: "geplant" },
    }));
    const paket = { tabellen: { plan_aenderungen: zeilen } };

    const neu = serialisierePaket(paket).split("\n").length;
    const alt = JSON.stringify(paket, null, 2).split("\n").length;

    assert.ok(neu < 510, `erwartet rund eine Zeile je Datensatz, waren ${neu}`);
    assert.ok(alt > 4000, `Vergleichswert unerwartet klein (${alt})`);
  });

  it("hält Sätze für Menschen einzeln untereinander", () => {
    const text = serialisierePaket({ hinweise: ["erster", "zweiter"] });

    assert.ok(text.includes('\n    "erster",\n    "zweiter"\n'));
  });

  it("verliert bei einem Date-Wert nichts", () => {
    const text = serialisierePaket({ tabellen: { a: [{ am: new Date("2026-09-17T08:00:00Z") }] } });

    assert.match(text, /2026-09-17T08:00:00\.000Z/);
  });

  it("schreibt leere Strukturen kompakt", () => {
    assert.equal(serialisierePaket({ a: [], b: {} }), '{\n  "a": [],\n  "b": {}\n}');
  });
});
