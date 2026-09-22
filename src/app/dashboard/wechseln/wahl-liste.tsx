"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import { ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import type { Einladung, Position } from "@/lib/dashboard/position";
import { leererZustand } from "@/lib/formular";

import { nimmEinladungAn, waehlePosition } from "./aktionen";

function AnnehmenButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="shrink-0 rounded-full bg-signal px-5 py-2 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "…" : label}
    </button>
  );
}

export type WahlListeTexte = {
  deineBetriebe: string;
  einladungen: string;
  einladungenText: string;
  annehmen: string;
};

/**
 * Anstellungen und offene Einladungen zur Auswahl.
 *
 * Jede Zeile ist ein eigenes `<form>` mit ihrer ID in einem versteckten
 * Feld — dasselbe Muster wie im Rollen-Abschnitt des Steppers. Damit
 * funktioniert die Auswahl auch ohne JavaScript, und es braucht keinen
 * Zustand je Zeile.
 *
 * Die ganze Zeile als Knopf, nicht ein „Öffnen" am Rand: es gibt nur
 * eine Sache, die man mit einer Anstellung hier tun kann.
 */
export function WahlListe({
  positionen,
  einladungen,
  rollenNamen,
  ziel,
  texte,
}: {
  positionen: readonly Position[];
  einladungen: readonly Einladung[];
  rollenNamen: Readonly<Record<string, string>>;
  /** Wohin nach der Wahl — bereits serverseitig geprüft. */
  ziel: string;
  texte: WahlListeTexte;
}) {
  const [wahl, wahlAktion] = useActionState(waehlePosition, leererZustand);
  const [einladung, einladungAktion] = useActionState(nimmEinladungAn, leererZustand);

  return (
    <>
      {wahl.nachricht ? (
        <div className="mb-5">
          <FormMeldung art="fehler">{wahl.nachricht}</FormMeldung>
        </div>
      ) : null}
      {einladung.nachricht ? (
        <div className="mb-5">
          <FormMeldung art="fehler">{einladung.nachricht}</FormMeldung>
        </div>
      ) : null}

      {positionen.length > 0 ? (
        <section aria-labelledby="positionen-titel">
          <h2
            id="positionen-titel"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
          >
            {texte.deineBetriebe}
          </h2>

          <ul className="mt-4 flex flex-col gap-3">
            {positionen.map((position) => (
              <li key={position.mitarbeiterId}>
                <form action={wahlAktion}>
                  <input
                    type="hidden"
                    name="mitarbeiter_id"
                    value={position.mitarbeiterId}
                  />
                  {/* Das Ziel reist mit, damit die Wahl dort ankommt, wo
                      der Klick hinwollte. Die Server Action prüft es
                      trotzdem noch einmal — ein verstecktes Feld ist ein
                      Formularfeld wie jedes andere. */}
                  <input type="hidden" name={ZIEL_PARAMETER} value={ziel} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-4 rounded-card border border-line bg-surface px-5 py-4 text-left transition-colors hover:border-line-strong hover:bg-surface-sunk"
                  >
                    <span className="min-w-0 grow">
                      <span className="block truncate font-semibold text-text">
                        {position.betriebName}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted">
                        {rollenNamen[position.rolleTyp] ?? position.rolleTyp}
                        {position.name ? ` · ${position.name}` : ""}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-xl text-muted">
                      ›
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {einladungen.length > 0 ? (
        <section
          aria-labelledby="einladungen-titel"
          className={positionen.length > 0 ? "mt-10" : ""}
        >
          <h2
            id="einladungen-titel"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
          >
            {texte.einladungen}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {texte.einladungenText}
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {einladungen.map((offen) => (
              <li
                key={offen.mitarbeiterId}
                className="flex items-center gap-4 rounded-card border border-line bg-surface px-5 py-4"
              >
                <span className="min-w-0 grow">
                  <span className="block truncate font-semibold text-text">
                    {offen.betriebName}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">
                    {rollenNamen[offen.rolleTyp] ?? offen.rolleTyp}
                  </span>
                </span>
                <form action={einladungAktion}>
                  <input
                    type="hidden"
                    name="mitarbeiter_id"
                    value={offen.mitarbeiterId}
                  />
                  <AnnehmenButton label={texte.annehmen} />
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
