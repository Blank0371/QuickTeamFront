"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { ZahlStepper } from "@/components/formular/zahl-stepper";
import { leererZustand } from "@/lib/formular";
import { WOCHENTAGE, type Vorlage } from "@/lib/schichten";
import type { Rolle } from "@/lib/team";

import { vorlageAnlegen, vorlageEntfernen } from "./aktionen";
import { WochenRaster } from "./wochen-raster";

/**
 * Schichtvorlagen anlegen und die Woche im Überblick.
 *
 * Der Wochentag wird ausgewählt, nicht aus einem Datum abgeleitet — damit
 * die montagsbasierte Zählung (0 = Montag) gar nicht erst in die Nähe von
 * `Date.getDay()` kommt. Die Werte stammen aus `WOCHENTAGE`, dort steht
 * auch die Begründung.
 */
export function VorlagenAbschnitt({
  rollen,
  vorlagen,
}: {
  rollen: readonly Rolle[];
  vorlagen: readonly Vorlage[];
}) {
  const [anlegen, anlegenAktion] = useActionState(vorlageAnlegen, leererZustand);
  const [entfernen, entfernenAktion] = useActionState(vorlageEntfernen, leererZustand);

  const werte = anlegen.werte ?? {};
  const rollenName = (id: string) => rollen.find((r) => r.id === id)?.name ?? "unbekannt";

  return (
    <>
      <section aria-labelledby="neue-vorlage">
        <h2 id="neue-vorlage" className="font-display text-lg text-text">
          Schicht anlegen
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Eine Vorlage je Schicht und Wochentag. Nachtschichten über Mitternacht sind in
          Ordnung — trag einfach 22:00 bis 06:00 ein.
        </p>

        {anlegen.nachricht ? (
          <div className="mt-4">
            <FormMeldung art="fehler">{anlegen.nachricht}</FormMeldung>
          </div>
        ) : null}
        {entfernen.nachricht ? (
          <div className="mt-4">
            <FormMeldung art="fehler">{entfernen.nachricht}</FormMeldung>
          </div>
        ) : null}

        <form
          action={anlegenAktion}
          noValidate
          className="mt-5 flex flex-col gap-5 rounded-card border border-line bg-surface-sunk p-5"
        >
          <TextFeld
            id="vorlage-bezeichnung"
            name="bezeichnung"
            label="Bezeichnung"
            maxLength={60}
            defaultValue={werte["bezeichnung"]}
            fehler={anlegen.felder["bezeichnung"]}
            hinweis="Zum Beispiel Frühdienst, Abenddienst oder Küche spät."
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">Wochentag</legend>
            <div className="flex flex-wrap gap-2">
              {WOCHENTAGE.map((tag) => (
                <label
                  key={tag.wert}
                  className="cursor-pointer rounded-blk border border-line bg-surface px-3.5 py-2 text-sm text-text transition-colors has-[:checked]:border-signal has-[:checked]:bg-signal-weak"
                >
                  <input
                    type="radio"
                    name="wochentag"
                    value={tag.wert}
                    defaultChecked={
                      werte["wochentag"] === String(tag.wert) ||
                      (werte["wochentag"] === undefined && tag.wert === 0)
                    }
                    className="sr-only"
                  />
                  <span aria-hidden="true">{tag.kurz}</span>
                  <span className="sr-only">{tag.name}</span>
                </label>
              ))}
            </div>
            {anlegen.felder["wochentag"] ? (
              <p className="mt-2 text-sm font-medium text-stop">{anlegen.felder["wochentag"]}</p>
            ) : null}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextFeld
              id="vorlage-start"
              name="start_zeit"
              label="Beginn"
              defaultValue={werte["start_zeit"] ?? "09:00"}
              fehler={anlegen.felder["start_zeit"]}
              hinweis="HH:MM"
            />
            <TextFeld
              id="vorlage-ende"
              name="end_zeit"
              label="Ende"
              defaultValue={werte["end_zeit"] ?? "17:00"}
              fehler={anlegen.felder["end_zeit"]}
              hinweis="HH:MM"
            />
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-text">Mindestbesetzung</legend>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Wie viele Leute welcher Rolle müssen mindestens da sein? Ohne mindestens
              eine Angabe taucht die Schicht in der App nicht auf.
            </p>
            <div className="flex flex-col gap-3">
              {rollen.map((rolle) => (
                <div key={rolle.id} className="flex items-center justify-between gap-4">
                  <label htmlFor={`bedarf_${rolle.id}`} className="text-sm text-text">
                    {rolle.name}
                  </label>
                  <ZahlStepper
                    id={`bedarf_${rolle.id}`}
                    name={`bedarf_${rolle.id}`}
                    label={rolle.name}
                    min={0}
                    max={99}
                    fehler={anlegen.felder[`bedarf_${rolle.id}`]}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <AbsendenButton laufend="Wird angelegt …">Schicht hinzufügen</AbsendenButton>
        </form>
      </section>

      <section aria-labelledby="woche" className="mt-10 border-t border-line pt-8">
        <h2 id="woche" className="font-display text-lg text-text">
          Eure Woche
        </h2>

        {vorlagen.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Noch keine Schicht angelegt.</p>
        ) : (
          <WochenRaster
            vorlagen={vorlagen}
            rollenName={rollenName}
            entfernenAktion={entfernenAktion}
          />
        )}
      </section>
    </>
  );
}
