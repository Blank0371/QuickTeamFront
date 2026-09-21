import Link from "next/link";

import { Uebernehmen } from "@/components/dashboard/uebernehmen";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { OffeneAusschreibung } from "@/lib/dashboard/ausschreibung";
import { hhmm } from "@/lib/dashboard/kalender";

type MitteilungenTexte = Dictionary["mitteilungen"];

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
  texte,
  locale,
}: {
  ausschreibungen: readonly OffeneAusschreibung[];
  texte: MitteilungenTexte;
  locale: Locale;
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
        {texte.offeneSchichten}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{texte.ausschreibungIntro}</p>

      <ul className="mt-4 flex flex-col gap-4">
        {sortiert.map((a) => (
          <li
            key={a.benachrichtigungId}
            className="rounded-card border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-text">
                  {a.titel?.trim() ? a.titel.trim() : texte.offeneSchicht}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {a.datum ? (
                    <Zeitangabe ausschreibung={a} locale={locale} />
                  ) : (
                    texte.zeitpunktUnbekannt
                  )}
                </p>
              </div>

              <Link
                href={`/dashboard/schicht/${a.schichtInstanzId}`}
                className="shrink-0 rounded-blk border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-control hover:text-text"
              >
                {texte.schichtAnsehen}
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
              <p className="mt-3 text-sm text-muted">{texte.schonEingeteilt}</p>
            ) : (
              <Uebernehmen
                benachrichtigungId={a.benachrichtigungId}
                instanzId={a.schichtInstanzId}
                rollen={a.rollen}
                texte={{
                  wirdUebernommen: texte.wirdUebernommen,
                  uebernehmen: texte.uebernehmen,
                  frei: texte.frei,
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** „Samstag, 12. September · 18:00–23:00" / „Saturday, September 12 · …". */
function Zeitangabe({
  ausschreibung,
  locale,
}: {
  ausschreibung: OffeneAusschreibung;
  locale: Locale;
}) {
  const { datum, startZeit, endZeit } = ausschreibung;
  if (!datum) return null;

  const d = new Date(`${datum}T12:00:00`);
  const langesDatum = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);

  return (
    <>
      <time dateTime={datum}>{langesDatum}</time>
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
