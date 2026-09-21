import Link from "next/link";

import { getDictionary } from "@/i18n";
import {
  hhmm,
  type Fortsetzung,
  type KalenderSchicht,
} from "@/lib/dashboard/kalender";

type KalenderTexte = ReturnType<typeof getDictionary>["kalender"];

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
 *
 * **Keine Rolle mehr.** Wer in welcher Rolle arbeitet, ist im
 * Überblick nachrangig und steht auf der Schichtseite
 * (`/dashboard/schicht/…`); hier zählt nur, wer da ist.
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
export function FortsetzungsChip({
  fortsetzung,
  t,
}: {
  fortsetzung: Fortsetzung;
  t: KalenderTexte;
}) {
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
        {t.fortsetzung}
        {fortsetzung.label ? ` · ${fortsetzung.label}` : ""}
      </p>
      <span className="sr-only">{t.fortsetzungLang.replace("{zeit}", bis)}</span>
    </Link>
  );
}
