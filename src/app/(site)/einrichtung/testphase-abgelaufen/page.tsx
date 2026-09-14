import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { aboVerwalten } from "@/app/dashboard/(arbeit)/einstellungen/aktionen";
import { Container } from "@/components/container";
import { ZahlungsFormular } from "@/components/einrichtung/zahlungs-formular";
import { FormMeldung } from "@/components/formular/felder";
import { holeAbo } from "@/lib/abo";
import { holeRechnungsangaben } from "@/lib/betrieb";
import { holeVorbelegung } from "@/lib/rechnung";
import { einzelwert } from "@/lib/auth-meldungen";
import { ermittleStand, pfadFuer } from "@/lib/einrichtung";
import { plaene, TESTPHASE_TAGE } from "@/lib/site";
import { pruefePreisGleichstand, zusammenfassungFortsetzen } from "@/lib/abo-konditionen";
import { aboKonditionen, erstelleSetupIntent, holeAboFuerBetrieb } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { planOderBasic } from "@/lib/validierung";
import { zahlungsmittelUebernehmen } from "@/lib/zahlung-aktionen";

export const metadata: Metadata = {
  title: "Testphase abgelaufen",
  description:
    "Deine Testphase ist vorbei. Hinterleg ein Zahlungsmittel, dann läuft dein Betrieb weiter — deine Daten bleiben bis zu 90 Tage erhalten.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Die einzige Seite, die website-seitig wirklich sperrt.
 *
 * Erreichbar über `status = 'pausiert'`. Der Wert kommt nicht aus einer
 * Datumsrechnung, sondern von Stripe: mit
 * `trial_settings.end_behavior.missing_payment_method = "pause"` geht das
 * Abo beim Ablauf ohne Karte auf `paused`, der Webhook schreibt daraus
 * `pausiert`. `betrieb_abonnements` hat gar keine Spalte für das Ende der
 * Testphase — wir könnten es selbst also nicht ausrechnen.
 *
 * Das Formular ist dasselbe Bauteil wie in Schritt 2. Nach erfolgreicher
 * Hinterlegung setzt `uebernimmZahlungsmittel` die Methode als Standard
 * **und** nimmt das pausierte Abo per `resume` wieder auf — dafür ist
 * `pause` gegenüber `cancel` gewählt worden: es entsteht kein neues Abo,
 * es läuft dasselbe weiter.
 */
export default async function TestphaseAbgelaufenSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const stand = await ermittleStand();
  if (stand === "nicht-angemeldet") redirect("/login");

  // Wer nicht gesperrt ist, hat hier nichts zu lesen.
  if (!stand.gesperrt || stand.betriebId === null) redirect(pfadFuer(stand));

  const params = await searchParams;

  /*
   * Rückkehr aus 3DS — dieselbe Behandlung wie in Schritt 2. Geht das
   * Übernehmen durch, entscheidet die Ableitung erneut, und die Sperre
   * ist dann weg.
   */
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

  const abo = await holeAbo(supabase, stand.betriebId);
  const planName =
    plaene.find((p) => p.id === planOderBasic(abo?.plan))?.name ?? "Low";

  const stripeAbo = await holeAboFuerBetrieb({
    betriebId: stand.betriebId,
    email: user?.email ?? "",
    kundeId: abo?.stripe_customer_id ?? null,
  });
  if (!stripeAbo) redirect("/einrichtung/zahlung");

  const rechnung = await holeRechnungsangaben(supabase, stand.betriebId);

  const kundeId =
    typeof stripeAbo.customer === "string" ? stripeAbo.customer : stripeAbo.customer.id;
  const intent = await erstelleSetupIntent(kundeId);

  /*
   * Hier wird mit dem Klick sofort abgebucht (`nimmAboWiederAuf` bezahlt
   * die offene Rechnung gleich mit). Deshalb steht der Betrag direkt über
   * dem Knopf, und der Knopf sagt, dass es kostet.
   */
  const konditionen = aboKonditionen(stripeAbo);
  pruefePreisGleichstand(planOderBasic(abo?.plan), konditionen);

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">
          Testphase
        </p>

        <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">
          Deine Testphase ist abgelaufen
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted">
          Die {TESTPHASE_TAGE} Tage sind vorbei, und es ist kein Zahlungsmittel
          hinterlegt. Dein Betrieb, dein Team und deine Schichtvorlagen bleiben bis
          90 Tage nach Ende der Testphase gespeichert, danach werden sie gelöscht (AGB
          § 5 Abs. 3). Sobald du eine Zahlungsmethode hinterlegst, läuft dein Plan{" "}
          <strong className="font-semibold text-text">{planName}</strong> weiter, wo er
          aufgehört hat.
        </p>

        <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          {uebernahmeFehler ? (
            <div className="mb-6">
              <FormMeldung art="fehler">{uebernahmeFehler}</FormMeldung>
            </div>
          ) : null}

          <ZahlungsFormular
            clientSecret={intent.clientSecret}
            zusammenfassung={zusammenfassungFortsetzen(konditionen)}
            knopfText="Kostenpflichtig fortsetzen"
            rueckkehrPfad="/einrichtung/testphase-abgelaufen"
            rechnung={await holeVorbelegung(
              rechnung?.name ?? null,
              rechnung?.land ?? null,
              kundeId,
            )}
          />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-muted">
          Es entsteht kein neues Abonnement — dein bestehendes wird fortgesetzt.
        </p>

        {/*
          Die beiden Wege, die auch ein gesperrter Betrieb gehen können
          muss: kündigen und seine Daten mitnehmen.

          Vorher gab es sie hier nicht, und über das Dashboard waren sie
          nicht erreichbar — diese Seite ist ja gerade die Umleitung, die
          jeden Dashboard-Aufruf abfängt. Wer nicht weiterzahlen wollte,
          hatte damit keinen Knopf zum Kündigen und keinen Zugang zu
          seinen Daten; übrig blieb die E-Mail. § 6 Abs. 4 der AGB gibt
          den Export ausdrücklich bis dreissig Tage **nach** Vertragsende,
          also erst recht währenddessen.

          Beide laufen über `betreteOhneTore()` und kommen deshalb an
          dieser Sperre vorbei, ohne sie aufzuweichen: geprüft werden
          Anmeldung, aktive Anstellung und Chef-Eigenschaft wie überall.
        */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-6 text-sm">
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
            download
            className="font-medium text-muted underline underline-offset-4 transition-colors hover:text-text"
          >
            Daten exportieren
          </a>
        </div>
      </div>
    </Container>
  );
}
