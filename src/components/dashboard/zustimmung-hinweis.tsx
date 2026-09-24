import Link from "next/link";

import { zustimmungAdresse } from "@/lib/dashboard/pfad";
import type { ZustimmungBefund } from "@/lib/zustimmung";

/**
 * Der Streifen über dem Dashboard, wenn eine **Vertragsänderung** offen
 * ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein Hinweis und kein Tor
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-13 gab es diesen Zustand nicht: jede Abweichung von
 * der aktuellen Fassung führte auf `/dashboard/zustimmung`, und ein
 * einziger geänderter Wert in `rechtstexte.ts` hätte damit sämtliche
 * zahlenden Bestandskunden gleichzeitig ausgesperrt.
 *
 * § 13 Abs. 2 und 3 der AGB regeln den Fall aber ausdrücklich anders:
 * eine Änderung wird wirksam, **wenn der Kunde zustimmt**; Schweigen
 * gilt nicht als Zustimmung, und bis dahin gelten die bisherigen
 * Bedingungen. Der Dienst schuldet also weiter, was er schuldet — und
 * das Einzige, was jetzt fehlt, ist die Frage. Genau die stellt dieser
 * Streifen.
 *
 * Dass er auf **jeder** Dashboard-Seite steht und nicht nur einmal,
 * ist Absicht: er ist die Erinnerung, nicht die Sperre. Verschwinden
 * tut er erst durch Zustimmung — nicht durch Wegklicken, sonst wäre er
 * nach einem Klick unsichtbar und die Frage praktisch nie gestellt.
 *
 * Was hier **nicht** steht, ist eine Frist. Ob und wann der Anbieter
 * nach § 13 Abs. 3 Satz 2 kündigt, ist eine Entscheidung des
 * Betreibers pro Änderung und keine Konstante im Code; einen Countdown
 * anzuzeigen, den niemand durchsetzt, wäre eine Drohung ohne Deckung.
 */
export function ZustimmungHinweis({ befund }: { befund: ZustimmungBefund | null }) {
  if (befund?.art !== "aenderung-offen") return null;

  return (
    <div
      data-qt-schale=""
      role="status"
      className="border-b border-line bg-surface-sunk px-4 py-3 text-sm text-muted sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Es gibt eine neue Fassung der Vertragsunterlagen. Bis du zustimmst, gelten die
          bisherigen Bedingungen weiter.
        </span>
        <Link
          href={zustimmungAdresse(null)}
          className="font-semibold text-text underline underline-offset-4 transition-colors hover:text-signal"
        >
          Ansehen
        </Link>
      </div>
    </div>
  );
}
