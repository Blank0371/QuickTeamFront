import { holeTexte } from "@/i18n/server";

/**
 * Store-Badges für den Abschluss-Screen — als Platzhalter.
 *
 * Die App ist noch nicht veröffentlicht. Ein Badge, das aussieht wie ein
 * Link und keiner ist, wäre schlimmer als gar keiner: die Website kann
 * live gehen, bevor die App es tut, und dann klickt jemand ins Leere.
 * Deshalb sind es hier bewusst `<div>`-Elemente ohne `href`, gestrichelt
 * umrandet und mit sichtbarem „bald verfügbar".
 *
 * Wenn die Store-URLs da sind: `verfuegbar` auf `true` und die beiden
 * `<div>` durch `<a>` mit den echten Zielen ersetzen. Der QR-Code hängt
 * an derselben Bedingung — ein Code, der auf nichts zeigt, ist kein
 * Platzhalter, sondern eine Sackgasse mit Aufforderungscharakter.
 */

const STORES = [
  { name: "App Store", geraet: "geraetIos" },
  { name: "Google Play", geraet: "geraetAndroid" },
] as const;

export async function StoreBadges({ verfuegbar = false }: { verfuegbar?: boolean }) {
  if (verfuegbar) {
    /*
     * Bewusst nicht vorgebaut: sobald es echte URLs gibt, gehören hier
     * die offiziellen Badge-Grafiken hin (Apple und Google schreiben
     * Größe und Abstände vor). Etwas zu erfinden, das später ohnehin
     * ersetzt wird, wäre nur Ballast.
     */
    throw new Error(
      "Store-Badges sind noch nicht gebaut — es gibt noch keine Store-URLs.",
    );
  }

  const t = (await holeTexte()).stepper.stores;

  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {STORES.map((store) => (
          <li key={store.name}>
            <div className="flex min-w-[10.5rem] flex-col rounded-blk border border-dashed border-line px-4 py-3 opacity-70">
              <span className="text-sm font-semibold text-text">{store.name}</span>
              <span className="mt-0.5 text-xs text-muted">{t[store.geraet]}</span>
              <span className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-signal">
                {t.bald}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-relaxed text-muted">{t.text}</p>
    </div>
  );
}
