"use client";

import { useActionState } from "react";

import type { ChefNotfall, MeineMeldung, NotfallStatus, OffeneVertretung } from "@/lib/dashboard/notfall";
import { leererZustand } from "@/lib/formular";

import { ausschreiben, uebernehmen } from "./aktionen";

const STATUS_LABEL: Record<NotfallStatus, string> = {
  gemeldet: "Gemeldet",
  vertretung_gesucht: "Vertretung wird gesucht",
  besetzt: "Vertretung gefunden",
  storniert: "Zurückgezogen",
};

function formatiereSchicht(datum: string, start: string, end: string, label: string | null): string {
  const tag = new Date(`${datum}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const zeit = `${start.slice(0, 5)}–${end.slice(0, 5)}`;
  return label ? `${tag} · ${zeit} · ${label}` : `${tag} · ${zeit}`;
}

const knopfBasis =
  "rounded-blk px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70";
const knopfSignal = `${knopfBasis} bg-signal text-signal-ink hover:bg-signal-hover`;

export function MeineMeldungenListe({ meldungen }: { meldungen: MeineMeldung[] }) {
  if (meldungen.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-text">Deine Meldungen</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {meldungen.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3"
          >
            <span className="text-sm text-text">{formatiereSchicht(m.datum, m.start_zeit, m.end_zeit, m.label)}</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-[0.6875rem] font-semibold text-muted">
              {STATUS_LABEL[m.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ChefNotfaelleListe({ notfaelle }: { notfaelle: ChefNotfall[] }) {
  const [, aktion] = useActionState(ausschreiben, leererZustand);

  if (notfaelle.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-text">Offene Notfälle</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {notfaelle.map((n) => (
          <li key={n.id} className="rounded-card border border-line bg-surface p-4">
            <p className="text-sm text-text">{formatiereSchicht(n.datum, n.start_zeit, n.end_zeit, n.label)}</p>
            <p className="text-sm text-muted">
              {n.rolleName} · {n.melderName}
            </p>
            <div className="mt-3">
              {n.status === "gemeldet" ? (
                <form action={aktion}>
                  <input type="hidden" name="notfall_id" value={n.id} />
                  <button type="submit" className={knopfSignal}>
                    Vertretung ausschreiben
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted">Vertretung wird gesucht.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OffeneVertretungenListe({ vertretungen }: { vertretungen: OffeneVertretung[] }) {
  const [, aktion] = useActionState(uebernehmen, leererZustand);

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-text">Offene Vertretungen</h2>
      {vertretungen.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Gerade keine ausgeschriebenen Vertretungen für deine Rollen.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {vertretungen.map((v) => (
            <li key={v.id} className="rounded-card border border-line bg-surface p-4">
              <p className="text-sm text-text">{formatiereSchicht(v.datum, v.start_zeit, v.end_zeit, v.label)}</p>
              <p className="text-sm text-muted">
                {v.rolleName} · {v.melderName}
              </p>
              <form action={aktion} className="mt-3">
                <input type="hidden" name="benachrichtigung_id" value={v.benachrichtigungId} />
                <button type="submit" className={knopfSignal}>
                  Übernehmen
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
