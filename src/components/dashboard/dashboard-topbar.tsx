import { SprachWahl } from "@/components/sprach-wahl";
import { ThemaWahl } from "@/components/dashboard/thema-wahl";
import type { Locale } from "@/i18n";
import { abmelden } from "@/lib/auth-aktionen";
import type { Thema } from "@/lib/thema";

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
 * **Die Handgriffe rechts sind ab dem 2026-09-21 nur noch ab `lg` da.**
 * Sprache, Darstellung und Abmelden stehen auf schmalen Geräten in der
 * „Konto"-Kachel der unteren Tab-Leiste (`DashboardKontoInhalt`) — dort,
 * wo der Daumen sie erreicht. Die Topbar trägt sie deshalb nur noch in der
 * Spaltenfassung, in der es keine Tab-Leiste gibt. Der frühere
 * Positionswechsel-Link (nur `lg:hidden`) ist damit überflüssig: ab `lg`
 * führt der Weg über die Personenkarte im Sidebar-Fuss, darunter über die
 * „Konto"-Kachel.
 *
 * Server Component: hier gibt es keinen Zustand, nur Formulare. `abmelden`
 * ist eine Server Action und wird direkt als `action` übergeben — das
 * funktioniert ohne JavaScript, ebenso Sprach- und Darstellungswahl.
 */
export function DashboardTopbar({
  betriebName,
  personName,
  rolleText,
  abmeldenLabel,
  sprache,
  thema,
  themaSystem,
  themaHell,
  themaDunkel,
}: {
  betriebName: string;
  personName: string;
  rolleText: string;
  abmeldenLabel: string;
  sprache: Locale;
  thema: Thema | null;
  themaSystem: string;
  themaHell: string;
  themaDunkel: string;
}) {
  return (
    <header
      data-qt-schale=""
      className="flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3 sm:px-8"
    >
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

      {/*
        Nur ab `lg`. Unterhalb tragen dieselben Handgriffe die „Konto"-
        Kachel der Tab-Leiste — dieselbe Auskunft an genau einer sichtbaren
        Stelle je Breite.
      */}
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <SprachWahl aktiv={sprache} />
        <ThemaWahl
          aktiv={thema}
          systemLabel={themaSystem}
          hellLabel={themaHell}
          dunkelLabel={themaDunkel}
        />

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
