import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { FormMeldung } from "@/components/formular/felder";
import { holeAbo } from "@/lib/abo";
import { leseAbrechnung } from "@/lib/abrechnung-merker";
import { holeVorbelegung } from "@/lib/rechnung";
import { einzelwert } from "@/lib/auth-meldungen";
import { holeRechnungsangaben } from "@/lib/betrieb";
import { betreteSchritt } from "@/lib/einrichtung";
import { plaene, TESTPHASE_TAGE } from "@/lib/site";
import {
  formatiereDatum,
  preisZeile,
  pruefePreisGleichstand,
  zusammenfassungNeuabschluss,
  zusammenfassungSchritt,
} from "@/lib/abo-konditionen";
import {
  aboKonditionen,
  erstelleSetupIntent,
  holeAboFuerBetrieb,
  holeAboVerlauf,
  holeUid,
  intervallVonAbo,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { LAENDER, planOderBasic } from "@/lib/validierung";

import { zahlungsmittelUebernehmen } from "@/lib/zahlung-aktionen";
import { PlanAuswahl } from "./plan-auswahl";
import { ZahlungsFormular } from "@/components/einrichtung/zahlungs-formular";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";

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
  const laender = LAENDER.map((land) => ({
    code: land.code,
    name: land.code === "AT" ? t.auswahl.landAT : t.auswahl.landDE,
  }));
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const abo = await holeAbo(supabase, betriebId);
  const rechnung = await holeRechnungsangaben(supabase, betriebId);
  const gewaehlt = planOderBasic(abo?.plan);
  const planName = plaene.find((p) => p.id === gewaehlt)?.name ?? "Low";

  /* ---------------------------------------------------------------- */
  /* Ansicht 2: Zahlungsmittel hinterlegen                             */
  /* ---------------------------------------------------------------- */

  if (einzelwert(params["zahlen"]) === "1" || zurueckVon3ds) {
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

    /*
     * Neuabschluss ohne Testphase: die erste Rechnung ist offen, und das
     * Hinterlegen bezahlt sie (`uebernimmZahlungsmittel`). Das muss vor
     * und auf dem Knopf stehen, wie auf der Sperrseite.
     */
    const sofort = stripeAbo.status === "incomplete";

    const sz = t.stepper.zahlung;
    const preisTeil = preis ? `, ${preis}` : "";
    const vorlage = konditionen.testphaseEnde
      ? sz.leadTestphase.replace("{datum}", formatiereDatum(konditionen.testphaseEnde))
      : sofort
        ? sz.leadSofort
        : sz.leadNur;

    return (
      <SchrittRahmen
        schritt="zahlung"
        stand={stand}
        titel={sz.titelMittel}
        lead={vorlage.replace("{plan}", planName).replace("{preis}", preisTeil)}
      >
        {uebernahmeFehler ? (
          <div className="mb-6">
            <FormMeldung art="fehler">{uebernahmeFehler}</FormMeldung>
          </div>
        ) : null}

        <ZahlungsFormular
          clientSecret={intent.clientSecret}
          zusammenfassung={
            sofort
              ? zusammenfassungNeuabschluss(konditionen)
              : zusammenfassungSchritt(konditionen)
          }
          knopfText={sofort ? sz.knopfSofort : undefined}
          texte={t.stepper.zahlungsFormular}
          rechnungTexte={t.stepper.rechnung}
          laender={laender}
          locale={await leseSprache()}
          rechnung={await holeVorbelegung(
            rechnung?.name ?? null,
            rechnung?.land ?? null,
            kundeId,
          )}
        />

        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          <Link
            href="/einrichtung/zahlung"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            {sz.zurueckLink}
          </Link>
          {sz.zurueckRest}
        </p>
      </SchrittRahmen>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Ansicht 1: Plan wählen                                            */
  /* ---------------------------------------------------------------- */

  /*
   * Das UID-Feld nur für österreichische Betriebe. Eine schon hinterlegte
   * Nummer wird vorbelegt; kommt Stripe gerade nicht zurück, bleibt das
   * Feld eben leer — dafür soll die Planwahl nicht ausfallen.
   */
  let uidFeld: { vorbelegt: string | null } | null = null;
  if (rechnung?.land === "AT") {
    let vorbelegt: string | null = null;
    if (abo?.stripe_customer_id) {
      try {
        vorbelegt = await holeUid(abo.stripe_customer_id);
      } catch (ursache) {
        const text = ursache instanceof Error ? ursache.message : String(ursache);
        console.error(`[zahlung] holeUid: ${text}`);
      }
    }
    uidFeld = { vorbelegt };
  }

  /*
   * Ob diesem Betrieb noch eine Testphase zusteht, entscheidet
   * `erstelleAbo` — nach derselben Frage an Stripe, die hier gestellt
   * wird. Die Seite fragt nur, damit sie nicht „14 Tage kostenlos"
   * verspricht, wo gleich abgebucht wird. Ohne Testphase ist, wer schon
   * Abos hatte und keins mehr lebend, oder nur ein unbezahltes.
   */
  const verlauf = await holeAboVerlauf({
    betriebId,
    email: user?.email ?? "",
    kundeId: abo?.stripe_customer_id ?? null,
  });
  const ohneTestphase =
    verlauf.anzahl > 0 && (verlauf.lebend === null || verlauf.lebend.status === "incomplete");

  /*
   * Monatlich oder jährlich hat der Besucher auf der Preisseite gewählt
   * (`abrechnung-merker.ts`). Schritt 2 zeigt keinen eigenen Schalter,
   * sondern nur den passenden Preis und eine lesende Zeile — die Wahl selbst
   * fällt auf `/preise`. Ohne Cookie zählt das Intervall eines schon
   * bestehenden Abos, sonst monatlich — dieselbe Rangfolge wie in
   * `planWaehlen`, damit Anzeige und späterer Abschluss übereinstimmen.
   */
  const intervall =
    (await leseAbrechnung()) ??
    (verlauf.lebend ? intervallVonAbo(verlauf.lebend) : "monat");
  const jaehrlich = intervall === "jahr";

  const sz = t.stepper.zahlung;

  return (
    <SchrittRahmen
      schritt="zahlung"
      stand={stand}
      titel={sz.titelPlan}
      lead={
        /*
         * Die vierzehn Tage gelten ab der ersten Planwahl, nicht ab jedem
         * Aufruf dieser Seite — ein Planwechsel verlängert die Testphase
         * nicht (`wechslePlan` lässt `trial_end` unberührt).
         */
        ohneTestphase
          ? sz.leadOhneTestphase
          : verlauf.lebend
            ? sz.leadLebend
            : sz.leadNeu
                .replace("{tage}", String(TESTPHASE_TAGE))
                .replace("{intervall}", jaehrlich ? sz.jaehrlich : sz.monatlich)
      }
    >
      <PlanAuswahl
        aktuell={gewaehlt}
        intervall={intervall}
        grenzen={t.planGrenzen}
        proMonat={t.landing.proMonat}
        proJahr={t.landing.proJahr}
        ustHinweis={t.landing.preiseUstAlle}
        uidFeld={uidFeld}
        ohneTestphase={ohneTestphase}
        texte={sz}
      />
    </SchrittRahmen>
  );
}
