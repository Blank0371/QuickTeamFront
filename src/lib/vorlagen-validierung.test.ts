import assert from "node:assert/strict";
import { test } from "node:test";

import { vorlagenSchema } from "./validierung";

/**
 * `vorlagenSchema.wochentag` ist seit 2026-10-06 eine Mehrfachauswahl:
 * je Tag entsteht eine Vorlage (`legeVorlageAn`). Mindestens ein Tag ist
 * Pflicht, doppelte fallen heraus, Montag (0) zuerst.
 */

const basis = { bezeichnung: "Frühdienst", start_zeit: "06:00", end_zeit: "14:00" };

test("mehrere Tage: dedupliziert und aufsteigend, aus FormData-Strings", () => {
  const r = vorlagenSchema.safeParse({ ...basis, wochentag: ["4", "0", "2", "0"] });
  assert.ok(r.success);
  assert.deepEqual(r.data.wochentag, [0, 2, 4]);
});

test("ein einzelner Tag bleibt eine Liste mit einem Eintrag", () => {
  const r = vorlagenSchema.safeParse({ ...basis, wochentag: ["6"] });
  assert.ok(r.success);
  assert.deepEqual(r.data.wochentag, [6]);
});

test("kein Tag gewählt ist ein Fehler am Feld `wochentag`", () => {
  const r = vorlagenSchema.safeParse({ ...basis, wochentag: [] });
  assert.ok(!r.success);
  assert.equal(r.error.issues[0]?.path[0], "wochentag");
  assert.equal(r.error.issues[0]?.message, "v.wochentag.wahl");
});

test("ausserhalb 0..6 wird abgelehnt — 7 wäre kein Sonntag, sondern nichts", () => {
  for (const tag of ["7", "-1", "1.5", "x"]) {
    const r = vorlagenSchema.safeParse({ ...basis, wochentag: ["0", tag] });
    assert.ok(!r.success, tag);
    assert.equal(r.error.issues[0]?.path[0], "wochentag");
  }
});
