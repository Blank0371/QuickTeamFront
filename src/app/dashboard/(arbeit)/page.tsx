import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { PlanungEinstieg } from "@/components/dashboard/planung-einstieg";
import { RollenFilter } from "@/components/dashboard/rollen-filter";
import { LeereTage, TagesPlan } from "@/components/dashboard/tages-plan";
import { FormMeldung } from "@/components/formular/felder";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { holeSchichten } from "@/lib/dashboard/kalender";
import { holeOffeneStellen, holeZyklen } from "@/lib/dashboard/planung";
import {
  TAGE_IM_BLICK,
  baueFenster,
  baueTage,
  fasseBesetzung,
  filtereNachRolle,
  holeBedarf,
  leseRolle,
  sammleRollen,
  zaehleImDienst,
  type Besetzungsstand,
} from "@/lib/dashboard/uebersicht";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { holeRollen } from "@/lib/team";
import { holeChefUrlaubsantraege } from "@/lib/dashboard/urlaub";
import { holeTeam } from "@/lib/dashboard/team";
import { StatistikLeiste, type Kennzahl } from "@/components/dashboard/statistik-leiste";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await leseSprache());
  return {
    title: t.uebersicht.metaTitel,
    description: t.uebersicht.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Übersicht — der Einstieg ins Dashboard.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Umbau vom 2026-08-29: konkrete Tage statt eines ganzen Monats.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher stand hier der volle Monatskalender. Der zeigt je Tag eine
 * Zelle mit Uhrzeit und Bezeichnung; **wer arbeitet, war erst nach einem
 * Klick zu sehen.** Für die Frage, die morgens gestellt wird — „wer hat
 * heute Spätdienst" —, ist das der falsche Zuschnitt: 42 Zellen, in
 * denen die eigentliche Auskunft fehlt.
 *
 * Jetzt stehen drei Tage da, mit Uhrzeiten und Namen. Der Monat ist
 * nicht fort, sondern liegt unter `/dashboard/kalender` — er hat nur
 * seinen Platz als Startseite verloren. Der Nebeneffekt ist messbar: das
 * Monatsraster bringt für sein aufklappbares Tagesdetail ein
 * Radix-Popover mit, und das fällt damit aus dem Bündel dieser Route.
 *
 * Ebenfalls neu und der eigentliche Anlass: **der Weg zur
 * Schichtplanung steht sichtbar hier**, nicht nur hinter einem
 * Navigationseintrag.
 *
 * Was von der alten Fassung ersatzlos entfallen ist: die Karten „was es
 * hier gibt" und die Liste „kommt noch". Beide beschrieben die
 * Navigation, und die Navigation steht jetzt als Sidebar dauerhaft
 * daneben — eine Seite, die aufzählt, was zwei Zentimeter links davon
 * schon steht, ist ein Inhaltsverzeichnis vor dem Inhalt.
 */
export default async function DashboardUebersicht({
  searchParams,
}: {
  searchParams: Promise<{ rolle?: string }>;
}) {
  const { supabase, position } = await betreteDashboard();
  const { rolle: rolleParam } = await searchParams;
  const chef = istChef(position);
  const sprache = await leseSprache();
  const t = getDictionary(sprache);
  const tx = t.uebersicht;

  const heute = new Date();
  const fenster = baueFenster(heute);

  /*
   * Der Planungsstand wird nur für Chefs geholt. Für Angestellte gäbe
   * `planungszyklen` ohnehin nichts her, und der Bereich existiert für
   * sie nicht — zwei Abfragen für eine Ansicht, die es nicht gibt,
   * wären reine Kosten.
   */
  const [schichtenErgebnis, zyklen, offeneStellen, bedarf, rollen, urlaubsantraege, team] =
    await Promise.all([
    holeSchichten(
      supabase,
      position.betriebId,
      position.mitarbeiterId,
      fenster.von,
      fenster.bis,
      t.kalender.ladeFehler,
    ),
    chef ? holeZyklen(supabase, position.betriebId) : Promise.resolve([]),
    chef
      ? holeOffeneStellen(supabase, position.betriebId)
      : Promise.resolve(new Map<string, number>()),
    /*
     * Mindestbesetzung und Rollennamen nur für Chefs. Beide RPCs halten
     * die Unterbesetzung für eine Chefsache — `understaffed` ist für
     * alle anderen immer `false`, `bedarf` immer `null` —, und zwei
     * Oberflächen desselben Produkts sollen sich darin nicht
     * widersprechen. Lesen dürfte es zwar jedes Mitglied (die
     * SELECT-Policy hängt an `meine_betriebe()`), aber „dürfen" ist
     * nicht „sollen".
     */
    chef
      ? holeBedarf(supabase, position.betriebId, fenster.von, fenster.bis)
      : Promise.resolve(new Map() as Awaited<ReturnType<typeof holeBedarf>>),
    chef ? holeRollen(supabase, position.betriebId) : Promise.resolve([]),
    chef ? holeChefUrlaubsantraege(supabase, position.betriebId) : Promise.resolve([]),
    chef ? holeTeam(supabase, position.betriebId) : Promise.resolve([]),
  ]);

  const { proTag, fehler } = schichtenErgebnis;
  const alleSchichten = [...proTag.values()].flat();

  /*
   * Die Rollenliste entsteht aus den Schichten des Fensters, nicht aus
   * `rollen`: ein Filter, der Rollen anbietet, die in diesen drei Tagen
   * niemand hat, führt auf leere Ansichten.
   *
   * Für eine angestellte Person ohne
   * `mitarbeiter_sehen_andere_mitarbeiter` enthält `participants` nur
   * sie selbst — die Leiste hätte dann genau einen Knopf neben „Alle"
   * und wäre keine Auswahl. Sie erscheint deshalb erst ab zwei Rollen.
   */
  const eimer = sammleRollen(alleSchichten);
  const rolle = leseRolle(rolleParam, eimer);
  const imDienst = zaehleImDienst(alleSchichten);

  const gefiltert = new Map(
    [...proTag.entries()].map(([datum, liste]) => [
      datum,
      filtereNachRolle(liste, rolle),
    ]),
  );
  const tage = baueTage(fenster.tage, gefiltert, sprache, tx.heute, tx.morgen);

  const rollenName = rolle === null ? null : (eimer.find((e) => e.wert === rolle)?.name ?? null);

  /*
   * Der Besetzungsstreifen rechnet über die **ungefilterten** Schichten
   * des Tages. Sonst zeigte er unter dem Filter „Küche" für jede andere
   * Rolle eine Null und behauptete eine Unterbesetzung, die es nicht
   * gibt — der Filter blendet aus, er entlässt niemanden.
   *
   * Angezeigt wird dann nur die gewählte Rolle: eine Zeile mit fünf
   * Rollen über einer Liste, die nur eine zeigt, wäre eine zweite,
   * widersprechende Auskunft.
   */
  const rollenNamen = new Map(rollen.map((r) => [r.id, r.name]));
  const besetzungProTag = new Map<string, Besetzungsstand[]>(
    fenster.tage.map((datum) => {
      const alle = fasseBesetzung(proTag.get(datum) ?? [], bedarf, rollenNamen);
      return [datum, rollenName ? alle.filter((b) => b.name === rollenName) : alle];
    }),
  );

  /*
   * Die Kennzahlen der Leiste. Jede stammt aus Daten, die oben ohnehin
   * geladen wurden — die Begründung, warum die vierte Kachel das
   * Drei-Tage-Fenster misst und nicht die Woche, steht an
   * `StatistikLeiste`.
   *
   * Für Angestellte bleibt die Leiste leer: „offene Positionen" und
   * „Urlaubsanträge" sind Chef-Zahlen (`abonnement`-artige
   * Sichtbarkeit über RLS), und eine Leiste aus zwei Kacheln, von denen
   * eine die eigene Schichtzahl wiederholt, sagt nichts.
   */
  const heutigeSchichten = proTag.get(fenster.tage[0] ?? "") ?? [];
  const planbar = team.filter(
    (m) => m.rolleTyp === "mitarbeiter" && (m.status === "aktiv" || m.status === "eingeladen"),
  ).length;
  const offenGesamt = [...offeneStellen.values()].reduce((summe, n) => summe + n, 0);
  const offeneAntraege = urlaubsantraege.filter((a) => a.status === "requested").length;
  const schichtenImBlick = alleSchichten.length;

  const kennzahlen: Kennzahl[] = chef
    ? [
        {
          schluessel: "im-dienst",
          titel: tx.kzImDienstTitel,
          wert: String(zaehleImDienst(heutigeSchichten)),
          einheit: planbar > 0 ? tx.kzImDienstVon.replace("{n}", String(planbar)) : undefined,
          fuss:
            heutigeSchichten.length === 0
              ? tx.kzImDienstLeer
              : tx.kzImDienstFuss
                  .replace("{n}", String(heutigeSchichten.length))
                  .replace(
                    "{wort}",
                    heutigeSchichten.length === 1 ? tx.schichtEz : tx.schichtMz,
                  ),
          icon: "team",
        },
        {
          schluessel: "offen",
          titel: tx.kzOffenTitel,
          wert: String(offenGesamt),
          fuss: offenGesamt === 0 ? tx.kzOffenLeer : tx.kzOffenFuss,
          icon: "kalender",
        },
        {
          schluessel: "urlaub",
          titel: tx.kzUrlaubTitel,
          wert: String(offeneAntraege),
          fuss: offeneAntraege === 0 ? tx.kzUrlaubLeer : tx.kzUrlaubFuss,
          icon: "urlaub",
        },
        {
          schluessel: "fenster",
          titel: tx.kzFensterTitel.replace("{n}", String(TAGE_IM_BLICK)),
          wert: String(schichtenImBlick),
          einheit: schichtenImBlick === 1 ? tx.schichtEz : tx.schichtMz,
          fuss: tx.kzFensterFuss,
          icon: "zeit",
        },
      ]
    : [];

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight sm:text-3xl">
            {heutigesDatum(heute, sprache)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {position.betriebName}
            {chef ? "" : ` · ${t.kalender.nurSichtbar}`}
          </p>
        </div>

        <Link
          href="/dashboard/kalender"
          prefetch
          className="flex items-center gap-1 text-sm font-medium text-signal underline underline-offset-4 transition-colors hover:text-signal-hover"
        >
          {tx.ganzenMonat}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {fehler ? (
        <div className="mt-6">
          <FormMeldung art="fehler">{fehler}</FormMeldung>
        </div>
      ) : null}

      {kennzahlen.length > 0 ? (
        <div className="mt-6">
          <StatistikLeiste zahlen={kennzahlen} />
        </div>
      ) : null}

      {chef ? (
        <div className="mt-6">
          <PlanungEinstieg
            zyklen={zyklen}
            offeneStellen={Object.fromEntries(offeneStellen)}
            texte={tx}
            titel={t.dashboard.planung}
            locale={sprache}
          />
        </div>
      ) : null}

      <section aria-labelledby="im-dienst" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2
            id="im-dienst"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
          >
            {tx.imDienstTitel.replace("{n}", String(TAGE_IM_BLICK - 1))}
          </h2>
        </div>

        {eimer.length > 1 ? (
          <div className="mt-3">
            <RollenFilter
              eimer={eimer}
              aktiv={rolle}
              gesamt={imDienst}
              basis="/dashboard"
              alleLabel={tx.alle}
              ariaLabel={tx.rollenFilterAria}
            />
          </div>
        ) : null}

        {/*
          Alles leer → eine Karte statt drei mit demselben Satz. Die
          Begründung steht an `LeereTage`; entschieden wird hier, weil
          nur diese Seite den ganzen Zeitraum überblickt.
        */}
        <div className="mt-4 flex flex-col gap-4">
          {tage.every((tag) => tag.schichten.length === 0) ? (
            <LeereTage tage={tage} text={leerText(rollenName, chef, tx)} texte={tx} />
          ) : (
            tage.map((tag) => (
              <TagesPlan
                key={tag.datum}
                tag={tag}
                chef={chef}
                besetzung={besetzungProTag.get(tag.datum) ?? []}
                leerText={leerText(rollenName, chef, tx)}
                texte={tx}
                zustandTexte={t.kalender.zustand}
              />
            ))
          )}
        </div>
      </section>
    </Container>
  );
}

/** „Samstag, 29. August" / „Saturday, August 29" — die Überschrift der Seite. */
function heutigesDatum(heute: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(heute);
}

/**
 * Was in einem leeren Tag steht.
 *
 * Drei verschiedene Sätze für drei verschiedene Sachverhalte, und der
 * Unterschied ist nicht kosmetisch: „keine Schichten" wäre für eine
 * angestellte Person eine Behauptung, die die Oberfläche gar nicht
 * aufstellen kann — `kalender_schichten` blendet ohne
 * `mitarbeiter_sehen_andere_schichten` alles aus, wozu sie nicht
 * eingeteilt ist. Leer heisst dort „nichts für dich", nicht „nichts".
 */
function leerText(
  rollenName: string | null,
  chef: boolean,
  tx: ReturnType<typeof getDictionary>["uebersicht"],
): string {
  if (rollenName) return tx.leerRolle.replace("{rolle}", rollenName);
  return chef ? tx.leerChef : tx.leerMitarbeiter;
}
