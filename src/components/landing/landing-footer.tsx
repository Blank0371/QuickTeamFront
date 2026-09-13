import Link from "next/link";

import { Container } from "@/components/container";
import { LogoMark } from "@/components/logo";
import { holeTexte } from "@/i18n/server";

/**
 * Rechtlicher Abschluss unter Pricing. Nur echte, im Projekt
 * existierende Routen (`/impressum`, `/datenschutz`, `/agb` — geprüft
 * über `src/app/(site)/**`). Keine Cookie-Einstellungen (keine echte
 * Consent-Funktion im Projekt) und kein Kontakt-Link (kein gültiges
 * Ziel gefunden) — beide bewusst weggelassen statt erfunden.
 *
 * **Korrigiert am 2026-09-10.** Hier stand, die verlinkten Seiten seien
 * „nur Gerüste mit `<PH>`-Platzhaltern (Firmenwortlaut, Anschrift,
 * Handelsregisternummer fehlen noch)" und das sei ein Launch-Blocker.
 * Das trifft nicht mehr zu: das Impressum trägt die geprüften
 * Registerangaben, `/agb` den ausformulierten Vertragstext, und
 * `/datenschutz` die gezeichnete Erklärung. Ein Kommentar, der eine
 * behobene Lücke weitermeldet, schickt den nächsten Leser auf die Suche
 * nach etwas, das es nicht gibt.
 *
 * Offen ist etwas anderes, und das steht in `CLAUDE.md`: die vier
 * Dokumente unter `docs/rechtliches/legals/` sind laut ihrem eigenen
 * README **noch nicht anwaltlich geprüft**. Deshalb bleibt `SOFT_LAUNCH`
 * stehen — nicht wegen fehlender Platzhalter.
 *
 * **Vierter Eintrag seit dem 2026-09-10:** `/avv`. § 7 Abs. 3 der AGB
 * setzt voraus, dass der Kunde den Auftragsverarbeitungsvertrag bei der
 * Registrierung schliesst; er muss also erreichbar sein.
 */
export async function LandingFooter() {
  const t = await holeTexte();
  const jahr = new Date().getFullYear();

  return (
    <footer
      id="rechtliches"
      data-licht-szene="footer"
      className="relative w-full overflow-hidden"
      style={{
        scrollMarginTop: "3.5rem",
        // Kein eigener Flaechenhintergrund mehr (vorher
        // `--qt-c-graphite`) — die Kante Carbon/Graphit war genau die
        // Art harter Sektionsgrenze, die diese Ueberarbeitung
        // beseitigt. Was bleibt, ist eine Haarlinie: eine bewusst
        // gesetzte Trennung, kein Farbsprung.
        borderTop: "1px solid color-mix(in oklab, var(--qt-c-bone) 9%, transparent)",
      }}
    >
      <Container className="relative py-16 sm:py-20">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8 shrink-0" />
              <span
                className="text-base font-bold tracking-tight"
                style={{ color: "var(--qt-c-bone)" }}
              >
                QuickTeam
              </span>
            </div>
            <p
              className="mt-4 text-sm leading-relaxed"
              style={{ color: "color-mix(in oklab, var(--qt-c-bone) 68%, transparent)" }}
            >
              {t.footer.claim}
            </p>
          </div>

          <nav aria-label={t.footer.rechtliches}>
            <h2
              className="text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: "color-mix(in oklab, var(--qt-c-bone) 75%, transparent)" }}
            >
              {t.footer.rechtliches}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {t.footer.rechtlichesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[2.25rem] items-center rounded-blk text-sm underline-offset-4 transition-colors hover:text-[var(--qt-c-bone)] hover:underline"
                    style={{ color: "color-mix(in oklab, var(--qt-c-bone) 68%, transparent)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p
          className="mt-12 pt-6 text-xs"
          style={{
            borderTop: "1px solid color-mix(in oklab, var(--qt-c-bone) 10%, transparent)",
            color: "color-mix(in oklab, var(--qt-c-bone) 55%, transparent)",
          }}
        >
          {t.footer.copyright(jahr)}
        </p>
      </Container>
    </footer>
  );
}
