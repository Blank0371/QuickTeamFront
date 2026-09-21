import Link from "next/link";

import type { RollenEimer } from "@/lib/dashboard/uebersicht";

/**
 * Nach Rolle filtern — ohne eine Zeile JavaScript.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Der Filter steht in der Adresse, nicht im Komponentenzustand.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Entscheidung wie beim Monatswechsel im Kalender, und aus
 * denselben Gründen: die Ansicht bleibt teilbar, überlebt einen Reload,
 * funktioniert ohne Skript, und die Seite bleibt eine Server Component.
 * Die Alternative — Zustand im Browser — verlangte, die Schichten des
 * Fensters ein zweites Mal als serialisierte Props über die Leitung zu
 * schicken, nur damit im Browser dieselbe Filterung noch einmal läuft.
 *
 * `prefetch` liegt auf jedem Knopf. Damit ist die gefilterte Ansicht
 * bereits geladen, bevor jemand klickt — der Roundtrip, den ein
 * serverseitiger Filter kostet, ist dann keiner mehr.
 *
 * **Der Wert ist der Rollenname selbst**, nicht ein Slug daraus.
 * `rollen` trägt `UNIQUE (betrieb_id, name)` ohne Normalisierung:
 * „Küche" und „Kueche" sind zwei erlaubte, verschiedene Rollen, und
 * jeder vernünftige Slug führte beide auf denselben Wert zusammen. Eine
 * unschöne Adresse ist besser als ein Filter, der zwei Rollen vermengt.
 */
export function RollenFilter({
  eimer,
  aktiv,
  gesamt,
  basis,
  alleLabel,
  ariaLabel,
}: {
  eimer: readonly RollenEimer[];
  /** Der gewählte Rollenwert, oder `null` für „Alle". */
  aktiv: string | null;
  /** Zuteilungen im ganzen Fenster — die Zahl neben „Alle". */
  gesamt: number;
  /** Route, auf der das Ergebnis landet — `/dashboard`. */
  basis: string;
  /** Beschriftung des „Alle"-Knopfs, sprachabhängig. */
  alleLabel: string;
  /** aria-label der Filterleiste, sprachabhängig. */
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      <Knopf href={basis} aktiv={aktiv === null} name={alleLabel} anzahl={gesamt} />

      {eimer.map((e) => (
        <Knopf
          key={e.wert}
          href={`${basis}?rolle=${encodeURIComponent(e.wert)}`}
          aktiv={aktiv === e.wert}
          name={e.name}
          anzahl={e.anzahl}
        />
      ))}
    </nav>
  );
}

function Knopf({
  href,
  aktiv,
  name,
  anzahl,
}: {
  href: string;
  aktiv: boolean;
  name: string;
  anzahl: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={aktiv ? "true" : undefined}
      className={`flex items-center gap-1.5 rounded-blk border px-2.5 py-1.5 text-sm font-medium transition-colors ${
        aktiv
          ? "border-signal bg-signal-weak text-text"
          : "border-line text-muted hover:border-line-strong hover:text-text"
      }`}
    >
      {name}
      {/*
        Die Zahl ist gedämpft und nicht fett: sie beantwortet „wie viele",
        aber gesucht wird nach dem Namen. Fett gesetzt zöge sie den Blick
        auf sich und machte die Leiste zur Statistik.
      */}
      <span className="font-mono text-xs text-muted">{anzahl}</span>
    </Link>
  );
}
