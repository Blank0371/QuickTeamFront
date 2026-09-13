"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import { ZeitWahl } from "@/components/formular/zeit-wahl";
import { leererZustand } from "@/lib/formular";

import { schichtFelderSpeichern, schichtLoeschen } from "./aktionen";

function SpeichernKnopf() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Speichert …" : "Speichern"}
    </button>
  );
}

/**
 * Datum, Zeiten und Kommentar bearbeiten — Spiegel von `saveDetails()` in
 * `shift/[id].tsx`. Einzige Prüfung dort wie hier: Start und Ende dürfen
 * nicht gleich sein, sonst ist jede Uhrzeit erlaubt — auch eine Schicht
 * über Mitternacht, und auch ein Datum ausserhalb des ursprünglichen
 * Planungszeitraums, denn die App kennt dafür keine Grenze.
 */
export function SchichtFelderFormular({
  instanzId,
  datum,
  startZeit,
  endZeit,
  kommentar,
}: {
  instanzId: string;
  datum: string;
  startZeit: string;
  endZeit: string;
  kommentar: string;
}) {
  const [zustand, aktion] = useActionState(schichtFelderSpeichern, leererZustand);

  /*
   * Unkontrollierte Felder mit `defaultValue` ignorieren spätere Props
   * nach dem ersten Rendern — ohne `key` bliebe nach einem Validierungs-
   * fehler die zuletzt gespeicherte Uhrzeit stehen, während die Meldung
   * über die gerade eingegebene spricht. Der `key` erzwingt ein Neu-
   * mounten mit dem tatsächlich abgeschickten Wert.
   */
  const datumWert = zustand.werte?.datum ?? datum;
  const startWert = zustand.werte?.start_zeit ?? startZeit.slice(0, 5);
  const endWert = zustand.werte?.end_zeit ?? endZeit.slice(0, 5);
  const kommentarWert = zustand.werte?.kommentar ?? kommentar;

  return (
    <form action={aktion} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="instanz_id" value={instanzId} />

      {zustand.nachricht ? (
        <FormMeldung art={zustand.status === "erfolg" ? "erfolg" : "fehler"}>
          {zustand.nachricht}
        </FormMeldung>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Datum</span>
          <input
            key={datumWert}
            type="date"
            name="datum"
            defaultValue={datumWert}
            required
            className="rounded-blk border border-line-strong bg-bg px-3.5 py-2.5 text-text"
          />
          {zustand.felder.datum ? <p className="text-sm font-medium text-stop">{zustand.felder.datum}</p> : null}
        </label>

        {/*
          `key` auf dem Wert: nach dem Speichern liefert die Action die
          gespeicherte Zeit zurück, und ein ungesteuerter Wähler behielte
          sonst seinen alten Zustand. Der Schlüsselwechsel baut ihn neu
          auf — dasselbe Muster wie zuvor bei den nativen Feldern.

          Über Mitternacht bleibt gültig: `ZeitWahl` liefert nur eine
          Uhrzeit und kennt keine „Ende nach Beginn"-Regel. Geprüft wird
          allein `start !== end`, in `schichtFelderSchema` und in
          `chk_instanz_zeiten_verschieden`.
        */}
        <ZeitWahl
          key={`start-${startWert}`}
          id="schicht-start"
          name="start_zeit"
          label="Start"
          defaultValue={startWert}
          fehler={zustand.felder.startZeit}
        />

        <ZeitWahl
          key={`ende-${endWert}`}
          id="schicht-ende"
          name="end_zeit"
          label="Ende"
          defaultValue={endWert}
          fehler={zustand.felder.endZeit}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Hinweis zur Schicht</span>
        <textarea
          key={kommentarWert}
          name="kommentar"
          defaultValue={kommentarWert}
          maxLength={140}
          rows={2}
          className="rounded-blk border border-line-strong bg-bg px-3.5 py-2.5 text-text"
        />
        {zustand.felder.kommentar ? (
          <p className="text-sm font-medium text-stop">{zustand.felder.kommentar}</p>
        ) : null}
      </label>

      <div>
        <SpeichernKnopf />
      </div>
    </form>
  );
}

/**
 * Schicht löschen — Spiegel von `confirmDelete()`/`deleteShift()`. Die
 * App fragt über einen nativen Alert nach; hier steht dieselbe Sperre
 * als aufklappbare Bestätigung mit Häkchen, das Muster aus `Freigabe`
 * in `zyklus-liste.tsx` — kein Modal-Dialog eigens dafür.
 */
export function SchichtLoeschenFormular({ instanzId, monat }: { instanzId: string; monat: string }) {
  const [zustand, aktion] = useActionState(schichtLoeschen, leererZustand);
  const [offen, setOffen] = useState(false);

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="rounded-blk border border-stop/50 px-4 py-2 text-sm font-semibold text-stop transition-colors hover:bg-stop/10"
      >
        Schicht löschen
      </button>
    );
  }

  return (
    <form action={aktion} className="flex flex-col gap-3 rounded-panel border border-stop/40 bg-stop/10 p-4">
      <input type="hidden" name="instanz_id" value={instanzId} />
      <input type="hidden" name="monat" value={monat} />

      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <p className="text-sm leading-relaxed text-text">
        Diese Schicht wird endgültig gelöscht — mit allen, die dafür eingeteilt sind.{" "}
        <strong>Das lässt sich nicht rückgängig machen.</strong>
      </p>
      <label className="flex items-start gap-2 text-sm text-text">
        <input type="checkbox" name="bestaetigt" value="ja" required className="mt-0.5" />
        <span>Ja, diese Schicht löschen.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-blk border border-stop/50 px-4 py-2 text-sm font-semibold text-stop transition-colors hover:bg-stop/10"
        >
          Löschen
        </button>
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
