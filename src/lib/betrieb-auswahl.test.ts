import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { Position } from "./dashboard/position";

let positionen: Position[] = [];
let gewaehlt: string | null = null;
mock.module("next/navigation", { namedExports: { redirect: (url: string) => { throw new Error(`redirect:${url}`); } } });
mock.module("@/lib/dashboard/position", { namedExports: {
  gewuenschtePositionsId: async () => gewaehlt,
  holePositionen: async () => positionen,
  waehleAktive: (alle: Position[], id: string | null) => alle.find((p) => p.mitarbeiterId === id) ?? (alle.length === 1 ? alle[0] : null),
} });
const { holeChefBetriebId } = await import("./betrieb");
const client = { auth: { getUser: async () => ({ data: { user: { id: "u" } }, error: null }) } } as unknown as Parameters<typeof holeChefBetriebId>[0];
const chef = (id: string): Position => ({ mitarbeiterId: id, betriebId: `betrieb-${id}`, betriebName: id, name: id, rolleTyp: "chef" });

test("Einrichtung und Zahlung beachten die gewählte Chefposition", async () => {
  positionen = [chef("a"), chef("b")]; gewaehlt = "b";
  assert.equal(await holeChefBetriebId(client), "betrieb-b");
});
test("Mehrere Betriebe ohne gültige Auswahl öffnen die Auswahl statt den ersten Betrieb", async () => {
  positionen = [chef("a"), chef("b")]; gewaehlt = "fremd";
  await assert.rejects(holeChefBetriebId(client), /redirect:\/dashboard\/wechseln\?weiter=%2Feinrichtung/);
});
test("Mitarbeiter gelangen nach Login ins Dashboard statt in die Einrichtung", async () => {
  positionen = [{ ...chef("m"), rolleTyp: "mitarbeiter" }]; gewaehlt = null;
  await assert.rejects(holeChefBetriebId(client), /redirect:\/dashboard$/);
});
test("Mitarbeiterposition wird nicht still durch eine andere Chefposition ersetzt", async () => {
  positionen = [chef("a"), { ...chef("m"), rolleTyp: "mitarbeiter" }]; gewaehlt = "m";
  await assert.rejects(holeChefBetriebId(client), /redirect:\/dashboard$/);
});
test("Neues Konto ohne Position kann den Betrieb weiterhin anlegen", async () => {
  positionen = []; gewaehlt = null;
  assert.equal(await holeChefBetriebId(client), null);
});
