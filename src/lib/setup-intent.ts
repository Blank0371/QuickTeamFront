/**
 * Ob ein vom Browser gemeldeter SetupIntent übernommen werden darf.
 *
 * Die ID kommt vom Client und wird deshalb nicht geglaubt: der Aufrufer
 * schlägt den Intent bei Stripe nach und reicht ihn hierher, zusammen mit
 * dem Kunden, den **er selbst** serverseitig ermittelt hat. Nur ein Intent,
 * der an genau diesem Kunden hängt, bestätigt ist und ein Zahlungsmittel
 * trägt, geht durch — sonst liesse sich mit einer fremden ID eine fremde
 * Zahlungsmethode an das eigene Abo hängen.
 *
 * Rein, ohne Stripe-Aufruf, damit die Regel an einer Stelle steht und
 * geprüft werden kann. Vorher stand sie zweimal in `zahlung-aktionen.ts`
 * (bestehender Betrieb und Pending-Weg).
 */
export type SetupIntentAuszug = {
  customer: string | { id: string } | null;
  status: string;
  payment_method: string | { id: string } | null;
};

export type SetupIntentBewertung =
  | { ok: true; zahlungsmittelId: string }
  | { ok: false; grund: "fremd"; intentKunde: string | null }
  | { ok: false; grund: "unbestaetigt" | "ohne-zahlungsmittel" };

function idVon(wert: string | { id: string } | null): string | null {
  return typeof wert === "string" ? wert : (wert?.id ?? null);
}

export function bewerteSetupIntent(
  intent: SetupIntentAuszug,
  kundeId: string,
): SetupIntentBewertung {
  const intentKunde = idVon(intent.customer);
  if (intentKunde !== kundeId) return { ok: false, grund: "fremd", intentKunde };
  if (intent.status !== "succeeded") return { ok: false, grund: "unbestaetigt" };

  const zahlungsmittelId = idVon(intent.payment_method);
  if (!zahlungsmittelId) return { ok: false, grund: "ohne-zahlungsmittel" };

  return { ok: true, zahlungsmittelId };
}
