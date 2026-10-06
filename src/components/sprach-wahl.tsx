"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";

import { locales, SPRACH_COOKIE, SPRACH_NAMEN, istLocale, type Locale } from "@/i18n/config";
import { useKlientTexte } from "@/i18n/sprach-provider";

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
 * Jetzt setzt die Auswahl das Cookie **sofort** im Browser (es ist bewusst
 * nicht `httpOnly`, nur eine Anzeigevorliebe — Begründung an
 * `leseSprache()`) und stösst mit `router.refresh()` ein Neurendern der
 * Server Components an. Die Texte stehen serverseitig, deshalb braucht es
 * den Refresh — anders als beim Thema, das rein per CSS umschaltet.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein `<select>` und keine Knopfreihe mehr
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-10-04 stand hier je Sprache ein Knopf („DE EN SQ"). Mit
 * den Sprachen der Expo-App sind es acht — eine Reihe von acht Kürzeln
 * sprengt die Kopfzeile neben Anmelden/Registrieren und das Konto-Blatt
 * auf 375 px, und „UK" liest jeder als Grossbritannien. Ein natives
 * `<select>` ist schmal, zeigt jede Sprache in ihrem eigenen Namen
 * (`SPRACH_NAMEN`) und bringt auf dem Handy die Auswahl des Systems mit.
 * `lang` an jeder Option lässt Vorleser „Русский" russisch aussprechen.
 */

const EIN_JAHR = 60 * 60 * 24 * 365;

/*
 * `aufDunkel`: für die Leiste der Landingpage, die unabhängig vom Thema
 * immer auf Carbon steht (`landing-navigation.tsx`) — dort wären die
 * Thema-Tokens im hellen Modus heller Grund auf dunkler Leiste. Dieselben
 * Ebene-1-Werte wie die Leiste selbst; `color-scheme: dark` färbt auch die
 * native Auswahlliste dunkel.
 */
const DUNKEL_STIL = {
  colorScheme: "dark",
  background: "var(--qt-c-carbon)",
  color: "var(--qt-c-bone)",
  borderColor: "var(--qt-border-control)",
} as const;

export function SprachWahl({ aktiv, aufDunkel = false }: { aktiv: Locale; aufDunkel?: boolean }) {
  const router = useRouter();
  const [wechselt, starteWechsel] = useTransition();
  const id = useId();
  /* Beschriftung aus dem Wörterbuch der aktiven Sprache (`sprachWahl`). */
  const { sprachWahl: t } = useKlientTexte();

  function waehlen(ziel: string) {
    if (ziel === aktiv || !istLocale(ziel)) return;
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${SPRACH_COOKIE}=${ziel}; path=/; max-age=${EIN_JAHR}; samesite=lax${secure}`;
    starteWechsel(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1.5">
      <label
        htmlFor={id}
        className={aufDunkel ? undefined : "text-muted"}
        style={aufDunkel ? { color: "var(--qt-c-bone)" } : undefined}
      >
        <Languages aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">{t.gruppe}</span>
      </label>
      <select
        id={id}
        value={aktiv}
        disabled={wechselt}
        onChange={(e) => waehlen(e.target.value)}
        /* Auf dem Handy 16 px: darunter zoomt iOS Safari beim Antippen die Seite heran. */
        className={
          aufDunkel
            ? "rounded-blk border py-1 pl-2 pr-1 text-base font-semibold md:text-xs disabled:opacity-60"
            : "rounded-blk border border-line-strong bg-surface py-1 pl-2 pr-1 text-base font-semibold text-text transition-colors hover:bg-surface-sunk md:text-xs disabled:opacity-60"
        }
        style={aufDunkel ? DUNKEL_STIL : undefined}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {SPRACH_NAMEN[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
