import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ermittleVertragsLage,
  pausiertSeit,
  vertragsEndeFuerLoeschung,
  type AboZeiten,
} from "@/lib/abo-ende";

/**
 * Vertragsende — die Grundlage jeder Löschfrist.
 *
 * Der Entwurf der Löschmigration rechnete auf `aktualisiert_am`
 * („zuletzt vom Webhook gesehen"). Diese Tests halten fest, was
 * stattdessen gilt — und vor allem, **wann nicht gelöscht werden darf**.
 */

const SEK = (iso: string) => Math.floor(Date.parse(iso) / 1000);

const LAEUFT: AboZeiten = { status: "active" };

describe("ermittleVertragsLage", () => {
  it("erkennt ein laufendes Abo", () => {
    assert.deepEqual(ermittleVertragsLage(LAEUFT), { art: "laeuft" });
  });

  it("unterscheidet vorgemerkte Kündigung von Beendigung", () => {
    /*
     * Der Fall, an dem sich alles entscheidet: der Kunde hat heute
     * gekündigt, der Vertrag läuft bis zum Periodenende weiter. Wer die
     * Löschfrist ab jetzt zählt, löscht mitten im bezahlten Zeitraum.
     */
    const lage = ermittleVertragsLage({
      status: "active",
      cancel_at_period_end: true,
      canceled_at: SEK("2026-09-14T10:00:00Z"),
      periode_ende: SEK("2026-10-01T00:00:00Z"),
    });

    assert.equal(lage.art, "kuendigung-vorgemerkt");
    if (lage.art !== "kuendigung-vorgemerkt") return;
    assert.equal(lage.wirksamAm?.toISOString(), "2026-10-01T00:00:00.000Z");
  });

  it("nimmt `cancel_at` vor dem Periodenende", () => {
    const lage = ermittleVertragsLage({
      status: "active",
      cancel_at: SEK("2026-09-30T00:00:00Z"),
      periode_ende: SEK("2026-10-01T00:00:00Z"),
    });
    assert.equal(lage.art, "kuendigung-vorgemerkt");
    if (lage.art !== "kuendigung-vorgemerkt") return;
    assert.equal(lage.wirksamAm?.toISOString(), "2026-09-30T00:00:00.000Z");
  });

  it("erkennt ein beendetes Abo an `ended_at`", () => {
    const lage = ermittleVertragsLage({
      status: "canceled",
      ended_at: SEK("2026-10-01T00:00:00Z"),
      canceled_at: SEK("2026-09-14T10:00:00Z"),
    });
    assert.equal(lage.art, "beendet");
    if (lage.art !== "beendet") return;
    assert.equal(lage.beendetAm.toISOString(), "2026-10-01T00:00:00.000Z");
  });

  it("lässt `ended_at` eine noch stehende Vormerkung überstimmen", () => {
    // Stripe lässt `cancel_at_period_end` nach dem Ende stehen. Wer die
    // Vormerkung zuerst prüft, hält einen beendeten Vertrag für laufend.
    const lage = ermittleVertragsLage({
      status: "canceled",
      cancel_at_period_end: true,
      ended_at: SEK("2026-10-01T00:00:00Z"),
    });
    assert.equal(lage.art, "beendet");
  });

  it("behandelt ein pausiertes Testabo als eigene Lage", () => {
    const lage = ermittleVertragsLage({
      status: "paused",
      trial_end: SEK("2026-09-01T00:00:00Z"),
    });
    assert.equal(lage.art, "pausiert");
    if (lage.art !== "pausiert") return;
    assert.equal(lage.seit?.toISOString(), "2026-09-01T00:00:00.000Z");
  });

  it("hält ein pausiertes Abo nicht für gekündigt", () => {
    // Andere Frist (AGB § 5 Abs. 3), anderer Ausgang: aus `pausiert`
    // führt das Nachreichen einer Karte heraus.
    const lage = ermittleVertragsLage({
      status: "paused",
      cancel_at_period_end: true,
    });
    assert.equal(lage.art, "pausiert");
  });
});

describe("vertragsEndeFuerLoeschung", () => {
  it("gibt für ein laufendes Abo nichts zurück", () => {
    assert.equal(vertragsEndeFuerLoeschung(LAEUFT), null);
  });

  it("gibt für eine vorgemerkte Kündigung nichts zurück", () => {
    // Der wichtigste Test dieser Datei: hier wird NICHT gelöscht.
    assert.equal(
      vertragsEndeFuerLoeschung({
        status: "active",
        cancel_at_period_end: true,
        periode_ende: SEK("2026-10-01T00:00:00Z"),
      }),
      null,
    );
  });

  it("gibt für ein pausiertes Testabo nichts zurück", () => {
    // Dafür gibt es `pausiertSeit()` und eine eigene Frist.
    assert.equal(
      vertragsEndeFuerLoeschung({ status: "paused", trial_end: SEK("2026-09-01T00:00:00Z") }),
      null,
    );
  });

  it("gibt das Ende eines beendeten Abos zurück", () => {
    const ende = vertragsEndeFuerLoeschung({
      status: "canceled",
      ended_at: SEK("2026-10-01T00:00:00Z"),
    });
    assert.equal(ende?.toISOString(), "2026-10-01T00:00:00.000Z");
  });

  it("erfindet kein Datum, wenn keines belegt ist", () => {
    /*
     * `canceled` ohne jeden Zeitstempel. Ein Löschjob, der hier `now()`
     * einsetzt, löscht sofort — obwohl niemand weiss, wann der Vertrag
     * endete. `null` heisst „nicht löschen", nicht „heute".
     */
    assert.equal(vertragsEndeFuerLoeschung({ status: "canceled" }), null);
  });
});

describe("pausiertSeit", () => {
  it("liefert nur für pausierte Abos ein Datum", () => {
    assert.equal(pausiertSeit(LAEUFT), null);
    assert.equal(pausiertSeit({ status: "canceled", ended_at: SEK("2026-10-01T00:00:00Z") }), null);
    assert.equal(
      pausiertSeit({ status: "paused", trial_end: SEK("2026-09-01T00:00:00Z") })?.toISOString(),
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("erfindet kein Datum, wenn `trial_end` fehlt", () => {
    assert.equal(pausiertSeit({ status: "paused" }), null);
  });
});
