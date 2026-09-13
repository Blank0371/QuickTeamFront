import { Gabarito } from "next/font/google";

/**
 * Gabarito — die Schrift der Landingpage und, seit dem 2026-09-07, auch
 * des Dashboards.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Datei nicht mehr unter `components/landing/` liegt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis hierher hiess sie `components/landing/schriften.ts`, der Export
 * `landingSchrift`, die Variable `--font-landing`, und der Kommentar
 * darüber sagte ausdrücklich: **nur hier**, die produktive Website sei
 * davon unberührt. Das stimmt nicht mehr — das Dashboard bindet
 * dieselbe Schrift ein. Ein Pfad, ein Name und ein Kommentar, die alle
 * drei „landing" behaupten, während zwei Bereiche importieren, sind
 * genau die Art stiller Drift, die man später als Tatsache liest.
 *
 * Umbenannt statt kopiert: zwei `Gabarito()`-Aufrufe erzeugen zwei
 * CSS-Variablen für dieselbe Datei, und spätestens beim nächsten
 * `subsets`- oder `display`-Wert driften sie auseinander.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was sie ersetzt — und was ausdrücklich nicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das Root-Layout lädt weiterhin alle drei bisherigen Rollen. Im
 * Dashboard übernimmt Gabarito davon **zwei**:
 *
 *   `--font-display`  Archivo          → Gabarito
 *   `--font-sans`     Inter            → Gabarito
 *   `--font-mono`     JetBrains Mono   → **bleibt**
 *
 * Mono bleibt, weil es dort keine Stilfrage ist. Uhrzeiten stehen im
 * Dienstplan spaltenweise untereinander — „08:00–15:00" über
 * „11:00–17:00" —, und das trägt allein die gleiche Ziffernbreite. Mit
 * einer proportionalen Schrift wandern die Doppelpunkte, und die Spalte
 * lässt sich nur noch lesen statt überfliegen. Die Begründung steht
 * ausführlich an `SchichtZeile` in `tages-plan.tsx`; Gabarito ist nicht
 * dicktengleich und kann sie nicht erfüllen.
 *
 * Die öffentliche Website (`(site)`) bleibt bei Archivo und Inter. Sie
 * war nicht Teil des Auftrags, und ein Schriftwechsel auf Seiten, deren
 * Rechtstexte noch Entwürfe sind, wäre eine Änderung ohne Anlass.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Variabler Schnitt statt fünf statischer Dateien
 * ─────────────────────────────────────────────────────────────────────
 *
 * Gabarito ist eine Variable Font mit der Achse `wght 400..900`.
 * `next/font/google` lädt damit genau **eine** Datei, die alle
 * verwendeten Gewichte trägt (400 Fliesstext, 500 Navigation, 600
 * Knöpfe und Zwischenüberschriften, 700 grosse Überschriften). Ein
 * `weight`-Array hätte fünf getrennte statische Instanzen geholt — mehr
 * Bytes und mehr Requests für weniger Möglichkeiten.
 *
 * Lizenz: SIL Open Font License 1.1, dieselbe Familie wie die drei
 * bisherigen Schriften. `next/font/google` lädt sie zur Buildzeit und
 * liefert sie aus `_next/static` aus — keine externe CSS-Import-Kette,
 * kein Laufzeit-Request zu fonts.googleapis.com.
 */
export const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
  // Ein Fallback mit angeglichenen Metriken hält den Schriftwechsel
  // layout-neutral, statt beim Swap die Zeilen springen zu lassen. Auf
  // der Landingpage ist die Wortmarke der LCP-Kandidat; im Dashboard
  // sind es die Kacheln des Dienstplans, die sonst nachrücken.
  adjustFontFallback: true,
});
