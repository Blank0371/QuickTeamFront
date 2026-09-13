import {
  Besetzung,
  FortsetzungsChip,
  SchichtChip,
} from "@/components/dashboard/schicht-chip";
import {
  KompaktFortsetzung,
  KompaktZeile,
} from "@/components/dashboard/tages-indikator";
import { TagesDetail } from "@/components/dashboard/tages-detail";
import {
  MONATSNAMEN,
  SICHTBARE_KACHELN,
  WOCHENTAGE,
  WOCHENTAGE_LANG,
  hhmm,
  tagesLage,
  type Fortsetzung,
  type KalenderSchicht,
  type Monatsraster,
  type Rasterzelle,
  type TagesLage,
} from "@/lib/dashboard/kalender";

/**
 * Der Monat als Raster — und auf schmalen Geräten als Tagesliste.
 *
 * **Warum nicht wie in der App.** `calendar.tsx` zeigt im Monat nur
 * einen farbigen Punkt je Tag; die Schichten selbst stehen erst nach
 * einem Tippen da. Das ist eine vernünftige Antwort auf eine
 * Handy-Breite, aber keine auf einen Bildschirm. `CLAUDE.md` begründet
 * die Weboberfläche genau damit — sichtbarer Gesamtüberblick statt einer
 * Maske, die jeweils eine Sache zeigt. Übernommen wird die Datenlogik,
 * nicht das Format: gleiche Zustände, gleiche Rangfolge, gleiche
 * montagsbasierte Woche.
 *
 * Zwei Darstellungen desselben Inhalts, per CSS umgeschaltet. Der
 * jeweils versteckte Zweig ist `display: none` und damit auch für
 * Screenreader fort — kein doppelter Vorlesetext.
 *
 * Ohne JavaScript: der Monatswechsel läuft über Links, die Ansicht
 * rendert vollständig auf dem Server.
 */
export function MonatsRaster({
  raster,
  proTag,
  fortsetzungen,
  rollenReihenfolge,
}: {
  raster: Monatsraster;
  proTag: Map<string, KalenderSchicht[]>;
  /** Nachtschichten des Vortags, die in diesen Tag hineinragen. */
  fortsetzungen: Map<string, Fortsetzung[]>;
  /** Sortierte Rollennamen — bestimmt die Kennfarbe der Indikatorpunkte. */
  rollenReihenfolge: readonly string[];
}) {
  return (
    <>
      <div className="hidden sm:block">
        <Raster
          raster={raster}
          proTag={proTag}
          fortsetzungen={fortsetzungen}
          rollenReihenfolge={rollenReihenfolge}
        />
      </div>
      <div className="sm:hidden">
        <TagesListe raster={raster} proTag={proTag} fortsetzungen={fortsetzungen} />
      </div>
    </>
  );
}

/** „Samstag, 29. August" — die Überschrift über einem aufgeklappten Tag. */
function langesDatum(zelle: Rasterzelle): string {
  const d = new Date(`${zelle.datum}T12:00:00`);
  const wochentag = WOCHENTAGE_LANG[(d.getDay() + 6) % 7];
  return `${wochentag}, ${zelle.tag}. ${MONATSNAMEN[d.getMonth()]}`;
}

/**
 * Samstag und Sonntag — das Wochenende.
 *
 * Montagsbasierter Index, wie überall in diesem Projekt: 0 = Montag,
 * also 5/6.
 *
 * **Freitag zählte bis zum 2026-09-09 mit** und war damit farblich vom
 * Rest der Woche abgesetzt. Das war als „Kernspalten eines
 * Gastrobetriebs" gedacht, hat sich aber als falsch erwiesen: Freitag
 * ist ein Arbeitstag wie Montag bis Donnerstag, und ihn optisch zum
 * Wochenende zu schlagen verschiebt die Grenze, die jeder Kalender
 * sonst zieht. Die Hervorhebung meint jetzt das, was sie zeigt.
 */
function istKernTag(spalte: number): boolean {
  return spalte >= 5;
}

/* ------------------------------------------------------------------ */
/* Die Marker eines Tages                                              */
/* ------------------------------------------------------------------ */

/**
 * Ein Punkt für eine Lage — die einzige Farbe im Raster ausser „heute".
 *
 * Punkte statt Wörter, weil sieben Spalten nebeneinander keinen Platz
 * für „unterbesetzt" haben und ein abgeschnittenes Wort schlechter ist
 * als ein Zeichen mit Beschriftung. Die Beschriftung geht nicht
 * verloren: sie steht in `title` für die Maus und in einem
 * `sr-only`-Text für den Screenreader.
 */
function LageMarker({ lage }: { lage: TagesLage }) {
  const marker: { klasse: string; text: string }[] = [];

  if (lage.unterbesetzt) {
    marker.push({ klasse: "bg-stop", text: "unterbesetzt" });
  }
  if (lage.offen) {
    marker.push({ klasse: "bg-signal", text: "frei zu übernehmen" });
  }
  if (lage.meine && !lage.offen) {
    marker.push({ klasse: "bg-signal/40", text: "du bist eingeteilt" });
  }

  if (marker.length === 0) return null;

  return (
    <span className="flex items-center gap-1">
      {marker.map((m) => (
        <span key={m.text} title={m.text} className="flex items-center">
          <span className={`size-1.5 rounded-full ${m.klasse}`} aria-hidden="true" />
          <span className="sr-only">{m.text}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Das Monatsraster.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Vom Tabellenblatt zum Dienstplan
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-06 trug jede Zelle — Kopfzeile eingeschlossen — einen
 * eigenen 1px-Rahmen aus `border-collapse`. Das ergibt ein durchgehendes
 * Gitternetz, und ein Gitternetz ist die Formensprache einer
 * Tabellenkalkulation. Direkt daneben, auf der Übersicht, stehen dieselben
 * Daten in gerundeten Karten mit Schatten; zwei Bereiche desselben
 * Produkts sahen aus wie zwei Produkte.
 *
 * Umgestellt auf `border-separate` mit Abstand: jeder Tag ist eine eigene
 * kleine Karte mit demselben `rounded-panel`/`shadow-card` wie die
 * Tagesblöcke der Übersicht, die Linien dazwischen sind Luft statt
 * Striche.
 *
 * **Die Tabelle bleibt eine Tabelle.** Das ist keine Nachlässigkeit: ein
 * Monatskalender *ist* tabellarisch — Spalten sind Wochentage, Zeilen
 * sind Wochen —, und `<th scope="col">` samt `<caption>` ist die einzige
 * Auszeichnung, mit der ein Screenreader „Mittwoch, 9." vorlesen kann.
 * Geändert wird das Aussehen, nicht die Bedeutung. Ein Raster aus
 * `<div>`-Boxen hätte hübsch ausgesehen und diese Auskunft verloren.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Randtage sind keine Karte
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher unterschieden sie sich von den Tagen des Monats nur durch
 * `bg-bg` statt `bg-surface`. Am 2026-09-06 im Browser gemessen —
 * **1.06:1 im Hellmodus, 1.14:1 im Dunkelmodus**. Beides ist keine
 * Dämpfung, sondern dieselbe Fläche mit einer Messtoleranz daneben; im
 * Hellmodus ist `--qt-surface` schliesslich nichts anderes als eine
 * 55-%-Mischung aus `--qt-bg` mit Weiss. Mit einem Farbwert allein wäre
 * der Unterschied auch nicht herzustellen gewesen, ohne an der Palette
 * zu drehen.
 *
 * (Gemessen wird hier nicht nebenbei: `getComputedStyle` gibt für ein
 * `color-mix(in oklab, …)` **`oklab(…)`** zurück, und wer dessen Zahlen
 * für R/G/B hält, misst 18.42:1 statt 1.06:1. Die Umrechnung gehört zum
 * Messen dazu.)
 *
 * Getragen wird der Unterschied deshalb von der Form: Tage des Monats
 * sind Karten, Randtage sind es nicht — kein Rahmen, keine Fläche, kein
 * Schatten. Das ist unabhängig vom Modus, unabhängig vom Kontrastwert
 * zweier ähnlicher Töne, und es sagt zusätzlich etwas Richtiges: dort
 * ist nichts zu tun.
 */
function Raster({
  raster,
  proTag,
  fortsetzungen,
  rollenReihenfolge,
}: {
  raster: Monatsraster;
  proTag: Map<string, KalenderSchicht[]>;
  fortsetzungen: Map<string, Fortsetzung[]>;
  rollenReihenfolge: readonly string[];
}) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-1.5">
      <caption className="sr-only">
        Dienstplan als Monatsübersicht, Wochen beginnen am Montag
      </caption>
      <thead>
        <tr>
          {WOCHENTAGE.map((kurz, i) => (
            <th
              key={kurz}
              scope="col"
              /*
               * Samstag und Sonntag stehen in `text-text` statt
               * `text-muted` und tragen zusätzlich Gewicht. Der Kopf ist
               * die billigste Stelle für diese Auskunft: sie kostet
               * keinen Platz in den Zellen und stört keine Kachel.
               */
              className={`px-2 pb-1 text-left font-display text-xs font-bold uppercase tracking-[0.12em] ${
                istKernTag(i)
                  ? "border-b-2 border-signal/40 text-text"
                  : "border-b-2 border-transparent text-muted"
              }`}
            >
              <abbr title={WOCHENTAGE_LANG[i]} className="no-underline">
                {kurz}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {raster.wochen.map((woche) => (
          <tr key={woche[0]?.datum}>
            {woche.map((zelle, spalte) => {
              const schichten = proTag.get(zelle.datum) ?? [];
              /*
               * Fortsetzungen zählen bewusst **nicht** in `tagesLage`
               * und nicht in den Tageszähler: sie sind der Ausläufer
               * der Schicht vom Vortag, und deren Unterbesetzung gehört
               * dorthin. Begründung an `sammleFortsetzungen()`.
               */
              const weiter = fortsetzungen.get(zelle.datum) ?? [];
              const lage = tagesLage(schichten);
              const sichtbar = schichten.slice(0, SICHTBARE_KACHELN);
              const versteckt = schichten.length - sichtbar.length;

              return (
                <td key={zelle.datum} className="h-px p-0 align-top">
                  {zelle.imMonat ? (
                    <div
                      /*
                       * Mindesthöhe am `<div>` und nicht an der Zelle:
                       * `min-height` auf `display: table-cell` ist laut
                       * CSS 2.1 §17.5.3 ausdrücklich undefiniert. Browser
                       * ignorieren es beim Berechnen der Zeilenhöhe, und
                       * ein Monat ohne Schichten fiel damit auf die Höhe
                       * der Tageszahl zusammen. Am `<div>` ist es eine
                       * gewöhnliche Blockbox und schlicht definiert.
                       *
                       * Die Kernspalten bekommen die kräftigere Kante —
                       * derselbe Rahmen, nur eine Stufe deutlicher. Eine
                       * eigene Fläche wäre der naheliegendere Weg gewesen
                       * und der falsche: die Kacheln im Normalzustand
                       * sitzen auf `bg-surface-sunk`, und genau diese
                       * Fläche als Zellengrund hätte sie verschwinden
                       * lassen. Die eigentliche Auszeichnung des
                       * Wochenendes trägt die Kopfzeile — drei bronzene
                       * Striche je Monat statt einundzwanzig bronzener
                       * Kartenkanten, was das Mengenverhältnis der
                       * Palette (~8 % Bronze) unangetastet lässt.
                       *
                       * `h-full` zusammen mit `h-px` an der Zelle ist der
                       * übliche Kniff, um Karten einer Zeile auf gleiche
                       * Höhe zu bringen: die Zelle bekommt eine
                       * Nennhöhe, die das Tabellenlayout ohnehin
                       * überschreibt, und erst dadurch hat `height: 100%`
                       * im Inneren einen Bezug. Ohne das endet jede Karte
                       * dort, wo ihr Inhalt endet, und eine Woche mit
                       * einem vollen Freitag franst nach unten aus.
                       */
                      className={`flex h-full min-h-28 flex-col gap-1 rounded-panel border p-1.5 shadow-card transition-colors hover:border-line-strong ${
                        istKernTag(spalte)
                          ? "border-line-strong bg-surface-weekend"
                          : "border-line bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 px-0.5">
                        {schichten.length > 0 ? (
                          <TagesDetail
                            tag={zelle.tag}
                            datum={zelle.datum}
                            titel={langesDatum(zelle)}
                            anzahl={schichten.length}
                            istHeute={zelle.istHeute}
                            imMonat
                            versteckt={versteckt}
                          >
                            {/*
                              Bewusst **kein** zweiter `SchichtChip`. Der
                              steht schon in der Zelle, und der Inhalt hier
                              wird als fertig gerendertes `children` in eine
                              Client-Komponente gereicht — er liegt damit in
                              der RSC-Nutzlast jedes Seitenaufrufs, auch wenn
                              niemand aufklappt. Am 2026-08-29 gemessen: ein
                              voller Monat (31 Tage à vier Schichten) wuchs
                              mit dem doppelten Chip um 29 kB gzip, also fast
                              die Hälfte der Seite. Hier steht deshalb nur,
                              was die Zelle nicht ohnehin zeigt: wer arbeitet
                              — und, seit der Kürzung, die Schichten, die
                              nicht mehr in die Zelle gepasst haben.
                            */}
                            <ul className="flex flex-col gap-2.5">
                              {schichten.map((schicht) => (
                                <li key={schicht.id}>
                                  <p className="font-mono text-xs text-muted">
                                    {`${hhmm(schicht.start_zeit)}–${hhmm(schicht.end_zeit)}`}
                                  </p>
                                  <Besetzung schicht={schicht} />
                                </li>
                              ))}
                            </ul>
                          </TagesDetail>
                        ) : (
                          /*
                           * Ein leerer Tag bleibt eine schlichte Zahl. Ihn
                           * aufklappbar zu machen hiesse, ein leeres Feld zu
                           * versprechen — und je Monat rund zwei Dutzend
                           * Radix-Instanzen für nichts zu bezahlen.
                           */
                          <p
                            className={`text-xs font-semibold ${
                              zelle.istHeute
                                ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal text-signal-ink"
                                : "text-text"
                            }`}
                          >
                            <time dateTime={zelle.datum}>{zelle.tag}</time>
                          </p>
                        )}

                        <LageMarker lage={lage} />
                      </div>

                      {/*
                        Kompaktzeilen statt voller Kacheln — Uhrzeit,
                        Personenzahl und Rollenfarbe in einer Zeile. Die
                        reinen Punkte davor waren zu abstrakt; die
                        Begründung steht an `KompaktZeile`.
                      */}
                      <div className="mt-auto flex flex-col gap-0.5">
                        {sichtbar.map((schicht) => (
                          <KompaktZeile
                            key={schicht.id}
                            schicht={schicht}
                            reihenfolge={rollenReihenfolge}
                          />
                        ))}
                        {weiter.map((f) => (
                          <KompaktFortsetzung key={`f-${f.id}`} fortsetzung={f} />
                        ))}
                        {versteckt > 0 ? (
                          <p className="px-1 text-[0.625rem] leading-tight text-muted">
                            +{versteckt} weitere
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    /*
                     * Randtag: dieselbe Höhe, damit die Zeile nicht
                     * springt, aber keine Karte — siehe die Erklärung
                     * oben. Schichten stehen dort bewusst nicht: sie
                     * gehören in den Monat, in dem sie liegen, und
                     * `baueRaster()` lädt den Randbereich nur, damit der
                     * erste Montag nicht in einem Loch beginnt.
                     */
                    <div className="flex h-full min-h-28 flex-col p-1.5">
                      <p className="px-0.5 text-xs font-semibold text-muted">
                        <time dateTime={zelle.datum}>{zelle.tag}</time>
                      </p>
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Schmale Geräte: nur Tage mit Schichten, dafür mit Namen.
 *
 * Ein leerer Tag ist auf dem Handy keine Information, die eine Zeile
 * wert wäre — im Raster dagegen schon, weil er die Lücke im Muster
 * zeigt.
 *
 * Hier wird **nicht** gekürzt: die Liste ist ohnehin senkrecht, ein
 * vierter Eintrag kostet nichts ausser Scrollweg, und es gibt keine
 * Nachbarspalte, die mitwachsen müsste.
 */
function TagesListe({
  raster,
  proTag,
  fortsetzungen,
}: {
  raster: Monatsraster;
  proTag: Map<string, KalenderSchicht[]>;
  fortsetzungen: Map<string, Fortsetzung[]>;
}) {
  /*
   * Ein Tag, der **nur** eine Fortsetzung trägt, kommt hier ebenfalls
   * vor: auf dem Handy ist „ab 00:00 läuft noch die Nachtschicht von
   * gestern" genau die Auskunft, die man morgens sucht.
   */
  const tage = raster.wochen
    .flat()
    .filter(
      (zelle) =>
        zelle.imMonat &&
        ((proTag.get(zelle.datum)?.length ?? 0) > 0 ||
          (fortsetzungen.get(zelle.datum)?.length ?? 0) > 0),
    );

  if (tage.length === 0) return null;

  return (
    <ul className="flex flex-col gap-4">
      {tage.map((zelle) => {
        const schichten = proTag.get(zelle.datum) ?? [];
        const datum = new Date(`${zelle.datum}T12:00:00`);
        const wochentagIndex = (datum.getDay() + 6) % 7;

        return (
          <li key={zelle.datum}>
            <h3
              className={`flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.12em] ${
                zelle.istHeute
                  ? "text-signal"
                  : istKernTag(wochentagIndex)
                    ? "text-text"
                    : "text-muted"
              }`}
            >
              <time dateTime={zelle.datum}>
                {WOCHENTAGE_LANG[wochentagIndex]}, {zelle.tag}.
              </time>
              {zelle.istHeute ? <span>· heute</span> : null}
              <LageMarker lage={tagesLage(schichten)} />
            </h3>

            <div className="mt-2 flex flex-col gap-2">
              {schichten.map((schicht) => (
                <div key={schicht.id}>
                  <SchichtChip schicht={schicht} />
                  <Besetzung schicht={schicht} />
                </div>
              ))}
              {(fortsetzungen.get(zelle.datum) ?? []).map((f) => (
                <FortsetzungsChip key={`f-${f.id}`} fortsetzung={f} />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
