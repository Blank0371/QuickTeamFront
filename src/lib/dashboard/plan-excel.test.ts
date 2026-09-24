import assert from "node:assert/strict";
import test from "node:test";

import { de } from "@/i18n/de";

import type { KalenderSchicht } from "./kalender";
import { planArbeitsmappe, stunden } from "./plan-excel";
import { leseZeitraum } from "./plan-export";

function schicht(teil: Partial<KalenderSchicht> & { datum: string }): KalenderSchicht {
  return {
    id: teil.datum + (teil.start_zeit ?? ""),
    status: "veroeffentlicht",
    start_zeit: "06:00:00",
    end_zeit: "14:00:00",
    label: "Früh",
    kommentar: null,
    mine: false,
    can_edit: true,
    canceled: false,
    open: false,
    swap_wanted: false,
    understaffed: false,
    notiz_anzahl: 0,
    participants: [],
    ...teil,
  };
}

const kontext = {
  t: de.planExport,
  locale: "de",
  betriebName: "Test",
  jetzt: new Date(Date.UTC(2026, 8, 24, 10, 0)),
  zeitraumTitel: "KW 39",
  wochentageKurz: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  wochentageLang: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
  monatKurz: () => "Sep",
  datumKurz: (d: string) => d.slice(8),
  wochentagLang: () => "Montag",
};

test("Stunden: Nachtschicht über Mitternacht, abgemeldet zählt null", () => {
  assert.equal(stunden("09:00", "17:00", false), 8);
  assert.equal(stunden("22:00", "06:00", false), 8);
  assert.equal(stunden("17:00", "02:00", false), 9);
  assert.equal(stunden("09:00", "17:00", true), 0);
});

test("Liste: eine Zeile je Zuweisung, unbesetzte Schicht bleibt, Werte sind Zahlen", () => {
  const proTag = new Map([
    [
      "2026-09-21",
      [
        schicht({
          datum: "2026-09-21",
          participants: [
            { name: "Anna", role_name: "Service", attendet: true, is_me: false },
            { name: "Ben", role_name: "Küche", attendet: false, is_me: false },
          ],
        }),
        schicht({ datum: "2026-09-21", label: "Spät", start_zeit: "14:00:00", end_zeit: "22:00:00" }),
      ],
    ],
  ]);

  const [kalender, plan, liste] = planArbeitsmappe(
    leseZeitraum({ woche: "2026-09-21" }, new Date()),
    proTag,
    kontext,
  );

  assert.equal(liste!.zeilen.length, 4); // Kopf + Anna + Ben + unbesetzt
  const anna = liste!.zeilen[1]!.zellen;
  assert.equal(typeof anna[0]!.wert, "number"); // Datum als Excel-Wert
  assert.equal(anna[4]!.wert, 0.25); // 06:00
  assert.equal(anna[6]!.wert, 8); // Stunden
  assert.equal(anna[11]!.wert, "nein"); // nicht abgemeldet

  const ben = liste!.zeilen[2]!.zellen;
  assert.equal(ben[6]!.wert, 0);
  assert.equal(ben[11]!.wert, "ja");

  const leer = liste!.zeilen[3]!.zellen;
  assert.equal(leer[9]!.wert, de.planExport.tabellenKopf.unbesetzt);

  assert.equal(liste!.fixierteZeilen, 1);
  assert.equal(liste!.filter, true);
  assert.deepEqual([kalender!.name, plan!.name, liste!.name], ["Kalender", "Schichtplan", "Liste"]);
});

test("Plan: zwei Schichten mit Warnung im selben Feld stehen auf eigenen Zeilen", () => {
  const proTag = new Map([
    [
      "2026-09-21",
      [
        schicht({
          datum: "2026-09-21",
          understaffed: true,
          participants: [{ name: "Anna", role_name: null, attendet: true, is_me: false }],
        }),
        schicht({
          datum: "2026-09-21",
          id: "zweite",
          understaffed: true,
          participants: [{ name: "Ben", role_name: null, attendet: true, is_me: false }],
        }),
      ],
    ],
  ]);

  const [, plan] = planArbeitsmappe(leseZeitraum({ woche: "2026-09-21" }, new Date()), proTag, kontext);
  const zeile = plan!.zeilen.find((z) => {
    const erste = z.zellen[0];
    return erste && Array.isArray(erste.wert) && erste.wert[0]?.text === "Früh";
  })!;
  const montag = zeile.zellen[1]!.wert as { text: string }[];
  // „! Anna" – Umbruch – „! Ben", nicht „Anna! Ben".
  assert.equal(montag.map((l) => l.text).join(""), "! Anna\n! Ben");
});

test("Kalender: ein Monat als Raster, jeder Tag ein umrandeter Kasten mit seinen Schichten", () => {
  const proTag = new Map([
    [
      "2026-09-21",
      [
        schicht({
          datum: "2026-09-21",
          understaffed: true,
          participants: [
            { name: "Anna", role_name: null, attendet: true, is_me: false },
            { name: "Ben", role_name: null, attendet: false, is_me: false },
          ],
        }),
      ],
    ],
  ]);

  const [kalender] = planArbeitsmappe(leseZeitraum({ monat: "2026-09" }, new Date()), proTag, kontext);

  // September 2026: 31.08. bis 04.10. — fünf Wochen, je zwei Zeilen.
  const wochenZeilen = kalender!.zeilen.filter((z) => typeof z.zellen[0]?.wert === "number");
  assert.deepEqual(
    wochenZeilen.map((z) => z.zellen[0]!.wert),
    [36, 37, 38, 39, 40],
  );

  const kw39 = kalender!.zeilen.indexOf(wochenZeilen[3]!);
  const montagInhalt = kalender!.zeilen[kw39 + 1]!.zellen[1]!.wert as { text: string; durchgestrichen?: boolean }[];
  const text = montagInhalt.map((l) => l.text).join("");
  assert.match(text, /^ 06:00–14:00 {2}Früh {2}!\n {6}Anna\n {6}Ben$/);
  assert.equal(montagInhalt.find((l) => l.text.includes("Ben"))!.durchgestrichen, true);

  // Der Tageskasten ist aussen kräftig umrandet.
  const datumZelle = kalender!.zeilen[kw39]!.zellen[1]!;
  assert.equal(datumZelle.stil!.kanten!.oben!.staerke, "mittel");
  assert.equal(kalender!.zeilen[kw39 + 1]!.zellen[1]!.stil!.kanten!.unten!.staerke, "mittel");

  // Tage des Nachbarmonats (31.08.) sind blass gesetzt.
  const erste = kalender!.zeilen.indexOf(wochenZeilen[0]!);
  const august = kalender!.zeilen[erste]!.zellen[1]!.wert as { text: string }[];
  assert.equal(august[0]!.text.trim(), "31");

  assert.equal(kalender!.rasterlinien, false);
  assert.equal(kalender!.aufEineSeite, true);
});
