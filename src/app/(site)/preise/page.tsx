import type { Metadata } from "next";

import { Container } from "@/components/container";
import { PreisListe } from "@/components/preise/preis-liste";
import { holeTexte } from "@/i18n/server";
import { fuelle } from "@/i18n/text";
import { bauePreisKarten } from "@/lib/preis-karten";
import { customTarif, kontaktEmail, TESTPHASE_TAGE } from "@/lib/site";
import { softLaunchAktiv } from "@/lib/soft-launch";

export async function generateMetadata(): Promise<Metadata> {
  const { preise } = await holeTexte();
  return {
    title: preise.metaTitel,
    description: preise.metaBeschreibung,
    alternates: { canonical: "/preise" },
  };
}

/**
 * Reine Marketingseite. Die Planwahl ist seit dem 2026-08-19 Teil von
 * Schritt 2 des Einrichtungs-Steppers — hier wird kein Plan mitgegeben,
 * deshalb drei Karten und ein gemeinsamer Knopf.
 *
 * Custom steht bewusst neben den drei Karten und nicht als vierte: der
 * Tarif hat keine Plan-ID, läuft nicht über den Self-Service und würde in
 * einer Reihe mit den anderen so aussehen, als könnte man ihn anklicken.
 */
export default async function PreiseSeite() {
  const t = await holeTexte();
  return (
    <Container className="py-14 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">
        {t.preise.kennzeichen}
      </p>

      <h1 className="mt-3 max-w-3xl text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
        {t.preise.titel}
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        {t.preise.leadVor}
        <strong className="font-semibold text-text">
          {fuelle(t.preise.leadTage, { n: TESTPHASE_TAGE })}
        </strong>
        {t.preise.leadNach}
      </p>

      <section aria-labelledby="plaene-titel" className="mt-12">
        <h2 id="plaene-titel" className="sr-only">
          {t.preise.plaeneTitel}
        </h2>

        <PreisListe
          karten={bauePreisKarten(t)}
          proMonat={t.landing.proMonat}
          proJahr={t.landing.proJahr}
          monatlich={t.landing.preiseMonatlich}
          jaehrlich={t.landing.preiseJaehrlich}
          vorteil={t.landing.preiseJahrVorteil}
          ustHinweis={t.landing.preiseUst}
          testMonat={fuelle(t.preise.testMonat, { n: TESTPHASE_TAGE })}
          testJahr={fuelle(t.preise.testJahr, { n: TESTPHASE_TAGE })}
          b2b={t.landing.preiseB2b}
          authOffen={!softLaunchAktiv()}
          baldLabel={t.landing.preiseBald}
          baldText={t.landing.preiseBaldText}
          betriebAnlegen={t.preise.betriebAnlegen}
          planHinweis={t.preise.planHinweis}
        />
      </section>

      {/*
        ─────────────────────────────────────────────────────────────
         Custom ist kein vierter Preis, und darf auch nicht wie einer
         aussehen.
        ─────────────────────────────────────────────────────────────

        Bis zum 2026-08-29 stand hier ein Block im selben Zuschnitt wie
        die drei Karten darüber: `rounded-panel`, gleiche Polsterung,
        Überschrift in Display-Schrift, rechts daneben ein Betrag. Dass
        er breiter war und eine Zeile tiefer lag, hat den Eindruck nicht
        aufgehoben — er las sich als vierte, etwas grössere Preiskarte.

        Das ist inhaltlich falsch. `betrieb_abonnements.plan` lässt per
        CHECK nur `basic`, `pro` und `business` zu; Custom hat keine
        Plan-ID, keinen Preis und keinen Weg durch die Planauswahl in
        Schritt 2. Wer ihn anklicken will, kann es gar nicht — er ist
        eine Kontaktaufnahme.

        Deshalb jetzt ein Streifen und keine Karte: quer statt hoch,
        keine Schattierung, kleinerer Radius, eine Signalkante links,
        und der Betrag steht als Satzteil statt als Zahl in
        Display-Schrift. Die waagrechte Trennlinie darüber sagt, dass
        hier etwas anderes anfängt.
      */}
      <div className="mt-14 border-t border-line pt-10">
        <section
          aria-labelledby="custom-titel"
          className="flex flex-col gap-5 rounded-card border border-line border-l-4 border-l-signal bg-surface-sunk px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:gap-8"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">
              {t.customTarif.kennzeichen}
            </p>

            <h2 id="custom-titel" className="mt-2 font-display text-lg text-text">
              {customTarif.name} — {t.customTarif.grenze}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {t.customTarif.beschreibung}{" "}
              <span className="font-medium text-text">{t.customTarif.preis}</span>.
            </p>
          </div>

          {kontaktEmail ? (
            <a
              href={`mailto:${kontaktEmail}?subject=${encodeURIComponent(t.customTarif.betreff)}`}
              className="shrink-0 self-start rounded-blk border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk lg:self-auto"
            >
              {t.customTarif.anfragen}
            </a>
          ) : (
            /*
             * Ohne hinterlegte Adresse gibt es keinen Knopf, der ins
             * Leere führt. Dieselbe Regel wie bei den Store-Badges:
             * lieber sichtbar angekündigt als tot verlinkt.
             */
            <p className="shrink-0 self-start rounded-blk border border-dashed border-line px-5 py-3 text-sm text-muted lg:self-auto">
              {t.customTarif.kontaktFolgt}
            </p>
          )}
        </section>
      </div>

    </Container>
  );
}
