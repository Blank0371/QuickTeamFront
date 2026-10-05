import assert from "node:assert/strict";
import { test } from "node:test";
import { einrichtungAnstellungSchema, monatsstundenAusWoche, urlaubVorabSchema } from "./validierung";

function pruefe(wochenstunden: string, toleranz: string, urlaub: string) {
  return einrichtungAnstellungSchema.safeParse({
    soll_stunden: monatsstundenAusWoche(wochenstunden),
    toleranz_ueberstunden: toleranz,
    urlaubsanspruch_tage: urlaub,
  });
}

test("Wochenstunden werden als Monatswert gespeichert", () => {
  const ergebnis = pruefe("40", "5", "25");
  assert.equal(ergebnis.success, true);
  assert.deepEqual(ergebnis.data, {
    soll_stunden: 173,
    toleranz_ueberstunden: 5,
    urlaubsanspruch_tage: 25,
  });
});

test("Sollstunden sind im Stepper Pflicht", () => {
  const ergebnis = pruefe("", "0", "25");
  assert.equal(ergebnis.success, false);
  assert.deepEqual(ergebnis.error?.issues.map((i) => i.path[0]), ["soll_stunden"]);
});

test("Leere Toleranz und leerer Urlaub fallen auf die Spalten-Defaults", () => {
  const ergebnis = pruefe("20", "", "");
  assert.equal(ergebnis.success, true);
  assert.equal(ergebnis.data?.toleranz_ueberstunden, 0);
  assert.equal(ergebnis.data?.urlaubsanspruch_tage, 25);
});

test("Negative Werte werden abgewiesen", () => {
  assert.equal(pruefe("-1", "0", "25").success, false);
  assert.equal(pruefe("40", "-1", "25").success, false);
  assert.equal(pruefe("40", "0", "-1").success, false);
});

test("Schon genommene Urlaubstage: leer ist 0, nur ganze, nicht negative Tage", () => {
  const pruefeVorab = (wert: string) => urlaubVorabSchema.safeParse({ urlaub_vorab_tage: wert });
  assert.equal(pruefeVorab("").data?.urlaub_vorab_tage, 0);
  assert.equal(pruefeVorab("12").data?.urlaub_vorab_tage, 12);
  assert.equal(pruefeVorab("-1").success, false);
  assert.equal(pruefeVorab("1.5").success, false);
  assert.equal(pruefeVorab("366").success, false);
});
