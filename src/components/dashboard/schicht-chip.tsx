import Link from "next/link";

import {
  ZUSTAND_HINWEIS,
  hhmm,
  schichtName,
  schichtZustand,
  ueberNacht,
  type Fortsetzung,
  type KalenderSchicht,
  type SchichtZustand,
} from "@/lib/dashboard/kalender";

/**
 * Wie sich der Zustand einer Schicht auf einer Kachel niederschlägt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Farben sind **nicht** aus der App übernommen, und zwar mit
 *  Absicht.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die App malt Entwürfe in „Blueprint-Blau" (`#2f5f8f`). Unsere Palette
 * kennt kein Blau — sie ist Grün, Bronze und Rot auf dunklem Grund, und
 * `docs/Farbpalette.html` ist laut Vorgabe die Quelle, nicht die App.
 * Ein Hex-Wert in einer Komponente wäre ausserdem doppelt verboten.
 *
 * Der Unterschied Entwurf/veröffentlicht wird deshalb über die Form
 * getragen statt über den Farbton: gestrichelte Umrandung, gedämpfter
 * Text. Das ist die Konvention, die zählt — dass ein Entwurf als
 * unfertig erkennbar ist —, und sie überlebt auch, wenn jemand die
 * Palette ändert.
 *
 * Rot bleibt Störungen vorbehalten: dem eigenen Ausfall und der nicht
 * erreichten Mindestbesetzung. Nicht als Hervorhebung.
 *
 * **Welcher Zustand gilt, wird hier nicht mehr entschieden.** Die
 * Rangfolge steht in `schichtZustand()`, weil die Tagesliste der
 * Übersicht dieselbe Frage stellt und dieselbe Antwort braucht.
 */
const DARSTELLUNG: Record<SchichtZustand, { rahmen: string; text: string }> = {
  abgemeldet: { rahmen: "border-stop/60 bg-stop/10", text: "text-stop" },
  offen: { rahmen: "border-dashed border-signal/70 bg-signal-weak", text: "text-text" },
  entwurf: {
    rahmen: "border-dashed border-line-strong bg-surface-sunk",
    text: "text-muted",
  },
  meine: { rahmen: "border-signal/60 bg-signal-weak", text: "text-text" },
  normal: { rahmen: "border-line bg-surface-sunk", text: "text-text" },
};

/**
 * Eine Schicht als Kachel.
 *
 * `label` wird geprüft, bevor es gerendert wird: `schicht_vorlagen.
 * bezeichnung` ist nullable, und benutzerdefinierte Schichten haben gar
 * keine Vorlage. Die App rendert den Wert ungeprüft und zeigt dann
 * „null" an — genau die Falle, vor der `CLAUDE.md` warnt.
 */
export function SchichtChip({ schicht }: { schicht: KalenderSchicht }) {
  const zustand = schichtZustand(schicht);
  const art = DARSTELLUNG[zustand];
  const hinweis = ZUSTAND_HINWEIS[zustand];
  const zeit = `${hhmm(schicht.start_zeit)}–${hhmm(schicht.end_zeit)}`;
  const bezeichnung = schichtName(schicht);
  const nachts = ueberNacht(schicht);

  return (
    <Link
      href={`/dashboard/schicht/${schicht.id}`}
      className={`block rounded-blk border px-2 py-1.5 text-left transition-colors hover:border-line-strong ${art.rahmen}`}
    >
      <p className={`font-mono text-xs leading-tight ${art.text}`}>
        {zeit}
        {nachts ? (
          <span className="text-muted" title="über Mitternacht">
            {" "}
            +1
          </span>
        ) : null}
      </p>

      {bezeichnung ? (
        <p className={`mt-0.5 truncate text-xs leading-tight ${art.text}`}>
          {bezeichnung}
        </p>
      ) : null}

      {hinweis ? (
        <p className="mt-0.5 text-[0.625rem] uppercase tracking-wide text-muted">
          {hinweis}
        </p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.625rem] text-muted">
        {schicht.understaffed ? (
          <span className="font-semibold text-stop">unterbesetzt</span>
        ) : null}
        {schicht.swap_wanted ? <span>Tausch gesucht</span> : null}
        {schicht.notiz_anzahl > 0 ? (
          <span>
            {schicht.notiz_anzahl} {schicht.notiz_anzahl === 1 ? "Notiz" : "Notizen"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Namen der Zugeteilten, soweit sie überhaupt geliefert werden.
 *
 * `kalender_schichten` schneidet die Liste selbst zu: ohne
 * `mitarbeiter_sehen_andere_mitarbeiter` bekommt eine angestellte Person
 * nur sich selbst zu sehen. Eine leere Liste heisst deshalb nicht
 * „niemand eingeteilt", sondern kann auch „darf ich nicht sehen"
 * bedeuten — und darum steht hier kein „noch niemand".
 *
 * `attendet = false` bleibt sichtbar und wird durchgestrichen: wer sich
 * abgemeldet hat, verschwindet nicht aus der Schicht, sondern bleibt als
 * Spur stehen. Für die Mindestbesetzung zählt die Person nicht mehr —
 * das rechnet die Funktion bereits so.
 */
export function Besetzung({ schicht }: { schicht: KalenderSchicht }) {
  if (schicht.participants.length === 0) return null;

  return (
    <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[0.625rem] leading-tight text-muted">
      {schicht.participants.map((person, i) => (
        <li
          key={`${person.name}-${i}`}
          className={person.attendet ? "" : "line-through opacity-70"}
        >
          <span className={person.is_me ? "font-semibold text-text" : ""}>
            {person.name}
          </span>
          {person.role_name ? (
            <span className="text-muted/80"> · {person.role_name}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Die Fortsetzung einer Nachtschicht am Folgetag.
 *
 * Bewusst **gedämpft und ohne Zustand**: sie ist keine eigene Schicht,
 * sondern der Ausläufer der Schicht vom Vortag. Deshalb kein
 * Zustandsrahmen (kein „meine", kein „unterbesetzt"), keine Besetzung,
 * kein Notizzähler — all das gehört an die Kachel des Vortags und wäre
 * hier eine zweite, konkurrierende Auskunft über dieselbe Schicht.
 *
 * Der Pfeil `↳` trägt die Bedeutung optisch, der `sr-only`-Text trägt
 * sie für Screenreader. Ein blosses „00:00–02:00" ohne beides sähe aus
 * wie eine sehr früh beginnende eigene Schicht — genau die Verwechslung,
 * die der Umbau beheben soll.
 *
 * Der Link führt auf **dieselbe** Detailseite wie die Ursprungskachel:
 * es gibt nur einen Datensatz, und zwei Adressen für eine Schicht wären
 * eine Einladung, sie zweimal zu bearbeiten.
 */
export function FortsetzungsChip({ fortsetzung }: { fortsetzung: Fortsetzung }) {
  const bis = hhmm(fortsetzung.end_zeit);

  return (
    <Link
      href={`/dashboard/schicht/${fortsetzung.id}`}
      className="block rounded-blk border border-dashed border-line bg-transparent px-2 py-1 text-left transition-colors hover:border-line-strong"
    >
      <p className="flex items-center gap-1 font-mono text-xs leading-tight text-muted">
        <span aria-hidden="true">↳</span>
        00:00–{bis}
      </p>
      <p className="mt-0.5 truncate text-[0.625rem] leading-tight text-muted">
        Fortsetzung
        {fortsetzung.label ? ` · ${fortsetzung.label}` : ""}
      </p>
      <span className="sr-only">
        Fortsetzung der Nachtschicht vom Vortag, endet um {bis} Uhr.
      </span>
    </Link>
  );
}
