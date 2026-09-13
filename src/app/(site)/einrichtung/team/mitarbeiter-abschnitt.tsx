"use client";

import { useActionState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { WahlChip, WahlKnopf } from "@/components/formular/wahl";
import { leererZustand } from "@/lib/formular";
import type { Eingeladener, Rolle } from "@/lib/team";

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
}: {
  rollenNamen: readonly string[];
  bestehendeRollen: readonly Rolle[];
  entwuerfe: readonly string[];
  leute: readonly Eingeladener[];
}) {
  const [einladen, einladenAktion] = useActionState(mitarbeiterEinladen, leererZustand);
  const [entfernen, entfernenAktion] = useActionState(mitarbeiterEntfernen, leererZustand);
  const [umschalten, umschaltenAktion] = useActionState(rolleUmschalten, leererZustand);

  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["vorname", "nachname"]);
  const werte = einladen.werte ?? {};

  return (
    <section aria-labelledby="team-titel" className="mt-10 border-t border-line pt-8">
      <h2 id="team-titel" className="font-display text-lg text-text">
        Mitarbeiter einladen
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Optional — ein Betrieb, in dem vorerst nur du arbeitest, ist völlig in Ordnung.
        Eingeladene bekommen Zugang, sobald sie die App öffnen und die Einladung annehmen.
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
            label="Vorname"
            autoComplete="off"
            maxLength={80}
            defaultValue={werte["vorname"]}
            fehler={fehlerFuer("vorname", einladen.felder)}
          />
          <TextFeld
            id="einladung-nachname"
            name="nachname"
            label="Nachname"
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
            label="E-Mail-Adresse"
            autoComplete="off"
            required={false}
            defaultValue={werte["email"]}
            fehler={einladen.felder["email"]}
            hinweis="E-Mail oder Telefon — eins von beiden muss sein."
          />
          <TextFeld
            id="einladung-telefon"
            name="telefon"
            type="tel"
            label="Telefonnummer"
            autoComplete="off"
            required={false}
            defaultValue={werte["telefon"]}
            fehler={einladen.felder["telefon"]}
            hinweis="International mit +, z. B. +43 660 1234567 — sonst findet die App die Einladung nicht."
          />
        </div>

        {rollenNamen.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">Rollen</legend>
            {/* `gap-2.5`, weil die gewählte Karte um sechs Prozent wächst. */}
            <div className="flex flex-wrap gap-2.5">
              {rollenNamen.map((name) => (
                <WahlChip key={name} name="rollen" wert={name} beschriftung={name} />
              ))}
            </div>
          </fieldset>
        ) : null}

        <AbsendenButton laufend="Wird eingeladen …">Einladen</AbsendenButton>
      </form>

      {leute.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Noch niemand eingeladen.</p>
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
                    {person.status === "eingeladen" ? " · Einladung offen" : ` · ${person.status}`}
                  </p>
                </div>

                <form action={entfernenAktion}>
                  <input type="hidden" name="mitarbeiter_id" value={person.id} />
                  <button
                    type="submit"
                    className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-stop"
                  >
                    Entfernen
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
