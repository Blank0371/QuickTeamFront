import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import { customTarif, kontaktEmail, plaene, TESTPHASE_TAGE } from "@/lib/site";
import { softLaunchAktiv } from "@/lib/soft-launch";

export const metadata: Metadata = {
  title: "Preise",
  description:
    "Low für 29 €, Medium für 49 €, Business für 69 € im Monat — je nach Teamgröße. Grössere Betriebe und mehrere Standorte auf Anfrage. Immer mit 14 Tagen Testphase.",
  alternates: { canonical: "/preise" },
};

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
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">Preise</p>

      <h1 className="mt-3 max-w-3xl text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
        Ein Preis pro Betrieb. Keine Rechnung pro Kopf.
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        Such dir die Grösse aus, die zu deinem Team passt. Die ersten{" "}
        <strong className="font-semibold text-text">{TESTPHASE_TAGE} Tage</strong> sind
        kostenlos — Zahlungsdaten kannst du beim Einrichten auch überspringen und später
        nachtragen.
      </p>

      <section aria-labelledby="plaene-titel" className="mt-12">
        <h2 id="plaene-titel" className="sr-only">
          Die drei Pläne
        </h2>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plaene.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-col rounded-panel border border-line bg-surface p-6 shadow-card"
            >
              <h3 className="font-display text-xl">{plan.name}</h3>

              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-3xl text-text">{plan.preis} €</span>
                <span className="text-sm text-muted">{t.landing.proMonat}</span>
                <span className="text-xs text-muted">{t.landing.preiseUst}</span>
              </p>

              <p className="mt-3 text-sm font-medium text-text">{t.planGrenzen[plan.id]}</p>

              <p className="mt-4 grow text-sm leading-relaxed text-muted">
                {TESTPHASE_TAGE} Tage testen, danach monatlich. Jederzeit kündbar.
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">
          {t.landing.preiseB2b}
        </p>

        {/*
          Derselbe Schalter wie in Kopfzeile, Fussbereich und Middleware.
          Steht die Sperre, führte ein Knopf auf `/registrieren` ins
          Leere — dann steht dort die ehrliche Auskunft statt eines
          Formulars.
        */}
        {softLaunchAktiv() ? (
          <p className="mt-8 max-w-xl rounded-blk border border-dashed border-line px-5 py-4 text-sm leading-relaxed text-muted">
            <span className="font-medium text-text">Bald verfügbar.</span> QuickTeam
            startet in Kürze. Den Plan wählst du dann während der Einrichtung — wechseln
            geht dort jederzeit.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/registrieren"
              className="rounded-blk bg-signal px-6 py-3 text-center text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              Betrieb anlegen
            </Link>
            <p className="text-sm text-muted">
              Den Plan wählst du während der Einrichtung — wechseln geht dort jederzeit.
            </p>
          </div>
        )}
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
              Kein Tarif zum Anklicken
            </p>

            <h2 id="custom-titel" className="mt-2 font-display text-lg text-text">
              {customTarif.name} — {t.customTarif.grenze}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Mehrere Standorte oder mehr als 50 Mitarbeiter lassen sich nicht sinnvoll
              klicken. Sag uns, wie dein Betrieb aussieht — Kette, Franchise oder zwei
              Lokale unter einer Leitung — und wir schneiden das darauf zu. Der Preis
              steht danach fest, nicht vorher:{" "}
              <span className="font-medium text-text">{t.customTarif.preis}</span>.
            </p>
          </div>

          {kontaktEmail ? (
            <a
              href={`mailto:${kontaktEmail}?subject=${encodeURIComponent("Custom-Tarif für meinen Betrieb")}`}
              className="shrink-0 self-start rounded-blk border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk lg:self-auto"
            >
              Custom anfragen
            </a>
          ) : (
            /*
             * Ohne hinterlegte Adresse gibt es keinen Knopf, der ins
             * Leere führt. Dieselbe Regel wie bei den Store-Badges:
             * lieber sichtbar angekündigt als tot verlinkt.
             */
            <p className="shrink-0 self-start rounded-blk border border-dashed border-line px-5 py-3 text-sm text-muted lg:self-auto">
              Kontaktadresse folgt in Kürze.
            </p>
          )}
        </section>
      </div>

    </Container>
  );
}
