import { CalendarOff } from "lucide-react";
import Link from "next/link";

import { getDictionary } from "@/i18n";
import {
  hhmm,
  schichtName,
  schichtZustand,
  ueberNacht,
  type KalenderSchicht,
  type SchichtZustand,
} from "@/lib/dashboard/kalender";
import {
  gruppiereNachRolle,
  zaehleImDienst,
  type Besetzungsstand,
  type Tagesblock,
} from "@/lib/dashboard/uebersicht";

type UebersichtTexte = ReturnType<typeof getDictionary>["uebersicht"];
type ZustandTexte = ReturnType<typeof getDictionary>["kalender"]["zustand"];

/**
 * Ein Tag als Liste — wer wann welche Schicht hat.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum eine Zeile und keine Kachel.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Im Monatsraster ist eine Schicht eine Kachel von wenigen Zentimetern:
 * Uhrzeit, Bezeichnung, ein Hinweis. Die Namen passen dort nicht hinein
 * und stehen deshalb erst im aufgeklappten Tagesdetail. Für einen Monat
 * ist das die richtige Verdichtung — für die Frage „wer hat heute
 * Spätdienst" ist es ein Klick zu viel.
 *
 * Hier ist Platz, also stehen die Namen da, nach Rollen gegliedert.
 * Darüber steht der Besetzungsstreifen: was der Tag verlangt und was er
 * hat, in einer Zeile.
 *
 * Server Component: nichts daran ist interaktiv. Die Schichtzeile führt
 * über einen gewöhnlichen Link auf `/dashboard/schicht/[id]`.
 */

/**
 * Zustand → Aussehen, für die Zeile.
 *
 * Die **Rangfolge** kommt aus `schichtZustand()`, gemeinsam mit dem
 * Monatsraster. Nur die Zuordnung zum Aussehen steht hier, und sie ist
 * notwendigerweise eine andere: eine Zeile über die volle Breite mit
 * gestricheltem Rahmen sähe aus wie ein Formularfeld. Getragen wird der
 * Unterschied deshalb von der linken Kante und der Textfarbe.
 *
 * Rot bleibt Störungen vorbehalten, wie überall in diesem Projekt.
 */
const KANTE: Record<SchichtZustand, string> = {
  abgemeldet: "border-l-2 border-l-stop",
  offen: "border-l-2 border-l-signal border-dashed",
  entwurf: "border-l-2 border-l-line-strong border-dashed",
  meine: "border-l-2 border-l-signal",
  normal: "border-l-2 border-l-transparent",
};

export function TagesPlan({
  tag,
  chef,
  besetzung,
  leerText,
  texte,
  zustandTexte,
}: {
  tag: Tagesblock;
  /**
   * Chefs sehen jede Zuteilung; Angestellte bekommen von
   * `kalender_schichten` eine zugeschnittene Liste. Davon hängt ab, was
   * eine leere Besetzung bedeuten **darf** — siehe unten.
   */
  chef: boolean;
  /**
   * Der Besetzungsstreifen. Leer für Angestellte, und zwar aus
   * demselben Grund, aus dem `understaffed` für sie immer `false` ist:
   * beide RPCs halten die Mindestbesetzung für eine Chefsache, und zwei
   * Oberflächen desselben Produkts sollen sich darin nicht
   * widersprechen.
   */
  besetzung: readonly Besetzungsstand[];
  /** Was dasteht, wenn der Tag nichts (mehr) zeigt. Hängt vom Filter ab. */
  leerText: string;
  texte: UebersichtTexte;
  zustandTexte: ZustandTexte;
}) {
  const imDienst = zaehleImDienst(tag.schichten);
  const titelId = `tag-${tag.datum}`;

  return (
    <section
      aria-labelledby={titelId}
      className={`overflow-hidden rounded-panel border bg-surface shadow-card ${
        tag.istHeute ? "border-line-strong" : "border-line"
      }`}
    >
      <header className="border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={titelId} className="font-display text-base font-semibold text-text">
            {tag.titel}
            <span className="ml-2 text-sm font-normal text-muted">{tag.untertitel}</span>
          </h3>

          {tag.schichten.length > 0 ? (
            <p className="text-xs text-muted">
              {tag.schichten.length}{" "}
              {tag.schichten.length === 1 ? texte.schichtEz : texte.schichtMz}
              {imDienst > 0 ? ` · ${imDienst} ${texte.imDienst}` : ""}
            </p>
          ) : null}
        </div>

        {besetzung.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {besetzung.map((rolle) => (
              <li key={rolle.name}>
                <BesetzungsChip stand={rolle} texte={texte} />
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {tag.schichten.length === 0 ? (
        <p className="flex items-center gap-2.5 px-4 py-5 text-sm text-muted">
          <CalendarOff className="size-4 shrink-0" aria-hidden="true" />
          {leerText}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {tag.schichten.map((schicht) => (
            <li key={schicht.id}>
              <SchichtZeile
                schicht={schicht}
                chef={chef}
                texte={texte}
                zustandTexte={zustandTexte}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * „Küche 2/3" — eine Rolle im Besetzungsstreifen.
 *
 * Drei Zustände, drei Aussagen:
 *
 *   `besetzt < benoetigt`   es fehlt jemand → Rot, denn das ist eine
 *                           Störung und keine Hervorhebung
 *   `besetzt >= benoetigt`  gedeckt → das Grün-Token, gedämpft
 *   `benoetigt === 0`       niemand hat etwas verlangt, es steht aber
 *                           jemand da → keine Bruchzahl, denn „1/0"
 *                           liest sich wie ein Rechenfehler
 */
function BesetzungsChip({
  stand,
  texte,
}: {
  stand: Besetzungsstand;
  texte: UebersichtTexte;
}) {
  const ohneBedarf = stand.benoetigt === 0;
  const fehlt = !ohneBedarf && stand.besetzt < stand.benoetigt;

  const zahl = ohneBedarf ? `${stand.besetzt}` : `${stand.besetzt}/${stand.benoetigt}`;

  const vorlage = ohneBedarf
    ? texte.chipOhneBedarf
    : fehlt
      ? texte.chipFehlt
      : texte.chipVoll;
  const beschreibung = vorlage
    .replace("{name}", stand.name)
    .replace("{besetzt}", String(stand.besetzt))
    .replace("{benoetigt}", String(stand.benoetigt));

  return (
    <span
      // Die Bruchzahl allein ist vorgelesen nicht verständlich —
      // „Küche 2 Schrägstrich 3" sagt niemandem, was fehlt.
      title={beschreibung}
      className={`flex items-center gap-1.5 rounded-blk border px-2 py-1 text-xs font-medium ${
        fehlt ? "border-stop/50 bg-stop/10 text-stop" : "border-line bg-surface-sunk text-muted"
      }`}
    >
      <span className={fehlt ? "" : "text-text"}>{stand.name}</span>
      <span className={`font-mono ${fehlt ? "font-bold" : "text-muted"}`}>{zahl}</span>
      <span className="sr-only">{beschreibung}</span>
    </span>
  );
}

function SchichtZeile({
  schicht,
  chef,
  texte,
  zustandTexte,
}: {
  schicht: KalenderSchicht;
  chef: boolean;
  texte: UebersichtTexte;
  zustandTexte: ZustandTexte;
}) {
  const zustand = schichtZustand(schicht);
  const hinweis = zustandTexte[zustand];
  const bezeichnung = schichtName(schicht);
  const nachts = ueberNacht(schicht);

  return (
    <Link
      href={`/dashboard/schicht/${schicht.id}`}
      className={`grid gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-surface-sunk sm:grid-cols-[7.5rem_1fr] ${KANTE[zustand]}`}
    >
      {/* Ziffernbreite trägt hier den ganzen Nutzen: nur mit
          Tabellenziffern stehen die Doppelpunkte untereinander, und nur
          dann lässt sich die Spalte überfliegen statt lesen. */}
      <p
        className={`font-mono text-sm leading-6 ${
          zustand === "entwurf" ? "text-muted" : "text-text"
        }`}
      >
        {hhmm(schicht.start_zeit)}–{hhmm(schicht.end_zeit)}
        {nachts ? (
          <span className="text-muted" title={texte.ueberMitternacht}>
            {" "}
            +1
          </span>
        ) : null}
      </p>

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-6">
          <span
            className={`text-sm font-semibold ${
              zustand === "entwurf" ? "text-muted" : "text-text"
            }`}
          >
            {/* `schichtName()` nimmt `label`, sonst `kommentar` — siehe
                dort. Bleibt beides leer, steht hier das neutrale Wort
                statt eines erfundenen Namens. */}
            {bezeichnung ?? texte.schichtName}
          </span>

          {hinweis ? (
            <span className="rounded-full border border-line px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-muted">
              {hinweis}
            </span>
          ) : null}

          {/* `understaffed` wird von `kalender_schichten` je Instanz und
              nur für Chefs berechnet. Es steht bewusst hier und nicht im
              Tagesstreifen: die Summe eines Tages kann aufgehen, während
              eine einzelne Schicht klafft. */}
          {schicht.understaffed ? (
            <span className="text-xs font-semibold text-stop">{texte.unterbesetzt}</span>
          ) : null}

          {schicht.swap_wanted ? (
            <span className="text-xs text-muted">{texte.tauschGesucht}</span>
          ) : null}
        </p>

        <Namen schicht={schicht} chef={chef} texte={texte} />
      </div>
    </Link>
  );
}

/**
 * Wer arbeitet — nach Rollen gegliedert.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine leere Liste heisst nicht dasselbe für alle.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `kalender_schichten` schneidet die Teilnehmer selbst zu: ohne
 * `mitarbeiter_sehen_andere_mitarbeiter` bekommt eine angestellte Person
 * nur sich selbst geliefert. Für sie kann „keine Namen" also „niemand
 * eingeteilt" **oder** „darf ich nicht sehen" bedeuten, und die
 * Oberfläche kann die beiden nicht auseinanderhalten. Deshalb steht dort
 * nichts, statt eine der beiden Aussagen zu raten.
 *
 * Für einen Chef ist die Liste vollständig — dort ist leer wirklich
 * leer, und das ist eine Auskunft, die er braucht.
 */
function Namen({
  schicht,
  chef,
  texte,
}: {
  schicht: KalenderSchicht;
  chef: boolean;
  texte: UebersichtTexte;
}) {
  if (schicht.participants.length === 0) {
    return chef ? (
      <p className="mt-1 text-sm font-medium text-stop">{texte.niemandZugeteilt}</p>
    ) : null;
  }

  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {gruppiereNachRolle(schicht.participants).map((gruppe) => (
        <li key={gruppe.rolle} className="flex flex-wrap items-baseline gap-x-2">
          {/* Die Rolle steht einmal vorn statt hinter jedem Namen: sie
              ist die Frage, die Namen sind die Antwort. */}
          <span className="shrink-0 font-display text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">
            {gruppe.rolle}
          </span>

          <span className="min-w-0 text-sm leading-6">
            {gruppe.personen.map((person, i) => (
              <span key={`${person.name}-${i}`}>
                {i > 0 ? <span className="text-muted">, </span> : null}
                <span
                  className={
                    person.attendet === false
                      ? "text-muted line-through opacity-70"
                      : person.is_me
                        ? "font-semibold text-text"
                        : "text-text"
                  }
                >
                  {person.name}
                </span>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Alle Tage im Blick sind leer — eine Karte statt drei.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Dreimal derselbe Satz ist keine dreifache Auskunft
 * ─────────────────────────────────────────────────────────────────────
 *
 * `TagesPlan` malt pro Tag eine Karte, und das ist richtig, solange die
 * Tage sich unterscheiden. Steht in keinem etwas, entstanden bisher drei
 * gleich hohe Karten mit **wörtlich demselben** Text — knapp die halbe
 * Bildschirmhöhe für eine einzige Information, und obendrein die
 * unauffälligste der Seite in der auffälligsten Menge.
 *
 * Zusammengefasst wird nur der Fall, in dem wirklich **alle** Tage leer
 * sind. Ist auch nur einer belegt, bleiben die Einzelkarten stehen: dann
 * trägt die Lücke eine Aussage („morgen ist nichts"), und die geht in
 * einer Sammelmeldung verloren.
 */
export function LeereTage({
  tage,
  text,
  texte,
}: {
  tage: readonly Tagesblock[];
  text: string;
  texte: UebersichtTexte;
}) {
  const erster = tage[0]?.untertitel ?? "";
  const letzter = tage[tage.length - 1]?.untertitel ?? "";
  const spanne =
    tage.length > 1
      ? texte.leereSpanne.replace("{erster}", erster).replace("{letzter}", letzter)
      : erster;

  return (
    <section
      aria-labelledby="leere-tage"
      className="flex items-start gap-3 rounded-panel border border-line bg-surface px-4 py-5 shadow-card"
    >
      <CalendarOff className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <h3 id="leere-tage" className="font-display text-base font-semibold text-text">
          {text}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {texte.leereAlle
            .replace("{n}", String(tage.length))
            .replace("{spanne}", spanne)}
        </p>
      </div>
    </section>
  );
}
