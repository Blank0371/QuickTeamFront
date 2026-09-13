import { Container } from "@/components/container";
import {
  KartenSkelett,
  KopfSkelett,
  LadeAnsage,
} from "@/components/dashboard/skelett";

/**
 * Ladezustand für alle Bereiche unter `(arbeit)` ausser dem Kalender,
 * der eine eigene Form hat.
 *
 * **Warum die Datei in der Klammer-Gruppe liegt und nicht daneben.**
 * Next zieht die Suspense-Grenze um die Kinder des Layouts, in dessen
 * Segment die Datei steht. Hier ist das `(arbeit)/layout.tsx` — also
 * bleiben Kopfzeile und Sidebar stehen und nur die Fläche daneben füllt
 * sich mit dem Skelett. Läge die Datei unter `dashboard/`, ersetzte der
 * Ladezustand die ganze Schale samt Navigation, und jeder Wechsel
 * zwischen zwei Bereichen liesse die Sidebar kurz verschwinden.
 *
 * Der Fall, den das abdeckt, ist der häufigste überhaupt: der Wechsel
 * von einem Dashboard-Bereich zum nächsten. Das Layout ist dann längst
 * gerendert, nur die Seite fragt neu ab.
 *
 * Die Breite folgt den sieben Bereichen mit `max-w-3xl`; Übersicht und
 * Kalender sind breiter, aber der Unterschied fällt an einem Skelett
 * nicht auf — anders als ein Sprung der linken Kante, den es hier
 * ausdrücklich nicht gibt.
 */
export default function Laedt() {
  return (
    <Container className="py-8 sm:py-10">
      <LadeAnsage />
      <div className="w-full max-w-3xl">
        <KopfSkelett />
        <div className="mt-8 flex flex-col gap-4">
          <KartenSkelett />
          <KartenSkelett hoehe="h-16" />
          <KartenSkelett hoehe="h-16" />
        </div>
      </div>
    </Container>
  );
}
