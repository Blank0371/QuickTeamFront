"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import type { MeineVorlage, Praeferenz, TagesPraeferenz } from "@/lib/dashboard/verfuegbarkeit";
import { leererZustand } from "@/lib/formular";

import { loescheTagesPraeferenz, setzeTagesPraeferenz, speichereWiederkehrendePraeferenzen } from "./aktionen";

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function nameVon(v: MeineVorlage): string {
  return `${v.bezeichnung} · ${v.start_zeit.slice(0, 5)}–${v.end_zeit.slice(0, 5)}`;
}

function formatiereDatum(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const chipBasis =
  "rounded-blk border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70";
function chipKlasse(aktiv: boolean): string {
  return `${chipBasis} ${aktiv ? "border-signal bg-signal-weak text-text" : "border-line text-muted hover:text-text"}`;
}

/**
 * Zwei Knöpfe pro Vorlage, „Gerne“/„Ungerne“ — Spiegel von `PrefToggle` in
 * `scheduling.tsx`. Beide sind eigene Formulare: ein zweiter Klick auf den
 * schon aktiven Knopf entfernt den Wunsch wieder, das entscheidet die
 * Server Action anhand des bestehenden Stands, nicht der Klick selbst.
 */
function PraeferenzKnoepfe({
  aktuell,
  aktion,
  felder,
}: {
  aktuell?: Praeferenz;
  aktion: (formData: FormData) => void;
  felder: { schicht_vorlage_id: string; datum?: string };
}) {
  return (
    <div className="flex gap-2">
      {(["gerne", "ungerne"] as const).map((p) => (
        <form key={p} action={aktion}>
          <input type="hidden" name="schicht_vorlage_id" value={felder.schicht_vorlage_id} />
          {felder.datum ? <input type="hidden" name="datum" value={felder.datum} /> : null}
          <input type="hidden" name="praeferenz" value={p} />
          <button type="submit" className={chipKlasse(aktuell === p)}>
            {p === "gerne" ? "Arbeite gerne" : "Arbeite ungerne"}
          </button>
        </form>
      ))}
    </div>
  );
}

/**
 * Zwei Knöpfe pro Vorlage für die Sammelauswahl — anders als
 * `PraeferenzKnoepfe` oben kein eigenes Formular pro Knopf, sondern ein
 * blosser Klick, der nur den lokalen Entwurf ändert. Geschrieben wird
 * erst beim „Speichern" weiter unten.
 */
function EntwurfsKnoepfe({
  aktuell,
  onWaehlen,
}: {
  aktuell?: Praeferenz;
  onWaehlen: (p: Praeferenz) => void;
}) {
  return (
    <div className="flex gap-2">
      {(["gerne", "ungerne"] as const).map((p) => (
        <button key={p} type="button" onClick={() => onWaehlen(p)} className={chipKlasse(aktuell === p)}>
          {p === "gerne" ? "Arbeite gerne" : "Arbeite ungerne"}
        </button>
      ))}
    </div>
  );
}

function SpeichernKnopf() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Speichert …" : "Änderungen speichern"}
    </button>
  );
}

/**
 * Wiederkehrende Wünsche, nach Wochentag gruppiert — Spiegel des
 * Wochenrasters in `PlanningSection`, aber mit einer Abweichung vom
 * Vorbild: statt jeden Klick sofort zu schreiben (`toggleRecur()`),
 * sammelt diese Liste die Auswahl lokal und schreibt erst auf
 * „Änderungen speichern" — Entscheidung des Nutzers vom 2026-09-01.
 *
 * `entwurf` trägt nur **Abweichungen** vom Server-Stand: fehlt ein
 * Eintrag, gilt `praeferenzen[id]` unverändert. `null` heisst „entfernen".
 * So lässt sich mit einem Vergleich gegen `praeferenzen` genau bestimmen,
 * was sich wirklich geändert hat — auch wenn jemand hin- und herklickt
 * und am Ende wieder beim Ausgangswert landet.
 */
export function WiederkehrendeListe({
  vorlagen,
  praeferenzen,
}: {
  vorlagen: MeineVorlage[];
  praeferenzen: Record<string, Praeferenz>;
}) {
  const [zustand, aktion] = useActionState(speichereWiederkehrendePraeferenzen, leererZustand);
  const [entwurf, setEntwurf] = useState<Record<string, Praeferenz | null>>({});
  /*
   * Getrennt von `zustand.nachricht`: eine Server-Action-Antwort bleibt
   * über `useActionState` bestehen, bis eine neue Aktion abgeschickt
   * wird — ohne diese Kopie würde ein „Verwerfen" (das die Aktion gar
   * nicht aufruft) die Meldung des *letzten* Speicherns wieder zeigen,
   * sobald `geaenderteIds` auf null zurückfällt.
   */
  const [hinweis, setHinweis] = useState<{ art: "erfolg" | "fehler"; text: string } | null>(null);

  useEffect(() => {
    if (zustand.status === "erfolg") {
      setEntwurf({});
      setHinweis(zustand.nachricht ? { art: "erfolg", text: zustand.nachricht } : null);
    } else if (zustand.status === "fehler" && zustand.nachricht) {
      setHinweis({ art: "fehler", text: zustand.nachricht });
    }
  }, [zustand]);

  if (vorlagen.length === 0) {
    return <p className="mt-3 text-sm text-muted">Keine Schichtvorlagen für deine Rollen.</p>;
  }

  function effektiv(vorlageId: string): Praeferenz | undefined {
    if (vorlageId in entwurf) return entwurf[vorlageId] ?? undefined;
    return praeferenzen[vorlageId];
  }

  function waehlen(vorlageId: string, praeferenz: Praeferenz) {
    setHinweis(null);
    setEntwurf((vorher) => {
      const bisher = vorlageId in vorher ? vorher[vorlageId] : (praeferenzen[vorlageId] ?? null);
      const naechster = bisher === praeferenz ? null : praeferenz;
      return { ...vorher, [vorlageId]: naechster };
    });
  }

  function verwerfen() {
    setEntwurf({});
    setHinweis(null);
  }

  const geaenderteIds = Object.keys(entwurf).filter((id) => entwurf[id] !== (praeferenzen[id] ?? null));
  const aenderungenJson = JSON.stringify(
    geaenderteIds.map((id) => ({ schichtVorlageId: id, praeferenz: entwurf[id] })),
  );

  return (
    <div className="mt-3 flex flex-col gap-4">
      {WOCHENTAGE.map((name, wochentag) => {
        const vs = vorlagen.filter((v) => v.wochentag === wochentag);
        if (vs.length === 0) return null;
        return (
          <div key={wochentag}>
            <h3 className="text-sm font-semibold text-text">{name}</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {vs.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3"
                >
                  <span className="text-sm text-text">{nameVon(v)}</span>
                  <EntwurfsKnoepfe aktuell={effektiv(v.id)} onWaehlen={(p) => waehlen(v.id, p)} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {geaenderteIds.length > 0 ? (
        <form
          action={aktion}
          className="sticky bottom-4 flex flex-wrap items-center gap-3 self-start rounded-panel border border-line-strong bg-surface px-4 py-3 shadow-lg"
        >
          <input type="hidden" name="aenderungen" value={aenderungenJson} />
          <span className="text-sm text-muted">
            {geaenderteIds.length} {geaenderteIds.length === 1 ? "Änderung" : "Änderungen"} noch nicht gespeichert
          </span>
          <SpeichernKnopf />
          <button
            type="button"
            onClick={verwerfen}
            className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            Verwerfen
          </button>
        </form>
      ) : hinweis ? (
        <FormMeldung art={hinweis.art}>{hinweis.text}</FormMeldung>
      ) : null}
    </div>
  );
}

/** Wünsche für das gewählte Datum — Spiegel des Auswahl-Sheets in `SpecialDates`. */
export function TagesAuswahlListe({
  datum,
  vorlagen,
  bestehend,
}: {
  datum: string;
  vorlagen: MeineVorlage[];
  bestehend: TagesPraeferenz[];
}) {
  const [, aktion] = useActionState(setzeTagesPraeferenz, leererZustand);
  const praeferenzVon = (vorlageId: string) => bestehend.find((b) => b.schichtVorlageId === vorlageId)?.praeferenz;

  if (vorlagen.length === 0) {
    return <p className="mt-3 text-sm text-muted">Keine Schichten für deine Rolle an diesem Tag.</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {vorlagen.map((v) => (
        <li
          key={v.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3"
        >
          <span className="text-sm text-text">{nameVon(v)}</span>
          <PraeferenzKnoepfe
            aktuell={praeferenzVon(v.id)}
            aktion={aktion}
            felder={{ schicht_vorlage_id: v.id, datum }}
          />
        </li>
      ))}
    </ul>
  );
}

/** Bereits gesetzte Wünsche für einzelne Tage, mit Löschen — Spiegel der Liste unter dem Monatsraster in `SpecialDates`. */
export function BestehendeTagesPraeferenzenListe({
  praeferenzen,
  vorlagenNamen,
}: {
  praeferenzen: TagesPraeferenz[];
  vorlagenNamen: Record<string, string>;
}) {
  const [, aktion] = useActionState(loescheTagesPraeferenz, leererZustand);

  if (praeferenzen.length === 0) {
    return <p className="mt-3 text-sm text-muted">Noch keine speziellen Tage.</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {praeferenzen.map((p) => (
        <li
          key={`${p.schichtVorlageId}-${p.datum}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3"
        >
          <div>
            <p className="text-sm text-text">{formatiereDatum(p.datum)}</p>
            <p className="text-xs text-muted">
              {vorlagenNamen[p.schichtVorlageId] ?? "Schicht"} ·{" "}
              {p.praeferenz === "gerne" ? "Arbeite gerne" : "Arbeite ungerne"}
            </p>
          </div>
          <form action={aktion}>
            <input type="hidden" name="schicht_vorlage_id" value={p.schichtVorlageId} />
            <input type="hidden" name="datum" value={p.datum} />
            <button type="submit" aria-label="Wunsch löschen" className="rounded-blk p-2 text-muted hover:bg-surface-sunk hover:text-stop">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
