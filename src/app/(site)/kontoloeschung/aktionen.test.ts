import assert from "node:assert/strict";
import { mock, test, beforeEach } from "node:test";
import type { Position } from "@/lib/dashboard/position";

let positionen: Position[] = [];
let aufrufe: string[] = [];
let aboFehler = false;
let loeschFehler = false;
let kuendigungsFehler = false;
const client = {
  auth: {
    getUser: async () => ({ data: { user: { id: "u", email: "test@example.invalid" } } }),
    signOut: async () => { aufrufe.push("signOut"); },
  },
  rpc: async (name: string) => {
    aufrufe.push(name);
    return { error: loeschFehler ? { message: "CHEF_MIT_MITGLIEDERN" } : null };
  },
};
mock.module("next/navigation", { namedExports: { redirect: (url: string) => { throw new Error(`redirect:${url}`); } } });
mock.module("@/lib/supabase/server", { namedExports: { createClient: async () => client } });
mock.module("@/lib/dashboard/position", { namedExports: {
  holePositionen: async () => positionen,
  loescheAktivePosition: async () => { aufrufe.push("cookieLoeschen"); },
} });
mock.module("@/lib/abo", { namedExports: { holeAbo: async (_: unknown, id: string) => {
  aufrufe.push(`pruefe:${id}`);
  return aboFehler ? null : { stripe_customer_id: `kunde-${id}` };
} } });
mock.module("@/lib/stripe", { namedExports: {
  holeAboFuerBetrieb: async ({ betriebId }: { betriebId: string }) => ({ id: `abo-${betriebId}` }),
  kuendigeAbo: async (id: string) => { aufrufe.push(`kuendige:${id}`); if (kuendigungsFehler) throw new Error("Stripe nicht erreichbar"); },
} });
const { kontoLoeschen } = await import("./aktionen");
const chef = (id: string): Position => ({ mitarbeiterId: id, betriebId: id, betriebName: id, name: id, rolleTyp: "chef" });
const vorher = { status: "leer" as const, nachricht: null, felder: {} };
function formular(bestaetigung = "a") {
  const f = new FormData(); f.set("bestaetigung", bestaetigung); f.set("erwartet", bestaetigung); return f;
}
beforeEach(() => { positionen = [chef("a"), chef("b")]; aufrufe = []; aboFehler = false; loeschFehler = false; kuendigungsFehler = false; });

test("Alle geleiteten Betriebe prüfen und erst nach erfolgreicher Löschung kündigen", async () => {
  positionen.push({ ...chef("a"), mitarbeiterId: "a2" });
  await assert.rejects(kontoLoeschen(vorher, formular()), /redirect:\/\?geloescht=1/);
  assert.deepEqual(aufrufe, ["pruefe:a", "pruefe:b", "konto_selbst_loeschen", "kuendige:abo-a", "kuendige:abo-b", "cookieLoeschen", "signOut"]);
});
test("Manipuliertes Bestätigungswort aus hidden input autorisiert keine Löschung", async () => {
  assert.equal((await kontoLoeschen(vorher, formular("falsch"))).status, "fehler");
  assert.deepEqual(aufrufe, []);
});
test("Unlesbarer Abostatus verhindert irreversible Kontolöschung", async () => {
  aboFehler = true;
  assert.equal((await kontoLoeschen(vorher, formular())).status, "fehler");
  assert.deepEqual(aufrufe, ["pruefe:a"]);
});
test("Verweigerte Kontolöschung kündigt keine laufenden Abonnements", async () => {
  loeschFehler = true;
  assert.equal((await kontoLoeschen(vorher, formular())).status, "fehler");
  assert.deepEqual(aufrufe, ["pruefe:a", "pruefe:b", "konto_selbst_loeschen"]);
});
test("Reines Mitarbeiterkonto braucht keine Aboverwaltung", async () => {
  positionen = [{ ...chef("a"), rolleTyp: "mitarbeiter" }];
  await assert.rejects(kontoLoeschen(vorher, formular("test@example.invalid")), /redirect:/);
  assert.deepEqual(aufrufe, ["konto_selbst_loeschen", "cookieLoeschen", "signOut"]);
});

test("Fehlgeschlagene Kündigung meldet offenen Handlungsbedarf und versucht weitere Abos", async () => {
  kuendigungsFehler = true;
  await assert.rejects(kontoLoeschen(vorher, formular()), /abo-kuendigung-offen/);
  assert.ok(aufrufe.includes("kuendige:abo-b"));
  assert.ok(aufrufe.includes("signOut"));
});
