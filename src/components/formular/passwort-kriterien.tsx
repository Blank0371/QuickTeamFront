"use client";

import { Check, Minus } from "lucide-react";

import { PASSWORT_MAX, PASSWORT_MIN } from "@/lib/validierung";

/**
 * Die Passwortregeln, während getippt wird.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was hier steht, ist ausgelesen und nicht übernommen.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Aus dem Test kam die Rückmeldung, die Regeln seien „8 Zeichen,
 * Gross-/Kleinschreibung". Das Zweite stimmt nicht: `feldSchemata.passwort`
 * in `src/lib/validierung.ts` prüft ausschliesslich die Länge — mindestens
 * `PASSWORT_MIN`, höchstens `PASSWORT_MAX` —, dazu kommt aus
 * `registrierungSchema` der Abgleich mit der Wiederholung. Eine Vorgabe
 * zu Gross- und Kleinbuchstaben gibt es in diesem Repo nicht.
 *
 * Angezeigt wird deshalb genau das und nichts darüber hinaus. Eine
 * Kriterienliste, die mehr verlangt als der Code, ist schlimmer als
 * keine: sie schickt Leute an einer Hürde vorbei, die es gar nicht gibt.
 *
 * **Vorbehalt, der nicht von hier aus zu klären war.** GoTrue kann
 * zusätzlich projektweit Zeichenklassen verlangen
 * (`password_required_characters` im Supabase-Dashboard). Dieser Wert
 * steht nicht in `/auth/v1/settings` und ist über den MCP-Zugang nicht
 * lesbar; ein Test dagegen scheitert derzeit ohnehin vorher an
 * `signup_disabled`. Greift die Regel, kommt sie als `weak_password`
 * zurück und landet in `authFehlerText()` — sichtbar, aber eben erst nach
 * dem Absenden. Ist sie gesetzt, gehört sie hier ergänzt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Obergrenze nur auftaucht, wenn sie verletzt ist
 * ─────────────────────────────────────────────────────────────────────
 *
 * „Höchstens 72 Zeichen" als dauerhaft abgehakter Punkt wäre für
 * praktisch jeden Rauschen — die Regel ist ab dem ersten Zeichen erfüllt
 * und bleibt es. Sie erscheint deshalb erst, wenn sie tatsächlich
 * gerissen wird, und dann als offener Punkt. Die Liste sagt damit immer
 * etwas, das gerade zu tun ist.
 */

export type PasswortStand = {
  passwort: string;
  wiederholung: string;
};

type Kriterium = {
  schluessel: string;
  text: string;
  erfuellt: boolean;
};

/**
 * Leitet die Punkte aus dem Tippstand ab.
 *
 * Getrennt von der Darstellung, weil hier die einzige Stelle ist, an der
 * sich diese Liste von `validierung.ts` entfernen könnte — so steht sie
 * an einem Stück da und lässt sich danebenlegen.
 */
function kriterien({ passwort, wiederholung }: PasswortStand): Kriterium[] {
  const liste: Kriterium[] = [
    {
      schluessel: "min",
      text: `Mindestens ${PASSWORT_MIN} Zeichen`,
      erfuellt: passwort.length >= PASSWORT_MIN,
    },
  ];

  if (passwort.length > PASSWORT_MAX) {
    liste.push({
      schluessel: "max",
      text: `Höchstens ${PASSWORT_MAX} Zeichen`,
      erfuellt: false,
    });
  }

  /*
   * Der Abgleich erscheint erst, wenn im Wiederholungsfeld etwas steht.
   * Vorher wäre er ein offener Punkt, den man noch gar nicht erfüllen
   * kann — eine rote Linie auf einer Aufgabe, die noch nicht dran ist.
   */
  if (wiederholung.length > 0) {
    liste.push({
      schluessel: "gleich",
      text: "Beide Eingaben stimmen überein",
      erfuellt: passwort.length > 0 && passwort === wiederholung,
    });
  }

  return liste;
}

export function PasswortKriterien({
  id,
  stand,
}: {
  /** Wird per `aria-describedby` am Passwortfeld verankert. */
  id: string;
  stand: PasswortStand;
}) {
  const punkte = kriterien(stand);
  const offen = punkte.filter((punkt) => !punkt.erfuellt).length;

  return (
    <div id={id}>
      {/*
        Die Zusammenfassung ist nur für Screenreader da und ersetzt das
        Vorlesen der ganzen Liste bei jedem Tastendruck. `polite` statt
        `assertive`: die Rückmeldung soll den Lesefluss nicht
        unterbrechen, während jemand noch tippt.
      */}
      <p aria-live="polite" className="sr-only">
        {offen === 0
          ? "Alle Anforderungen an das Passwort sind erfüllt."
          : `Noch ${offen} von ${punkte.length} Anforderungen offen.`}
      </p>

      <ul className="flex flex-col gap-1.5">
        {punkte.map((punkt) => (
          <li
            key={punkt.schluessel}
            className={`flex items-center gap-2 text-xs leading-relaxed transition-colors ${
              punkt.erfuellt ? "text-text" : "text-muted"
            }`}
          >
            {/*
              Grün für erfüllt, gedämpft für offen — kein Rot. Ein noch
              nicht erfülltes Kriterium ist kein Fehler, sondern ein
              Schritt, der noch aussteht; `CLAUDE.md` behält Rot Fehlern
              und destruktiven Aktionen vor.

              Zwei verschiedene Symbole, nicht nur zwei Farben: wer
              Farben schlecht unterscheidet, liest den Zustand sonst gar
              nicht. Das Symbol selbst bleibt `aria-hidden` — den Zustand
              trägt der Text daneben.
            */}
            {punkt.erfuellt ? (
              <Check className="size-3.5 shrink-0 text-signal" aria-hidden="true" />
            ) : (
              <Minus className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            )}
            {punkt.text}
            <span className="sr-only">{punkt.erfuellt ? " — erfüllt" : " — offen"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
