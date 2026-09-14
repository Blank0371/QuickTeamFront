import type { ReactNode } from "react";

import {
  DashboardSidebar,
  type Gruppe,
} from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ZustimmungHinweis } from "@/components/dashboard/zustimmung-hinweis";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

/**
 * Schale des Dashboards.
 *
 * Sie ist zugleich das Tor: `betreteDashboard()` prüft Anmeldung,
 * Position und Sperre, bevor irgendetwas gerendert wird, und leitet
 * andernfalls um. Weil in Next jedes Layout vor seinen Seiten läuft,
 * kann keine Unterseite die Prüfung vergessen — sie müsste sich dazu aus
 * dem Layout heraus bewegen.
 *
 * Die Positionswahl liegt deshalb bewusst **nicht** unter diesem Layout,
 * sondern daneben: sie ist die Antwort auf „keine Position gewählt" und
 * verwiese sonst auf sich selbst — das Tor schickte auf `/dashboard/
 * wechseln`, dessen Layout dasselbe Tor wäre, in Schleife.
 *
 * Deshalb die Klammer-Gruppe: `dashboard/(arbeit)/…` trägt diese Schale,
 * `dashboard/wechseln` liegt daneben und kommt ohne sie aus. Die Gruppe
 * ändert keine Adresse — `/dashboard` bleibt `/dashboard`. **Jeder neue
 * Bereich gehört unter `(arbeit)`**, sonst steht er ungeschützt und ohne
 * Kopfzeile da.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Kopfzeile über volle Breite, Navigation links darunter.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-08-29 hingen die Bereiche als Reiterleiste unter der
 * Kopfzeile. Für vier Reiter ging das auf; für die Bereiche, die noch
 * kommen — Urlaub, Mitteilungen, Tausch, Notfall —, geht es nicht mehr:
 * eine waagrechte Leiste wächst in die einzige Richtung, in der ein
 * Bildschirm nichts übrig hat, und sie kann nicht gruppieren.
 *
 * Was **nicht** mit umgezogen ist: Betriebsname, Positionswechsel und
 * Abmelden. Sie stehen weiter in der Kopfzeile, obwohl der Fuss einer
 * Sidebar der übliche Platz dafür wäre. Der Grund ist die schmale
 * Breite: dort ist die Sidebar eine waagrecht scrollende Leiste, und
 * diese drei müssten dann ein zweites Mal in der Kopfzeile stehen —
 * dieselbe Auskunft an zwei Stellen im HTML, zwei Abmelde-Formulare,
 * zwei Gelegenheiten, sich zu widersprechen.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { position, alle, zustimmung } = await betreteDashboard();
  const sprache = await leseSprache();
  const t = getDictionary(sprache);
  const chef = istChef(position);

  /*
   * Chef-Bereiche fehlen für Angestellte ganz, statt leer dazustehen.
   * `manager.tsx` und `scheduling.tsx` teilen sich in der App dieselbe
   * Tab-Leiste nach demselben Kriterium — `rolle_typ` entscheidet über
   * die Existenz des Bereichs, nicht über seinen Inhalt.
   *
   * Eine Gruppe, die dadurch leer würde, fällt unten heraus: eine
   * Überschrift ohne Einträge ist schlimmer als keine Überschrift.
   */
  const alleGruppen: Gruppe[] = [
    {
      /*
       * Gruppierung nach `docs/quickteam-dashboard-v2.html`: was man
       * täglich tut, gegen das, was man verwaltet. Vorher hiessen die
       * Gruppen „Dienstplan" und „Betrieb" und schnitten quer dazu —
       * Team und Mitteilungen standen unter „Betrieb", obwohl beides
       * zum Tagesgeschäft gehört, während Urlaub und Tausch
       * Vorgänge mit Genehmigung sind.
       */
      titel: "Arbeitsplatz",
      bereiche: [
        { href: "/dashboard", label: t.dashboard.uebersicht, icon: "uebersicht" },
        { href: "/dashboard/kalender", label: t.dashboard.kalender, icon: "kalender" },
        ...(chef
          ? ([{ href: "/dashboard/team", label: t.dashboard.team, icon: "team" }] as const)
          : []),
        ...(chef
          ? ([
              {
                href: "/dashboard/planung",
                label: t.dashboard.planung,
                icon: "planung",
              },
            ] as const)
          : []),
        {
          href: "/dashboard/mitteilungen",
          label: t.dashboard.mitteilungen,
          icon: "mitteilungen",
        },
      ],
    },
    {
      titel: "Organisation",
      bereiche: [
        {
          href: "/dashboard/urlaub",
          label: t.dashboard.urlaub,
          icon: "urlaub",
        },
        {
          href: "/dashboard/verfuegbarkeit",
          label: t.dashboard.verfuegbarkeit,
          icon: "verfuegbarkeit",
        },
        {
          href: "/dashboard/tausch",
          label: t.dashboard.tausch,
          icon: "tausch",
        },
        {
          href: "/dashboard/notfall",
          label: t.dashboard.notfall,
          icon: "notfall",
        },
      ],
    },
    {
      /*
       * Einstellungen stehen unbeschriftet am Fuss und nur für Chefs —
       * dieselbe Regel wie bei Team und Planung: `rolle_typ`
       * entscheidet über die Existenz des Bereichs. Die Seite prüft
       * zusätzlich selbst, weil die Adresse erratbar ist.
       */
      titel: null,
      bereiche: [
        ...(chef
          ? ([
              {
                href: "/dashboard/einstellungen",
                label: t.dashboard.einstellungen,
                icon: "einstellungen",
              },
            ] as const)
          : []),
      ],
    },
  ];

  /*
   * Getrennt vom Literal, damit die Typangabe oben greift: `.filter`
   * direkt an der Liste nähme ihr den erwarteten Typ, und `icon` fiele
   * von seinem Schlüsselwert auf `string` zurück — ein Tippfehler
   * darin fiele dann erst im Browser auf.
   */
  const gruppen = alleGruppen.filter((gruppe) => gruppe.bereiche.length > 0);

  return (
    <div className="flex flex-1 flex-col">

      {/*
        ─────────────────────────────────────────────────────────────
         Die Schale läuft über die volle Breite.
        ─────────────────────────────────────────────────────────────

        Beim Sidebar-Umbau stand hier `mx-auto max-w-6xl`, damit die
        Navigation genau unter dem Logo beginnt. Auf einem breiten
        Bildschirm war das falsch: die Schale wurde bei 72rem zentriert,
        und links davon blieb der Seitengrund stehen — im Dunkelmodus
        ein schwarzer Streifen von mehreren hundert Pixeln neben einer
        Sidebar, die sichtbar nicht am Rand sass.

        Eine Sidebar ist ein Rand des Fensters, kein Element im
        Textfluss. Sie beginnt deshalb am Rand, und die Kopfzeile
        darüber tut dasselbe.

        Die Lesebreite geht dadurch nicht verloren: die Seiten bringen
        ihren `Container` mit, und der zentriert den Inhalt weiterhin
        auf 72rem — nur eben innerhalb der Fläche neben der Sidebar
        statt innerhalb des ganzen Fensters.

        `min-w-0` am Inhalt ist keine Zierde: ohne die Angabe wächst ein
        Flex-Kind über seine Spalte hinaus, sobald etwas Unumbrechbares
        darin steht — eine lange Tabelle, ein Datumsband —, und die
        Sidebar würde aus dem Bild geschoben.
      */}
      <div className="flex w-full flex-1 flex-col lg:flex-row">
        <DashboardSidebar
          gruppen={gruppen}
          beschriftung={t.dashboard.navigation}
          folgtLabel={t.dashboard.folgt}
          folgtHinweis={t.dashboard.folgtHinweis}
          betriebName={position.betriebName}
          personName={position.name}
          rolleText={t.dashboard.rolle[position.rolleTyp]}
          wechselHref={alle.length > 1 ? "/dashboard/wechseln" : null}
        />

        {/*
          Ein `<div>`, kein `<main>`: das Root-Layout trägt bereits
          `<main id="inhalt">` samt Sprungmarke, und zwei sichtbare
          `main`-Elemente sind laut HTML-Spezifikation unzulässig — der
          Sprunglink hätte danach zwei mögliche Ziele.
        */}
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            sprache={sprache}
            betriebName={position.betriebName}
            personName={position.name}
            rolleText={t.dashboard.rolle[position.rolleTyp]}
            wechselHref={alle.length > 1 ? "/dashboard/wechseln" : null}
            abmeldenLabel={t.dashboard.abmelden}
            wechselnLabel={t.dashboard.wechseln}
          />
          {/*
            Der Streifen steht zwischen Kopfzeile und Inhalt, nicht
            darüber: er gehört zum Arbeitsbereich und soll die Kopfzeile
            nicht vom Fensterrand wegschieben. Für Angestellte ist
            `zustimmung` immer `null` — sie werden gar nicht erst
            gefragt (siehe `pruefeZustimmung`).
          */}
          <ZustimmungHinweis befund={zustimmung} />
          {children}
        </div>
      </div>
    </div>
  );
}
