import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { locales } from "@/i18n/config";
import { rechtstextSprache } from "@/lib/rechtstexte";
import { stripeSprache } from "@/lib/stripe-sprache";

describe("stripeSprache", () => {
  it("reicht Sprachen durch, die Stripe kennt", () => {
    for (const locale of ["de", "en", "es", "fr", "it", "pt", "ru", "tr"] as const) {
      assert.equal(stripeSprache(locale), locale);
    }
  });

  it("nimmt auto für Albanisch und Ukrainisch", () => {
    assert.equal(stripeSprache("sq"), "auto");
    assert.equal(stripeSprache("uk"), "auto");
  });
});

describe("rechtstextSprache", () => {
  it("liest Deutsch deutsch und jede andere Oberflächensprache englisch", () => {
    for (const locale of locales) {
      assert.equal(rechtstextSprache(locale), locale === "de" ? "de" : "en");
    }
  });
});
