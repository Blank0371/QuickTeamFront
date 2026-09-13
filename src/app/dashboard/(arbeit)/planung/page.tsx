import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
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

export const metadata: Metadata = {
  title: "Planung",
  description: "Planungszeiträume anlegen und den Stand der Dienstpläne verfolgen.",
  robots: { index: false, follow: false },
};

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

  const [zyklen, vorlagen, offeneStellen, ohneSoll] = await Promise.all([
    holeZyklen(supabase, position.betriebId),
    holeVorlagen(supabase, position.betriebId),
    holeOffeneStellen(supabase, position.betriebId),
    holeOhneSollstunden(supabase, position.betriebId),
  ]);

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
        <h1 className="text-2xl leading-tight sm:text-3xl">Planung</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Für welchen Zeitraum soll geplant werden? Aus deinen Schichtvorlagen
          entstehen darin die konkreten Dienste.
        </p>

        {nutzbare === 0 ? (
          <p className="mt-6 rounded-blk border border-dashed border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
            Du hast noch keine Schichtvorlage mit Mindestbesetzung. Ohne sie bleibt ein
            Zeitraum leer — aus einer Vorlage ohne Rollenbedarf entsteht keine Schicht,
            und in der App wäre sie ohnehin unsichtbar. Anlegen kannst du den Zeitraum
            trotzdem schon.
          </p>
        ) : null}

        <div className="mt-8">
          <ZyklusFormular vorschlag={vorschlag} hatVorherigenZyklus={zyklen.length > 0} />
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
        <SollstundenWarnung leute={ohneSoll} />

        <section aria-labelledby="zeitraeume" className="mt-10">
          <h2
            id="zeitraeume"
            className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
          >
            Angelegte Zeiträume
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
            />
          </div>
        </section>

        <p className="mt-10 text-sm leading-relaxed text-muted">
          Verteilt werden die Schichten von einem Rechenverfahren, das Urlaube,
          Ruhezeiten, gesetzliche Höchstarbeitszeiten und die Wünsche deines Teams
          berücksichtigt. Es schlägt vor — freigegeben wird von dir.
        </p>
      </div>
    </Container>
  );
}
