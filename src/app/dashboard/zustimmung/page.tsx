import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { aboVerwalten } from "@/app/dashboard/(arbeit)/einstellungen/aktionen";
import { abmelden } from "@/lib/auth-aktionen";
import { holeTexte } from "@/i18n/server";
import { sicheresZiel, zustimmungAdresse, ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import {
  gewuenschtePositionsId,
  holePositionen,
  waehleAktive,
} from "@/lib/dashboard/position";
import { createClient } from "@/lib/supabase/server";
import { ermittleZustimmungBefund, offeneDokumente } from "@/lib/zustimmung";

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

  const befund = await ermittleZustimmungBefund(supabase, position.betriebId, user.id);
  if (befund.art === "zugestimmt") redirect(ziel);

  const t = await holeTexte();

  /*
   * Die Prüfung selbst ist gescheitert — wir wissen nicht, ob eine
   * Zustimmung vorliegt. Statt sie zu erfinden (das war der alte Fehler,
   * Punkt 12) oder den Betrieb dauerhaft auszusperren, bekommt der Chef
   * einen eigenen Zustand: „nochmal versuchen". Der Knopf lädt dieselbe
   * Seite neu; war die Störung vorübergehend, steht danach entweder das
   * Formular oder es geht direkt weiter.
   */
  if (befund.art === "pruefung-fehlgeschlagen") {
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

  const aenderung = befund.art === "aenderung-offen";
  const offen = offeneDokumente(befund);

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl leading-[1.1] sm:text-4xl">
          {aenderung
            ? "Neue Fassung — bitte einmal ansehen"
            : "Kurz bestätigen, dann geht's weiter"}
        </h1>

        {/*
          Zwei Fälle, zwei Texte, und der Unterschied ist nicht kosmetisch.

          Bei der **Erstannahme** fehlt der Vertrag; ohne ihn gibt es
          keine Grundlage, Beschäftigtendaten im Auftrag zu verarbeiten,
          und die Verwaltung bleibt bis zum Haken zu.

          Bei einer **Vertragsänderung** besteht der Vertrag. § 13 Abs. 3
          der AGB sagt ausdrücklich: solange der Kunde nicht zugestimmt
          hat, gelten für ihn die bisherigen Bedingungen. Diese Seite darf
          ihn dann nicht festhalten — sie fragt, und „später" ist eine
          zulässige Antwort. Schweigen ist nach § 13 Abs. 2 ohnehin keine
          Zustimmung; ein Weiterklicken-Zwang würde daraus praktisch doch
          eine machen.
        */}
        <p className="mt-4 text-base leading-relaxed text-muted">
          {aenderung ? (
            <>
              Für <span className="text-text">{position.betriebName}</span> gibt es eine
              neue Fassung der Vertragsunterlagen. Bis du zustimmst, gelten die bisherigen
              Bedingungen weiter — du kannst also auch später entscheiden.
            </>
          ) : (
            <>
              Für <span className="text-text">{position.betriebName}</span> liegt uns noch
              keine Zustimmung vor. Das holen wir einmal nach — danach landest du wieder
              dort, wo du hinwolltest.
            </>
          )}
        </p>

        {offen.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
            {offen.map((dokument) => (
              <li
                key={dokument}
                className="rounded-blk border border-line px-2.5 py-1 uppercase tracking-[0.12em]"
              >
                {DOKUMENT_NAME[dokument]}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          <ZustimmungFormular ziel={ziel} />

          <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">
            Du bestätigst für den Betrieb, nicht für dich persönlich. An deinem Tarif,
            deiner Abrechnung und deinem Zahlungsmittel ändert sich dadurch nichts.
          </p>
        </div>

        {aenderung ? (
          <p className="mt-6">
            <Link
              href={ziel}
              className="text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-text"
            >
              Später entscheiden und weiterarbeiten
            </Link>
          </p>
        ) : (
          /*
            Der Ausgang aus der Sperre. Wer den Vertrag nicht (mehr)
            annehmen will, muss trotzdem kündigen und an seine Daten
            kommen können — sonst wäre die Zustimmung durch das Aussperren
            der Daten erzwungen. Beide Wege laufen über
            `betreteOhneTore()` und sind deshalb auch hier erreichbar.
          */
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <form action={aboVerwalten}>
              <button
                type="submit"
                className="font-medium text-muted underline underline-offset-4 transition-colors hover:text-text"
              >
                Abo verwalten oder kündigen
              </button>
            </form>
            <a
              href="/api/betrieb-export"
              className="font-medium text-muted underline underline-offset-4 transition-colors hover:text-text"
            >
              Daten exportieren
            </a>
          </div>
        )}

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

const DOKUMENT_NAME: Record<string, string> = {
  agb: "AGB",
  avv: "AVV",
  datenschutz: "Datenschutz",
};
