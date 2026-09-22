import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { einzelwert, meldungFuer } from "@/lib/auth-meldungen";
import { FormMeldung } from "@/components/formular/felder";
import { holeTexte } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { feldSchemata } from "@/lib/validierung";

import { CodeAbschnitt } from "./code-abschnitt";
import { KontoAbschnitt } from "./konto-abschnitt";

export const metadata: Metadata = {
  title: "Konto anlegen",
  description:
    "Leg dein QuickTeam-Konto an und bestätige deine E-Mail-Adresse mit einem Code — den Betrieb richtest du danach ein.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Die Kontoerstellung.
 *
 * Seit dem 2026-09-22 (siehe `CLAUDE.md`, `docs/claude-md-historie.md`)
 * legt diese Seite **nur ein Konto** an — der Betrieb entsteht getrennt in
 * `/einrichtung/betrieb`, erreichbar aus der Übersicht. Zwei Abschnitte
 * einer Seite, die sich aus dem ergeben, was ohnehin da ist:
 *
 *   A  keine Session, kein `?email=`   Zugangsdaten-Formular
 *   B  keine Session, mit `?email=`    Code-Eingabe, Daten zugeklappt darunter
 *
 * Wer bereits angemeldet ist, braucht keine Registrierung — `/einrichtung`
 * schickt ihn an die richtige Stelle (Übersicht, laufende Einrichtung oder
 * Dashboard). Der Übergang A → B läuft über `?email=`, damit der Schritt
 * einen Reload und einen Gerätewechsel übersteht — genau der Fall, für den
 * es Codes statt Links gibt.
 */
export default async function RegistrierenSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/einrichtung");

  const params = await searchParams;

  const geprueft = feldSchemata.email.safeParse(einzelwert(params["email"]) ?? "");
  const email = geprueft.success ? geprueft.data : null;

  const t = await holeTexte();
  const rt = t.registrierung;
  const meldung = meldungFuer(einzelwert(params["fehler"]), t.login.meldungen);

  const wartetAufCode = email !== null;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl leading-[1.1] sm:text-4xl">
          {wartetAufCode ? rt.code.titel : rt.daten.titel}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted">
          {wartetAufCode ? rt.code.lead : rt.daten.lead}
        </p>

        <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          {meldung ? (
            <div className="mb-6">
              <FormMeldung art="fehler">{meldung}</FormMeldung>
            </div>
          ) : null}

          {wartetAufCode ? (
            <>
              <CodeAbschnitt email={email} texte={rt} versandTexte={t.codeVersand} />

              <div className="mt-6 rounded-blk border border-line bg-surface-sunk p-5">
                <h2 className="font-display text-sm font-bold text-text">{rt.boxen.geraetTitel}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{rt.boxen.geraetText}</p>
              </div>

              <div className="mt-4 rounded-blk border border-line bg-surface-sunk p-5">
                <h2 className="font-display text-sm font-bold text-text">{rt.boxen.fristTitel}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{rt.boxen.fristText}</p>
              </div>

              {/*
                Abschnitt A bleibt erreichbar, aber zugeklappt: wer sich bei
                der Adresse vertippt hat, korrigiert sie hier und bekommt
                einen neuen Code, ohne die Seite zu verlassen.
              */}
              <details className="mt-4 rounded-blk border border-line bg-surface-sunk p-5">
                <summary className="cursor-pointer text-sm font-semibold text-text">
                  {rt.boxen.aendernSummary}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{rt.boxen.aendernText}</p>
                <div className="mt-5">
                  <KontoAbschnitt
                    idPraefix="aendern-"
                    texte={rt}
                    zustimmungTexte={t.zustimmungFeld}
                    vorbelegung={{ email }}
                  />
                </div>
              </details>
            </>
          ) : (
            <>
              <KontoAbschnitt texte={rt} zustimmungTexte={t.zustimmungFeld} />

              <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">
                {rt.fussnoteA}
                <strong className="font-semibold text-text">{rt.fussnote24}</strong>
                {rt.fussnoteB}
              </p>

              {/*
                B2B-Hinweis an der Stelle, an der das Konto entsteht: das
                Angebot steht Verbrauchern nicht offen (§ 1 Abs. 3 AGB).
              */}
              <p className="mt-4 text-xs leading-relaxed text-muted">{rt.b2b}</p>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
