"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import type { Dictionary } from "@/i18n/de";
import { useKlientTexte } from "@/i18n/sprach-provider";
import { fuelle } from "@/i18n/text";
import { langesDatum, laufWirktHaengend, type Zyklus } from "@/lib/dashboard/planung";
import { leererZustand } from "@/lib/formular";

import { planVeroeffentlichen, planVerwerfen, zyklusEntfernen } from "./aktionen";
import { SolverLauf } from "./solver-lauf";

type Texte = Dictionary["planung"];

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
  texte: t,
}: {
  zyklen: readonly Zyklus[];
  offeneStellen: Record<string, number>;
  /** Wie viele Zyklen gerade auf Freigabe warten — siehe `Freigabe`. */
  vorschlaege: number;
  /** Was der Browser braucht, um die Edge Function selbst zu rufen. */
  solverZugang: { url: string; token: string; anonKey: string };
  texte: Texte;
}) {
  const { locale } = useKlientTexte();
  const [entfernen, entfernenAktion] = useActionState(zyklusEntfernen, leererZustand);

  if (zyklen.length === 0) {
    return <p className="text-sm leading-relaxed text-muted">{t.keinZeitraum}</p>;
  }

  return (
    <>
      {entfernen.nachricht ? (
        <div className="mb-4">
          <FormMeldung art="fehler">{entfernen.nachricht}</FormMeldung>
        </div>
      ) : null}

      {vorschlaege > 0 ? <Freigabe anzahl={vorschlaege} texte={t} /> : null}

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
                    <time dateTime={zyklus.start}>{langesDatum(zyklus.start, locale)}</time>
                    {" – "}
                    <time dateTime={zyklus.ende}>{langesDatum(zyklus.ende, locale)}</time>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {haengend ? t.haengtListe : t.erklaerung[zyklus.status]}
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
                  {t.status[zyklus.status]}
                </span>
              </div>

              {typeof offen === "number" ? (
                <p
                  className={`mt-3 text-sm ${offen > 0 ? "text-stop" : "text-muted"}`}
                >
                  {offen > 0
                    ? fuelle(offen === 1 ? t.unbesetztEins : t.unbesetztMehr, { n: offen })
                    : t.alleBesetzt}
                </p>
              ) : null}

              {zyklus.solverFehler ? (
                <p className="mt-3 rounded-blk border border-stop/40 bg-stop/10 px-3 py-2 text-xs leading-relaxed text-text">
                  {t.solverFehler} {zyklus.solverFehler}
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
                  texte={t}
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
                      {t.entfernen}
                    </button>
                  </form>
                  <p className="text-xs text-muted">{t.entfernenHinweis}</p>
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
function Freigabe({ anzahl, texte: t }: { anzahl: number; texte: Texte }) {
  const [frei, freiAktion] = useActionState(planVeroeffentlichen, leererZustand);
  const [weg, wegAktion] = useActionState(planVerwerfen, leererZustand);

  return (
    <section
      aria-labelledby="freigabe-titel"
      className="mb-6 rounded-panel border border-line-strong bg-surface p-5"
    >
      <h3 id="freigabe-titel" className="font-display text-base text-text">
        {anzahl === 1 ? t.vorschlagEins : fuelle(t.vorschlagMehr, { n: anzahl })}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t.vorschlagText}
        {anzahl > 1 ? t.vorschlagAlle : ""}
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
        <Knopf text={t.freigeben} art="signal" />
      </form>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-muted transition-colors hover:text-text">
          {t.stattdessenVerwerfen}
        </summary>
        <form action={wegAktion} className="mt-3">
          <p className="text-xs leading-relaxed text-muted">
            {t.verwerfenText}
            <strong className="text-text">{t.nichtRueckgaengig}</strong>
          </p>
          <label className="mt-3 flex items-start gap-2 text-xs text-text">
            <input type="checkbox" name="bestaetigt" value="ja" className="mt-0.5" />
            <span>{t.verwerfenBestaetigen}</span>
          </label>
          <div className="mt-3">
            <Knopf text={t.verwerfen} art="stop" />
          </div>
        </form>
      </details>
    </section>
  );
}
