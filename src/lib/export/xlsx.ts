/**
 * Ein kleiner Schreiber für Excel-Dateien (`.xlsx`), ohne Abhängigkeit.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum nicht mehr CSV
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Dienstplan ging bis zum 2026-09-24 als CSV hinaus. In Excel geöffnet
 * (am selben Tag über COM nachgesehen) sah das so aus: zehn Spalten zu je
 * 10,7 Zeichen, „Über Mitternacht" abgeschnitten, keine fette Kopfzeile,
 * kein Filter, nichts fixiert. Das ist kein Mangel der Datei, sondern des
 * Formats — eine CSV **kann** keine Formatierung tragen. Nachbessern lässt
 * sich daran nichts; das Format war falsch gewählt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum selbst geschrieben
 * ─────────────────────────────────────────────────────────────────────
 *
 * Eine `.xlsx` ist ein ZIP-Archiv mit einer Handvoll XML-Dateien
 * (Office Open XML, ECMA-376). Was hier gebraucht wird — Text, Zahlen,
 * Datumswerte, ein paar Formate, Spaltenbreiten, fixierte Zeilen, Filter,
 * Druckeinrichtung — ist ein kleiner, fester Ausschnitt davon. Eine
 * Bibliothek wie `exceljs` brächte dafür ein Vielfaches an Code und
 * Abhängigkeiten mit; das Projekt baut auch das Werbepartner-PDF ohne.
 *
 * Das Archiv wird **ungepackt** geschrieben (Methode „stored"). Die Dateien
 * sind klein, und ein eigener Deflate-Pfad wäre Aufwand ohne Nutzen. Excel,
 * LibreOffice und Numbers lesen das ohne Umstände.
 *
 * Nicht enthalten ist bewusst alles, was hier keiner braucht: Formeln,
 * geteilte Zeichenketten (`sharedStrings`), Diagramme, bedingte Formate.
 * Text steht als `inlineStr` direkt in der Zelle — dadurch gibt es auch
 * keine Formel-Injection mehr, die bei der CSV noch entschärft werden
 * musste: eine Inline-Zeichenkette ist nie eine Formel.
 */

/* ------------------------------------------------------------------ */
/* Modell                                                              */
/* ------------------------------------------------------------------ */

/** Farbe als `RRGGBB` (ohne `#`). */
export type Farbe = string;

export type Stil = {
  fett?: boolean;
  kursiv?: boolean;
  groesse?: number;
  farbe?: Farbe;
  fuellung?: Farbe;
  /** Dünner Rahmen ringsum in dieser Farbe — Grundlage für jede Seite ohne eigene Kante. */
  rahmen?: Farbe;
  /**
   * Einzelne Kanten, die vom `rahmen` abweichen. Ein Kalenderkasten ist
   * aussen kräftig und innen fein — das geht nur je Seite.
   */
  kanten?: Partial<Record<Seite, Kante>>;
  /** Excel-Zahlformat, z. B. `"hh:mm"` oder `"0.00"`. */
  zahlformat?: string;
  /** Eingebautes Zahlformat nach Nummer (14 = kurzes Datum der Ländereinstellung). */
  zahlformatId?: number;
  umbruch?: boolean;
  waagrecht?: "left" | "center" | "right";
  senkrecht?: "top" | "center" | "bottom";
};

export type Seite = "links" | "rechts" | "oben" | "unten";
export type Kante = { farbe: Farbe; staerke?: "duenn" | "mittel" | "dick" };

/** Ein Textstück mit eigener Auszeichnung — für „Anna, ~~Ben~~" in einer Zelle. */
export type Lauf = {
  text: string;
  durchgestrichen?: boolean;
  kursiv?: boolean;
  fett?: boolean;
  farbe?: Farbe;
  groesse?: number;
};

export type Zelle =
  | null
  | { wert: string | number | Lauf[]; stil?: Stil };

export type Zeile = { zellen: Zelle[]; hoehe?: number };

export type Blatt = {
  name: string;
  /** Breite je Spalte in Zeichen. */
  spalten: number[];
  zeilen: Zeile[];
  /** So viele Zeilen oben bleiben beim Scrollen stehen. */
  fixierteZeilen?: number;
  /** Autofilter über die erste Zeile bis zur letzten Datenzeile. */
  filter?: boolean;
  /** Bereiche wie `"A1:H1"`, die zu einer Zelle verbunden werden. */
  verbunden?: string[];
  /** Diese Zeilen (1-basiert) wiederholen sich auf jeder gedruckten Seite. */
  druckTitelZeilen?: number;
  querformat?: boolean;
  /** Fusszeile: links, rechts. `&P` Seite, `&N` Seitenzahl. */
  fuss?: { links?: string; rechts?: string };
  /** Vor diesen Zeilen (1-basiert) beginnt beim Drucken eine neue Seite. */
  seitenumbruchVor?: number[];
  /**
   * `false` blendet Excels graue Gitternetzlinien aus. Ein gestaltetes Blatt
   * (Kalender) wirkt mit ihnen wie eine Tabelle, in die jemand Rahmen gemalt
   * hat; ohne sie tragen nur die gesetzten Rahmen die Struktur.
   */
  rasterlinien?: boolean;
  /** Beim Drucken auf genau eine Seite skalieren (statt nur auf Blattbreite). */
  aufEineSeite?: boolean;
  /** Farbe des Blattregisters unten in Excel. */
  registerFarbe?: Farbe;
};

/* ------------------------------------------------------------------ */
/* Zellbezüge und Werte                                                */
/* ------------------------------------------------------------------ */

/** 0 → `A`, 25 → `Z`, 26 → `AA`. */
export function spaltenName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/**
 * `YYYY-MM-DD` als Excel-Seriennummer.
 *
 * Excel zählt Tage ab dem 30.12.1899 — der Tag davor, weil Lotus 1-2-3 den
 * 29.02.1900 für echt hielt und Excel das aus Verträglichkeit übernommen
 * hat. Für jedes Datum nach dem März 1900 ergibt der 30.12. deshalb die
 * richtige Zahl. In UTC gerechnet, damit keine Zeitumstellung einen Tag
 * verschiebt.
 */
export function excelDatum(datum: string): number {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  const ms = Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, tag ?? 1) - Date.UTC(1899, 11, 30);
  return Math.round(ms / 86_400_000);
}

/** `HH:MM` oder `HH:MM:SS` als Bruchteil eines Tages — so speichert Excel Uhrzeiten. */
export function excelZeit(zeit: string): number {
  const [h, m] = zeit.split(":").map(Number);
  return ((h ?? 0) * 60 + (m ?? 0)) / 1440;
}

/**
 * Legt einen Rahmen um einen Bereich — aussen, nicht innen.
 *
 * Excel kennt keinen Rahmen „um einen Bereich"; jede Zelle trägt ihre
 * eigenen vier Kanten. Ein Kasten um B5:B6 heisst also: B5 oben/links/
 * rechts, B6 unten/links/rechts. Die Funktion setzt genau diese Kanten und
 * lässt alles andere am Stil der Zelle stehen — so lassen sich feine
 * Innenlinien (`rahmen`) und ein kräftiger Aussenrahmen kombinieren. Leere
 * Stellen im Bereich werden als leere Zellen angelegt, sonst hätte der
 * Rahmen dort eine Lücke.
 *
 * Zeilen und Spalten sind 0-basiert und einschliesslich.
 */
export function umrande(
  zeilen: Zeile[],
  bereich: { zeileVon: number; zeileBis: number; spalteVon: number; spalteBis: number },
  kante: Kante,
): void {
  for (let z = bereich.zeileVon; z <= bereich.zeileBis; z++) {
    const zeile = zeilen[z];
    if (!zeile) continue;
    for (let s = bereich.spalteVon; s <= bereich.spalteBis; s++) {
      const alt = zeile.zellen[s] ?? { wert: "" };
      const kanten = { ...alt.stil?.kanten };
      if (z === bereich.zeileVon) kanten.oben = kante;
      if (z === bereich.zeileBis) kanten.unten = kante;
      if (s === bereich.spalteVon) kanten.links = kante;
      if (s === bereich.spalteBis) kanten.rechts = kante;
      zeile.zellen[s] = { ...alt, stil: { ...alt.stil, kanten } };
    }
  }
}

function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Steuerzeichen ausser Tab/Zeilenumbruch sind in XML 1.0 unzulässig;
    // ein einziges davon aus einem Freitextfeld machte die Datei unlesbar.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/* ------------------------------------------------------------------ */
/* Stile                                                               */
/* ------------------------------------------------------------------ */

/**
 * Sammelt die verwendeten Stile und vergibt Indizes.
 *
 * Excel will Schriften, Füllungen, Rahmen und Zahlformate je in einer
 * eigenen Liste und eine Zelle verweist auf eine Kombination daraus
 * (`cellXfs`). Gleiches wird zusammengelegt, damit die Datei nicht für jede
 * Zelle einen eigenen Eintrag trägt.
 */
class StilTabelle {
  private schriften = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'];
  // Die ersten beiden Füllungen schreibt die Spezifikation vor.
  private fuellungen = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  private rahmen = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  private formate: string[] = [];
  private xfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  ];
  private merker = new Map<string, number>();

  index(stil: Stil | undefined): number {
    if (!stil) return 0;
    const schluessel = JSON.stringify(stil);
    const bekannt = this.merker.get(schluessel);
    if (bekannt !== undefined) return bekannt;

    const schrift = this.eintrag(this.schriften, schriftXml(stil));
    const fuellung = stil.fuellung
      ? this.eintrag(
          this.fuellungen,
          `<fill><patternFill patternType="solid"><fgColor rgb="FF${stil.fuellung}"/><bgColor indexed="64"/></patternFill></fill>`,
        )
      : 0;
    const rahmen = this.eintrag(this.rahmen, rahmenXml(stil));

    let zahl = stil.zahlformatId ?? 0;
    if (stil.zahlformat) {
      const i = this.formate.indexOf(stil.zahlformat);
      zahl = 164 + (i === -1 ? this.formate.push(stil.zahlformat) - 1 : i);
    }

    const ausrichtung =
      stil.umbruch || stil.waagrecht || stil.senkrecht
        ? `<alignment${stil.waagrecht ? ` horizontal="${stil.waagrecht}"` : ""}${
            stil.senkrecht ? ` vertical="${stil.senkrecht}"` : ""
          }${stil.umbruch ? ' wrapText="1"' : ""}/>`
        : "";

    const xf =
      `<xf numFmtId="${zahl}" fontId="${schrift}" fillId="${fuellung}" borderId="${rahmen}" xfId="0"` +
      `${zahl ? ' applyNumberFormat="1"' : ""}${schrift ? ' applyFont="1"' : ""}` +
      `${fuellung ? ' applyFill="1"' : ""}${rahmen ? ' applyBorder="1"' : ""}` +
      `${ausrichtung ? ` applyAlignment="1">${ausrichtung}</xf>` : "/>"}`;

    const index = this.xfs.push(xf) - 1;
    this.merker.set(schluessel, index);
    return index;
  }

  private eintrag(liste: string[], wert: string): number {
    const i = liste.indexOf(wert);
    return i === -1 ? liste.push(wert) - 1 : i;
  }

  xml(): string {
    const formate = this.formate.length
      ? `<numFmts count="${this.formate.length}">${this.formate
          .map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${xml(f)}"/>`)
          .join("")}</numFmts>`
      : "";
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      formate +
      `<fonts count="${this.schriften.length}">${this.schriften.join("")}</fonts>` +
      `<fills count="${this.fuellungen.length}">${this.fuellungen.join("")}</fills>` +
      `<borders count="${this.rahmen.length}">${this.rahmen.join("")}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles>' +
      "</styleSheet>"
    );
  }
}

function schriftXml(stil: Pick<Stil, "fett" | "kursiv" | "groesse" | "farbe"> & { durch?: boolean }, rich = false): string {
  // In einem Textlauf heisst der Schriftname `rFont`, in der Stiltabelle `name`.
  const name = rich ? '<rFont val="Calibri"/>' : '<name val="Calibri"/>';
  return (
    (rich ? "<rPr>" : "<font>") +
    (stil.fett ? "<b/>" : "") +
    (stil.kursiv ? "<i/>" : "") +
    (stil.durch ? "<strike/>" : "") +
    `<sz val="${stil.groesse ?? 11}"/>` +
    (stil.farbe ? `<color rgb="FF${stil.farbe}"/>` : "") +
    name +
    (rich ? "" : '<family val="2"/>') +
    (rich ? "</rPr>" : "</font>")
  );
}

const EXCEL_STAERKE = { duenn: "thin", mittel: "medium", dick: "thick" } as const;

function rahmenXml(stil: Stil): string {
  if (!stil.rahmen && !stil.kanten) {
    return "<border><left/><right/><top/><bottom/><diagonal/></border>";
  }
  const seite = (tag: string, name: Seite) => {
    const kante: Kante | undefined =
      stil.kanten?.[name] ?? (stil.rahmen ? { farbe: stil.rahmen } : undefined);
    return kante
      ? `<${tag} style="${EXCEL_STAERKE[kante.staerke ?? "duenn"]}"><color rgb="FF${kante.farbe}"/></${tag}>`
      : `<${tag}/>`;
  };
  // Reihenfolge links, rechts, oben, unten ist im Schema vorgeschrieben.
  return (
    "<border>" +
    seite("left", "links") +
    seite("right", "rechts") +
    seite("top", "oben") +
    seite("bottom", "unten") +
    "<diagonal/></border>"
  );
}

/* ------------------------------------------------------------------ */
/* Blätter                                                             */
/* ------------------------------------------------------------------ */

function zelleXml(zelle: Zelle, bezug: string, stile: StilTabelle): string {
  if (!zelle) return "";
  const s = stile.index(zelle.stil);
  const sAttr = s ? ` s="${s}"` : "";

  if (typeof zelle.wert === "number") {
    return `<c r="${bezug}"${sAttr}><v>${zelle.wert}</v></c>`;
  }

  if (typeof zelle.wert === "string") {
    return `<c r="${bezug}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${xml(zelle.wert)}</t></is></c>`;
  }

  /*
   * Textläufe tragen ihre Schrift selbst — ein Lauf ohne `rPr` fiele auf
   * die Standardschrift zurück und verlöre Farbe und Grösse der Zelle.
   */
  const grund = zelle.stil ?? {};
  const laeufe = zelle.wert
    .map(
      (lauf) =>
        `<r>${schriftXml(
          {
            fett: grund.fett || lauf.fett,
            kursiv: grund.kursiv || lauf.kursiv,
            groesse: lauf.groesse ?? grund.groesse,
            farbe: lauf.farbe ?? grund.farbe,
            durch: lauf.durchgestrichen,
          },
          true,
        )}<t xml:space="preserve">${xml(lauf.text)}</t></r>`,
    )
    .join("");
  return `<c r="${bezug}"${sAttr} t="inlineStr"><is>${laeufe}</is></c>`;
}

function blattXml(blatt: Blatt, stile: StilTabelle): string {
  const breite = Math.max(1, blatt.spalten.length);
  const letzteSpalte = spaltenName(breite - 1);

  const raster = blatt.rasterlinien === false ? ' showGridLines="0"' : "";
  const ansicht = blatt.fixierteZeilen
    ? `<sheetViews><sheetView${raster} workbookViewId="0"><pane ySplit="${blatt.fixierteZeilen}" topLeftCell="A${
        blatt.fixierteZeilen + 1
      }" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView${raster} workbookViewId="0"/></sheetViews>`;

  const spalten = `<cols>${blatt.spalten
    .map((b, i) => `<col min="${i + 1}" max="${i + 1}" width="${b}" customWidth="1"/>`)
    .join("")}</cols>`;

  const zeilen = blatt.zeilen
    .map((zeile, z) => {
      const nr = z + 1;
      const hoehe = zeile.hoehe ? ` ht="${zeile.hoehe}" customHeight="1"` : "";
      const zellen = zeile.zellen
        .map((zelle, s) => zelleXml(zelle, `${spaltenName(s)}${nr}`, stile))
        .join("");
      return `<row r="${nr}"${hoehe}>${zellen}</row>`;
    })
    .join("");

  const filter =
    blatt.filter && blatt.zeilen.length > 0
      ? `<autoFilter ref="A1:${letzteSpalte}${blatt.zeilen.length}"/>`
      : "";

  const verbunden = blatt.verbunden?.length
    ? `<mergeCells count="${blatt.verbunden.length}">${blatt.verbunden
        .map((b) => `<mergeCell ref="${b}"/>`)
        .join("")}</mergeCells>`
    : "";

  const fuss = blatt.fuss
    ? `<headerFooter><oddFooter>${xml(
        `&L${blatt.fuss.links ?? ""}&R${blatt.fuss.rechts ?? ""}`,
      )}</oddFooter></headerFooter>`
    : "";

  // `id` ist nullbasiert und der Umbruch liegt *über* dieser Zeile — also
  // genau die 1-basierte Nummer der Zeile davor.
  const umbrueche = blatt.seitenumbruchVor?.length
    ? `<rowBreaks count="${blatt.seitenumbruchVor.length}" manualBreakCount="${
        blatt.seitenumbruchVor.length
      }">${blatt.seitenumbruchVor
        .map((z) => `<brk id="${z - 1}" max="16383" man="1"/>`)
        .join("")}</rowBreaks>`
    : "";

  // Reihenfolge der Elemente ist im Schema festgelegt — vertauscht, meldet
  // Excel die Datei als beschädigt und „repariert" sie.
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetPr>${blatt.registerFarbe ? `<tabColor rgb="FF${blatt.registerFarbe}"/>` : ""}<pageSetUpPr fitToPage="1"/></sheetPr>` +
    ansicht +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    spalten +
    `<sheetData>${zeilen}</sheetData>` +
    filter +
    verbunden +
    '<printOptions horizontalCentered="1"/>' +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>' +
    `<pageSetup paperSize="9" orientation="${blatt.querformat ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="${blatt.aufEineSeite ? 1 : 0}"/>` +
    fuss +
    umbrueche +
    "</worksheet>"
  );
}

/* ------------------------------------------------------------------ */
/* Arbeitsmappe                                                        */
/* ------------------------------------------------------------------ */

/**
 * Blattnamen: höchstens 31 Zeichen, keines von `: \ / ? * [ ]`. Excel
 * verweigert sonst das Öffnen der ganzen Datei, nicht nur des Blatts.
 */
function blattName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Blatt";
}

export function baueXlsx(blaetter: Blatt[]): Uint8Array<ArrayBuffer> {
  const stile = new StilTabelle();
  const namen = blaetter.map((b) => blattName(b.name));
  const inhalte = blaetter.map((b) => blattXml(b, stile));

  const definiert: string[] = [];
  blaetter.forEach((b, i) => {
    const bezug = `'${namen[i]!.replace(/'/g, "''")}'`;
    if (b.filter && b.zeilen.length > 0) {
      definiert.push(
        `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xml(
          `${bezug}!$A$1:$${spaltenName(b.spalten.length - 1)}$${b.zeilen.length}`,
        )}</definedName>`,
      );
    }
    if (b.druckTitelZeilen) {
      definiert.push(
        `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xml(
          `${bezug}!$1:$${b.druckTitelZeilen}`,
        )}</definedName>`,
      );
    }
  });

  const dateien: [string, string][] = [
    [
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        blaetter
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join("") +
        "</Types>",
    ],
    [
      "_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    ],
    [
      "xl/workbook.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        "<bookViews><workbookView/></bookViews>" +
        `<sheets>${namen
          .map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
          .join("")}</sheets>` +
        (definiert.length ? `<definedNames>${definiert.join("")}</definedNames>` : "") +
        "</workbook>",
    ],
    [
      "xl/_rels/workbook.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        blaetter
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join("") +
        `<Relationship Id="rId${blaetter.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        "</Relationships>",
    ],
    ...inhalte.map((inhalt, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, inhalt]),
    // Zuletzt: die Stiltabelle ist erst vollständig, wenn alle Blätter
    // geschrieben sind.
    ["xl/styles.xml", stile.xml()],
  ];

  return zip(dateien.map(([name, inhalt]) => [name, new TextEncoder().encode(inhalt)]));
}

/* ------------------------------------------------------------------ */
/* ZIP (nur „stored")                                                  */
/* ------------------------------------------------------------------ */

const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE), wie ZIP sie verlangt. */
export function crc32(daten: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < daten.length; i++) c = CRC_TABELLE[(c ^ daten[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Ein ZIP-Archiv ohne Kompression: je Datei ein lokaler Kopf mit den
 * Daten, am Ende das zentrale Verzeichnis. Datum fest auf 1980-01-01 —
 * das früheste, das ZIP kennt; ein echtes Datum brächte nichts, und so ist
 * dieselbe Eingabe byte-gleich dieselbe Datei.
 */
function zip(dateien: [string, Uint8Array][]): Uint8Array<ArrayBuffer> {
  const lokal: Uint8Array[] = [];
  const zentral: Uint8Array[] = [];
  let versatz = 0;

  for (const [name, daten] of dateien) {
    const nameBytes = new TextEncoder().encode(name);
    const crc = crc32(daten);

    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(4, 20, true);
    kopf.setUint16(6, 0x0800, true); // Bit 11: Namen in UTF-8
    kopf.setUint16(8, 0, true); // stored
    kopf.setUint16(10, 0, true);
    kopf.setUint16(12, 0x21, true); // 1980-01-01
    kopf.setUint32(14, crc, true);
    kopf.setUint32(18, daten.length, true);
    kopf.setUint32(22, daten.length, true);
    kopf.setUint16(26, nameBytes.length, true);
    kopf.setUint16(28, 0, true);
    lokal.push(new Uint8Array(kopf.buffer), nameBytes, daten);

    const eintrag = new DataView(new ArrayBuffer(46));
    eintrag.setUint32(0, 0x02014b50, true);
    eintrag.setUint16(4, 20, true);
    eintrag.setUint16(6, 20, true);
    eintrag.setUint16(8, 0x0800, true);
    eintrag.setUint16(10, 0, true);
    eintrag.setUint16(12, 0, true);
    eintrag.setUint16(14, 0x21, true);
    eintrag.setUint32(16, crc, true);
    eintrag.setUint32(20, daten.length, true);
    eintrag.setUint32(24, daten.length, true);
    eintrag.setUint16(28, nameBytes.length, true);
    eintrag.setUint32(42, versatz, true);
    zentral.push(new Uint8Array(eintrag.buffer), nameBytes);

    versatz += 30 + nameBytes.length + daten.length;
  }

  const zentralLaenge = zentral.reduce((s, b) => s + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, zentralLaenge, true);
  ende.setUint32(16, versatz, true);

  const teile = [...lokal, ...zentral, new Uint8Array(ende.buffer)];
  const ergebnis = new Uint8Array(teile.reduce((s, b) => s + b.length, 0));
  let pos = 0;
  for (const teil of teile) {
    ergebnis.set(teil, pos);
    pos += teil.length;
  }
  return ergebnis;
}
