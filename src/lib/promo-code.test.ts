import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { promoCodeAusMetadaten, pruefePromoCode, schreibePromoCode } from "@/lib/promo-code";
import { feldSchemata, PROMO_CODE_MAX } from "@/lib/validierung";

/**
 * Die Schreibweise entscheidet über die Auswertung: gezählt wird je
 * `promo_code`, und „partner10" neben „PARTNER10" wären zwei Partner.
 * Ausserdem muss alles, was hier durchgeht, den CHECK der Tabelle
 * bestehen — sonst scheitert das Schreiben still im Serverprotokoll.
 */

const DB_CHECK = new RegExp(`^[A-Z0-9_-]{1,${PROMO_CODE_MAX}}$`, "u");

describe("feldSchemata.promo_code", () => {
  it("normalisiert Leerraum und Kleinschreibung", () => {
    assert.equal(feldSchemata.promo_code.parse("  partner 10 "), "PARTNER10");
    assert.equal(feldSchemata.promo_code.parse("Sommer_2026-a"), "SOMMER_2026-A");
  });

  it("lässt ein leeres Feld zu — der Code ist freiwillig", () => {
    assert.equal(feldSchemata.promo_code.parse(""), "");
    assert.equal(feldSchemata.promo_code.parse("   "), "");
  });

  it("weist Sonderzeichen und Überlänge ab", () => {
    assert.equal(feldSchemata.promo_code.safeParse("PARTNER!").success, false);
    assert.equal(feldSchemata.promo_code.safeParse("ÄRZTE").success, false);
    assert.equal(feldSchemata.promo_code.safeParse("A".repeat(PROMO_CODE_MAX + 1)).success, false);
  });

  it("liefert nur Werte, die den CHECK der Datenbank bestehen", () => {
    for (const roh of ["partner10", " a b c ", "x-y_z", "A".repeat(PROMO_CODE_MAX)]) {
      assert.match(feldSchemata.promo_code.parse(roh), DB_CHECK);
    }
  });
});

describe("promoCodeAusMetadaten", () => {
  it("liest und normalisiert den Code", () => {
    assert.equal(promoCodeAusMetadaten({ promo_code: "partner10" }), "PARTNER10");
  });

  it("gibt null ohne Code, bei leerem und bei ungültigem Code", () => {
    assert.equal(promoCodeAusMetadaten({}), null);
    assert.equal(promoCodeAusMetadaten(null), null);
    assert.equal(promoCodeAusMetadaten({ promo_code: "" }), null);
    assert.equal(promoCodeAusMetadaten({ promo_code: 42 }), null);
    assert.equal(promoCodeAusMetadaten({ promo_code: "<script>" }), null);
  });
});

describe("pruefePromoCode", () => {
  function klient(antwort: { data: unknown; error: { message: string } | null }) {
    const aufrufe: { fn: string; args: unknown }[] = [];
    const supabase = {
      rpc(fn: string, args: unknown) {
        aufrufe.push({ fn, args });
        return Promise.resolve(antwort);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { supabase, aufrufe };
  }

  function stumm<T>(lauf: () => Promise<T>): Promise<T> {
    const original = console.error;
    console.error = () => {};
    return lauf().finally(() => {
      console.error = original;
    });
  }

  it("fragt die RPC und nicht die Tabelle", async () => {
    const { supabase, aufrufe } = klient({ data: true, error: null });
    assert.equal(await pruefePromoCode(supabase, "PARTNER10"), "gueltig");
    assert.deepEqual(aufrufe, [{ fn: "promo_code_gueltig", args: { p_code: "PARTNER10" } }]);
  });

  it("meldet einen unbekannten oder abgeschalteten Code", async () => {
    const { supabase } = klient({ data: false, error: null });
    assert.equal(await pruefePromoCode(supabase, "TIPPFEHLER"), "unbekannt");
  });

  it("sperrt bei einem Abfragefehler nicht — das Feld ist freiwillig", async () => {
    const { supabase } = klient({ data: null, error: { message: "timeout" } });
    assert.equal(await stumm(() => pruefePromoCode(supabase, "PARTNER10")), "nicht-pruefbar");
  });

  it("wertet eine Antwort ohne Boolean nicht als gültig", async () => {
    const { supabase } = klient({ data: null, error: null });
    assert.equal(await stumm(() => pruefePromoCode(supabase, "PARTNER10")), "nicht-pruefbar");
  });
});

describe("schreibePromoCode", () => {
  function klient(fehler?: string) {
    const aufrufe: { tabelle: string; zeile: unknown; optionen: unknown }[] = [];
    const supabase = {
      from(tabelle: string) {
        return {
          upsert(zeile: unknown, optionen: unknown) {
            aufrufe.push({ tabelle, zeile, optionen });
            return Promise.resolve({ error: fehler ? { message: fehler } : null });
          },
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { supabase, aufrufe };
  }

  it("schreibt eine Zeile je Betrieb und ignoriert Wiederholungen", async () => {
    const { supabase, aufrufe } = klient();
    const ergebnis = await schreibePromoCode(supabase, "b-1", "PARTNER10");

    assert.deepEqual(ergebnis, { art: "ok" });
    assert.deepEqual(aufrufe, [
      {
        tabelle: "betrieb_promo_codes",
        zeile: { betrieb_id: "b-1", promo_code: "PARTNER10" },
        optionen: { onConflict: "betrieb_id", ignoreDuplicates: true },
      },
    ]);
  });

  it("meldet einen Fehler zurück, statt zu werfen", async () => {
    const { supabase } = klient("permission denied");
    const original = console.error;
    console.error = () => {};
    try {
      assert.deepEqual(await schreibePromoCode(supabase, "b-1", "PARTNER10"), {
        art: "fehler",
        grund: "permission denied",
      });
    } finally {
      console.error = original;
    }
  });
});
