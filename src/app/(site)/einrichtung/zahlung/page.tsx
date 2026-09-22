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
import { plaene } from "@/lib/site";
import {
  preisZeile,
  pruefePreisGleichstand,
  zusammenfassungNeuabschluss,
} from "@/lib/abo-konditionen";
import {
  aboKonditionen,
  erstelleSetupIntent,
  holeAboFuerBetrieb,
  holeUid,
  lesePendingBetrieb,
  suchePendingKunde,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { LAENDER, planOderBasic } from "@/lib/validierung";

import { betriebAbschliessen, rechnungPendingSpeichern } from "@/lib/zahlung-aktionen";
import { planMerken } from "./aktionen";
import { PlanAuswahl } from "./plan-auswahl";
import { ZahlungsFormular } from "@/components/einrichtung/zahlungs-formular";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";

export const metadata: Metadata = {
  title: "Plan und Zahlung",
  description:
    "Wähle deinen Plan und hinterlege ein Zahlungsmittel — dein Betrieb wird angelegt, sobald die Zahlung bestätigt ist.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Schritt 2 des Einrichtungs-Steppers.
 *
 * Seit dem 2026-09-22 (Nutzerwunsch) gibt es keine Testphase mehr: das Abo
 * ist sofort fällig, ein 100-%-Rabattcode macht die erste Rechnung 0,00.
 * Für einen **neuen** Betrieb entsteht die `betriebe`-Zeile erst, wenn die
 * Zahlung bestätigt ist — deshalb läuft dieser Schritt dann über den
 * Pending-Kunden (Betriebsdaten in der Stripe-Metadata), und der Betrieb
 * wird am Ende von `betriebAbschliessen` angelegt.
 *
 * Für einen **bestehenden** Betrieb (Neuabschluss nach Kündigung) läuft der
 * gewohnte Weg über `betrieb_abonnements` und `zahlungsmittelUebernehmen`.
 *
 * Zwei Ansichten je Weg, unterschieden über `?zahlen=1`: erst die
 * Plan-Auswahl, danach das eingebettete Payment Element. `?setup_intent=`
 * kommt von Stripe nach 3DS zurück.
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

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const locale = await leseSprache();
  const sz = t.stepper.zahlung;

  const zurueckVon3ds = einzelwert(params["setup_intent"]);
  const zeigeZahlen = einzelwert(params["zahlen"]) === "1" || Boolean(zurueckVon3ds);

  /* ================================================================ */
  /* Neuer Betrieb: Pending-Weg (Betrieb entsteht nach der Zahlung)    */
  /* ================================================================ */

  if (stand.betriebId === null) {
    const kunde = await suchePendingKunde({ userId: user?.id ?? "", email });
    if (!kunde) redirect("/einrichtung/betrieb");
    const pending = lesePendingBetrieb(kunde);

    /* ---- Ansicht 1: Plan wählen ---- */
    if (!zeigeZahlen) {
      const intervall = (await leseAbrechnung()) ?? "monat";
      const gewaehlt = planOderBasic(pending?.plan ?? undefined);
      return (
        <SchrittRahmen schritt="zahlung" stand={stand} titel={sz.titelPlan} lead={sz.leadBezahlt}>
          <PlanAuswahl
            aktuell={gewaehlt}
            intervall={intervall}
            grenzen={t.planGrenzen}
            proMonat={t.landing.proMonat}
            proJahr={t.landing.proJahr}
            ustHinweis={t.landing.preiseUstAlle}
            uidFeld={null}
            texte={sz}
            aktion={planMerken}
          />
        </SchrittRahmen>
      );
    }

    /* ---- Ansicht 2: Zahlung ---- */
    if (!pending?.plan || !pending.intervall) redirect("/einrichtung/zahlung");

    let uebernahmeFehler: string | null = null;
    if (zurueckVon3ds) {
      const ergebnis = await betriebAbschliessen(zurueckVon3ds);
      if (ergebnis.ok) redirect("/einrichtung");
      uebernahmeFehler = ergebnis.nachricht;
    }

    const intent = await erstelleSetupIntent(kunde.id);
    const plan = plaene.find((p) => p.id === pending.plan);
    const planName = plan?.name ?? "Low";
    const jaehrlich = pending.intervall === "jahr";
    const preisText = plan
      ? `${jaehrlich ? plan.preisJahr : plan.preis} € ${jaehrlich ? t.landing.proJahr : t.landing.proMonat}`
      : "";
    const zusammenfassung = [`${sz.planLabel}: ${planName}`, preisText].filter(
      (z): z is string => z.length > 0,
    );

    return (
      <SchrittRahmen
        schritt="zahlung"
        stand={stand}
        titel={sz.titelMittel}
        lead={sz.leadSofort
          .replace("{plan}", planName)
          .replace("{preis}", preisText ? `, ${preisText}` : "")}
      >
        {uebernahmeFehler ? (
          <div className="mb-6">
            <FormMeldung art="fehler">{uebernahmeFehler}</FormMeldung>
          </div>
        ) : null}

        <ZahlungsFormular
          clientSecret={intent.clientSecret}
          zusammenfassung={zusammenfassung}
          knopfText={sz.knopfSofort}
          texte={t.stepper.zahlungsFormular}
          rechnungTexte={t.stepper.rechnung}
          laender={laender}
          locale={locale}
          rechnung={await holeVorbelegung(pending.name, pending.land, kunde.id)}
          rechnungAktion={rechnungPendingSpeichern}
          finalisieren={betriebAbschliessen}
          mitCoupon={false}
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

  /* ================================================================ */
  /* Bestehender Betrieb: Neuabschluss nach Kündigung                  */
  /* ================================================================ */

  const betriebId = stand.betriebId;
  const abo = await holeAbo(supabase, betriebId);
  const rechnung = await holeRechnungsangaben(supabase, betriebId);
  const gewaehlt = planOderBasic(abo?.plan);
  const planName = plaene.find((p) => p.id === gewaehlt)?.name ?? "Low";

  /* ---- Ansicht 2: Zahlungsmittel hinterlegen ---- */
  if (zeigeZahlen) {
    const stripeAbo = await holeAboFuerBetrieb({
      betriebId,
      email,
      kundeId: abo?.stripe_customer_id ?? null,
    });

    if (!stripeAbo) redirect("/einrichtung/zahlung");

    const kundeId =
      typeof stripeAbo.customer === "string" ? stripeAbo.customer : stripeAbo.customer.id;
    const intent = await erstelleSetupIntent(kundeId);

    const konditionen = aboKonditionen(stripeAbo);
    pruefePreisGleichstand(gewaehlt, konditionen);
    const preis = preisZeile(konditionen);

    const preisTeil = preis ? `, ${preis}` : "";

    return (
      <SchrittRahmen
        schritt="zahlung"
        stand={stand}
        titel={sz.titelMittel}
        lead={sz.leadSofort.replace("{plan}", planName).replace("{preis}", preisTeil)}
      >
        <ZahlungsFormular
          clientSecret={intent.clientSecret}
          zusammenfassung={zusammenfassungNeuabschluss(konditionen)}
          knopfText={sz.knopfSofort}
          texte={t.stepper.zahlungsFormular}
          rechnungTexte={t.stepper.rechnung}
          laender={laender}
          locale={locale}
          rechnung={await holeVorbelegung(rechnung?.name ?? null, rechnung?.land ?? null, kundeId)}
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

  /* ---- Ansicht 1: Plan wählen ---- */
  let uidFeld: { vorbelegt: string | null; land: "AT" | "DE" } | null = null;
  if (rechnung?.land === "AT" || rechnung?.land === "DE") {
    let vorbelegt: string | null = null;
    if (abo?.stripe_customer_id) {
      try {
        vorbelegt = await holeUid(abo.stripe_customer_id);
      } catch (ursache) {
        const text = ursache instanceof Error ? ursache.message : String(ursache);
        console.error(`[zahlung] holeUid: ${text}`);
      }
    }
    uidFeld = { vorbelegt, land: rechnung.land };
  }

  const intervall = (await leseAbrechnung()) ?? "monat";

  return (
    <SchrittRahmen schritt="zahlung" stand={stand} titel={sz.titelPlan} lead={sz.leadBezahlt}>
      <PlanAuswahl
        aktuell={gewaehlt}
        intervall={intervall}
        grenzen={t.planGrenzen}
        proMonat={t.landing.proMonat}
        proJahr={t.landing.proJahr}
        ustHinweis={t.landing.preiseUstAlle}
        uidFeld={uidFeld}
        texte={sz}
      />
    </SchrittRahmen>
  );
}
