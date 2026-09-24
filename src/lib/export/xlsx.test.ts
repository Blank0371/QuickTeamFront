import assert from "node:assert/strict";
import test from "node:test";

import { baueXlsx, crc32, excelDatum, excelZeit, spaltenName } from "./xlsx";

/** Liest die Dateien eines ungepackten ZIP über das zentrale Verzeichnis. */
function entpacke(zip: Uint8Array): Map<string, string> {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let ende = zip.length - 22;
  while (dv.getUint32(ende, true) !== 0x06054b50) ende--;
  const anzahl = dv.getUint16(ende + 10, true);
  let pos = dv.getUint32(ende + 16, true);

  const dateien = new Map<string, string>();
  for (let i = 0; i < anzahl; i++) {
    assert.equal(dv.getUint32(pos, true), 0x02014b50, "zentraler Eintrag erwartet");
    const groesse = dv.getUint32(pos + 20, true);
    const nameLaenge = dv.getUint16(pos + 28, true);
    const versatz = dv.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLaenge));

    const lokalName = dv.getUint16(versatz + 26, true);
    const start = versatz + 30 + lokalName;
    const daten = zip.subarray(start, start + groesse);
    assert.equal(crc32(daten), dv.getUint32(pos + 16, true), `CRC von ${name}`);
    dateien.set(name, new TextDecoder().decode(daten));
    pos += 46 + nameLaenge;
  }
  return dateien;
}

test("CRC-32 entspricht dem Prüfwert der Norm", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("Spaltennamen zählen wie Excel", () => {
  assert.equal(spaltenName(0), "A");
  assert.equal(spaltenName(25), "Z");
  assert.equal(spaltenName(26), "AA");
  assert.equal(spaltenName(701), "ZZ");
});

test("Datum und Uhrzeit werden zu Excel-Werten", () => {
  const vorher = process.env.TZ;
  try {
    // Die Umrechnung darf nicht an der lokalen Zone hängen.
    process.env.TZ = "America/New_York";
    assert.equal(excelDatum("2026-09-21"), 46286);
    assert.equal(excelDatum("1900-03-01"), 61);
    assert.equal(excelZeit("09:00:00"), 0.375);
    assert.equal(excelZeit("17:30"), (17 * 60 + 30) / 1440);
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
});

test("Arbeitsmappe enthält alle Teile, gültige Prüfsummen und entschärften Text", () => {
  const datei = baueXlsx([
    {
      name: "Plan: Woche/1",
      spalten: [10, 12],
      zeilen: [
        { zellen: [{ wert: "Name", stil: { fett: true } }, { wert: 8.5, stil: { zahlformat: "0.00" } }] },
        { zellen: [{ wert: "=HYPERLINK(\"x\") <b>&" }, { wert: [{ text: "Ben", durchgestrichen: true }] }] },
      ],
      fixierteZeilen: 1,
      filter: true,
      seitenumbruchVor: [2],
    },
  ]);

  assert.equal(datei[0], 0x50);
  assert.equal(datei[1], 0x4b);

  const teile = entpacke(datei);
  for (const name of [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/worksheets/sheet1.xml",
    "xl/styles.xml",
  ]) {
    assert.ok(teile.has(name), `${name} fehlt`);
  }

  const blatt = teile.get("xl/worksheets/sheet1.xml")!;
  // Text steht als Inline-Zeichenkette — nie als Formel, auch wenn er mit `=` beginnt.
  assert.match(blatt, /t="inlineStr"><is><t xml:space="preserve">=HYPERLINK\(&quot;x&quot;\) &lt;b&gt;&amp;<\/t>/);
  assert.doesNotMatch(blatt, /<f>/);
  assert.match(blatt, /<strike\/>/);
  assert.match(blatt, /state="frozen"/);
  assert.match(blatt, /<autoFilter ref="A1:B2"\/>/);
  assert.match(blatt, /<brk id="1" max="16383" man="1"\/>/);

  // Unzulässige Zeichen im Blattnamen werden ersetzt, sonst öffnet Excel die Datei nicht.
  assert.match(teile.get("xl/workbook.xml")!, /<sheet name="Plan  Woche 1"/);
  assert.match(teile.get("xl/styles.xml")!, /formatCode="0.00"/);
});
