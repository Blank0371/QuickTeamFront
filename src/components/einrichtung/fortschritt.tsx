import Link from "next/link";

import { holeTexte } from "@/i18n/server";
import {
  SCHRITTE,
  darfSehen,
  schrittIndex,
  type Schritt,
  type Stand,
} from "@/lib/einrichtung";

/**
 * Fortschrittsbalken über allen Schritten der Einrichtung.
 *
 * Server-Komponente ohne einen Byte JavaScript: welcher Schritt gerade
 * offen ist, weiss die Seite selbst — dafür braucht es kein `usePathname`
 * und keine Hydration. Die Rück-Navigation sind schlicht Links.
 *
 * Erledigte Schritte sind anklickbar, kommende nicht. Ein `<span>` statt
 * eines toten Links ist dabei kein Detail: ein Link, der nirgends
 * hinführt, wird von der Tastatur trotzdem angesprungen und von
 * Screenreadern angesagt.
 */
export async function Fortschritt({
  aktuell,
  stand,
}: {
  aktuell: Schritt;
  /** `null`, solange niemand angemeldet ist — dann ist nur Schritt 1 offen. */
  stand: Stand | null;
}) {
  const t = (await holeTexte()).registrierung.fortschritt;
  const aktuellerIndex = schrittIndex(aktuell);
  const erreicht = stand ? schrittIndex(stand.offen) : 0;
  const anteil = ((aktuellerIndex + 1) / SCHRITTE.length) * 100;

  return (
    <nav aria-label={t.aria} className="mb-10">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">
        {t.schrittVon
          .replace("{n}", String(aktuellerIndex + 1))
          .replace("{gesamt}", String(SCHRITTE.length))}
      </p>

      {/*
        Der Balken ist rein dekorativ — die gleiche Aussage steht als Text
        darüber und als Liste darunter. Deshalb aria-hidden statt einer
        dritten Ansage derselben Sache.
      */}
      <div
        aria-hidden="true"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk"
      >
        <div
          className="h-full rounded-full bg-signal transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${anteil}%` }}
        />
      </div>

      <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {SCHRITTE.map((schritt, index) => {
          const istAktuell = schritt === aktuell;
          const istErledigt = index < erreicht;
          const anklickbar =
            !istAktuell && stand !== null && darfSehen(schritt, stand);

          const beschriftung = `${index + 1}. ${t.schritte[schritt]}`;
          const stil = istAktuell
            ? "text-text font-semibold"
            : istErledigt
              ? "text-muted"
              : "text-muted/60";

          return (
            <li key={schritt} className="text-sm">
              {anklickbar ? (
                <Link
                  href={`/einrichtung/${schritt}`}
                  className={`${stil} underline underline-offset-4 hover:text-signal`}
                >
                  {beschriftung}
                </Link>
              ) : (
                <span
                  className={stil}
                  {...(istAktuell ? { "aria-current": "step" as const } : {})}
                >
                  {beschriftung}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
