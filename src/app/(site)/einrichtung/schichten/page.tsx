import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { betreteSchritt } from "@/lib/einrichtung";
import { holeVorlagen, sichtbareVorlagen } from "@/lib/schichten";
import { holeRollen } from "@/lib/team";
import { createClient } from "@/lib/supabase/server";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { wochentageKurz, wochentageLang } from "@/lib/dashboard/kalender";

import { zumAbschluss } from "./aktionen";
import { VorlagenAbschnitt } from "./vorlagen-abschnitt";

export const metadata: Metadata = {
  title: "Schichtvorlagen",
  description:
    "Leg fest, wie eine gewöhnliche Woche in deinem Betrieb aussieht — je Schicht mit Mindestbesetzung pro Rolle.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Schritt 4 des Einrichtungs-Steppers: Schichtvorlagen.
 *
 * Braucht die Rollen aus Schritt 3 — `schicht_vorlage_mindestbesetzung`
 * hat einen Fremdschlüssel darauf, und ohne mindestens eine
 * Mindestbesetzungs-Zeile bliebe jede Vorlage in der App unsichtbar.
 *
 * Der Wochentag ist montagsbasiert (0 = Montag). Die Begründung und die
 * drei Belegstellen im App-Quelltext stehen in `src/lib/schichten.ts` —
 * wer hier etwas ändert, liest sie zuerst.
 */
export default async function SchichtenSeite() {
  const stand = await betreteSchritt("schichten");
  if (stand.betriebId === null) redirect("/einrichtung/betrieb");

  const supabase = await createClient();
  const [rollen, vorlagen] = await Promise.all([
    holeRollen(supabase, stand.betriebId),
    holeVorlagen(supabase, stand.betriebId),
  ]);

  /*
   * Ohne Rolle lässt sich hier gar nichts anlegen. Das kann nur
   * passieren, wenn jemand zwischendurch in der App die letzte Rolle
   * entfernt hat — zurück in Schritt 3 statt ein Formular zu zeigen,
   * dessen Mindestbesetzung leer bliebe.
   */
  if (rollen.length === 0) redirect("/einrichtung/team");

  const kannWeiter = sichtbareVorlagen(vorlagen).length > 0;

  const locale = await leseSprache();
  const st = (await holeTexte()).stepper.schichten;
  const tagKurz = wochentageKurz(locale);
  const tagLang = wochentageLang(locale);

  return (
    <SchrittRahmen
      schritt="schichten"
      stand={stand}
      titel={st.titel}
      lead={st.lead}
    >
      <VorlagenAbschnitt
        rollen={rollen}
        vorlagen={vorlagen}
        texte={st}
        tagKurz={tagKurz}
        tagLang={tagLang}
      />

      <form action={zumAbschluss} className="mt-10 border-t border-line pt-6">
        <button
          type="submit"
          disabled={!kannWeiter}
          aria-disabled={!kannWeiter}
          className="w-full rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {st.abschliessen}
        </button>
        {!kannWeiter ? (
          <p className="mt-3 text-sm text-muted">
            {st.ersteSchicht}
          </p>
        ) : null}
      </form>
    </SchrittRahmen>
  );
}
