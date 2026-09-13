import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { FormMeldung } from "@/components/formular/felder";
import { holeAbo } from "@/lib/abo";
import { einzelwert } from "@/lib/auth-meldungen";
import { betreteSchritt } from "@/lib/einrichtung";
import { plaene, TESTPHASE_TAGE } from "@/lib/site";
import {
  formatiereDatum,
  preisZeile,
  pruefePreisGleichstand,
  zusammenfassungSchritt,
} from "@/lib/abo-konditionen";
import { aboKonditionen, erstelleSetupIntent, holeAboFuerBetrieb } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { planOderBasic } from "@/lib/validierung";

import { zahlungsmittelUebernehmen } from "@/lib/zahlung-aktionen";
import { PlanAuswahl } from "./plan-auswahl";
import { ZahlungsFormular } from "@/components/einrichtung/zahlungs-formular";
import { holeTexte } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Plan und Zahlung",
  description:
    "Wähle deinen Plan und hinterlege ein Zahlungsmittel — oder überspring den Schritt und trag es später nach.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Schritt 2 des Einrichtungs-Steppers.
 *
 * Zwei Ansichten auf derselben Route, unterschieden über `?zahlen=1`:
 * zuerst die Plan-Auswahl, danach das eingebettete Payment Element. Der
 * Übergang läuft über eine Server Action, weil dazwischen das Abonnement
 * bei Stripe entsteht — ein blosser Query-Parameter auf einem Link würde
 * diese Schreiboperation von jedem Prefetch auslösen lassen.
 *
 * Dritter Fall: `?setup_intent=` kommt von Stripe zurück, wenn eine
 * Zahlungsmethode den Weg über 3DS genommen hat. Dann ist die Bestätigung
 * schon passiert und es fehlt nur noch das Übernehmen.
 */
export default async function ZahlungSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await holeTexte();
  const stand = await betreteSchritt("zahlung");
  if (stand === null) redirect("/einrichtung/konto");

  const params = await searchParams;
  const betriebId = stand.betriebId;
  if (betriebId === null) redirect("/einrichtung/konto");

  /* ---------------------------------------------------------------- */
  /* Rückkehr von 3DS                                                  */
  /* ---------------------------------------------------------------- */

  const zurueckVon3ds = einzelwert(params["setup_intent"]);
  let uebernahmeFehler: string | null = null;

  if (zurueckVon3ds) {
    const ergebnis = await zahlungsmittelUebernehmen(zurueckVon3ds);
    if (ergebnis.ok) redirect("/einrichtung");
    uebernahmeFehler = ergebnis.nachricht;
  }

  const supabase = await createClient();
  const abo = await holeAbo(supabase, betriebId);
  const gewaehlt = planOderBasic(abo?.plan);
  const planName = plaene.find((p) => p.id === gewaehlt)?.name ?? "Low";

  /* ---------------------------------------------------------------- */
  /* Ansicht 2: Zahlungsmittel hinterlegen                             */
  /* ---------------------------------------------------------------- */

  if (einzelwert(params["zahlen"]) === "1" || zurueckVon3ds) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const stripeAbo = await holeAboFuerBetrieb({
      betriebId,
      email: user?.email ?? "",
      kundeId: abo?.stripe_customer_id ?? null,
    });

    /*
     * Ohne Abonnement gibt es keinen Kunden, an den ein SetupIntent
     * hängen könnte. Das passiert, wenn jemand die Adresse mit `?zahlen=1`
     * direkt aufruft, ohne vorher einen Plan gewählt zu haben — zurück
     * zur Auswahl statt einer Fehlerseite.
     */
    if (!stripeAbo) redirect("/einrichtung/zahlung");

    const kundeId =
      typeof stripeAbo.customer === "string" ? stripeAbo.customer : stripeAbo.customer.id;
    const intent = await erstelleSetupIntent(kundeId);

    /*
     * Betrag und Testphasenende aus dem Abo, nicht aus `plaene` und
     * `TESTPHASE_TAGE`: wer am zwölften Tag zurückkommt, hat keine
     * vierzehn Tage mehr, und abgebucht wird der Stripe-Preis, nicht der
     * Anzeigepreis. Siehe `src/lib/abo-konditionen.ts`.
     */
    const konditionen = aboKonditionen(stripeAbo);
    pruefePreisGleichstand(gewaehlt, konditionen);
    const preis = preisZeile(konditionen);

    return (
      <SchrittRahmen
        schritt="zahlung"
        stand={stand}
        titel="Zahlungsmittel hinterlegen"
        lead={
          konditionen.testphaseEnde
            ? `Plan ${planName}${preis ? `, ${preis}` : ""}. Jetzt wird nichts abgebucht — die Testphase läuft bis ${formatiereDatum(konditionen.testphaseEnde)}.`
            : `Plan ${planName}${preis ? `, ${preis}` : ""}.`
        }
      >
        {uebernahmeFehler ? (
          <div className="mb-6">
            <FormMeldung art="fehler">{uebernahmeFehler}</FormMeldung>
          </div>
        ) : null}

        <ZahlungsFormular
          clientSecret={intent.clientSecret}
          zusammenfassung={zusammenfassungSchritt(konditionen)}
        />

        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          <Link
            href="/einrichtung/zahlung"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            Zurück zur Plan-Auswahl
          </Link>
          {" "}— dort kannst du den Schritt auch überspringen.
        </p>
      </SchrittRahmen>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Ansicht 1: Plan wählen                                            */
  /* ---------------------------------------------------------------- */

  return (
    <SchrittRahmen
      schritt="zahlung"
      stand={stand}
      titel="Plan wählen"
      lead={
        /*
         * Die vierzehn Tage gelten ab der ersten Planwahl, nicht ab jedem
         * Aufruf dieser Seite — ein Planwechsel verlängert die Testphase
         * nicht (`wechslePlan` lässt `trial_end` unberührt).
         */
        abo?.stripe_subscription_id
          ? "Deine Testphase läuft bereits seit der ersten Planwahl; ein Planwechsel verlängert sie nicht. Das Zahlungsmittel kannst du jetzt hinterlegen oder später nachtragen."
          : `${TESTPHASE_TAGE} Tage kostenlos, danach monatlich. Das Zahlungsmittel kannst du gleich hinterlegen oder später nachtragen — die Testphase läuft in beiden Fällen.`
      }
    >
      <PlanAuswahl
        aktuell={gewaehlt}
        grenzen={t.planGrenzen}
        proMonat={t.landing.proMonat}
        ustHinweis={t.landing.preiseUstAlle}
      />
    </SchrittRahmen>
  );
}
