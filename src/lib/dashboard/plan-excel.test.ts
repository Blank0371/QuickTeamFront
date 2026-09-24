import assert from "node:assert/strict";
import test from "node:test";

import { de } from "@/i18n/de";

import type { KalenderSchicht } from "./kalender";
import { planArbeitsmappe, stunden } from "./plan-excel";
import { leseZeitraum, tageIm } from "./plan-export";

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

/* ------------------------------------------------------------------ */
/* Wachstum: grosse Betriebe                                           */
/* ------------------------------------------------------------------ */

/** Ein Monat mit `personen` Beschäftigten, `schichten` Schichten am Tag und `jeSchicht` Personen je Schicht. */
function betrieb(personen: number, schichten: number, jeSchicht: number): Map<string, KalenderSchicht[]> {
  const namen = Array.from({ length: personen }, (_, i) => `Person Nummer${String(i).padStart(2, "0")}`);
  const zeitraum = leseZeitraum({ monat: "2026-09" }, new Date());
  const karte = new Map<string, KalenderSchicht[]>();
  let n = 0;
  for (const d of tageIm(zeitraum)) {
    karte.set(
      d,
      Array.from({ length: schichten }, (_, s) =>
        schicht({
          datum: d,
          id: `${d}-${s}`,
          label: `Schicht ${s}`,
          start_zeit: `${String(6 + s * 2).padStart(2, "0")}:00:00`,
          end_zeit: `${String(12 + s * 2).padStart(2, "0")}:00:00`,
          participants: Array.from({ length: jeSchicht }, () => ({
            name: namen[n++ % personen]!,
            role_name: null,
            attendet: true,
            is_me: false,
          })),
        }),
      ),
    );
  }
  return karte;
}

test("Kleiner Betrieb: der Monat bleibt auf einer Seite", () => {
  const [kalender] = planArbeitsmappe(leseZeitraum({ monat: "2026-09" }, new Date()), betrieb(8, 2, 2), kontext);
  assert.equal(kalender!.aufEineSeite, true);
  assert.deepEqual(kalender!.seitenumbruchVor, []);
});

test("Grosser Betrieb: keine Zeile über Excels Grenze, Kalender auf Seiten verteilt, Kürzung sichtbar", () => {
  const mappe = planArbeitsmappe(leseZeitraum({ monat: "2026-09" }, new Date()), betrieb(40, 6, 12), kontext);
  const [kalender, plan] = mappe;

  for (const blatt of mappe) {
    for (const zeile of blatt.zeilen) {
      assert.ok((zeile.hoehe ?? 15) <= 409, `${blatt.name}: Zeile mit ${zeile.hoehe} pt`);
    }
  }

  // Mehrere Seiten, Umbrüche nur zwischen Wochen, Wochentagszeile wiederholt.
  assert.equal(kalender!.aufEineSeite, false);
  assert.ok(kalender!.seitenumbruchVor!.length > 0);
  const kopf = kalender!.druckTitelZeilen as { von: number; bis: number };
  assert.equal(kalender!.zeilen[kopf.von - 1]!.zellen[1]!.wert, "Montag");
  for (const vor of kalender!.seitenumbruchVor!) {
    // Die Zeile nach dem Umbruch ist eine Datumszeile (KW-Nummer in Spalte A).
    assert.equal(typeof kalender!.zeilen[vor - 1]!.zellen[0]!.wert, "number");
  }

  // 72 Namen an einem Tag passen in keinen Kasten — der Rest wird gezählt, nicht verschluckt.
  const text = JSON.stringify(kalender!.zeilen);
  assert.match(text, /weitere – vollständig im Blatt/);

  // Der Schichtplan setzt auf jeder Folgeseite KW-Zeile und Tageskopf neu.
  assert.ok(plan!.seitenumbruchVor!.length > 0);
  for (const vor of plan!.seitenumbruchVor!) {
    const erste = plan!.zeilen[vor - 1]!.zellen[0]!.wert;
    assert.match(String(erste), /^KW \d+/);
  }
  assert.match(JSON.stringify(plan!.zeilen), /\(Fortsetzung\)/);
});

test("Immer ein Name je Zeile, und Vor- und Nachname trennt kein Umbruch", () => {
  const [kalender, plan] = planArbeitsmappe(leseZeitraum({ woche: "2026-09-21" }, new Date()), betrieb(10, 2, 6), kontext);

  const kasten = (kalender!.zeilen.find(
    (z) => Array.isArray(z.zellen[1]?.wert) && JSON.stringify(z.zellen[1]!.wert).includes("Person"),
  )!.zellen[1]!.wert as { text: string }[]).map((l) => l.text).join("");
  // Zwei Schichten zu je sechs Personen: zwölf Zeilen — kein Komma, keine
  // zwei Namen in einer Zeile.
  const namen = kasten.split("\n").filter((z) => z.includes("Person"));
  assert.equal(namen.length, 12);
  assert.doesNotMatch(kasten, /,/);
  // Zwischen Vor- und Nachname steht ein geschütztes Leerzeichen, kein gewöhnliches.
  for (const zeile of namen) assert.match(zeile.replace(/^ +/, ""), /^Person Nummer\d\d$/);

  const feld = plan!.zeilen.find((z) => Array.isArray(z.zellen[1]?.wert))!.zellen[1]!.wert as { text: string }[];
  assert.equal(feld.map((l) => l.text).join("").split("\n").length, 6);
});
