import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "QuickTeam — Schluss mit Schichtchaos. Dienstplan und Teamplaner für die Gastronomie.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * Ebene-1-Werte aus `globals.css`, als Zahl abgeschrieben — `ImageResponse`
 * kennt keine CSS-Variablen (wie `FARBE` in `plan-excel.ts`). Wer die
 * Palette ändert, ändert diese Zeilen mit.
 */
const CARBON = "#0d100e"; // --qt-c-carbon
const BONE = "#ede9e0"; // --qt-c-bone
const BRONZE_HI = "#d4b478"; // --qt-c-bronze-hi

const MARKE = "QuickTeam";
const CLAIM = "Schluss mit Schichtchaos.";

/**
 * Archivo als TTF von Google Fonts — Satori liest kein WOFF2, und
 * `next/font` legt nur WOFF2 ab. `text=` beschränkt die Datei auf die
 * benötigten Zeichen. Das Bild ist statisch und entsteht beim Build;
 * ist Google dort nicht erreichbar, fällt es auf Satoris eingebaute
 * Schrift zurück, statt den Build scheitern zu lassen.
 */
async function ladeArchivo(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Archivo:wght@700&text=${encodeURIComponent(text)}`,
    ).then((antwort) => antwort.text());
    const quelle = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!quelle) return null;
    const antwort = await fetch(quelle);
    return antwort.ok ? await antwort.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [archivo, logo] = await Promise.all([
    ladeArchivo(MARKE + CLAIM),
    readFile(join(process.cwd(), "public/logo.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: CARBON,
          fontFamily: archivo ? "Archivo" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori kennt nur <img> */}
          <img src={logoSrc} width={112} height={112} alt="" />
          <div style={{ fontSize: 112, fontWeight: 700, color: BONE, letterSpacing: -3 }}>
            {MARKE}
          </div>
        </div>
        <div style={{ fontSize: 60, fontWeight: 700, color: BRONZE_HI, letterSpacing: -1 }}>
          {CLAIM}
        </div>
      </div>
    ),
    {
      ...size,
      // `undefined` statt `[]`: ein leeres Feld ersetzte auch die Standardschrift.
      fonts: archivo ? [{ name: "Archivo", data: archivo, weight: 700, style: "normal" }] : undefined,
    },
  );
}
