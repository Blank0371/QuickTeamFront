import { readFile } from "node:fs/promises";
import path from "node:path";

import { promoCodeSeiteAktiv } from "@/lib/promo-code-seite";

/*
 * Buffer wird benutzt — also der Node-Runtime, nicht Edge. Die Antwort
 * baut aus einer Datei im Repo, deshalb dynamisch statt statisch gecacht.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Das Antragsformular ist der Werbepartner-Vertrag selbst — die
 * verbindliche Quelle liegt als Markdown unter `docs/rechtliches/legals/`
 * und wird an genau einer Stelle gepflegt. Der Vertrag ist zweisprachig
 * (Teil B deutsch, Teil C englisch) in **einer** Datei, deshalb gibt es
 * hier keine Sprachverzweigung mehr: das PDF enthält beide Fassungen, so
 * wie das Dokument.
 *
 * `next.config.ts` (`outputFileTracingIncludes`) sorgt dafür, dass die
 * Datei in die serverseitige Funktion mitgepackt wird — ohne den Eintrag
 * läge sie lokal vor, fehlte aber im Deployment.
 */
const DOKUMENT = path.join(
  process.cwd(),
  "docs/rechtliches/legals/Werbepartner-Vertrag-QuickTeam-de-en.md",
);

const DATEINAME = "QuickTeam-Werbepartner-Vertrag.pdf";

/**
 * Der Werbepartner-Vertrag als PDF zum Herunterladen, Ausfüllen und
 * Unterschreiben.
 *
 * Erreichbar nur bei `PROMO_CODE=an`; die Middleware sperrt sonst schon,
 * der 404 hier ist die zweite Ebene (wie bei `page.tsx`).
 *
 * **Ohne PDF-Bibliothek, bewusst.** Ein statisches PDF von Hand zu
 * schreiben scheitert an den Byte-Offsets der xref-Tabelle; eine
 * Abhängigkeit dafür aufzunehmen wäre auch für ein mehrseitiges Formular
 * zu viel. Stattdessen baut `bauePdf()` das Dokument zur Laufzeit und
 * berechnet die Offsets selbst — das ist der von Hand fehleranfällige
 * Teil, und genau deshalb wird er zur Laufzeit gezählt statt geraten.
 */
export async function GET(): Promise<Response> {
  if (!promoCodeSeiteAktiv()) {
    return new Response(null, { status: 404 });
  }

  const markdown = await readFile(DOKUMENT, "utf8");
  const zeilen = markdownZuZeilen(markdown);
  const pdf = bauePdf(zeilen);

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${DATEINAME}"`,
      "Cache-Control": "no-store",
    },
  });
}

/* ────────────────────────────────────────────────────────────────────
 *  Markdown → gesetzte Zeilen
 *
 *  Kein vollständiger Markdown-Parser, sondern genau das, was dieses
 *  Dokument benutzt: Überschriften, Blockzitat (Vorrang der deutschen
 *  Fassung), zweispaltige Tabellen (Teil A), Aufzählungen mit
 *  Ankreuzfeldern (Teil D), den Seitenumbruch-Marker und Fliesstext.
 *  Alles Weitere würde hier nur ungenutzt herumliegen.
 * ──────────────────────────────────────────────────────────────────── */

/** Eine noch nicht umbrochene Zeile mit Schrift, Grösse und Abständen (Punkte). */
type Zeile = {
  text: string;
  font: "F1" | "F2";
  groesse: number;
  /** Zusätzlicher Leerraum oberhalb, für Überschriften. */
  davor: number;
  /** Zusätzlicher Leerraum unterhalb. */
  danach: number;
  /**
   * Erzwingt vor dieser Zeile eine neue Seite. Trägt keinen Text.
   *
   * Nötig, weil dieses Dokument nicht nur gelesen, sondern ausgefüllt und
   * unterschrieben wird: eine Unterschriftszeile, die von ihrer
   * Ortsangabe durch einen Seitenumbruch getrennt ist, ist als Formular
   * unbrauchbar. Der Umbruch steht deshalb ausdrücklich im Markdown
   * (`<!-- seitenumbruch -->`) und nicht in einer Heuristik hier — wer
   * den Vertragstext ändert, sieht an der Quelle, wo eine Seite endet.
   */
  umbruch?: true;
};

const NORMAL = 10.5;

function markdownZuZeilen(markdown: string): Zeile[] {
  const zeilen: Zeile[] = [];
  const roh = markdown.replace(/\r\n/g, "\n").split("\n");

  for (const original of roh) {
    const linie = original.trimEnd();
    const getrimmt = linie.trim();

    // Leerzeile → kleiner Abstand, keine gesetzte Zeile.
    if (getrimmt === "") {
      zeilen.push({ text: "", font: "F1", groesse: NORMAL, davor: 0, danach: 4 });
      continue;
    }

    // Erzwungener Seitenumbruch (HTML-Kommentar, im Markdown unsichtbar).
    if (getrimmt === "<!-- seitenumbruch -->") {
      zeilen.push({
        text: "",
        font: "F1",
        groesse: NORMAL,
        davor: 0,
        danach: 0,
        umbruch: true,
      });
      continue;
    }

    // Trennlinie und harte Umbrüche: nur Abstand.
    if (getrimmt === "---" || getrimmt === "<br>") {
      zeilen.push({ text: "", font: "F1", groesse: NORMAL, davor: 0, danach: 8 });
      continue;
    }

    // Überschriften.
    const ueberschrift = /^(#{1,3})\s+(.*)$/.exec(getrimmt);
    if (ueberschrift) {
      const stufe = (ueberschrift[1] ?? "").length;
      const groesse = stufe === 1 ? 16 : stufe === 2 ? 13 : 11.5;
      zeilen.push({
        text: inlineText(ueberschrift[2] ?? ""),
        font: "F2",
        groesse,
        davor: stufe === 1 ? 4 : 12,
        danach: 6,
      });
      continue;
    }

    // Blockzitat (der Hinweis auf die verbindliche Sprachfassung).
    if (getrimmt.startsWith(">")) {
      const inhalt = getrimmt.replace(/^>\s?/, "");
      if (inhalt === "") {
        zeilen.push({ text: "", font: "F1", groesse: NORMAL, davor: 0, danach: 3 });
      } else {
        zeilen.push({
          text: inlineText(inhalt),
          font: inhalt.startsWith("**") ? "F2" : "F1",
          groesse: 9.5,
          davor: 0,
          danach: 2,
        });
      }
      continue;
    }

    // Tabellenzeile.
    if (getrimmt.startsWith("|")) {
      const zellen = getrimmt
        .split("|")
        .slice(1, -1)
        .map((z) => z.trim());
      // Trennzeile „| --- | --- |" überspringen.
      if (zellen.every((z) => /^:?-{2,}:?$/.test(z))) continue;
      const text = zellen.map(inlineText).filter(Boolean).join("   ");
      zeilen.push({ text, font: "F1", groesse: NORMAL, davor: 0, danach: 3 });
      continue;
    }

    // Ankreuzfeld.
    const kasten = /^[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(getrimmt);
    if (kasten) {
      zeilen.push({
        text: `[ ]  ${inlineText(kasten[2] ?? "")}`,
        font: "F1",
        groesse: NORMAL,
        davor: 2,
        danach: 3,
      });
      continue;
    }

    // Aufzählung.
    const punkt = /^[-*]\s+(.*)$/.exec(getrimmt);
    if (punkt) {
      zeilen.push({
        text: `•  ${inlineText(punkt[1] ?? "")}`,
        font: "F1",
        groesse: NORMAL,
        davor: 0,
        danach: 3,
      });
      continue;
    }

    // Gewöhnlicher Absatz.
    zeilen.push({
      text: inlineText(getrimmt),
      font: getrimmt.startsWith("**") ? "F2" : "F1",
      groesse: NORMAL,
      davor: 0,
      danach: 3,
    });
  }

  return zeilen;
}

/**
 * Inline-Auszeichnung entfernen — das PDF kann pro Zeile nur eine Schrift,
 * fett/kursiv mitten im Satz geht ohne Aufwand nicht. `**`, `*`, Backticks
 * und einfache Links werden auf ihren Text reduziert.
 */
function inlineText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*/g, "")
    .trim();
}

/* ────────────────────────────────────────────────────────────────────
 *  PDF-Bau (mehrseitig)
 * ──────────────────────────────────────────────────────────────────── */

const SEITE_B = 595; // A4-Breite in Punkten
const SEITE_H = 842; // A4-Höhe
const RAND = 56;
const OBEN = SEITE_H - RAND;
const UNTEN = RAND;
const BREITE = SEITE_B - 2 * RAND;

/** Ein positioniertes Textsegment auf einer Seite. */
type Segment = { x: number; y: number; font: "F1" | "F2"; groesse: number; text: string };

/**
 * WinAnsi-Zeichen jenseits von Latin-1 auf ihr Zielbyte abbilden. Ohne
 * das macht `Buffer.from(…, "latin1")` aus dem Geviertstrich (U+2014) das
 * Byte 0x14. Die Umlaute (ä ö ü ß …) und `§` liegen bei WinAnsi auf
 * denselben Bytes wie in Latin-1 und brauchen keine Abbildung.
 */
const WINANSI: Record<string, string> = {
  "€": "\x80", // €
  "‚": "\x82", // ‚
  "„": "\x84", // „
  "…": "\x85", // …
  "†": "\x86", // †
  "‰": "\x89", // ‰
  "‘": "\x91", // '
  "’": "\x92", // '
  "“": "\x93", // "
  "”": "\x94", // "
  "•": "\x95", // •
  "–": "\x96", // –
  "—": "\x97", // —
};

function nachWinAnsi(text: string): string {
  let out = "";
  for (const zeichen of text) {
    out += WINANSI[zeichen] ?? zeichen;
  }
  return out;
}

/** PDF-Strings müssen `\`, `(` und `)` maskieren. */
function maskiere(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Länge in Bytes bei Latin-1-Kodierung — Offsets zählen Bytes, nicht Zeichen. */
function byteLaenge(text: string): number {
  return Buffer.byteLength(text, "latin1");
}

/**
 * Grobe Textbreite in Punkten. Helvetica ist proportional; ein fester
 * Faktor je Zeichen genügt hier, weil er nur den Zeilenumbruch steuert
 * und nicht die Ausrichtung. Fett läuft minimal breiter.
 */
function breite(text: string, groesse: number, font: "F1" | "F2"): number {
  const faktor = font === "F2" ? 0.54 : 0.5;
  return text.length * groesse * faktor;
}

/** Zeile in mehrere umbrechen, damit sie in `BREITE` passt. */
function umbrich(text: string, groesse: number, font: "F1" | "F2"): string[] {
  if (text === "") return [""];
  if (breite(text, groesse, font) <= BREITE) return [text];

  const woerter = text.split(/\s+/);
  const ergebnis: string[] = [];
  let laufend = "";

  const schiebe = (wort: string) => {
    const kandidat = laufend === "" ? wort : `${laufend} ${wort}`;
    if (breite(kandidat, groesse, font) <= BREITE) {
      laufend = kandidat;
    } else {
      if (laufend !== "") ergebnis.push(laufend);
      laufend = wort;
    }
  };

  const maxZeichen = Math.max(1, Math.floor(BREITE / (groesse * (font === "F2" ? 0.54 : 0.5))));
  for (const wort of woerter) {
    // Ein einzelnes, zu langes Wort (z. B. eine Unterschriftslinie) hart brechen.
    if (breite(wort, groesse, font) > BREITE) {
      if (laufend !== "") {
        ergebnis.push(laufend);
        laufend = "";
      }
      for (let i = 0; i < wort.length; i += maxZeichen) {
        const teil = wort.slice(i, i + maxZeichen);
        if (i + maxZeichen >= wort.length) {
          laufend = teil;
        } else {
          ergebnis.push(teil);
        }
      }
    } else {
      schiebe(wort);
    }
  }
  if (laufend !== "") ergebnis.push(laufend);
  return ergebnis;
}

/** Zeilen in Seiten (Segmentlisten) umbrechen. */
function seitenAusZeilen(zeilen: Zeile[]): Segment[][] {
  const seiten: Segment[][] = [];
  let aktuell: Segment[] = [];
  let y = OBEN;

  const neueSeite = () => {
    seiten.push(aktuell);
    aktuell = [];
    y = OBEN;
  };

  for (const zeile of zeilen) {
    if (zeile.umbruch) {
      // Auf einer noch leeren Seite wäre der Umbruch eine Leerseite.
      if (aktuell.length > 0) neueSeite();
      continue;
    }

    y -= zeile.davor;
    const teile = umbrich(zeile.text, zeile.groesse, zeile.font);
    const zeilenhoehe = zeile.groesse * 1.4;

    for (const teil of teile) {
      if (y - zeilenhoehe < UNTEN && aktuell.length > 0) {
        neueSeite();
      }
      if (teil !== "") {
        aktuell.push({ x: RAND, y, font: zeile.font, groesse: zeile.groesse, text: teil });
      }
      y -= zeilenhoehe;
    }
    y -= zeile.danach;
  }

  if (aktuell.length > 0) seiten.push(aktuell);
  return seiten.length > 0 ? seiten : [[]];
}

function inhaltsstrom(segmente: Segment[]): string {
  return segmente
    .map(
      (s) =>
        `BT\n/${s.font} ${s.groesse} Tf\n1 0 0 1 ${s.x.toFixed(2)} ${s.y.toFixed(2)} Tm\n(${maskiere(
          nachWinAnsi(s.text),
        )}) Tj\nET\n`,
    )
    .join("");
}

function bauePdf(zeilen: Zeile[]): Buffer {
  const seiten = seitenAusZeilen(zeilen);

  /*
   * Objektreihenfolge, fest:
   *   1  Catalog
   *   2  Pages
   *   3  Font F1 (Helvetica)
   *   4  Font F2 (Helvetica-Bold)
   *   ab 5: je Seite ein Page-Objekt (5,7,9,…) und ein Contents-Objekt (6,8,10,…)
   */
  const ersteSeite = 5;
  const kids = seiten.map((_, i) => `${ersteSeite + i * 2} 0 R`).join(" ");

  const objekte: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${seiten.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  seiten.forEach((segmente, i) => {
    const inhaltsRef = ersteSeite + i * 2 + 1;
    objekte.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${SEITE_B} ${SEITE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${inhaltsRef} 0 R >>`,
    );
    const strom = inhaltsstrom(segmente);
    objekte.push(`<< /Length ${byteLaenge(strom)} >>\nstream\n${strom}endstream`);
  });

  let datei = "%PDF-1.4\n";
  const offsets: number[] = [];
  objekte.forEach((koerper, i) => {
    offsets.push(byteLaenge(datei));
    datei += `${i + 1} 0 obj\n${koerper}\nendobj\n`;
  });

  const xrefOffset = byteLaenge(datei);
  const anzahl = objekte.length + 1;
  datei += `xref\n0 ${anzahl}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    datei += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  datei += `trailer\n<< /Size ${anzahl} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(datei, "latin1");
}
