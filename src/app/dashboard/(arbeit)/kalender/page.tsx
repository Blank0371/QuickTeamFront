import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { sammleFortsetzungen } from "@/lib/dashboard/kalender";
import { MonatsRaster } from "@/components/dashboard/monats-raster";
import { MonatsSpringer } from "@/components/dashboard/monats-springer";
import { FormMeldung } from "@/components/formular/felder";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import {
  baueRaster,
  holeSchichten,
  leseMonat,
  monatsnamen,
  verschiebeMonat,
} from "@/lib/dashboard/kalender";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await leseSprache());
  return {
    title: t.kalender.metaTitel,
    description: t.kalender.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Kalender, lesend.
 *
 * Der Monat steht in der Adresse (`?monat=YYYY-MM`), nicht im
 * Komponentenzustand. Damit ist eine Ansicht teilbar, überlebt einen
 * Reload und blättert ohne JavaScript — Vor und Zurück sind gewöhnliche
 * Links. Ein unsinniger Parameter fällt still auf den laufenden Monat
 * zurück, statt eine Fehlerseite zu erzeugen.
 */
export default async function KalenderSeite({
  searchParams,
}: {
  searchParams: Promise<{ monat?: string }>;
}) {
  const { supabase, position } = await betreteDashboard();
  const sprache = await leseSprache();
  const t = getDictionary(sprache);
  const { monat: monatParam } = await searchParams;

  const heute = new Date();
  const { jahr, monat } = leseMonat(monatParam, heute);
  const raster = baueRaster(jahr, monat, heute);
  const monate = monatsnamen(sprache);

  const { proTag, fehler } = await holeSchichten(
    supabase,
    position.betriebId,
    position.mitarbeiterId,
    raster.von,
    raster.bis,
    t.kalender.ladeFehler,
  );

  const chef = istChef(position);
  const anzahl = [...proTag.values()].reduce((summe, liste) => summe + liste.length, 0);
  const laufenderMonat =
    jahr === heute.getFullYear() && monat === heute.getMonth() + 1;

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-tight sm:text-3xl">
            {monate[monat - 1]} {jahr}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {anzahl === 0
              ? t.kalender.keineSchichten
              : `${anzahl} ${anzahl === 1 ? t.kalender.schichtEz : t.kalender.schichtMz}`}
            {chef ? "" : ` · ${t.kalender.nurSichtbar}`}
          </p>
        </div>

        {/*
          Auf dem Handy eine volle Zeile mit grossen Zielen: die Pfeile
          dehnen sich (`flex-1`) und sind mit `h-11` bequem mit dem Daumen
          zu treffen; „Heute" und der Monatssprung stehen dazwischen. Ab
          `sm` schrumpft alles auf die kompakte Reihe von vorher zurück.
        */}
        <nav
          aria-label={t.kalender.monatWechseln}
          className="flex w-full items-center gap-1.5 sm:w-auto sm:flex-wrap"
        >
          {/*
            `prefetch` auf beiden Pfeilen: der Nachbarmonat liegt dann
            schon bereit, wenn jemand klickt. Das ist der billigste
            Zugewinn an gefühlter Geschwindigkeit, den es hier gibt —
            keine Zeile Zustandslogik, nur eine Angabe am Link.
          */}
          <Link
            href={`/dashboard/kalender?monat=${verschiebeMonat(jahr, monat, -1)}`}
            prefetch
            className="flex h-11 flex-1 items-center justify-center rounded-blk border border-line px-2.5 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal sm:h-9 sm:flex-none"
          >
            <ChevronLeft className="size-5 sm:size-4" aria-hidden="true" />
            <span className="sr-only">{t.kalender.vorherigerMonat}</span>
          </Link>

          {laufenderMonat ? null : (
            <Link
              href="/dashboard/kalender"
              prefetch
              className="flex h-11 items-center rounded-blk border border-line px-4 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal sm:h-9 sm:px-3"
            >
              {t.kalender.heute}
            </Link>
          )}

          {/*
            Für den Sprung, nicht für den Schritt: „Dezember planen" im
            August sind sonst vier Klicks auf den Pfeil.
          */}
          <MonatsSpringer
            jahr={jahr}
            monat={monat}
            ziel="/dashboard/kalender"
            monate={monate}
            waehlenLabel={t.kalender.monatWaehlen}
            vorJahrLabel={t.kalender.vorJahr}
            nachJahrLabel={t.kalender.nachJahr}
          />

          <Link
            href={`/dashboard/kalender?monat=${verschiebeMonat(jahr, monat, 1)}`}
            prefetch
            className="flex h-11 flex-1 items-center justify-center rounded-blk border border-line px-2.5 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal sm:h-9 sm:flex-none"
          >
            <ChevronRight className="size-5 sm:size-4" aria-hidden="true" />
            <span className="sr-only">{t.kalender.naechsterMonat}</span>
          </Link>
        </nav>
      </div>

      {fehler ? (
        <div className="mt-6">
          <FormMeldung art="fehler">{fehler}</FormMeldung>
        </div>
      ) : null}

      <div className="mt-6">
        <MonatsRaster
          raster={raster}
          proTag={proTag}
          fortsetzungen={sammleFortsetzungen(proTag)}
          locale={sprache}
        />
      </div>

      {anzahl === 0 && !fehler ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          {chef ? t.kalender.leerChef : t.kalender.leerMitarbeiter}
        </p>
      ) : null}

      <Legende chef={chef} t={t.kalender} />
    </Container>
  );
}

/**
 * Ohne Legende sind die Markierungen nicht lesbar — signalfarben,
 * gestrichelt und rot erklären sich nicht von selbst.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Umbau 2026-09-21 — die eigene Schicht zuerst, keine Rollenfarben mehr
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Kalender beantwortet jetzt zuerst „wann arbeite **ich**?". Die
 * Legende führt deshalb die eigene Schicht an erster Stelle. Die
 * Rollenfarben stehen nicht mehr in der Legende, weil sie nicht mehr im
 * Raster vorkommen: die Rolle ist einen Klick entfernt, auf der
 * Schichtseite. Ein Farbschlüssel für etwas, das die Ansicht nicht mehr
 * zeigt, ist schlechter als keiner.
 *
 * „unterbesetzt" ist eine Chef-Auskunft (`kalender_schichten` rechnet sie
 * für alle anderen gar nicht erst aus) und steht deshalb nur für Chefs.
 */
function Legende({
  chef,
  t,
}: {
  chef: boolean;
  t: ReturnType<typeof getDictionary>["kalender"];
}) {
  const eintraege = [
    {
      art: "h-3 w-4 rounded-blk bg-signal-weak ring-1 ring-inset ring-signal/50",
      text: t.meineSchicht,
    },
    { art: "size-2 rounded-full bg-signal", text: t.legendeOffen },
    ...(chef
      ? [{ art: "size-2 rounded-full bg-stop", text: t.legendeUnterbesetzt }]
      : []),
    {
      art: "h-3 w-4 rounded-blk border border-dashed border-line-strong bg-transparent",
      text: t.legendeNacht,
    },
  ];

  return (
    <section aria-labelledby="legende-titel" className="mt-8">
      <h2
        id="legende-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        {t.legende}
      </h2>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {eintraege.map((eintrag) => (
          <li key={eintrag.text} className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden="true" className={`shrink-0 ${eintrag.art}`} />
            {eintrag.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
