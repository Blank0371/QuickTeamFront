"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import type { EigeneMeldbareSchicht } from "@/lib/dashboard/notfall";
import { leererZustand } from "@/lib/formular";

import { melden } from "./aktionen";

function SendenKnopf() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="self-start rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Wird gemeldet…" : "Notfall melden"}
    </button>
  );
}

const feldBasis =
  "w-full rounded-blk border border-line-strong bg-surface px-3.5 py-2.5 text-base text-text " +
  "transition-colors placeholder:text-muted";

function formatiereSchicht(s: EigeneMeldbareSchicht): string {
  const tag = new Date(`${s.datum}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const zeit = `${s.start_zeit.slice(0, 5)}–${s.end_zeit.slice(0, 5)}`;
  return s.label ? `${tag} · ${zeit} · ${s.label}` : `${tag} · ${zeit}`;
}

/**
 * Eine eigene Schicht als Notfall melden — Spiegel von `EmergencySection`
 * in `scheduling.tsx`. Anders als bei Tausch reicht hier ein einziges
 * natives `<select>` ohne Radix, also kein Reset-Risiko wie im
 * Mitteilungen-Formular — trotzdem vollständig React-kontrolliert, damit
 * ein Fehler die Eingabe nicht verwirft.
 *
 * **Kein Zurückziehen-Knopf.** Die Referenz-App kennt `storniert` nur im
 * Typ, setzt es aber nirgends — der Parity-Audit vom 2026-08-31 fand
 * dafür keine Stelle im Quelltext. Ein Rücknahme-Knopf hier wäre eine
 * neue Funktion, keine Portierung.
 */
export function NotfallFormular({ schichten }: { schichten: EigeneMeldbareSchicht[] }) {
  const [zustand, aktion] = useActionState(melden, leererZustand);
  const [zuweisungId, setZuweisungId] = useState("");
  const [grund, setGrund] = useState("");

  useEffect(() => {
    if (zustand.status === "erfolg") {
      setZuweisungId("");
      setGrund("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zustand]);

  const fehlermeldung =
    zustand.status === "fehler"
      ? (zustand.nachricht ?? Object.values(zustand.felder)[0] ?? "Das hat nicht geklappt.")
      : null;

  if (schichten.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-display text-lg text-text">Notfall melden</h2>
        <p className="mt-2 text-sm text-muted">
          Du hast keine anstehende Schicht, die du als Notfall melden könntest.
        </p>
      </div>
    );
  }

  return (
    <form action={aktion} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <h2 className="font-display text-lg text-text">Notfall melden</h2>
      <p className="text-sm text-muted">
        Du wirst sofort aus dieser Schicht ausgetragen. Die Betriebsleitung entscheidet, ob eine
        Vertretung ausgeschrieben wird.
      </p>

      {fehlermeldung ? <FormMeldung art="fehler">{fehlermeldung}</FormMeldung> : null}
      {zustand.status === "erfolg" ? <FormMeldung art="erfolg">Gemeldet.</FormMeldung> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notfall-schicht" className="text-sm font-medium text-text">
          Welche Schicht?
        </label>
        <select
          id="notfall-schicht"
          name="zuweisung_id"
          value={zuweisungId}
          onChange={(e) => setZuweisungId(e.target.value)}
          required
          className={feldBasis}
        >
          <option value="" disabled>
            Bitte wählen
          </option>
          {schichten.map((s) => (
            <option key={s.zuweisungId} value={s.zuweisungId}>
              {formatiereSchicht(s)}
            </option>
          ))}
        </select>
        {zustand.felder.zuweisungId ? (
          <p className="text-sm font-medium text-stop">{zustand.felder.zuweisungId}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notfall-grund" className="text-sm font-medium text-text">
          Grund (optional)
        </label>
        {/*
          Der Hinweis steht hier, weil dieses Feld der Ort ist, an dem
          Gesundheitsdaten entstehen. Die App schlug dafür lange „Ich bin
          krank." als Platzhalter vor — eine Aufforderung zu einer Angabe
          nach Art. 9 DSGVO, die für die Vertretungssuche gar nicht
          gebraucht wird: dafür zählen Schicht, Rolle und Zeitpunkt.

          Bewusst kein Beispieltext im Feld selbst. Jedes Beispiel wird
          zur Vorlage, und ein Platzhalter, der eine Krankheit nennt,
          erzeugt genau die Daten, die man danach aufwendig schützen muss.
          Der wirksamste Schutz ist, dass sie nicht entstehen.

          Wer den Grund liest, steht dabei — sonst schreibt man ihn für
          ein Publikum, das man sich falsch vorstellt.
        */}
        <p id="notfall-grund-hinweis" className="text-xs leading-relaxed text-muted">
          Kurz und ohne Angaben zu deiner Gesundheit. Lesen können ihn die
          Betriebsleitung und wer deine Schicht übernimmt.
        </p>
        <textarea
          id="notfall-grund"
          name="grund"
          value={grund}
          onChange={(e) => setGrund(e.target.value)}
          rows={3}
          maxLength={500}
          aria-describedby="notfall-grund-hinweis"
          className={feldBasis}
        />
      </div>

      <SendenKnopf />
    </form>
  );
}
