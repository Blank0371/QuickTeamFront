"use client";

import { useActionState, useState } from "react";

import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { leererZustand } from "@/lib/formular";
import type { Rolle } from "@/lib/team";
import type { Dictionary } from "@/i18n/de";

import { rolleEntfernen } from "./aktionen";

/**
 * Rollen des Betriebs — Küche, Service, Bar oder was sonst passt.
 *
 * Steht vor den Mitarbeitern, weil beides sie braucht: eine Zuweisung
 * geht nur auf eine bestehende Rolle, und die Mindestbesetzung in
 * Schritt 4 ebenso.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Sorten Rolle, und der Unterschied ist sichtbar.
 * ─────────────────────────────────────────────────────────────────────
 *
 * **Entwürfe** sind alles, was in diesem Durchgang hinzugefügt wurde.
 * Sie stehen nur im Formularzustand, lassen sich beliebig wieder
 * entfernen und kosten dabei keine Anfrage. Geschrieben werden sie beim
 * Weitergehen oder beim ersten Einladen — die Begründung an
 * `schreibeRollen()` in `src/lib/team.ts`.
 *
 * **Bestehende** stehen bereits in der Datenbank, etwa weil jemand aus
 * Schritt 4 zurückgekommen ist. Für sie bleibt der alte Weg über
 * `rolleEntfernen()`, und der scheitert weiterhin an der fehlenden
 * DELETE-Policy — die Meldung sagt das dann auch. Beides zu vermischen
 * wäre die schlechtere Lösung: ein Kreuz, das bei der einen Rolle wirkt
 * und bei der anderen eine Fehlermeldung bringt, ohne dass man den
 * Unterschied sieht.
 */
export function RollenAbschnitt({
  bestehende,
  entwuerfe,
  fehler,
  beiHinzufuegen,
  beiEntfernen,
  texte,
}: {
  bestehende: readonly Rolle[];
  entwuerfe: readonly string[];
  /** Meldung aus der lokalen Prüfung — leerer Name, Name doppelt. */
  fehler: string | null;
  beiHinzufuegen: (name: string) => void;
  beiEntfernen: (name: string) => void;
  texte: Dictionary["stepper"]["team"];
}) {
  const [entfernen, entfernenAktion] = useActionState(rolleEntfernen, leererZustand);
  const [eingabe, setzeEingabe] = useState("");

  const leer = bestehende.length === 0 && entwuerfe.length === 0;

  function uebernehmen() {
    beiHinzufuegen(eingabe);
    /*
     * Das Feld wird bedingungslos geleert — auch wenn die Prüfung
     * abgelehnt hat. Andernfalls stünde nach „gibt es schon" derselbe
     * Name noch da, und der nächste Klick brächte dieselbe Meldung.
     */
    setzeEingabe("");
  }

  return (
    <section aria-labelledby="rollen-titel">
      <h2 id="rollen-titel" className="font-display text-lg text-text">
        {texte.rollenTitel}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {texte.rollenText}
      </p>

      {fehler ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{fehler}</FormMeldung>
        </div>
      ) : null}
      {entfernen.nachricht ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{entfernen.nachricht}</FormMeldung>
        </div>
      ) : null}

      {/*
        Kein `<form>` und kein `action`: hier wird nichts abgeschickt,
        sondern der Liste unten etwas hinzugefügt. Ein Formular ohne Ziel
        wäre ein Versprechen, das die Enter-Taste sofort einlöst — mit
        einem Seitenneuaufbau, der den gesammelten Zustand verlöre.
        Enter wird deshalb ausdrücklich abgefangen und tut dasselbe wie
        der Knopf.
      */}
      <div className="mt-5 flex items-end gap-3">
        <div className="grow">
          <TextFeld
            id="rolle-name"
            name="rolle_name"
            label={texte.neueRolle}
            maxLength={60}
            required={false}
            wert={eingabe}
            beiEingabe={setzeEingabe}
            beiEnter={uebernehmen}
          />
        </div>
        <button
          type="button"
          onClick={uebernehmen}
          className="shrink-0 rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
        >
          {texte.hinzufuegen}
        </button>
      </div>

      {leer ? (
        <p className="mt-5 text-sm text-muted">{texte.keineRolle}</p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-2">
          {bestehende.map((rolle) => (
            <li key={rolle.id}>
              <form action={entfernenAktion} className="flex items-center">
                <input type="hidden" name="rolle_id" value={rolle.id} />
                <span className="flex items-center gap-2 rounded-blk border border-line bg-surface-sunk py-1.5 pl-3 pr-1.5 text-sm text-text">
                  {rolle.name}
                  <button
                    type="submit"
                    aria-label={texte.rolleEntfernen.replace("{name}", rolle.name)}
                    className="rounded-sm px-1.5 text-muted transition-colors hover:text-stop"
                  >
                    ×
                  </button>
                </span>
              </form>
            </li>
          ))}

          {entwuerfe.map((name) => (
            <li key={name}>
              <span className="flex items-center gap-2 rounded-blk border border-line bg-surface-sunk py-1.5 pl-3 pr-1.5 text-sm text-text">
                {name}
                <button
                  type="button"
                  onClick={() => beiEntfernen(name)}
                  aria-label={texte.rolleEntfernen.replace("{name}", name)}
                  className="rounded-sm px-1.5 text-muted transition-colors hover:text-stop"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
