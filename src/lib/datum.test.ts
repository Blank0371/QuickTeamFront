import assert from "node:assert/strict";
import test from "node:test";
import { beginnVorbei, betriebsZeitpunkt, heuteImBetrieb, istKalendertag, tagPlus } from "./datum";
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

test("„heute“ gilt in Betriebszeit, nicht in der UTC des Servers", () => {
  // 00:30 in Wien (Sommerzeit) ist in UTC noch der Vortag.
  assert.equal(heuteImBetrieb(new Date("2026-07-14T22:30:00Z")), "2026-07-15");
  // 00:30 in Wien (Winterzeit).
  assert.equal(heuteImBetrieb(new Date("2026-01-14T23:30:00Z")), "2026-01-15");
  assert.equal(heuteImBetrieb(new Date("2026-07-15T12:00:00Z")), "2026-07-15");
});

test("tagPlus zählt Kalendertage über Monats-, Jahres- und Umstellungsgrenzen", () => {
  assert.equal(tagPlus("2026-01-31", 1), "2026-02-01");
  assert.equal(tagPlus("2026-12-31", 1), "2027-01-01");
  assert.equal(tagPlus("2026-03-28", 1), "2026-03-29");
  assert.equal(tagPlus("2026-03-29", 1), "2026-03-30");
  assert.equal(tagPlus("2026-03-01", -1), "2026-02-28");
});

test("Eine Schicht beginnt in der Zukunft erst nach der jetzigen Minute in Betriebszeit", () => {
  // 2026-07-15 10:00 in Wien (Sommerzeit, UTC+2).
  const jetzt = new Date("2026-07-15T08:00:00Z");
  assert.equal(beginnVorbei("2026-07-14", "23:00", jetzt), true);
  assert.equal(beginnVorbei("2026-07-15", "09:59", jetzt), true);
  assert.equal(beginnVorbei("2026-07-15", "10:00", jetzt), true);
  assert.equal(beginnVorbei("2026-07-15", "10:01", jetzt), false);
  assert.equal(beginnVorbei("2026-07-16", "00:00", jetzt), false);
  // 00:30 Wien ist in UTC noch der Vortag — „heute" ist trotzdem der 15.
  assert.equal(beginnVorbei("2026-07-15", "06:00", new Date("2026-07-14T22:30:00Z")), false);
});
