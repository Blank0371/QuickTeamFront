"use client";

import { LayoutGrid, UserCog, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { ICONS, type Bereich, type Gruppe } from "./dashboard-sidebar";

/**
 * Untere Tab-Leiste — die Dashboard-Navigation auf dem Handy.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Fünf Kacheln, feste Reihenfolge
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-20 wurde die Sidebar unterhalb von `lg` zu einer
 * waagrecht scrollenden Leiste — dieselbe Desktop-Navigation, nur schmal.
 * Diese Leiste steht stattdessen fest am unteren Rand (`fixed bottom-0`,
 * nur `lg:hidden`).
 *
 * Reihenfolge (2026-09-21, auf Wunsch des Nutzers):
 *
 *   Mitteilungen · Planung/Manager · Übersicht · Kalender · Konto
 *
 * Drei davon sind **direkte Links** (Mitteilungen, Übersicht, Kalender) —
 * das tägliche Geradeaus. Die zweite und die fünfte Kachel öffnen je ein
 * von unten einfahrendes Blatt:
 *
 *   · Die mittlere Kachel trägt die Bereiche, die keine eigene Kachel
 *     haben. Sie heisst für Chefs **„Manager"** (Team, Planung,
 *     Betriebseinstellungen …), für Angestellte **„Planung"** (Urlaub,
 *     Verfügbarkeit, Tausch, Notfall). Welche Bereiche das sind, entscheidet
 *     die Rollenlogik im Layout — hier fällt schlicht alles hinein, was
 *     nicht als direkte Kachel oben steht (`DIREKT`).
 *   · Die „Konto"-Kachel rechts sammelt, was früher oben rechts in der
 *     Topbar stand (Sprache, Abmelden) und dazu Darstellung (hell/dunkel),
 *     Verbindungen (Positionswechsel) und Kontolöschung. Ihr Inhalt kommt
 *     als `kontoSlot` fertig gerendert aus dem Layout (Server Components,
 *     die eine Client-Insel nicht selbst bauen kann — Server Actions für
 *     Sprache/Darstellung/Abmelden, echte Links für den Rest).
 */
const DIREKT = {
  mitteilungen: "/dashboard/mitteilungen",
  uebersicht: "/dashboard",
  kalender: "/dashboard/kalender",
} as const;

const DIREKT_HREFS = Object.values(DIREKT) as readonly string[];

export function DashboardTableiste({
  gruppen,
  beschriftung,
  navLabel,
  navTitel,
  kontoLabel,
  kontoTitel,
  schliessenLabel,
  kontoSlot,
}: {
  gruppen: readonly Gruppe[];
  beschriftung: string;
  navLabel: string;
  navTitel: string;
  kontoLabel: string;
  kontoTitel: string;
  schliessenLabel: string;
  kontoSlot: ReactNode;
}) {
  const pathname = usePathname();
  const [offen, setOffen] = useState<null | "nav" | "konto">(null);

  const alle = gruppen.flatMap((gruppe) => gruppe.bereiche);
  const finde = (href: string) => alle.find((b) => b.href === href);

  const mitteilungen = finde(DIREKT.mitteilungen);
  const uebersicht = finde(DIREKT.uebersicht);
  const kalender = finde(DIREKT.kalender);

  /* Alles, was keine eigene Kachel hat, liegt im Planung/Manager-Blatt. */
  const ueberlauf = alle.filter((b) => !DIREKT_HREFS.includes(b.href));

  /*
   * Die Nav-Kachel gilt als aktiv, wenn die aktuelle Seite im Überlauf
   * liegt — sonst stünde man auf `/dashboard/team` ohne Markierung.
   */
  const navAktiv = ueberlauf.some((b) => !b.folgt && istAktiv(b.href, pathname));

  const schliessen = useCallback(() => setOffen(null), []);

  /* Beim Seitenwechsel schliesst das offene Blatt sich selbst. */
  useEffect(() => {
    setOffen(null);
  }, [pathname]);

  return (
    <>
      {offen === "nav" ? (
        <Blatt titel={navTitel} schliessenLabel={schliessenLabel} onSchliessen={schliessen}>
          <ul className="p-3">
            {ueberlauf.map((bereich) => (
              <li key={bereich.href}>
                <BlattEintrag bereich={bereich} pathname={pathname} />
              </li>
            ))}
          </ul>
        </Blatt>
      ) : null}

      {offen === "konto" ? (
        <Blatt titel={kontoTitel} schliessenLabel={schliessenLabel} onSchliessen={schliessen}>
          <div className="p-4">{kontoSlot}</div>
        </Blatt>
      ) : null}

      {/*
        `pb-[env(safe-area-inset-bottom)]` hält die Ziele über der
        Home-Anzeige neuerer Telefone. Die Höhe (~3.5rem + Inset) spiegelt
        das Inhalts-Padding im Layout wider. Fünf Kacheln, feste Reihenfolge.
      */}
      <nav
        data-qt-schale=""
        aria-label={beschriftung}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-flow-col border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mitteilungen ? <TabLink bereich={mitteilungen} pathname={pathname} /> : null}

        <BlattKachel
          label={navLabel}
          icon={LayoutGrid}
          aktiv={navAktiv}
          offen={offen === "nav"}
          onOeffnen={() => setOffen("nav")}
        />

        {uebersicht ? <TabLink bereich={uebersicht} pathname={pathname} /> : null}
        {kalender ? <TabLink bereich={kalender} pathname={pathname} /> : null}

        <BlattKachel
          label={kontoLabel}
          icon={UserCog}
          aktiv={false}
          offen={offen === "konto"}
          onOeffnen={() => setOffen("konto")}
        />
      </nav>
    </>
  );
}

/** Eine direkte Kachel der festen Leiste. */
function TabLink({ bereich, pathname }: { bereich: Bereich; pathname: string }) {
  const Icon: LucideIcon = ICONS[bereich.icon];
  const aktiv = !bereich.folgt && istAktiv(bereich.href, pathname);

  return (
    <Link
      href={bereich.href}
      aria-current={aktiv ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] font-medium transition-colors ${
        aktiv ? "text-signal" : "text-muted hover:text-text"
      }`}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {bereich.label}
    </Link>
  );
}

/** Eine Kachel, die ein Blatt öffnet (Planung/Manager oder Konto). */
function BlattKachel({
  label,
  icon: Icon,
  aktiv,
  offen,
  onOeffnen,
}: {
  label: string;
  icon: LucideIcon;
  aktiv: boolean;
  offen: boolean;
  onOeffnen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOeffnen}
      aria-haspopup="dialog"
      aria-expanded={offen}
      className={`flex flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] font-medium transition-colors ${
        aktiv || offen ? "text-signal" : "text-muted hover:text-text"
      }`}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * Ein von unten einfahrendes Blatt.
 *
 * Bewusst schlicht: kein Fokus-Käfig-Framework, aber `role="dialog"`,
 * `aria-modal`, Schliessen über Escape, Überlagerung und (im Nav-Fall)
 * jeden Link; der Schliessen-Knopf bekommt beim Öffnen den Fokus. Die
 * Einfahrbewegung hängt an `motion-safe:` — `prefers-reduced-motion`
 * bekommt das Blatt ohne Animation (harte Vorgabe der Seite).
 */
function Blatt({
  titel,
  schliessenLabel,
  onSchliessen,
  children,
}: {
  titel: string;
  schliessenLabel: string;
  onSchliessen: () => void;
  children: ReactNode;
}) {
  const titelId = useId();
  const schliessenRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    schliessenRef.current?.focus();
  }, []);

  /* Hintergrund nicht mitscrollen lassen, solange das Blatt offen ist. */
  useEffect(() => {
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = vorher;
    };
  }, []);

  useEffect(() => {
    function beiTaste(e: KeyboardEvent) {
      if (e.key === "Escape") onSchliessen();
    }
    document.addEventListener("keydown", beiTaste);
    return () => document.removeEventListener("keydown", beiTaste);
  }, [onSchliessen]);

  return (
    <div data-qt-schale="" className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={schliessenLabel}
        onClick={onSchliessen}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-card border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] motion-safe:animate-[blatt-hoch_0.2s_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id={titelId} className="text-sm font-semibold text-text">
            {titel}
          </h2>
          <button
            ref={schliessenRef}
            type="button"
            onClick={onSchliessen}
            className="-mr-2 rounded-blk p-2 text-muted transition-colors hover:bg-surface-sunk hover:text-text"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">{schliessenLabel}</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function BlattEintrag({ bereich, pathname }: { bereich: Bereich; pathname: string }) {
  const Icon: LucideIcon = ICONS[bereich.icon];

  if (bereich.folgt) {
    return (
      <span className="flex items-center gap-3 rounded-blk px-3 py-3 text-sm font-medium text-muted/60">
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {bereich.label}
      </span>
    );
  }

  const aktiv = istAktiv(bereich.href, pathname);

  return (
    <Link
      href={bereich.href}
      aria-current={aktiv ? "page" : undefined}
      className={`flex items-center gap-3 rounded-blk px-3 py-3 text-sm font-medium transition-colors ${
        aktiv ? "bg-signal-weak text-text" : "text-muted hover:bg-surface-sunk hover:text-text"
      }`}
    >
      <Icon
        className={`size-5 shrink-0 ${aktiv ? "text-signal" : ""}`}
        aria-hidden="true"
      />
      {bereich.label}
    </Link>
  );
}

/*
 * `/dashboard` muss exakt treffen, sonst gälte die Übersicht auf jeder
 * Unterseite als aktiv — dieselbe Regel wie in der Sidebar.
 */
function istAktiv(href: string, pathname: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}
