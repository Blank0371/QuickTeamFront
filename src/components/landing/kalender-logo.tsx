import Image from "next/image";

import gold10 from "./medien/kachel-gold-10.png";
import gold11 from "./medien/kachel-gold-11.png";
import gold12 from "./medien/kachel-gold-12.png";
import gruen00 from "./medien/kachel-green-00.png";
import gruen01 from "./medien/kachel-green-01.png";
import gruen02 from "./medien/kachel-green-02.png";
import gruen20 from "./medien/kachel-green-20.png";
import gruen21 from "./medien/kachel-green-21.png";
import rot22 from "./medien/kachel-red-22.png";
import rahmen from "./medien/kalender-rahmen.png";
import type { Kachelfarbe } from "./story-daten";
import { LOGO_BREITE, LOGO_HOEHE, LOGO_KACHELN } from "./story-daten";

const BILDER: Record<string, typeof rahmen> = {
  "00": gruen00,
  "01": gruen01,
  "02": gruen02,
  "10": gold10,
  "11": gold11,
  "12": gold12,
  "20": gruen20,
  "21": gruen21,
  "22": rot22,
};

/**
 * Das QuickTeam-Kalender-Logo, gebaut aus zehn eigenständigen Ebenen:
 * dem Rahmen (`kalender-rahmen.png`, aus dem Original-PNG mit
 * leergeräumten Kachelflächen) und neun einzeln zuschneidbaren Kacheln.
 * Alle zehn Ebenen sind Ausschnitte desselben Quellbilds — das Aussehen
 * bleibt damit exakt erhalten, es ist keine Neuzeichnung.
 *
 * `aktivFarben` bestimmt den *Standardzustand ohne JavaScript*: welche
 * Farbgruppen von Haus aus sichtbar sind. Für die animierte Fassung
 * überschreibt GSAP die Deckkraft jeder einzelnen Kachel zur Laufzeit —
 * der Server-Zustand muss trotzdem für sich allein korrekt sein, sonst
 * bricht die Seite ohne JavaScript oder bei reduzierter Bewegung.
 *
 * **Bewusst kein `filter: drop-shadow(...)` mehr auf diesem Wrapper.**
 * Ein CSS-Filter auf einem Element, dessen Kinder sich laufend ändern
 * (hier: neun Kacheln, deren Opacity/Scale bei jedem Scrub-Frame
 * animiert werden), zwingt den Browser, die gesamte gefilterte Fläche
 * bei jedem Frame neu zu rastern statt sie als Textur zu kompositieren
 * — das war die Hauptursache des gemeldeten Ruckelns am Logo. Das warme
 * Leuchten kommt jetzt stattdessen von den Glow-Ebenen der aufrufenden
 * Komponente (reine Hintergrund-Gradients ohne eigene animierte Kinder,
 * dadurch beliebig günstig).
 *
 * **`unoptimized`: die zehn Ebenen gehen bewusst nicht durch den
 * Bildoptimierer.** Am 2026-09-04 gemeldet und nachgestellt: in der
 * Kalender-Sequenz war das Logo unsichtbar, sichtbar blieben nur
 * Hintergrund und Versprechen-Text. Ursache war nicht GSAP — der
 * Wrapper hatte seine volle Box (574 × 536 px) und korrekte Deckkraft —,
 * sondern dass **keine einzige** der zehn Ebenen dekodiert war
 * (`naturalWidth === 0` bei allen 50 `img`-Elementen der Seite), während
 * jede Anfrage brav mit 200 beantwortet worden war.
 *
 * Genau darin liegt die Tücke: ein Optimierer im Pfad kann langsam sein,
 * ausfallen oder eine unbrauchbare Variante liefern, ohne dass ein
 * einziger DOM-Wert davon erzählt. Box, Opacity, Transform und
 * z-index sehen gesund aus, und das Bild ist trotzdem nicht da. Für das
 * zentrale Bildmotiv der Startseite ist das ein Einzelfehlerpunkt, den
 * es nicht geben darf.
 *
 * Der Optimierer gewinnt hier ohnehin nichts: es sind winzige
 * transparente PNG (Kacheln je ~3,4 kB, Rahmen 38 kB), bereits
 * zugeschnitten und bereits in der Zielgrösse. Mit `unoptimized` liefert
 * Next die Datei unverändert aus `_next/static/media` aus —
 * unveränderliche Hash-Dateinamen, dauerhaft cachebar, kein
 * `/_next/image`-Aufruf, keine Laufzeitabhängigkeit. Der Nebeneffekt
 * ist gemessen: vorher forderte der Browser jede 96-px-Kachel in
 * `w=3840` an.
 *
 * **Das gilt nur für diese zehn Ebenen**, nicht für die Website.
 * `next.config.ts` bleibt unangetastet, jedes künftige Bild läuft
 * weiterhin durch den Optimierer.
 *
 * Die Ebenentrennung bleibt vollständig erhalten — Rahmen und die neun
 * Kacheln sind weiterhin einzeln animierbar, daran ändert `unoptimized`
 * nichts.
 */
export function KalenderLogo({
  aktivFarben,
  animiert = false,
  prioritaet = false,
  className = "",
}: {
  aktivFarben: readonly Kachelfarbe[];
  animiert?: boolean;
  /** Das Logo steht im Hero immer im ersten Bildschirm, ist also der
   * wahrscheinlichste LCP-Kandidat auf dieser Seite. */
  prioritaet?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-kalender-logo
      className={`relative ${className}`}
      style={{ aspectRatio: `${LOGO_BREITE} / ${LOGO_HOEHE}` }}
    >
      <Image
        src={rahmen}
        alt=""
        fill
        priority={prioritaet}
        unoptimized
        data-logo-ebene="rahmen"
        sizes="(min-width: 1024px) 34rem, (min-width: 640px) 24rem, 16rem"
        className="object-contain"
      />

      {LOGO_KACHELN.map((kachel) => {
        // Nur Kacheln, die für diese Instanz auch wirklich aktiv sind,
        // bekommen die Animations-Markierung. Sonst würde GSAP beim
        // Aufdecken blind alle neun Kacheln sichtbar machen, auch die,
        // die für dieses Logo-Fragment (z. B. auf Mobil) unsichtbar
        // bleiben sollen.
        const istAktiv = aktivFarben.includes(kachel.cls);
        return (
        <div
          key={kachel.key}
          data-kachel={animiert && istAktiv ? kachel.key : undefined}
          data-kachel-farbe={animiert && istAktiv ? kachel.cls : undefined}
          className="absolute"
          style={{
            left: `${kachel.leftPct}%`,
            top: `${kachel.topPct}%`,
            width: `${kachel.wPct}%`,
            height: `${kachel.hPct}%`,
            opacity: istAktiv ? 1 : 0,
          }}
        >
          <Image
            src={BILDER[kachel.key]!}
            alt=""
            fill
            unoptimized
            data-logo-ebene={kachel.key}
            sizes="(min-width: 1024px) 6rem, 4rem"
            className="object-contain"
          />
        </div>
        );
      })}
    </div>
  );
}
