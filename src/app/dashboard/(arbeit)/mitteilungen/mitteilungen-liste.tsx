"use client";

import { Check, FileText, Pin } from "lucide-react";
import { useActionState, useState } from "react";

import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import {
  naechsteAuswahl,
  type Mitteilung,
  type MitteilungsTyp,
  type Prioritaet,
} from "@/lib/dashboard/mitteilungen";
import { leererZustand } from "@/lib/formular";

import { aufgabeUmschalten, stimmeAbgeben } from "./aktionen";

type MitteilungenTexte = Dictionary["mitteilungen"];

const PRIO_GEWICHT: Record<Prioritaet, number> = { dringend: 3, wichtig: 2, normal: 1 };
const WOCHE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * `dringend`/`wichtig` bekommen in der App eigene Farben (Rot, Amber) —
 * hier nicht: „Rot ist Fehlern und destruktiven Aktionen vorbehalten"
 * (`CLAUDE.md`, harte Vorgabe), und ein Amber-Token gibt es in der
 * Palette nicht. Beide Stufen heben sich deshalb über `--qt-signal` ab,
 * nur mit unterschiedlichem Gewicht — gefüllt für dringend, umrandet für
 * wichtig.
 */
function PrioritaetsBadge({
  prioritaet,
  texte,
}: {
  prioritaet: Prioritaet;
  texte: MitteilungenTexte;
}) {
  if (prioritaet === "normal") return null;
  const dringend = prioritaet === "dringend";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${
        dringend ? "bg-signal text-signal-ink" : "border border-signal text-signal"
      }`}
    >
      {texte.prioritaet[prioritaet]}
    </span>
  );
}

function formatiereZeit(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MitteilungenListe({
  mitteilungen,
  texte,
  locale,
}: {
  mitteilungen: Mitteilung[];
  texte: MitteilungenTexte;
  locale: Locale;
}) {
  const [suche, setSuche] = useState("");
  const [sortierung, setSortierung] = useState<"neueste" | "relevant">("neueste");
  const [kategorie, setKategorie] = useState<"alle" | MitteilungsTyp>("alle");
  const [offenId, setOffenId] = useState<string | null>(null);
  const [, aufgabeAktion] = useActionState(aufgabeUmschalten, leererZustand);
  const [, stimmeAktion] = useActionState(stimmeAbgeben, leererZustand);

  const vorhandeneKategorien = Array.from(new Set(mitteilungen.map((m) => m.typ)));
  const q = suche.trim().toLowerCase();
  const jetzt = Date.now();

  const angezeigt = mitteilungen
    .filter((m) => kategorie === "alle" || m.typ === kategorie)
    .filter(
      (m) =>
        !q ||
        (m.titel ?? "").toLowerCase().includes(q) ||
        (m.text ?? "").toLowerCase().includes(q) ||
        m.autorName.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      if (a.angeheftet !== b.angeheftet) return a.angeheftet ? -1 : 1;
      const ta = new Date(a.erstelltAm).getTime();
      const tb = new Date(b.erstelltAm).getTime();
      if (sortierung === "relevant") {
        const pa = jetzt - ta <= WOCHE_MS ? PRIO_GEWICHT[a.prioritaet] : 0;
        const pb = jetzt - tb <= WOCHE_MS ? PRIO_GEWICHT[b.prioritaet] : 0;
        if (pa !== pb) return pb - pa;
      }
      return tb - ta;
    });

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder={texte.suchen}
          aria-label={texte.suchenAria}
          className="w-full max-w-xs rounded-blk border border-line-strong bg-surface px-3.5 py-2 text-sm text-text placeholder:text-muted"
        />

        <div className="flex flex-wrap items-center gap-2">
          {(["neueste", "relevant"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortierung(s)}
              aria-pressed={sortierung === s}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                sortierung === s
                  ? "border-signal bg-signal text-signal-ink"
                  : "border-line text-muted hover:text-text"
              }`}
            >
              {s === "neueste" ? texte.neueste : texte.relevant}
            </button>
          ))}

          {/*
            Kategorien als Pillen statt als natives `<select>`.

            Das Auswahlfeld stand unmittelbar neben zwei selbstgebauten
            Pillen derselben Funktion — Systemschrift und Systempfeil
            direkt neben der eigenen Optik, die Unstimmigkeit war ein
            Element breit. Ein drittes Bauteil einzufuehren waere die
            falsche Antwort gewesen; hier steht deshalb dieselbe Pille
            noch einmal, nur mit dem schwaecheren aktiven Zustand aus
            `RollenFilter`.

            Dass die beiden Gruppen sich optisch unterscheiden, ist
            Absicht und nicht Zufall: gefuellt bedeutet Sortierung,
            schwach gefuellt bedeutet Filter. Zwei voll gefuellte Pillen
            nebeneinander sahen aus wie zwei Antworten auf dieselbe
            Frage.

            Nur gezeigt, wenn es ueberhaupt etwas zu filtern gibt — bei
            einer einzigen vorhandenen Kategorie waere „Alle" neben
            genau einer Kategorie keine Auswahl.
          */}
          {vorhandeneKategorien.length > 1 ? (
            <>
              <span aria-hidden="true" className="h-5 w-px bg-line" />

              <div
                role="group"
                aria-label={texte.kategorieFilterAria}
                className="flex flex-wrap items-center gap-2"
              >
                {(["alle", ...vorhandeneKategorien] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKategorie(k)}
                    aria-pressed={kategorie === k}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      kategorie === k
                        ? "border-signal bg-signal-weak text-text"
                        : "border-line text-muted hover:border-line-control hover:text-text"
                    }`}
                  >
                    {k === "alle" ? texte.alle : texte.kategorie[k]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {angezeigt.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          {mitteilungen.length === 0 ? texte.keineVorhanden : texte.nichtsGefunden}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {angezeigt.map((m) => (
            <li key={m.id}>
              <MitteilungsKarte
                mitteilung={m}
                offen={offenId === m.id}
                onToggle={() => setOffenId((cur) => (cur === m.id ? null : m.id))}
                aufgabeAktion={aufgabeAktion}
                stimmeAktion={stimmeAktion}
                texte={texte}
                locale={locale}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MitteilungsKarte({
  mitteilung: m,
  offen,
  onToggle,
  aufgabeAktion,
  stimmeAktion,
  texte,
  locale,
}: {
  mitteilung: Mitteilung;
  offen: boolean;
  onToggle: () => void;
  aufgabeAktion: (formData: FormData) => void;
  stimmeAktion: (formData: FormData) => void;
  texte: MitteilungenTexte;
  locale: Locale;
}) {
  const meineStimmen = m.optionen.filter((option) => option.meineStimme).map((option) => option.id);
  const stimmenGesamt = m.optionen.reduce((summe, option) => summe + option.anzahl, 0);

  return (
    <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        className="flex w-full flex-col items-start gap-1.5 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-signal">
            {texte.kategorie[m.typ]}
          </span>
          <PrioritaetsBadge prioritaet={m.prioritaet} texte={texte} />
          {!m.gelesen ? (
            <span className="size-2 rounded-full bg-signal" aria-hidden="true" />
          ) : null}
          {m.angeheftet ? (
            <Pin className="size-3.5 text-muted" aria-label={texte.angeheftet} />
          ) : null}
        </div>

        {m.titel ? <p className="font-display text-base text-text">{m.titel}</p> : null}

        <p className="text-xs text-muted">
          {m.autorName ? `${m.autorName} · ` : ""}
          {formatiereZeit(m.erstelltAm, locale)}
        </p>
      </button>

      {offen ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {m.text ? <p className="text-sm leading-relaxed text-text">{m.text}</p> : null}

          {m.typ === "aufgabenliste"
            ? m.aufgaben.map((aufgabe) => {
                const erledigt = Boolean(aufgabe.erledigtAm);
                return (
                  <form key={aufgabe.id} action={aufgabeAktion}>
                    <input type="hidden" name="aufgabe_id" value={aufgabe.id} />
                    <button type="submit" className="flex w-full items-start gap-2.5 py-1 text-left">
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-blk border-2 ${
                          erledigt ? "border-signal bg-signal" : "border-line-strong"
                        }`}
                      >
                        {erledigt ? <Check className="size-3.5 text-signal-ink" aria-hidden="true" /> : null}
                      </span>
                      <span className="flex flex-col">
                        <span className={`text-sm text-text ${erledigt ? "line-through opacity-60" : ""}`}>
                          {aufgabe.text}
                        </span>
                        {erledigt && aufgabe.erledigtAm ? (
                          <span className="text-xs text-muted">
                            {texte.erledigt} · {formatiereZeit(aufgabe.erledigtAm, locale)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </form>
                );
              })
            : null}

          {m.typ === "umfrage"
            ? m.optionen.map((option) => {
                const anteil = stimmenGesamt > 0 ? Math.round((option.anzahl / stimmenGesamt) * 100) : 0;
                const naechste = naechsteAuswahl(meineStimmen, option.id, m.mehrfachauswahl);
                return (
                  <div key={option.id}>
                    <form action={stimmeAktion}>
                      <input type="hidden" name="benachrichtigung_id" value={m.id} />
                      {naechste.map((id) => (
                        <input key={id} type="hidden" name="option_ids" value={id} />
                      ))}
                      <button
                        type="submit"
                        aria-pressed={option.meineStimme}
                        className="relative flex w-full items-center gap-2.5 overflow-hidden rounded-blk px-3 py-2.5 text-left"
                      >
                        <span
                          className="absolute inset-y-0 left-0 bg-surface-sunk"
                          style={{ width: `${anteil}%` }}
                          aria-hidden="true"
                        />
                        <span
                          className={`relative flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            option.meineStimme ? "border-signal bg-signal" : "border-line-strong"
                          }`}
                        >
                          {option.meineStimme ? (
                            <span className="size-1.5 rounded-full bg-signal-ink" />
                          ) : null}
                        </span>
                        <span className="relative flex-1 text-sm text-text">{option.text}</span>
                        <span className="relative text-sm font-semibold text-muted">{option.anzahl}</span>
                      </button>
                    </form>
                    {!m.anonym && option.waehlerNamen.length > 0 ? (
                      <p className="px-3 pt-1 text-xs text-muted">{option.waehlerNamen.join(", ")}</p>
                    ) : null}
                  </div>
                );
              })
            : null}
          {m.typ === "umfrage" ? (
            <p className="text-xs text-muted">
              {texte.stimmen.replace("{n}", String(stimmenGesamt))}
              {m.anonym ? texte.anonymSuffix : ""}
            </p>
          ) : null}

          {m.typ === "dokument"
            ? m.anhaenge.map((anhang) => (
                <div key={anhang.id} className="flex items-center gap-2 text-sm text-text">
                  <FileText className="size-4 text-signal" aria-hidden="true" />
                  {anhang.dateiName ?? "—"}
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
