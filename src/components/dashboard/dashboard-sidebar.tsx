"use client";

import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Megaphone,
  Repeat,
  Settings,
  SlidersHorizontal,
  TreePalm,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";

/**
 * Schlüssel statt Komponente.
 *
 * Die Bereichsliste entsteht im Layout, einer Server Component. Über die
 * RSC-Grenze lässt sich keine Funktion reichen — ein Lucide-Icon ist
 * aber genau das. Deshalb geht ein Name hinüber und wird hier
 * nachgeschlagen. Die Tabelle ist bewusst geschlossen: ein unbekannter
 * Schlüssel fällt beim Übersetzen auf, nicht erst im Browser.
 */
const ICONS = {
  uebersicht: LayoutDashboard,
  kalender: CalendarDays,
  planung: SlidersHorizontal,
  team: Users,
  mitteilungen: Megaphone,
  tausch: Repeat,
  urlaub: TreePalm,
  verfuegbarkeit: CalendarClock,
  notfall: TriangleAlert,
  einstellungen: Settings,
} as const;

export type IconName = keyof typeof ICONS;

export type Bereich = {
  href: string;
  label: string;
  icon: IconName;
  /** Noch nicht gebaut — wird gezeigt, führt aber nirgendwohin. */
  folgt?: boolean;
};

export type Gruppe = {
  /** `null` für die erste, unbeschriftete Gruppe über den Trennlinien. */
  titel: string | null;
  bereiche: Bereich[];
};

/**
 * Bereichsnavigation des Dashboards — links, nicht oben.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein DOM, zwei Richtungen. Bewusst kein zweiter Zweig.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ab `lg` steht die Navigation als Spalte links und bleibt beim Scrollen
 * stehen; darunter liegt sie als waagrecht scrollende Leiste. Umgeschaltet
 * wird ausschliesslich per CSS — `flex-col` gegen `flex-row`, Gruppentitel
 * und die beiden Karten `hidden lg:block`.
 *
 * Der naheliegende Weg wäre gewesen, beide Fassungen zu rendern und die
 * jeweils falsche auszublenden. Hier ist es dieselbe Liste in einer
 * anderen Richtung, und zwei Fassungen hiessen: jeder Link zweimal im
 * HTML, jeder `aria-current` zweimal, und eine Tastaturbedienung, die
 * unsichtbare Ziele durchläuft.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Umbau vom 2026-09-09 nach `docs/quickteam-dashboard-v2.html`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Logo, Betriebskarte und Personenkarte sind aus der Kopfzeile in die
 * Sidebar gewandert. Der Grund ist nicht Geschmack, sondern
 * Zuordnung: alle drei beantworten „wo bin ich und als wer" — dieselbe
 * Frage, die die Navigation darunter beantwortet. In der Kopfzeile
 * standen sie neben Inhalten, die mit ihnen nichts zu tun haben.
 *
 * **Die Farben kommen unverändert aus Ebene 2.** Der Mockup bringt eigene
 * Hex-Werte mit (`--accent:#c0a270` gegen `--qt-c-bronze:#a8874f`, eigene
 * Radien); übernommen ist die *Anordnung*, nicht die Palette. `CLAUDE.md`
 * lässt Farbwerte nur über `docs/Farbpalette.html` entstehen, und die
 * beiden dunkelsten Grundtöne waren ohnehin schon identisch.
 */
export function DashboardSidebar({
  gruppen,
  beschriftung,
  folgtLabel,
  folgtHinweis,
  betriebName,
  personName,
  rolleText,
  wechselHref,
}: {
  gruppen: readonly Gruppe[];
  beschriftung: string;
  folgtLabel: string;
  folgtHinweis: string;
  betriebName: string;
  personName: string;
  rolleText: string;
  /** `null`, wenn es nur eine Anstellung gibt — dann ist die Karte kein Link. */
  wechselHref: string | null;
}) {
  const pathname = usePathname();

  return (
    /*
      Ab `lg` ist der `<nav>` selbst die klebende, seitenhohe Spalte —
      `sticky top-0`, `h-dvh`, `self-start`. Damit bleibt die
      Personenkarte am Fuss (der Weg zum Positionswechsel) auf jeder
      Seite sichtbar, statt an das untere Ende eines mitwachsenden
      `<nav>` zu rutschen und auf langen Seiten unter den Faltrand zu
      geraten.

      Die explizite `h-dvh` ist der Grund, warum `self-start` hier
      erlaubt ist: ohne feste Höhe schrumpfte ein `self-start`-Element
      auf die Höhe seiner Einträge, und die Trennlinie rechts
      (`border-r`) endete mitten auf der Seite — genau die Falle, wegen
      der früher nur die innere Liste klebte. Mit voller Fensterhöhe
      läuft die Linie durch und klebt mit. Läuft der Inhalt einmal höher
      als das Fenster (kleiner Laptop, viele Bereiche), scrollt der
      `<nav>` in sich selbst (`overflow-y-auto`), statt die Karte
      wegzudrücken.
    */
    <nav
      aria-label={beschriftung}
      className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      {/*
        Logo und Betriebskarte gibt es nur in der Spaltenfassung. Auf
        schmalen Geräten trägt die Kopfzeile beides — dort ist die
        Navigation eine scrollende Leiste, und ein Kopf darüber würde die
        halbe Höhe kosten, die der Inhalt braucht.
      */}
      <div className="hidden lg:block lg:px-5 lg:pb-1 lg:pt-5">
        <Link href="/dashboard" className="inline-flex rounded-blk text-text">
          <Logo />
          <span className="sr-only">Übersicht</span>
        </Link>

        <div className="mt-5 flex items-center gap-3 rounded-card bg-surface-sunk px-3 py-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-blk bg-signal-weak font-display text-sm font-bold text-text"
          >
            {ersterBuchstabe(betriebName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text">
              {betriebName}
            </span>
          </span>
        </div>
      </div>

      {/*
        Die mittlere Liste wächst (`lg:grow`) und schiebt die
        Personenkarte an den Fuss. Das Kleben übernimmt der `<nav>`
        selbst (Begründung dort) — vorher klebte diese Liste allein, was
        die Bereichslinks beim Scrollen stehen liess, die Karte am Fuss
        aber ungeschützt am Ende des seitenhohen `<nav>` zurückliess.
      */}
      <div className="flex items-stretch gap-1 overflow-x-auto px-5 sm:px-8 lg:grow lg:flex-col lg:gap-0 lg:overflow-visible lg:px-3 lg:py-4">
        {gruppen.map((gruppe, i) => (
          <div
            key={gruppe.titel ?? "start"}
            className={`flex items-stretch lg:flex-col ${i > 0 ? "lg:mt-6" : ""}`}
          >
            {gruppe.titel ? (
              <p className="hidden px-3 pb-2 font-display text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted lg:block">
                {gruppe.titel}
              </p>
            ) : null}

            <ul className="flex items-stretch gap-1 lg:flex-col lg:gap-0.5">
              {gruppe.bereiche.map((bereich) => (
                <li key={bereich.href} className="lg:w-full">
                  <Eintrag
                    bereich={bereich}
                    pathname={pathname}
                    folgtLabel={folgtLabel}
                    folgtHinweis={folgtHinweis}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/*
        Die Personenkarte steht am Fuss und ist der Weg zum
        Positionswechsel — aber nur, wenn es etwas zu wechseln gibt. Bei
        einer einzigen Anstellung bleibt sie eine Auskunft ohne Ziel;
        ein Link führte dort auf eine Seite, die eine Auswahl zwischen
        einer Möglichkeit anböte.
      */}
      <div className="hidden lg:block lg:border-t lg:border-line lg:p-3">
        <PersonenKarte
          personName={personName}
          rolleText={rolleText}
          wechselHref={wechselHref}
        />
      </div>
    </nav>
  );
}

/** Erster Buchstabe für das Kürzel — Emoji-sicher über den Iterator. */
function ersterBuchstabe(text: string): string {
  return [...text.trim()][0]?.toUpperCase() ?? "?";
}

/*
 * Die Initialen stehen in `text-text`, nicht in `text-signal`.
 *
 * Am 2026-09-09 mit Lighthouse gemessen: Bronze auf `signal-weak` ergibt
 * 3.94:1 und reisst damit die 4.5:1 für 12-px-Text — der einzige
 * Fehlschlag der ganzen Seite. Die Akzentfarbe trägt hier ohnehin schon
 * die Fläche; die Buchstaben mussten sie nicht ein zweites Mal tragen.
 * Dieselbe Kombination steckte in der Betriebskarte darüber und ist dort
 * mitgeändert.
 */
function PersonenKarte({
  personName,
  rolleText,
  wechselHref,
}: {
  personName: string;
  rolleText: string;
  wechselHref: string | null;
}) {
  const inhalt = (
    <>
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-signal-weak font-display text-xs font-semibold text-text"
      >
        {kuerzel(personName)}
      </span>
      <span className="min-w-0 grow text-left">
        <span className="block truncate text-sm font-semibold text-text">
          {personName || rolleText}
        </span>
        <span className="block truncate text-xs text-muted">{rolleText}</span>
      </span>
      {wechselHref ? (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
      ) : null}
    </>
  );

  if (wechselHref === null) {
    return <div className="flex items-center gap-3 rounded-card px-2 py-2">{inhalt}</div>;
  }

  return (
    <Link
      href={wechselHref}
      className="flex items-center gap-3 rounded-card px-2 py-2 transition-colors hover:bg-surface-sunk"
    >
      {inhalt}
    </Link>
  );
}

/** Initialen aus bis zu zwei Namensteilen. */
function kuerzel(name: string): string {
  const teile = name.trim().split(/\s+/u).filter(Boolean);
  if (teile.length === 0) return "?";
  const erste = [...(teile[0] ?? "")][0] ?? "";
  const zweite = teile.length > 1 ? ([...(teile[teile.length - 1] ?? "")][0] ?? "") : "";
  return (erste + zweite).toUpperCase();
}

/*
 * Gemeinsame Geometrie für beide Zustände. Getrennt gehalten, damit ein
 * toter Eintrag exakt so hoch und breit ist wie ein lebender — sonst
 * verschiebt sich die Leiste, sobald ein Bereich fertig wird.
 */
const RUMPF =
  "flex items-center gap-3 whitespace-nowrap rounded-blk px-3 py-2.5 text-sm font-medium lg:w-full";

function Eintrag({
  bereich,
  pathname,
  folgtLabel,
  folgtHinweis,
}: {
  bereich: Bereich;
  pathname: string;
  folgtLabel: string;
  folgtHinweis: string;
}) {
  const Icon: LucideIcon = ICONS[bereich.icon];

  if (bereich.folgt) {
    return (
      <span title={folgtHinweis} className={`${RUMPF} cursor-default text-muted/60`}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {bereich.label}
        <span className="rounded-full border border-dashed border-line-strong px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider">
          {folgtLabel}
        </span>
        <span className="sr-only">— {folgtHinweis}</span>
      </span>
    );
  }

  /*
   * `/dashboard` muss exakt treffen, sonst wäre die Übersicht auf jeder
   * Unterseite mit markiert — jede Dashboard-Adresse beginnt damit.
   */
  const aktiv =
    bereich.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(bereich.href);

  return (
    <Link
      href={bereich.href}
      aria-current={aktiv ? "page" : undefined}
      className={`${RUMPF} relative transition-colors ${
        aktiv
          ? "bg-signal-weak text-text"
          : "text-muted hover:bg-surface-sunk hover:text-text"
      }`}
    >
      {/*
        Die Markierung liegt auf der Fläche; in der Spaltenfassung kommt
        ab `lg` eine Kante links dazu, wie im Mockup. In der waagrechten
        Leiste bliebe dieselbe Kante quer stehen — deshalb hängt sie an
        `lg:` und nicht am aktiven Zustand allein.
      */}
      {aktiv ? (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 hidden h-4 w-[3px] -translate-y-1/2 rounded-full bg-signal lg:block"
        />
      ) : null}
      <Icon
        className={`size-4 shrink-0 ${aktiv ? "text-signal" : ""}`}
        aria-hidden="true"
      />
      {bereich.label}
    </Link>
  );
}
