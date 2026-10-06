import type { Locale } from "@/i18n/config";

/**
 * Die Oberflächensprache, wie Stripe sie versteht.
 *
 * Stripe Elements und das Kundenportal kennen nicht jede unserer
 * Sprachen: Albanisch und Ukrainisch fehlen in beiden Listen
 * (`StripeElementLocale` in `@stripe/stripe-js`,
 * `BillingPortal.SessionCreateParams.Locale` in `stripe`, am 2026-10-04
 * in den installierten Typen nachgesehen). Für sie gilt `auto` — Stripe
 * nimmt dann die Browsersprache.
 *
 * Client-sicher (kein Server-Import), weil `ZahlungsFormular` es braucht.
 */
const STRIPE_SPRACHEN = ["de", "en", "es", "fr", "it", "pt", "ru", "tr"] as const;

export type StripeSprache = (typeof STRIPE_SPRACHEN)[number] | "auto";

export function stripeSprache(locale: Locale): StripeSprache {
  return (STRIPE_SPRACHEN as readonly string[]).includes(locale)
    ? (locale as StripeSprache)
    : "auto";
}
