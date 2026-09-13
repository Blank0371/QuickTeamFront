import { Container } from "@/components/container";
import { Balken, LadeAnsage } from "@/components/dashboard/skelett";

/**
 * Ladezustand des Kalenders — eigenes Skelett, weil die Seite als
 * einzige ein Raster ist und nicht eine Reihe Karten.
 *
 * Sechs Wochenzeilen zu sieben Zellen, in derselben Mindesthöhe wie
 * `MonatsRaster` (`min-h-28`). Damit steht der Inhalt beim Einsetzen an
 * derselben Stelle, an der eben noch der Umriss war; ein Skelett, das
 * die Geometrie nur ungefähr trifft, erzeugt genau den Sprung, den es
 * verhindern soll.
 *
 * Nur ab `sm` sichtbar, weil das Raster selbst dort beginnt — darunter
 * zeigt der Kalender eine Tagesliste.
 */
export default function KalenderLaedt() {
  return (
    <Container className="py-8 sm:py-10">
      <LadeAnsage text="Dienstplan wird geladen" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Balken className="h-8 w-52 sm:h-9" />
          <Balken className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-1.5">
          <Balken className="h-9 w-9" />
          <Balken className="h-9 w-9" />
          <Balken className="h-9 w-36" />
        </div>
      </div>

      <div className="mt-6 hidden sm:block">
        <div className="grid grid-cols-7 border border-line">
          {Array.from({ length: 42 }, (_, i) => (
            <div key={i} className="min-h-28 border border-line p-1.5">
              <Balken className="h-5 w-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:hidden">
        <Balken className="h-4 w-32" />
        <Balken className="h-14 w-full" />
        <Balken className="h-14 w-full" />
      </div>
    </Container>
  );
}
