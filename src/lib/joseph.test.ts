import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { josephZustand } from "@/lib/joseph";

/**
 * Die Wahrheitstafel aus `joseph.ts`: nur exakt „an" schaltet, und
 * `JOSEPH_ENABLED` geht `JOSEPH_SHOWOFF` vor.
 */

function setze(enabled: string | undefined, showoff: string | undefined) {
  if (enabled === undefined) delete process.env.JOSEPH_ENABLED;
  else process.env.JOSEPH_ENABLED = enabled;
  if (showoff === undefined) delete process.env.JOSEPH_SHOWOFF;
  else process.env.JOSEPH_SHOWOFF = showoff;
}

describe("josephZustand", () => {
  afterEach(() => setze(undefined, undefined));

  it("ist aus, wenn beide fehlen", () => {
    setze(undefined, undefined);
    assert.equal(josephZustand(), "aus");
  });

  it("ist aus bei aus/aus", () => {
    setze("aus", "aus");
    assert.equal(josephZustand(), "aus");
  });

  it("zeigt die Vorschau bei aus/an", () => {
    setze("aus", "an");
    assert.equal(josephZustand(), "vorschau");
  });

  it("ist aktiv, sobald ENABLED an ist — SHOWOFF egal", () => {
    setze("an", "aus");
    assert.equal(josephZustand(), "aktiv");
    setze("an", undefined);
    assert.equal(josephZustand(), "aktiv");
  });

  it("liest Leerraum und Grossschreibung als an", () => {
    setze(" AN ", undefined);
    assert.equal(josephZustand(), "aktiv");
  });

  it("wertet Vertipptes als aus", () => {
    for (const wert of ["true", "1", "on", "ja", "a n", ""]) {
      setze(wert, wert);
      assert.equal(josephZustand(), "aus", `Wert ${JSON.stringify(wert)}`);
    }
  });
});
