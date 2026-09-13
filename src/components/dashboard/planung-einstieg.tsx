import { CalendarCheck2, CalendarPlus, Hourglass, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { langesDatum, type Zyklus } from "@/lib/dashboard/planung";

/**
 * Der Einstieg in die Schichtplanung, auf der Startseite.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das hier ein Einstieg ist und kein zweiter Auslöser.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die App hält es genauso: `(tabs)/index.tsx` zeigt auf der Startseite
 * eine Karte „Generierte Schichten prüfbereit" und schickt beim Tippen
 * nach `/manager`; der eigentliche Knopf „Schichten generieren" und der
 * Dialog dahinter leben dort. Am 2026-08-29 im Quelltext nachgesehen.
 *
 * Hier ist es aus demselben Grund so: `ZyklusFormular` und `SolverLauf`
 * stehen unter `/dashboard/planung`. Sie ein zweites Mal auf der
 * Startseite aufzubauen hiesse, zwei Formulare zu pflegen, die denselben
 * Zyklus anlegen — samt der Überschneidungswarnung, die
 * `planungszyklus_erstellen` nicht selbst mitbringt. Zwei Umsetzungen
 * derselben Warnung wären zwei Gelegenheiten, eine davon zu vergessen.
 *
 * Was die Startseite trägt, ist die Sichtbarkeit: dass es die Planung
 * gibt, dass gerade etwas läuft, und dass ein Vorschlag auf Prüfung
 * wartet. Vorher war das hinter einem Reiter verborgen.
 *
 * **Nur für Chefs.** `planungszyklen` ist eine Chef-Tabelle, und der
 * Bereich `/dashboard/planung` existiert für Angestellte gar nicht.
 */
export function PlanungEinstieg({
  zyklen,
  offeneStellen,
}: {
  zyklen: readonly Zyklus[];
  /** `planungszyklus_id` → offene Stellen. Fehlt für alles ausser `vorschlag_bereit`. */
  offeneStellen: Record<string, number>;
}) {
  const bereit = zyklen.filter((z) => z.status === "vorschlag_bereit");
  const laeuft = zyklen.filter((z) => z.status === "solver_laeuft");

  /*
   * Summiert über alle prüfbereiten Zyklen. `offene_stellen_pro_zyklus`
   * liefert **nur** Zeilen für `vorschlag_bereit`; eine fehlende Zahl
   * heisst deshalb nicht „alles besetzt", sondern „dazu gibt es gerade
   * nichts zu sagen". Genau deshalb wird sie nur an diesen Karten
   * gezeigt.
   */
  const unbesetzt = bereit.reduce((summe, z) => summe + (offeneStellen[z.id] ?? 0), 0);

  return (
    <section
      aria-labelledby="planung-einstieg"
      className="rounded-panel border border-line bg-surface p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="planung-einstieg"
          className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
        >
          Planung
        </h2>

        {/*
          Steht immer da, auch wenn nichts läuft — das war der Punkt:
          der Weg zum Schichtplan darf nicht erst erscheinen, wenn schon
          einer existiert.
        */}
        <Link
          href="/dashboard/planung"
          prefetch
          className="flex items-center gap-2 rounded-blk bg-signal px-3.5 py-2 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Schichtplan erstellen
        </Link>
      </div>

      {bereit.length === 0 && laeuft.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Aus deinen Schichtvorlagen entstehen die Dienste eines Zeitraums. Du legst den
          Zeitraum fest, das Rechenverfahren verteilt — freigegeben wird von dir.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {bereit.map((zyklus) => (
            <li key={zyklus.id}>
              <Link
                href="/dashboard/planung"
                prefetch
                className="flex items-center gap-3 rounded-blk border border-signal/60 bg-signal-weak px-3 py-2.5 transition-colors hover:border-signal"
              >
                <CalendarCheck2 className="size-5 shrink-0 text-signal" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">
                    Vorschlag prüfen
                  </span>
                  <span className="block text-xs text-muted">
                    {langesDatum(zyklus.start)} – {langesDatum(zyklus.ende)}
                  </span>
                </span>
                {(offeneStellen[zyklus.id] ?? 0) > 0 ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-stop">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    {offeneStellen[zyklus.id]} unbesetzt
                  </span>
                ) : null}
              </Link>
            </li>
          ))}

          {laeuft.map((zyklus) => (
            /*
             * Ohne Link: solange gerechnet wird, gibt es dort nichts zu
             * entscheiden. Ein Klickziel, hinter dem nur dieselbe
             * Auskunft noch einmal steht, ist eine Enttäuschung.
             */
            <li
              key={zyklus.id}
              className="flex items-center gap-3 rounded-blk border border-dashed border-line-strong px-3 py-2.5"
            >
              <Hourglass className="size-5 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-muted">
                  Wird geplant
                </span>
                <span className="block text-xs text-muted">
                  {langesDatum(zyklus.start)} – {langesDatum(zyklus.ende)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {unbesetzt > 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Unbesetzte Stellen sind kein Fehler des Verfahrens, sondern seine Auskunft: für
          diese Rollen war in dem Zeitraum niemand verfügbar.
        </p>
      ) : null}
    </section>
  );
}
