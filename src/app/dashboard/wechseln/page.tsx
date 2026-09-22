import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { SprachWahl } from "@/components/sprach-wahl";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { abmelden } from "@/lib/auth-aktionen";
import { sicheresZiel, ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import { holeEinladungen, holePositionen } from "@/lib/dashboard/position";
import { createClient } from "@/lib/supabase/server";

import { WahlListe } from "./wahl-liste";

export async function generateMetadata(): Promise<Metadata> {
  const t = await holeTexte();
  return {
    title: t.dashboard.wahl.metaTitel,
    description: t.dashboard.wahl.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Positionswahl.
 *
 * Liegt bewusst neben der Dashboard-Schale statt darunter: sie ist die
 * Antwort auf „keine Position gewählt" und dürfte deshalb nicht
 * ihrerseits eine Position voraussetzen. Sie prüft nur die Anmeldung.
 *
 * Sie hat zwei Aufgaben, die dieselbe Liste betreffen und deshalb
 * zusammengehören: zwischen mehreren Anstellungen wechseln und offene
 * Einladungen annehmen. In der App macht `select.tsx` genau das, und aus
 * demselben Grund.
 */
export default async function WechselnSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  /*
   * Wohin es nach der Wahl weitergeht. Das Tor hängt den Bereich an, aus
   * dem es umgeleitet hat; wer die Seite von Hand oder über „Position
   * wechseln" aufruft, bringt nichts mit und landet auf der Übersicht.
   */
  const params = await searchParams;
  const roh = params[ZIEL_PARAMETER];
  const ziel = sicheresZiel(Array.isArray(roh) ? roh[0] : roh);

  const [positionen, einladungen] = await Promise.all([
    holePositionen(supabase, user.id),
    holeEinladungen(supabase),
  ]);

  const [t, sprache] = await Promise.all([holeTexte(), leseSprache()]);
  const w = t.dashboard.wahl;
  const leer = positionen.length === 0 && einladungen.length === 0;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {/*
          Der Sprachumschalter steht auf dieser Seite bewusst mit im Inhalt:
          sie liegt neben der Dashboard-Schale und bekommt deren Topbar (mit
          dem Umschalter) nicht. Wer sich in einer Sprache angemeldet hat, die
          er kaum versteht, muss sie auch hier wechseln können, ohne erst eine
          Position wählen zu müssen.
        */}
        <div className="mb-6 flex justify-end">
          <SprachWahl aktiv={sprache} />
        </div>

        <h1 className="text-3xl leading-[1.1] sm:text-4xl">{w.titel}</h1>

        <p className="mt-4 text-base leading-relaxed text-muted">
          {positionen.length > 1 ? w.leadMehrere : w.lead}
        </p>

        <p className="mt-2 text-sm text-muted">{user.email}</p>

        <div className="mt-8">
          {leer ? (
            <div className="rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
              <h2 className="font-display text-lg text-text">{w.leerTitel}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{w.leerText}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {(() => {
                  const [vor, nach] = w.leerHinweis.split("{email}");
                  return (
                    <>
                      {vor}
                      <span className="text-text">{user.email}</span>
                      {nach}
                    </>
                  );
                })()}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/einrichtung/betrieb"
                  className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
                >
                  {w.betriebEroeffnen}
                </Link>
                <form action={abmelden}>
                  <button
                    type="submit"
                    className="rounded-blk px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
                  >
                    {t.dashboard.abmelden}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <WahlListe
              positionen={positionen}
              einladungen={einladungen}
              rollenNamen={t.dashboard.rolle}
              ziel={ziel}
              texte={{
                deineBetriebe: w.deineBetriebe,
                einladungen: w.einladungen,
                einladungenText: w.einladungenText,
                annehmen: w.annehmen,
              }}
            />
          )}
        </div>

        {!leer ? (
          <form action={abmelden} className="mt-10">
            <button
              type="submit"
              className="rounded-blk px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
            >
              {t.dashboard.abmelden}
            </button>
          </form>
        ) : null}
      </div>
    </Container>
  );
}
