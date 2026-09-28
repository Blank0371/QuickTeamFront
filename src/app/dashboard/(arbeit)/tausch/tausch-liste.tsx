"use client";

import { useActionState, useState } from "react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/de";
import { useKlientTexte } from "@/i18n/sprach-provider";
import { fuelle } from "@/i18n/text";
import type { GegenKandidat, TauschAngebot } from "@/lib/dashboard/tausch";
import { leererZustand } from "@/lib/formular";

import { anbieterEntscheiden, antworten, chefEntscheiden, zurueckziehen } from "./aktionen";

type Texte = Dictionary["tausch"];

function formatiereTag(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatiereSchicht(datum: string, start: string, end: string, locale: Locale): string {
  return `${formatiereTag(datum, locale)} · ${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

const knopfBasis =
  "rounded-blk px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70";
const knopfSignal = `${knopfBasis} bg-signal text-signal-ink hover:bg-signal-hover`;
const knopfStop = `${knopfBasis} border border-stop/50 text-stop hover:bg-stop/10`;

export function TauschListe({
  angebote,
  chef,
  texte: t,
}: {
  angebote: TauschAngebot[];
  chef: boolean;
  texte: Texte;
}) {
  const [, antwortenAktion] = useActionState(antworten, leererZustand);
  const [, anbieterAktion] = useActionState(anbieterEntscheiden, leererZustand);
  const [, chefAktion] = useActionState(chefEntscheiden, leererZustand);
  const [, zurueckziehenAktion] = useActionState(zurueckziehen, leererZustand);

  if (angebote.length === 0) {
    return <p className="mt-6 text-sm text-muted">{t.keineAnfragen}</p>;
  }

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {angebote.map((a) => (
        <li key={a.id}>
          <TauschKarte
            angebot={a}
            chef={chef}
            texte={t}
            antwortenAktion={antwortenAktion}
            anbieterAktion={anbieterAktion}
            chefAktion={chefAktion}
            zurueckziehenAktion={zurueckziehenAktion}
          />
        </li>
      ))}
    </ul>
  );
}

function TauschKarte({
  angebot: a,
  chef,
  texte: t,
  antwortenAktion,
  anbieterAktion,
  chefAktion,
  zurueckziehenAktion,
}: {
  angebot: TauschAngebot;
  chef: boolean;
  texte: Texte;
  antwortenAktion: (formData: FormData) => void;
  anbieterAktion: (formData: FormData) => void;
  chefAktion: (formData: FormData) => void;
  zurueckziehenAktion: (formData: FormData) => void;
}) {
  const { locale } = useKlientTexte();
  const [kandidatId, setKandidatId] = useState<string | null>(a.kandidaten[0]?.zuweisungId ?? null);

  return (
    <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-signal">
          {t.schichttausch}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[0.6875rem] font-semibold text-muted">
          {t.status[a.status]}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">{t.bietetAn}</p>
      <p className="font-display text-base text-text">
        {formatiereSchicht(a.angebotenDatum, a.angebotenStart, a.angebotenEnd, locale)}
      </p>
      <p className="text-sm text-muted">
        {a.angebotenRolleName} · {a.anbieterName}
      </p>

      {a.praeferenzTage.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          {fuelle(t.wunschtageListe, {
            tage: a.praeferenzTage.map((tag) => formatiereTag(tag, locale)).join(", "),
          })}
        </p>
      ) : null}

      {a.gegenDatum && a.gegenStart && a.gegenEnd ? (
        <div className="mt-2">
          <p className="text-sm text-muted">
            {t.dagegen}
            {a.uebernehmerName ? ` · ${a.uebernehmerName}` : ""}
          </p>
          <p className="text-sm text-text">
            {formatiereSchicht(a.gegenDatum, a.gegenStart, a.gegenEnd, locale)}
          </p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        {a.status === "offen" && a.isAnbieter ? (
          <ZurueckziehenAktion anfrageId={a.id} aktion={zurueckziehenAktion} texte={t} />
        ) : a.status === "offen" && a.eligible ? (
          <AntwortenAktion
            benachrichtigungId={a.benachrichtigungId}
            kandidaten={a.kandidaten}
            kandidatId={kandidatId}
            setKandidatId={setKandidatId}
            aktion={antwortenAktion}
            texte={t}
            locale={locale}
          />
        ) : a.status === "angefragt" && a.isAnbieter ? (
          <AnbieterEntscheidenAktion anfrageId={a.id} aktion={anbieterAktion} texte={t} />
        ) : a.status === "wartet_auf_chef" && chef ? (
          <ChefEntscheidenAktion anfrageId={a.id} aktion={chefAktion} texte={t} />
        ) : a.status === "angefragt" && a.isUebernehmer ? (
          <p className="text-sm text-muted">{fuelle(t.wartetAnbieter, { name: a.anbieterName })}</p>
        ) : a.status === "wartet_auf_chef" && (a.isAnbieter || a.isUebernehmer) ? (
          <p className="text-sm text-muted">{t.wartetChef}</p>
        ) : (
          <p className="text-sm text-muted">{t.status[a.status]}.</p>
        )}
      </div>
    </div>
  );
}

function ZurueckziehenAktion({
  anfrageId,
  aktion,
  texte: t,
}: {
  anfrageId: string;
  aktion: (formData: FormData) => void;
  texte: Texte;
}) {
  return (
    <form action={aktion}>
      <input type="hidden" name="anfrage_id" value={anfrageId} />
      <p className="mb-2 text-sm text-muted">{t.deinAngebot}</p>
      <button type="submit" className={knopfStop}>
        {t.zurueckziehen}
      </button>
    </form>
  );
}

function AntwortenAktion({
  benachrichtigungId,
  kandidaten,
  kandidatId,
  setKandidatId,
  aktion,
  texte: t,
  locale,
}: {
  benachrichtigungId: string | null;
  kandidaten: GegenKandidat[];
  kandidatId: string | null;
  setKandidatId: (id: string) => void;
  aktion: (formData: FormData) => void;
  texte: Texte;
  locale: Locale;
}) {
  if (!benachrichtigungId) {
    return <p className="text-sm text-muted">{t.ungueltig}</p>;
  }
  return (
    <form action={aktion} className="flex flex-col gap-2">
      <input type="hidden" name="benachrichtigung_id" value={benachrichtigungId} />
      <p className="text-sm text-muted">{t.welcheDeiner}</p>
      {kandidaten.map((k) => (
        <label key={k.zuweisungId} className="flex items-center gap-2 text-sm text-text">
          <input
            type="radio"
            name="gegen_zuweisung_id"
            value={k.zuweisungId}
            checked={kandidatId === k.zuweisungId}
            onChange={() => setKandidatId(k.zuweisungId)}
            className="size-4"
          />
          {formatiereSchicht(k.datum, k.start_zeit, k.end_zeit, locale)}
        </label>
      ))}
      <button type="submit" disabled={!kandidatId} className={`${knopfSignal} self-start`}>
        {t.senden}
      </button>
    </form>
  );
}

function AnbieterEntscheidenAktion({
  anfrageId,
  aktion,
  texte: t,
}: {
  anfrageId: string;
  aktion: (formData: FormData) => void;
  texte: Texte;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t.annehmenFrage}</p>
      <div className="flex gap-2">
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="zustimmen" value="true" />
          <button type="submit" className={knopfSignal}>
            {t.bestaetigen}
          </button>
        </form>
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="zustimmen" value="false" />
          <button type="submit" className={knopfStop}>
            {t.ablehnen}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChefEntscheidenAktion({
  anfrageId,
  aktion,
  texte: t,
}: {
  anfrageId: string;
  aktion: (formData: FormData) => void;
  texte: Texte;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t.freigabeNoetig}</p>
      <div className="flex gap-2">
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="genehmigt" value="true" />
          <button type="submit" className={knopfSignal}>
            {t.genehmigen}
          </button>
        </form>
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="genehmigt" value="false" />
          <button type="submit" className={knopfStop}>
            {t.ablehnen}
          </button>
        </form>
      </div>
    </div>
  );
}
