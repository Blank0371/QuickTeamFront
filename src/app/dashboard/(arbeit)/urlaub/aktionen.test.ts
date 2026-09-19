import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
let lesenFehler = false;
let geschrieben = false;
let vorhanden = true;
let weitereTage = false;
const antrag = { id: "u", mitarbeiter_id: "m", von: "2026-12-31", bis: "2027-01-01" };
const client = { from: (tabelle: string) => {
  let spalten = "";
  let aenderung = false;
  const query = {
    select: (s: string) => { spalten = s; return query; },
    eq: () => query,
    update: () => { aenderung = true; geschrieben = true; return query; },
    single: async () => tabelle === "mitarbeiter"
      ? { data: lesenFehler ? null : { urlaubsanspruch_tage: 1 }, error: lesenFehler ? { message: "unavailable" } : null }
      : { data: antrag, error: null },
    then: (resolve: (value: unknown) => unknown) => resolve({
      data: aenderung ? (vorhanden ? [{ id: "u" }] : []) :
        spalten.includes("status") && weitereTage ? [{ id: "alt", mitarbeiter_id: "m", von: "2027-02-01", bis: "2027-02-01", status: "approved" }] : [],
      error: null,
    }),
  };
  return query;
} };
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("@/lib/dashboard/zugang", { namedExports: { betreteDashboard: async () => ({ supabase: client, position: { rolleTyp: "chef", betriebId: "b" } }) } });
mock.module("@/i18n/server", { namedExports: { holeValidierung: async () => ({}) } });
const { entscheiden } = await import("./aktionen");
const vorher = { status: "leer" as const, nachricht: null, felder: {} };
function formular(status = "approved") { const f = new FormData(); f.set("urlaub_id", "u"); f.set("status", status); return f; }
beforeEach(() => { lesenFehler = false; geschrieben = false; vorhanden = true; weitereTage = false; });
test("Jahreswechsel verteilt den Antrag auf beide Jahreskontingente", async () => {
  assert.equal((await entscheiden(vorher, formular())).status, "erfolg");
  assert.equal(geschrieben, true);
});
test("Ausgeschöpftes Folgejahr verhindert Genehmigung", async () => {
  weitereTage = true;
  assert.match((await entscheiden(vorher, formular())).nachricht ?? "", /2027/);
  assert.equal(geschrieben, false);
});
test("Lesefehler ist kein freies Kontingent", async () => {
  lesenFehler = true;
  assert.equal((await entscheiden(vorher, formular())).status, "fehler");
  assert.equal(geschrieben, false);
});
test("Zwischenzeitlich entfernter Antrag meldet keinen falschen Erfolg", async () => {
  vorhanden = false;
  assert.equal((await entscheiden(vorher, formular("denied"))).status, "fehler");
});
