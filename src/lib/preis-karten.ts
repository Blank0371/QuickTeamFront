import type { Dictionary } from "@/i18n/de";
import { plaene, type PlanId } from "@/lib/site";

/**
 * Die anzeigefertigen Preiskarten für Landing und `/preise` — beide Beträge
 * (monatlich und jährlich) als fertige Zeichenketten.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum serverseitig vorgerechnet
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Umschalter ist ein Client-Bauteil, und Props an Client-Bauteile
 * müssen serialisierbar sein. Also werden hier, wo das Wörterbuch noch
 * greifbar ist, alle Texte zu Strings gerechnet — inklusive des
 * Betrags im „statt 468 €" —; der Umschalter wählt später nur noch
 * zwischen `monat…` und `jahr…`.
 *
 * Eine Quelle für beide Seiten: Landing und `/preise` zeigten sonst zwei
 * Preislisten, die nur so lange gleich sind, wie jemand daran denkt.
 */
export type PreisKarte = {
  id: PlanId;
  name: string;
  grenze: string;
  monatKuendigung: string;
  jahrKuendigung: string;
  /** „39 €" */
  monatBetrag: string;
  /** „390 €" */
  jahrBetrag: string;
  /** „statt 468 €" — der durchgestrichene Vergleich am Jahrespreis. */
  jahrStatt: string;
};

export function bauePreisKarten(t: Dictionary): PreisKarte[] {
  return plaene.map((plan) => ({
    id: plan.id,
    name: plan.name,
    grenze: t.planGrenzen[plan.id],
    monatKuendigung: t.landing.preiseKuendigungMonat,
    jahrKuendigung: t.landing.preiseKuendigungJahr,
    monatBetrag: `${plan.preis} €`,
    jahrBetrag: `${plan.preisJahr} €`,
    jahrStatt: `${t.landing.preiseStattLabel} ${plan.preis * 12} €`,
  }));
}
