import Link from "next/link";

import { Uebernehmen } from "@/components/dashboard/uebernehmen";
import type { OffeneAusschreibung } from "@/lib/dashboard/ausschreibung";
import { MONATSNAMEN, WOCHENTAGE_LANG, hhmm } from "@/lib/dashboard/kalender";

/**
 * Offene Ausschreibungen über dem Mitteilungs-Feed.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein eigener Abschnitt und keine Karte im Feed
 * ─────────────────────────────────────────────────────────────────────
 *
 * Beides sind Zeilen in `benachrichtigungen`, und die App zeigt sie
 * tatsächlich in einem gemeinsamen Feed. Hier stehen sie getrennt, aus
 * zwei Gründen:
 *
 * Erstens tragen sie andere Daten. Eine Ankündigung hat Titel, Text,
 * Priorität, vielleicht Aufgaben oder Optionen; eine Ausschreibung hat
 * eine Schicht, Rollen und einen Restbedarf. Sie in denselben Typ zu
 * pressen hiesse, `Mitteilung` um Felder zu erweitern, die für neun von
 * zehn Zeilen leer bleiben.
 *
 * Zweitens verlangen sie etwas. Der Feed ist zum Lesen da — man hakt
 * höchstens eine Aufgabe ab oder stimmt ab. Eine Ausschreibung ist ein
 * Angebot mit Ablaufdatum; sie gehört nach oben und nicht zwischen die
 * Ankündigungen der letzten Wochen, wo sie nach dem dritten Aushang
 * nicht mehr auffällt.
 *
 * Die Sortierung nach Schichtdatum statt nach Erstellzeitpunkt folgt
 * derselben Überlegung: was zuerst stattfindet, ist zuerst dringend.
 * Ausschreibungen ohne lesbares Datum landen hinten.
 */
export function AusschreibungenAbschnitt({
  ausschreibungen,
}: {
  ausschreibungen: readonly OffeneAusschreibung[];
}) {
  if (ausschreibungen.length === 0) return null;

  const sortiert = [...ausschreibungen].sort((a, b) => {
    if (a.datum === b.datum) return 0;
    if (a.datum === null) return 1;
    if (b.datum === null) return -1;
    return a.datum < b.datum ? -1 : 1;
  });

  return (
    <section aria-labelledby="ausschreibungen-titel" className="mt-8">
      <h2
        id="ausschreibungen-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        Offene Schichten
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Ausgeschrieben für eine Rolle, die du hast. Wer zuerst übernimmt, ist
        eingeteilt — eine Bestätigung durch die Betriebsleitung gibt es nicht.
      </p>

      <ul className="mt-4 flex flex-col gap-4">
        {sortiert.map((a) => (
          <li
            key={a.benachrichtigungId}
            className="rounded-card border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-text">
                  {a.titel?.trim() ? a.titel.trim() : "Offene Schicht"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {a.datum ? <Zeitangabe ausschreibung={a} /> : "Zeitpunkt unbekannt"}
                </p>
              </div>

              <Link
                href={`/dashboard/schicht/${a.schichtInstanzId}`}
                className="shrink-0 rounded-blk border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-control hover:text-text"
              >
                Schicht ansehen
              </Link>
            </div>

            {a.text?.trim() ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text">
                {a.text.trim()}
              </p>
            ) : null}

            {/*
              `schonDrauf` kann hier eigentlich nicht mehr auftreten — der
              Lader filtert Ausschreibungen heraus, auf deren Schicht man
              schon steht. Der Zweig bleibt trotzdem: der RPC kennt den
              Fall (`schon_zugewiesen`), und eine Ansicht, die ihn
              stillschweigend als „übernehmbar" ausgibt, wäre die
              unangenehmere Überraschung.
            */}
            {a.schonDrauf ? (
              <p className="mt-3 text-sm text-muted">
                Du bist auf dieser Schicht bereits eingeteilt.
              </p>
            ) : (
              <Uebernehmen
                benachrichtigungId={a.benachrichtigungId}
                instanzId={a.schichtInstanzId}
                rollen={a.rollen}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** „Samstag, 12. September · 18:00–23:00". */
function Zeitangabe({ ausschreibung }: { ausschreibung: OffeneAusschreibung }) {
  const { datum, startZeit, endZeit } = ausschreibung;
  if (!datum) return null;

  const d = new Date(`${datum}T12:00:00`);
  const wochentag = WOCHENTAGE_LANG[(d.getDay() + 6) % 7];

  return (
    <>
      <time dateTime={datum}>
        {wochentag}, {d.getDate()}. {MONATSNAMEN[d.getMonth()]}
      </time>
      {startZeit && endZeit ? (
        <>
          {" · "}
          <span className="font-mono">
            {hhmm(startZeit)}–{hhmm(endZeit)}
          </span>
        </>
      ) : null}
    </>
  );
}
