import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

/**
 * Rechnungsland ≠ Betriebsland.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum dieser Test wichtiger ist, als er aussieht
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betriebe.land` steuert die **Arbeitszeitprüfung**. Am 2026-09-14 im
 * Katalog erhoben, welche Datenbankfunktionen ihn lesen:
 * `pruefe_zuweisung_regeln` (Höchstarbeitszeit, Ruhezeit, Pausen),
 * `netto_arbeitszeit_stunden` (Pausenabzug) und `registriere_betrieb`
 * (setzt ihn einmalig).
 *
 * Eine Fassung dieses Codes vom selben Tag schrieb ein geändertes
 * Rechnungsland dorthin durch. Damit hätte die Korrektur einer
 * Rechnungsanschrift — etwa auf den Sitz des Steuerberaters — die
 * arbeitsrechtliche Bewertung jeder Schicht des Betriebs verschoben.
 * Unsichtbar, wirksam, und zu Lasten Dritter: der Beschäftigten.
 *
 * Ein Test, der das festhält, ist deshalb kein Formalismus. Er ist die
 * einzige Stelle, an der jemand, der die Kopplung „zur Konsistenz"
 * wieder einführt, gestoppt wird.
 *
 * Geprüft wird über die **Modulgrenze**: `speichereRechnungsangaben`
 * bekommt gar keinen Supabase-Client mehr. Der Test belegt das an der
 * Signatur und daran, dass ausschliesslich der Stripe-Weg benutzt wird.
 */

type Aufruf = { kundeId: string; profil: Record<string, unknown> };

const aufrufe: Aufruf[] = [];

/*
 * `mock.module` statt einer echten Attrappe: `rechnung.ts` importiert
 * `@/lib/stripe`, und das Modul zöge das Stripe-SDK und über
 * `soft-launch-riegel.ts` auch `next/navigation` herein — beides ist im
 * Unit-Test nicht lauffähig (`scripts/test-loader.mjs` erklärt die
 * Grenze). Ersetzt wird deshalb das Modul, nicht der Aufruf.
 */
mock.module("@/lib/stripe", {
  namedExports: {
    speichereRechnungAmKunden: async (kundeId: string, profil: Record<string, unknown>) => {
      aufrufe.push({ kundeId, profil });
    },
    holeRechnungsProfil: async () => null,
  },
});

const { holeVorbelegung, speichereRechnungsangaben } = await import("@/lib/rechnung");

const PROFIL = {
  firma: "Huber Gastro GmbH",
  strasse: "Marktstraße 12",
  plz: "10115",
  ort: "Berlin",
  land: "DE" as const,
  uid: "",
};

describe("speichereRechnungsangaben", () => {
  it("nimmt keinen Datenbank-Client entgegen", () => {
    /*
     * Die Signatur ist die Garantie. Eine Funktion ohne Supabase-Client
     * kann `betriebe` nicht ändern — das ist stärker als jede Zusicherung
     * im Kommentar und hält auch dann, wenn jemand den Kommentar
     * überschreibt.
     */
    assert.equal(
      speichereRechnungsangaben.length,
      2,
      "erwartet genau (kundeId, profil) — ein dritter Parameter wäre der Rückweg zu betriebe.land",
    );
  });

  it("schreibt ausschliesslich an den Stripe-Kunden", async () => {
    aufrufe.length = 0;
    await speichereRechnungsangaben("cus_123", PROFIL);

    assert.equal(aufrufe.length, 1);
    assert.equal(aufrufe[0]?.kundeId, "cus_123");
    assert.equal(aufrufe[0]?.profil["land"], "DE");
  });

  it("ändert das Betriebsland auch dann nicht, wenn es abweicht", async () => {
    // Der eigentliche Regressionsfall: Betrieb steht in Österreich, die
    // Rechnung geht nach Deutschland. Vorher hätte das `betriebe.land`
    // auf `DE` gesetzt und damit die Arbeitszeitregeln umgestellt.
    aufrufe.length = 0;
    await speichereRechnungsangaben("cus_at_betrieb", PROFIL);

    assert.equal(aufrufe.length, 1, "genau ein Schreibvorgang — der an Stripe");
    assert.equal(
      aufrufe[0]?.profil["land"],
      "DE",
      "das Rechnungsland geht an Stripe …",
    );
    // … und nirgendwo sonst hin: es gibt keinen zweiten Aufruf und keinen
    // Client, über den einer laufen könnte.
  });
});

describe("holeVorbelegung", () => {
  it("nimmt Betriebsname und -land nur, solange es keine Anschrift gibt", async () => {
    const vor = await holeVorbelegung("Café am Markt", "AT", null);

    assert.equal(vor.rechnung_firma, "Café am Markt", "Vorschlag, nicht Gleichsetzung");
    assert.equal(vor.land, "AT");
    assert.equal(vor.rechnung_strasse, "");
  });

  it("kommt ohne Betrieb und ohne Kunden mit leeren Feldern zurecht", async () => {
    const vor = await holeVorbelegung(null, null, null);
    assert.deepEqual(vor, {
      rechnung_firma: "",
      rechnung_strasse: "",
      rechnung_plz: "",
      rechnung_ort: "",
      land: "",
      uid: "",
    });
  });
});
