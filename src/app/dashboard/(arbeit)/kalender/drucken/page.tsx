import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { DruckKnopf } from "@/components/dashboard/druck-knopf";
import { FormMeldung } from "@/components/formular/felder";
import { LogoMark } from "@/components/logo";
import { getDictionary, type Dictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { holeSchichten, monatsnamen, wochentageKurz } from "@/lib/dashboard/kalender";
import {
  baueMatrix,
  GESTAPELT_BIS,
  datumKurz,
  kalenderwoche,
  leseZeitraum,
  standText,
  zeitraumSpanne,
  zeitraumTitel,
  tageIm,
  verschiebeZeitraum,
  wochenIm,
  type MatrixZeile,
  type Zeitraum,
} from "@/lib/dashboard/plan-export";
import { betreteDashboard } from "@/lib/dashboard/zugang";

type Suche = { woche?: string; monat?: string };

/**
 * Der Titel ist beim Drucken mehr als eine Beschriftung des Tabs: „Als PDF
 * speichern" nimmt ihn als **Dateinamen**. Mit einem festen Titel hiesse
 * jede gespeicherte Woche gleich, und der dritte Ausdruck überschriebe den
 * ersten. Deshalb trägt er den Zeitraum.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Suche>;
}): Promise<Metadata> {
  const sprache = await leseSprache();
  const t = getDictionary(sprache).planExport;
  const zeitraum = leseZeitraum(await searchParams, new Date());
  return {
    title: `${t.titel} ${zeitraumTitel(zeitraum, t.kw, monatsnamen(sprache), sprache)}`,
    description: t.beschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Der Dienstplan als Blatt — zum Aushängen, und als Absprung in die
 * Excel-Datei.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Seite unter `(arbeit)` liegt, obwohl sie ohne Schale druckt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Unter `(arbeit)` läuft `betreteDashboard()` im Layout — Anmeldung,
 * Position, Zahlungssperre und Zustimmung, bevor eine Zeile rendert. Eine
 * Route daneben umginge das vollständig (`CLAUDE.md`: „Jeder neue Bereich
 * gehört unter `(arbeit)`"). Dass Sidebar und Kopfzeile auf Papier nichts
 * verloren haben, ist ein **Darstellungs**problem und wird auch dort gelöst:
 * `@media print` in `globals.css` blendet sie aus.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Bildschirm und Blatt sind zwei Gestaltungen desselben Markups
 * ─────────────────────────────────────────────────────────────────────
 *
 * Am Bildschirm folgt die Tabelle den Tokens des gewählten Themas, hell wie
 * dunkel. Auf Papier gilt das nicht: dort setzt `globals.css` eine eigene,
 * feste Druckpalette aus den Ebene-1-Werten (`--qt-c-*`) — ein im
 * Dunkelmodus gedruckter Plan soll genauso aussehen wie ein heller. Die
 * Klassen `qt-plan-*` sind die Anker dafür; am Bildschirm tragen sie nichts.
 */
export default async function DruckSeite({
  searchParams,
}: {
  searchParams: Promise<Suche>;
}) {
  const { supabase, position } = await betreteDashboard();
  const sprache = await leseSprache();
  const texte = getDictionary(sprache);
  const t = texte.planExport;

  const jetzt = new Date();
  const zeitraum = leseZeitraum(await searchParams, jetzt);
  const tage = tageIm(zeitraum);

  const { proTag, fehler } = await holeSchichten(
    supabase,
    position.betriebId,
    position.mitarbeiterId,
    zeitraum.von,
    zeitraum.bis,
    texte.kalender.ladeFehler,
  );

  const wochen = wochenIm(zeitraum);
  const kurz = wochentageKurz(sprache);
  const alleSchichten = tage.flatMap((d) => proTag.get(d) ?? []);
  /*
   * Entwürfe sieht ohnehin nur die Betriebsleitung (`kalender_schichten`
   * filtert sie für alle anderen). Gerade deshalb braucht das Blatt den
   * Vermerk: ein Chef, der den Plan vor der Veröffentlichung aushängt,
   * hängt Schichten aus, die sein Team in der App noch nicht sieht.
   */
  const enthaeltEntwuerfe = alleSchichten.some((s) => s.status === "geplant");

  const param = (art: Zeitraum["art"], wert: string) =>
    `/dashboard/kalender/drucken?${art}=${wert}`;

  return (
    <Container className="py-8 sm:py-10 print:max-w-none print:px-0 print:py-0">
      {/* Die ganze Steuerleiste ist Bildschirm — auf Papier wäre sie Ballast. */}
      <div className="qt-nur-bildschirm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
            <p className="mt-1 max-w-prose text-sm text-muted">{t.beschreibung}</p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
            <DruckKnopf label={t.drucken} />
            <a
              href={`/api/plan-export?${zeitraum.art}=${zeitraum.wert}`}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-blk border border-line px-3 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal sm:h-9 sm:flex-none"
            >
              <Download className="size-4" aria-hidden="true" />
              {t.csv}
            </a>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {/*
            Woche und Monat sind zwei Links, kein Umschalter mit Zustand: die
            Ansicht steht ohnehin in der Adresse, und ein Link funktioniert
            auch ohne JavaScript.
          */}
          <nav aria-label={t.titel} className="flex items-center gap-1.5">
            <Link
              href={param("woche", zeitraum.art === "monat" ? erstesImMonat(zeitraum) : zeitraum.von)}
              aria-current={zeitraum.art === "woche" ? "page" : undefined}
              className={reiter(zeitraum.art === "woche")}
            >
              {t.woche}
            </Link>
            <Link
              href={param("monat", monatVon(zeitraum))}
              aria-current={zeitraum.art === "monat" ? "page" : undefined}
              className={reiter(zeitraum.art === "monat")}
            >
              {t.monat}
            </Link>
          </nav>

          <nav aria-label={t.naechster} className="flex items-center gap-1.5">
            <Link href={param(zeitraum.art, verschiebeZeitraum(zeitraum, -1))} className={pfeil()}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="sr-only">{t.vorheriger}</span>
            </Link>
            <span className="min-w-0 px-1 text-center text-sm font-medium tabular-nums">
              {zeitraumTitel(zeitraum, t.kw, monatsnamen(sprache), sprache)}
            </span>
            <Link href={param(zeitraum.art, verschiebeZeitraum(zeitraum, 1))} className={pfeil()}>
              <ChevronRight className="size-4" aria-hidden="true" />
              <span className="sr-only">{t.naechster}</span>
            </Link>
            <Link
              href={
                zeitraum.art === "monat"
                  ? `/dashboard/kalender/drucken?monat=${monatVon(leseZeitraum({}, jetzt))}`
                  : "/dashboard/kalender/drucken"
              }
              className={pfeil("px-3")}
            >
              {t.heute}
            </Link>
          </nav>
        </div>

        {fehler ? (
          <div className="mt-5">
            <FormMeldung art="fehler">{fehler}</FormMeldung>
          </div>
        ) : null}
      </div>

      {/*
        ─────────────────────────────────────────────────────────────────
         Ab hier beginnt das Blatt.
        ─────────────────────────────────────────────────────────────────
        Der Kopf trägt Marke, Betrieb, Zeitraum und Stand. Auf Papier ist er
        die einzige Stelle, an der noch steht, worum es geht und wie alt der
        Aushang ist — am Bildschirm sagt die Steuerleiste dasselbe, deshalb
        steht er nur im Druck.
      */}
      <article className={`qt-blatt qt-blatt-${zeitraum.art} mt-6`}>
        <header className="qt-nur-druck qt-plan-kopf">
          <div className="qt-plan-kopf-marke">
            <LogoMark className="qt-plan-logo" />
            <span>QuickTeam</span>
            <span aria-hidden="true">·</span>
            <span>{t.titel}</span>
          </div>
          <div className="qt-plan-kopf-haupt">
            <div>
              <p className="qt-plan-betrieb">{position.betriebName}</p>
              <p className="qt-plan-zeitraum">
                {zeitraumTitel(zeitraum, t.kw, monatsnamen(sprache), sprache)}
              </p>
            </div>
            <p className="qt-plan-stand">
              {t.erstelltAm}: {standText(jetzt, sprache)}
            </p>
          </div>
        </header>

        {enthaeltEntwuerfe ? (
          <p className="qt-plan-hinweis mb-4 rounded-blk border border-line-strong bg-surface-sunk px-3 py-2 text-sm text-muted">
            {t.hinweisEntwurf}
          </p>
        ) : null}

        {alleSchichten.length === 0 && !fehler ? (
          <p className="text-sm leading-relaxed text-muted">{t.keineSchichten}</p>
        ) : (
          wochen.map((woche) => {
            const zeilen = baueMatrix(woche.tage, proTag);
            return (
              <section key={woche.von} className="qt-wochenblock mb-6">
                {zeitraum.art === "monat" ? (
                  <h2 className="qt-plan-woche mb-1.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    {t.kw} {kalenderwoche(woche.von)} ·{" "}
                    {zeitraumSpanne(woche.tage[0]!, woche.tage[6]!, sprache)}
                  </h2>
                ) : null}
                {zeilen.length === 0 ? (
                  /*
                    Eine leere Woche bleibt als Zeile stehen, statt still zu
                    verschwinden: auf einem Monatsaushang sähe eine fehlende
                    KW sonst aus wie ein Druckfehler.
                  */
                  <p className="qt-plan-leer rounded-blk border border-dashed border-line px-3 py-2 text-sm text-muted">
                    {t.wocheLeer}
                  </p>
                ) : (
                  <Wochentabelle
                    tage={woche.tage}
                    zeilen={zeilen}
                    wochentage={kurz}
                    spalteSchicht={t.spalteSchicht}
                    locale={sprache}
                  />
                )}
              </section>
            );
          })
        )}

        <Zeichen t={t} />
      </article>
    </Container>
  );
}

function reiter(aktiv: boolean): string {
  return `flex h-9 items-center rounded-blk border px-3 text-sm font-medium transition-colors ${
    aktiv
      ? "border-signal bg-signal-weak text-signal"
      : "border-line text-muted hover:border-line-strong hover:text-text"
  }`;
}

function pfeil(extra = "px-2.5"): string {
  return `flex h-9 items-center rounded-blk border border-line ${extra} text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal`;
}

/** `YYYY-MM` des Zeitraums — bei einer Woche der Monat ihres Donnerstags. */
function monatVon(zeitraum: Zeitraum): string {
  if (zeitraum.art === "monat") return zeitraum.wert;
  // Wie bei der Kalenderwoche: eine Woche gehört dem Monat, in dem die
  // Mehrheit ihrer Tage liegt — und das ist der ihres Donnerstags.
  return tageIm(zeitraum)[3]!.slice(0, 7);
}

/** Beim Wechsel Monat → Woche: die Woche, die den Monatsersten enthält. */
function erstesImMonat(zeitraum: Zeitraum): string {
  return `${zeitraum.wert}-01`;
}

/** Samstag und Sonntag — die Tabelle zeigt sie dezent abgesetzt. */
function istWochenende(spalte: number): boolean {
  return spalte >= 5;
}

/**
 * Eine Woche als Tabelle: Schichten untereinander, Tage nebeneinander.
 *
 * Ein echtes `<table>` mit `<th scope>` in beiden Richtungen — nicht ein
 * Raster aus `div`. Ein Screenreader liest in einer Tabelle zu jeder Zelle
 * ihre beiden Köpfe vor („Mittwoch, Spät, Anna"), und genau diese
 * Verknüpfung ist der ganze Inhalt der Ansicht.
 */
function Wochentabelle({
  tage,
  zeilen,
  wochentage,
  spalteSchicht,
  locale,
}: {
  tage: string[];
  zeilen: MatrixZeile[];
  wochentage: string[];
  spalteSchicht: string;
  locale: string;
}) {
  return (
    <div className="overflow-x-auto">
      {/*
        `table-fixed`: ohne das bemisst der Browser jede Spalte nach ihrem
        Inhalt, und ein leerer Dienstag wird schmal, während der volle Montag
        sich breitmacht. Die Tage sind gleich lang, also sind die Spalten
        gleich breit.
      */}
      <table className="qt-plan-tabelle w-full min-w-[46rem] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="w-40 border border-line bg-surface-sunk p-2 text-left align-bottom font-display text-xs font-bold uppercase tracking-[0.08em] text-muted"
            >
              {spalteSchicht}
            </th>
            {tage.map((datum, i) => (
              <th
                key={datum}
                scope="col"
                className={`border border-line p-2 text-left align-bottom font-semibold ${
                  istWochenende(i) ? "qt-plan-wochenende bg-surface-weekend" : "bg-surface-sunk"
                }`}
              >
                <span className="block text-xs font-normal text-muted">{wochentage[i]}</span>
                <span className="tabular-nums">{datumKurz(datum, locale)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((zeile) => (
            <tr key={zeile.schluessel}>
              <th
                scope="row"
                className="qt-plan-schicht border border-line bg-surface p-2 text-left align-top"
              >
                <span className="block font-semibold">{zeile.name ?? "—"}</span>
                <span className="block font-mono text-xs text-muted tabular-nums">
                  {zeile.start}–{zeile.ende}
                  {zeile.ueberNacht ? " +1" : ""}
                </span>
              </th>
              {zeile.zellen.map((zelle, i) => (
                <td
                  key={zelle.datum}
                  className={`border border-line p-2 align-top leading-snug ${
                    istWochenende(i) ? "qt-plan-wochenende bg-surface-weekend" : "bg-surface"
                  }`}
                >
                  {zelle.schichten.length === 0 ? (
                    <span className="qt-plan-leerzelle text-muted" aria-hidden="true">
                      ·
                    </span>
                  ) : (
                    zelle.schichten.map((s) => (
                      <div key={s.id} className={s.entwurf ? "italic text-muted" : ""}>
                        {s.unterbesetzt ? (
                          <span className="qt-plan-warnung font-bold text-stop" aria-hidden="true">
                            !{" "}
                          </span>
                        ) : null}
                        {s.besetzung.length === 0 ? (
                          <span className="text-muted">·</span>
                        ) : (
                          /*
                            Bis drei Personen ein Name je Zeile: auf einem Aushang
                            sucht man den eigenen Namen, und eine Spalte lässt
                            sich von oben nach unten überfliegen. Darüber fliessen
                            die Namen („Anna, Ben, Cem …") — bei zehn Leuten je
                            Schicht wäre sonst jede Zeile der Tabelle eine halbe
                            Seite hoch (`GESTAPELT_BIS`, dieselbe Grenze wie in
                            der Excel-Datei). Abgemeldete sind durchgestrichen,
                            wie in `shift/[id].tsx` der App.
                          */
                          <ul className={s.besetzung.length > GESTAPELT_BIS ? "qt-plan-fliessend" : ""}>
                            {s.besetzung.map((person, n) => (
                              <li
                                key={`${person.name}-${n}`}
                                className={
                                  s.besetzung.length > GESTAPELT_BIS
                                    ? "inline after:content-[',_'] last:after:content-none"
                                    : ""
                                }
                              >
                                <span className={person.abgemeldet ? "text-muted line-through" : ""}>
                                  {person.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Die Zeichen, die in den Feldern vorkommen.
 *
 * Auf Papier kann man nicht nachfragen, was ein `!` bedeutet — die Legende
 * wird deshalb mitgedruckt. Die Muster sind **echt gesetzt** (durchgestrichen,
 * kursiv) und nicht beschrieben: „kursiv" als Wort erklärt nichts, und ein
 * Unicode-Durchstrich kommt im PDF je nach Schrift als Kästchen heraus.
 */
function Zeichen({ t }: { t: Dictionary["planExport"] }) {
  const eintraege = [
    { muster: <span>·</span>, text: t.legendeUnbesetzt },
    { muster: <span className="line-through">{t.legendeMuster}</span>, text: t.legendeAbgemeldet },
    { muster: <span className="text-stop">!</span>, text: t.legendeUnterbesetzt },
    { muster: <span className="italic">{t.legendeMuster}</span>, text: t.legendeEntwurf },
    { muster: <span className="font-mono">+1</span>, text: t.legendeUeberNacht },
  ];

  return (
    <section aria-labelledby="zeichen-titel" className="qt-plan-legende mt-4">
      <h2
        id="zeichen-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        {t.legendeTitel}
      </h2>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {eintraege.map((eintrag) => (
          <li key={eintrag.text} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="font-bold text-text">{eintrag.muster}</span>
            {eintrag.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
