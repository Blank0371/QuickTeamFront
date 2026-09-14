"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FormMeldung } from "@/components/formular/felder";
import {
  RechnungsFelder,
  type RechnungsWerte,
} from "@/components/einrichtung/rechnungs-felder";
import { useKlientTexte } from "@/i18n/sprach-provider";
import { rechnungSchema } from "@/lib/validierung";
import { feldFehler } from "@/lib/formular";

import { rechnungSpeichern, zahlungsmittelUebernehmen } from "@/lib/zahlung-aktionen";

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

/**
 * Was unmittelbar vor dem Knopf steht, und wie der Knopf heisst.
 *
 * Beides kommt von der Seite, weil es vom Zustand des Abos abhängt, den
 * nur der Server kennt: in der Testphase kostet das Hinterlegen noch
 * nichts, auf der Sperrseite wird sofort abgebucht. Die Sätze stehen
 * **im** Formular direkt über dem Knopf und nicht irgendwo darüber —
 * Betrag, erste Abbuchung und Kündigung sollen zu sehen sein, während
 * man klickt (rechtliche Durchsicht vom 2026-09-13, Befund 5).
 */
type Abschluss = {
  zusammenfassung?: readonly string[];
  knopfText?: string;
};

/** Innenteil — muss innerhalb von `<Elements>` stehen, sonst greifen die Hooks nicht. */
function Formular({
  zusammenfassung = [],
  knopfText = "Zahlungsmittel hinterlegen",
  rechnung,
}: Abschluss & { rechnung: RechnungsWerte }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { validierung } = useKlientTexte();

  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [werte, setWerte] = useState<RechnungsWerte>(rechnung);
  /*
   * Eingefroren beim ersten Rendern: gemeint ist „es war schon eine UID
   * gespeichert", nicht „im Feld steht gerade etwas". Nur der erste Fall
   * rechtfertigt die Warnung, dass ein Länderwechsel sie entfernt.
   */
  const [uidVorhanden] = useState(() => rechnung.uid.trim() !== "");
  const [felder, setFelder] = useState<Record<string, string>>({});

  function aendere(feld: keyof RechnungsWerte, wert: string) {
    setWerte((vorher) => ({ ...vorher, [feld]: wert }));
    // Die Meldung verschwindet beim Tippen, nicht erst beim nächsten
    // Absenden — sonst steht sie noch da, während man sie gerade behebt.
    setFelder((vorher) => (vorher[feld] ? { ...vorher, [feld]: "" } : vorher));
  }

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLaeuft(true);
    setFehler(null);
    setFelder({});

    /*
     * ───────────────────────────────────────────────────────────────
     *  Erst die Rechnungsangaben, dann die Karte.
     * ───────────────────────────────────────────────────────────────
     *
     * Die Reihenfolge ist nicht Geschmack. Zum einen soll niemand eine
     * 3DS-Freigabe seiner Bank durchlaufen, nur um danach zu erfahren,
     * dass die Hausnummer fehlt. Zum anderen verlässt der Browser bei
     * 3DS die Seite — die Angaben müssen vorher gespeichert sein, sonst
     * sind sie beim Rückweg weg.
     *
     * Die Browserprüfung läuft über **dasselbe** Zod-Schema wie die
     * Server Action. Sie ist trotzdem nur Bequemlichkeit; das Tor vor
     * der Aktivierung liest den Stand bei Stripe
     * (`rechnungVollstaendig`) und lässt sich von hier aus nicht
     * umgehen.
     */
    const geprueft = rechnungSchema.safeParse(werte);
    if (!geprueft.success) {
      setFelder(feldFehler(geprueft.error, validierung));
      setFehler("Bitte vervollständige die Rechnungsangaben.");
      setLaeuft(false);
      return;
    }

    const gespeichert = await rechnungSpeichern(werte);
    if (!gespeichert.ok) {
      setFehler(gespeichert.nachricht);
      if (gespeichert.felder) setFelder(gespeichert.felder);
      setLaeuft(false);
      return;
    }

    /*
     * `redirect: "if_required"` ist der Grund, warum dieser Schritt
     * überhaupt eingebettet funktioniert: Karten und SEPA werden ohne
     * Weiterleitung bestätigt, nur 3DS-Fälle verlassen die Seite kurz und
     * kommen über `return_url` zurück.
     *
     * ───────────────────────────────────────────────────────────────
     *  Das Ziel ist DIESE Seite — Korrektur vom 2026-09-14.
     * ───────────────────────────────────────────────────────────────
     *
     * Hier stand fest verdrahtet `/einrichtung/zahlung`. Dieses Formular
     * steht aber an **zwei** Stellen, und für die zweite war das ein
     * stiller Totalausfall:
     *
     * Wer auf `/einrichtung/testphase-abgelaufen` ein pausiertes Abo mit
     * einer 3DS-pflichtigen Karte fortsetzen wollte, kam von der Bank auf
     * `/einrichtung/zahlung?setup_intent=…` zurück. Dort läuft
     * `betreteSchritt("zahlung")` zuerst, sieht `stand.gesperrt` — der
     * Webhook hat den neuen Status ja noch nicht geschrieben — und leitet
     * auf die Sperrseite um. **Dabei fällt der Query-Parameter weg.**
     * Ergebnis: die Zahlungsmethode ist bei Stripe bestätigt, wird nie
     * übernommen, das Abo bleibt pausiert, und der Kunde steht wieder vor
     * derselben Sperrseite — ohne Fehlermeldung, weil aus Sicht des
     * Codes nichts fehlgeschlagen ist.
     *
     * `pathname` statt eines festen Pfades trifft automatisch die Seite,
     * auf der das Formular gerade steht; beide Seiten werten
     * `?setup_intent=` aus. Die Suchparameter bleiben absichtlich weg —
     * `?zahlen=1` soll nicht zurückkommen, und `setup_intent` hängt
     * Stripe selbst an.
     */
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}`,
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

      <RechnungsFelder
        werte={werte}
        beiAenderung={aendere}
        felder={felder}
        uidVorhanden={uidVorhanden}
      />

      <PaymentElement />

      {zusammenfassung.length > 0 ? (
        <ul
          id="zahlung-konditionen"
          className="flex list-disc flex-col gap-1.5 rounded-blk border border-line bg-surface-sunk py-3 pl-8 pr-4 text-sm leading-relaxed text-muted"
        >
          {zusammenfassung.map((zeile) => (
            <li key={zeile}>{zeile}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || laeuft}
        aria-disabled={!stripe || laeuft}
        aria-describedby={zusammenfassung.length > 0 ? "zahlung-konditionen" : undefined}
        className="w-full rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {laeuft ? "Wird hinterlegt …" : knopfText}
      </button>
    </form>
  );
}

export function ZahlungsFormular({
  clientSecret,
  zusammenfassung,
  knopfText,
  rechnung,
}: { clientSecret: string; rechnung: RechnungsWerte } & Abschluss) {
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
      <Formular
        zusammenfassung={zusammenfassung}
        knopfText={knopfText}
        rechnung={rechnung}
      />
    </Elements>
  );
}
