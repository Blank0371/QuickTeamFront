import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aboSperre, mussStripeFragen, type Abo } from "@/lib/abo";

function zeile(status: string, subscriptionId: string | null = "sub_1"): Abo {
  return {
    betrieb_id: "b1",
    plan: "basic",
    status,
    stripe_customer_id: "cus_1",
    stripe_subscription_id: subscriptionId,
    aktualisiert_am: "2026-09-28T00:00:00Z",
  };
}

describe("mussStripeFragen", () => {
  it("fragt bei pausiert und gekündigt", () => {
    assert.equal(mussStripeFragen(zeile("pausiert"), { auchOhneSubscription: false }), true);
    assert.equal(mussStripeFragen(zeile("gekuendigt"), { auchOhneSubscription: false }), true);
  });

  it("fragt bei laufendem Abo nicht", () => {
    assert.equal(mussStripeFragen(zeile("aktiv"), { auchOhneSubscription: true }), false);
    assert.equal(mussStripeFragen(zeile("trial"), { auchOhneSubscription: false }), false);
  });

  it("fragt ohne Subscription-ID nur, wenn der Aufrufer es verlangt", () => {
    assert.equal(mussStripeFragen(zeile("trial", null), { auchOhneSubscription: true }), true);
    assert.equal(mussStripeFragen(null, { auchOhneSubscription: true }), true);
    assert.equal(mussStripeFragen(zeile("trial", null), { auchOhneSubscription: false }), false);
    assert.equal(mussStripeFragen(null, { auchOhneSubscription: false }), false);
  });
});

describe("aboSperre", () => {
  it("lässt durch, was bei Stripe läuft — auch wenn die Zeile noch pausiert sagt", () => {
    assert.equal(aboSperre(zeile("pausiert"), "laeuft"), "frei");
    assert.equal(aboSperre(zeile("gekuendigt"), "laeuft"), "frei");
  });

  it("schickt auf die Sperrseite, wer bei Stripe pausiert ist", () => {
    assert.equal(aboSperre(zeile("aktiv"), "pausiert"), "sperrseite");
    assert.equal(aboSperre(zeile("gekuendigt"), "pausiert"), "sperrseite");
  });

  it("öffnet die Sperre nicht, wenn Stripe nicht antwortet", () => {
    assert.equal(aboSperre(zeile("pausiert"), "unbekannt"), "sperrseite");
    assert.equal(aboSperre(zeile("gekuendigt"), "unbekannt"), "zahlung");
    assert.equal(aboSperre(null, "unbekannt"), "zahlung");
  });

  it("führt ohne lebendes oder bezahltes Abo in den Zahlungsschritt", () => {
    assert.equal(aboSperre(zeile("gekuendigt"), "kein-abo"), "zahlung");
    assert.equal(aboSperre(zeile("gekuendigt"), "unbezahlt"), "zahlung");
    assert.equal(aboSperre(null, "kein-abo"), "zahlung");
  });
});
