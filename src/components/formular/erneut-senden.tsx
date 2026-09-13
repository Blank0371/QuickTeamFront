"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Supabase weist einen zweiten Versand an dieselbe Adresse innerhalb
 * dieser Frist ab („Minimum interval" / `mailer_max_frequency`, Standard
 * 60 Sekunden). Der Button bleibt so lange gesperrt, statt anklickbar zu
 * sein und danach eine Fehlermeldung zu produzieren.
 */
const SPERRE_SEKUNDEN = 60;

/**
 * „Code erneut senden" mit Countdown.
 *
 * Der Zähler startet bei 60 und nicht bei 0: auf diese Seite kommt man
 * direkt nach dem Absenden der Registrierung, die Frist läuft also schon.
 *
 * Der Startwert ist eine Konstante und keine Uhrzeit — sonst rechnete der
 * Server einen anderen Wert aus als der Browser und React meldete beim
 * Hydrieren einen Mismatch. Heruntergezählt wird erst im Effekt, also
 * ausschliesslich im Browser.
 */
export function ErneutSendenButton({ neuGesendet }: { neuGesendet: boolean }) {
  const [rest, setRest] = useState(SPERRE_SEKUNDEN);
  const { pending } = useFormStatus();
  const warPending = useRef(false);

  useEffect(() => {
    const zaehler = setInterval(() => {
      setRest((bisher) => (bisher > 0 ? bisher - 1 : 0));
    }, 1000);
    return () => clearInterval(zaehler);
  }, []);

  /*
   * Nach jedem erfolgreich abgeschlossenen Versand läuft die Frist neu.
   * Ausgewertet wird der Übergang pending → fertig, nicht `neuGesendet`
   * allein: beim zweiten Versand in Folge bliebe dessen Wert `true` und
   * der Countdown startete nicht neu.
   */
  useEffect(() => {
    if (warPending.current && !pending && neuGesendet) setRest(SPERRE_SEKUNDEN);
    warPending.current = pending;
  }, [pending, neuGesendet]);

  const gesperrt = rest > 0 || pending;

  return (
    <div className="border-t border-line pt-5">
      <p className="mb-3 text-sm text-muted">Nichts angekommen? Sieh im Spam-Ordner nach.</p>

      <button
        type="submit"
        name="absicht"
        value="erneut"
        disabled={gesperrt}
        aria-disabled={gesperrt}
        aria-describedby="erneut-frist"
        className="w-full rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      >
        Code erneut senden
      </button>

      {/*
       * Bewusst ohne aria-live: eine Ansage im Sekundentakt wäre kein
       * Gewinn. Der Text hängt über aria-describedby am Button und wird
       * mitgelesen, wenn er den Fokus bekommt.
       */}
      <p id="erneut-frist" className="mt-2 text-xs text-muted">
        {rest > 0
          ? `Aus Sicherheitsgründen erst in ${rest} Sekunden wieder möglich.`
          : "Du kannst dir jetzt einen neuen Code schicken lassen."}
      </p>
    </div>
  );
}
