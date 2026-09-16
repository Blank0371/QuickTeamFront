import assert from "node:assert/strict";
import { test } from "node:test";
import { urlaubAntragSchema, tagesPraeferenzSchema } from "./validierung";
test("Unmögliche Tage werden vor dem Datenbankaufruf abgewiesen", () => {
  assert.equal(urlaubAntragSchema.safeParse({ von: "2026-02-30", bis: "2026-03-03", kommentar: "" }).success, false);
  assert.equal(tagesPraeferenzSchema.safeParse({ schichtVorlageId: "v", datum: "2026-04-31", praeferenz: "gerne" }).success, false);
  assert.equal(urlaubAntragSchema.safeParse({ von: "2028-02-29", bis: "2028-03-01", kommentar: "" }).success, true);
});
