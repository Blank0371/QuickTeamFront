"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { ZahlStepper } from "@/components/formular/zahl-stepper";
import { leererZustand } from "@/lib/formular";
import { WOCHENTAGE, type Vorlage } from "@/lib/schichten";
import type { Rolle } from "@/lib/team";
import type { Dictionary } from "@/i18n/de";

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
  texte,
  tagKurz,
  tagLang,
}: {
  rollen: readonly Rolle[];
  vorlagen: readonly Vorlage[];
  texte: Dictionary["stepper"]["schichten"];
  /** Wochentagsnamen, montagsbasiert (Index = `wochentag`-Wert). */
  tagKurz: readonly string[];
  tagLang: readonly string[];
}) {
  const [anlegen, anlegenAktion] = useActionState(vorlageAnlegen, leererZustand);
  const [entfernen, entfernenAktion] = useActionState(vorlageEntfernen, leererZustand);

  const werte = anlegen.werte ?? {};
  const rollenName = (id: string) => rollen.find((r) => r.id === id)?.name ?? texte.unbekannteRolle;

  return (
    <>
      <section aria-labelledby="neue-vorlage">
        <h2 id="neue-vorlage" className="font-display text-lg text-text">
          {texte.anlegenTitel}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {texte.anlegenText}
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
            label={texte.bezeichnung}
            maxLength={60}
            defaultValue={werte["bezeichnung"]}
            fehler={anlegen.felder["bezeichnung"]}
            hinweis={texte.bezeichnungHinweis}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">{texte.wochentag}</legend>
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
                  <span aria-hidden="true">{tagKurz[tag.wert]}</span>
                  <span className="sr-only">{tagLang[tag.wert]}</span>
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
              label={texte.beginn}
              defaultValue={werte["start_zeit"] ?? "09:00"}
              fehler={anlegen.felder["start_zeit"]}
              hinweis="HH:MM"
            />
            <TextFeld
              id="vorlage-ende"
              name="end_zeit"
              label={texte.ende}
              defaultValue={werte["end_zeit"] ?? "17:00"}
              fehler={anlegen.felder["end_zeit"]}
              hinweis="HH:MM"
            />
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-text">{texte.mindestbesetzung}</legend>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              {texte.mindestbesetzungText}
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

          <AbsendenButton laufend={texte.anlegenLaufend}>{texte.schichtHinzufuegen}</AbsendenButton>
        </form>
      </section>

      <section aria-labelledby="woche" className="mt-10 border-t border-line pt-8">
        <h2 id="woche" className="font-display text-lg text-text">
          {texte.wocheTitel}
        </h2>

        {vorlagen.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{texte.keineSchicht}</p>
        ) : (
          <WochenRaster
            vorlagen={vorlagen}
            rollenName={rollenName}
            entfernenAktion={entfernenAktion}
            texte={texte}
            tagKurz={tagKurz}
            tagLang={tagLang}
          />
        )}
      </section>
    </>
  );
}
