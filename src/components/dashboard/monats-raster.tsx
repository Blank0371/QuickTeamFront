import Link from "next/link";

import { Besetzung, FortsetzungsChip } from "@/components/dashboard/schicht-chip";
import {
  KompaktFortsetzung,
  KompaktZeile,
} from "@/components/dashboard/tages-indikator";
import { TagesDetail } from "@/components/dashboard/tages-detail";
import { getDictionary, type Locale } from "@/i18n";
import {
  SICHTBARE_KACHELN,
  hhmm,
  monatsnamen,
  schichtName,
  schichtZustand,
  tagesLage,
  ueberNacht,
  wochentageKurz,
  wochentageLang,
  type Fortsetzung,
  type KalenderSchicht,
  type Monatsraster,
  type Rasterzelle,
  type TagesLage,
} from "@/lib/dashboard/kalender";

type KalenderTexte = ReturnType<typeof getDictionary>["kalender"];

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
  locale,
}: {
  raster: Monatsraster;
  proTag: Map<string, KalenderSchicht[]>;
  /** Nachtschichten des Vortags, die in diesen Tag hineinragen. */
  fortsetzungen: Map<string, Fortsetzung[]>;
  locale: Locale;
}) {
  const t = getDictionary(locale).kalender;
  const monate = monatsnamen(locale);
  const wochenKurz = wochentageKurz(locale);
  const wochenLang = wochentageLang(locale);

  return (
    <>
      <div className="hidden sm:block">
        <Raster
          raster={raster}
          proTag={proTag}
          fortsetzungen={fortsetzungen}
          t={t}
          monate={monate}
          wochenKurz={wochenKurz}
          wochenLang={wochenLang}
        />
      </div>
      <div className="sm:hidden">
        <TagesListe
          raster={raster}
          proTag={proTag}
          fortsetzungen={fortsetzungen}
          t={t}
          wochenLang={wochenLang}
        />
      </div>
    </>
  );
}

/** „Samstag, 29. August" — die Überschrift über einem aufgeklappten Tag. */
function langesDatum(
  zelle: Rasterzelle,
  monate: string[],
  wochenLang: string[],
): string {
  const d = new Date(`${zelle.datum}T12:00:00`);
  const wochentag = wochenLang[(d.getDay() + 6) % 7];
  return `${wochentag}, ${zelle.tag}. ${monate[d.getMonth()]}`;
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
function LageMarker({ lage, t }: { lage: TagesLage; t: KalenderTexte }) {
  const marker: { klasse: string; text: string }[] = [];

  if (lage.unterbesetzt) {
    marker.push({ klasse: "bg-stop", text: t.unterbesetzt });
  }
  if (lage.offen) {
    marker.push({ klasse: "bg-signal", text: t.freiUebernehmen });
  }
  if (lage.meine && !lage.offen) {
    marker.push({ klasse: "bg-signal/40", text: t.duEingeteilt });
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
  t,
  monate,
  wochenKurz,
  wochenLang,
}: {
  raster: Monatsraster;
  proTag: Map<string, KalenderSchicht[]>;
  fortsetzungen: Map<string, Fortsetzung[]>;
  t: KalenderTexte;
  monate: string[];
  wochenKurz: string[];
  wochenLang: string[];
}) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-1.5">
      <caption className="sr-only">{t.rasterCaption}</caption>
      <thead>
        <tr>
          {wochenKurz.map((kurz, i) => (
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
              <abbr title={wochenLang[i]} className="no-underline">
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
              const titel = langesDatum(zelle, monate, wochenLang);
              const anzeigenLabel = t.anzeigenAria
                .replace("{titel}", titel)
                .replace("{n}", String(schichten.length))
                .replace(
                  "{wort}",
                  schichten.length === 1 ? t.schichtEz : t.schichtMz,
                );

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
                      /*
                       * Ein Tag, an dem **ich** eingeteilt bin, bekommt
                       * eine signalfarbene Kante — die eigenen Arbeitstage
                       * springen so aus dem Monat heraus, ohne dass man
                       * eine Zelle lesen muss. Die Kante schlägt die
                       * Wochenend-Auszeichnung (Frage „wann arbeite ich?"
                       * vor Frage „ist Wochenende?"); der Grund bleibt der
                       * Wochenendton.
                       */
                      className={`flex h-full min-h-28 flex-col gap-1 rounded-panel border p-1.5 shadow-card transition-colors hover:border-line-strong ${
                        lage.meine
                          ? "border-signal/60"
                          : istKernTag(spalte)
                            ? "border-line-strong"
                            : "border-line"
                      } ${istKernTag(spalte) ? "bg-surface-weekend" : "bg-surface"}`}
                    >
                      <div className="flex items-center justify-between gap-1 px-0.5">
                        {schichten.length > 0 ? (
                          <TagesDetail
                            tag={zelle.tag}
                            datum={zelle.datum}
                            titel={titel}
                            anzeigenLabel={anzeigenLabel}
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

                        <LageMarker lage={lage} t={t} />
                      </div>

                      {/*
                        Kompaktzeilen statt voller Kacheln — die Uhrzeit
                        zuerst, die eigene Schicht hervorgehoben. Rolle und
                        Personenzahl stehen bewusst nicht hier, sondern im
                        Tagesdetail und auf der Schichtseite; die Begründung
                        steht an `KompaktZeile`.
                      */}
                      <div className="mt-auto flex flex-col gap-0.5">
                        {sichtbar.map((schicht) => (
                          <KompaktZeile key={schicht.id} schicht={schicht} t={t} />
                        ))}
                        {weiter.map((f) => (
                          <KompaktFortsetzung key={`f-${f.id}`} fortsetzung={f} t={t} />
                        ))}
                        {versteckt > 0 ? (
                          <p className="px-1 text-[0.625rem] leading-tight text-muted">
                            +{versteckt} {t.weitere}
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
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Umbau 2026-09-21 — lesbarer auf dem Handy
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher stand hier die enge `SchichtChip`-Kachel (10-px-Text), gebaut
 * für die dichte Tagesliste der Übersicht. Auf einer Handybreite ist Platz
 * für mehr: jeder Tag ist eine **klebende Kopfzeile** (bleibt beim Scrollen
 * durch seine Schichten oben) über einer Reihe **grosser, antippbarer
 * Karten** — Rollenfarbe als Balken links, Uhrzeit gross und einstellig,
 * Besetzung darunter, „unterbesetzt" als rote Pille. Die ganze Karte führt
 * auf die Schichtseite (`/dashboard/schicht/…`) — die schnelle Aktion ist
 * ein Tipp weit weg.
 */
function TagesListe({
  raster,
  proTag,
  fortsetzungen,
  t,
  wochenLang,
}: {
  raster: Monatsraster;
  proTag: Map<string, KalenderSchicht[]>;
  fortsetzungen: Map<string, Fortsetzung[]>;
  t: KalenderTexte;
  wochenLang: string[];
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
    <ul className="flex flex-col gap-5">
      {tage.map((zelle) => {
        const schichten = proTag.get(zelle.datum) ?? [];
        const datum = new Date(`${zelle.datum}T12:00:00`);
        const wochentagIndex = (datum.getDay() + 6) % 7;

        return (
          <li key={zelle.datum}>
            {/*
              Klebende Kopfzeile: bleibt beim Durchscrollen der Schichten
              eines Tages oben stehen, damit man nicht den Bezug verliert.
              `bg-bg` deckt die durchlaufenden Karten ab; heute bekommt eine
              gefüllte Pille, das Wochenende bekommt Gewicht.
            */}
            <h3 className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-bg/95 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
              <time
                dateTime={zelle.datum}
                className={`font-display text-sm font-bold ${
                  zelle.istHeute
                    ? "inline-flex items-center rounded-full bg-signal px-2.5 py-0.5 text-signal-ink"
                    : istKernTag(wochentagIndex)
                      ? "text-text"
                      : "text-muted"
                }`}
              >
                {wochenLang[wochentagIndex]}, {zelle.tag}.
              </time>
              <LageMarker lage={tagesLage(schichten)} t={t} />
            </h3>

            <div className="mt-2 flex flex-col gap-2">
              {schichten.map((schicht) => (
                <MobileSchicht key={schicht.id} schicht={schicht} t={t} />
              ))}
              {(fortsetzungen.get(zelle.datum) ?? []).map((f) => (
                <FortsetzungsChip key={`f-${f.id}`} fortsetzung={f} t={t} />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Eine Schicht als grosse, antippbare Karte für das Handy.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Umbau 2026-09-21 — „wann arbeite ich?" zuerst
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die erste Frage an einen Dienstplantag ist **wann** — deshalb steht die
 * Uhrzeit ganz gross. Die eigene Schicht ist unübersehbar markiert:
 * signalfarbener Grund, signalfarbene Kante, ein signalfarbener Balken
 * links und eine „Deine Schicht"-Pille. Wer durch den Monat scrollt,
 * findet seine Arbeitstage, ohne eine Karte lesen zu müssen.
 *
 * Der linke Balken trägt **keine Rollenfarbe mehr**: er zeigt nur noch, ob
 * es die eigene Schicht ist. Wer mit welcher Rolle arbeitet, steht auf der
 * Schichtseite (`/dashboard/schicht/…`) — einen Tipp entfernt, denn die
 * ganze Karte führt dorthin. „unterbesetzt", „Tausch gesucht" und Notizen
 * bleiben als Pillen; die Rolle ist bewusst nicht dabei.
 */
function MobileSchicht({
  schicht,
  t,
}: {
  schicht: KalenderSchicht;
  t: KalenderTexte;
}) {
  const zustand = schichtZustand(schicht);
  const meine = zustand === "meine";
  const zeit = `${hhmm(schicht.start_zeit)}–${hhmm(schicht.end_zeit)}`;
  const bezeichnung = schichtName(schicht);
  const hinweis = t.zustand[zustand];
  const nachts = ueberNacht(schicht);

  const randFarbe =
    zustand === "abgemeldet"
      ? "border-stop/50"
      : meine
        ? "border-signal/60"
        : "border-line";

  return (
    <Link
      href={`/dashboard/schicht/${schicht.id}`}
      className={`flex items-stretch gap-3 rounded-card border ${randFarbe} ${
        meine ? "bg-signal-weak" : "bg-surface"
      } p-3 shadow-card transition-colors hover:border-line-strong`}
    >
      {/*
        Ein Balken links — signalfarben für die eigene Schicht, sonst
        gedämpft. Keine Rollenfarbe: die Rolle ist nachrangig und steht
        auf der Schichtseite.
      */}
      <span
        aria-hidden="true"
        className={`w-1.5 shrink-0 rounded-full ${
          meine ? "bg-signal" : "bg-line-strong"
        }`}
      />

      <span className="min-w-0 grow">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-lg font-semibold leading-tight text-text">
            {zeit}
            {nachts ? (
              <span className="text-sm font-normal text-muted" title={t.ueberMitternacht}>
                {" "}
                +1
              </span>
            ) : null}
          </span>
          {meine ? (
            <span className="rounded-full bg-signal px-2 py-0.5 text-[0.6875rem] font-semibold text-signal-ink">
              {t.meineSchicht}
            </span>
          ) : null}
          {bezeichnung ? (
            <span className="truncate text-sm text-muted">{bezeichnung}</span>
          ) : null}
        </span>

        {/* Besetzung: nur Namen, wer ich bin fett, Abgemeldete durchgestrichen. */}
        {schicht.participants.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs leading-tight text-muted">
            {schicht.participants.map((person, i) => (
              <span
                key={`${person.name}-${i}`}
                className={person.attendet ? "" : "line-through opacity-70"}
              >
                <span className={person.is_me ? "font-semibold text-text" : ""}>
                  {person.name}
                </span>
              </span>
            ))}
          </span>
        ) : null}

        {/* Zustands- und Zusatzhinweise als Pillen — ohne Rolle. */}
        {hinweis || schicht.understaffed || schicht.swap_wanted || schicht.notiz_anzahl > 0 ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {schicht.understaffed ? (
              <span className="rounded-full bg-stop/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-stop">
                {t.unterbesetzt}
              </span>
            ) : null}
            {hinweis ? (
              <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
                {hinweis}
              </span>
            ) : null}
            {schicht.swap_wanted ? (
              <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[0.6875rem] text-muted">
                {t.tauschGesucht}
              </span>
            ) : null}
            {schicht.notiz_anzahl > 0 ? (
              <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[0.6875rem] text-muted">
                {schicht.notiz_anzahl} {schicht.notiz_anzahl === 1 ? t.notizEz : t.notizMz}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
