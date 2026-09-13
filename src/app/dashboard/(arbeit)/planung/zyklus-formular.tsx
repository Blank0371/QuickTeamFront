"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Megaphone } from "lucide-react";

import { DatumWahl } from "@/components/formular/datum-wahl";
import { FormMeldung } from "@/components/formular/felder";
import { leererZustand } from "@/lib/formular";

import { erinnerungSenden, zyklusAnlegen } from "./aktionen";

function Absenden() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "…" : "Zeitraum anlegen"}
    </button>
  );
}

function ErinnernKnopf() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-blk border border-signal/40 bg-signal-weak px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-signal-weak/70 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Megaphone className="size-4" aria-hidden="true" />
      {pending ? "…" : "Erinnerung: Vorlieben eintragen"}
    </button>
  );
}

/**
 * Spiegel des „Send reminder"-Knopfs im `CreateShiftsModal` — nur
 * sichtbar, wenn schon ein Zyklus existiert. Beim allerersten Zeitraum
 * konnte niemand Wünsche eintragen, eine Erinnerung daran wäre sinnlos —
 * dieselbe Bedingung wie `hasPrevCycle` in `manager.tsx`.
 */
function ErinnerungFormular() {
  const [zustand, aktion] = useActionState(erinnerungSenden, leererZustand);

  return (
    <form action={aktion} className="flex flex-col items-start gap-2">
      {zustand.nachricht ? (
        <FormMeldung art={zustand.status === "erfolg" ? "erfolg" : "fehler"}>
          {zustand.nachricht}
        </FormMeldung>
      ) : null}
      <ErinnernKnopf />
    </form>
  );
}

/**
 * Neuer Planungszeitraum.
 *
 * Datumsfelder über `DatumWahl` statt `<input type="date">`. Der
 * übermittelte Wert bleibt `YYYY-MM-DD` — genau das Format, das
 * Postgres für `date` erwartet und das diese Server Action prüft.
 * Warum das native Feld weichen musste und was das kostet, steht in
 * `src/components/formular/datum-wahl.tsx`.
 *
 * Vorbelegt ist der Folgemonat. Wer etwas anderes will, ändert zwei
 * Felder; wer den Normalfall will, klickt einmal.
 */
export function ZyklusFormular({
  vorschlag,
  hatVorherigenZyklus,
}: {
  vorschlag: { start: string; ende: string };
  hatVorherigenZyklus: boolean;
}) {
  const [zustand, aktion] = useActionState(zyklusAnlegen, leererZustand);
  const ueberschneidung = zustand.felder["ueberschneidung"] === "ja";
  const frist = zustand.felder["frist"] === "ja";

  /*
    Nach einer Warnung stehen die eingegebenen Daten wieder da, nicht der
    Vorschlag: die Warnung nennt konkrete Datumsangaben, und ein Formular,
    das sie beim Anzeigen der Warnung verwirft, laesst jemanden das eine
    bestaetigen und das andere anlegen.
  */
  const werte = zustand.werte ?? {};

  return (
    <section
      aria-labelledby="neuer-zeitraum"
      className="rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id="neuer-zeitraum" className="font-display text-base text-text">
        Neuer Zeitraum
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Der Rahmen, für den geplant wird — üblicherweise ein Monat. Die Schichten
        entstehen daraus erst im nächsten Schritt.
      </p>

      {zustand.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
        </div>
      ) : null}

      <form action={aktion} className="mt-5 flex flex-col gap-4">
        {/*
          Drei `DatumWahl` statt drei `<input type="date">`. Der Wert
          geht unverändert als `YYYY-MM-DD` an dieselbe Server Action;
          `required` entfällt, weil ein verstecktes Feld die native
          Pflichtprüfung ohnehin nicht auslöst — die Prüfung lag hier
          schon immer auf dem Server („Der Beginn fehlt.").
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DatumWahl
            name="start"
            label="Beginn"
            defaultValue={werte["start"] ?? vorschlag.start}
            fehler={zustand.felder["start"]}
          />

          <DatumWahl
            name="ende"
            label="Ende"
            defaultValue={werte["ende"] ?? vorschlag.ende}
            fehler={zustand.felder["ende"]}
          />
        </div>

        {/*
          Die Frist ist optional und darf deshalb wieder geleert werden.
          Ihr Fehler hängt jetzt über `aria-describedby` am Feld — vorher
          stand dort nur der Hinweis, und die Fehlermeldung war zwar
          sichtbar, wurde aber nie angesagt.
        */}
        <DatumWahl
          name="deadline"
          label={
            <>
              Frist für Wünsche{" "}
              <span className="font-normal text-muted">(optional)</span>
            </>
          }
          defaultValue={werte["deadline"]}
          platzhalter="Keine Frist"
          loeschbar
          className="sm:max-w-xs"
          hinweis="Bis dahin kann dein Team Verfügbarkeiten und Wünsche eintragen. Ohne Angabe gilt der Beginn des Zeitraums."
          fehler={zustand.felder["deadline"]}
        />

        {ueberschneidung ? (
          <label className="flex items-start gap-2 rounded-blk border border-stop/40 bg-stop/10 px-4 py-3 text-sm text-text">
            <input type="checkbox" name="trotzdem" value="ja" className="mt-1" />
            <span>
              Ja, den Zeitraum trotz Überschneidung anlegen. Mir ist klar, dass für die
              gemeinsamen Tage doppelt Schichten entstehen können.
            </span>
          </label>
        ) : null}

        {/*
          Dieselbe Form wie die Überschneidung darüber, aber bewusst
          nicht dieselbe Farbe: eine laufende Frist ist kein Fehler und
          nichts Zerstörerisches — sie ist ein Hinweis, dass man noch
          warten könnte. Rot bleibt hier Fehlern vorbehalten. Die App
          setzt an dieser Stelle ebenfalls ihren Warnton, nicht ihr Rot;
          Rot trägt dort die Doppelt-Warnung.
        */}
        {frist ? (
          <label className="flex items-start gap-2 rounded-blk border border-signal/40 bg-signal-weak px-4 py-3 text-sm text-text">
            <input type="checkbox" name="frist_trotzdem" value="ja" className="mt-1" />
            <span>
              Ja, jetzt schon planen. Wünsche, die nach dem Absenden noch eingehen,
              fliessen in diesen Plan nicht mehr ein.
            </span>
          </label>
        ) : null}

        <div>
          <Absenden />
        </div>
      </form>

      {hatVorherigenZyklus ? (
        <div className="mt-5 border-t border-line pt-5">
          <ErinnerungFormular />
        </div>
      ) : null}
    </section>
  );
}
