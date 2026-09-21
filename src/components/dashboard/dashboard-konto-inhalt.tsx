import { ChevronRight, LogOut, Users } from "lucide-react";
import Link from "next/link";

import { KontoLoeschenHalten } from "@/components/dashboard/konto-loeschen-halten";
import { SprachWahl } from "@/components/sprach-wahl";
import { ThemaWahl } from "@/components/dashboard/thema-wahl";
import type { Locale } from "@/i18n";
import { abmelden } from "@/lib/auth-aktionen";
import type { Thema } from "@/lib/thema";

/**
 * Inhalt des „Konto"-Blatts der unteren Tab-Leiste.
 *
 * Eigene Server Component, weil die Leiste selbst eine Client-Insel ist:
 * über die RSC-Grenze reicht das Layout diesen fertig gerenderten Baum als
 * `kontoSlot` hinein. Alles hier funktioniert ohne JavaScript — Sprache,
 * Darstellung und Abmelden sind `<form>`s mit Server Action, Verbindungen
 * und Kontolöschung sind Links.
 *
 * Was hier steht, stand vor dem 2026-09-21 oben rechts in der Topbar
 * (Sprache, Abmelden, Positionswechsel). Auf schmalen Geräten ist die
 * Topbar dafür jetzt leer; ab `lg` (keine Tab-Leiste) trägt sie es weiter.
 */
export function DashboardKontoInhalt({
  sprache,
  thema,
  wechselHref,
  texte,
}: {
  sprache: Locale;
  thema: Thema | null;
  /** `null`, wenn es nur eine Anstellung gibt — dann kein Verbindungs-Link. */
  wechselHref: string | null;
  texte: {
    spracheLabel: string;
    themaLabel: string;
    themaSystem: string;
    themaHell: string;
    themaDunkel: string;
    verbindungen: string;
    kontoLoeschen: string;
    kontoLoeschenHalten: string;
    abmelden: string;
  };
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">{texte.spracheLabel}</h3>
        <SprachWahl aktiv={sprache} />
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <h3 className="text-sm font-medium text-text">{texte.themaLabel}</h3>
        <ThemaWahl
          aktiv={thema}
          systemLabel={texte.themaSystem}
          hellLabel={texte.themaHell}
          dunkelLabel={texte.themaDunkel}
        />
      </section>

      <div className="flex flex-col border-t border-line pt-2">
        {wechselHref !== null ? (
          <Link
            href={wechselHref}
            className="flex items-center gap-3 rounded-blk px-3 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
          >
            <Users className="size-5 shrink-0" aria-hidden="true" />
            <span className="grow">{texte.verbindungen}</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        ) : null}

        <form action={abmelden}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-blk px-3 py-3 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
          >
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            {texte.abmelden}
          </button>
        </form>

        {/*
          Kontolöschung — destruktiv, deshalb `text-stop` und „3 Sekunden
          halten" (`KontoLoeschenHalten`), damit ein Wischen im Menü sie
          nicht versehentlich öffnet. `/kontoloeschung` war bis zum
          2026-09-21 bewusst nirgends verlinkt; auf ausdrücklichen Wunsch des
          Nutzers ist sie jetzt aus dem angemeldeten Konto erreichbar
          (Eintrag in der Historie, `docs/claude-md-historie.md`). Die Seite
          selbst prüft weiterhin Anmeldung und abgetipptes Wort.
        */}
        <KontoLoeschenHalten
          label={texte.kontoLoeschen}
          haltenHinweis={texte.kontoLoeschenHalten}
        />
      </div>
    </div>
  );
}
