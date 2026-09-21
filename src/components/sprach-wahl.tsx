"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { locales, SPRACH_COOKIE, type Locale } from "@/i18n/config";

/**
 * Sprachumschalter.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum client-seitig — und was der Server-Weg vorher gekostet hat
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-21 war das eine Server Component mit inline Server
 * Action und `revalidatePath("/", "layout")`. Auf dem Handy — im
 * „Konto"-Blatt der unteren Leiste — reagierte der Knopf dort „nicht
 * immer": ein Tipp stiess einen vollen Server-Roundtrip samt
 * Layout-Rerender an, und ein zweiter Tipp währenddessen ging verloren.
 * Genau derselbe Aussetzer, der schon die Darstellungswahl (`ThemaWahl`)
 * betraf.
 *
 * Jetzt setzt der Klick das Cookie **sofort** im Browser (es ist bewusst
 * nicht `httpOnly`, nur eine Anzeigevorliebe — Begründung an
 * `leseSprache()`) und stösst mit `router.refresh()` ein Neurendern der
 * Server Components an. Die Texte stehen serverseitig, deshalb braucht es
 * den Refresh — anders als beim Thema, das rein per CSS umschaltet. Der
 * Unterschied zum alten Weg: kein `<form>`-Post, der unter der Hand
 * verworfen wird, und die aktive Sprache steht sofort.
 *
 * Ein `<select>` bräuchte ohnehin JavaScript; bei zwei Sprachen sind zwei
 * Knöpfe klarer. Die aktive Sprache ist ein gedrückter Knopf ohne
 * Wirkung, die andere schaltet um.
 */

const EIN_JAHR = 60 * 60 * 24 * 365;

/** sr-only-Texte folgen der aktiven Sprache — kein hartkodiertes Deutsch. */
function texte(aktiv: Locale) {
  const en = aktiv === "en";
  return {
    gruppe: en ? "Language" : "Sprache",
    aktuell: en ? " — current language" : " — aktuelle Sprache",
    wechselZu: (ziel: Locale) =>
      ziel === "en"
        ? en
          ? " — switch to English"
          : " — auf Englisch wechseln"
        : en
          ? " — switch to German"
          : " — auf Deutsch wechseln",
  };
}

export function SprachWahl({ aktiv }: { aktiv: Locale }) {
  const router = useRouter();
  const [wechselt, starteWechsel] = useTransition();
  const t = texte(aktiv);

  function waehlen(ziel: Locale) {
    if (ziel === aktiv) return;
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${SPRACH_COOKIE}=${ziel}; path=/; max-age=${EIN_JAHR}; samesite=lax${secure}`;
    starteWechsel(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t.gruppe}>
      {locales.map((locale) => {
        const ist = locale === aktiv;
        const beschriftung = locale.toUpperCase();

        return (
          <button
            key={locale}
            type="button"
            aria-current={ist ? "true" : undefined}
            aria-pressed={ist}
            disabled={ist || wechselt}
            onClick={() => waehlen(locale)}
            className={
              ist
                ? "rounded-blk bg-signal-weak px-2 py-1 text-xs font-semibold text-text"
                : "rounded-blk px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-surface-sunk hover:text-text disabled:opacity-60"
            }
          >
            {beschriftung}
            <span className="sr-only">
              {ist ? t.aktuell : t.wechselZu(locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
