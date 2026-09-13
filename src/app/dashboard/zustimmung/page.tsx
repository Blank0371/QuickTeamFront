import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { abmelden } from "@/lib/auth-aktionen";
import { holeTexte } from "@/i18n/server";
import { sicheresZiel, zustimmungAdresse, ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import {
  gewuenschtePositionsId,
  holePositionen,
  waehleAktive,
} from "@/lib/dashboard/position";
import { createClient } from "@/lib/supabase/server";
import { ermittleZustimmungStand } from "@/lib/zustimmung";

import { ZustimmungFormular } from "./zustimmung-formular";

export const metadata: Metadata = {
  title: "Zustimmung erforderlich",
  description:
    "Bestätige AGB, Auftragsverarbeitungsvereinbarung und Datenschutzerklärung, um mit dem Dashboard weiterzuarbeiten.",
  robots: { index: false, follow: false },
};

/**
 * Das Zustimmungs-Tor für Bestandsbetriebe.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Liegt neben der Dashboard-Schale, nicht darunter
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Überlegung wie bei der Positionswahl: `(arbeit)/layout.tsx`
 * ruft `betreteDashboard()`, und genau dieses Tor leitet hierher um.
 * Läge die Seite darunter, prüfte sie sich selbst und schickte sich im
 * Kreis — eine Schleife, aus der nur das Schliessen des Tabs hilft.
 *
 * Der Preis ist die fehlende Sidebar, und der ist hier richtig: es gibt
 * genau eine Sache zu tun, und ein Navigationsmenü daneben wäre eine
 * Einladung, sie zu umgehen. „Abmelden" bleibt erreichbar — niemand
 * soll in einem Tor festsitzen, aus dem nur Zustimmung herausführt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Seite prüft noch einmal selbst
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Adresse ist erratbar. Wer sie aufruft, ohne dass etwas fehlt,
 * bekommt kein leeres Formular, sondern geht dorthin, wo er hinwollte;
 * wer kein Chef ist, hat hier ohnehin nichts zu bestätigen. Dieselbe
 * Regel wie bei `/dashboard/einstellungen`, das sich ebenfalls nicht auf
 * das Fehlen eines Menüpunkts verlässt.
 */
export default async function ZustimmungSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const roh = params[ZIEL_PARAMETER];
  const ziel = sicheresZiel(Array.isArray(roh) ? roh[0] : roh);

  const alle = await holePositionen(supabase, user.id);
  const position = waehleAktive(alle, await gewuenschtePositionsId());

  if (position === null) redirect("/dashboard/wechseln");
  if (position.rolleTyp !== "chef") redirect(ziel);

  const stand = await ermittleZustimmungStand(supabase, position.betriebId);
  if (stand === "zugestimmt") redirect(ziel);

  const t = await holeTexte();

  /*
   * Die Prüfung selbst ist gescheitert — wir wissen nicht, ob eine
   * Zustimmung vorliegt. Statt sie zu erfinden (das war der alte Fehler,
   * Punkt 12) oder den Betrieb dauerhaft auszusperren, bekommt der Chef
   * einen eigenen Zustand: „nochmal versuchen". Der Knopf lädt dieselbe
   * Seite neu; war die Störung vorübergehend, steht danach entweder das
   * Formular oder es geht direkt weiter.
   */
  if (stand === "pruefung-fehlgeschlagen") {
    return (
      <Container className="py-12 sm:py-16">
        <div className="mx-auto w-full max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-stop">
            Prüfung fehlgeschlagen
          </p>

          <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">
            Das ließ sich gerade nicht prüfen
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted">
            Ob für <span className="text-text">{position.betriebName}</span> eine
            Zustimmung vorliegt, konnten wir gerade nicht abfragen — das liegt an uns,
            nicht an dir. Versuch es gleich noch einmal. Bleibt der Fehler, meld dich
            beim Support; dein Zugang besteht weiter.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={zustimmungAdresse(ziel === "/dashboard" ? null : ziel)}
              className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              Erneut versuchen
            </Link>
            <form action={abmelden}>
              <button
                type="submit"
                className="rounded-blk px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
              >
                {t.dashboard.abmelden}
              </button>
            </form>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl leading-[1.1] sm:text-4xl">
          Kurz bestätigen, dann geht&#39;s weiter
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted">
          Für <span className="text-text">{position.betriebName}</span> liegt uns noch
          keine Zustimmung zu den aktuellen Fassungen vor. Das holen wir einmal nach —
          danach landest du wieder dort, wo du hinwolltest.
        </p>

        <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          <ZustimmungFormular ziel={ziel} />

          <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">
            Du bestätigst für den Betrieb, nicht für dich persönlich. An deinem Tarif,
            deiner Abrechnung und deinem Zahlungsmittel ändert sich dadurch nichts.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">{user.email}</p>
          <form action={abmelden}>
            <button
              type="submit"
              className="rounded-blk px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
            >
              {t.dashboard.abmelden}
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
