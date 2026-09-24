import assert from "node:assert/strict";
import test from "node:test";

import type { KalenderSchicht } from "./kalender";
import {
  alsCsv,
  baueMatrix,
  datumKurz,
  datumLang,
  deutschesDatum,
  dateiname,
  kalenderwoche,
  langeForm,
  leseZeitraum,
  monatsZeitraum,
  montagDerWoche,
  standText,
  tageIm,
  verschiebeZeitraum,
  wochenIm,
  type CsvKopf,
} from "./plan-export";

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

function proTagAus(schichten: KalenderSchicht[]): Map<string, KalenderSchicht[]> {
  const karte = new Map<string, KalenderSchicht[]>();
  for (const s of schichten) {
    const liste = karte.get(s.datum);
    if (liste) liste.push(s);
    else karte.set(s.datum, [s]);
  }
  return karte;
}

test("Wochenanfang ist der Montag, auch über Sommerzeit und Jahreswechsel", () => {
  const vorher = process.env.TZ;
  try {
    process.env.TZ = "Europe/Berlin";
    // 2026-09-21 ist ein Montag.
    assert.equal(montagDerWoche("2026-09-21"), "2026-09-21");
    assert.equal(montagDerWoche("2026-09-27"), "2026-09-21");
    // Umstellung auf Sommerzeit in der Nacht zum 2026-03-29 (Sonntag).
    assert.equal(montagDerWoche("2026-03-29"), "2026-03-23");
    // Umstellung auf Winterzeit in der Nacht zum 2026-10-25 (Sonntag).
    assert.equal(montagDerWoche("2026-10-25"), "2026-10-19");
    assert.equal(montagDerWoche("2027-01-01"), "2026-12-28");
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
});

test("Kalenderwoche folgt ISO, nicht der Zählung ab 1. Januar", () => {
  // Der 1.1.2027 ist ein Freitag — seine Woche gehört noch zu 2026.
  assert.equal(kalenderwoche("2027-01-01"), 53);
  // Der 4.1.2027 ist ein Montag und beginnt die KW 1.
  assert.equal(kalenderwoche("2027-01-04"), 1);
  assert.equal(kalenderwoche("2026-09-21"), 39);
});

test("Zeitraum liest Parameter, verwirft Unsinn und blättert weiter", () => {
  const heute = new Date(2026, 8, 24); // Donnerstag, 24.09.2026

  const woche = leseZeitraum({ woche: "2026-09-23" }, heute);
  assert.equal(woche.art, "woche");
  assert.equal(woche.von, "2026-09-21");
  assert.equal(woche.bis, "2026-09-27");

  // Kein gültiger Tag, obwohl das Muster passt.
  assert.equal(leseZeitraum({ woche: "2026-02-31" }, heute).von, "2026-09-21");
  // Gar kein Parameter: laufende Woche.
  assert.equal(leseZeitraum({}, heute).von, "2026-09-21");
  // Monat schlägt Woche.
  assert.equal(leseZeitraum({ monat: "2026-09", woche: "2026-01-05" }, heute).art, "monat");
  assert.equal(leseZeitraum({ monat: "2026-13" }, heute).art, "woche");

  assert.equal(verschiebeZeitraum(woche, 1), "2026-09-28");
  assert.equal(verschiebeZeitraum(woche, -1), "2026-09-14");
  assert.equal(verschiebeZeitraum(monatsZeitraum(2026, 12), 1), "2027-01");
});

test("Monat wird auf volle Wochen gerundet und in Wochenblöcke zerlegt", () => {
  // September 2026 beginnt an einem Dienstag und endet an einem Mittwoch.
  const zeitraum = monatsZeitraum(2026, 9);
  assert.equal(zeitraum.von, "2026-08-31");
  assert.equal(zeitraum.bis, "2026-10-04");

  const tage = tageIm(zeitraum);
  assert.equal(tage.length % 7, 0);

  const wochen = wochenIm(zeitraum);
  assert.equal(wochen.length, tage.length / 7);
  for (const w of wochen) assert.equal(w.tage.length, 7);
  assert.equal(wochen[0]!.von, "2026-08-31");
});

test("Matrix fasst gleiche Schicht über die Woche zusammen und sortiert nach Beginn", () => {
  const tage = ["2026-09-21", "2026-09-22", "2026-09-23"];
  const proTag = proTagAus([
    schicht({
      datum: "2026-09-21",
      participants: [{ name: "Anna", role_name: "Service", attendet: true, is_me: false }],
    }),
    schicht({
      datum: "2026-09-23",
      participants: [{ name: "Ben", role_name: "Service", attendet: false, is_me: false }],
    }),
    schicht({
      datum: "2026-09-21",
      label: "Spät",
      start_zeit: "14:00:00",
      end_zeit: "22:00:00",
      understaffed: true,
    }),
  ]);

  const matrix = baueMatrix(tage, proTag);
  assert.equal(matrix.length, 2);
  assert.equal(matrix[0]!.name, "Früh");
  assert.equal(matrix[1]!.name, "Spät");

  // Dienstag bleibt leer, Montag und Mittwoch sind besetzt.
  assert.equal(matrix[0]!.zellen[0]!.schichten.length, 1);
  assert.equal(matrix[0]!.zellen[1]!.schichten.length, 0);
  assert.equal(matrix[0]!.zellen[2]!.schichten.length, 1);
  assert.equal(matrix[1]!.zellen[0]!.schichten[0]!.unterbesetzt, true);

  // `attendet: false` heisst abgemeldet, nicht „noch offen" — siehe `Besetzung`.
  assert.deepEqual(matrix[0]!.zellen[0]!.schichten[0]!.besetzung, [
    { name: "Anna", rolle: "Service", abgemeldet: false },
  ]);
  assert.deepEqual(matrix[0]!.zellen[2]!.schichten[0]!.besetzung, [
    { name: "Ben", rolle: "Service", abgemeldet: true },
  ]);
});

test("Verschiedene Uhrzeiten unter gleichem Namen bleiben getrennte Zeilen", () => {
  const tage = ["2026-09-21"];
  const matrix = baueMatrix(
    tage,
    proTagAus([
      schicht({ datum: "2026-09-21" }),
      schicht({ datum: "2026-09-21", start_zeit: "07:00:00", end_zeit: "15:00:00" }),
    ]),
  );
  assert.equal(matrix.length, 2);
  assert.equal(matrix[0]!.start, "06:00");
  assert.equal(matrix[1]!.start, "07:00");
});

const kopf: CsvKopf = {
  datum: "Datum",
  wochentag: "Wochentag",
  schicht: "Schicht",
  beginn: "Beginn",
  ende: "Ende",
  ueberNacht: "Über Mitternacht",
  status: "Status",
  person: "Mitarbeiter",
  rolle: "Rolle",
  abgemeldet: "Abgemeldet",
  ja: "ja",
  nein: "nein",
  entwurf: "Entwurf",
  veroeffentlicht: "veröffentlicht",
  archiviert: "archiviert",
  unbesetzt: "(unbesetzt)",
};

test("Lange Form gibt eine Zeile je Zuweisung und behält unbesetzte Schichten", () => {
  const zeilen = langeForm(
    ["2026-09-21"],
    proTagAus([
      schicht({
        datum: "2026-09-21",
        participants: [
          { name: "Anna", role_name: "Service", attendet: true, is_me: false },
          { name: "Ben", role_name: "Küche", attendet: false, is_me: false },
        ],
      }),
      schicht({ datum: "2026-09-21", label: "Spät", start_zeit: "14:00:00", end_zeit: "22:00:00" }),
    ]),
    kopf,
    () => "Montag",
  );

  assert.equal(zeilen.length, 4); // Kopfzeile + zwei Personen + eine unbesetzte
  assert.deepEqual(zeilen[1]!.slice(0, 5), ["21.09.2026", "Montag", "Früh", "06:00", "14:00"]);
  // Anna ist dabei (`attendet: true`) → nicht abgemeldet; Ben ist abgemeldet.
  assert.equal(zeilen[1]!.at(-1), "nein");
  assert.equal(zeilen[2]!.at(-1), "ja");
  assert.equal(zeilen[3]![7], "(unbesetzt)");
});

test("Nachtschicht wird als solche ausgewiesen", () => {
  const zeilen = langeForm(
    ["2026-09-21"],
    proTagAus([
      schicht({ datum: "2026-09-21", label: "Nacht", start_zeit: "22:00:00", end_zeit: "06:00:00" }),
    ]),
    kopf,
    () => "Montag",
  );
  assert.equal(zeilen[1]![5], "ja");
});

test("CSV trennt mit Semikolon, trägt ein BOM und entschärft Formelzellen", () => {
  const text = alsCsv([
    ["Name", "Notiz"],
    ["=SUMME(A1)", 'Er sagte "hallo"; dann ging er'],
    ["-Ali", "Zeile\nUmbruch"],
  ]);

  assert.ok(text.startsWith("﻿"), "BOM fehlt");
  const zeilen = text.slice(1).split("\r\n");
  assert.equal(zeilen[0]!, "Name;Notiz");
  assert.equal(zeilen[1]!, `'=SUMME(A1);"Er sagte ""hallo""; dann ging er"`);
  assert.ok(zeilen[2]!.startsWith(`'-Ali;"Zeile`));
});

test("Dateiname trägt Zeitraum und übersteht Umlaute im Betriebsnamen", () => {
  assert.equal(
    dateiname("Café Grün", monatsZeitraum(2026, 9)),
    "quickteam-dienstplan-cafe-gruen-2026-09.csv",
  );
  assert.equal(
    dateiname("Test", leseZeitraum({ woche: "2026-09-23" }, new Date())),
    "quickteam-dienstplan-test-kw39-2026.csv",
  );
});

test("Bildschirmdatum folgt der Sprache, das CSV-Datum bleibt deutsch", () => {
  const vorher = process.env.TZ;
  try {
    // Eine westliche Zone: hier faellt ein UTC-Datum lokal auf den Vortag,
    // wenn jemand doch wieder ueber die lokale Zone formatiert.
    process.env.TZ = "America/New_York";

    assert.equal(datumKurz("2026-09-07", "de"), "7.9.");
    assert.equal(datumKurz("2026-09-07", "en"), "9/7");
    assert.equal(datumLang("2026-09-07", "de"), "07.09.2026");

    // Die CSV richtet sich nach Excels Laendereinstellung, nicht nach der
    // Oberflaeche — sie bleibt in beiden Sprachen gleich.
    assert.equal(deutschesDatum("2026-09-07"), "07.09.2026");
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
});

test("Stand-Vermerk rechnet in Wiener Zeit, nicht in der des Servers", () => {
  const vorher = process.env.TZ;
  try {
    // Vercel laeuft in UTC. 22:30 UTC am 23.09. ist in Wien (Sommerzeit) bereits 00:30 am 24.09.
    process.env.TZ = "UTC";
    const kurzNachMitternacht = new Date(Date.UTC(2026, 8, 23, 22, 30));
    assert.match(standText(kurzNachMitternacht, "de"), /^24\.09\.2026, 00:30$/);
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
});
