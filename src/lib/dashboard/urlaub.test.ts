import assert from "node:assert/strict";
import test from "node:test";
import { genehmigteTageOhne, tageDiff, tageImJahr, verbrauchteTage } from "./urlaub";

test("Urlaub zählt Kalendertage auch über Sommerzeit hinweg", () => {
  const vorher = process.env.TZ;
  try {
    process.env.TZ = "Europe/Berlin";
    assert.equal(tageDiff("2026-03-28", "2026-03-30"), 3);
    assert.equal(tageDiff("2026-10-24", "2026-10-26"), 3);
    assert.equal(tageDiff("2026-03-30", "2026-03-30"), 1);
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
});

test("Jahresübergreifender Urlaub belastet jedes Jahr nur mit seinen Tagen", () => {
  assert.equal(tageImJahr("2026-12-30", "2027-01-03", 2026), 2);
  assert.equal(tageImJahr("2026-12-30", "2027-01-03", 2027), 3);
  assert.equal(tageImJahr("2026-12-30", "2027-01-03", 2028), 0);
  const antrag = { id: "a", mitarbeiterId: "m", von: "2026-12-30", bis: "2027-01-03", status: "approved" as const, kommentar: null, begruendung: null };
  assert.equal(genehmigteTageOhne([antrag], "m", undefined, 2027), 3);
  assert.equal(genehmigteTageOhne([antrag], "m", "a", 2027), 0);
  assert.equal(genehmigteTageOhne([antrag], "andere", undefined, 2027), 0);
  assert.equal(verbrauchteTage([antrag], 2027), 3);
});
