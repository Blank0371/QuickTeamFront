import Link from "next/link";

import { SprachWahl } from "@/components/sprach-wahl";
import type { Locale } from "@/i18n";
import { abmelden } from "@/lib/auth-aktionen";

/**
 * Die Leiste über dem Inhalt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Sie sitzt über dem Inhalt, nicht über der ganzen Seite.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-09 lief eine Kopfzeile über die volle Breite und trug
 * Logo, Betriebsnamen, Positionswechsel und Abmelden. Mit dem Umbau nach
 * `docs/quickteam-dashboard-v2.html` sind Logo und Identität in die
 * Sidebar gewandert, weil sie dieselbe Frage beantworten wie die
 * Navigation darunter — „wo bin ich, als wer".
 *
 * Was hier bleibt, gehört zum **Inhalt**, nicht zur Anwendung: wo man
 * gerade ist (der Pfad) und die zwei Handgriffe, die von überall
 * erreichbar sein müssen. Deshalb beginnt die Leiste an der Kante der
 * Inhaltsspalte und nicht am Fensterrand.
 *
 * **Auf schmalen Geräten trägt sie zusätzlich die Identität.** Dort ist
 * die Sidebar eine waagrecht scrollende Leiste ohne Kopf und Fuss, die
 * Betriebs- und Personenkarte sind also ausgeblendet — ohne diesen
 * Zweig stünde nirgends, in welchem Betrieb man arbeitet. Das ist kein
 * doppelter Inhalt, sondern derselbe an genau einer sichtbaren Stelle
 * je Breite.
 *
 * Server Component: hier gibt es keinen Zustand, nur ein Formular und
 * einen Link. `abmelden` ist eine Server Action und wird direkt als
 * `action` übergeben — das funktioniert ohne JavaScript.
 */
export function DashboardTopbar({
  betriebName,
  personName,
  rolleText,
  wechselHref,
  abmeldenLabel,
  wechselnLabel,
  sprache,
}: {
  betriebName: string;
  personName: string;
  rolleText: string;
  wechselHref: string | null;
  abmeldenLabel: string;
  wechselnLabel: string;
  sprache: Locale;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3 sm:px-8">
      {/*
        Nur unterhalb von `lg` sichtbar: dort fehlt der Sidebar-Kopf.
        Ab `lg` bleibt die Stelle leer und schiebt die Handgriffe nach
        rechts — dafür steht das `lg:hidden` am Inhalt und nicht am
        Container, sonst kippte die Ausrichtung mit.
      */}
      <div className="min-w-0 lg:hidden">
        <p className="truncate text-sm font-semibold text-text">{betriebName}</p>
        <p className="truncate text-xs text-muted">
          {rolleText}
          {personName ? ` · ${personName}` : ""}
        </p>
      </div>

      <div className="hidden lg:block" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Oben rechts, auf jeder Dashboard-Seite. */}
        <SprachWahl aktiv={sprache} />
        {/*
          Der Wechsel steht nur da, wenn es etwas zu wechseln gibt — und
          unterhalb von `lg`, weil ab dort die Personenkarte im
          Sidebar-Fuss derselbe Weg ist. Zwei Türen in denselben Raum
          sind eine zu viel.
        */}
        {wechselHref !== null ? (
          <Link
            href={wechselHref}
            className="rounded-blk px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-sunk lg:hidden"
          >
            {wechselnLabel}
          </Link>
        ) : null}

        <form action={abmelden}>
          <button
            type="submit"
            className="rounded-blk px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
          >
            {abmeldenLabel}
          </button>
        </form>
      </div>
    </header>
  );
}
