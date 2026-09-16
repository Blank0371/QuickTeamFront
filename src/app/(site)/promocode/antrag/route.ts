import { leseSprache } from "@/i18n/sprache";
import { promoCodeSeiteAktiv } from "@/lib/promo-code-seite";

/*
 * Buffer wird benutzt — also der Node-Runtime, nicht Edge. Die Antwort
 * hängt am Sprach-Cookie, deshalb dynamisch statt statisch gecacht.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Das Antragsformular für die Promo-Partnerschaft als PDF.
 *
 * Erreichbar nur bei `PROMO_CODE=an`; die Middleware sperrt sonst schon,
 * der 404 hier ist die zweite Ebene (wie bei `page.tsx`).
 *
 * **Ohne PDF-Bibliothek, bewusst.** Ein statisches PDF von Hand zu
 * schreiben scheitert an den Byte-Offsets der xref-Tabelle; eine
 * Abhängigkeit dafür aufzunehmen wäre für ein einseitiges Formular zu
 * viel. Stattdessen baut `baueFormular()` das Dokument zur Laufzeit und
 * berechnet die Offsets selbst — das ist der Teil, der von Hand
 * fehleranfällig ist.
 */
export async function GET(): Promise<Response> {
  if (!promoCodeSeiteAktiv()) {
    return new Response(null, { status: 404 });
  }

  const sprache = await leseSprache();
  const pdf = baueFormular(sprache === "en" ? TEXT_EN : TEXT_DE);
  const dateiname =
    sprache === "en"
      ? "QuickTeam-Promo-Partner-Application.pdf"
      : "QuickTeam-Promo-Partner-Antrag.pdf";

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}

/* ────────────────────────────────────────────────────────────────────
 *  Inhalt des Formulars
 * ──────────────────────────────────────────────────────────────────── */

type FormularText = {
  titel: string;
  unterzeile: string;
  felder: string[];
  freitextFrage: string;
  ortDatum: string;
  unterschrift: string;
  einsenden: string;
  betreff: string;
};

const LINIE = "____________________________________________";

const TEXT_DE: FormularText = {
  titel: "QuickTeam - Antrag Promo-Partnerschaft",
  unterzeile: "Bitte vollständig ausfüllen, unterschreiben und einsenden.",
  felder: [
    "Name / Firma:",
    "Anschrift:",
    "E-Mail:",
    "Telefon:",
    "Website / Social Media:",
    "Gewünschter Promo-Code:",
  ],
  freitextFrage: "Wie und wo empfiehlst du QuickTeam weiter?",
  ortDatum: "Ort, Datum:",
  unterschrift: "Unterschrift:",
  einsenden: "Einsenden an: blanktrading@web.de",
  betreff: 'Betreff: "Request Promo Partnership"',
};

const TEXT_EN: FormularText = {
  titel: "QuickTeam - Promo Partnership Application",
  unterzeile: "Please fill in completely, sign and send it in.",
  felder: [
    "Name / Company:",
    "Address:",
    "Email:",
    "Phone:",
    "Website / Social media:",
    "Requested promo code:",
  ],
  freitextFrage: "How and where do you recommend QuickTeam?",
  ortDatum: "Place, date:",
  unterschrift: "Signature:",
  einsenden: "Send to: blanktrading@web.de",
  betreff: 'Subject: "Request Promo Partnership"',
};

/* ────────────────────────────────────────────────────────────────────
 *  PDF-Bau
 * ──────────────────────────────────────────────────────────────────── */

/** Ein Textsegment mit absoluter Position auf der A4-Seite (Punkte). */
type Segment = { x: number; y: number; font: "F1" | "F2"; groesse: number; text: string };

/**
 * PDF-Strings müssen `\`, `(` und `)` maskieren. Umlaute bleiben
 * unangetastet: bei `WinAnsiEncoding` deckt sich das Byte mit Latin-1
 * (ä=0xE4, ö=0xF6, ü=0xFC, ß=0xDF), und genau als Latin-1 wird die Datei
 * am Ende kodiert.
 */
function maskiere(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function baueFormular(t: FormularText): Buffer {
  const segmente: Segment[] = [];
  const links = 56;
  let y = 792;

  segmente.push({ x: links, y, font: "F2", groesse: 18, text: t.titel });
  y -= 24;
  segmente.push({ x: links, y, font: "F1", groesse: 10, text: t.unterzeile });
  y -= 40;

  for (const feld of t.felder) {
    segmente.push({ x: links, y, font: "F1", groesse: 11, text: `${feld}  ${LINIE}` });
    y -= 30;
  }

  y -= 6;
  segmente.push({ x: links, y, font: "F1", groesse: 11, text: t.freitextFrage });
  y -= 24;
  for (let i = 0; i < 3; i++) {
    segmente.push({ x: links, y, font: "F1", groesse: 11, text: LINIE + LINIE.slice(0, 8) });
    y -= 26;
  }

  y -= 14;
  segmente.push({ x: links, y, font: "F1", groesse: 11, text: `${t.ortDatum}  ${LINIE}` });
  y -= 44;
  segmente.push({ x: links, y, font: "F1", groesse: 11, text: `${t.unterschrift}  ${LINIE}` });

  y -= 60;
  segmente.push({ x: links, y, font: "F2", groesse: 11, text: t.einsenden });
  y -= 20;
  segmente.push({ x: links, y, font: "F2", groesse: 11, text: t.betreff });

  const inhalt = segmente
    .map(
      (s) =>
        `BT\n/${s.font} ${s.groesse} Tf\n1 0 0 1 ${s.x} ${s.y} Tm\n(${maskiere(s.text)}) Tj\nET\n`,
    )
    .join("");

  // Objekte in fester Reihenfolge; die Offsets werden beim Zusammenbau
  // gezählt, nicht geraten — das ist der ganze Grund, das zur Laufzeit zu tun.
  const objekte = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${byteLaenge(inhalt)} >>\nstream\n${inhalt}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

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

/** Länge in Bytes bei Latin-1-Kodierung — Offsets zählen Bytes, nicht Zeichen. */
function byteLaenge(text: string): number {
  return Buffer.byteLength(text, "latin1");
}
