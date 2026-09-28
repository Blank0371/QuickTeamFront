/**
/**
 * Alles, was mit Stripe spricht — ausser dem Webhook, der wegen des
 * `service_role`-Keys bewusst für sich steht.
 *
 * Diese Datei ist serverseitig. Sie wird ausschliesslich aus Server
 * Actions und Server Components importiert; ein Import aus einer
 * `"use client"`-Datei zöge das ganze Stripe-SDK und damit den Secret Key
 * ins Browser-Bundle. Wer hier etwas ergänzt, prüft danach mit
 * `grep -r "sk_test" .next-build/static`, dass nichts hinübergerutscht ist.
 *
 * Geschrieben wird hier ausschliesslich bei Stripe, nie in unserer
 * Datenbank. Die Zeile in `betrieb_abonnements` rührt allein der Webhook
 *
 * Seit 2026-09-28 ist das der Sammel-Export: die Umsetzung liegt nach
 * Domänenbegriffen in `stripe-konfiguration.ts` (Price-IDs, Klient,
 * Soft-Launch-Riegel), `stripe-kunde.ts` (Betrieb-Kunde),
 * `stripe-pending.ts` (Kunde und Abo vor dem Anlegen des Betriebs),
 * `stripe-rechnung.ts` (Steuer, Rechnungsangaben, UID), `stripe-abo.ts`
 * (Abo lesen, anlegen, wechseln, kündigen, Pausen, Konditionen) und
 * `stripe-zahlung.ts` (Portal, Wiederaufnahme, SetupIntent). Aufrufer
 * importieren weiter von hier — was hier nicht steht (etwa
 * `stripeKlientOhneRiegel`, `klientFuer`), ist nicht für aussen gedacht.
 */

export {
  KonfigurationsFehler,
  priceIdFuer,
  planAusPriceId,
  stripeKlient,
} from "@/lib/stripe-konfiguration";
export {
  sucheKunde,
  holeOderErstelleKunde,
} from "@/lib/stripe-kunde";
export {
  suchePendingKunde,
  holeOderErstellePendingKunde,
  merkePendingWahl,
  lesePendingBetrieb,
  holePendingLage,
  schliessePendingAbo,
  verknuepfePendingMitBetrieb,
  type PendingLage,
  type PendingBetrieb,
} from "@/lib/stripe-pending";
export {
  stelleSteuerstandortSicher,
  holeRechnungsProfil,
  speichereRechnungAmKunden,
  rechnungVollstaendig,
  holeUid,
  setzeUid,
} from "@/lib/stripe-rechnung";
export {
  holeAboFuerBetrieb,
  holeAboVerlauf,
  aboLageBeiStripe,
  pruefePromotionCode,
  erstelleAbo,
  intervallVonAbo,
  wechslePlan,
  kuendigeAbo,
  PAUSE_HOECHSTENS_TAGE,
  beendeUeberfaelligePausen,
  aboKonditionen,
  type AboVerlauf,
  type AboLage,
  type PausenBilanz,
  type AboKonditionen,
} from "@/lib/stripe-abo";
export {
  erstelleKundenportal,
  ZahlungAbgelehnt,
  nimmAboWiederAuf,
  erstelleSetupIntent,
  uebernimmZahlungsmittel,
} from "@/lib/stripe-zahlung";
