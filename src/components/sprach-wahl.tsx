import { revalidatePath } from "next/cache";

import { istLocale, locales, type Locale } from "@/i18n";
import { setzeSprache } from "@/i18n/sprache";

/**
 * Sprachumschalter.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein Formular je Sprache, kein Select
 * ─────────────────────────────────────────────────────────────────────
 *
 * Zwei Sprachen sind zwei Knöpfe. Ein `<select>` bräuchte JavaScript,
 * um auf die Auswahl zu reagieren, oder einen zusätzlichen
 * „Übernehmen"-Knopf daneben — beides mehr Bauteil für weniger Klarheit.
 * Die aktive Sprache ist ein `aria-pressed`-Knopf ohne Ziel, die andere
 * ein echter Post.
 *
 * **Server Component mit inline Server Action.** Kein Client-Bündel,
 * kein Zustand; das Umschalten funktioniert auch ohne JavaScript, weil
 * es ein gewöhnliches `<form>` ist.
 *
 * `revalidatePath("/", "layout")` ist nicht Vorsicht, sondern
 * notwendig: die Sprache steckt in einem Cookie, und ohne ausdrückliche
 * Entwertung lieferte Next die bereits gerenderten Server Components
 * derselben Route in der alten Sprache weiter aus. Der Nutzer klickte
 * dann auf „English" und sähe weiter Deutsch.
 */
export function SprachWahl({ aktiv }: { aktiv: Locale }) {
  async function wechseln(formData: FormData) {
    "use server";
    const wunsch = String(formData.get("locale") ?? "");
    if (!istLocale(wunsch)) return;
    await setzeSprache(wunsch);
    revalidatePath("/", "layout");
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Sprache">
      {locales.map((locale) => {
        const ist = locale === aktiv;
        const beschriftung = locale.toUpperCase();

        if (ist) {
          return (
            <span
              key={locale}
              aria-current="true"
              className="rounded-blk bg-signal-weak px-2 py-1 text-xs font-semibold text-text"
            >
              {beschriftung}
              <span className="sr-only"> — aktuelle Sprache</span>
            </span>
          );
        }

        return (
          <form key={locale} action={wechseln}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-blk px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-surface-sunk hover:text-text"
            >
              {beschriftung}
              <span className="sr-only">
                {locale === "en" ? " — switch to English" : " — auf Deutsch wechseln"}
              </span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
