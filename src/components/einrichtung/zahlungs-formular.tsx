"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FormMeldung } from "@/components/formular/felder";

import { zahlungsmittelUebernehmen } from "@/lib/zahlung-aktionen";

/**
 * Das eingebettete Zahlungsformular von Schritt 2.
 *
 * Hierher kommt ausschliesslich der **Publishable Key**. Der Secret Key
 * lebt in `src/lib/stripe.ts` und wird von dort nie in eine
 * `"use client"`-Datei importiert — deshalb sprechen Server und Browser
 * mit Stripe über getrennte Wege und nicht über dieselbe Datei.
 */

/*
 * Ausserhalb der Komponente: `loadStripe` lädt Stripe.js genau einmal.
 * Innerhalb würde bei jedem Rendern ein neuer Ladevorgang starten, und
 * `<Elements>` bekäme jedes Mal eine andere Instanz.
 */
const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

/**
 * Baut Stripes Erscheinungsbild aus unseren eigenen Tokens.
 *
 * Die Werte werden zur Laufzeit aus den CSS-Variablen gelesen statt hier
 * als Hex-Werte zu stehen. Das ist der einzige Weg, die Regel aus
 * CLAUDE.md einzuhalten — Stripe rendert in einem iframe und kann unsere
 * Klassen nicht sehen, braucht also echte Farbwerte. Gelesen statt
 * abgeschrieben heisst: wer die Palette ändert, ändert auch das hier mit.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Ersatzwerte sind Ebene 1 dieser Palette — und waren es nicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-06 standen hier `#3fb950`, `#161b22`, `#e6edf3`,
 * `#8b949e` und `#f85149`: die GitHub-Dark-Palette. Greift ein Ersatz,
 * erscheint das Zahlungsformular also im Grün und Grau einer fremden
 * Marke — an der einen Stelle der Einrichtung, an der jemand seine
 * Kartendaten eintippt und Vertrautheit am meisten zählt.
 *
 * Ersetzt sind sie durch die **Dunkelmodus-Werte aus Ebene 1** von
 * `globals.css` (`--qt-c-bronze`, `--qt-c-graphite`, `--qt-c-bone`,
 * `--qt-c-muted`, `--qt-c-red-hi`) — dunkel, weil `theme: "night"`
 * gesetzt ist. Dass sie hier als Literale stehen, ist die eng gefasste
 * Ausnahme von „Komponenten benutzen nie einen Hex-Wert": es gibt keinen
 * Token-Weg in ein fremdes iframe, und ein Ersatzwert kann sich
 * definitionsgemäss nicht aus der Variablen bedienen, deren Fehlen ihn
 * überhaupt erst auslöst. Er greift ohnehin nur, wenn `globals.css` gar
 * nicht angewandt ist.
 *
 * `--qt-muted` ist im Dunkelmodus eine Mischung
 * (`--qt-c-muted` 80 % mit `--qt-c-bone`); als Ersatz steht der
 * ungemischte Palettenwert. Etwas dunkler als das Token, aber aus
 * derselben Palette — und das ist der Punkt.
 */
function erscheinungsbild(): Appearance {
  const stil = getComputedStyle(document.documentElement);
  const wert = (name: string, ersatz: string) =>
    stil.getPropertyValue(name).trim() || ersatz;

  return {
    theme: "night",
    variables: {
      colorPrimary: wert("--color-signal", "#a8874f"),
      colorBackground: wert("--color-surface", "#1a1f1c"),
      colorText: wert("--color-text", "#ede9e0"),
      colorTextSecondary: wert("--color-muted", "#6e736c"),
      colorDanger: wert("--color-stop", "#e2583a"),
      borderRadius: wert("--radius-blk", "0.625rem"),
      fontFamily: stil.getPropertyValue("font-family") || "system-ui, sans-serif",
    },
  };
}

/** Innenteil — muss innerhalb von `<Elements>` stehen, sonst greifen die Hooks nicht. */
function Formular() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLaeuft(true);
    setFehler(null);

    /*
     * `redirect: "if_required"` ist der Grund, warum dieser Schritt
     * überhaupt eingebettet funktioniert: Karten und SEPA werden ohne
     * Weiterleitung bestätigt, nur 3DS-Fälle verlassen die Seite kurz und
     * kommen über `return_url` zurück.
     */
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/einrichtung/zahlung`,
      },
      redirect: "if_required",
    });

    if (error) {
      setFehler(error.message ?? "Die Zahlungsmethode liess sich nicht bestätigen.");
      setLaeuft(false);
      return;
    }

    if (!setupIntent) {
      setFehler("Stripe hat kein Ergebnis zurückgemeldet. Versuch es noch einmal.");
      setLaeuft(false);
      return;
    }

    /*
     * Übernommen wird serverseitig, und zwar über die ID statt über das
     * hier vorliegende Objekt: der Server schlägt den Intent selbst nach
     * und prüft, dass er zu diesem Betrieb gehört. Was der Browser
     * behauptet, zählt dabei nicht.
     */
    const ergebnis = await zahlungsmittelUebernehmen(setupIntent.id);

    if (!ergebnis.ok) {
      setFehler(ergebnis.nachricht);
      setLaeuft(false);
      return;
    }

    router.push("/einrichtung");
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-5">
      {fehler ? <FormMeldung art="fehler">{fehler}</FormMeldung> : null}

      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || laeuft}
        aria-disabled={!stripe || laeuft}
        className="w-full rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {laeuft ? "Wird hinterlegt …" : "Zahlungsmittel hinterlegen"}
      </button>
    </form>
  );
}

export function ZahlungsFormular({ clientSecret }: { clientSecret: string }) {
  /*
   * Das Erscheinungsbild entsteht erst im Browser — `getComputedStyle`
   * gibt es auf dem Server nicht. Bis dahin rendert `<Elements>` nichts,
   * was einen Hydration-Mismatch auslösen könnte.
   */
  const [aussehen, setAussehen] = useState<Appearance | undefined>(undefined);

  useEffect(() => {
    setAussehen(erscheinungsbild());
  }, []);

  if (!aussehen) {
    return (
      <p className="text-sm text-muted" role="status">
        Zahlungsformular wird geladen …
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: aussehen, locale: "de" }}>
      <Formular />
    </Elements>
  );
}
