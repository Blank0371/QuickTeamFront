"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { useActionState } from "react";

import { FormMeldung } from "@/components/formular/felder";
import type { ZuweisbarerMitarbeiter } from "@/lib/dashboard/schicht";
import { leererZustand } from "@/lib/formular";

import { mitarbeiterZuweisen, zuweisungEntfernen } from "./aktionen";

type Teilnehmer = {
  name: string;
  mitarbeiter_id: string;
  zuweisung_id: string;
  rolle_id: string | null;
  role_name: string | null;
  attendet: boolean;
  is_me: boolean;
};

const chipBasis =
  "rounded-blk border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70";
function chipKlasse(aktiv: boolean): string {
  return `${chipBasis} ${aktiv ? "border-signal bg-signal-weak text-text" : "border-line text-muted hover:text-text"}`;
}

/**
 * Besetzung, editierbar — Spiegel der Roster-Karte in `shift/[id].tsx`
 * (Zeilen 608–847). Nur gerendert, wenn `schicht.can_edit` **und**
 * `istChef(position)` — beide Bedingungen prüft schon die Elternseite,
 * dieselbe Regel wie `canEdit = shift.can_edit && isChef` in der App.
 *
 * **Eine Abweichung vom Vorbild:** die App weist beim Antippen einer
 * Person aus der Add-Liste stillschweigend deren erste passende Rolle
 * zu ("firstRole"). Hier zeigt jede Zeile stattdessen einen Chip je
 * Rolle, für die die Person qualifiziert ist — bei genau einer Rolle
 * macht das keinen Unterschied, bei mehreren entscheidet die Person,
 * die zuweist, welche gemeint ist, statt sich auf eine unsichtbare
 * Reihenfolge zu verlassen.
 */
export function RosterEditor({
  instanzId,
  teilnehmer,
  team,
}: {
  instanzId: string;
  teilnehmer: Teilnehmer[];
  team: ZuweisbarerMitarbeiter[];
}) {
  const [zuweisenState, zuweisenAktion] = useActionState(mitarbeiterZuweisen, leererZustand);
  const [entfernenState, entfernenAktion] = useActionState(zuweisungEntfernen, leererZustand);
  const [suche, setSuche] = useState("");
  const [rollenFilter, setRollenFilter] = useState<string | null>(null);

  const teamNachId = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);
  const zugewieseneIds = useMemo(
    () => new Set(teilnehmer.map((t) => t.mitarbeiter_id)),
    [teilnehmer],
  );

  const addable = useMemo(
    () => team.filter((m) => !zugewieseneIds.has(m.id) && m.rollen.length > 0),
    [team, zugewieseneIds],
  );

  const alleRollen = useMemo(() => {
    const gesehen = new Map<string, string>();
    for (const m of addable) {
      for (const r of m.rollen) gesehen.set(r.id, r.name);
    }
    return [...gesehen.entries()].map(([id, name]) => ({ id, name }));
  }, [addable]);

  const gefiltert = addable.filter((m) => {
    const nameTrifft = suche.trim().length === 0 || m.name.toLowerCase().includes(suche.trim().toLowerCase());
    const rolleTrifft = !rollenFilter || m.rollen.some((r) => r.id === rollenFilter);
    return nameTrifft && rolleTrifft;
  });

  const meldung = zuweisenState.nachricht ?? entfernenState.nachricht;

  return (
    <div className="mt-3">
      {meldung ? (
        <div className="mb-3">
          <FormMeldung art="fehler">{meldung}</FormMeldung>
        </div>
      ) : null}

      {teilnehmer.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">Für diese Schicht ist noch niemand eingeteilt.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teilnehmer.map((t) => {
            const eligibleRollen = teamNachId.get(t.mitarbeiter_id)?.rollen ?? [];
            return (
              <li
                key={t.zuweisung_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-blk border border-line bg-surface px-4 py-2.5"
              >
                <span
                  className={`text-sm ${t.attendet ? "text-text" : "text-muted line-through"} ${t.is_me ? "font-semibold" : ""}`}
                >
                  {t.name}
                  {t.is_me ? " (du)" : ""}
                </span>

                {!t.attendet ? <span className="text-xs font-semibold text-stop">fällt aus</span> : null}

                {eligibleRollen.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {eligibleRollen.map((r) => (
                      <form key={r.id} action={zuweisenAktion}>
                        <input type="hidden" name="instanz_id" value={instanzId} />
                        <input type="hidden" name="mitarbeiter_id" value={t.mitarbeiter_id} />
                        <input type="hidden" name="rolle_id" value={r.id} />
                        <button type="submit" className={chipKlasse(r.id === t.rolle_id)}>
                          {r.name}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : t.role_name ? (
                  <span className="text-xs text-muted">{t.role_name}</span>
                ) : null}

                <form action={entfernenAktion} className="ml-auto">
                  <input type="hidden" name="instanz_id" value={instanzId} />
                  <input type="hidden" name="mitarbeiter_id" value={t.mitarbeiter_id} />
                  <button
                    type="submit"
                    aria-label={`${t.name} von der Schicht entfernen`}
                    className="rounded-blk p-1.5 text-muted hover:bg-surface-sunk hover:text-stop"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 rounded-panel border border-line-strong bg-surface p-4">
        <p className="font-display text-sm text-text">Person hinzufügen</p>

        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Name suchen"
          aria-label="Person suchen"
          className="mt-3 w-full rounded-blk border border-line-strong bg-bg px-3.5 py-2 text-sm text-text"
        />

        {alleRollen.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setRollenFilter(null)}
              className={chipKlasse(rollenFilter === null)}
            >
              Alle Rollen
            </button>
            {alleRollen.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRollenFilter(r.id)}
                className={chipKlasse(rollenFilter === r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>
        ) : null}

        {gefiltert.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Niemand zum Hinzufügen gefunden.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {gefiltert.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-blk border border-line bg-bg px-3.5 py-2"
              >
                <span className="text-sm text-text">{m.name}</span>
                <div className="flex flex-wrap gap-1.5">
                  {m.rollen.map((r) => (
                    <form key={r.id} action={zuweisenAktion}>
                      <input type="hidden" name="instanz_id" value={instanzId} />
                      <input type="hidden" name="mitarbeiter_id" value={m.id} />
                      <input type="hidden" name="rolle_id" value={r.id} />
                      <button type="submit" className={chipKlasse(false)}>
                        + {r.name}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
