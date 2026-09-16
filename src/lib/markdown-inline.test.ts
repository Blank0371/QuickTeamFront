import assert from "node:assert/strict";
import test from "node:test";
import { inlineTeile, sicheresLinkZiel } from "./markdown-inline";

test("Rechtsverweise werden als Links und Feldnamen als Code erkannt", () => {
  assert.deepEqual(inlineTeile("Siehe [AVV](/avv) und `betrieb_id`."), [
    { typ: "text", text: "Siehe " }, { typ: "link", text: "AVV", href: "/avv" },
    { typ: "text", text: " und " }, { typ: "code", text: "betrieb_id" }, { typ: "text", text: "." },
  ]);
});

test("Aktive Protokolle und protokollrelative Ziele bleiben nicht ausführbarer Text", () => {
  for (const ziel of ["javascript:alert", "data:text/html,test", "//example.org", "/\\example.org", "java\nscript:alert"]) {
    assert.equal(sicheresLinkZiel(ziel), false);
  }
  assert.deepEqual(inlineTeile("[Test](javascript:alert)"), [{ typ: "text", text: "[Test](javascript:alert)" }]);
  assert.equal(sicheresLinkZiel("https://example.org/path"), true);
  assert.equal(sicheresLinkZiel("mailto:blanktrading@web.de"), true);
});
