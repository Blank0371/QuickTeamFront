import assert from "node:assert/strict";
import { test } from "node:test";
import { zustimmungNachweisAusMetadaten, zustimmungAusMetadaten } from "./zustimmung";

test("Bestätigung behält Sprache und Prüfsummen der Registrierung bei", () => {
  const hashes = { agb: "a".repeat(64), avv: "b".repeat(64), datenschutz: "c".repeat(64) };
  const metadaten = {
    zustimmung_versionen: { agb: "alt", avv: "alt", datenschutz: "alt" },
    zustimmung_nachweis: { sprache: "en", hashes },
  };
  assert.deepEqual(zustimmungNachweisAusMetadaten(metadaten), { sprache: "en", hashes });
  assert.equal(zustimmungAusMetadaten(metadaten)?.agb, "alt");
});

test("Alten Registrierungen werden keine heutigen Nachweisdaten untergeschoben", () => {
  assert.deepEqual(zustimmungNachweisAusMetadaten({ zustimmung_versionen: { agb: "alt" } }), {});
  assert.deepEqual(zustimmungNachweisAusMetadaten(null), {});
  assert.deepEqual(zustimmungNachweisAusMetadaten({ zustimmung_nachweis: { sprache: "xx", hashes: { agb: "kein Hash" } } }), { hashes: {} });
});
