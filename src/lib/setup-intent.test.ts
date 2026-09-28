import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bewerteSetupIntent, type SetupIntentAuszug } from "@/lib/setup-intent";

function intent(teil: Partial<SetupIntentAuszug>): SetupIntentAuszug {
  return { customer: "cus_1", status: "succeeded", payment_method: "pm_1", ...teil };
}

describe("bewerteSetupIntent", () => {
  it("liefert das Zahlungsmittel eines bestätigten Intents am richtigen Kunden", () => {
    assert.deepEqual(bewerteSetupIntent(intent({}), "cus_1"), {
      ok: true,
      zahlungsmittelId: "pm_1",
    });
  });

  it("liest auch expandierte Objekte", () => {
    const ergebnis = bewerteSetupIntent(
      intent({ customer: { id: "cus_1" }, payment_method: { id: "pm_2" } }),
      "cus_1",
    );
    assert.deepEqual(ergebnis, { ok: true, zahlungsmittelId: "pm_2" });
  });

  it("weist einen Intent eines fremden Kunden ab", () => {
    assert.deepEqual(bewerteSetupIntent(intent({ customer: "cus_x" }), "cus_1"), {
      ok: false,
      grund: "fremd",
      intentKunde: "cus_x",
    });
    assert.deepEqual(bewerteSetupIntent(intent({ customer: null }), "cus_1"), {
      ok: false,
      grund: "fremd",
      intentKunde: null,
    });
  });

  it("prüft die Zugehörigkeit vor dem Status", () => {
    const ergebnis = bewerteSetupIntent(
      intent({ customer: "cus_x", status: "requires_action" }),
      "cus_1",
    );
    assert.equal(ergebnis.ok === false && ergebnis.grund, "fremd");
  });

  it("weist einen noch nicht bestätigten Intent ab", () => {
    const ergebnis = bewerteSetupIntent(intent({ status: "requires_action" }), "cus_1");
    assert.equal(ergebnis.ok === false && ergebnis.grund, "unbestaetigt");
  });

  it("weist einen bestätigten Intent ohne Zahlungsmittel ab", () => {
    const ergebnis = bewerteSetupIntent(intent({ payment_method: null }), "cus_1");
    assert.equal(ergebnis.ok === false && ergebnis.grund, "ohne-zahlungsmittel");
  });
});
