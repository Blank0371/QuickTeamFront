"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { DatumWahl } from "@/components/formular/datum-wahl";
import { FormMeldung } from "@/components/formular/felder";
import { ZahlStepper } from "@/components/formular/zahl-stepper";
import { useActionState } from "react";
import { leererZustand } from "@/lib/formular";
import type { Betriebseinstellungen } from "@/lib/dashboard/einstellungen";
import { DEADLINE_MAX, DEADLINE_MIN, SPRACHEN } from "@/lib/validierung";

import { einstellungenSpeichern } from "./aktionen";

/**
 * Die sieben Betriebseinstellungen, ein Speichern-Knopf.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Schalter keine `<input type="checkbox">` sind
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Falle wie in `neue-mitteilung-formular.tsx`, dort im Detail
 * begründet: React setzt das native `<form>` nach **jedem**
 * abgeschlossenen Server-Action-Aufruf zurück, auch nach einem
 * gescheiterten. Jedes native Formularelement fällt dabei auf seinen
 * Ausgangswert zurück — bei sieben Einstellungen hiesse das, dass ein
 * abgelehntes Speichern die Eingabe still verwirft und die alten Werte
 * wieder anzeigt, ohne dass irgendwo etwas blinkt.
 *
 * Deshalb hält React den Zustand, und jeder Wert reist über ein
 * verstecktes Feld. Ein Zurücksetzen hat dann nichts zu greifen: es gibt
 * kein bedienbares natives Element, dessen Zustand verlorengehen
 * könnte.
 *
 * `ZahlStepper` und `DatumWahl` folgen demselben Muster von sich aus —
 * beide führen ihren Wert intern und schicken ihn über ein eigenes
 * Feld.
 */
export function EinstellungenFormular({ start }: { start: Betriebseinstellungen }) {
  const [zustand, aktion] = useActionState(einstellungenSpeichern, leererZustand);

  const [sprache, setSprache] = useState(start.sprache_standard);
  const [notfallStunden, setNotfallStunden] = useState(start.notfall_stunden_anrechnen);
  const [sehenSchichten, setSehenSchichten] = useState(
    start.mitarbeiter_sehen_andere_schichten,
  );
  const [sehenMitarbeiter, setSehenMitarbeiter] = useState(
    start.mitarbeiter_sehen_andere_mitarbeiter,
  );
  const [tauschFreigabe, setTauschFreigabe] = useState(start.ask_chef_for_shift_switch);

  return (
    <form action={aktion} className="flex flex-col gap-6">
      {zustand.status === "fehler" && zustand.nachricht ? (
        <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
      ) : null}
      {zustand.status === "erfolg" ? (
        <FormMeldung art="erfolg">
          Gespeichert. Die Sichtbarkeits-Einstellungen wirken für dein Team ab der
          nächsten Seitenansicht — niemand muss sich neu anmelden.
        </FormMeldung>
      ) : null}

      {/* ── Sichtbarkeit ───────────────────────────────────────────── */}
      <Gruppe
        titel="Was dein Team sieht"
        text="Beide Einstellungen wirken betriebsweit und sofort — sie ändern nicht die Darstellung, sondern welche Daten für Angestellte überhaupt abrufbar sind."
      >
        <input
          type="hidden"
          name="mitarbeiter_sehen_andere_schichten"
          value={sehenSchichten ? "an" : ""}
        />
        <Schalter
          an={sehenSchichten}
          umschalten={() => setSehenSchichten((v) => !v)}
          titel="Fremde Schichten sichtbar"
          text="Aus: Angestellte sehen im Kalender ausschliesslich ihre eigenen Dienste. An: sie sehen den ganzen Dienstplan des Betriebs."
        />

        <input
          type="hidden"
          name="mitarbeiter_sehen_andere_mitarbeiter"
          value={sehenMitarbeiter ? "an" : ""}
        />
        <Schalter
          an={sehenMitarbeiter}
          umschalten={() => setSehenMitarbeiter((v) => !v)}
          titel="Namen der Eingeteilten sichtbar"
          text="Aus: auf einer Schicht steht nur der eigene Name. An: alle Eingeteilten stehen mit Namen und Rolle da."
        />
      </Gruppe>

      {/* ── Abläufe ────────────────────────────────────────────────── */}
      <Gruppe titel="Abläufe">
        <input
          type="hidden"
          name="ask_chef_for_shift_switch"
          value={tauschFreigabe ? "an" : ""}
        />
        <Schalter
          an={tauschFreigabe}
          umschalten={() => setTauschFreigabe((v) => !v)}
          titel="Schichttausch muss freigegeben werden"
          text="An: ein ausgehandelter Tausch wartet auf deine Zustimmung. Aus: die beiden Beteiligten regeln ihn unter sich."
        />

        <input
          type="hidden"
          name="notfall_stunden_anrechnen"
          value={notfallStunden ? "an" : ""}
        />
        <Schalter
          an={notfallStunden}
          umschalten={() => setNotfallStunden((v) => !v)}
          titel="Notfallstunden anrechnen"
          text="Zählt Schichten, von denen sich jemand kurzfristig abgemeldet hat, trotzdem zur Arbeitszeit."
        />

        <div className="flex flex-wrap items-end justify-between gap-4 py-4">
          <div className="min-w-0 flex-1">
            {/*
              Ein echtes `<label htmlFor>` und kein `<p>`: `ZahlStepper`
              beschriftet nur seine beiden Knöpfe und die Gruppe, das
              Zahlenfeld selbst bleibt ohne Namen. Der Wizard löst das in
              `vorlagen-abschnitt.tsx` genauso — hier stand zuerst ein
              Absatz, und Lighthouse hat das Feld prompt als unbenannt
              gemeldet.
            */}
            <label
              htmlFor="verfuegbarkeit_deadline_tag"
              className="text-sm font-medium text-text"
            >
              Frist für Wünsche
            </label>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
              Tag im Monat, bis zu dem dein Team Verfügbarkeiten für den Folgemonat
              eintragen kann. {DEADLINE_MIN} bis {DEADLINE_MAX}.
            </p>
          </div>
          <ZahlStepper
            id="verfuegbarkeit_deadline_tag"
            name="verfuegbarkeit_deadline_tag"
            label="Frist für Wünsche"
            defaultValue={start.verfuegbarkeit_deadline_tag}
            min={DEADLINE_MIN}
            max={DEADLINE_MAX}
            fehler={zustand.felder["verfuegbarkeit_deadline_tag"]}
          />
        </div>
      </Gruppe>

      {/* ── Abrechnung und Sprache ─────────────────────────────────── */}
      <Gruppe titel="Abrechnung und Sprache">
        <div className="py-4">
          <DatumWahl
            name="abrechnung_bis"
            label="Abrechnung abgeschlossen bis"
            platzhalter="Kein Stichtag"
            loeschbar
            className="sm:max-w-xs"
            defaultValue={start.abrechnung_bis ?? ""}
            hinweis="Stichtag für die Stundenauswertung: Zeit davor gilt als abgerechnet. Ohne Angabe wird alles gezählt."
            fehler={zustand.felder["abrechnung_bis"]}
          />
        </div>

        <div className="py-4">
          <p className="text-sm font-medium text-text">Sprache des Betriebs</p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
            Vorgesehen als Standardsprache für neue Mitglieder.{" "}
            <strong className="font-medium text-text">
              Zurzeit ohne Wirkung
            </strong>{" "}
            — die App wählt ihre Sprache am Gerät, und die Website gibt bislang nur
            Deutsch aus. Der Wert wird gespeichert, greift aber erst, wenn die
            Sprachwahl gebaut ist.
          </p>

          <input type="hidden" name="sprache_standard" value={sprache} />
          <div className="mt-3 flex flex-wrap gap-2">
            {SPRACHEN.map((eintrag) => {
              const gewaehlt = sprache === eintrag.code;
              return (
                <button
                  key={eintrag.code}
                  type="button"
                  onClick={() => setSprache(eintrag.code)}
                  aria-pressed={gewaehlt}
                  className={`rounded-blk border px-3.5 py-2 text-sm font-medium transition-colors ${
                    gewaehlt
                      ? "border-signal bg-signal-weak text-text"
                      : "border-line text-muted hover:border-line-control hover:text-text"
                  }`}
                >
                  {eintrag.name}
                </button>
              );
            })}
          </div>
        </div>
      </Gruppe>

      <div className="sm:max-w-xs">
        <AbsendenButton laufend="Wird gespeichert …">Speichern</AbsendenButton>
      </div>
    </form>
  );
}

/** Überschriebener Abschnitt mit Trennlinien zwischen den Zeilen. */
function Gruppe({
  titel,
  text,
  children,
}: {
  titel: string;
  text?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-display text-base font-bold text-text">{titel}</h2>
      {text ? (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{text}</p>
      ) : null}
      <div className="mt-2 divide-y divide-line">{children}</div>
    </section>
  );
}

/**
 * Ein Schalter mit Beschriftung und Erklärung.
 *
 * `role="switch"` statt einer Checkbox, weil genau das gemeint ist: ein
 * Zustand, der sofort umschlägt, nicht eine Auswahl unter mehreren. Der
 * Zustand liegt in `aria-checked` und ist damit auch vorgelesen
 * eindeutig; die Farbe allein trägt ihn nicht (WCAG 1.4.1), weil der
 * Knebel zusätzlich die Seite wechselt.
 */
function Schalter({
  an,
  umschalten,
  titel,
  text,
}: {
  an: boolean;
  umschalten: () => void;
  titel: string;
  text: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{titel}</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">{text}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={an}
        onClick={umschalten}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          an ? "border-signal bg-signal" : "border-line-control bg-surface-sunk"
        }`}
      >
        <span className="sr-only">{titel}</span>
        <span
          aria-hidden="true"
          className={`inline-block size-4 rounded-full transition-transform ${
            an ? "translate-x-[1.375rem] bg-signal-ink" : "translate-x-[0.1875rem] bg-muted"
          }`}
        />
      </button>
    </div>
  );
}
