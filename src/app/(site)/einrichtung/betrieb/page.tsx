import type { Metadata } from "next";
import Link from "next/link";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { betreteSchritt } from "@/lib/einrichtung";
import { holeTexte } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { LAENDER } from "@/lib/validierung";

import { BetriebFormular } from "./betrieb-formular";

export const metadata: Metadata = {
  title: "Betrieb einrichten",
  description:
    "Leg deinen Betrieb an: Name, Land, dein Name und die Zustimmung zu AGB und AVV.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Schritt 1 des Steppers: den Betrieb anlegen.
 *
 * Seit dem 2026-09-22 getrennt von der Kontoerstellung. Erreichbar für ein
 * angemeldetes Konto **ohne** eigenen Betrieb — der Regelweg führt aus der
 * Übersicht (`/dashboard/wechseln`, Knopf „Betrieb einrichten") hierher.
 *
 * Zwei Lagen, beide aus `betreteSchritt`:
 *   – kein Betrieb → das Anlege-Formular
 *   – Betrieb steht (Rück-Navigation) → erledigt, Weg nach vorn
 */
export default async function BetriebSeite() {
  const stand = await betreteSchritt("betrieb");
  const t = await holeTexte();
  const bt = t.betrieb;

  if (stand.betriebId !== null) {
    const supabase = await createClient();
    const { data: betrieb } = await supabase
      .from("betriebe")
      .select("name")
      .eq("id", stand.betriebId)
      .maybeSingle();

    return (
      <SchrittRahmen schritt="betrieb" stand={stand} titel={bt.erledigt.titel} lead={bt.erledigt.lead}>
        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="text-muted">{bt.erledigt.betriebLabel}</dt>
            <dd className="mt-1 font-medium text-text">
              {betrieb?.name ?? bt.erledigt.betriebFallback}
            </dd>
          </div>
        </dl>

        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">{bt.erledigt.hinweis}</p>

        <div className="mt-6">
          <Link
            href="/einrichtung"
            className="inline-block rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            {bt.erledigt.weiter}
          </Link>
        </div>
      </SchrittRahmen>
    );
  }

  const laender = LAENDER.map((land) => ({
    code: land.code,
    name: land.code === "AT" ? t.auswahl.landAT : t.auswahl.landDE,
  }));

  return (
    <SchrittRahmen schritt="betrieb" stand={stand} titel={bt.titel} lead={bt.lead}>
      <BetriebFormular texte={bt} zustimmungTexte={t.zustimmungFeld} laender={laender} />

      {/*
        B2B-Hinweis an der Stelle, an der der Vertrag geschlossen wird: das
        Angebot steht Verbrauchern nicht offen (§ 1 Abs. 3 AGB).
      */}
      <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">{bt.b2b}</p>
    </SchrittRahmen>
  );
}
