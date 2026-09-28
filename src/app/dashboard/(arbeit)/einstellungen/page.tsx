import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { FormMeldung } from "@/components/formular/felder";
import { holeTexte } from "@/i18n/server";
import { einzelwert } from "@/lib/auth-meldungen";
import { holeEinstellungen } from "@/lib/dashboard/einstellungen";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { AboAbschnitt } from "./abo-abschnitt";
import { EinstellungenFormular } from "./einstellungen-formular";

export async function generateMetadata(): Promise<Metadata> {
  const { einstellungen } = await holeTexte();
  return {
    title: einstellungen.metaTitel,
    description: einstellungen.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Betriebseinstellungen — Chef-Bereich.
 *
 * Referenz für die Logik: `manager.tsx` (`BusinessSection`) in der
 * Expo-App; die Oberfläche folgt ihr ausdrücklich nicht, sondern dem
 * Designsystem dieses Repos.
 *
 * **Der Bereich erscheint für Angestellte gar nicht** — weder in der
 * Sidebar (das Layout filtert ihn heraus) noch hier. Das ist dieselbe
 * Linie wie bei Team und Planung: `rolle_typ` entscheidet über die
 * Existenz des Bereichs, nicht über seinen Inhalt. Ein leeres Formular
 * mit gesperrten Feldern wäre die schlechtere Antwort — es verspricht
 * eine Einstellung, die man nicht vornehmen kann.
 *
 * Die Prüfung steht trotzdem auch hier und nicht nur im Layout: die
 * Adresse ist erratbar, und ohne sie bekäme eine angestellte Person ein
 * Formular zu sehen, dessen Absenden dann an RLS scheitert.
 */
export default async function EinstellungenSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, position } = await betreteDashboard();
  const chef = istChef(position);

  const einstellungen = chef
    ? await holeEinstellungen(supabase, position.betriebId)
    : null;

  const aboMeldung = einzelwert((await searchParams)["abo"]) ?? null;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const alle = await holeTexte();
  const t = alle.einstellungen;

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.lead}</p>

        <div className="mt-8">
          {!chef ? (
            <FormMeldung art="fehler">{t.nurChef}</FormMeldung>
          ) : einstellungen === null ? (
            /*
             * Kein Formular mit Standardwerten anbieten: die Zeile legt
             * `trg_betrieb_erstelle_einstellungen` beim Anlegen des
             * Betriebs an, und es gibt keine INSERT-Policy, mit der wir
             * sie ersetzen könnten. Fehlt sie, ist das ein Datenproblem
             * und keine leere Eingabemaske.
             */
            <FormMeldung art="fehler">{t.keineZeile}</FormMeldung>
          ) : (
            <EinstellungenFormular
              start={einstellungen}
              texte={t}
              sprachNamen={{ de: alle.auswahl.spracheDE, en: alle.auswahl.spracheEN }}
            />
          )}
        </div>

        {chef ? (
          <AboAbschnitt
            supabase={supabase}
            betriebId={position.betriebId}
            email={user?.email ?? ""}
            meldung={aboMeldung}
          />
        ) : null}

        {chef ? (
          /*
            Der Datenexport nach § 6 Abs. 4 der AGB.

            Ein Link, kein Knopf mit Server Action: das Ergebnis ist eine
            Datei, und ein Route Handler liefert sie mit
            `Content-Disposition: attachment` aus, ohne dass die Seite
            dafür JavaScript braucht. `download` gibt dem Browser nur
            einen Vorschlag — den verbindlichen Dateinamen setzt der
            Handler.

            Bewusst **nicht** hinter der Zahlungssperre: § 6 Abs. 4 gibt
            den Export bis dreissig Tage nach Vertragsende. Deshalb
            erreichbar auch von der Sperrseite und vom Zustimmungs-Tor.
          */
          <section aria-labelledby="export-titel" className="mt-12 border-t border-line pt-8">
            <h2
              id="export-titel"
              className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
            >
              {t.exportTitel}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
              {t.exportText1}
            </p>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
              {t.exportText2}
            </p>
            <p className="mt-4">
              <a
                href="/api/betrieb-export"
                download
                className="inline-flex rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
              >
                {t.exportKnopf}
              </a>
            </p>
          </section>
        ) : null}

        {/*
          Die Kontolöschung steht am Fuss und ausserhalb des
          Einstellungs-Panels: sie gehört nicht zu den Werten, die man
          hier gelegentlich anpasst, sondern ist ein einmaliger,
          endgültiger Vorgang. Ein Link statt eines Knopfes — das
          eigentliche Löschen verlangt eine eigene Seite mit eigenen
          Warnungen.
        */}
        <section aria-labelledby="konto-titel" className="mt-12 border-t border-line pt-8">
          <h2
            id="konto-titel"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
          >
            {t.kontoTitel}
          </h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{t.kontoText}</p>
          <p className="mt-3">
            <Link
              href="/kontoloeschung"
              className="text-sm font-medium text-stop underline underline-offset-4"
            >
              {t.kontoLoeschen}
            </Link>
          </p>
        </section>
      </div>
    </Container>
  );
}
