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
 * Die Seiten sind bislang einsprachig deutsch wie der ganze Stepper; wenn
 * er übersetzt wird, wandern diese Sätze ins Wörterbuch.
 */

const DATUM = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatiereDatum(datum: Date): string {
  return DATUM.format(datum);
}

export function formatiereBetrag(k: AboKonditionen): string | null {
  if (k.betragCent === null) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: k.waehrung.toUpperCase(),
  }).format(k.betragCent / 100);
}

function jeZeitraum(k: AboKonditionen): string {
  return k.intervall === "year" ? "pro Jahr" : "pro Monat";
}

/**
 * „49,00 € pro Monat zzgl. USt." — oder `null`, wenn Stripe keinen Betrag
 * liefert (ein Price ohne `unit_amount`, etwa gestaffelte Preise, die es
 * hier nicht gibt).
 */
export function preisZeile(k: AboKonditionen): string | null {
  const betrag = formatiereBetrag(k);
  return betrag ? `${betrag} ${jeZeitraum(k)} zzgl. USt.` : null;
}

const KUENDIGUNG =
  "Kündbar jederzeit zum Ende des bezahlten Zeitraums — im Dashboard unter Einstellungen → „Abo verwalten“ oder per E-Mail (AGB § 6 Abs. 2).";

/**
 * Was mit dem Hinterlegen erhoben und weitergegeben wird.
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
const RECHNUNGSANGABEN =
  "Deine Rechnungsangaben werden an den Zahlungsdienstleister Stripe übermittelt, der daraus die Rechnung erstellt und die Umsatzsteuer berechnet (Datenschutzerklärung, Ziffer 6).";

/** Schritt 2: Zahlungsmittel während oder nach der Testphase hinterlegen. */
export function zusammenfassungSchritt(k: AboKonditionen): string[] {
  const preis = preisZeile(k);
  const zeilen: string[] = [];

  if (k.testphaseEnde) {
    const ende = formatiereDatum(k.testphaseEnde);
    zeilen.push(`Kostenlose Testphase bis ${ende} — bis dahin wird nichts abgebucht.`);
    zeilen.push(
      preis
        ? `Erste Abbuchung am ${ende}: ${preis}, danach im Voraus für jeden Zeitraum.`
        : `Erste Abbuchung am ${ende}, danach im Voraus für jeden Zeitraum.`,
    );
  } else if (k.periodeEnde) {
    zeilen.push(
      preis
        ? `Die Testphase ist vorbei, das Abo läuft. Nächste Abbuchung am ${formatiereDatum(k.periodeEnde)}: ${preis}.`
        : `Die Testphase ist vorbei, das Abo läuft. Nächste Abbuchung am ${formatiereDatum(k.periodeEnde)}.`,
    );
  }

  if (k.endetAm) {
    zeilen.push(`Das Abo ist gekündigt und endet am ${formatiereDatum(k.endetAm)}.`);
  } else {
    zeilen.push("Das Abo verlängert sich automatisch um jeweils einen weiteren Zeitraum.");
    zeilen.push(KUENDIGUNG);
  }

  zeilen.push(RECHNUNGSANGABEN);

  return zeilen;
}

/**
 * Schritt 2 ohne Testphase: der Betrieb hatte schon ein Abo, die erste
 * Rechnung des neuen ist sofort fällig (`incomplete`, siehe `erstelleAbo`).
 *
 * Eigene Sätze statt `zusammenfassungSchritt`: dort landete ein solches
 * Abo im Zweig „Die Testphase ist vorbei, das Abo läuft" — beides wäre
 * hier falsch, es hat nie eine Testphase gehabt und läuft noch nicht.
 */
export function zusammenfassungNeuabschluss(k: AboKonditionen): string[] {
  const preis = preisZeile(k);
  return [
    "Die kostenlose Testphase gibt es einmal je Betrieb, und dein Betrieb hatte sie bereits.",
    preis
      ? `Mit dem Hinterlegen beginnt dein Abo sofort, und ${preis} werden für den ersten Zeitraum abgebucht.`
      : "Mit dem Hinterlegen beginnt dein Abo sofort, und der erste Zeitraum wird abgebucht.",
    "Danach verlängert es sich automatisch und wird jeweils im Voraus abgebucht.",
    KUENDIGUNG,
  ];
}

/** Sperrseite: Testphase ohne Zahlungsmittel abgelaufen, Abo pausiert. */
export function zusammenfassungFortsetzen(k: AboKonditionen): string[] {
  const preis = preisZeile(k);
  return [
    preis
      ? `Mit dem Hinterlegen wird dein Abo sofort fortgesetzt, und ${preis} werden für den ersten Zeitraum abgebucht.`
      : "Mit dem Hinterlegen wird dein Abo sofort fortgesetzt, und der erste Zeitraum wird abgebucht.",
    "Danach verlängert es sich automatisch und wird jeweils im Voraus abgebucht.",
    KUENDIGUNG,
    RECHNUNGSANGABEN,
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

  const anzeige = plaene.find((p) => p.id === plan)?.preis;
  if (anzeige === undefined || k.betragCent === null) return;
  if (anzeige * 100 !== k.betragCent) {
    console.error(
      `[preise] Plan ${plan}: Website zeigt ${anzeige} €, Stripe rechnet ${k.betragCent / 100} ${k.waehrung.toUpperCase()} ab — plaene in src/lib/site.ts oder STRIPE_PRICE_* angleichen.`,
    );
  }
}
