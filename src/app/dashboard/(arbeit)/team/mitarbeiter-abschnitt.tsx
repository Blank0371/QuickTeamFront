"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { WahlChip, WahlKnopf } from "@/components/formular/wahl";
import type { Dictionary } from "@/i18n/de";
import { fuelle } from "@/i18n/text";
import {
  darfStatusAendern,
  SETZBARE_STATUS,
  type Rolle,
  type TeamMitglied,
} from "@/lib/dashboard/team";
import { leererZustand, type FormZustand } from "@/lib/formular";

import {
  anonymisieren,
  anstellungSpeichern,
  chefEinladen,
  chefEntfernungAnfragen,
  einladungZuruecknehmen,
  mitarbeiterEinladen,
  rolleUmschalten,
  statusSetzen,
} from "./aktionen";
import { AnstellungsFelder } from "./anstellungs-felder";

type Texte = Dictionary["teamVerwaltung"];

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
  texte: t,
}: {
  team: readonly TeamMitglied[];
  rollen: readonly Rolle[];
  eigeneId: string;
  texte: Texte;
}) {
  const [einladen, einladenAktion] = useActionState(mitarbeiterEinladen, leererZustand);
  const [rolleAktion, rolleAbsenden] = useActionState(rolleUmschalten, leererZustand);
  const [status, statusAktion] = useActionState(statusSetzen, leererZustand);
  const [zurueck, zurueckAktion] = useActionState(einladungZuruecknehmen, leererZustand);
  const [anon, anonAktion] = useActionState(anonymisieren, leererZustand);
  const [anstellung, anstellungAktion] = useActionState(anstellungSpeichern, leererZustand);
  const [chefNeu, chefNeuAktion] = useActionState(chefEinladen, leererZustand);
  const [entfernung, entfernungAktion] = useActionState(chefEntfernungAnfragen, leererZustand);

  const aktiveRollen = rollen.filter((rolle) => rolle.aktiv);
  const rollenName = new Map(rollen.map((rolle) => [rolle.id, rolle.name]));

  return (
    <section aria-labelledby="team-titel" className="mt-12">
      <h2 id="team-titel" className="font-display text-lg text-text">
        {t.team}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {team.length === 1 ? t.alleinDa : fuelle(t.anzahl, { n: team.length })}
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
            entfernungAktion={entfernungAktion}
            entfernungZustand={entfernung}
            t={t}
          />
        ))}
      </ul>

      <Einladen
        aktion={einladenAktion}
        zustand={einladen}
        rollen={aktiveRollen}
        t={t}
      />

      <ChefEinladen aktion={chefNeuAktion} zustand={chefNeu} t={t} />
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
  entfernungAktion,
  entfernungZustand,
  t,
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
  entfernungAktion: (formData: FormData) => void;
  entfernungZustand: FormZustand;
  t: Texte;
}) {
  const [offen, setOffen] = useState(false);
  const entfernungHier = entfernungZustand.werte?.["mitarbeiter_id"] === person.id;
  const binIch = person.id === eigeneId;
  const chef = person.rolleTyp === "chef";

  return (
    <li className="rounded-card border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-text">
            {person.vorname} {person.nachname}
            {binIch ? <span className="font-normal text-muted">{t.du}</span> : null}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {person.email ?? person.telefon ?? t.keinKontakt}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusMerker status={person.status} chef={chef} t={t} />
            {chef && person.rollen.length === 0 ? null : person.rollen.length > 0 ? (
              person.rollen.map((rolleId) => (
                <span
                  key={rolleId}
                  className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted"
                >
                  {rollenName.get(rolleId) ?? t.rolleFallback}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">{t.ohneRolle}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOffen((war) => !war)}
          aria-expanded={offen}
          className="shrink-0 rounded-blk border border-line px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          {offen ? t.schliessen : t.verwalten}
        </button>
      </div>

      {offen ? (
        <div className="mt-4 border-t border-line pt-4">
          {/*
            Seit 2026-10-07 trägt die Leitung weder Rollen noch
            Anstellungsdaten — sie wird nie eingeplant. Eine Rolle aus der
            Zeit davor bleibt abnehmbar (nur diese wird angeboten).
          */}
          {chef ? (
            <>
              <p className="text-sm leading-relaxed text-muted">{t.leitungOhneArbeit}</p>
              {person.rollen.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {person.rollen.map((rolleId) => (
                    <form key={rolleId} action={rolleAbsenden}>
                      <input type="hidden" name="mitarbeiter_id" value={person.id} />
                      <input type="hidden" name="rolle_id" value={rolleId} />
                      <input type="hidden" name="anhaken" value="false" />
                      <WahlKnopf gewaehlt beschriftung={rollenName.get(rolleId) ?? t.rolleFallback} />
                    </form>
                  ))}
                </div>
              ) : null}
            </>
          ) : rollen.length > 0 ? (
            <fieldset>
              <legend className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
                {t.rollen}
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
            <p className="text-sm text-muted">{t.keineZuweisbar}</p>
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
          {chef ? null : (
          <form action={anstellungAktion} className="mt-6 border-t border-line pt-4">
            <input type="hidden" name="mitarbeiter_id" value={person.id} />
            <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {t.anstellung}
            </p>

            <AnstellungsFelder
              idPraefix={`ma-${person.id}-`}
              werte={person.anstellung}
              fehler={
                anstellungZustand.werte?.["mitarbeiter_id"] === person.id
                  ? anstellungZustand.felder
                  : {}
              }
              texte={t}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Knopf text={t.anstellungSpeichern} art="signal" klein />
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
          )}

          {darfStatusAendern(person) ? (
            <fieldset className="mt-6">
              <legend className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
                {t.statusTitel}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {SETZBARE_STATUS.map((ziel) => (
                  <form key={ziel} action={statusAktion}>
                    <input type="hidden" name="mitarbeiter_id" value={person.id} />
                    <input type="hidden" name="status" value={ziel} />
                    <button
                      type="submit"
                      disabled={person.status === ziel}
                      title={t.statusErklaerung[ziel]}
                      className={`rounded-blk border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default ${
                        person.status === ziel
                          ? "border-signal/60 bg-signal-weak text-text"
                          : "border-line text-text hover:bg-surface-sunk"
                      }`}
                    >
                      {t.status[ziel]}
                    </button>
                  </form>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {t.statusErklaerung[person.status]}
              </p>
            </fieldset>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-muted">{t.leitungStatus}</p>
          )}

          {person.status === "eingeladen" ? (
            <form action={zurueckAktion} className="mt-6">
              <input type="hidden" name="mitarbeiter_id" value={person.id} />
              <Knopf text={t.zuruecknehmen} art="stop" klein />
              <p className="mt-2 text-xs leading-relaxed text-muted">{t.zuruecknehmenText}</p>
            </form>
          ) : null}

          {/*
            Eine Betriebsleitung entfernt nur das QuickTeam-Team — die
            Anfrage landet in `bug_reports` (seit 2026-10-07). Nach dem
            Absenden verschwindet der Knopf, damit ein zweiter Klick keine
            zweite Anfrage schickt (lesen lässt sich die Tabelle nicht).
          */}
          {chef && !binIch && person.status !== "eingeladen" ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs font-semibold text-muted transition-colors hover:text-text">
                {t.entfernungTitel}
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-muted">{t.entfernungText}</p>
              {entfernungHier && entfernungZustand.status === "erfolg" ? null : (
                <form action={entfernungAktion} className="mt-3">
                  <input type="hidden" name="mitarbeiter_id" value={person.id} />
                  <Knopf text={t.entfernungAnfragen} art="stop" klein />
                </form>
              )}
              {entfernungHier && entfernungZustand.nachricht ? (
                <p
                  role="status"
                  className={`mt-2 text-xs font-medium ${
                    entfernungZustand.status === "erfolg" ? "text-muted" : "text-stop"
                  }`}
                >
                  {entfernungZustand.nachricht}
                </p>
              ) : null}
            </details>
          ) : null}

          {!chef && person.status !== "eingeladen" ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs font-semibold text-muted transition-colors hover:text-text">
                {t.dsgvo}
              </summary>
              <form action={anonAktion} className="mt-3">
                <input type="hidden" name="mitarbeiter_id" value={person.id} />
                <p className="text-xs leading-relaxed text-muted">
                  {t.dsgvoText}
                  <strong className="text-text">{t.nichtRueckgaengig}</strong>
                </p>
                <label className="mt-3 flex items-start gap-2 text-xs text-text">
                  <input
                    type="checkbox"
                    name="bestaetigt"
                    value="ja"
                    className="mt-0.5"
                  />
                  <span>{t.dsgvoBestaetigen}</span>
                </label>
                <div className="mt-3">
                  <Knopf text={t.endgueltigLoeschen} art="stop" klein />
                </div>
              </form>
            </details>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function StatusMerker({
  status,
  chef,
  t,
}: {
  status: TeamMitglied["status"];
  chef: boolean;
  t: Texte;
}) {
  const stil = {
    aktiv: "border-signal/50 bg-signal-weak text-text",
    eingeladen: "border-dashed border-line-strong text-muted",
    pausiert: "border-line text-muted",
    inaktiv: "border-line text-muted opacity-70",
  }[status];

  return (
    <>
      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stil}`}>
        {t.status[status]}
      </span>
      {chef ? (
        <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold text-text">
          {t.leitung}
        </span>
      ) : null}
    </>
  );
}

function Einladen({
  aktion,
  zustand,
  rollen,
  t,
}: {
  aktion: (formData: FormData) => void;
  zustand: FormZustand;
  rollen: readonly Rolle[];
  t: Texte;
}) {
  return (
    <section
      aria-labelledby="einladen-titel"
      className="mt-10 rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h3 id="einladen-titel" className="font-display text-base text-text">
        {t.einladenTitel}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t.einladenText}</p>

      <form action={aktion} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextFeld
            id="ein-vorname"
            name="vorname"
            label={t.vorname}
            defaultValue={zustand.werte?.["vorname"]}
            fehler={zustand.felder["vorname"]}
            maxLength={60}
          />
          <TextFeld
            id="ein-nachname"
            name="nachname"
            label={t.nachname}
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
            label={t.email}
            required={false}
            defaultValue={zustand.werte?.["email"]}
            fehler={zustand.felder["email"]}
          />
          <TextFeld
            id="ein-telefon"
            name="telefon"
            type="tel"
            label={t.telefon}
            required={false}
            defaultValue={zustand.werte?.["telefon"]}
            fehler={zustand.felder["telefon"]}
            hinweis={t.telefonHinweis}
          />
        </div>

        {rollen.length > 0 ? (
          <fieldset>
            <legend className="text-sm font-medium text-text">{t.rollen}</legend>
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
            {t.anstellungOptional}
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-muted">{t.anstellungSpaeter}</p>
          <div className="mt-4">
            <AnstellungsFelder idPraefix="ein-" fehler={zustand.felder} texte={t} />
          </div>
        </details>

        <div>
          <Knopf text={t.einladen} art="signal" />
        </div>
      </form>
    </section>
  );
}

/**
 * Weitere Betriebsleitung einladen (seit 2026-10-07). Nur Name und
 * E-Mail — Rollen, Stunden und Urlaub gibt es für die Leitung nicht, und
 * angenommen wird eine Einladung allein über die E-Mail-Adresse.
 */
function ChefEinladen({
  aktion,
  zustand,
  t,
}: {
  aktion: (formData: FormData) => void;
  zustand: FormZustand;
  t: Texte;
}) {
  return (
    <section
      aria-labelledby="chef-einladen-titel"
      className="mt-6 rounded-panel border border-line bg-surface p-5 sm:p-6"
    >
      <h3 id="chef-einladen-titel" className="font-display text-base text-text">
        {t.leitungEinladenTitel}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t.leitungEinladenText}</p>

      <form action={aktion} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextFeld
            id="chef-vorname"
            name="vorname"
            label={t.vorname}
            defaultValue={zustand.werte?.["vorname"]}
            fehler={zustand.felder["vorname"]}
            maxLength={60}
          />
          <TextFeld
            id="chef-nachname"
            name="nachname"
            label={t.nachname}
            defaultValue={zustand.werte?.["nachname"]}
            fehler={zustand.felder["nachname"]}
            maxLength={60}
          />
        </div>
        <TextFeld
          id="chef-email"
          name="email"
          type="email"
          label={t.email}
          defaultValue={zustand.werte?.["email"]}
          fehler={zustand.felder["email"]}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Knopf text={t.leitungEinladen} art="signal" />
          {zustand.nachricht ? (
            <span
              role="status"
              className={`text-sm font-medium ${zustand.status === "erfolg" ? "text-muted" : "text-stop"}`}
            >
              {zustand.nachricht}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
