"use client";

import { useActionState, useEffect, useState } from "react";

import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { ChefUrlaubsantrag, MeinUrlaub, UrlaubStatus } from "@/lib/dashboard/urlaub";
import { leererZustand, type FormZustand } from "@/lib/formular";

import { entscheiden } from "./aktionen";

type UrlaubTexte = Dictionary["urlaub"];

function statusLabel(status: UrlaubStatus, texte: UrlaubTexte): string {
  return status === "requested"
    ? texte.statusRequested
    : status === "approved"
      ? texte.statusApproved
      : texte.statusDenied;
}

function formatiereDatum(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatiereZeitraum(von: string, bis: string, locale: Locale): string {
  return von === bis
    ? formatiereDatum(von, locale)
    : `${formatiereDatum(von, locale)} – ${formatiereDatum(bis, locale)}`;
}

const knopfBasis =
  "rounded-blk px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70";
const knopfSignal = `${knopfBasis} bg-signal text-signal-ink hover:bg-signal-hover`;
const knopfStop = `${knopfBasis} border border-stop/50 text-stop hover:bg-stop/10`;
const knopfNeutral = `${knopfBasis} border border-line text-text hover:bg-surface-sunk`;
const statusPill = "rounded-full border border-line px-2 py-0.5 text-[0.6875rem] font-semibold text-muted";

/** Eigene Anträge — reine Statusliste, kein Zurückziehen (spiegelt `VacationSection`: die App bietet das nicht an). */
export function MeineUrlaubeListe({
  urlaube,
  texte,
  locale,
}: {
  urlaube: MeinUrlaub[];
  texte: UrlaubTexte;
  locale: Locale;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-text">{texte.deineAntraege}</h2>
      {urlaube.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{texte.keineEigenen}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {urlaube.map((u) => (
            <li key={u.id} className="rounded-card border border-line bg-surface px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-text">
                  {formatiereZeitraum(u.von, u.bis, locale)}
                </span>
                <span className={statusPill}>{statusLabel(u.status, texte)}</span>
              </div>
              {u.kommentar ? <p className="mt-1 text-sm text-muted">„{u.kommentar}“</p> : null}
              {u.begruendung ? (
                <p className="mt-1 text-sm text-text">
                  <span className="font-semibold">{texte.begruendung}</span>
                  {u.begruendung}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Chef-Sicht auf alle Anträge des Betriebs — Spiegel von `EmployeesSection`
 * in `manager.tsx`: offen zuerst, entschieden eingeklappt. Beide Richtungen
 * lassen sich auch nach der ersten Entscheidung noch umkehren
 * (`changeToApproved`/`changeToDenied`) — dieselbe Aktion, derselbe
 * Kontingent-Wächter beim Wechsel zu „genehmigt“.
 */
export function ChefUrlaubsantraegeListe({
  antraege,
  texte,
  locale,
}: {
  antraege: ChefUrlaubsantrag[];
  texte: UrlaubTexte;
  locale: Locale;
}) {
  const [zustand, aktion] = useActionState(entscheiden, leererZustand);
  const [zeigeEntschieden, setZeigeEntschieden] = useState(false);

  const offen = antraege.filter((a) => a.status === "requested");
  const entschieden = antraege.filter((a) => a.status !== "requested");

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-text">{texte.antraegeTitel}</h2>

      <div className="mt-3 rounded-card border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold text-text">{texte.offen}</h3>
        {offen.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{texte.keineOffenen}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {offen.map((a) => (
              <AntragZeile
                key={a.id}
                antrag={a}
                aktion={aktion}
                zustand={zustand}
                texte={texte}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setZeigeEntschieden((o) => !o)}
        className="mt-3 flex w-full items-center justify-between rounded-card border border-line bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
      >
        {texte.entschieden.replace("{n}", String(entschieden.length))}
        <span aria-hidden="true">{zeigeEntschieden ? "–" : "+"}</span>
      </button>

      {zeigeEntschieden ? (
        <div className="mt-2 rounded-card border border-line bg-surface p-4">
          {entschieden.length === 0 ? (
            <p className="text-sm text-muted">{texte.nichtsEntschieden}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entschieden.map((a) => (
                <AntragZeile
                  key={a.id}
                  antrag={a}
                  aktion={aktion}
                  zustand={zustand}
                  texte={texte}
                  locale={locale}
                  entschieden
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function AntragZeile({
  antrag,
  aktion,
  zustand,
  texte,
  locale,
  entschieden = false,
}: {
  antrag: ChefUrlaubsantrag;
  aktion: (formData: FormData) => void;
  zustand: FormZustand;
  texte: UrlaubTexte;
  locale: Locale;
  entschieden?: boolean;
}) {
  const [ablehnenModus, setAblehnenModus] = useState(false);

  /*
   * Ohne das bleibt das Grund-Feld nach einer erfolgreichen Ablehnung
   * offen stehen: `entscheiden()` löst über `revalidatePath` einen neuen
   * Server-Durchlauf aus, aber die lokale `ablehnenModus`-Auswahl gehört
   * dieser Komponenteninstanz und überlebt den Re-Render unverändert.
   */
  useEffect(() => {
    if (zustand.status === "erfolg") setAblehnenModus(false);
  }, [zustand]);

  return (
    <li className="border-t border-line pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">{antrag.mitarbeiterName}</span>
        {entschieden ? (
          <span className={statusPill}>{statusLabel(antrag.status, texte)}</span>
        ) : null}
      </div>
      <p className="text-sm text-muted">{formatiereZeitraum(antrag.von, antrag.bis, locale)}</p>
      {antrag.kommentar ? <p className="mt-1 text-sm text-muted">„{antrag.kommentar}“</p> : null}
      {antrag.begruendung ? (
        <p className="mt-1 text-sm text-text">
          <span className="font-semibold">{texte.begruendung}</span>
          {antrag.begruendung}
        </p>
      ) : null}

      <div className="mt-2">
        {ablehnenModus ? (
          <form action={aktion} className="flex flex-col gap-2">
            <input type="hidden" name="urlaub_id" value={antrag.id} />
            <input type="hidden" name="status" value="denied" />
            <input
              type="text"
              name="begruendung"
              maxLength={50}
              placeholder={texte.grundPlatzhalter}
              className="w-full rounded-blk border border-line-strong bg-bg px-3 py-2 text-sm text-text"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAblehnenModus(false)} className={knopfNeutral}>
                {texte.abbrechen}
              </button>
              <button type="submit" className={knopfStop}>
                {texte.ablehnungBestaetigen}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {antrag.status !== "denied" ? (
              <button type="button" onClick={() => setAblehnenModus(true)} className={knopfStop}>
                {entschieden ? texte.zuAbgelehnt : texte.ablehnen}
              </button>
            ) : null}
            {antrag.status !== "approved" ? (
              <form action={aktion}>
                <input type="hidden" name="urlaub_id" value={antrag.id} />
                <input type="hidden" name="status" value="approved" />
                <button type="submit" className={knopfSignal}>
                  {entschieden ? texte.zuGenehmigt : texte.genehmigen}
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}
