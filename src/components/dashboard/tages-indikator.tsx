import type { Fortsetzung, KalenderSchicht } from "@/lib/dashboard/kalender";

/**
 * Was eine Monatszelle aus der Entfernung zeigt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Zelle keine Uhrzeiten mehr trägt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-09 stand in jeder Zelle die volle Kachel: Uhrzeit,
 * Bezeichnung, Zustand, Besetzung. Mit den Fixtures aus Betrieb „Test"
 * wurde sichtbar, warum das nicht trägt — ein Monat mit zwei Schichten
 * je Tag füllt jede Zelle bis zum Rand, und das Raster beantwortet die
 * Frage, für die es da ist („an welchen Tagen muss ich hinsehen?"),
 * schlechter als eine Liste.
 *
 * Die Zelle zeigt jetzt nur noch **Menge und Verteilung**: einen Punkt
 * je Zuweisung, eingefärbt nach Rolle, plus die Gesamtzahl. Die volle
 * Aufstellung ist einen Klick entfernt und war es schon vorher —
 * `TagesDetail` ist ein Radix-Popover am Tagesknopf und bestand
 * bereits, es musste nichts Neues dafür gebaut werden.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Fortsetzungen zählen nicht mit, sind aber sichtbar
 * ─────────────────────────────────────────────────────────────────────
 *
 * Eine Nachtschicht vom Vortag ist keine Schicht dieses Tages. Sie darf
 * die Zahl deshalb nicht erhöhen — sonst behauptete der Dienstag vier
 * Schichten, von denen eine dem Montag gehört. Sichtbar bleiben muss sie
 * trotzdem, sonst wirkt der Morgen unbesetzt.
 *
 * Gelöst über die Form, nicht über die Farbe: eine Fortsetzung ist ein
 * **hohler** Ring, eine echte Schicht ein gefüllter Punkt. Das
 * unterscheidet sich auch dann, wenn beide dieselbe Rollenfarbe tragen —
 * und es überlebt eine Farbenblindheit, die ein zweiter Farbton nicht
 * überlebt hätte.
 */

/**
 * Die vier Rollenkennfarben, zyklisch.
 *
 * Als feste Klassenliste und nicht als Zeichenkette zusammengebaut:
 * Tailwind liest die Klassen zur Buildzeit aus dem Quelltext, und ein
 * `bg-rolle-${i}` stünde in keinem Stylesheet. Die Tokens dahinter sind
 * in `globals.css` begründet.
 */
const ROLLEN_FARBEN = [
  { punkt: "bg-rolle-1", ring: "border-rolle-1" },
  { punkt: "bg-rolle-2", ring: "border-rolle-2" },
  { punkt: "bg-rolle-3", ring: "border-rolle-3" },
  { punkt: "bg-rolle-4", ring: "border-rolle-4" },
] as const;

/**
 * Welche Kennfarbe gehört zu dieser Rolle?
 *
 * Über den Index in einer **stabil sortierten** Rollenliste, nicht über
 * einen Hash der ID: eine Rolle soll im Januar dieselbe Farbe haben wie
 * im März, und benachbarte Rollen sollen sich unterscheiden. Ein Hash
 * erfüllte das erste, aber nicht das zweite — zwei Rollen könnten
 * denselben Rest ergeben.
 *
 * Ab der fünften Rolle wiederholen sich die Farben. Das ist die Grenze
 * des Sets und in `globals.css` als solche festgehalten; der Rollenname
 * am Punkt bleibt in jedem Fall eindeutig.
 */
export function rollenFarbe(rolleName: string | null, reihenfolge: readonly string[]) {
  if (rolleName === null) return ROLLEN_FARBEN[3]!;
  const i = reihenfolge.indexOf(rolleName);
  if (i < 0) return ROLLEN_FARBEN[3]!;
  return ROLLEN_FARBEN[i % ROLLEN_FARBEN.length]!;
}

export type IndikatorPunkt = {
  schluessel: string;
  /**
   * Der Rollen**name**, nicht die ID: `kalender_schichten` liefert in
   * `participants` ausschliesslich `role_name`. Eine ID wäre stabiler,
   * steht hier aber schlicht nicht zur Verfügung.
   */
  rolleName: string | null;
  /** Fortsetzung vom Vortag — hohler Ring statt gefülltem Punkt. */
  fortsetzung: boolean;
};

/**
 * Baut die Punkte eines Tages.
 *
 * Ein Punkt je **Zuweisung**, nicht je Schicht: eine Frühschicht mit
 * Küche und Bar ist für die Besetzung zwei Personen, und genau das soll
 * das Raster zeigen. Wer nur die Schichtzahl will, liest die Zahl
 * daneben.
 */
export function bauePunkte(
  schichten: readonly KalenderSchicht[],
  fortsetzungen: readonly Fortsetzung[],
): IndikatorPunkt[] {
  const punkte: IndikatorPunkt[] = [];

  for (const schicht of schichten) {
    /*
     * Abgemeldete zählen nicht mit. `kalender_schichten` rechnet die
     * Besetzung genauso (`coalesce(z.attendet, true)`), und ein Punkt
     * für jemanden, der sich abgemeldet hat, behauptete eine Besetzung,
     * die es nicht gibt. Dass jemand fehlt, trägt `understaffed`.
     */
    const teilnehmer = (schicht.participants ?? []).filter((t) => t.attendet);
    if (teilnehmer.length === 0) {
      punkte.push({
        schluessel: `${schicht.id}-leer`,
        rolleName: null,
        fortsetzung: false,
      });
      continue;
    }
    teilnehmer.forEach((t, i) => {
      punkte.push({
        schluessel: `${schicht.id}-${i}`,
        rolleName: t.role_name,
        fortsetzung: false,
      });
    });
  }

  for (const f of fortsetzungen) {
    punkte.push({
      schluessel: `f-${f.id}`,
      rolleName: null,
      fortsetzung: true,
    });
  }

  return punkte;
}

/** Höchstzahl gezeichneter Punkte — darüber steht „+n". */
const MAX_PUNKTE = 8;

export function TagesIndikator({
  punkte,
  reihenfolge,
}: {
  punkte: readonly IndikatorPunkt[];
  /** Sortierte Rollennamen des Betriebs — bestimmt die Farbzuordnung. */
  reihenfolge: readonly string[];
}) {
  if (punkte.length === 0) return null;

  const sichtbar = punkte.slice(0, MAX_PUNKTE);
  const rest = punkte.length - sichtbar.length;

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {sichtbar.map((p) => {
        const farbe = rollenFarbe(p.rolleName, reihenfolge);
        const beschriftung = p.fortsetzung
          ? "Fortsetzung vom Vortag"
          : (p.rolleName ?? "Noch niemand eingeteilt");
        return (
          <li key={p.schluessel}>
            <span
              title={beschriftung}
              className={
                p.fortsetzung
                  ? `block size-2 rounded-full border border-dashed bg-transparent ${farbe.ring}`
                  : `block size-2 rounded-full ${farbe.punkt}`
              }
            />
            <span className="sr-only">{beschriftung}</span>
          </li>
        );
      })}
      {rest > 0 ? (
        <li className="font-mono text-[0.625rem] leading-none text-muted">+{rest}</li>
      ) : null}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Kompaktzeile — was die Monatszelle wirklich zeigt                    */
/* ------------------------------------------------------------------ */

/**
 * Eine Schicht als einzeilige Kompaktzeile.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die reinen Punkte wieder weg sind
 * ─────────────────────────────────────────────────────────────────────
 *
 * Am 2026-09-09 stand in der Zelle nur noch ein Punktband plus „2
 * Schichten". Das war ruhig, aber es sagte nichts: ein Punkt trägt keine
 * Uhrzeit, und ohne Uhrzeit lässt sich ein Dienstplan nicht überfliegen —
 * die erste Frage an einen Kalendertag ist „wann", nicht „wie viele".
 * Aus dem Test kam genau das zurück: „die Legende und die Punkte sind zu
 * nichtssagend".
 *
 * Die Zeile hier ist der Mittelweg zwischen der alten, vollen Kachel
 * (vier Zeilen je Schicht, Zelle randvoll) und dem reinen Punktband:
 *
 *   · **Uhrzeit gekürzt** — „09–17" statt „09:00–17:00". Volle Stunden
 *     sind der Normalfall; die Minuten stehen nur da, wenn es welche
 *     gibt. Das spart die halbe Breite, ohne etwas zu verschweigen.
 *   · **Rollenfarbe als Balken links**, nicht als freischwebender Punkt.
 *     Die Farbe hängt damit an einem Text, den man lesen kann — und
 *     trägt die Auskunft nicht mehr allein.
 *   · **Personenzahl** statt Namensliste. Wer wirklich arbeitet, steht
 *     im Popover am Tagesknopf.
 *
 * Mehrere Rollen in einer Schicht ergeben mehrere Balken übereinander.
 */
export function KompaktZeile({
  schicht,
  reihenfolge,
}: {
  schicht: KalenderSchicht;
  reihenfolge: readonly string[];
}) {
  const anwesend = (schicht.participants ?? []).filter((t) => t.attendet);
  const rollen = [...new Set(anwesend.map((t) => t.role_name).filter(Boolean))] as string[];

  return (
    <a
      href={`/dashboard/schicht/${schicht.id}`}
      className="flex items-stretch gap-1.5 rounded-blk px-1 py-0.5 transition-colors hover:bg-surface-sunk"
    >
      {/*
        Ein Balken je Rolle, senkrecht gestapelt. Bei einer Rolle ist es
        ein durchgehender Strich, bei zweien ein zweifarbiger — das
        zeigt die Zusammensetzung, ohne eine zweite Zeile zu kosten.
      */}
      <span aria-hidden="true" className="flex w-1 shrink-0 flex-col overflow-hidden rounded-full">
        {rollen.length === 0 ? (
          <span className="flex-1 bg-line-strong" />
        ) : (
          rollen.map((r) => (
            <span key={r} className={`flex-1 ${rollenFarbe(r, reihenfolge).punkt}`} />
          ))
        )}
      </span>

      <span className="min-w-0 grow">
        <span className="block truncate font-mono text-[0.6875rem] leading-tight text-text">
          {kurzeZeit(schicht.start_zeit)}–{kurzeZeit(schicht.end_zeit)}
          {schicht.end_zeit < schicht.start_zeit ? (
            <span className="text-muted"> +1</span>
          ) : null}
        </span>
        <span className="block truncate text-[0.625rem] leading-tight text-muted">
          {anwesend.length > 0
            ? `${anwesend.length} ${anwesend.length === 1 ? "Person" : "Personen"}`
            : "niemand eingeteilt"}
          {rollen.length > 0 ? ` · ${rollen.join(", ")}` : ""}
        </span>
      </span>

      {schicht.understaffed ? (
        <span
          aria-hidden="true"
          title="Mindestbesetzung nicht erreicht"
          className="mt-0.5 size-1.5 shrink-0 rounded-full bg-stop"
        />
      ) : null}
      {schicht.understaffed ? (
        <span className="sr-only">Mindestbesetzung nicht erreicht</span>
      ) : null}
    </a>
  );
}

/** „09:00" → „09", „17:30" → „17:30". Volle Stunden ohne Minuten. */
function kurzeZeit(zeit: string): string {
  const [h, m] = zeit.split(":");
  return m === "00" ? (h ?? "") : `${h}:${m}`;
}

/**
 * Die Fortsetzung als Kompaktzeile — gestrichelt und ohne Rollenbalken.
 *
 * Sie zählt nicht als Schicht dieses Tages und sieht deshalb bewusst
 * anders aus als die Zeilen darüber.
 */
export function KompaktFortsetzung({ fortsetzung }: { fortsetzung: Fortsetzung }) {
  return (
    <a
      href={`/dashboard/schicht/${fortsetzung.id}`}
      className="flex items-center gap-1.5 rounded-blk border border-dashed border-line px-1 py-0.5 transition-colors hover:border-line-strong"
    >
      <span className="truncate font-mono text-[0.6875rem] leading-tight text-muted">
        <span aria-hidden="true">↳ </span>
        bis {kurzeZeit(fortsetzung.end_zeit)}
      </span>
      <span className="sr-only">Fortsetzung der Nachtschicht vom Vortag</span>
    </a>
  );
}
