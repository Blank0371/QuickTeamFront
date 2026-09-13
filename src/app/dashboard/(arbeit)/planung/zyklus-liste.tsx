"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import {
  langesDatum,
  laufWirktHaengend,
  ZYKLUS_ERKLAERUNG,
  ZYKLUS_TEXT,
  type Zyklus,
} from "@/lib/dashboard/planung";
import { leererZustand } from "@/lib/formular";

import { planVeroeffentlichen, planVerwerfen, zyklusEntfernen } from "./aktionen";
import { SolverLauf } from "./solver-lauf";

function Knopf({
  text,
  art = "still",
}: {
  text: string;
  art?: "signal" | "still" | "stop";
}) {
  const { pending } = useFormStatus();
  const stil = {
    signal: "bg-signal text-signal-ink hover:bg-signal-hover",
    still: "border border-line text-text hover:bg-surface-sunk",
    stop: "border border-stop/50 text-stop hover:bg-stop/10",
  }[art];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`rounded-blk px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${stil}`}
    >
      {pending ? "…" : text}
    </button>
  );
}

/**
 * Die angelegten Zeiträume, neueste zuerst.
 *
 * Der Weg vom Zeitraum zum fertigen Plan hat mehrere Stationen, und
 * `status` ist die einzige Stelle, an der er ablesbar ist. Deshalb steht
 * neben jedem Zustand, was er bedeutet — „vorschlag_bereit" sagt einem
 * Wirt nichts, „Vorschlag liegt vor, noch nicht für das Team sichtbar"
 * schon.
 */
export function ZyklusListe({
  zyklen,
  offeneStellen,
  vorschlaege,
  solverZugang,
}: {
  zyklen: readonly Zyklus[];
  offeneStellen: Record<string, number>;
  /** Wie viele Zyklen gerade auf Freigabe warten — siehe `Freigabe`. */
  vorschlaege: number;
  /** Was der Browser braucht, um die Edge Function selbst zu rufen. */
  solverZugang: { url: string; token: string; anonKey: string };
}) {
  const [entfernen, entfernenAktion] = useActionState(zyklusEntfernen, leererZustand);

  if (zyklen.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Noch kein Zeitraum angelegt. Fang mit dem nächsten Monat an.
      </p>
    );
  }

  return (
    <>
      {entfernen.nachricht ? (
        <div className="mb-4">
          <FormMeldung art="fehler">{entfernen.nachricht}</FormMeldung>
        </div>
      ) : null}

      {vorschlaege > 0 ? <Freigabe anzahl={vorschlaege} /> : null}

      <ul className="flex flex-col gap-3">
        {zyklen.map((zyklus) => {
          const haengend = laufWirktHaengend(zyklus, zyklus.solverGestartetAm);
          const offen = offeneStellen[zyklus.id];

          return (
            <li
              key={zyklus.id}
              className="rounded-card border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    <time dateTime={zyklus.start}>{langesDatum(zyklus.start)}</time>
                    {" – "}
                    <time dateTime={zyklus.ende}>{langesDatum(zyklus.ende)}</time>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {haengend
                      ? "Der Lauf steht seit über zehn Minuten — vermutlich abgebrochen."
                      : ZYKLUS_ERKLAERUNG[zyklus.status]}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    zyklus.status === "veroeffentlicht"
                      ? "border-signal/60 bg-signal-weak text-text"
                      : zyklus.status === "vorschlag_bereit"
                        ? "border-dashed border-line-strong text-muted"
                        : "border-line text-muted"
                  }`}
                >
                  {ZYKLUS_TEXT[zyklus.status]}
                </span>
              </div>

              {typeof offen === "number" ? (
                <p
                  className={`mt-3 text-sm ${offen > 0 ? "text-stop" : "text-muted"}`}
                >
                  {offen > 0
                    ? `${offen} ${offen === 1 ? "Stelle blieb" : "Stellen blieben"} unbesetzt — es gab niemanden, der ohne Regelverstoss einspringen konnte.`
                    : "Alle Stellen besetzt."}
                </p>
              ) : null}

              {zyklus.solverFehler ? (
                <p className="mt-3 rounded-blk border border-stop/40 bg-stop/10 px-3 py-2 text-xs leading-relaxed text-text">
                  Beim letzten Planungslauf ist etwas schiefgegangen:{" "}
                  {zyklus.solverFehler}
                </p>
              ) : null}

              {/* Rechnen lässt sich nur, was noch nicht gerechnet wurde —
                  die Function weist alles andere mit 409 ab. Ein hängender
                  Lauf bekommt trotzdem einen Weg, siehe `SolverLauf`. */}
              {zyklus.status === "offen" ||
              zyklus.status === "deadline_erreicht" ||
              zyklus.status === "solver_laeuft" ? (
                <SolverLauf
                  zyklusId={zyklus.id}
                  laeuft={zyklus.status === "solver_laeuft"}
                  haengend={haengend}
                  funktionsUrl={solverZugang.url}
                  token={solverZugang.token}
                  anonKey={solverZugang.anonKey}
                />
              ) : null}

              {zyklus.status === "offen" ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <form action={entfernenAktion}>
                    <input type="hidden" name="zyklus_id" value={zyklus.id} />
                    <button
                      type="submit"
                      className="rounded-blk border border-stop/50 px-3 py-1.5 text-xs font-semibold text-stop transition-colors hover:bg-stop/10"
                    >
                      Zeitraum entfernen
                    </button>
                  </form>
                  <p className="text-xs text-muted">
                    Solange keine Schichten daran hängen.
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
    </ul>
    </>
  );
}

/**
 * Freigeben oder verwerfen — betriebsweit, nicht je Zeitraum.
 *
 * Steht deshalb **über** der Liste und nicht an einem einzelnen Eintrag:
 * `geplante_schichten_veroeffentlichen` und `_verwerfen` nehmen keine
 * Zyklus-ID, sondern greifen auf alles, was im Betrieb den Status
 * `geplant` beziehungsweise `vorschlag_bereit` trägt. Ein Knopf an einer
 * einzelnen Zeile würde vorspiegeln, er beträfe nur sie.
 *
 * Bei mehr als einem offenen Vorschlag steht die Zahl ausdrücklich da.
 */
function Freigabe({ anzahl }: { anzahl: number }) {
  const [frei, freiAktion] = useActionState(planVeroeffentlichen, leererZustand);
  const [weg, wegAktion] = useActionState(planVerwerfen, leererZustand);

  return (
    <section
      aria-labelledby="freigabe-titel"
      className="mb-6 rounded-panel border border-line-strong bg-surface p-5"
    >
      <h3 id="freigabe-titel" className="font-display text-base text-text">
        {anzahl === 1
          ? "Ein Vorschlag wartet auf dich"
          : `${anzahl} Vorschläge warten auf dich`}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Die Schichten stehen, sind aber für dein Team noch unsichtbar. Sieh sie dir
        im Kalender an — Entwürfe sind dort gestrichelt umrandet.
        {anzahl > 1
          ? " Freigeben und Verwerfen gelten für alle Vorschläge zugleich, nicht für einen einzelnen Zeitraum."
          : ""}
      </p>

      {frei.nachricht ? (
        <div className="mt-4">
          <FormMeldung art={frei.status === "erfolg" ? "erfolg" : "fehler"}>
            {frei.nachricht}
          </FormMeldung>
        </div>
      ) : null}
      {weg.nachricht ? (
        <div className="mt-4">
          <FormMeldung art={weg.status === "erfolg" ? "erfolg" : "fehler"}>
            {weg.nachricht}
          </FormMeldung>
        </div>
      ) : null}

      <form action={freiAktion} className="mt-4">
        <Knopf text="Plan freigeben" art="signal" />
      </form>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-muted transition-colors hover:text-text">
          Stattdessen verwerfen
        </summary>
        <form action={wegAktion} className="mt-3">
          <p className="text-xs leading-relaxed text-muted">
            Die geplanten Schichten werden gelöscht — und mit ihnen der Zeitraum, in
            dem sie entstanden sind. Zum Neuplanen legst du ihn wieder an.{" "}
            <strong className="text-text">Das lässt sich nicht rückgängig machen.</strong>
          </p>
          <label className="mt-3 flex items-start gap-2 text-xs text-text">
            <input type="checkbox" name="bestaetigt" value="ja" className="mt-0.5" />
            <span>Ja, den Vorschlag verwerfen.</span>
          </label>
          <div className="mt-3">
            <Knopf text="Verwerfen" art="stop" />
          </div>
        </form>
      </details>
    </section>
  );
}
