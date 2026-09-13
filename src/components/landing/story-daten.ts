/**
 * Texte und Logo-Geometrie der Landingpage (`/`). Kein Import aus
 * `src/lib/site.ts` oder
 * `src/lib/dashboard/` — diese Seite bleibt vollständig entkoppelt und
 * gefahrlos löschbar.
 *
 * Die Erzählung baut nicht mehr einen generischen Schichtplan auf,
 * sondern das tatsächliche QuickTeam-Kalender-Logo selbst: Rahmen zuerst,
 * dann neun Kacheln in drei Farbgruppen. Die Koordinaten stammen aus
 * einer Pixel-Analyse des Quellbilds (`kalender-motiv.png`,
 * 1312 x 1199) und sind bewusst als Prozentwerte relativ zur
 * Bild-Leinwand gespeichert, nicht als Pixel — sie bleiben damit korrekt,
 * unabhängig davon, in welcher Größe das Logo gerendert wird.
 */

import type { Dictionary } from "@/i18n/de";

export type Kachelfarbe = "green" | "gold" | "red";

export type LogoKachel = {
  key: string;
  cls: Kachelfarbe;
  file: string;
  leftPct: number;
  topPct: number;
  wPct: number;
  hPct: number;
};

/**
 * Canvas des Rahmenbilds NACH dem harten Zuschnitt auf die sichtbare
 * Alpha-Fläche (Pillow `getbbox()`: `(0, 19, 1264, 1199)` im
 * ursprünglichen 1312x1199-Bild). Vorher lag rechts ein 48px, oben ein
 * 19px durchsichtiger Rand am Bild — bei `object-contain` wirkte das
 * Icon dadurch sichtbar nach links unten verschoben, egal wie die
 * Zentrierung außen gesetzt wurde. Alle Kachel-Prozentwerte unten sind
 * gegen dieses zugeschnittene Canvas neu berechnet, nicht gegen das
 * Originalbild — Rahmen und Kacheln teilen sich damit exakt eine
 * ViewBox.
 */
export const LOGO_BREITE = 1264;
export const LOGO_HOEHE = 1180;

/**
 * Neun Kacheln, drei Farbgruppen — nicht drei Reihen. Die untere Reihe
 * des Original-Icons hat zwei grüne und eine rote Kachel; die beiden
 * grünen gehören zur ersten (grünen) Gruppe, nur die eine rote zur
 * dritten. Rot bleibt dadurch, was das Palettendokument verlangt: ein
 * einzelner, gezielter Akzent, kein Drittel der Fläche.
 */
export const LOGO_KACHELN: readonly LogoKachel[] = [
  { key: "00", cls: "green", file: "kachel-green-00.png", leftPct: 24.367, topPct: 29.068, wPct: 16.693, hPct: 16.356 },
  { key: "01", cls: "green", file: "kachel-green-01.png", leftPct: 43.513, topPct: 29.068, wPct: 16.614, hPct: 16.356 },
  { key: "02", cls: "green", file: "kachel-green-02.png", leftPct: 62.579, topPct: 29.068, wPct: 16.693, hPct: 16.271 },
  { key: "10", cls: "gold", file: "kachel-gold-10.png", leftPct: 24.367, topPct: 47.711, wPct: 16.614, hPct: 16.271 },
  { key: "11", cls: "gold", file: "kachel-gold-11.png", leftPct: 43.434, topPct: 47.711, wPct: 16.693, hPct: 16.271 },
  { key: "12", cls: "gold", file: "kachel-gold-12.png", leftPct: 62.579, topPct: 47.711, wPct: 16.773, hPct: 16.271 },
  { key: "20", cls: "green", file: "kachel-green-20.png", leftPct: 24.367, topPct: 66.272, wPct: 16.693, hPct: 16.271 },
  { key: "21", cls: "green", file: "kachel-green-21.png", leftPct: 43.513, topPct: 66.272, wPct: 16.614, hPct: 16.187 },
  { key: "22", cls: "red", file: "kachel-red-22.png", leftPct: 62.579, topPct: 66.272, wPct: 16.773, hPct: 16.187 },
] as const;

export type Versprechen = {
  id: string;
  farbe: Kachelfarbe;
  titel: string;
  text: string;
};

/**
 * **Der Text steht seit dem 2026-09-10 im Wörterbuch**, hier bleibt nur
 * Struktur: welche Farbgruppe zu welchem Versprechen gehört und in
 * welcher Reihenfolge sie stehen.
 *
 * Die Datei bleibt damit, was ihr Kopfkommentar verspricht — ohne
 * Abhängigkeit zu `src/lib/` und gefahrlos löschbar. Das Wörterbuch ist
 * keine Ausnahme davon, sondern die Ebene, auf der jeder Text dieses
 * Projekts liegt; ein deutscher Satz hier wäre schlicht einsprachig.
 */

/**
 * Drei Versprechen, drei Farbgruppen. Grün trägt die Grundstruktur
 * (die meisten Kacheln, die ruhige Basis), Gold die Team-Ebene darüber,
 * Rot den einen gezielten Ausnahmefall — Inhalt und Farbe sind bewusst
 * aufeinander abgestimmt, nicht austauschbar.
 */
export function versprechen(t: Dictionary["versprechen"]): readonly Versprechen[] {
  return [
    { id: "plan", farbe: "green", titel: t.planTitel, text: t.planText },
    { id: "team", farbe: "gold", titel: t.teamTitel, text: t.teamText },
    { id: "notfall", farbe: "red", titel: t.notfallTitel, text: t.notfallText },
  ];
}

export type VersprechenKarte = {
  id: string;
  farbe: Kachelfarbe;
  titel: string;
  zeilen: readonly [string, string];
};

/**
 * Drei grössere Karten für die Abschlusssektion vor Pricing. Andere
 * Formulierung als `VERSPRECHEN` oben (dieselbe Farbreihenfolge, aber
 * eine Zusammenfassung statt einer wortgleichen Wiederholung der
 * Scroll-Sequenz).
 */
export function versprechenKarten(
  t: Dictionary["versprechenKarten"],
): readonly VersprechenKarte[] {
  return [
    { id: "klarheit", farbe: "green", titel: t.klarheitTitel, zeilen: [t.klarheitEins, t.klarheitZwei] },
    { id: "einfachheit", farbe: "gold", titel: t.einfachheitTitel, zeilen: [t.einfachheitEins, t.einfachheitZwei] },
    { id: "sichtbarkeit", farbe: "red", titel: t.sichtbarkeitTitel, zeilen: [t.sichtbarkeitEins, t.sichtbarkeitZwei] },
  ];
}
