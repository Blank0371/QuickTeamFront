import assert from "node:assert/strict";
import test from "node:test";
import { betriebsZeitpunkt, istKalendertag } from "./datum";
import { fristNochOffen } from "./dashboard/planung";

test("Kalendertage prüfen Monatslängen und Schaltjahre", () => {
  assert.equal(istKalendertag("2026-02-30"), false);
  assert.equal(istKalendertag("2026-02-29"), false);
  assert.equal(istKalendertag("2028-02-29"), true);
  assert.equal(istKalendertag("2026-13-01"), false);
});

test("Planungsfristen richten sich nach Sommer- und Winterzeit inklusive Umstellungstag", () => {
  assert.equal(betriebsZeitpunkt("2026-01-15", true), "2026-01-15T22:59:59.000Z");
  assert.equal(betriebsZeitpunkt("2026-07-15", true), "2026-07-15T21:59:59.000Z");
  assert.equal(betriebsZeitpunkt("2026-03-29"), "2026-03-28T23:00:00.000Z");
  assert.equal(betriebsZeitpunkt("2026-03-29", true), "2026-03-29T21:59:59.000Z");
  assert.equal(betriebsZeitpunkt("2026-10-25"), "2026-10-24T22:00:00.000Z");
  assert.equal(betriebsZeitpunkt("2026-10-25", true), "2026-10-25T22:59:59.000Z");
});

test("Winterfrist bleibt bis zum tatsächlichen Tagesende offen", () => {
  assert.deepEqual(fristNochOffen(1, "2026-12-01", "2026-11-20", new Date("2026-11-20T22:30:00Z")), { stichtag: "2026-11-20" });
  assert.equal(fristNochOffen(1, "2026-12-01", "2026-11-20", new Date("2026-11-20T23:00:00Z")), null);
});
