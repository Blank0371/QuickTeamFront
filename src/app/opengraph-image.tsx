import { ImageResponse } from "next/og";

export const alt = "QuickTeam — Dienstplanung für Gastronomiebetriebe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Werte aus docs/Farbpalette.html.
const GRUND = "#16241c"; // Green Deep
const BONE = "#ede9e0"; // Primärtext auf Dunkel
const BRONZE = "#a8874f"; // Gold Bronze
const BRONZE_HI = "#d4b478"; // Bronze Light
const STONE = "#b3b8ae"; // Sekundärtext, auf Green Deep aufgehellt

/**
 * Wurzel-OG-Bild. Gilt für alle Routen, die kein eigenes definieren —
 * eigene kommen dazu, sobald die Seiten Inhalt haben.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: GRUND,
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: 68,
            }}
          >
            <div style={{ width: 68, height: 17, borderRadius: 9, background: BRONZE }} />
            <div
              style={{
                width: 49,
                height: 17,
                borderRadius: 9,
                background: BRONZE_HI,
                marginLeft: 19,
              }}
            />
            <div style={{ width: 38, height: 17, borderRadius: 9, background: BRONZE }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: BONE, letterSpacing: -1 }}>
            QuickTeam
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: BONE,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Der Dienstplan fürs Lokal — fertig, bevor die Küche zusperrt.
          </div>
          <div style={{ fontSize: 30, color: STONE, maxWidth: 820 }}>
            Schichtplanung für Gastronomiebetriebe in Österreich und Deutschland.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
