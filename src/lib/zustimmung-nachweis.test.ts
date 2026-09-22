import assert from "node:assert/strict";
import { test } from "node:test";
import {
  datenschutzAusMetadaten,
  datenschutzSignupVersionen,
  zustimmungFuerBetrieb,
  zustimmungNachweisAusMetadaten,
  zustimmungAusMetadaten,
} from "./zustimmung";
import { RECHTSTEXT_VERSIONEN } from "./rechtstexte";

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

test("Signup führt nur die Datenschutz-Fassung mit", () => {
  assert.deepEqual(datenschutzSignupVersionen(), {
    datenschutz: RECHTSTEXT_VERSIONEN.datenschutz,
  });
});

test("datenschutzAusMetadaten liest die beim Signup zugestimmte Fassung", () => {
  assert.equal(
    datenschutzAusMetadaten({ zustimmung_versionen: { datenschutz: "2026-01-01-draft" } }),
    "2026-01-01-draft",
  );
  assert.equal(datenschutzAusMetadaten({ zustimmung_versionen: {} }), null);
  assert.equal(datenschutzAusMetadaten(null), null);
});

test("zustimmungFuerBetrieb nimmt AGB/AVV aktuell und Datenschutz aus dem Signup", () => {
  const versionen = zustimmungFuerBetrieb({
    zustimmung_versionen: { datenschutz: "2026-01-01-draft" },
  });
  assert.equal(versionen.agb, RECHTSTEXT_VERSIONEN.agb);
  assert.equal(versionen.avv, RECHTSTEXT_VERSIONEN.avv);
  // Die beim Konto zugestimmte Fassung, nicht die heute geltende.
  assert.equal(versionen.datenschutz, "2026-01-01-draft");
});

test("zustimmungFuerBetrieb fällt ohne Signup-Fassung auf die geltende zurück", () => {
  const versionen = zustimmungFuerBetrieb(null);
  assert.equal(versionen.datenschutz, RECHTSTEXT_VERSIONEN.datenschutz);
});
