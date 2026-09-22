"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FormMeldung, TextFeld } from "@/components/formular/felder";
import {
  RechnungsFelder,
  type RechnungsWerte,
} from "@/components/einrichtung/rechnungs-felder";
import { useKlientTexte } from "@/i18n/sprach-provider";
import type { Dictionary } from "@/i18n/de";
import type { Locale } from "@/i18n/config";
import { rechnungSchema } from "@/lib/validierung";
import { feldFehler } from "@/lib/formular";

import {
  rabattAnwenden,
  rechnungSpeichern,
  zahlungsmittelUebernehmen,
  type UebernahmeErgebnis,
} from "@/lib/zahlung-aktionen";

/**
 * Welche Server Actions das Formular ruft. Vorbelegt mit dem Weg des
 * **bestehenden** Betriebs; der Weg des noch nicht angelegten Betriebs
 * (Schritt 2 für einen neuen Betrieb) reicht eigene Aktionen herein und
 * blendet den Rabattcode aus, weil der schon in der Plan-Auswahl gewählt
 * und geparkt wurde.
 */
type Aktionen = {
  rechnungAktion?: (eingabe: Record<string, string>) => Promise<UebernahmeErgebnis>;
  finalisieren?: (setupIntentId: string) => Promise<UebernahmeErgebnis>;
  mitCoupon?: boolean;
};

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

/**
 * Wohin Stripe nach einer Weiterleitung (3DS, PayPal, Bank) zurückschickt
 * — **die Seite, die das Formular zeigt**, weil nur sie `?setup_intent=`
 * auswertet.
 *
 * Bis zum 2026-09-14 stand hier fest `/einrichtung/zahlung`, auch für die
 * Sperrseite. Dort kam die Rückkehr nie an: Schritt 2 leitet einen
 * gesperrten Betrieb vor jeder Auswertung auf die Sperrseite um, und
 * `redirect()` nimmt den Query-String nicht mit. Die bestätigte
 * Zahlungsmethode wurde nie übernommen, das Abo blieb pausiert, und eine
 * Fehlermeldung gab es auch nicht.
 */
type Rueckkehr = { rueckkehrPfad?: string };

/** Übersetzte Strings dieses Schritts, vom Server hereingereicht. */
type StepTexte = {
  texte: Dictionary["stepper"]["zahlungsFormular"];
  rechnungTexte: Dictionary["stepper"]["rechnung"];
  laender: readonly { code: string; name: string }[];
  locale: Locale;
};

/** Innenteil — muss innerhalb von `<Elements>` stehen, sonst greifen die Hooks nicht. */
function Formular({
  zusammenfassung = [],
  knopfText,
  rechnung,
  rueckkehrPfad,
  texte,
  rechnungTexte,
  laender,
  rechnungAktion = rechnungSpeichern,
  finalisieren = zahlungsmittelUebernehmen,
  mitCoupon = true,
}: Abschluss &
  Rueckkehr &
  Aktionen & { rechnung: RechnungsWerte } & Omit<StepTexte, "locale">) {
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
  /*
   * Der Stripe-Rabattcode lässt sich auch hier eingeben, nicht nur auf der
   * Plan-Auswahl (Nutzerwunsch 2026-09-22). Freiwillig; wird vor
   * `confirmSetup` auf das bestehende Abo gelegt (`rabattAnwenden`).
   */
  const [coupon, setCoupon] = useState("");

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
    try {
      const geprueft = rechnungSchema.safeParse(werte);
      if (!geprueft.success) {
        setFelder(feldFehler(geprueft.error, validierung));
        setFehler(texte.rechnungUnvollstaendig);
        setLaeuft(false);
        return;
      }

      const gespeichert = await rechnungAktion(werte);
      if (!gespeichert.ok) {
        setFehler(gespeichert.nachricht);
        if (gespeichert.felder) setFelder(gespeichert.felder);
        setLaeuft(false);
        return;
      }

      /*
       * Rabattcode vor `confirmSetup`, damit der Nachlass schon am Abo
       * hängt, wenn eine Karte über 3DS die Seite verlässt oder eine offene
       * Erstrechnung gleich bezahlt wird. Ein leerer Code ist kein Fehler.
       */
      if (mitCoupon && coupon.trim().length > 0) {
        const rabatt = await rabattAnwenden(coupon);
        if (!rabatt.ok) {
          setFehler(rabatt.nachricht);
          if (rabatt.felder) setFelder((vorher) => ({ ...vorher, ...rabatt.felder }));
          setLaeuft(false);
          return;
        }
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
          /*
           * Beide Seiten hatten diesen Fehler unabhängig gefunden und
           * verschieden gelöst — hier stehen beide Lösungen übereinander,
           * weil sie verschiedene Fehlerarten abdecken:
           *
           *   * `rueckkehrPfad` ist die **ausdrückliche** Angabe der
           *     aufrufenden Seite. Sie ist serverseitig gesetzt und hält
           *     auch dort, wo `pathname` täuschen könnte (Rewrite,
           *     abweichender Basispfad).
           *   * `window.location.pathname` ist der **Rückfall**. Vorher
           *     stand hier als Vorgabe `/einrichtung/zahlung` — damit wäre
           *     genau derselbe stille Totalausfall zurückgekehrt, sobald
           *     jemand eine dritte Einbindung ergänzt und die Prop
           *     vergisst. Der Rückfall auf die aktuelle Seite kann nicht
           *     vergessen werden.
           *
           * Eine feste Vorgabe wäre die schlechteste der drei Varianten:
           * sie sieht aus wie eine Entscheidung und ist eine Falle.
           */
          return_url: `${window.location.origin}${rueckkehrPfad ?? window.location.pathname}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setFehler(error.message ?? texte.bestaetigungFehlgeschlagen);
        setLaeuft(false);
        return;
      }

      if (!setupIntent) {
        setFehler(texte.keinErgebnis);
        setLaeuft(false);
        return;
      }

      /*
       * Übernommen wird serverseitig, und zwar über die ID statt über das
       * hier vorliegende Objekt: der Server schlägt den Intent selbst nach
       * und prüft, dass er zu diesem Betrieb gehört. Was der Browser
       * behauptet, zählt dabei nicht.
       */
      const ergebnis = await finalisieren(setupIntent.id);

      if (!ergebnis.ok) {
        setFehler(ergebnis.nachricht);
        setLaeuft(false);
        return;
      }

      router.push("/einrichtung");
    } catch {
      setFehler(texte.verbindungUnterbrochen);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-5">
      {fehler ? <FormMeldung art="fehler">{fehler}</FormMeldung> : null}

      <RechnungsFelder
        werte={werte}
        beiAenderung={aendere}
        felder={felder}
        uidVorhanden={uidVorhanden}
        texte={rechnungTexte}
        laender={laender}
      />

      <PaymentElement />

      {mitCoupon ? (
        <TextFeld
          id="coupon"
          name="coupon"
          label={texte.couponLabel}
          required={false}
          autoComplete="off"
          maxLength={40}
          wert={coupon}
          beiEingabe={(wert) => {
            setCoupon(wert);
            setFelder((vorher) => (vorher.coupon ? { ...vorher, coupon: "" } : vorher));
          }}
          fehler={felder.coupon}
          hinweis={texte.couponHinweis}
        />
      ) : null}

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
        {laeuft ? texte.wirdHinterlegt : (knopfText ?? texte.knopfStandard)}
      </button>
    </form>
  );
}

export function ZahlungsFormular({
  clientSecret,
  zusammenfassung,
  knopfText,
  rechnung,
  rueckkehrPfad,
  texte,
  rechnungTexte,
  laender,
  locale,
  rechnungAktion,
  finalisieren,
  mitCoupon,
}: { clientSecret: string; rechnung: RechnungsWerte } & Abschluss &
  Rueckkehr &
  Aktionen &
  StepTexte) {
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
        {texte.wirdGeladen}
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: aussehen, locale }}>
      <Formular
        zusammenfassung={zusammenfassung}
        knopfText={knopfText}
        rechnung={rechnung}
        rueckkehrPfad={rueckkehrPfad}
        texte={texte}
        rechnungTexte={rechnungTexte}
        laender={laender}
        rechnungAktion={rechnungAktion}
        finalisieren={finalisieren}
        mitCoupon={mitCoupon}
      />
    </Elements>
  );
}
