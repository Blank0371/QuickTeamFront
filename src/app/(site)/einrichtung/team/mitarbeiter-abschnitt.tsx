"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { WahlChip, WahlKnopf } from "@/components/formular/wahl";
import { leererZustand } from "@/lib/formular";
import type { Eingeladener, Rolle } from "@/lib/team";
import type { Dictionary } from "@/i18n/de";

import { mitarbeiterEinladen, mitarbeiterEntfernen, rolleUmschalten } from "./aktionen";
import { EntwurfsFelder } from "./entwurfs-felder";

/**
 * Mitarbeiter einladen und ihnen Rollen geben.
 *
 * Eine Einladung braucht E-Mail **oder** Telefon. Das ist keine
 * Formvorschrift, sondern die Bedingung, unter der `meine_einladungen()`
 * die Zeile später überhaupt findet — ohne beides entsteht ein Datensatz,
 * den niemand annehmen kann.
 *
 * Bearbeiten gibt es hier bewusst nicht, nur Entfernen und neu Anlegen:
 * `trg_mitarbeiter_spaltenschutz` ist BEFORE UPDATE, und die Regeln, die
 * er durchsetzt, gehören der App.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Rollenlisten, und das hat einen Grund.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `rollenNamen` sind **alle** Rollen des Schritts, auch die noch nicht
 * geschriebenen Entwürfe — sie stehen im Einladungsformular zur Auswahl,
 * damit man nicht erst weitergehen muss, um jemandem eine frisch
 * angelegte Rolle zu geben. Angehakt wird deshalb der Name; die ID
 * entsteht erst beim Abschicken, wenn `mitarbeiterEinladen()` die
 * Entwürfe schreibt.
 *
 * `bestehendeRollen` sind die, die schon eine ID haben. Nur sie
 * erscheinen als Umschalter an den bereits eingeladenen Personen: dieser
 * Weg schreibt sofort eine einzelne Zeile in `mitarbeiter_rollen` und
 * braucht die ID im selben Klick. Der Fall tritt ohnehin nur ein,
 * nachdem einmal eingeladen wurde — und dabei sind alle Entwürfe schon
 * geschrieben worden.
 */
export function MitarbeiterAbschnitt({
  rollenNamen,
  bestehendeRollen,
  entwuerfe,
  leute,
  texte,
}: {
  rollenNamen: readonly string[];
  bestehendeRollen: readonly Rolle[];
  entwuerfe: readonly string[];
  leute: readonly Eingeladener[];
  texte: Dictionary["stepper"]["team"];
}) {
  const [einladen, einladenAktion] = useActionState(mitarbeiterEinladen, leererZustand);
  const [entfernen, entfernenAktion] = useActionState(mitarbeiterEntfernen, leererZustand);
  const [umschalten, umschaltenAktion] = useActionState(rolleUmschalten, leererZustand);

  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["vorname", "nachname"]);
  const werte = einladen.werte ?? {};

  return (
    <section aria-labelledby="team-titel" className="mt-10 border-t border-line pt-8">
      <h2 id="team-titel" className="font-display text-lg text-text">
        {texte.einladenTitel}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {texte.einladenText}
      </p>

      {einladen.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{einladen.nachricht}</FormMeldung>
        </div>
      ) : null}
      {entfernen.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{entfernen.nachricht}</FormMeldung>
        </div>
      ) : null}
      {umschalten.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{umschalten.nachricht}</FormMeldung>
        </div>
      ) : null}

      <form
        action={einladenAktion}
        noValidate
        onBlur={beiVerlassen}
        className="mt-5 flex flex-col gap-5 rounded-card border border-line bg-surface-sunk p-5"
      >
        <EntwurfsFelder entwuerfe={entwuerfe} />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextFeld
            id="einladung-vorname"
            name="vorname"
            label={texte.vorname}
            autoComplete="off"
            maxLength={80}
            defaultValue={werte["vorname"]}
            fehler={fehlerFuer("vorname", einladen.felder)}
          />
          <TextFeld
            id="einladung-nachname"
            name="nachname"
            label={texte.nachname}
            autoComplete="off"
            maxLength={80}
            defaultValue={werte["nachname"]}
            fehler={fehlerFuer("nachname", einladen.felder)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextFeld
            id="einladung-email"
            name="email"
            type="email"
            label={texte.email}
            autoComplete="off"
            required={false}
            defaultValue={werte["email"]}
            fehler={einladen.felder["email"]}
            hinweis={texte.emailHinweis}
          />
          <TextFeld
            id="einladung-telefon"
            name="telefon"
            type="tel"
            label={texte.telefon}
            autoComplete="off"
            required={false}
            defaultValue={werte["telefon"]}
            fehler={einladen.felder["telefon"]}
            hinweis={texte.telefonHinweis}
          />
        </div>

        {/*
          Dieselben Felder wie beim Einladen im Dashboard
          (`anstellungs-felder.tsx`, dort stehen die Belege zu Umrechnung
          und Toleranz). Eingetragen werden Wochenstunden, gespeichert der
          Monatswert — die Umrechnung macht die Server Action.
        */}
        <div className="grid gap-5 sm:grid-cols-3">
          <TextFeld
            id="einladung-wochenstunden"
            name="wochenstunden"
            type="number"
            label={texte.wochenstunden}
            min={0}
            step="any"
            defaultValue={werte["wochenstunden"]}
            fehler={einladen.felder["soll_stunden"]}
            hinweis={texte.wochenstundenHinweis}
          />
          <TextFeld
            id="einladung-toleranz"
            name="toleranz_ueberstunden"
            type="number"
            label={texte.toleranz}
            min={0}
            step="any"
            defaultValue={werte["toleranz_ueberstunden"] ?? "0"}
            fehler={einladen.felder["toleranz_ueberstunden"]}
            hinweis={texte.toleranzHinweis}
          />
          <TextFeld
            id="einladung-urlaubstage"
            name="urlaubsanspruch_tage"
            type="number"
            label={texte.urlaubstage}
            min={0}
            step={1}
            defaultValue={werte["urlaubsanspruch_tage"] ?? "25"}
            fehler={einladen.felder["urlaubsanspruch_tage"]}
            hinweis={texte.urlaubstageHinweis}
          />
        </div>

        {rollenNamen.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">{texte.rollenLegende}</legend>
            {/* `gap-2.5`, weil die gewählte Karte um sechs Prozent wächst. */}
            <div className="flex flex-wrap gap-2.5">
              {rollenNamen.map((name) => (
                <WahlChip key={name} name="rollen" wert={name} beschriftung={name} />
              ))}
            </div>
          </fieldset>
        ) : null}

        <AbsendenButton laufend={texte.einladenLaufend}>{texte.einladen}</AbsendenButton>
      </form>

      {leute.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{texte.niemand}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {leute.map((person) => (
            <li
              key={person.id}
              className="rounded-card border border-line bg-surface-sunk p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text">
                    {person.vorname} {person.nachname}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {person.email ?? person.telefon}
                    {person.status === "eingeladen" ? texte.einladungOffen : ` · ${person.status}`}
                  </p>
                </div>

                <form action={entfernenAktion}>
                  <input type="hidden" name="mitarbeiter_id" value={person.id} />
                  <button
                    type="submit"
                    className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-stop"
                  >
                    {texte.entfernen}
                  </button>
                </form>
              </div>

              {bestehendeRollen.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {bestehendeRollen.map((rolle) => {
                    const an = person.rollen.includes(rolle.id);
                    return (
                      <form action={umschaltenAktion} key={rolle.id}>
                        <input type="hidden" name="mitarbeiter_id" value={person.id} />
                        <input type="hidden" name="rolle_id" value={rolle.id} />
                        <input type="hidden" name="an" value={an ? "0" : "1"} />
                        <WahlKnopf gewaehlt={an} beschriftung={rolle.name} />
                      </form>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
