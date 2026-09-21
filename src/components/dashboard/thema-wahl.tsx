"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { THEMA_COOKIE, type Thema } from "@/lib/thema-basis";

/**
 * Hell/Dunkel/System — der Darstellungsumschalter.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum client-seitig und **ohne** Server Action
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-21 war das hier — wie `SprachWahl` — eine Server
 * Component mit inline Server Action und `revalidatePath("/", "layout")`.
 * Für die Sprache ist das nötig: die Texte stehen in Server Components und
 * müssen neu gerendert werden. Für die Darstellung ist es das **nicht** —
 * der Modus hängt allein an `data-theme` am `<html>` und wird rein per CSS
 * umgeschaltet (`globals.css`). Der Server-Umweg kostete dort nur einen
 * spürbaren Aussetzer auf dem Handy: ein Tipp, ein voller Layout-Rerender,
 * und ein zweiter Tipp währenddessen ging verloren — genau das „reagiert
 * nicht immer".
 *
 * Jetzt setzt der Klick das Attribut und das Cookie **sofort** im Browser,
 * ohne Netz. Das Cookie ist bewusst nicht `httpOnly` (nur eine
 * Anzeigevorliebe, `src/lib/thema.ts`), ein Client darf es also schreiben.
 * Beim nächsten Seitenaufbau liest das Root-Layout es wieder und rendert
 * gleich im richtigen Modus. „System" heisst: Cookie weg, zurück zum
 * `prefers-color-scheme`.
 */

const OPTIONEN: { wert: Thema | "system"; icon: LucideIcon }[] = [
  { wert: "system", icon: Monitor },
  { wert: "hell", icon: Sun },
  { wert: "dunkel", icon: Moon },
];

const EIN_JAHR = 60 * 60 * 24 * 365;

function anwenden(wert: Thema | "system") {
  const el = document.documentElement;
  if (wert === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", wert);

  const secure = location.protocol === "https:" ? "; secure" : "";
  if (wert === "system") {
    document.cookie = `${THEMA_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
  } else {
    document.cookie = `${THEMA_COOKIE}=${wert}; path=/; max-age=${EIN_JAHR}; samesite=lax${secure}`;
  }
}

export function ThemaWahl({
  aktiv,
  systemLabel,
  hellLabel,
  dunkelLabel,
}: {
  /** `null` = keine ausdrückliche Wahl, dem System folgend. */
  aktiv: Thema | null;
  systemLabel: string;
  hellLabel: string;
  dunkelLabel: string;
}) {
  const [aktuell, setAktuell] = useState<Thema | "system">(aktiv ?? "system");

  const beschriftung: Record<Thema | "system", string> = {
    system: systemLabel,
    hell: hellLabel,
    dunkel: dunkelLabel,
  };

  function waehlen(wert: Thema | "system") {
    anwenden(wert);
    setAktuell(wert);
  }

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={beschriftung.system}
    >
      {OPTIONEN.map(({ wert, icon: Icon }) => {
        const ist = wert === aktuell;
        const label = beschriftung[wert];

        return (
          <button
            key={wert}
            type="button"
            aria-pressed={ist}
            onClick={() => waehlen(wert)}
            className={`inline-flex items-center gap-1.5 rounded-blk px-3 py-2 text-xs font-semibold transition-colors ${
              ist
                ? "bg-signal-weak text-text"
                : "text-muted hover:bg-surface-sunk hover:text-text"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
