import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { josephZustand } from "@/lib/joseph";

import { JosephChat } from "./joseph-chat";

const KONTAKT_EMAIL = "blanktrading@web.de";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await leseSprache());
  return {
    title: t.dashboard.josephSeite.metaTitel,
    description: t.dashboard.josephSeite.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Joseph — der Sekretär für Chefs. **Experimentell, noch nicht
 * umgesetzt**; kein Expo-Gegenstück (neue Produktentscheidung vom
 * 2026-09-24).
 *
 * Zwei Schalter (`src/lib/joseph.ts`): `vorschau` zeigt nur den
 * Entwicklungs-Hinweis mit Kontaktadresse, `aktiv` eine Chat-Attrappe.
 * Bei `aus` gibt es die Seite nicht — dieselbe Prüfung, die im Layout den
 * Menüeintrag weglässt. Angestellte bekommen ebenfalls 404: die Adresse
 * ist erratbar, der Bereich aber nur für Chefs gedacht.
 */
export default async function JosephSeite() {
  const zustand = josephZustand();
  if (zustand === "aus") notFound();

  const { position } = await betreteDashboard();
  if (!istChef(position)) notFound();

  const t = getDictionary(await leseSprache()).dashboard.josephSeite;
  const mailto = `mailto:${KONTAKT_EMAIL}?subject=${encodeURIComponent(t.mailBetreff)}`;

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.untertitel}</p>
        <div className="mt-4 flex flex-col gap-2 text-base leading-relaxed text-text">
          {t.beschreibung.map((absatz) => (
            <p key={absatz}>{absatz}</p>
          ))}
        </div>

        {zustand === "vorschau" ? (
          <div className="mt-8 rounded-card border border-line bg-surface p-5">
            <p className="text-base text-text">{t.entwicklung}</p>
            <p className="mt-3 text-sm text-muted">{t.kontakt}</p>
            <p className="mt-1">
              <a
                href={mailto}
                className="font-semibold text-signal underline underline-offset-4 hover:text-signal-hover"
              >
                {KONTAKT_EMAIL}
              </a>
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
            <p className="text-sm text-muted">{t.experimentell}</p>
            <div className="min-h-48 rounded-blk border border-line bg-surface-sunk" aria-hidden="true" />
            <JosephChat label={t.chatLabel} platzhalter={t.chatPlatzhalter} senden={t.senden} />
          </div>
        )}
      </div>
    </Container>
  );
}
