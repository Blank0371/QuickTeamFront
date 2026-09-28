import { FormMeldung } from "@/components/formular/felder";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { fuelle } from "@/i18n/text";
import { holeAbo } from "@/lib/abo";
import { formatiereDatum, preisZeile } from "@/lib/abo-konditionen";
import { plaene } from "@/lib/site";
import { aboKonditionen, holeAboFuerBetrieb, type AboKonditionen } from "@/lib/stripe";
import type { createClient } from "@/lib/supabase/server";
import { planOderBasic } from "@/lib/validierung";

import { aboVerwalten } from "./aktionen";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Abo und Abrechnung — der Weg zum Stripe-Kundenportal.
 *
 * Seit dem 2026-09-13 der reguläre Weg zur Kündigung (AGB § 6 Abs. 2:
 * „über die im Dienst oder beim Zahlungsdienstleister dafür vorgesehene
 * Funktion"). Vorher gab es nur die E-Mail.
 *
 * **Die Stripe-Abfrage darf die Seite nicht mitreissen.** Der Status
 * kommt aus unserer Zeile; Betrag, nächste Abbuchung und ein etwaiges
 * Kündigungsdatum stehen nur bei Stripe. Scheitert diese Abfrage, fehlen
 * die Zusatzangaben — die Einstellungen darüber und der Knopf bleiben.
 */
export async function AboAbschnitt({
  supabase,
  betriebId,
  email,
  meldung,
}: {
  supabase: SupabaseServerClient;
  betriebId: string;
  email: string;
  meldung: string | null;
}) {
  const abo = await holeAbo(supabase, betriebId);
  const planName = plaene.find((p) => p.id === planOderBasic(abo?.plan))?.name ?? null;

  let konditionen: AboKonditionen | null = null;
  try {
    const beiStripe = await holeAboFuerBetrieb({
      betriebId,
      email,
      kundeId: abo?.stripe_customer_id ?? null,
    });
    konditionen = beiStripe ? aboKonditionen(beiStripe) : null;
  } catch (fehler) {
    console.error(`[abo] Konditionen für ${betriebId} nicht lesbar: ${fehler}`);
  }

  const [alle, locale] = await Promise.all([holeTexte(), leseSprache()]);
  const t = alle.einstellungen.abo;

  const zeilen: string[] = [];
  if (konditionen) {
    const preis = preisZeile(konditionen, alle.aboKonditionen, locale);
    if (preis) zeilen.push(preis);
    if (konditionen.endetAm) {
      zeilen.push(fuelle(t.endet, { datum: formatiereDatum(konditionen.endetAm, locale) }));
    } else if (konditionen.testphaseEnde) {
      zeilen.push(
        fuelle(t.testphaseBis, { datum: formatiereDatum(konditionen.testphaseEnde, locale) }),
      );
    } else if (konditionen.periodeEnde) {
      zeilen.push(
        fuelle(t.naechsteAbbuchung, {
          datum: formatiereDatum(konditionen.periodeEnde, locale),
        }),
      );
    }
  }

  const meldungen: Record<string, string> = t.meldung;
  const status: Record<string, string> = t.status;
  const text = meldung ? meldungen[meldung] : undefined;

  return (
    <section aria-labelledby="abo-titel" className="mt-12 border-t border-line pt-8">
      <h2
        id="abo-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        {t.titel}
      </h2>

      {text ? (
        <div className="mt-4">
          <FormMeldung art="fehler">{text}</FormMeldung>
        </div>
      ) : null}

      {abo ? (
        <p className="mt-3 text-sm leading-relaxed text-text">
          {planName ? fuelle(t.plan, { plan: planName }) : t.abonnement} ·{" "}
          {status[abo.status] ?? abo.status}
          {zeilen.length > 0 ? (
            <span className="text-muted"> · {zeilen.join(" · ")}</span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{t.portalText}</p>

      <form action={aboVerwalten} className="mt-4">
        <button
          type="submit"
          className="rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
        >
          {t.verwalten}
        </button>
      </form>
    </section>
  );
}
