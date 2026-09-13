/**
 * Bausteine für die Ladezustände des Dashboards.
 *
 * Ein Skelett statt eines Spinners, und das ist keine Geschmacksfrage:
 * jede Dashboard-Seite ist eine async Server Component mit mehreren
 * Abfragen gegen Supabase in eu-west-1. Bis die durch sind, stand hier
 * bisher **gar nichts** — kein Umriss, keine Kopfzeile, nichts. Ein
 * Spinner wäre die kleinere Verbesserung: er sagt „es passiert etwas",
 * ein Skelett sagt zusätzlich „und zwar genau hier". Der Sprung beim
 * Einsetzen der echten Inhalte fällt damit kleiner aus.
 *
 * `animate-pulse` ist die einzige Bewegung. `globals.css` schaltet unter
 * `prefers-reduced-motion: reduce` alle Animationen ab; das Skelett
 * bleibt dann als ruhige Fläche stehen und funktioniert weiter.
 */

/** Ein grauer Block in der Form dessen, was gleich dort steht. */
export function Balken({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-blk bg-surface-sunk ${className}`}
    />
  );
}

/**
 * Überschrift und Beileitsatz — die beiden Zeilen, mit denen jede
 * Dashboard-Seite beginnt.
 */
export function KopfSkelett() {
  return (
    <div className="flex flex-col gap-3">
      <Balken className="h-8 w-56 sm:h-9" />
      <Balken className="h-4 w-full max-w-md" />
    </div>
  );
}

/**
 * Eine Karte, wie sie in Team, Urlaub, Tausch, Notfall und Mitteilungen
 * reihenweise vorkommt.
 */
export function KartenSkelett({ hoehe = "h-24" }: { hoehe?: string }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <div className="flex flex-col gap-3">
        <Balken className="h-4 w-40" />
        <Balken className={`w-full ${hoehe}`} />
      </div>
    </div>
  );
}

/**
 * Der sichtbare Text für Screenreader. Das Skelett selbst ist
 * `aria-hidden` — eine Reihe leerer Kästen vorgelesen zu bekommen hilft
 * niemandem, die Auskunft „lädt" schon.
 */
export function LadeAnsage({ text = "Wird geladen" }: { text?: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
