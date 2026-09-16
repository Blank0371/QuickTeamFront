import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import { promoCodeSeiteAktiv } from "@/lib/promo-code-seite";

/**
 * Die Promo-Code-Anfrageseite.
 *
 * Erreichbar nur bei `PROMO_CODE=an` (siehe `src/lib/promo-code-seite.ts`).
 * Die Middleware leitet einen Aufruf sonst schon auf `/` um; der
 * `notFound()`-Riegel hier ist die zweite Ebene für den Fall, dass die
 * Route je an der Middleware vorbeikommt — dieselbe Doppelung wie beim
 * Soft-Launch (Route-Sperre plus serverseitiger Riegel).
 *
 * `index: false`: die Verfügbarkeit hängt an einer Env-Variablen, ein
 * Eintrag im Suchindex wäre also unzuverlässig. Deshalb hier am Ort statt
 * in `authRouten` — die Route soll auch nicht in `robots.txt` auftauchen,
 * wenn die Seite gerade aus ist.
 */
export const metadata: Metadata = {
  title: "Promo-Partner",
  description:
    "Werde Promo-Partner von QuickTeam: Antragsformular herunterladen, ausfüllen, unterschreiben und einsenden. Für alle, die QuickTeam an Gastronomiebetriebe weiterempfehlen.",
  alternates: { canonical: "/promocode" },
  robots: { index: false, follow: false },
};

const KONTAKT_EMAIL = "blanktrading@web.de";

export default async function PromoCodeSeite() {
  if (!promoCodeSeiteAktiv()) notFound();

  const t = await holeTexte();
  const mailto = `mailto:${KONTAKT_EMAIL}?subject=${encodeURIComponent(t.promo.mailBetreff)}`;

  return (
    <Container className="py-14 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">
        {t.promo.augenbraue}
      </p>

      <h1 className="mt-3 max-w-3xl text-3xl leading-[1.1] sm:text-4xl">{t.promo.titel}</h1>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        {t.promo.lead}
      </p>

      <section aria-labelledby="schritte-titel" className="mt-12 max-w-2xl">
        <h2 id="schritte-titel" className="font-display text-xl text-text">
          {t.promo.schritteTitel}
        </h2>

        <ol className="mt-5 flex flex-col gap-4">
          {[t.promo.schritt1, t.promo.schritt2, t.promo.schritt3].map((schritt, i) => (
            <li key={i} className="flex gap-4">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong font-display text-sm font-semibold text-signal"
              >
                {i + 1}
              </span>
              <p className="pt-1 text-base leading-relaxed text-text">{schritt}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/promocode/antrag"
            download
            className="rounded-blk bg-signal px-6 py-3 text-center text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            {t.promo.formularHerunterladen}
          </a>
          <a
            href={mailto}
            className="rounded-blk border border-line-strong bg-surface px-6 py-3 text-center text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            {t.promo.perMailSenden}
          </a>
        </div>
      </section>

      <div
        role="note"
        className="mt-14 max-w-2xl rounded-card border border-line border-l-4 border-l-signal bg-surface-sunk px-5 py-5 sm:px-7"
      >
        <h2 className="font-display text-sm font-bold text-text">{t.promo.hinweisTitel}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.promo.hinweisText}</p>
      </div>
    </Container>
  );
}
