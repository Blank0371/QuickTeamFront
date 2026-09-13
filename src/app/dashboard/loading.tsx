import { Balken, LadeAnsage } from "@/components/dashboard/skelett";

/**
 * Ladezustand für den **kalten** Einstieg ins Dashboard.
 *
 * `(arbeit)/loading.tsx` greift erst, wenn das Layout darüber schon
 * steht — es umschliesst dessen Kinder. Beim ersten Aufruf einer
 * Dashboard-Adresse ist das Layout aber selbst noch nicht fertig:
 * `betreteDashboard()` prüft Anmeldung, Position und Sperre, und
 * solange das läuft, gibt es weder Sidebar noch Kopfzeile, an die sich
 * ein Skelett hängen könnte. Genau diese Lücke füllt diese Datei — sie
 * sitzt eine Ebene höher, ausserhalb der Klammer-Gruppe, und ihre
 * Suspense-Grenze liegt damit **über** dem Layout.
 *
 * Das ist auch der Grund, warum hier die Form der Schale nachgezeichnet
 * wird statt der Inhalt: was gleich erscheint, ist zuerst die Schale.
 * Es ist keine zweite Navigation — es sind graue Flächen ohne Ziele,
 * `aria-hidden`, und sie verschwinden, sobald die echte Sidebar steht.
 *
 * Sie deckt zusätzlich `/dashboard/wechseln` ab, das bewusst neben der
 * Gruppe liegt und deshalb von `(arbeit)/loading.tsx` nie erreicht wird.
 */
export default function DashboardLaedt() {
  return (
    <div className="flex flex-1 flex-col">
      <LadeAnsage text="Dashboard wird geladen" />

      <div className="border-b border-line bg-surface">
        <div className="flex w-full items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Balken className="h-8 w-8 shrink-0" />
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
            <div className="flex flex-col gap-1.5">
              <Balken className="h-3.5 w-28" />
              <Balken className="h-3 w-20" />
            </div>
          </div>
          <Balken className="h-8 w-20" />
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col lg:flex-row">
        <div className="border-b border-line bg-surface lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-stretch gap-1 px-5 py-3 sm:px-8 lg:flex-col lg:gap-1.5 lg:px-3 lg:py-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Balken key={i} className="h-9 w-24 shrink-0 lg:w-full" />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-3">
              <Balken className="h-8 w-56 sm:h-9" />
              <Balken className="h-4 w-full max-w-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
