import Link from "next/link";

import type { OhneSollstunden } from "@/lib/dashboard/planung";

/**
 * Hinweis auf Mitarbeitende, die ohne `soll_stunden` in die Planung gehen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was tatsächlich passiert — am Solver-Quelltext abgelesen, nicht
 *  angenommen.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die naheliegende Vermutung wäre „ohne Sollstunden wird die Person
 * nicht eingeplant". Das stimmt **nicht**. `zulaessig()` in
 * `solver.ts:372-412` prüft Urlaub, Überschneidung, Ruhezeit, die
 * gesetzlichen Tages- und Wochengrenzen und `max_stunden_hart` — von
 * `soll_stunden` ist dort keine Rede. Wer keinen Sollwert hat, ist
 * vollständig einplanbar und bekommt Schichten.
 *
 * Es ändert sich nur die **Bewertung**, und zwar an zwei Stellen:
 *
 *   · `solver.ts:341/349` — `target = (soll_stunden ?? 0) × faktor`,
 *     also 0; als Normierung springt `FALLBACK_SOLL = 173` ein. Der
 *     Kommentar dort sagt es wörtlich: „a null soll still means 'no real
 *     target', so fairness degrades to gentle least-hours-first
 *     balancing rather than steering toward 173h."
 *   · `index.ts:265` und `manager.tsx:110` — die Überstundenrechnung
 *     zieht `soll_stunden ?? 0` von den gearbeiteten Stunden ab. Ohne
 *     Sollwert zählt damit **jede** gearbeitete Stunde eines
 *     abgerechneten Monats als Überstunde. Über
 *     `otPen = max(0, überstunden − toleranz)` (`solver.ts:351`) macht
 *     das die Person mit jedem Monat teurer und damit seltener
 *     eingeteilt.
 *
 * Der zweite Punkt greift erst, wenn unter Einstellungen eine
 * Abrechnungsperiode (`abrechnung_bis`) gesetzt ist — ohne sie summiert
 * die Rechnung überhaupt keine Monate auf. Deshalb steht er hier mit
 * dieser Bedingung und nicht als unbedingte Behauptung.
 *
 * **Deshalb wird nichts blockiert.** Ein Guard im Aufruf wäre falsch: es
 * gibt keinen Fehler abzufangen, und die Personen aus dem Lauf
 * herauszunehmen wäre eine eigenmächtige Änderung am Verhalten des
 * Solvers, der fremder Code ist.
 */
export function SollstundenWarnung({ leute }: { leute: readonly OhneSollstunden[] }) {
  if (leute.length === 0) return null;

  const mehrere = leute.length > 1;

  return (
    <div
      role="status"
      className="mt-6 rounded-panel border border-signal/40 bg-signal-weak px-4 py-3.5 sm:px-5"
    >
      <p className="text-sm font-semibold text-text">
        <span aria-hidden="true">⚠ </span>
        {mehrere
          ? `${leute.length} Mitarbeitende ohne Sollstunden:`
          : "Ein Mitarbeitender ohne Sollstunden:"}
      </p>

      <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        {leute.map((person, i) => (
          <li key={person.id} className="text-sm text-text">
            {person.name}
            {/*
              Der Zusatz bleibt: Eingeladene werden mitgeplant
              (`index.ts:184` sagt es ausdrücklich), und ohne den Hinweis
              wirkt ihr Auftauchen in dieser Liste wie ein Fehler.
            */}
            {person.status === "eingeladen" ? (
              <span className="text-muted"> (eingeladen)</span>
            ) : null}
            {i < leute.length - 1 ? <span className="text-muted">,</span> : null}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        {mehrere ? "Sie werden" : "Diese Person wird"} trotzdem eingeplant, aber ohne
        Ziel für eine gleichmässige Verteilung — sobald ein Abrechnungsstichtag gesetzt
        ist, kann das ihre Überstunden verfälschen. Bitte{" "}
        <Link
          href="/dashboard/team"
          className="font-semibold text-text underline underline-offset-4 hover:text-signal"
        >
          im Profil ergänzen
        </Link>
        .
      </p>
    </div>
  );
}
