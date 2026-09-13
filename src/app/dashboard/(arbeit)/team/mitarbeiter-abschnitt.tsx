"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { WahlChip, WahlKnopf } from "@/components/formular/wahl";
import {
  darfStatusAendern,
  SETZBARE_STATUS,
  STATUS_ERKLAERUNG,
  STATUS_TEXT,
  type Rolle,
  type TeamMitglied,
} from "@/lib/dashboard/team";
import { leererZustand, type FormZustand } from "@/lib/formular";

import {
  anonymisieren,
  anstellungSpeichern,
  einladungZuruecknehmen,
  mitarbeiterEinladen,
  rolleUmschalten,
  statusSetzen,
} from "./aktionen";
import { AnstellungsFelder } from "./anstellungs-felder";

function Knopf({
  text,
  art = "still",
  klein = false,
}: {
  text: string;
  art?: "signal" | "still" | "stop";
  klein?: boolean;
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
      className={`shrink-0 rounded-blk font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
        klein ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${stil}`}
    >
      {pending ? "…" : text}
    </button>
  );
}

/**
 * Das Team im laufenden Betrieb.
 *
 * Anders als im Wizard steht hier der Bestand im Vordergrund und das
 * Einladen daneben: nach der Einrichtung kommt selten jemand dazu, aber
 * ständig ändert sich etwas an denen, die schon da sind.
 *
 * Bearbeiten gibt es weiterhin nicht — `trg_mitarbeiter_spaltenschutz`
 * ist BEFORE UPDATE und liesse einen Chef zwar alles ändern, aber Namen
 * und Adresse einer Person zu überschreiben, die sich damit angemeldet
 * hat, bricht ihre Verknüpfung zur Einladung. Wer sich vertippt hat,
 * nimmt die Einladung zurück und lädt neu ein.
 */
export function MitarbeiterAbschnitt({
  team,
  rollen,
  eigeneId,
}: {
  team: readonly TeamMitglied[];
  rollen: readonly Rolle[];
  eigeneId: string;
}) {
  const [einladen, einladenAktion] = useActionState(mitarbeiterEinladen, leererZustand);
  const [rolleAktion, rolleAbsenden] = useActionState(rolleUmschalten, leererZustand);
  const [status, statusAktion] = useActionState(statusSetzen, leererZustand);
  const [zurueck, zurueckAktion] = useActionState(einladungZuruecknehmen, leererZustand);
  const [anon, anonAktion] = useActionState(anonymisieren, leererZustand);
  const [anstellung, anstellungAktion] = useActionState(anstellungSpeichern, leererZustand);

  const aktiveRollen = rollen.filter((rolle) => rolle.aktiv);
  const rollenName = new Map(rollen.map((rolle) => [rolle.id, rolle.name]));

  return (
    <section aria-labelledby="team-titel" className="mt-12">
      <h2 id="team-titel" className="font-display text-lg text-text">
        Team
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {team.length === 1
          ? "Ausser dir ist noch niemand hier."
          : `${team.length} Personen, dich eingerechnet.`}
      </p>

      {[einladen, rolleAktion, status, zurueck, anon].map((zustand, i) =>
        zustand.nachricht ? (
          <div key={i} className="mt-4">
            <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
          </div>
        ) : null,
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {team.map((person) => (
          <PersonZeile
            key={person.id}
            person={person}
            rollen={aktiveRollen}
            rollenName={rollenName}
            eigeneId={eigeneId}
            rolleAbsenden={rolleAbsenden}
            statusAktion={statusAktion}
            zurueckAktion={zurueckAktion}
            anonAktion={anonAktion}
            anstellungAktion={anstellungAktion}
            anstellungZustand={anstellung}
          />
        ))}
      </ul>

      <Einladen
        aktion={einladenAktion}
        zustand={einladen}
        rollen={aktiveRollen}
      />
    </section>
  );
}

function PersonZeile({
  person,
  rollen,
  rollenName,
  eigeneId,
  rolleAbsenden,
  statusAktion,
  zurueckAktion,
  anonAktion,
  anstellungAktion,
  anstellungZustand,
}: {
  person: TeamMitglied;
  rollen: readonly Rolle[];
  rollenName: Map<string, string>;
  eigeneId: string;
  rolleAbsenden: (formData: FormData) => void;
  statusAktion: (formData: FormData) => void;
  zurueckAktion: (formData: FormData) => void;
  anonAktion: (formData: FormData) => void;
  anstellungAktion: (formData: FormData) => void;
  anstellungZustand: FormZustand;
}) {
  const [offen, setOffen] = useState(false);
  const binIch = person.id === eigeneId;
  const chef = person.rolleTyp === "chef";

  return (
    <li className="rounded-card border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-text">
            {person.vorname} {person.nachname}
            {binIch ? <span className="font-normal text-muted"> · du</span> : null}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {person.email ?? person.telefon ?? "Kein Kontakt hinterlegt"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusMerker status={person.status} chef={chef} />
            {person.rollen.length > 0 ? (
              person.rollen.map((rolleId) => (
                <span
                  key={rolleId}
                  className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted"
                >
                  {rollenName.get(rolleId) ?? "Rolle"}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">Keine Rolle</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOffen((war) => !war)}
          aria-expanded={offen}
          className="shrink-0 rounded-blk border border-line px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          {offen ? "Schliessen" : "Verwalten"}
        </button>
      </div>

      {offen ? (
        <div className="mt-4 border-t border-line pt-4">
          {rollen.length > 0 ? (
            <fieldset>
              <legend className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Rollen
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {rollen.map((rolle) => {
                  const hat = person.rollen.includes(rolle.id);
                  return (
                    <form key={rolle.id} action={rolleAbsenden}>
                      <input type="hidden" name="mitarbeiter_id" value={person.id} />
                      <input type="hidden" name="rolle_id" value={rolle.id} />
                      <input
                        type="hidden"
                        name="anhaken"
                        value={hat ? "false" : "true"}
                      />
                      {/*
                        Derselbe Baustein wie im Einladeformular
                        darunter, nur in seiner Sofort-Variante: jede
                        Zeile ist ein eigenes Formular, damit das
                        Umschalten ohne JavaScript funktioniert. Der
                        Haken kommt aus `.wahl` und ersetzt das früher
                        von Hand gesetzte „✓ " / „+ " vor dem Namen.
                      */}
                      <WahlKnopf gewaehlt={hat} beschriftung={rolle.name} />
                    </form>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-muted">
              Es gibt noch keine Rolle, die sich zuweisen liesse.
            </p>
          )}

          {/*
            Anstellungsdaten. Ein Formular über alle fünf Felder mit
            einem Speichern-Knopf — wie die Betriebseinstellungen und
            aus demselben Grund: wenn ein neuer Vertrag gilt, ändern
            sich Vertragsart, Stunden und Urlaubsanspruch zusammen.

            Die Meldung wird gegen `mitarbeiter_id` gefiltert: alle
            aufgeklappten Zeilen teilen sich eine `useActionState`-
            Instanz, sonst erschiene „Gespeichert." bei jeder Person
            gleichzeitig.
          */}
          <form action={anstellungAktion} className="mt-6 border-t border-line pt-4">
            <input type="hidden" name="mitarbeiter_id" value={person.id} />
            <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Anstellung
            </p>

            <AnstellungsFelder
              idPraefix={`ma-${person.id}-`}
              werte={person.anstellung}
              fehler={
                anstellungZustand.werte?.["mitarbeiter_id"] === person.id
                  ? anstellungZustand.felder
                  : {}
              }
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Knopf text="Anstellung speichern" art="signal" klein />
              {anstellungZustand.werte?.["mitarbeiter_id"] === person.id &&
              anstellungZustand.nachricht ? (
                <span
                  role="status"
                  className={`text-xs font-medium ${
                    anstellungZustand.status === "erfolg" ? "text-muted" : "text-stop"
                  }`}
                >
                  {anstellungZustand.nachricht}
                </span>
              ) : null}
            </div>
          </form>

          {darfStatusAendern(person) ? (
            <fieldset className="mt-6">
              <legend className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Status
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {SETZBARE_STATUS.map((ziel) => (
                  <form key={ziel} action={statusAktion}>
                    <input type="hidden" name="mitarbeiter_id" value={person.id} />
                    <input type="hidden" name="status" value={ziel} />
                    <button
                      type="submit"
                      disabled={person.status === ziel}
                      title={STATUS_ERKLAERUNG[ziel]}
                      className={`rounded-blk border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default ${
                        person.status === ziel
                          ? "border-signal/60 bg-signal-weak text-text"
                          : "border-line text-text hover:bg-surface-sunk"
                      }`}
                    >
                      {STATUS_TEXT[ziel]}
                    </button>
                  </form>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {STATUS_ERKLAERUNG[person.status]}
              </p>
            </fieldset>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Der Status der Betriebsleitung lässt sich hier nicht ändern — sonst
              könnte ein Betrieb ohne aktive Leitung zurückbleiben und wäre für alle
              verschlossen.
            </p>
          )}

          {person.status === "eingeladen" ? (
            <form action={zurueckAktion} className="mt-6">
              <input type="hidden" name="mitarbeiter_id" value={person.id} />
              <Knopf text="Einladung zurücknehmen" art="stop" klein />
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Löscht den Eintrag ganz. Möglich, solange die Einladung nicht
                angenommen wurde.
              </p>
            </form>
          ) : null}

          {!chef && person.status !== "eingeladen" ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs font-semibold text-muted transition-colors hover:text-text">
                Daten löschen (DSGVO)
              </summary>
              <form action={anonAktion} className="mt-3">
                <input type="hidden" name="mitarbeiter_id" value={person.id} />
                <p className="text-xs leading-relaxed text-muted">
                  Name, E-Mail-Adresse und die Verknüpfung zur Anmeldung werden
                  überschrieben. Die Person wird auf inaktiv gesetzt. Vergangene
                  Dienstpläne bleiben erhalten, aber ohne Namen —{" "}
                  <strong className="text-text">das lässt sich nicht rückgängig
                  machen.</strong>
                </p>
                <label className="mt-3 flex items-start gap-2 text-xs text-text">
                  <input
                    type="checkbox"
                    name="bestaetigt"
                    value="ja"
                    className="mt-0.5"
                  />
                  <span>Ja, die Daten dieser Person endgültig löschen.</span>
                </label>
                <div className="mt-3">
                  <Knopf text="Endgültig löschen" art="stop" klein />
                </div>
              </form>
            </details>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function StatusMerker({ status, chef }: { status: TeamMitglied["status"]; chef: boolean }) {
  const stil = {
    aktiv: "border-signal/50 bg-signal-weak text-text",
    eingeladen: "border-dashed border-line-strong text-muted",
    pausiert: "border-line text-muted",
    inaktiv: "border-line text-muted opacity-70",
  }[status];

  return (
    <>
      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stil}`}>
        {STATUS_TEXT[status]}
      </span>
      {chef ? (
        <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold text-text">
          Leitung
        </span>
      ) : null}
    </>
  );
}

function Einladen({
  aktion,
  zustand,
  rollen,
}: {
  aktion: (formData: FormData) => void;
  zustand: FormZustand;
  rollen: readonly Rolle[];
}) {
  return (
    <section
      aria-labelledby="einladen-titel"
      className="mt-10 rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h3 id="einladen-titel" className="font-display text-base text-text">
        Jemanden einladen
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        E-Mail-Adresse oder Telefonnummer genügt — darüber findet die Person ihre
        Einladung, wenn sie sich anmeldet.
      </p>

      <form action={aktion} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextFeld
            id="ein-vorname"
            name="vorname"
            label="Vorname"
            defaultValue={zustand.werte?.["vorname"]}
            fehler={zustand.felder["vorname"]}
            maxLength={60}
          />
          <TextFeld
            id="ein-nachname"
            name="nachname"
            label="Nachname"
            defaultValue={zustand.werte?.["nachname"]}
            fehler={zustand.felder["nachname"]}
            maxLength={60}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextFeld
            id="ein-email"
            name="email"
            type="email"
            label="E-Mail"
            required={false}
            defaultValue={zustand.werte?.["email"]}
            fehler={zustand.felder["email"]}
          />
          <TextFeld
            id="ein-telefon"
            name="telefon"
            type="tel"
            label="Telefon"
            required={false}
            defaultValue={zustand.werte?.["telefon"]}
            fehler={zustand.felder["telefon"]}
            hinweis="International mit + und Ländervorwahl, sonst kommt die Einladung nicht an."
          />
        </div>

        {rollen.length > 0 ? (
          <fieldset>
            <legend className="text-sm font-medium text-text">Rollen</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {/*
                `WahlChip` statt eines eigenen Labels mit sichtbarer
                Checkbox. Bis zum 2026-08-29 standen hier zwei Bauteile
                für dieselbe Sache im Produkt: der Stepper benutzte die
                gepflegte Chip-Optik, dieses Formular graue
                Systemkästchen. Wer beides an einem Tag sieht, hält es
                für zwei verschiedene Funktionen.

                Das Feld bleibt dabei ein echtes `<input type="checkbox">`
                — nur `sr-only`. Das ist keine Kosmetik: eine
                ToggleGroup rendert überhaupt kein Feld, und die
                angehakten Rollen kämen nie am Server an.
              */}
              {rollen.map((rolle) => (
                <WahlChip
                  key={rolle.id}
                  name="rollen"
                  wert={rolle.id}
                  beschriftung={rolle.name}
                />
              ))}
            </div>
          </fieldset>
        ) : null}

        {/*
          Die Anstellungsdaten stehen zugeklappt darunter. Sichtbar
          wären sie fünf Felder, die beim häufigsten Vorgang — jemanden
          schnell einladen — leer bleiben; das Formular sähe nach
          Papierkram aus, den es nicht verlangt. Ein `<details>` statt
          eines eigenen Schritts, weil sie im selben Absenden landen:
          wer sie ausfüllt, soll nicht zweimal speichern.

          `<details>` und nicht ein Umschalter mit Zustand — ohne
          JavaScript klappt es genauso auf, und die Felder sind Teil
          desselben `<form>`, werden also in jedem Fall mitgeschickt.
        */}
        <details className="rounded-card border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-text">
            Anstellungsdaten (optional)
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Alles hier lässt sich auch später im Profil nachtragen.
          </p>
          <div className="mt-4">
            <AnstellungsFelder idPraefix="ein-" fehler={zustand.felder} />
          </div>
        </details>

        <div>
          <Knopf text="Einladen" art="signal" />
        </div>
      </form>
    </section>
  );
}
