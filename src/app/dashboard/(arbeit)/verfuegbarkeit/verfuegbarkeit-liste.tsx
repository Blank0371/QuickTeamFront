"use client";

import { MessageSquareText, Trash2 } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import { DatumWahl } from "@/components/formular/datum-wahl";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/de";
import { useKlientTexte } from "@/i18n/sprach-provider";
import { fuelle } from "@/i18n/text";
import { wochentagVon, type MeineVorlage, type Praeferenz, type TagesPraeferenz } from "@/lib/dashboard/verfuegbarkeit";
import { leererZustand } from "@/lib/formular";
import { TAGES_NOTIZ_MAX, tageswuenscheSchema } from "@/lib/validierung";

import {
  loescheTagesPraeferenz,
  speichereTagesNotiz,
  speichereTageswuensche,
  speichereWiederkehrendePraeferenzen,
} from "./aktionen";

type Texte = Dictionary["verfuegbarkeit"];

function nameVon(v: MeineVorlage): string {
  return `${v.bezeichnung} · ${v.start_zeit.slice(0, 5)}–${v.end_zeit.slice(0, 5)}`;
}

function formatiereDatum(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
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
 * Zwei Knöpfe pro Vorlage für die Sammelauswahl — anders als
 * `PraeferenzKnoepfe` oben kein eigenes Formular pro Knopf, sondern ein
 * blosser Klick, der nur den lokalen Entwurf ändert. Geschrieben wird
 * erst beim „Speichern" weiter unten.
 */
function EntwurfsKnoepfe({
  aktuell,
  onWaehlen,
  t,
}: {
  aktuell?: Praeferenz;
  onWaehlen: (p: Praeferenz) => void;
  t: Texte;
}) {
  return (
    <div className="flex gap-2">
      {(["gerne", "ungerne"] as const).map((p) => (
        <button key={p} type="button" onClick={() => onWaehlen(p)} className={chipKlasse(aktuell === p)}>
          {p === "gerne" ? t.gerneIch : t.ungerneIch}
        </button>
      ))}
    </div>
  );
}

function SpeichernKnopf({ t }: { t: Texte }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? t.speichertLaufend : t.speichern}
    </button>
  );
}

/** „1 Änderung …" / „3 Änderungen …" noch nicht gespeichert. */
function offeneAenderungen(n: number, t: Texte): string {
  return fuelle(n === 1 ? t.aenderungEins : t.aenderungMehr, { n });
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
  texte: t,
  wochentage,
}: {
  vorlagen: MeineVorlage[];
  praeferenzen: Record<string, Praeferenz>;
  texte: Texte;
  /** Montagsbasierte Wochentagsnamen in der Sprache der Anfrage. */
  wochentage: readonly string[];
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
    return <p className="mt-3 text-sm text-muted">{t.keineVorlagen}</p>;
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
      {wochentage.map((name, wochentag) => {
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
                  <EntwurfsKnoepfe
                    aktuell={effektiv(v.id)}
                    onWaehlen={(p) => waehlen(v.id, p)}
                    t={t}
                  />
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
            {offeneAenderungen(geaenderteIds.length, t)}
          </span>
          <SpeichernKnopf t={t} />
          <button
            type="button"
            onClick={verwerfen}
            className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            {t.verwerfen}
          </button>
        </form>
      ) : hinweis ? (
        <FormMeldung art={hinweis.art}>{hinweis.text}</FormMeldung>
      ) : null}
    </div>
  );
}

/**
 * Notiz zu einem Tageswunsch — für die Betriebsleitung lesbar
 * (`holeTeamTagesPraeferenzen`). Zugeklappt steht nur die Notiz selbst
 * bzw. „Notiz hinzufügen"; ein leeres Feld speichert `null`, also
 * „entfernen". Web-eigen, die App kennt die Spalte nicht.
 */
function TagesNotiz({
  schichtVorlageId,
  datum,
  notiz,
  t,
}: {
  schichtVorlageId: string;
  datum: string;
  notiz: string | null;
  t: Texte;
}) {
  const [zustand, aktion] = useActionState(speichereTagesNotiz, leererZustand);
  const [offen, setOffen] = useState(false);
  /*
   * Eigene Kopie der Erfolgsmeldung, wie in `WiederkehrendeListe`: der
   * Aktionszustand bliebe sonst nach „Abbrechen" stehen. Der `key` der
   * Komponente hängt bewusst **nicht** an der Notiz — sonst baute React
   * sie beim Neuladen nach dem Speichern neu auf, und die Bestätigung
   * ginge mit der alten Instanz verloren.
   */
  const [gespeichert, setGespeichert] = useState<string | null>(null);
  const id = useId();

  useEffect(() => {
    if (zustand.status === "erfolg") {
      setOffen(false);
      setGespeichert(zustand.nachricht);
    }
  }, [zustand]);

  if (!offen) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        {notiz ? (
          <p className="whitespace-pre-line rounded-blk bg-surface-sunk px-3 py-2 text-sm leading-relaxed text-text">
            {notiz}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setGespeichert(null);
              setOffen(true);
            }}
            className="inline-flex items-center gap-1.5 self-start rounded-blk px-1 py-1 text-xs font-semibold text-muted transition-colors hover:text-text"
          >
            <MessageSquareText className="size-3.5" aria-hidden="true" />
            {notiz ? t.notizBearbeiten : t.notizHinzufuegen}
          </button>
        </div>
        {gespeichert ? <FormMeldung art="erfolg">{gespeichert}</FormMeldung> : null}
      </div>
    );
  }

  const fehler = zustand.felder.notiz;

  return (
    <form action={aktion} className="flex w-full flex-col gap-2">
      <input type="hidden" name="schicht_vorlage_id" value={schichtVorlageId} />
      <input type="hidden" name="datum" value={datum} />
      <label htmlFor={id} className="text-sm font-medium text-text">
        {t.notizLabel}
      </label>
      <p id={`${id}-hinweis`} className="text-xs leading-relaxed text-muted">
        {t.notizHinweis}
      </p>
      <textarea
        id={id}
        name="notiz"
        defaultValue={notiz ?? ""}
        maxLength={TAGES_NOTIZ_MAX}
        rows={3}
        autoFocus
        aria-describedby={`${id}-hinweis${fehler ? ` ${id}-fehler` : ""}`}
        aria-invalid={fehler ? true : undefined}
        className="rounded-blk border border-line-strong bg-bg px-3.5 py-2.5 text-sm text-text"
      />
      {fehler ? (
        <p id={`${id}-fehler`} className="text-sm font-medium text-stop">
          {fehler}
        </p>
      ) : null}
      {zustand.status === "fehler" && zustand.nachricht ? (
        <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <NotizSpeichernKnopf t={t} />
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          {t.abbrechen}
        </button>
      </div>
    </form>
  );
}

function NotizSpeichernKnopf({ t }: { t: Texte }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-blk bg-signal px-4 py-2 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? t.speichertLaufend : t.notizSpeichern}
    </button>
  );
}

type Entwurf = { praeferenz: Praeferenz | null; notiz: string };

/**
 * Wünsche für einzelne Tage — Datum wählen, die Schichten dieses
 * Wochentags erscheinen sofort (ohne Neuladen, die Vorlagen sind schon
 * da), dann „gerne"/„ungerne" und optional eine Notiz wählen und mit
 * „Speichern" bestätigen. Dasselbe Sammelmuster wie `WiederkehrendeListe`;
 * `toggleSpecial()` in `scheduling.tsx` schreibt dagegen pro Klick.
 *
 * `entwurf` ist nach `datum|vorlageId` geschlüsselt und trägt nur
 * Abweichungen vom Server-Stand — wer den Tag wechselt, verliert seine
 * Auswahl nicht, gespeichert wird alles auf einmal.
 */
export function TagesWunschEditor({
  vorlagen,
  bestehend,
  min,
  max,
  startDatum,
  texte: t,
}: {
  vorlagen: MeineVorlage[];
  bestehend: TagesPraeferenz[];
  min: string;
  max: string;
  startDatum: string | null;
  texte: Texte;
}) {
  const [zustand, aktion] = useActionState(speichereTageswuensche, leererZustand);
  const [datum, setDatum] = useState<string>(startDatum ?? "");
  const [entwurf, setEntwurf] = useState<Record<string, Entwurf>>({});
  const [hinweis, setHinweis] = useState<{ art: "erfolg" | "fehler"; text: string } | null>(null);

  useEffect(() => {
    if (zustand.status === "erfolg") {
      setEntwurf({});
      setHinweis(zustand.nachricht ? { art: "erfolg", text: zustand.nachricht } : null);
    } else if (zustand.status === "fehler" && zustand.nachricht) {
      setHinweis({ art: "fehler", text: zustand.nachricht });
    }
  }, [zustand]);

  const serverStand = (tag: string, vorlageId: string): Entwurf => {
    const b = bestehend.find((x) => x.datum === tag && x.schichtVorlageId === vorlageId);
    return { praeferenz: b?.praeferenz ?? null, notiz: b?.notiz ?? "" };
  };
  const effektiv = (tag: string, vorlageId: string): Entwurf =>
    entwurf[`${tag}|${vorlageId}`] ?? serverStand(tag, vorlageId);

  function aendere(vorlageId: string, neu: Partial<Entwurf>) {
    setHinweis(null);
    setEntwurf((vorher) => {
      const k = `${datum}|${vorlageId}`;
      const bisher = vorher[k] ?? serverStand(datum, vorlageId);
      return { ...vorher, [k]: { ...bisher, ...neu } };
    });
  }

  const aenderungen = Object.entries(entwurf)
    .map(([k, e]) => {
      const [tag = "", vorlageId = ""] = k.split("|");
      const s = serverStand(tag, vorlageId);
      const notiz = e.praeferenz ? e.notiz.trim() : "";
      const gleich = e.praeferenz === s.praeferenz && notiz === s.notiz.trim();
      return gleich
        ? null
        : { schichtVorlageId: vorlageId, datum: tag, praeferenz: e.praeferenz, notiz: notiz || null };
    })
    .filter((a) => a !== null);

  const tagesVorlagen = datum ? vorlagen.filter((v) => v.wochentag === wochentagVon(datum)) : [];

  return (
    <div className="mt-3 flex flex-col gap-4">
      <DatumWahl
        name="datum"
        label={t.datum}
        platzhalter={t.tagWaehlen}
        min={min}
        max={max}
        defaultValue={datum}
        onChange={(wert) => {
          setDatum(wert);
          setHinweis(null);
        }}
        className="max-w-xs"
      />

      {datum && tagesVorlagen.length === 0 ? (
        <p className="text-sm text-muted">{t.keineSchichtTag}</p>
      ) : null}

      {tagesVorlagen.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {tagesVorlagen.map((v) => {
            const e = effektiv(datum, v.id);
            return (
              <li key={`${datum}-${v.id}`} className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-text">{nameVon(v)}</span>
                  <EntwurfsKnoepfe
                    aktuell={e.praeferenz ?? undefined}
                    onWaehlen={(p) => aendere(v.id, { praeferenz: e.praeferenz === p ? null : p })}
                    t={t}
                  />
                </div>
                {e.praeferenz ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted">{t.notizOptional}</span>
                    <textarea
                      value={e.notiz}
                      onChange={(ev) => aendere(v.id, { notiz: ev.target.value })}
                      maxLength={TAGES_NOTIZ_MAX}
                      rows={2}
                      className="rounded-blk border border-line-strong bg-bg px-3.5 py-2 text-sm text-text"
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {aenderungen.length > 0 ? (
        <form
          action={aktion}
          onSubmit={(ev) => {
            if (!tageswuenscheSchema.safeParse(aenderungen).success) {
              ev.preventDefault();
              setHinweis({ art: "fehler", text: t.notizZuLang });
            }
          }}
          className="sticky bottom-4 flex flex-wrap items-center gap-3 self-start rounded-panel border border-line-strong bg-surface px-4 py-3 shadow-lg"
        >
          <input type="hidden" name="aenderungen" value={JSON.stringify(aenderungen)} />
          <span className="text-sm text-muted">{offeneAenderungen(aenderungen.length, t)}</span>
          <SpeichernKnopf t={t} />
          <button
            type="button"
            onClick={() => {
              setEntwurf({});
              setHinweis(null);
            }}
            className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            {t.verwerfen}
          </button>
        </form>
      ) : null}

      {hinweis ? <FormMeldung art={hinweis.art}>{hinweis.text}</FormMeldung> : null}
    </div>
  );
}

/** Bereits gesetzte Wünsche für einzelne Tage, mit Löschen — Spiegel der Liste unter dem Monatsraster in `SpecialDates`. */
export function BestehendeTagesPraeferenzenListe({
  praeferenzen,
  vorlagenNamen,
  texte: t,
}: {
  praeferenzen: TagesPraeferenz[];
  vorlagenNamen: Record<string, string>;
  texte: Texte;
}) {
  const { locale } = useKlientTexte();
  const [, aktion] = useActionState(loescheTagesPraeferenz, leererZustand);

  if (praeferenzen.length === 0) {
    return <p className="mt-3 text-sm text-muted">{t.keineTage}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {praeferenzen.map((p) => (
        <li
          key={`${p.schichtVorlageId}-${p.datum}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3"
        >
          <div>
            <p className="text-sm text-text">{formatiereDatum(p.datum, locale)}</p>
            <p className="text-xs text-muted">
              {vorlagenNamen[p.schichtVorlageId] ?? t.schicht} ·{" "}
              {p.praeferenz === "gerne" ? t.gerneIch : t.ungerneIch}
            </p>
          </div>
          <form action={aktion}>
            <input type="hidden" name="schicht_vorlage_id" value={p.schichtVorlageId} />
            <input type="hidden" name="datum" value={p.datum} />
            <button type="submit" aria-label={t.wunschLoeschen} className="rounded-blk p-2 text-muted hover:bg-surface-sunk hover:text-stop">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </form>
          <TagesNotiz
            key={`${p.schichtVorlageId}-${p.datum}`}
            schichtVorlageId={p.schichtVorlageId}
            datum={p.datum}
            notiz={p.notiz}
            t={t}
          />
        </li>
      ))}
    </ul>
  );
}
