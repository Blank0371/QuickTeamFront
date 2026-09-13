"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import type { EigeneSchicht } from "@/lib/dashboard/tausch";
import { leererZustand } from "@/lib/formular";

import { angebotErstellen } from "./aktionen";

function SendenKnopf() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="self-start rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Wird gesendet…" : "Angebot senden"}
    </button>
  );
}

const feldBasis =
  "w-full rounded-blk border border-line-strong bg-surface px-3.5 py-2.5 text-base text-text " +
  "transition-colors placeholder:text-muted";

function formatiereTag(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatiereSchicht(s: EigeneSchicht): string {
  const tag = formatiereTag(s.datum);
  const zeit = `${s.start_zeit.slice(0, 5)}–${s.end_zeit.slice(0, 5)}`;
  return s.label ? `${tag} · ${zeit} · ${s.label}` : `${tag} · ${zeit}`;
}

/**
 * Eine eigene Schicht zum Tausch anbieten — Spiegel der Kategorie
 * `aenderungswunsch` in `compose.tsx`. Anders als dort (Dropdown-Sheet
 * für den Wunschtag) ein natives `<select>` je Baustein: kein Radix, aus
 * demselben Grund wie im Mitteilungen-Formular — ein natives
 * `<input type="radio">`, das der Browser nach jedem abgeschlossenen
 * Server-Action-Aufruf zurücksetzt, reisst sonst lokalen React-Zustand
 * mit sich.
 */
export function TauschAngebotFormular({
  eigeneSchichten,
  freieTage,
}: {
  eigeneSchichten: EigeneSchicht[];
  freieTage: string[];
}) {
  const [zustand, aktion] = useActionState(angebotErstellen, leererZustand);
  const [instanzId, setInstanzId] = useState("");
  const [praeferenzTage, setPraeferenzTage] = useState<string[]>([]);

  useEffect(() => {
    if (zustand.status === "erfolg") {
      setInstanzId("");
      setPraeferenzTage([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zustand]);

  const fehlermeldung =
    zustand.status === "fehler"
      ? (zustand.nachricht ?? Object.values(zustand.felder)[0] ?? "Das hat nicht geklappt.")
      : null;

  if (eigeneSchichten.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-display text-lg text-text">Schicht anbieten</h2>
        <p className="mt-2 text-sm text-muted">
          Du hast in den nächsten 60 Tagen keine anstehende Schicht, die du anbieten könntest.
        </p>
      </div>
    );
  }

  return (
    <form action={aktion} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <h2 className="font-display text-lg text-text">Schicht anbieten</h2>

      {fehlermeldung ? <FormMeldung art="fehler">{fehlermeldung}</FormMeldung> : null}
      {zustand.status === "erfolg" ? <FormMeldung art="erfolg">Angebot gesendet.</FormMeldung> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tausch-schicht" className="text-sm font-medium text-text">
          Welche Schicht?
        </label>
        <select
          id="tausch-schicht"
          name="instanz_id"
          value={instanzId}
          onChange={(e) => setInstanzId(e.target.value)}
          required
          className={feldBasis}
        >
          <option value="" disabled>
            Bitte wählen
          </option>
          {eigeneSchichten.map((s) => (
            <option key={s.id} value={s.id}>
              {formatiereSchicht(s)}
            </option>
          ))}
        </select>
        {zustand.felder.instanzId ? (
          <p className="text-sm font-medium text-stop">{zustand.felder.instanzId}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text">Wunschtage (optional, bis zu drei)</p>
        <p className="text-xs text-muted">
          Tage, an denen du stattdessen arbeiten möchtest. Ohne Angabe zählt der ganze Monat der
          angebotenen Schicht.
        </p>

        {praeferenzTage.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {praeferenzTage.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full border border-signal bg-signal-weak px-3 py-1 text-xs font-semibold text-text"
              >
                {formatiereTag(tag)}
                <button
                  type="button"
                  onClick={() => setPraeferenzTage(praeferenzTage.filter((t) => t !== tag))}
                  aria-label={`${formatiereTag(tag)} entfernen`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {praeferenzTage.length < 3 ? (
          <select
            value=""
            onChange={(e) => {
              const wert = e.target.value;
              if (wert) setPraeferenzTage([...praeferenzTage, wert].sort());
            }}
            className={feldBasis}
          >
            <option value="">Tag hinzufügen</option>
            {freieTage
              .filter((tag) => !praeferenzTage.includes(tag))
              .map((tag) => (
                <option key={tag} value={tag}>
                  {formatiereTag(tag)}
                </option>
              ))}
          </select>
        ) : null}

        {praeferenzTage.map((tag) => (
          <input key={tag} type="hidden" name="praeferenz_tage" value={tag} />
        ))}
      </div>

      <SendenKnopf />
    </form>
  );
}
