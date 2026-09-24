import type { Dictionary } from "@/i18n";
import { excelDatum, excelZeit, spaltenName, type Blatt, type Lauf, type Stil, type Zeile } from "@/lib/export/xlsx";

import type { KalenderSchicht } from "./kalender";
import { hhmm, schichtName, ueberNacht } from "./kalender";
import {
  baueMatrix,
  kalenderwoche,
  standText,
  tageIm,
  wochenIm,
  zeitraumSpanne,
  type Zeitraum,
} from "./plan-export";

/**
 * Der Dienstplan als Excel-Arbeitsmappe: ein Blatt zum Lesen, eines zum
 * Rechnen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Blätter, weil es zwei Fragen sind
 * ─────────────────────────────────────────────────────────────────────
 *
 * **„Dienstplan"** ist die Matrix vom Aushang — Schichten untereinander,
 * Tage nebeneinander, Namen in den Feldern, je Woche ein Block. Wer die
 * Datei öffnet, um nachzusehen, wer wann arbeitet, soll dort landen und
 * nicht in einer Liste mit hundert Zeilen suchen.
 *
 * **„Liste"** ist dieselbe Information in der langen Form — eine Zeile je
 * Zuweisung, jede Angabe in einer Spalte, Datum und Uhrzeit als **echte
 * Excel-Werte** statt Text. Darauf greifen Filter, Sortierung und
 * Pivot-Tabelle ohne eine einzige Formel. Die Spalte „Stunden" ist genau
 * dafür da: „Stunden je Person im Monat" ist eine Pivot-Tabelle mit zwei
 * Klicks.
 *
 * Beide Blätter entstehen aus derselben `kalender_schichten`-Antwort wie
 * Bildschirm und Ausdruck — keine zweite Abfrage, die anders zählen könnte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Farben
 * ─────────────────────────────────────────────────────────────────────
 *
 * Excel kennt keine CSS-Variablen; die Werte müssen als Zahl in der Datei
 * stehen. Es sind **dieselben Ebene-1-Werte**, aus denen `globals.css` die
 * Druckpalette baut (`docs/Farbpalette.html`), hier abgeschrieben — wie bei
 * den Mail-Vorlagen (`docs/mail-vorlagen.md`), die vor demselben Problem
 * stehen. Wer die Palette ändert, ändert sie auch hier. Die zwei
 * Mischtöne sind ausgerechnet, nicht erfunden (Kommentar an der Stelle).
 */
const FARBE = {
  /** `--qt-c-green-deep` */
  schrift: "16241C",
  /** `--qt-c-stone` */
  sekundaer: "5B564A",
  /** `--qt-c-paper-line` */
  linie: "D9CFB6",
  /** `--qt-c-bronze-mid` */
  akzent: "8A6B3C",
  /** `--qt-c-paper` */
  flaeche: "F3F0E8",
  /** `--qt-c-paper-sunk` */
  kopf: "E9E2D0",
  /** 40 % `--qt-c-paper-sunk` auf Weiss — dieselbe Mischung wie im Druck. */
  wochenende: "F6F3EC",
  /** `--qt-c-red-mid` */
  warnung: "A83824",
} as const;

type Texte = Dictionary["planExport"];

/* ------------------------------------------------------------------ */
/* Stile                                                               */
/* ------------------------------------------------------------------ */

const S = {
  titel: { fett: true, groesse: 18, farbe: FARBE.schrift } satisfies Stil,
  untertitel: { groesse: 12, farbe: FARBE.sekundaer } satisfies Stil,
  stand: { groesse: 9, farbe: FARBE.sekundaer } satisfies Stil,
  woche: { fett: true, groesse: 10, farbe: FARBE.akzent } satisfies Stil,
  kopf: {
    fett: true,
    farbe: FARBE.schrift,
    fuellung: FARBE.kopf,
    rahmen: FARBE.linie,
    unterkante: FARBE.akzent,
    senkrecht: "center",
    umbruch: true,
  } satisfies Stil,
  schicht: {
    farbe: FARBE.schrift,
    fuellung: FARBE.flaeche,
    rahmen: FARBE.linie,
    linkskante: FARBE.akzent,
    senkrecht: "top",
    umbruch: true,
  } satisfies Stil,
  zelle: { farbe: FARBE.schrift, rahmen: FARBE.linie, senkrecht: "top", umbruch: true } satisfies Stil,
  hinweis: { kursiv: true, groesse: 10, farbe: FARBE.sekundaer } satisfies Stil,
};

function mitWochenende(stil: Stil, wochenende: boolean): Stil {
  return wochenende ? { ...stil, fuellung: FARBE.wochenende } : stil;
}

/**
 * Wie viel Zeilenhöhe (in Punkt) auf eine gedruckte Seite passt.
 *
 * Gemessen, nicht gerechnet: am 2026-09-24 hielt Seite 1 eines in Excel
 * exportierten Monats Titel, vier Wochenblöcke und noch eine
 * KW-Überschrift — zusammen rund 560 pt. Die Überschrift stand dann allein
 * unten, ihre Tabelle auf der nächsten Seite. Excel kennt kein „mit dem
 * Folgenden zusammenhalten"; deshalb setzt das Blatt vor jeden Wochenblock,
 * der nicht mehr ganz passt, einen festen Umbruch. 550 lässt etwas Reserve
 * für die Skalierung auf Blattbreite.
 */
const SEITE_PT = 550;

/** Zeilenhöhe für so viele Textzeilen — Excel passt sie beim Öffnen nicht selbst an. */
function hoeheFuer(zeilen: number): number {
  return Math.max(1, zeilen) * 15 + 6;
}

/* ------------------------------------------------------------------ */
/* Blatt 1: der Plan                                                   */
/* ------------------------------------------------------------------ */

function planBlatt(
  zeitraum: Zeitraum,
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  kontext: Kontext,
): Blatt {
  const { t, locale, betriebName, jetzt, zeitraumTitel, wochentageKurz, datumKurz } = kontext;
  const spalten = 8;
  const letzte = spaltenName(spalten - 1);
  const zeilen: Zeile[] = [];
  const verbunden: string[] = [];
  const umbrueche: number[] = [];
  const hoeheAb = (ab: number) =>
    zeilen.slice(ab).reduce((summe, z) => summe + (z.hoehe ?? 15), 0);
  let belegt = 0;

  const ueberAlles = (zelle: Zeile["zellen"][number], hoehe?: number) => {
    zeilen.push({ zellen: [zelle], hoehe });
    verbunden.push(`A${zeilen.length}:${letzte}${zeilen.length}`);
  };

  ueberAlles({ wert: betriebName, stil: S.titel }, 26);
  ueberAlles({ wert: `${t.titel} · ${zeitraumTitel}`, stil: S.untertitel }, 18);
  ueberAlles({ wert: `${t.erstelltAm}: ${standText(jetzt, locale)}`, stil: S.stand });

  const alle = tageIm(zeitraum).flatMap((d) => proTag.get(d) ?? []);
  if (alle.some((s) => s.status === "geplant")) {
    ueberAlles({ wert: t.hinweisEntwurf, stil: { ...S.hinweis, farbe: FARBE.akzent } });
  }
  zeilen.push({ zellen: [] });

  if (alle.length === 0) {
    ueberAlles({ wert: t.keineSchichten, stil: S.hinweis });
  }

  /** Passt der eben gebaute Block noch auf die Seite? Sonst beginnt er eine neue. */
  const seitePruefen = (blockStart: number, bisher: number): number => {
    const block = hoeheAb(blockStart);
    if (bisher > 0 && bisher + block > SEITE_PT) {
      umbrueche.push(blockStart + 1);
      return block;
    }
    return bisher + block;
  };

  belegt = hoeheAb(0);

  for (const woche of alle.length === 0 ? [] : wochenIm(zeitraum)) {
    const blockStart = zeilen.length;
    ueberAlles(
      {
        wert: `${t.kw} ${kalenderwoche(woche.von)} · ${zeitraumSpanne(woche.tage[0]!, woche.tage[6]!, locale)}`,
        stil: S.woche,
      },
      18,
    );

    const matrix = baueMatrix(woche.tage, proTag);
    if (matrix.length === 0) {
      ueberAlles({ wert: t.wocheLeer, stil: S.hinweis });
      zeilen.push({ zellen: [] });
      belegt = seitePruefen(blockStart, belegt);
      continue;
    }

    zeilen.push({
      hoehe: hoeheFuer(2),
      zellen: [
        { wert: t.spalteSchicht, stil: S.kopf },
        ...woche.tage.map((datum, i) => ({
          wert: `${wochentageKurz[i]}\n${datumKurz(datum)}`,
          stil: mitWochenende(S.kopf, i >= 5),
        })),
      ],
    });

    for (const zeile of matrix) {
      let hoechste = 2;
      const kopf: Lauf[] = [
        { text: zeile.name ?? "—", fett: true },
        {
          text: `\n${zeile.start}–${zeile.ende}${zeile.ueberNacht ? " +1" : ""}`,
          farbe: FARBE.sekundaer,
          groesse: 10,
        },
      ];

      const felder = zeile.zellen.map((zelle, i) => {
        /*
          Erst Zeilen sammeln, dann mit Umbrüchen verbinden. Ein Umbruch
          „vor jedem Namen ausser dem ersten" klebte bei zwei Schichten im
          selben Feld das `!` der zweiten an den letzten Namen der ersten.
        */
        const feldZeilen: Lauf[][] = [];
        for (const schicht of zelle.schichten) {
          const warnung: Lauf = { text: "! ", fett: true, farbe: FARBE.warnung };
          if (schicht.besetzung.length === 0 && schicht.unterbesetzt) {
            feldZeilen.push([{ ...warnung, text: "!" }]);
          }
          schicht.besetzung.forEach((person, n) => {
            feldZeilen.push([
              ...(n === 0 && schicht.unterbesetzt ? [warnung] : []),
              {
                text: person.name,
                durchgestrichen: person.abgemeldet,
                kursiv: schicht.entwurf,
                farbe: person.abgemeldet ? FARBE.sekundaer : undefined,
              },
            ]);
          });
        }
        const laeufe = feldZeilen.flatMap((z, n) => (n === 0 ? z : [{ text: "\n" }, ...z]));
        hoechste = Math.max(hoechste, feldZeilen.length);
        return {
          wert: laeufe.length ? laeufe : "",
          stil: mitWochenende(S.zelle, i >= 5),
        };
      });

      zeilen.push({
        hoehe: hoeheFuer(hoechste),
        zellen: [{ wert: kopf, stil: S.schicht }, ...felder],
      });
    }
    zeilen.push({ zellen: [] });
    belegt = seitePruefen(blockStart, belegt);
  }

  // Die Legende: auf Papier und in einer weitergeschickten Datei kann man
  // nicht nachfragen, was durchgestrichen bedeutet.
  ueberAlles({
    wert: [
      { text: `${t.legendeTitel}:  `, fett: true },
      { text: t.legendeMuster, durchgestrichen: true },
      { text: ` ${t.legendeAbgemeldet}   ·   ` },
      { text: t.legendeMuster, kursiv: true },
      { text: ` ${t.legendeEntwurf}   ·   ` },
      { text: "!", fett: true, farbe: FARBE.warnung },
      { text: ` ${t.legendeUnterbesetzt}   ·   ` },
      { text: "+1", fett: true },
      { text: ` ${t.legendeUeberNacht}` },
    ],
    stil: { groesse: 9, farbe: FARBE.sekundaer },
  });

  return {
    name: t.blattPlan,
    seitenumbruchVor: umbrueche,
    spalten: [20, 19, 19, 19, 19, 19, 19, 19],
    zeilen,
    verbunden,
    querformat: true,
    fuss: { links: "QuickTeam", rechts: "&P / &N" },
  };
}

/* ------------------------------------------------------------------ */
/* Blatt 2: die Liste                                                  */
/* ------------------------------------------------------------------ */

/**
 * Stunden einer Zuweisung.
 *
 * Über Mitternacht wird ein Tag addiert (22:00–06:00 sind 8 Stunden, nicht
 * −16). Eine **abgemeldete** Person bekommt 0 — sie hat die Schicht nicht
 * gearbeitet, und eine Pivot-Summe „Stunden je Person" wäre sonst um genau
 * die Notfälle zu hoch. Die Schichtdauer selbst steht in Beginn/Ende.
 */
export function stunden(start: string, ende: string, abgemeldet: boolean): number {
  if (abgemeldet) return 0;
  const minuten = Math.round((excelZeit(ende) - excelZeit(start)) * 1440);
  return ((minuten + 1440) % 1440 || 1440) / 60;
}

function listenBlatt(
  zeitraum: Zeitraum,
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  kontext: Kontext,
): Blatt {
  const { t, wochentagLang } = kontext;
  const k = t.tabellenKopf;
  const statusText: Record<string, string> = {
    geplant: k.entwurf,
    veroeffentlicht: k.veroeffentlicht,
    archiviert: k.archiviert,
  };

  const kopfStil: Stil = { ...S.kopf, umbruch: false };
  const rand: Stil = { farbe: FARBE.schrift, rahmen: FARBE.linie };
  const datum: Stil = { ...rand, zahlformatId: 14, waagrecht: "left" };
  const zeit: Stil = { ...rand, zahlformat: "hh:mm", waagrecht: "center" };
  const zahl: Stil = { ...rand, zahlformat: "0.00" };
  const mitte: Stil = { ...rand, waagrecht: "center" };
  const leer: Stil = { ...rand, kursiv: true, farbe: FARBE.sekundaer };

  const zeilen: Zeile[] = [
    {
      hoehe: 20,
      zellen: [
        k.datum, k.wochentag, t.kw, k.schicht, k.beginn, k.ende, k.stunden,
        k.ueberNacht, k.status, k.person, k.rolle, k.abgemeldet,
      ].map((wert) => ({ wert, stil: kopfStil })),
    },
  ];

  for (const tag of tageIm(zeitraum)) {
    for (const schicht of proTag.get(tag) ?? []) {
      const start = hhmm(schicht.start_zeit);
      const ende = hhmm(schicht.end_zeit);
      const basis = [
        { wert: excelDatum(tag), stil: datum },
        { wert: wochentagLang(tag), stil: rand },
        { wert: kalenderwoche(tag), stil: mitte },
        { wert: schichtName(schicht) ?? "", stil: rand },
        { wert: excelZeit(start), stil: zeit },
        { wert: excelZeit(ende), stil: zeit },
      ];
      const nachStunden = [
        { wert: ueberNacht(schicht) ? k.ja : k.nein, stil: mitte },
        { wert: statusText[schicht.status] ?? schicht.status, stil: rand },
      ];

      const teilnehmer = schicht.participants ?? [];
      if (teilnehmer.length === 0) {
        zeilen.push({
          zellen: [
            ...basis,
            { wert: stunden(start, ende, false), stil: zahl },
            ...nachStunden,
            { wert: k.unbesetzt, stil: leer },
            { wert: "", stil: rand },
            { wert: "", stil: mitte },
          ],
        });
        continue;
      }
      for (const p of teilnehmer) {
        zeilen.push({
          zellen: [
            ...basis,
            { wert: stunden(start, ende, !p.attendet), stil: zahl },
            ...nachStunden,
            { wert: p.name, stil: rand },
            { wert: p.role_name ?? "", stil: rand },
            { wert: p.attendet ? k.nein : k.ja, stil: mitte },
          ],
        });
      }
    }
  }

  return {
    name: t.blattListe,
    spalten: [12, 13, 6, 18, 8, 8, 9, 17, 15, 24, 16, 12],
    zeilen,
    fixierteZeilen: 1,
    filter: true,
    druckTitelZeilen: 1,
    querformat: true,
    fuss: { links: "QuickTeam", rechts: "&P / &N" },
  };
}

/* ------------------------------------------------------------------ */
/* Arbeitsmappe                                                        */
/* ------------------------------------------------------------------ */

export type Kontext = {
  t: Texte;
  locale: string;
  betriebName: string;
  jetzt: Date;
  /** „KW 39/2026 · 21.–27. September 2026" bzw. „September 2026". */
  zeitraumTitel: string;
  /** Mo … So in der aktiven Sprache. */
  wochentageKurz: string[];
  datumKurz: (datum: string) => string;
  wochentagLang: (datum: string) => string;
};

export function planArbeitsmappe(
  zeitraum: Zeitraum,
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  kontext: Kontext,
): Blatt[] {
  return [planBlatt(zeitraum, proTag, kontext), listenBlatt(zeitraum, proTag, kontext)];
}
