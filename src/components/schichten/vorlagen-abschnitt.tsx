"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { ZahlStepper } from "@/components/formular/zahl-stepper";
import { leererZustand, type FormZustand } from "@/lib/formular";
import { alsUhrzeit, WOCHENTAGE, type Vorlage } from "@/lib/schichten";
import type { Rolle } from "@/lib/team";
import type { Dictionary } from "@/i18n/de";

import { WochenRaster } from "./wochen-raster";

type Aktion = (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;

/**
 * Schichtvorlagen anlegen und die Woche im Überblick.
 *
 * Die Wochentage sind eine Mehrfachauswahl (seit 2026-10-06): je
 * gewähltem Tag entsteht eine eigene Vorlage, weil `schicht_vorlagen` nur
 * einen Tag je Zeile kennt. Mindestens ein Tag bleibt immer gewählt — der
 * letzte lässt sich nicht abwählen; der Server prüft dasselbe.
 *
 * Der Wochentag wird ausgewählt, nicht aus einem Datum abgeleitet — damit
 * die montagsbasierte Zählung (0 = Montag) gar nicht erst in die Nähe von
 * `Date.getDay()` kommt. Die Werte stammen aus `WOCHENTAGE`, dort steht
 * auch die Begründung.
 *
 * Ein Stift am Block im Wochenraster schaltet dasselbe Formular auf
 * „bearbeiten" um (vorbelegt, ein einzelner Tag — eine Vorlage ist eine
 * Zeile mit genau einem Tag). Der Zustand dafür lebt hier im Client, nicht
 * im Query-String: ein Abbrechen soll nichts neu laden.
 *
 * Getragen von Schritt 4 des Steppers und von `/dashboard/schichtvorlagen`.
 * Die Server Actions kommen als Prop herein — jede Oberfläche leitet
 * Session und Betrieb selbst ab, der Schreibweg darunter ist derselbe
 * (`src/lib/schichten-schreiben.ts`).
 */
export function VorlagenAbschnitt({
  rollen,
  vorlagen,
  texte,
  tagKurz,
  tagLang,
  anlegen: anlegenServer,
  bearbeiten: bearbeitenServer,
  entfernen: entfernenServer,
}: {
  rollen: readonly Rolle[];
  vorlagen: readonly Vorlage[];
  texte: Dictionary["stepper"]["schichten"];
  /** Wochentagsnamen, montagsbasiert (Index = `wochentag`-Wert). */
  tagKurz: readonly string[];
  tagLang: readonly string[];
  anlegen: Aktion;
  bearbeiten: Aktion;
  entfernen: Aktion;
}) {
  const [bearbeitet, setBearbeitet] = useState<Vorlage | null>(null);

  const [anlegen, anlegenAktion] = useActionState(anlegenServer, leererZustand);
  const [bearbeiten, bearbeitenAktion] = useActionState(
    async (vorher: FormZustand, formData: FormData) => {
      const ergebnis = await bearbeitenServer(vorher, formData);
      if (ergebnis.status === "erfolg") setBearbeitet(null);
      return ergebnis;
    },
    leererZustand,
  );
  const [entfernen, entfernenAktion] = useActionState(
    async (vorher: FormZustand, formData: FormData) => {
      const ergebnis = await entfernenServer(vorher, formData);
      // Wer die gerade bearbeitete Vorlage entfernt, braucht ihr Formular nicht mehr.
      if (ergebnis.status === "erfolg") {
        const weg = formData.get("vorlage_id");
        setBearbeitet((offen) => (offen?.id === weg ? null : offen));
      }
      return ergebnis;
    },
    leererZustand,
  );

  const rollenName = (id: string) => rollen.find((r) => r.id === id)?.name ?? texte.unbekannteRolle;

  /*
   * Fehler des Bearbeitens gehören zu der Vorlage, an der sie entstanden
   * sind. Wer abbricht und eine andere öffnet, soll die alten nicht sehen.
   */
  const bearbeitenFuerDiese =
    bearbeitet !== null && bearbeiten.werte?.["vorlage_id"] === bearbeitet.id
      ? bearbeiten
      : leererZustand;

  return (
    <>
      <section id="vorlage-formular" aria-labelledby="neue-vorlage" className="scroll-mt-6">
        <h2 id="neue-vorlage" className="font-display text-lg text-text">
          {bearbeitet ? texte.bearbeitenTitel : texte.anlegenTitel}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {bearbeitet ? texte.bearbeitenText : texte.anlegenText}
        </p>

        {entfernen.nachricht ? (
          <div className="mt-4">
            <FormMeldung art="fehler">{entfernen.nachricht}</FormMeldung>
          </div>
        ) : null}

        {bearbeitet ? (
          <VorlageFormular
            key={bearbeitet.id}
            vorlage={bearbeitet}
            zustand={bearbeitenFuerDiese}
            aktion={bearbeitenAktion}
            beiAbbrechen={() => setBearbeitet(null)}
            rollen={rollen}
            texte={texte}
            tagKurz={tagKurz}
            tagLang={tagLang}
          />
        ) : (
          <VorlageFormular
            key="neu"
            vorlage={null}
            zustand={anlegen}
            aktion={anlegenAktion}
            rollen={rollen}
            texte={texte}
            tagKurz={tagKurz}
            tagLang={tagLang}
          />
        )}
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
            beiBearbeiten={setBearbeitet}
            bearbeitetId={bearbeitet?.id ?? null}
            texte={texte}
            tagKurz={tagKurz}
            tagLang={tagLang}
          />
        )}
      </section>
    </>
  );
}

/**
 * Das eine Formular für beide Fälle. `vorlage === null` heisst anlegen
 * (Mehrfachauswahl der Tage), sonst bearbeiten (vorbelegt, ein Tag).
 *
 * Nach einem abgelehnten Absenden kommen die Eingaben aus `zustand.werte`
 * zurück — React setzt das Formular nach jeder Aktion zurück, und ohne die
 * Werte stünde dann wieder die alte Fassung da.
 */
function VorlageFormular({
  vorlage,
  zustand,
  aktion,
  beiAbbrechen,
  rollen,
  texte,
  tagKurz,
  tagLang,
}: {
  vorlage: Vorlage | null;
  zustand: FormZustand;
  aktion: (formData: FormData) => void;
  beiAbbrechen?: () => void;
  rollen: readonly Rolle[];
  texte: Dictionary["stepper"]["schichten"];
  tagKurz: readonly string[];
  tagLang: readonly string[];
}) {
  const werte = zustand.werte ?? {};
  const formular = useRef<HTMLFormElement>(null);

  /*
   * Der Stift sitzt unten im Wochenraster, das Formular oben. Ohne
   * Sprung sähe man nach dem Klick nichts passieren. Kein `smooth` —
   * `prefers-reduced-motion` gilt auch hier, und der Sprung ist kurz.
   */
  useEffect(() => {
    if (!vorlage) return;
    document.getElementById("vorlage-formular")?.scrollIntoView({ block: "start" });
    formular.current
      ?.querySelector<HTMLInputElement>("#vorlage-bezeichnung")
      ?.focus({ preventScroll: true });
  }, [vorlage]);

  const bedarfVon = (rolleId: string) =>
    vorlage?.bedarf.find((b) => b.rolleId === rolleId)?.mindestanzahl ?? 0;

  return (
    <>
      {zustand.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
        </div>
      ) : null}

      <form
        ref={formular}
        action={aktion}
        noValidate
        className={`mt-5 flex flex-col gap-5 rounded-card border bg-surface-sunk p-5 ${
          vorlage ? "border-signal" : "border-line"
        }`}
      >
        {vorlage ? <input type="hidden" name="vorlage_id" value={vorlage.id} /> : null}

        <TextFeld
          id="vorlage-bezeichnung"
          name="bezeichnung"
          label={texte.bezeichnung}
          maxLength={60}
          defaultValue={werte["bezeichnung"] ?? vorlage?.bezeichnung}
          fehler={zustand.felder["bezeichnung"]}
          hinweis={texte.bezeichnungHinweis}
        />

        {vorlage ? (
          <EinzelTagWahl
            texte={texte}
            tagKurz={tagKurz}
            tagLang={tagLang}
            gewaehlt={werte["wochentag"] ? Number(werte["wochentag"]) : vorlage.wochentag}
            fehler={zustand.felder["wochentag"]}
          />
        ) : (
          <WochentagWahl
            texte={texte}
            tagKurz={tagKurz}
            tagLang={tagLang}
            vorher={werte["wochentag"]}
            fehler={zustand.felder["wochentag"]}
          />
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextFeld
            id="vorlage-start"
            name="start_zeit"
            label={texte.beginn}
            defaultValue={werte["start_zeit"] ?? (vorlage ? alsUhrzeit(vorlage.start_zeit) : "09:00")}
            fehler={zustand.felder["start_zeit"]}
            hinweis="HH:MM"
          />
          <TextFeld
            id="vorlage-ende"
            name="end_zeit"
            label={texte.ende}
            defaultValue={werte["end_zeit"] ?? (vorlage ? alsUhrzeit(vorlage.end_zeit) : "17:00")}
            fehler={zustand.felder["end_zeit"]}
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
                  defaultValue={bedarfVon(rolle.id)}
                  fehler={zustand.felder[`bedarf_${rolle.id}`]}
                />
              </div>
            ))}
          </div>
        </fieldset>

        {vorlage ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AbsendenButton laufend={texte.speichernLaufend}>{texte.speichern}</AbsendenButton>
            <button
              type="button"
              onClick={beiAbbrechen}
              className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface"
            >
              {texte.abbrechen}
            </button>
          </div>
        ) : (
          <AbsendenButton laufend={texte.anlegenLaufend}>{texte.schichtHinzufuegen}</AbsendenButton>
        )}
      </form>
    </>
  );
}

/**
 * Ein einzelner Tag beim Bearbeiten — eine Vorlage ist eine Zeile mit
 * genau einem `wochentag`. Wer sie auf weitere Tage ausdehnen will, legt
 * dafür neue an.
 */
function EinzelTagWahl({
  texte,
  tagKurz,
  tagLang,
  gewaehlt,
  fehler,
}: {
  texte: Dictionary["stepper"]["schichten"];
  tagKurz: readonly string[];
  tagLang: readonly string[];
  gewaehlt: number;
  fehler: string | undefined;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-text">{texte.wochentagEinzeln}</legend>
      <div className="flex flex-wrap gap-2">
        {WOCHENTAGE.map((tag) => (
          <label key={tag.wert} className={TAG_KNOPF}>
            <input
              type="radio"
              name="wochentag"
              value={tag.wert}
              defaultChecked={tag.wert === gewaehlt}
              className="sr-only"
            />
            <span aria-hidden="true">{tagKurz[tag.wert]}</span>
            <span className="sr-only">{tagLang[tag.wert]}</span>
          </label>
        ))}
      </div>
      {fehler ? <p className="mt-2 text-sm font-medium text-stop">{fehler}</p> : null}
    </fieldset>
  );
}

const TAG_KNOPF =
  "cursor-pointer rounded-blk border border-line bg-surface px-3.5 py-2 text-sm text-text transition-colors " +
  "has-[:checked]:border-signal has-[:checked]:bg-signal-weak " +
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal";

/**
 * Mehrfachauswahl der Wochentage, mindestens einer.
 *
 * Gesteuert statt `defaultChecked`, damit der letzte gewählte Tag sich
 * nicht abwählen lässt: ein leeres Feld wäre ein Formular, das sicher
 * abgelehnt wird. Der Zustand überlebt auch das Zurücksetzen des
 * Formulars nach dem Anlegen — wer fünf Tage gewählt hat, legt die
 * nächste Schicht meist für dieselben an.
 */
function WochentagWahl({
  texte,
  tagKurz,
  tagLang,
  vorher,
  fehler,
}: {
  texte: Dictionary["stepper"]["schichten"];
  tagKurz: readonly string[];
  tagLang: readonly string[];
  /** Kommagetrennt aus `werte`, nach einem abgelehnten Absenden. */
  vorher: string | undefined;
  fehler: string | undefined;
}) {
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<number>>(() => {
    const tage = (vorher ?? "")
      .split(",")
      .filter((t) => t !== "")
      .map(Number)
      .filter((t) => Number.isInteger(t) && t >= 0 && t <= 6);
    return new Set(tage.length > 0 ? tage : [0]);
  });

  const umschalten = (wert: number) =>
    setGewaehlt((bisher) => {
      if (!bisher.has(wert)) return new Set([...bisher, wert]);
      if (bisher.size === 1) return bisher;
      const neu = new Set(bisher);
      neu.delete(wert);
      return neu;
    });

  return (
    <fieldset aria-describedby="vorlage-wochentag-hinweis">
      <legend className="mb-2 text-sm font-medium text-text">{texte.wochentag}</legend>
      <div className="flex flex-wrap gap-2">
        {WOCHENTAGE.map((tag) => (
          <label key={tag.wert} className={TAG_KNOPF}>
            <input
              type="checkbox"
              name="wochentag"
              value={tag.wert}
              checked={gewaehlt.has(tag.wert)}
              onChange={() => umschalten(tag.wert)}
              className="sr-only"
            />
            <span aria-hidden="true">{tagKurz[tag.wert]}</span>
            <span className="sr-only">{tagLang[tag.wert]}</span>
          </label>
        ))}
      </div>
      <p id="vorlage-wochentag-hinweis" className="mt-2 text-xs leading-relaxed text-muted">
        {texte.wochentagHinweis}
      </p>
      {fehler ? <p className="mt-2 text-sm font-medium text-stop">{fehler}</p> : null}
    </fieldset>
  );
}
