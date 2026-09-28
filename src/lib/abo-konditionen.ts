import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/de";
import { fuelle } from "@/i18n/text";
import type { AboKonditionen } from "@/lib/stripe";
import { plaene, type PlanId } from "@/lib/site";

/**
 * Die Sätze, die unmittelbar vor dem Hinterlegen einer Zahlungsmethode
 * stehen — Betrag, Umsatzsteuer, Testphasenende, erste Abbuchung,
 * Verlängerung und Kündigung.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum es diese Datei gibt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Aus der rechtlichen Durchsicht vom 2026-09-13 (Befund 5): Die letzte
 * Zahlungsansicht nannte den Tarifnamen und „die ersten 14 Tage sind
 * kostenlos", aber keinen Betrag — und den Satz über die 14 Tage auch
 * dann, wenn die Testphase längst lief. Für ein Angebot an Unternehmer ist
 * die Verbraucher-Buttonpflicht (§ 312j BGB) nicht einschlägig; klar sein
 * soll trotzdem, was ab wann kostet. Zwei Seiten tragen das Formular
 * (Schritt 2 und die Sperrseite), deshalb stehen die Sätze einmal hier.
 *
 * Die Sätze stehen im Wörterbuch (`aboKonditionen`); jede Funktion bekommt
 * den Block und die Locale der Anfrage herein, damit Datum und Betrag im
 * selben Format erscheinen wie der Satz drumherum.
 */

type Texte = Dictionary["aboKonditionen"];

export function formatiereDatum(datum: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(datum);
}

export function formatiereBetrag(k: AboKonditionen, locale: Locale): string | null {
  if (k.betragCent === null) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: k.waehrung.toUpperCase(),
  }).format(k.betragCent / 100);
}

/**
 * „49,00 € pro Monat zzgl. USt." — oder `null`, wenn Stripe keinen Betrag
 * liefert (ein Price ohne `unit_amount`, etwa gestaffelte Preise, die es
 * hier nicht gibt).
 */
export function preisZeile(k: AboKonditionen, t: Texte, locale: Locale): string | null {
  const betrag = formatiereBetrag(k, locale);
  if (!betrag) return null;
  return fuelle(t.preis, {
    betrag,
    zeitraum: k.intervall === "year" ? t.proJahr : t.proMonat,
  });
}

/*
 * `t.rechnungsangaben` — was mit dem Hinterlegen erhoben und weitergegeben
 * wird.
 *
 * Steht seit dem 2026-09-14 in beiden Zusammenfassungen, weil seither
 * Rechnungsangaben **Pflicht** sind, bevor ein Abonnement kostenpflichtig
 * wird. Eine Zusammenfassung, die den Betrag nennt, aber verschweigt,
 * welche Daten dafür erhoben werden, ist unvollständig — und die
 * Datenschutzerklärung (Ziffer 6) sagt dasselbe, nur eben nicht an der
 * Stelle, an der jemand gerade klickt.
 *
 * Bewusst ohne Aufzählung der einzelnen Felder: die stehen unmittelbar
 * darüber im Formular, und sie hier ein zweites Mal zu nennen wäre eine
 * zweite Stelle, die beim nächsten Feld vergessen wird.
 */

/**
 * Schritt 2 ohne Testphase: der Betrieb hatte schon ein Abo, die erste
 * Rechnung des neuen ist sofort fällig (`incomplete`, siehe `erstelleAbo`).
 */
export function zusammenfassungNeuabschluss(
  k: AboKonditionen,
  t: Texte,
  locale: Locale,
): string[] {
  const preis = preisZeile(k, t, locale);
  return [
    t.testphaseVerbraucht,
    preis ? fuelle(t.beginntSofortPreis, { preis }) : t.beginntSofort,
    t.danachVoraus,
    t.kuendigung,
  ];
}

/** Sperrseite: Testphase ohne Zahlungsmittel abgelaufen, Abo pausiert. */
export function zusammenfassungFortsetzen(
  k: AboKonditionen,
  t: Texte,
  locale: Locale,
): string[] {
  const preis = preisZeile(k, t, locale);
  return [
    preis ? fuelle(t.fortsetzenPreis, { preis }) : t.fortsetzen,
    t.danachVoraus,
    t.kuendigung,
    t.rechnungsangaben,
  ];
}

/**
 * Meldet, wenn der Anzeigepreis der Website vom abgerechneten Stripe-Preis
 * abweicht.
 *
 * Kein Abbruch: gezeigt wird ohnehin der Stripe-Betrag, also der richtige.
 * Aber Landing, `/preise` und die Planwahl lesen `plaene` — und stünde
 * dort ein anderer Betrag, hätte jemand auf der Preisseite etwas anderes
 * gelesen als hier. Das soll im Protokoll auffallen, nicht erst in einer
 * Beschwerde.
 */
export function pruefePreisGleichstand(plan: PlanId, k: AboKonditionen): void {
  /*
   * Seit dem 2026-09-13 auch die Umsatzsteuer: „zzgl. USt." stimmt nur,
   * wenn der Price netto angelegt ist und Stripe Tax auf dem Abo läuft.
   * Ein Price mit `inclusive` oder ohne Angabe würde bei aktiver Steuer
   * falsch oder gar nicht aufschlagen — das fällt sonst erst auf der
   * ersten echten Rechnung auf.
   */
  if (k.steuerverhalten !== "exclusive") {
    console.error(
      `[preise] Plan ${plan}: Stripe-Price hat tax_behavior "${k.steuerverhalten ?? "unspecified"}", erwartet "exclusive" — im Stripe-Dashboard am Preis umstellen.`,
    );
  }
  if (!k.steuerAutomatisch) {
    console.error(
      `[preise] Plan ${plan}: automatic_tax ist auf dem Abo aus — es wird keine Umsatzsteuer aufgeschlagen.`,
    );
  }

  /*
   * Je nach Intervall der andere Anzeigepreis: das Jahresabo bucht
   * `preisJahr` ab, nicht das Zwölffache von `preis`. Verglichen mit `preis`
   * meldete jede Jahresrechnung fälschlich eine Divergenz.
   */
  const eintrag = plaene.find((p) => p.id === plan);
  const jaehrlich = k.intervall === "year";
  const anzeige = eintrag ? (jaehrlich ? eintrag.preisJahr : eintrag.preis) : undefined;
  if (anzeige === undefined || k.betragCent === null) return;
  if (anzeige * 100 !== k.betragCent) {
    console.error(
      `[preise] Plan ${plan} (${jaehrlich ? "jährlich" : "monatlich"}): Website zeigt ${anzeige} €, ` +
        `Stripe rechnet ${k.betragCent / 100} ${k.waehrung.toUpperCase()} ab — plaene in src/lib/site.ts oder STRIPE_PRICE_* angleichen.`,
    );
  }
}
