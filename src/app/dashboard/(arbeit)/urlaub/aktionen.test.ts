import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { de } from "@/i18n/de";
let lesenFehler = false;
let geschrieben = false;
let vorhanden = true;
let weitereTage = false;
let vorabZeilen: { mitarbeiter_id: string; jahr: number; tage: number }[] = [];
let vorabFehler = false;
let antrag: { id: string; mitarbeiter_id: string; von: string; bis: string; angerechnete_tage?: number | null } =
  { id: "u", mitarbeiter_id: "m", von: "2026-12-31", bis: "2027-01-01" };
let geschriebeneAenderung: Record<string, unknown> | null = null;
const client = { from: (tabelle: string) => {
  let spalten = "";
  let aenderung = false;
  const query = {
    select: (s: string) => { spalten = s; return query; },
    eq: () => query,
    in: () => query,
    update: (werte: Record<string, unknown>) => { aenderung = true; geschrieben = true; geschriebeneAenderung = werte; return query; },
    single: async () => tabelle === "mitarbeiter"
      ? { data: lesenFehler ? null : { urlaubsanspruch_tage: 1 }, error: lesenFehler ? { message: "unavailable" } : null }
      : { data: antrag, error: null },
    then: (resolve: (value: unknown) => unknown) => resolve(tabelle === "urlaub_vorab" ? {
      data: vorabFehler ? null : vorabZeilen,
      error: vorabFehler ? { message: "unavailable" } : null,
    } : {
      data: aenderung ? (vorhanden ? [{ id: "u" }] : []) :
        spalten.includes("status") && weitereTage ? [{ id: "alt", mitarbeiter_id: "m", von: "2027-02-01", bis: "2027-02-01", status: "approved" }] : [],
      error: null,
    }),
  };
  return query;
} };
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("@/lib/dashboard/zugang", { namedExports: { betreteDashboard: async () => ({ supabase: client, position: { rolleTyp: "chef", betriebId: "b" } }) } });
mock.module("@/i18n/server", { namedExports: { holeTexte: async () => de, holeValidierung: async () => ({}) } });
const { entscheiden } = await import("./aktionen");
const vorher = { status: "leer" as const, nachricht: null, felder: {} };
function formular(status = "approved", angerechnet?: string) {
  const f = new FormData(); f.set("urlaub_id", "u"); f.set("status", status);
  if (angerechnet !== undefined) f.set("angerechnete_tage", angerechnet);
  return f;
}
beforeEach(() => {
  lesenFehler = false; geschrieben = false; vorhanden = true; weitereTage = false;
  vorabZeilen = []; vorabFehler = false; geschriebeneAenderung = null;
  antrag = { id: "u", mitarbeiter_id: "m", von: "2026-12-31", bis: "2027-01-01" };
});
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
test("Vorab-Tage belegen das Kontingent ihres Jahres", async () => {
  antrag = { id: "u", mitarbeiter_id: "m", von: "2026-06-01", bis: "2026-06-01" };
  vorabZeilen = [{ mitarbeiter_id: "m", jahr: 2026, tage: 1 }];
  assert.match((await entscheiden(vorher, formular())).nachricht ?? "", /2026/);
  assert.equal(geschrieben, false);
});
test("Vorab-Tage eines anderen Jahres belegen nichts", async () => {
  antrag = { id: "u", mitarbeiter_id: "m", von: "2026-06-01", bis: "2026-06-01" };
  vorabZeilen = [{ mitarbeiter_id: "m", jahr: 2025, tage: 1 }];
  assert.equal((await entscheiden(vorher, formular())).status, "erfolg");
});
test("Nicht lesbare Vorab-Tage sind kein freies Kontingent", async () => {
  vorabFehler = true;
  assert.equal((await entscheiden(vorher, formular())).status, "fehler");
  assert.equal(geschrieben, false);
});
test("Angerechnete Tage senken die Kontingentlast und werden mitgeschrieben", async () => {
  // Zwei Kalendertage, Anspruch 1: nur mit einem angerechneten Tag genehmigbar.
  antrag = { id: "u", mitarbeiter_id: "m", von: "2026-06-06", bis: "2026-06-07" };
  assert.equal((await entscheiden(vorher, formular("approved"))).status, "fehler");
  assert.equal((await entscheiden(vorher, formular("approved", "1"))).status, "erfolg");
  assert.equal(geschriebeneAenderung?.angerechnete_tage, 1);
});
test("Mehr angerechnete als beantragte Tage sind ein Feldfehler der Zeile", async () => {
  antrag = { id: "u", mitarbeiter_id: "m", von: "2026-06-06", bis: "2026-06-07" };
  const ergebnis = await entscheiden(vorher, formular("approved", "3"));
  assert.equal(ergebnis.status, "fehler");
  assert.ok(ergebnis.felder.angerechneteTage);
  assert.equal(ergebnis.werte?.urlaub_id, "u");
  assert.equal(geschrieben, false);
});
test("Ablehnen schreibt keine angerechneten Tage", async () => {
  await entscheiden(vorher, formular("denied", "1"));
  assert.equal(geschriebeneAenderung && "angerechnete_tage" in geschriebeneAenderung, false);
});
