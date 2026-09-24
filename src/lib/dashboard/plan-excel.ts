import type { Dictionary } from "@/i18n";
import {
  excelDatum,
  excelZeit,
  spaltenName,
  umrande,
  type Blatt,
  type Kante,
  type Lauf,
  type Stil,
  type Zelle,
  type Zeile,
} from "@/lib/export/xlsx";

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
 * Der Dienstplan als Excel-Arbeitsmappe — drei Blätter, drei Fragen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum drei
 * ─────────────────────────────────────────────────────────────────────
 *
 *   **Kalender**    „Was ist wann los?" — ein Wandkalender: Wochentage
 *                   nebeneinander, Wochen untereinander, jeder Tag ein
 *                   umrandeter Kasten mit grosser Tageszahl und den
 *                   Schichten darin. Das erste Blatt, weil es das ist,
 *                   was jemand erwartet, der einen Dienstplan öffnet.
 *   **Schichtplan** „Wer hat welche Schicht?" — die Matrix vom Aushang,
 *                   Schichten untereinander, Tage nebeneinander.
 *   **Liste**       „Wie viele Stunden?" — die lange Form für Filter,
 *                   Sortierung und Pivot-Tabelle, Datum und Uhrzeit als
 *                   echte Excel-Werte.
 *
 * Bis zum 2026-09-24 gab es nur die letzten beiden, und der Nutzer nannte
 * das Ergebnis zu Recht „eine simple Auflistung von Daten". Ein Dienstplan
 * wird als Kalender gelesen; die Liste ist das Werkzeug dahinter.
 *
 * Alle drei entstehen aus derselben `kalender_schichten`-Antwort wie
 * Bildschirm und Ausdruck — keine zweite Abfrage, die anders zählen könnte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Farben
 * ─────────────────────────────────────────────────────────────────────
 *
 * Excel kennt keine CSS-Variablen; die Werte müssen als Zahl in der Datei
 * stehen. Es sind **dieselben Ebene-1-Werte**, aus denen `globals.css` die
 * Druckpalette baut (`docs/Farbpalette.html`), hier abgeschrieben — wie bei
 * den Mail-Vorlagen (`docs/mail-vorlagen.md`). Wer die Palette ändert,
 * ändert sie auch hier. Der eine Mischton ist ausgerechnet (Kommentar).
 */
const FARBE = {
  /** `--qt-c-green-deep` — Schrift, Titelleiste */
  gruen: "16241C",
  /** `--qt-c-stone` */
  sekundaer: "5B564A",
  /** `--qt-c-paper-line` — feine Innenlinien */
  linie: "D9CFB6",
  /** `--qt-c-bronze-mid` — Akzent, Kastenrahmen */
  bronze: "8A6B3C",
  /** `--qt-c-bronze-lo` */
  bronzeDunkel: "7A6238",
  /** `--qt-c-paper` */
  papier: "F3F0E8",
  /** `--qt-c-paper-sunk` */
  papierTief: "E9E2D0",
  /** 40 % `--qt-c-paper-sunk` auf Weiss — dieselbe Mischung wie im Druck. */
  wochenende: "F6F3EC",
  /** `--qt-c-ivory` — Schrift auf Grün und Bronze */
  elfenbein: "FAF7F0",
  /** `--qt-c-red-mid` */
  warnung: "A83824",
  weiss: "FFFFFF",
} as const;

const KASTEN: Kante = { farbe: FARBE.bronze, staerke: "mittel" };
const BLOCK: Kante = { farbe: FARBE.gruen, staerke: "mittel" };

type Texte = Dictionary["planExport"];

export type Kontext = {
  t: Texte;
  locale: string;
  betriebName: string;
  jetzt: Date;
  /** „KW 39/2026 · 21.–27. September 2026" bzw. „September 2026". */
  zeitraumTitel: string;
  /** Mo … So in der aktiven Sprache. */
  wochentageKurz: string[];
  /** Montag … Sonntag in der aktiven Sprache. */
  wochentageLang: string[];
  datumKurz: (datum: string) => string;
  wochentagLang: (datum: string) => string;
  /** „Sep", „Okt" — für den Monatswechsel im Kalenderraster. */
  monatKurz: (datum: string) => string;
};

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

/**
 * Eine Zeile, die über die ganze Breite verbunden ist.
 *
 * Excel zeichnet den Rahmen und die Füllung einer verbundenen Zelle aus den
 * Stilen **aller** beteiligten Zellen — steht nur in der ersten ein Stil,
 * endet die Titelleiste nach einer Spalte. Deshalb bekommt jede Zelle des
 * Bereichs denselben Stil, nur die erste trägt den Wert.
 */
function volleZeile(
  zeilen: Zeile[],
  verbunden: string[],
  breite: number,
  wert: string | number | Lauf[],
  stil: Stil,
  hoehe?: number,
): void {
  const zellen: Zelle[] = [{ wert, stil }];
  for (let i = 1; i < breite; i++) zellen.push({ wert: "", stil });
  zeilen.push({ zellen, hoehe });
  verbunden.push(`A${zeilen.length}:${spaltenName(breite - 1)}${zeilen.length}`);
}

/** Titelleiste, Betrieb und Stand — der Kopf, den alle drei Blätter teilen. */
function blattKopf(zeilen: Zeile[], verbunden: string[], breite: number, k: Kontext, titel: string) {
  volleZeile(
    zeilen,
    verbunden,
    breite,
    `  ${titel}`,
    { fett: true, groesse: 18, farbe: FARBE.elfenbein, fuellung: FARBE.gruen, senkrecht: "center" },
    36,
  );

  // Betrieb links, Stand rechts, darunter eine Bronzelinie über die ganze Breite.
  const trenn: Kante = { farbe: FARBE.bronze, staerke: "mittel" };
  const links = Math.max(1, breite - 3);
  const zellen: Zelle[] = [];
  for (let i = 0; i < breite; i++) {
    const betrieb = i < links;
    zellen.push({
      wert: i === 0 ? `  ${k.betriebName}` : i === links ? `${k.t.erstelltAm}: ${standText(k.jetzt, k.locale)}  ` : "",
      stil: betrieb
        ? { fett: true, groesse: 13, farbe: FARBE.gruen, senkrecht: "center", kanten: { unten: trenn } }
        : { groesse: 9, farbe: FARBE.sekundaer, waagrecht: "right", senkrecht: "center", kanten: { unten: trenn } },
    });
  }
  zeilen.push({ zellen, hoehe: 24 });
  verbunden.push(`A${zeilen.length}:${spaltenName(links - 1)}${zeilen.length}`);
  verbunden.push(`${spaltenName(links)}${zeilen.length}:${spaltenName(breite - 1)}${zeilen.length}`);

  zeilen.push({ zellen: [], hoehe: 8 });
}

/** Die Legende als umrandeter Kasten am Blattende. */
function legende(zeilen: Zeile[], verbunden: string[], breite: number, t: Texte) {
  zeilen.push({ zellen: [], hoehe: 10 });
  volleZeile(
    zeilen,
    verbunden,
    breite,
    [
      { text: `  ${t.legendeTitel}:   `, fett: true },
      { text: t.legendeMuster, durchgestrichen: true },
      { text: ` ${t.legendeAbgemeldet}      ` },
      { text: t.legendeMuster, kursiv: true },
      { text: ` ${t.legendeEntwurf}      ` },
      { text: "!", fett: true, farbe: FARBE.warnung },
      { text: ` ${t.legendeUnterbesetzt}      ` },
      { text: "+1", fett: true },
      { text: ` ${t.legendeUeberNacht}` },
    ],
    { groesse: 9, farbe: FARBE.sekundaer, fuellung: FARBE.papier, senkrecht: "center" },
    22,
  );
  umrande(
    zeilen,
    { zeileVon: zeilen.length - 1, zeileBis: zeilen.length - 1, spalteVon: 0, spalteBis: breite - 1 },
    { farbe: FARBE.linie, staerke: "duenn" },
  );
}

/** Zeilenhöhe für so viele Textzeilen einer Grösse — Excel passt sie beim Öffnen nicht an. */
function hoeheFuer(textzeilen: number, pt = 15, rand = 6): number {
  return Math.max(1, textzeilen) * pt + rand;
}

/* ------------------------------------------------------------------ */
/* Blatt 1: Kalender                                                   */
/* ------------------------------------------------------------------ */

/**
 * Die Schichten eines Tages als Textläufe für einen Kalenderkasten.
 *
 * Je Schicht eine Kopfzeile — Uhrzeit in Bronze, Name fett, dazu `+1` für
 * Nachtschichten und ein rotes `!` bei Unterbesetzung —, darunter die
 * Personen eingerückt. So liest sich der Kasten wie ein Kalendereintrag,
 * nicht wie eine Tabellenzeile.
 */
function tagesInhalt(schichten: readonly KalenderSchicht[], ausserhalb: boolean): { laeufe: Lauf[]; zeilen: number } {
  const zeilen: Lauf[][] = [];
  for (const s of schichten) {
    const entwurf = s.status === "geplant";
    const kopf: Lauf[] = [
      // Die Leerzeichen sind der Innenabstand: Excel kennt keinen Zellrand-
      // abstand, und ohne sie klebt die Uhrzeit an der Kastenlinie.
      { text: ` ${hhmm(s.start_zeit)}–${hhmm(s.end_zeit)}`, fett: true, farbe: ausserhalb ? FARBE.sekundaer : FARBE.bronze, kursiv: entwurf },
      ...(ueberNacht(s) ? [{ text: " +1", farbe: FARBE.sekundaer }] : []),
      { text: `  ${schichtName(s) ?? ""}`, fett: true, kursiv: entwurf },
      ...(s.understaffed ? [{ text: "  !", fett: true, farbe: FARBE.warnung }] : []),
    ];
    zeilen.push(kopf);
    for (const p of s.participants ?? []) {
      zeilen.push([
        {
          text: `      ${p.name}`,
          durchgestrichen: !p.attendet,
          kursiv: entwurf,
          farbe: !p.attendet || ausserhalb ? FARBE.sekundaer : undefined,
        },
      ]);
    }
  }
  return {
    laeufe: zeilen.flatMap((z, i) => (i === 0 ? z : [{ text: "\n" }, ...z])),
    zeilen: zeilen.length,
  };
}

function kalenderBlatt(
  zeitraum: Zeitraum,
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  k: Kontext,
): Blatt {
  const { t } = k;
  const breite = 8; // KW + sieben Tage
  const zeilen: Zeile[] = [];
  const verbunden: string[] = [];

  blattKopf(zeilen, verbunden, breite, k, `${t.titel} · ${k.zeitraumTitel}`);

  const alle = tageIm(zeitraum).flatMap((d) => proTag.get(d) ?? []);
  if (alle.some((s) => s.status === "geplant")) {
    volleZeile(zeilen, verbunden, breite, `  ${t.hinweisEntwurf}`, {
      kursiv: true,
      groesse: 10,
      farbe: FARBE.bronzeDunkel,
      fuellung: FARBE.papier,
      senkrecht: "center",
    }, 20);
    zeilen.push({ zellen: [], hoehe: 8 });
  }

  // Kopf der Wochentage — Bronze mit heller Schrift, kräftig umrandet.
  const kopfStil: Stil = {
    fett: true,
    groesse: 11,
    farbe: FARBE.elfenbein,
    fuellung: FARBE.bronze,
    waagrecht: "center",
    senkrecht: "center",
    rahmen: FARBE.bronzeDunkel,
  };
  const rasterStart = zeilen.length;
  zeilen.push({
    hoehe: 26,
    zellen: [{ wert: t.kw, stil: kopfStil }, ...k.wochentageLang.map((w) => ({ wert: w, stil: kopfStil }))],
  });
  umrande(zeilen, { zeileVon: zeilen.length - 1, zeileBis: zeilen.length - 1, spalteVon: 0, spalteBis: 7 }, BLOCK);

  const woche = zeitraum.art === "woche";
  // Eine Woche füllt das Blatt als Aushang; ein Monat soll mit fünf oder
  // sechs Wochen noch auf eine Seite passen.
  const mindestHoehe = woche ? 330 : 78;

  for (const w of wochenIm(zeitraum)) {
    const datumsZeile = zeilen.length;
    const inhalte = w.tage.map((tag) => {
      const ausserhalb = zeitraum.art === "monat" && tag.slice(0, 7) !== zeitraum.wert;
      return { tag, ausserhalb, ...tagesInhalt(proTag.get(tag) ?? [], ausserhalb) };
    });

    // Zeile 1 des Kastens: die Tageszahl.
    zeilen.push({
      hoehe: 22,
      zellen: [
        {
          wert: kalenderwoche(w.von),
          stil: {
            fett: true,
            groesse: 14,
            farbe: FARBE.bronze,
            fuellung: FARBE.papierTief,
            waagrecht: "center",
            senkrecht: "center",
          },
        },
        ...inhalte.map(({ tag, ausserhalb }, i): Zelle => {
          const nummer = Number(tag.slice(8));
          // Den Monatsnamen nur, wo er etwas sagt: am Monatsersten und in der
          // allerersten Zelle — sonst stünde er dreissigmal da.
          const mitMonat = nummer === 1 || (i === 0 && w.von === zeitraum.von);
          return {
            wert: [
              { text: ` ${nummer}`, fett: true, groesse: 14, farbe: ausserhalb ? FARBE.linie : FARBE.gruen },
              ...(mitMonat ? [{ text: `  ${k.monatKurz(tag)}`, groesse: 9, farbe: FARBE.sekundaer }] : []),
            ],
            stil: {
              fuellung: ausserhalb ? FARBE.weiss : i >= 5 ? FARBE.papierTief : FARBE.papier,
              senkrecht: "center",
              kanten: { unten: { farbe: FARBE.linie, staerke: "duenn" } },
            },
          };
        }),
      ],
    });

    // Zeile 2 des Kastens: die Schichten.
    const hoechste = Math.max(...inhalte.map((i) => i.zeilen));
    zeilen.push({
      hoehe: Math.max(mindestHoehe, hoeheFuer(hoechste, 12.5, 10)),
      zellen: [
        { wert: "", stil: { fuellung: FARBE.papierTief } },
        ...inhalte.map(({ laeufe, ausserhalb }, i): Zelle => ({
          wert: laeufe.length ? laeufe : "",
          stil: {
            groesse: 9,
            farbe: ausserhalb ? FARBE.sekundaer : FARBE.gruen,
            fuellung: ausserhalb ? FARBE.weiss : i >= 5 ? FARBE.wochenende : FARBE.weiss,
            umbruch: true,
            senkrecht: "top",
          },
        })),
      ],
    });

    // Die KW-Spalte über beide Zeilen, jeder Tag ein eigener Kasten.
    verbunden.push(`A${datumsZeile + 1}:A${datumsZeile + 2}`);
    umrande(zeilen, { zeileVon: datumsZeile, zeileBis: datumsZeile + 1, spalteVon: 0, spalteBis: 0 }, KASTEN);
    for (let s = 1; s <= 7; s++) {
      umrande(zeilen, { zeileVon: datumsZeile, zeileBis: datumsZeile + 1, spalteVon: s, spalteBis: s }, KASTEN);
    }
  }

  // Aussenrahmen um das ganze Raster, kräftiger als die Kästen.
  umrande(zeilen, { zeileVon: rasterStart, zeileBis: zeilen.length - 1, spalteVon: 0, spalteBis: 7 }, BLOCK);

  legende(zeilen, verbunden, breite, t);

  return {
    name: t.blattKalender,
    spalten: [7, 25, 25, 25, 25, 25, 25, 25],
    zeilen,
    verbunden,
    rasterlinien: false,
    querformat: true,
    aufEineSeite: true,
    registerFarbe: FARBE.gruen,
    fuss: { links: "QuickTeam", rechts: "&P / &N" },
  };
}

/* ------------------------------------------------------------------ */
/* Blatt 2: Schichtplan (Matrix)                                       */
/* ------------------------------------------------------------------ */

/**
 * Wie viel Zeilenhöhe (in Punkt) auf eine gedruckte Seite passt.
 *
 * Gemessen, nicht gerechnet, im als PDF exportierten Blatt (2026-09-24):
 * nach dem Kopf und zwei Wochenblöcken (rund 400 pt) war erst gut die
 * Hälfte der Seite belegt. Excel kennt kein „mit dem Folgenden
 * zusammenhalten"; deshalb setzt das Blatt vor jeden Wochenblock, der nicht
 * mehr ganz passt, einen festen Umbruch — sonst stünde eine
 * KW-Überschrift allein unten und ihre Tabelle auf der nächsten Seite.
 */
const SEITE_PT = 575;

function schichtplanBlatt(
  zeitraum: Zeitraum,
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  k: Kontext,
): Blatt {
  const { t } = k;
  const breite = 8;
  const zeilen: Zeile[] = [];
  const verbunden: string[] = [];
  const umbrueche: number[] = [];
  const hoeheAb = (ab: number) => zeilen.slice(ab).reduce((summe, z) => summe + (z.hoehe ?? 15), 0);

  blattKopf(zeilen, verbunden, breite, k, `${t.titel} · ${k.zeitraumTitel}`);
  let belegt = hoeheAb(0);

  const seitePruefen = (blockStart: number) => {
    const block = hoeheAb(blockStart);
    if (belegt > 0 && belegt + block > SEITE_PT) {
      umbrueche.push(blockStart + 1);
      belegt = block;
    } else {
      belegt += block;
    }
  };

  const alle = tageIm(zeitraum).flatMap((d) => proTag.get(d) ?? []);
  if (alle.length === 0) {
    volleZeile(zeilen, verbunden, breite, `  ${t.keineSchichten}`, { kursiv: true, farbe: FARBE.sekundaer });
  }

  const kopfStil = (wochenende: boolean): Stil => ({
    fett: true,
    farbe: FARBE.elfenbein,
    fuellung: wochenende ? FARBE.bronzeDunkel : FARBE.gruen,
    rahmen: FARBE.gruen,
    waagrecht: "center",
    senkrecht: "center",
    umbruch: true,
  });

  for (const woche of alle.length === 0 ? [] : wochenIm(zeitraum)) {
    const blockStart = zeilen.length;
    volleZeile(
      zeilen,
      verbunden,
      breite,
      `${t.kw} ${kalenderwoche(woche.von)}  ·  ${zeitraumSpanne(woche.tage[0]!, woche.tage[6]!, k.locale)}`,
      { fett: true, groesse: 11, farbe: FARBE.bronze, senkrecht: "bottom" },
      22,
    );

    const matrix = baueMatrix(woche.tage, proTag);
    if (matrix.length === 0) {
      volleZeile(zeilen, verbunden, breite, `  ${t.wocheLeer}`, {
        kursiv: true,
        groesse: 10,
        farbe: FARBE.sekundaer,
        fuellung: FARBE.papier,
        rahmen: FARBE.linie,
      }, 20);
      zeilen.push({ zellen: [], hoehe: 10 });
      seitePruefen(blockStart);
      continue;
    }

    const tabelleStart = zeilen.length;
    zeilen.push({
      hoehe: hoeheFuer(2),
      zellen: [
        { wert: t.spalteSchicht, stil: { ...kopfStil(false), waagrecht: "left" } },
        ...woche.tage.map((datum, i) => ({
          wert: `${k.wochentageKurz[i]}\n${k.datumKurz(datum)}`,
          stil: kopfStil(i >= 5),
        })),
      ],
    });

    matrix.forEach((zeile, n) => {
      const zebra = n % 2 === 1;
      let hoechste = 2;
      const felder = zeile.zellen.map((zelle, i): Zelle => {
        const feldZeilen: Lauf[][] = [];
        for (const schicht of zelle.schichten) {
          const warnung: Lauf = { text: "! ", fett: true, farbe: FARBE.warnung };
          if (schicht.besetzung.length === 0 && schicht.unterbesetzt) feldZeilen.push([{ ...warnung, text: "!" }]);
          schicht.besetzung.forEach((person, j) => {
            feldZeilen.push([
              ...(j === 0 && schicht.unterbesetzt ? [warnung] : []),
              {
                text: person.name,
                durchgestrichen: person.abgemeldet,
                kursiv: schicht.entwurf,
                farbe: person.abgemeldet ? FARBE.sekundaer : undefined,
              },
            ]);
          });
        }
        hoechste = Math.max(hoechste, feldZeilen.length);
        return {
          wert: feldZeilen.length ? feldZeilen.flatMap((z, j) => (j === 0 ? z : [{ text: "\n" }, ...z])) : "",
          stil: {
            farbe: FARBE.gruen,
            fuellung: i >= 5 ? FARBE.wochenende : zebra ? FARBE.papier : FARBE.weiss,
            rahmen: FARBE.linie,
            senkrecht: "top",
            umbruch: true,
          },
        };
      });

      zeilen.push({
        hoehe: hoeheFuer(hoechste),
        zellen: [
          {
            wert: [
              { text: zeile.name ?? "—", fett: true },
              { text: `\n${zeile.start}–${zeile.ende}${zeile.ueberNacht ? " +1" : ""}`, farbe: FARBE.bronze, groesse: 10 },
            ],
            stil: {
              farbe: FARBE.gruen,
              fuellung: FARBE.papierTief,
              rahmen: FARBE.linie,
              kanten: { links: { farbe: FARBE.bronze, staerke: "dick" } },
              senkrecht: "top",
              umbruch: true,
            },
          },
          ...felder,
        ],
      });
    });

    // Die Tabelle einer Woche als geschlossener Block.
    umrande(zeilen, { zeileVon: tabelleStart, zeileBis: zeilen.length - 1, spalteVon: 0, spalteBis: 7 }, BLOCK);
    zeilen.push({ zellen: [], hoehe: 12 });
    seitePruefen(blockStart);
  }

  legende(zeilen, verbunden, breite, t);

  return {
    name: t.blattPlan,
    spalten: [22, 19, 19, 19, 19, 19, 19, 19],
    zeilen,
    verbunden,
    rasterlinien: false,
    querformat: true,
    seitenumbruchVor: umbrueche,
    registerFarbe: FARBE.bronze,
    fuss: { links: "QuickTeam", rechts: "&P / &N" },
  };
}

/* ------------------------------------------------------------------ */
/* Blatt 3: Liste                                                      */
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
  k: Kontext,
): Blatt {
  const { t } = k;
  const kopf = t.tabellenKopf;
  const statusText: Record<string, string> = {
    geplant: kopf.entwurf,
    veroeffentlicht: kopf.veroeffentlicht,
    archiviert: kopf.archiviert,
  };

  const kopfStil: Stil = {
    fett: true,
    farbe: FARBE.elfenbein,
    fuellung: FARBE.gruen,
    rahmen: FARBE.gruen,
    senkrecht: "center",
    kanten: { unten: { farbe: FARBE.bronze, staerke: "dick" } },
  };

  const zeilen: Zeile[] = [
    {
      hoehe: 24,
      zellen: [
        kopf.datum, kopf.wochentag, t.kw, kopf.schicht, kopf.beginn, kopf.ende, kopf.stunden,
        kopf.ueberNacht, kopf.status, kopf.person, kopf.rolle, kopf.abgemeldet,
      ].map((wert) => ({ wert, stil: kopfStil })),
    },
  ];

  /*
   * Gruppiert wird nach **Tag**, nicht nach Zeile: alle Zuweisungen eines
   * Tages tragen dieselbe Tönung, der nächste Tag die andere, und über jedem
   * Tageswechsel liegt eine Bronzelinie. So sieht man beim Scrollen, wo ein
   * Tag endet — eine Zeilen-Zebrierung zerschnitte gerade die Gruppen.
   */
  let tagNr = 0;
  for (const tag of tageIm(zeitraum)) {
    const schichten = proTag.get(tag) ?? [];
    if (schichten.length === 0) continue;
    const grund = tagNr++ % 2 === 1 ? FARBE.papier : FARBE.weiss;
    let ersteDesTages = true;

    const stil = (extra: Stil = {}): Stil => ({
      farbe: FARBE.gruen,
      fuellung: grund,
      rahmen: FARBE.linie,
      senkrecht: "center",
      ...(ersteDesTages ? { kanten: { oben: { farbe: FARBE.bronze, staerke: "mittel" } } } : {}),
      ...extra,
    });

    for (const schicht of schichten) {
      const start = hhmm(schicht.start_zeit);
      const ende = hhmm(schicht.end_zeit);
      const teilnehmer = schicht.participants ?? [];
      const personen = teilnehmer.length
        ? teilnehmer.map((p) => ({ name: p.name, rolle: p.role_name ?? "", abgemeldet: !p.attendet, leer: false }))
        : [{ name: kopf.unbesetzt, rolle: "", abgemeldet: false, leer: true }];

      for (const p of personen) {
        zeilen.push({
          hoehe: 18,
          zellen: [
            { wert: excelDatum(tag), stil: stil({ zahlformatId: 14, waagrecht: "left", fett: ersteDesTages }) },
            { wert: k.wochentagLang(tag), stil: stil() },
            { wert: kalenderwoche(tag), stil: stil({ waagrecht: "center" }) },
            { wert: schichtName(schicht) ?? "", stil: stil({ fett: true }) },
            { wert: excelZeit(start), stil: stil({ zahlformat: "hh:mm", waagrecht: "center" }) },
            { wert: excelZeit(ende), stil: stil({ zahlformat: "hh:mm", waagrecht: "center" }) },
            { wert: p.leer ? stunden(start, ende, false) : stunden(start, ende, p.abgemeldet), stil: stil({ zahlformat: "0.00" }) },
            { wert: ueberNacht(schicht) ? kopf.ja : kopf.nein, stil: stil({ waagrecht: "center" }) },
            { wert: statusText[schicht.status] ?? schicht.status, stil: stil() },
            {
              wert: p.name,
              stil: stil(p.leer ? { kursiv: true, farbe: FARBE.sekundaer } : p.abgemeldet ? { farbe: FARBE.sekundaer } : {}),
            },
            { wert: p.rolle, stil: stil() },
            {
              wert: p.leer ? "" : p.abgemeldet ? kopf.ja : kopf.nein,
              stil: stil({ waagrecht: "center", ...(p.abgemeldet ? { fett: true, farbe: FARBE.warnung } : {}) }),
            },
          ],
        });
        ersteDesTages = false;
      }
    }
  }

  return {
    name: t.blattListe,
    spalten: [12, 13, 6, 18, 9, 9, 10, 17, 15, 24, 16, 12],
    zeilen,
    fixierteZeilen: 1,
    filter: true,
    druckTitelZeilen: 1,
    querformat: true,
    registerFarbe: FARBE.sekundaer,
    fuss: { links: "QuickTeam", rechts: "&P / &N" },
  };
}

/* ------------------------------------------------------------------ */
/* Arbeitsmappe                                                        */
/* ------------------------------------------------------------------ */

export function planArbeitsmappe(
  zeitraum: Zeitraum,
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  kontext: Kontext,
): Blatt[] {
  return [
    kalenderBlatt(zeitraum, proTag, kontext),
    schichtplanBlatt(zeitraum, proTag, kontext),
    listenBlatt(zeitraum, proTag, kontext),
  ];
}
