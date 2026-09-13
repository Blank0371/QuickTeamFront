import {
  CalendarDays,
  Clock,
  TreePalm,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Die Kennzahlenleiste über der Übersicht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Vier Zahlen, und jede muss aus vorhandenen Daten stammen.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Mockup (`docs/quickteam-dashboard-v2.html`) zeigt an dieser Stelle
 * „Heute im Einsatz / Offene Positionen / Urlaubsanträge / Diese Woche
 * 286 Stunden — 94 % der Sollstunden geplant". Die ersten drei kommen
 * aus dem, was die Seite ohnehin lädt. Die vierte nicht: sie bräuchte
 * die Schichten einer ganzen Woche plus die Summe der Sollstunden, und
 * die Übersicht lädt nur ein Drei-Tage-Fenster.
 *
 * Statt dafür eine zweite Abfrage aufzumachen — oder, schlimmer, eine
 * Zahl zu zeigen, die aus einem anderen Zeitraum stammt als ihre
 * Beschriftung behauptet — steht dort die Schichtzahl des Fensters, das
 * die Seite tatsächlich überblickt. Eine Kennzahl, die etwas anderes
 * misst als ihr Titel sagt, ist schlimmer als eine Kachel weniger.
 *
 * **Zahlen in Mono, Beschriftungen in Gabarito.** Das ist die Regel des
 * Dashboards und keine Zierde: die vier Kacheln stehen nebeneinander,
 * und mit proportionalen Ziffern sitzen die Werte optisch verschieden
 * tief in ihrer Zelle. Begründet an `schriften.ts`.
 */

export type Kennzahl = {
  schluessel: string;
  titel: string;
  /** Der grosse Wert. Als Zeichenkette, weil „11" und „—" beide vorkommen. */
  wert: string;
  /** Steht klein hinter dem Wert — „von 12", „Stunden". */
  einheit?: string;
  /** Die Zeile darunter, die den Wert einordnet. */
  fuss: string;
  icon: "team" | "kalender" | "urlaub" | "zeit";
};

const ICONS: Record<Kennzahl["icon"], LucideIcon> = {
  team: Users,
  kalender: CalendarDays,
  urlaub: TreePalm,
  zeit: Clock,
};

export function StatistikLeiste({ zahlen }: { zahlen: readonly Kennzahl[] }) {
  if (zahlen.length === 0) return null;

  return (
    <section aria-label="Kennzahlen">
      {/*
        Ein Raster, keine Flex-Reihe mit Trennlinien wie im Mockup: die
        Kachelzahl schwankt (Urlaubsanträge gibt es nur für Chefs), und
        senkrechte Trennstriche zwischen einer wechselnden Anzahl von
        Spalten sitzen sonst mal am Rand, mal daneben. Das Raster bricht
        von selbst um und braucht keinen Sonderfall.
      */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {zahlen.map((zahl) => {
          const Icon = ICONS[zahl.icon];
          return (
            <li
              key={zahl.schluessel}
              className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card sm:px-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-muted">{zahl.titel}</p>
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
              </div>

              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-medium leading-none text-text tabular-nums">
                  {zahl.wert}
                </span>
                {zahl.einheit ? (
                  <span className="text-sm text-muted">{zahl.einheit}</span>
                ) : null}
              </p>

              <p className="mt-2 text-xs leading-relaxed text-muted">{zahl.fuss}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
