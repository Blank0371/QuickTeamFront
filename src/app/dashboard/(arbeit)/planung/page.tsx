import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import {
  holeOffeneStellen,
  holeOhneSollstunden,
  holeZyklen,
  naechsterMonat,
  zaehleVorschlaege,
} from "@/lib/dashboard/planung";
import { holeVorlagen, sichtbareVorlagen } from "@/lib/schichten";
import { supabaseEnv } from "@/lib/supabase/env";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { SollstundenWarnung } from "./sollstunden-warnung";
import { ZyklusFormular } from "./zyklus-formular";
import { ZyklusListe } from "./zyklus-liste";

export async function generateMetadata(): Promise<Metadata> {
  const { planung } = await holeTexte();
  return {
    title: planung.metaTitel,
    description: planung.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Planungszeiträume.
 *
 * Erster Teil der Planung: der Rahmen. Das Erzeugen der Schichten läuft
 * über die Edge Function `plan-generieren` und kommt eigenständig — es
 * bringt eine Laufzeit mit, auf die eine Server Action nicht warten
 * kann, und braucht deshalb einen eigenen Mechanismus.
 *
 * Ohne Schichtvorlagen mit Mindestbesetzung hat ein Zeitraum nichts, aus
 * dem sich etwas erzeugen liesse. Das steht als Hinweis da, statt das
 * Anlegen zu verbieten: Vorlagen lassen sich nachtragen, und ein leerer
 * Zeitraum schadet nicht.
 */
export default async function PlanungSeite() {
  const { supabase, position } = await betreteDashboard();

  if (!istChef(position)) notFound();

  const [zyklen, vorlagen, offeneStellen, ohneSoll, texte] = await Promise.all([
    holeZyklen(supabase, position.betriebId),
    holeVorlagen(supabase, position.betriebId),
    holeOffeneStellen(supabase, position.betriebId),
    holeOhneSollstunden(supabase, position.betriebId),
    holeTexte(),
  ]);
  const t = texte.planung;

  const nutzbare = sichtbareVorlagen(vorlagen).length;
  const vorschlag = naechsterMonat(new Date());

  /*
   * Der Solver wird vom Browser gerufen, nicht von hier — die Function
   * ist synchron und braucht länger, als eine Server Action laufen darf.
   * Mitgegeben wird deshalb, was ein blosser `fetch` dafür benötigt.
   *
   * `getSession()` statt `getUser()`: gebraucht wird das Zugangstoken,
   * nicht die Identität. Autorisiert wird ohnehin nicht hier — die
   * Function prüft `ist_chef` selbst, mit genau diesem Token.
   */
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { url, anonKey } = supabaseEnv();

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.lead}</p>

        {nutzbare === 0 ? (
          <p className="mt-6 rounded-blk border border-dashed border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
            {t.ohneVorlagen}
          </p>
        ) : null}

        <div className="mt-8">
          <ZyklusFormular
            vorschlag={vorschlag}
            hatVorherigenZyklus={zyklen.length > 0}
            texte={t}
          />
        </div>

        {/*
          Der Hinweis steht **vor** der Liste mit den Verteilen-Knöpfen,
          nicht hinter dem Ergebnis: fehlende Sollstunden lassen sich in
          zwei Minuten nachtragen, und danach rechnet der Lauf gleich
          richtig. Hinterher wäre es eine Nachricht über etwas, das schon
          passiert ist.

          Server-gerendert und ohne eigenen Zustand — die Seite lädt
          ohnehin bei jedem `router.refresh()` des Solver-Pollings neu,
          der Hinweis verschwindet also von selbst, sobald die Werte
          eingetragen sind.
        */}
        <SollstundenWarnung leute={ohneSoll} texte={t} />

        <section aria-labelledby="zeitraeume" className="mt-10">
          <h2
            id="zeitraeume"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
          >
            {t.angelegt}
          </h2>
          <div className="mt-4">
            <ZyklusListe
              zyklen={zyklen}
              offeneStellen={Object.fromEntries(offeneStellen)}
              vorschlaege={zaehleVorschlaege(zyklen)}
              solverZugang={{
                url: `${url}/functions/v1/plan-generieren`,
                token: session?.access_token ?? "",
                anonKey,
              }}
              texte={t}
            />
          </div>
        </section>

        <p className="mt-10 text-sm leading-relaxed text-muted">{t.fuss}</p>
      </div>
    </Container>
  );
}
