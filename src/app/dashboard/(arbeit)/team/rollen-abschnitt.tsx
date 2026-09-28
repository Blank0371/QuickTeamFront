"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung, TextFeld } from "@/components/formular/felder";
import type { Dictionary } from "@/i18n/de";
import type { Rolle } from "@/lib/dashboard/team";
import { leererZustand } from "@/lib/formular";

import { rolleAnlegen, rolleEntfernen, rolleUmblenden } from "./aktionen";

function Knopf({ text, art = "still" }: { text: string; art?: "signal" | "still" }) {
  const { pending } = useFormStatus();
  const stil = {
    signal: "bg-signal text-signal-ink hover:bg-signal-hover",
    still: "border border-line-control text-text hover:bg-surface-sunk",
  }[art];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`shrink-0 rounded-blk px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${stil}`}
    >
      {pending ? "…" : text}
    </button>
  );
}

/**
 * Der destruktive Knopf — im Ruhezustand still, rot erst bei Absicht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum er anders aussieht als „Ausblenden"
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher trugen beide Aktionen einen gleich schweren Rahmen, einer davon
 * rot. Bei vier Rollen ergab das acht gleichrangige Knöpfe und **acht
 * rote Kanten** — auf einer Seite, deren häufigste Handlung „jemanden
 * einladen" ist. Die Palette gibt Rot ~2 % und ausdrücklich nur für
 * Fehler und Destruktives; hier war es die lauteste Farbe der Seite.
 *
 * Umgekehrt gewichtet stimmt die Rangfolge wieder: „Ausblenden" ist der
 * gewöhnliche, umkehrbare Weg und behält seinen Rahmen. „Entfernen"
 * löscht wirklich, ist selten, und tritt deshalb erst hervor, wenn
 * jemand darauf zielt — bei Hover und bei Tastaturfokus, nicht im
 * Ruhezustand. Rot bleibt damit das, was es sein soll: die Farbe der
 * Absicht, nicht der Dekoration.
 */
function EntfernenKnopf({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="shrink-0 rounded-blk px-2 py-2 text-sm text-muted underline-offset-4 transition-colors hover:text-stop hover:underline focus-visible:text-stop focus-visible:underline disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "…" : text}
    </button>
  );
}

/**
 * Rollen im laufenden Betrieb.
 *
 * Zwei Wege, eine Rolle loszuwerden, und beide stehen bewusst da:
 *
 * **Ausblenden** ist der Weg der App (`rollen.aktiv = false`). Er
 * erhält die Vergangenheit — wer vor drei Monaten als „Küche"
 * eingeteilt war, bleibt es in den alten Plänen.
 *
 * **Entfernen** löscht wirklich und ist für den Vertipper von eben
 * gedacht. Nötig ist er, weil `UNIQUE (betrieb_id, name)` das
 * `aktiv`-Flag nicht kennt: eine ausgeblendete „Küche" blockiert ihren
 * Namen für immer.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein abgewiesenes Entfernen sperrt den Knopf — für alle Rollen
 * ─────────────────────────────────────────────────────────────────────
 *
 * `entferneRolle()` erkennt am leeren RETURNING, dass RLS das DELETE
 * verschluckt hat, und meldet `art: "gesperrt"`. Bisher endete diese
 * Erkenntnis in einer Fehlermeldung, und der Knopf stand unverändert
 * weiter da — anklickbar, rot, und bei jedem Versuch aufs Neue
 * wirkungslos.
 *
 * Gesperrt wird deshalb **die ganze Liste** und nicht nur die eine
 * Zeile. Der Grund liegt nicht an der Rolle, sondern an der Tabelle:
 * `rollen` trägt keine DELETE-Policy, also trifft es jede Rolle gleich.
 * Nur die angeklickte zu sperren hiesse, die restlichen drei nacheinander
 * dieselbe Absage einsammeln zu lassen.
 *
 * Der Zustand lebt bewusst nur in dieser Sitzung. Er ist eine
 * Beobachtung, keine Konfiguration: sobald die Policy im geteilten
 * Backend nachgezogen wird, funktioniert der Knopf beim nächsten Aufruf
 * wieder, ohne dass hier etwas zurückzunehmen wäre.
 */
export function RollenAbschnitt({
  rollen,
  texte: t,
}: {
  rollen: readonly Rolle[];
  texte: Dictionary["teamVerwaltung"];
}) {
  const [anlegen, anlegenAktion] = useActionState(rolleAnlegen, leererZustand);
  const [entfernen, entfernenAktion] = useActionState(rolleEntfernen, leererZustand);
  const [umblenden, umblendenAktion] = useActionState(rolleUmblenden, leererZustand);

  const [entfernenGesperrt, setEntfernenGesperrt] = useState(false);
  const abgewiesen = entfernen.werte?.rolle_id;
  useEffect(() => {
    if (abgewiesen) setEntfernenGesperrt(true);
  }, [abgewiesen]);

  const aktive = rollen.filter((rolle) => rolle.aktiv);
  const ausgeblendete = rollen.filter((rolle) => !rolle.aktiv);

  return (
    <section aria-labelledby="rollen-titel">
      <h2 id="rollen-titel" className="font-display text-lg text-text">
        {t.rollen}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t.rollenText}</p>

      {[anlegen, entfernen, umblenden].map((zustand, i) =>
        zustand.nachricht ? (
          <div key={i} className="mt-4">
            <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
          </div>
        ) : null,
      )}

      <form action={anlegenAktion} className="mt-5 flex items-end gap-3">
        <div className="grow">
          <TextFeld
            id="rolle-name"
            name="name"
            label={t.neueRolle}
            maxLength={60}
            fehler={anlegen.felder["name"]}
          />
        </div>
        <Knopf text={t.hinzufuegen} art="signal" />
      </form>

      {aktive.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-2">
          {aktive.map((rolle) => (
            <li
              key={rolle.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-3 rounded-blk border border-line bg-surface px-4 py-2.5"
            >
              <span className="grow text-sm text-text">{rolle.name}</span>

              <form action={umblendenAktion}>
                <input type="hidden" name="rolle_id" value={rolle.id} />
                <input type="hidden" name="aktiv" value="false" />
                <Knopf text={t.ausblenden} />
              </form>

              {entfernenGesperrt ? (
                <span
                  className="flex shrink-0 items-center gap-1.5 px-2 py-2 text-sm text-muted"
                  title={t.entfernenGesperrtTitel}
                >
                  <Lock aria-hidden="true" className="size-3.5" />
                  {t.entfernenGesperrt}
                </span>
              ) : (
                <form action={entfernenAktion}>
                  <input type="hidden" name="rolle_id" value={rolle.id} />
                  <EntfernenKnopf text={t.entfernen} />
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">{t.keineRolle}</p>
      )}

      {entfernenGesperrt ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t.gesperrtVor}
          <strong>{t.gesperrtAusblenden}</strong>
          {t.gesperrtNach}
        </p>
      ) : null}

      {ausgeblendete.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {t.ausgeblendet}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t.ausgeblendetText}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {ausgeblendete.map((rolle) => (
              <li
                key={rolle.id}
                className="flex flex-wrap items-center gap-3 rounded-blk border border-dashed border-line px-4 py-2.5"
              >
                <span className="grow text-sm text-muted">{rolle.name}</span>
                <form action={umblendenAktion}>
                  <input type="hidden" name="rolle_id" value={rolle.id} />
                  <input type="hidden" name="aktiv" value="true" />
                  <Knopf text={t.einblenden} />
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
