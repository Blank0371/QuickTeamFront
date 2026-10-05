import assert from "node:assert/strict";
import test from "node:test";
import { jahrImBetrieb } from "@/lib/datum";
import { genehmigteTageOhne, genommeneTage, tageDiff, tageImJahr, verbrauchteTage, vorabAusGesamt, vorabFuer } from "./urlaub";

test("Urlaub zählt Kalendertage auch über Sommerzeit hinweg", () => {
  const vorher = process.env.TZ;
  try {
    process.env.TZ = "Europe/Berlin";
    assert.equal(tageDiff("2026-03-28", "2026-03-30"), 3);
    assert.equal(tageDiff("2026-10-24", "2026-10-26"), 3);
    assert.equal(tageDiff("2026-03-30", "2026-03-30"), 1);
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
});

test("Jahresübergreifender Urlaub belastet jedes Jahr nur mit seinen Tagen", () => {
  assert.equal(tageImJahr("2026-12-30", "2027-01-03", 2026), 2);
  assert.equal(tageImJahr("2026-12-30", "2027-01-03", 2027), 3);
  assert.equal(tageImJahr("2026-12-30", "2027-01-03", 2028), 0);
  const antrag = { id: "a", mitarbeiterId: "m", von: "2026-12-30", bis: "2027-01-03", status: "approved" as const, kommentar: null, begruendung: null };
  assert.equal(genehmigteTageOhne([antrag], "m", undefined, 2027), 3);
  assert.equal(genehmigteTageOhne([antrag], "m", "a", 2027), 0);
  assert.equal(genehmigteTageOhne([antrag], "andere", undefined, 2027), 0);
  assert.equal(verbrauchteTage([antrag], 2027), 3);
});

test("Genommen = Vorab + offene + genehmigte Anträge; Ablehnen nimmt heraus, Genehmigen nicht", () => {
  const urlaube = [
    { von: "2026-03-02", bis: "2026-03-04", status: "requested" as const },
    { von: "2026-05-04", bis: "2026-05-05", status: "approved" as const },
    { von: "2026-07-01", bis: "2026-07-10", status: "denied" as const },
  ];
  assert.equal(genommeneTage(4, urlaube, 2026), 4 + 3 + 2);
  const abgelehnt = urlaube.map((u) => (u.status === "requested" ? { ...u, status: "denied" as const } : u));
  assert.equal(genommeneTage(4, abgelehnt, 2026), 4 + 2);
  const genehmigt = urlaube.map((u) => (u.status === "requested" ? { ...u, status: "approved" as const } : u));
  assert.equal(genommeneTage(4, genehmigt, 2026), 4 + 3 + 2);
});

test("Vorab-Zeilen zählen nur für ihre Person und ihr Jahr", () => {
  const zeilen = [
    { mitarbeiter_id: "m", jahr: 2026, tage: 5 },
    { mitarbeiter_id: "m", jahr: 2025, tage: 9 },
    { mitarbeiter_id: "x", jahr: 2026, tage: 7 },
  ];
  assert.equal(vorabFuer(zeilen, "m", 2026), 5);
  assert.equal(vorabFuer(zeilen, "m", 2027), 0);
  assert.equal(vorabFuer(zeilen, "y", 2026), 0);
});

test("Profil-Gesamtzahl wird zum Vorab-Wert, nie unter die erfassten Anträge", () => {
  assert.deepEqual(vorabAusGesamt(10, 3), { ok: true, vorab: 7 });
  assert.deepEqual(vorabAusGesamt(3, 3), { ok: true, vorab: 0 });
  assert.deepEqual(vorabAusGesamt(2, 3), { ok: false, mindestens: 3 });
});

test("Das neue Urlaubsjahr beginnt um Mitternacht Betriebszeit, nicht UTC", () => {
  assert.equal(jahrImBetrieb(new Date("2026-12-31T22:30:00Z")), 2026);
  assert.equal(jahrImBetrieb(new Date("2026-12-31T23:30:00Z")), 2027);
});
