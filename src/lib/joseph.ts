/**
 * Die Schalter für Joseph (`/dashboard/joseph`).
 *
 * Joseph soll einmal der Sekretär für Chefs werden. **Experimentell und
 * noch nicht umgesetzt** — es gibt kein Backend, keine Tabelle, keinen
 * Modellaufruf. Neue Produktentscheidung ohne Gegenstück in der Expo-App
 * (2026-09-24, auf Anweisung des Nutzers).
 *
 * Zwei Variablen, drei Zustände:
 *
 * | `JOSEPH_ENABLED` | `JOSEPH_SHOWOFF` | Zustand     | Wirkung                                  |
 * | ---------------- | ---------------- | ----------- | ---------------------------------------- |
 * | an               | beliebig         | `aktiv`     | Chat-Attrappe (Senden leert nur das Feld) |
 * | aus              | an               | `vorschau`  | „In Entwicklung"-Seite mit Kontaktadresse |
 * | aus              | aus              | `aus`       | kein Menüeintrag, Route liefert 404      |
 *
 * Wie `PROMO_CODE` (`src/lib/promo-code-seite.ts`) gilt ein Schalter nur
 * bei exakt „an" — fehlend, leer oder vertippt heisst „aus". Und wie dort
 * steuert derselbe Wert Route **und** Menüeintrag, kein zweiter
 * Mechanismus für die Sichtbarkeit.
 *
 * Kein `NEXT_PUBLIC_`-Präfix: das Layout liest serverseitig und reicht nur
 * den fertigen Menüeintrag an die Client-Inseln weiter.
 */

export type JosephZustand = "aus" | "vorschau" | "aktiv";

export const JOSEPH_PFAD = "/dashboard/joseph";

function schalterAn(wert: string | undefined): boolean {
  return wert?.trim().toLowerCase() === "an";
}

export function josephZustand(): JosephZustand {
  if (schalterAn(process.env.JOSEPH_ENABLED)) return "aktiv";
  if (schalterAn(process.env.JOSEPH_SHOWOFF)) return "vorschau";
  return "aus";
}
