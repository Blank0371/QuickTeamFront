import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { rollenReihenfolge, sammleFortsetzungen } from "@/lib/dashboard/kalender";
import { MonatsRaster } from "@/components/dashboard/monats-raster";
import { MonatsSpringer } from "@/components/dashboard/monats-springer";
import { FormMeldung } from "@/components/formular/felder";
import {
  MONATSNAMEN,
  baueRaster,
  holeSchichten,
  leseMonat,
  verschiebeMonat,
} from "@/lib/dashboard/kalender";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

export const metadata: Metadata = {
  title: "Kalender",
  description: "Wer wann arbeitet — der Dienstplan deines Betriebs, Monat für Monat.",
  robots: { index: false, follow: false },
};

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
  const { monat: monatParam } = await searchParams;

  const heute = new Date();
  const { jahr, monat } = leseMonat(monatParam, heute);
  const raster = baueRaster(jahr, monat, heute);

  const { proTag, fehler } = await holeSchichten(
    supabase,
    position.betriebId,
    position.mitarbeiterId,
    raster.von,
    raster.bis,
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
            {MONATSNAMEN[monat - 1]} {jahr}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {anzahl === 0
              ? "Keine Schichten in diesem Monat."
              : `${anzahl} ${anzahl === 1 ? "Schicht" : "Schichten"}`}
            {chef ? "" : " · nur was du sehen darfst"}
          </p>
        </div>

        <nav aria-label="Monat wechseln" className="flex flex-wrap items-center gap-1.5">
          {/*
            `prefetch` auf beiden Pfeilen: der Nachbarmonat liegt dann
            schon bereit, wenn jemand klickt. Das ist der billigste
            Zugewinn an gefühlter Geschwindigkeit, den es hier gibt —
            keine Zeile Zustandslogik, nur eine Angabe am Link.
          */}
          <Link
            href={`/dashboard/kalender?monat=${verschiebeMonat(jahr, monat, -1)}`}
            prefetch
            className="flex h-9 items-center rounded-blk border border-line px-2.5 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="sr-only">Vorheriger Monat</span>
          </Link>

          {laufenderMonat ? null : (
            <Link
              href="/dashboard/kalender"
              prefetch
              className="flex h-9 items-center rounded-blk border border-line px-3 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
            >
              Heute
            </Link>
          )}

          <Link
            href={`/dashboard/kalender?monat=${verschiebeMonat(jahr, monat, 1)}`}
            prefetch
            className="flex h-9 items-center rounded-blk border border-line px-2.5 text-sm font-medium text-text transition-colors hover:border-signal hover:bg-signal-weak hover:text-signal"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="sr-only">Nächster Monat</span>
          </Link>

          {/*
            Für den Sprung, nicht für den Schritt: „Dezember planen" im
            August sind sonst vier Klicks auf den Pfeil.
          */}
          <MonatsSpringer jahr={jahr} monat={monat} ziel="/dashboard/kalender" />
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
          rollenReihenfolge={rollenReihenfolge(proTag)}
        />
      </div>

      {anzahl === 0 && !fehler ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          {chef
            ? "Für diesen Monat sind noch keine Schichten erzeugt. Das geschieht später über die Planung — Schichtvorlagen allein erzeugen keine Schichten."
            : "Für diesen Monat bist du zu keiner Schicht eingeteilt. Sobald der Dienstplan veröffentlicht ist, steht er hier."}
        </p>
      ) : null}

      <Legende chef={chef} />
    </Container>
  );
}

/**
 * Ohne Legende sind die Zustände nicht lesbar — gestrichelt, gedämpft
 * und rot erklären sich nicht von selbst, und in der App steht statt
 * dessen ein Farbschlüssel im Kopf der Ansicht.
 *
 * Zwei Reihen, weil zwei verschiedene Dinge erklärt werden: die
 * **Kacheln** sagen etwas über eine Schicht, die **Punkte** neben der
 * Tageszahl etwas über den ganzen Tag. In einer gemeinsamen Reihe
 * stünden sie gleichrangig nebeneinander und wären genau deshalb
 * verwirrend.
 *
 * `Entwurf` und `frei zu übernehmen` standen bis zum 2026-09-06 in
 * **einer** Zeile, deren Text je nach Rolle wechselte — mit dem Muster
 * des Entwurfs als Beispiel für beides. Für eine angestellte Person war
 * damit das falsche Kästchen abgebildet: Bronze gestrichelt heisst
 * „übernehmbar", grau gestrichelt heisst „Entwurf", und Entwürfe
 * bekommt sie ohnehin nie zu sehen (`kalender_schichten` filtert
 * `status = 'geplant'` für Nicht-Chefs weg). Jetzt sind es zwei
 * Einträge, und der Entwurf steht nur da, wo es ihn gibt.
 */
function Legende({ chef }: { chef: boolean }) {
  /*
   * Seit dem 2026-09-09 erklärt diese Reihe die **Indikatorpunkte** der
   * Zelle, nicht mehr die Schicht-Kacheln. Der Grund ist schlicht, dass
   * in der Zelle keine Kacheln mehr stehen: sie sind ins Popover am
   * Tagesknopf gewandert, und dort erklären sie sich im Zusammenhang.
   * Eine Legende, die Kästchen zeigt, die im Raster nicht vorkommen,
   * ist schlechter als keine.
   *
   * Die Rollenfarben selbst stehen bewusst **nicht** als Liste hier:
   * sie werden zyklisch vergeben und wechseln mit dem Rollenbestand des
   * Zeitraums. Ein fester Schlüssel „Bronze = Küche" wäre im nächsten
   * Monat falsch. Der Rollenname hängt stattdessen an jedem Punkt —
   * als `title` und als Vorlesetext.
   */
  const formen = [
    { art: "bg-rolle-1", text: "Farbbalken links = Rolle der eingeteilten Person" },
    {
      art: "border border-dashed border-line-strong bg-transparent",
      text: "gestrichelt = Nachtschicht vom Vortag, läuft hier weiter",
    },
    { art: "bg-stop", text: "Mindestbesetzung nicht erreicht" },
  ];

  const punkte = [
    ...(chef ? [{ art: "bg-stop", text: "Mindestbesetzung nicht erreicht" }] : []),
    { art: "bg-signal", text: "an diesem Tag ist etwas frei" },
    { art: "bg-signal/40", text: "du bist an diesem Tag eingeteilt" },
  ];

  return (
    <section aria-labelledby="legende-titel" className="mt-8">
      <h2
        id="legende-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        Legende
      </h2>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {formen.map((eintrag) => (
          <li key={eintrag.text} className="flex items-center gap-2 text-xs text-muted">
            <span
              aria-hidden="true"
              className={`h-3 w-1.5 shrink-0 rounded-full ${eintrag.art}`}
            />
            {eintrag.text}
          </li>
        ))}
      </ul>

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {punkte.map((eintrag) => (
          <li key={eintrag.text} className="flex items-center gap-2 text-xs text-muted">
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${eintrag.art}`}
            />
            {eintrag.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
