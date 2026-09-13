"use client";

import { useActionState, useState } from "react";

import type { GegenKandidat, TauschAngebot, TauschStatus } from "@/lib/dashboard/tausch";
import { leererZustand } from "@/lib/formular";

import { anbieterEntscheiden, antworten, chefEntscheiden, zurueckziehen } from "./aktionen";

const STATUS_LABEL: Record<TauschStatus, string> = {
  offen: "Offen",
  angefragt: "Angefragt",
  wartet_auf_chef: "Wartet auf Freigabe",
  bestaetigt: "Bestätigt",
  abgelehnt_chef: "Abgelehnt",
  abgelehnt_system: "Nicht möglich",
  zurueckgezogen: "Zurückgezogen",
};

function formatiereTag(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatiereSchicht(datum: string, start: string, end: string): string {
  return `${formatiereTag(datum)} · ${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

const knopfBasis =
  "rounded-blk px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70";
const knopfSignal = `${knopfBasis} bg-signal text-signal-ink hover:bg-signal-hover`;
const knopfStop = `${knopfBasis} border border-stop/50 text-stop hover:bg-stop/10`;

export function TauschListe({ angebote, chef }: { angebote: TauschAngebot[]; chef: boolean }) {
  const [, antwortenAktion] = useActionState(antworten, leererZustand);
  const [, anbieterAktion] = useActionState(anbieterEntscheiden, leererZustand);
  const [, chefAktion] = useActionState(chefEntscheiden, leererZustand);
  const [, zurueckziehenAktion] = useActionState(zurueckziehen, leererZustand);

  if (angebote.length === 0) {
    return <p className="mt-6 text-sm text-muted">Gerade keine offenen Tauschanfragen.</p>;
  }

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {angebote.map((a) => (
        <li key={a.id}>
          <TauschKarte
            angebot={a}
            chef={chef}
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
  antwortenAktion,
  anbieterAktion,
  chefAktion,
  zurueckziehenAktion,
}: {
  angebot: TauschAngebot;
  chef: boolean;
  antwortenAktion: (formData: FormData) => void;
  anbieterAktion: (formData: FormData) => void;
  chefAktion: (formData: FormData) => void;
  zurueckziehenAktion: (formData: FormData) => void;
}) {
  const [kandidatId, setKandidatId] = useState<string | null>(a.kandidaten[0]?.zuweisungId ?? null);

  return (
    <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-signal">Schichttausch</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[0.6875rem] font-semibold text-muted">
          {STATUS_LABEL[a.status]}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">Bietet an</p>
      <p className="font-display text-base text-text">
        {formatiereSchicht(a.angebotenDatum, a.angebotenStart, a.angebotenEnd)}
      </p>
      <p className="text-sm text-muted">
        {a.angebotenRolleName} · {a.anbieterName}
      </p>

      {a.praeferenzTage.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Wunschtage: {a.praeferenzTage.map(formatiereTag).join(", ")}
        </p>
      ) : null}

      {a.gegenDatum && a.gegenStart && a.gegenEnd ? (
        <div className="mt-2">
          <p className="text-sm text-muted">Dagegen{a.uebernehmerName ? ` · ${a.uebernehmerName}` : ""}</p>
          <p className="text-sm text-text">{formatiereSchicht(a.gegenDatum, a.gegenStart, a.gegenEnd)}</p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        {a.status === "offen" && a.isAnbieter ? (
          <ZurueckziehenAktion anfrageId={a.id} aktion={zurueckziehenAktion} />
        ) : a.status === "offen" && a.eligible ? (
          <AntwortenAktion
            benachrichtigungId={a.benachrichtigungId}
            kandidaten={a.kandidaten}
            kandidatId={kandidatId}
            setKandidatId={setKandidatId}
            aktion={antwortenAktion}
          />
        ) : a.status === "angefragt" && a.isAnbieter ? (
          <AnbieterEntscheidenAktion anfrageId={a.id} aktion={anbieterAktion} />
        ) : a.status === "wartet_auf_chef" && chef ? (
          <ChefEntscheidenAktion anfrageId={a.id} aktion={chefAktion} />
        ) : a.status === "angefragt" && a.isUebernehmer ? (
          <p className="text-sm text-muted">Wartet auf Bestätigung durch {a.anbieterName}.</p>
        ) : a.status === "wartet_auf_chef" && (a.isAnbieter || a.isUebernehmer) ? (
          <p className="text-sm text-muted">Wartet auf Freigabe durch die Betriebsleitung.</p>
        ) : (
          <p className="text-sm text-muted">{STATUS_LABEL[a.status]}.</p>
        )}
      </div>
    </div>
  );
}

function ZurueckziehenAktion({
  anfrageId,
  aktion,
}: {
  anfrageId: string;
  aktion: (formData: FormData) => void;
}) {
  return (
    <form action={aktion}>
      <input type="hidden" name="anfrage_id" value={anfrageId} />
      <p className="mb-2 text-sm text-muted">Dein Angebot — noch niemand hat geantwortet.</p>
      <button type="submit" className={knopfStop}>
        Zurückziehen
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
}: {
  benachrichtigungId: string | null;
  kandidaten: GegenKandidat[];
  kandidatId: string | null;
  setKandidatId: (id: string) => void;
  aktion: (formData: FormData) => void;
}) {
  if (!benachrichtigungId) {
    return <p className="text-sm text-muted">Dieses Angebot ist nicht mehr gültig.</p>;
  }
  return (
    <form action={aktion} className="flex flex-col gap-2">
      <input type="hidden" name="benachrichtigung_id" value={benachrichtigungId} />
      <p className="text-sm text-muted">Welche deiner Schichten bietest du dafür an?</p>
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
          {formatiereSchicht(k.datum, k.start_zeit, k.end_zeit)}
        </label>
      ))}
      <button type="submit" disabled={!kandidatId} className={`${knopfSignal} self-start`}>
        Angebot senden
      </button>
    </form>
  );
}

function AnbieterEntscheidenAktion({
  anfrageId,
  aktion,
}: {
  anfrageId: string;
  aktion: (formData: FormData) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Jemand bietet eine Schicht dafür an — annehmen?</p>
      <div className="flex gap-2">
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="zustimmen" value="true" />
          <button type="submit" className={knopfSignal}>
            Bestätigen
          </button>
        </form>
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="zustimmen" value="false" />
          <button type="submit" className={knopfStop}>
            Ablehnen
          </button>
        </form>
      </div>
    </div>
  );
}

function ChefEntscheidenAktion({
  anfrageId,
  aktion,
}: {
  anfrageId: string;
  aktion: (formData: FormData) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Freigabe erforderlich.</p>
      <div className="flex gap-2">
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="genehmigt" value="true" />
          <button type="submit" className={knopfSignal}>
            Genehmigen
          </button>
        </form>
        <form action={aktion}>
          <input type="hidden" name="anfrage_id" value={anfrageId} />
          <input type="hidden" name="genehmigt" value="false" />
          <button type="submit" className={knopfStop}>
            Ablehnen
          </button>
        </form>
      </div>
    </div>
  );
}
