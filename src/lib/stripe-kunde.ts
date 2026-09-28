import Stripe from "stripe";
import type { Rechnungsangaben } from "@/lib/betrieb";
import { BETRIEB_SCHLUESSEL, klientFuer, stripeKlient } from "@/lib/stripe-konfiguration";
import { stelleSteuerstandortSicher } from "@/lib/stripe-rechnung";

/* ------------------------------------------------------------------ */
/* Kunde                                                               */
/* ------------------------------------------------------------------ */

/**
 * Findet den Stripe-Kunden zu diesem Betrieb — ohne ihn anzulegen.
 *
 * Getrennt von `holeOderErstelleKunde`, weil die Trennung hier
 * verhaltensrelevant ist: die Wiedereinstiegs-Ableitung fragt bei jedem
 * Seitenaufruf, ob es ein Abo gibt. Liefe das über die anlegende Variante,
 * entstünde allein durchs Hinschauen ein Stripe-Kunde — für jeden, der die
 * Einrichtung nur öffnet und wieder verlässt. Lesewege legen nichts an.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Wege, in dieser Reihenfolge — und die Reihenfolge ist der Punkt.
 * ─────────────────────────────────────────────────────────────────────
 *
 * **1. Die gespeicherte `stripe_customer_id`** aus `betrieb_abonnements`,
 * geschrieben vom Webhook. Sie ist die einzige Angabe, die einen Betrieb
 * dauerhaft mit seinem Stripe-Kunden verbindet.
 *
 * **2. Erst wenn die fehlt: die Suche über die E-Mail-Adresse.**
 *
 * Bis zum 2026-08-28 gab es nur den zweiten Weg, und darin lag ein
 * stiller Fehler: die Adresse ist **kein stabiler Schlüssel.** Ändert ein
 * Chef seine Anmelde-Adresse, sucht `customers.list({ email })` mit der
 * neuen und findet den unter der alten angelegten Kunden nicht mehr. Für
 * die Aufrufer heisst `null` aber „kein Kunde, also kein Abo" — es
 * entstünde ein zweiter Kunde und, sobald der 24-Stunden-Idempotenz-
 * schlüssel aus `erstelleAbo` abgelaufen ist, **ein zweites Abonnement
 * neben dem laufenden.** Doppelte Abbuchung, ohne dass irgendwo ein
 * Fehler geworfen würde. Die gespeicherte ID hat das Problem nicht: sie
 * ändert sich nie.
 *
 * **Der Fallback bleibt trotzdem**, für genau ein Fenster: zwischen dem
 * Anlegen des allerersten Kunden und dem ersten Webhook-Durchlauf steht
 * in unserer Zeile noch nichts. Wer in diesen Sekunden neu lädt, erzeugte
 * ohne ihn einen zweiten Kunden — also denselben Fehler, nur eine
 * Sekunde früher.
 *
 * **Auch der gespeicherten ID wird die Zugehörigkeit nicht geglaubt.**
 * Beide Wege prüfen am Ende dasselbe: steht `betrieb_id` in den Metadaten
 * des Kunden. Eine ID, die auf einen fremden oder gelöschten Kunden
 * zeigt, fällt damit auf die Suche zurück, statt ein Abo an den falschen
 * Kunden zu hängen — dieselbe Haltung wie beim Positions-Cookie und bei
 * der SetupIntent-Prüfung: eine hereingereichte ID ist ein Hinweis, kein
 * Nachweis.
 *
 * Gesucht wird über `customers.list({ email })` und **nicht** über die
 * Search API. Der Unterschied ist hier entscheidend: die Suche läuft über
 * einen Index, der bis zu einer Minute hinterherhinkt — ein Kunde, den wir
 * gerade angelegt haben, wäre dort noch nicht zu finden.
 */
export async function sucheKunde({
  betriebId,
  email,
  kundeId = null,
  trotzSoftLaunch = false,
}: {
  betriebId: string;
  email: string;
  /** `betrieb_abonnements.stripe_customer_id`, sofern der Webhook schon lief. */
  kundeId?: string | null;
  /** Siehe `klientFuer()`. Nur die Kontolöschung setzt das. */
  trotzSoftLaunch?: boolean;
}): Promise<Stripe.Customer | null> {
  const stripe = klientFuer(trotzSoftLaunch);

  if (kundeId) {
    try {
      const kunde = await stripe.customers.retrieve(kundeId);

      /*
       * Ein gelöschter Kunde kommt nicht als Fehler zurück, sondern als
       * Zeile mit `deleted: true` und ohne Metadaten. Ohne diese Abfrage
       * liefe er in den Metadaten-Vergleich und käme als „passt nicht"
       * heraus — richtiges Ergebnis aus dem falschen Grund. Ausdrücklich
       * geprüft bleibt es lesbar.
       */
      if (!kunde.deleted && kunde.metadata?.[BETRIEB_SCHLUESSEL] === betriebId) {
        return kunde;
      }

      console.error(
        `[stripe] gespeicherte Kunden-ID ${kundeId} passt nicht zu Betrieb ${betriebId} — weiter über E-Mail`,
      );
    } catch (ursache) {
      /*
       * Unbekannte ID — etwa nach einem Wechsel zwischen Sandbox und
       * Produktion. Kein Abbruch: der Fallback darunter kann die Lage
       * noch retten, und ein harter Fehler nähme ihm die Gelegenheit.
       */
      const text = ursache instanceof Error ? ursache.message : String(ursache);
      console.error(`[stripe] customers.retrieve(${kundeId}): ${text}`);
    }
  }

  const vorhandene = await stripe.customers.list({ email, limit: 100 });
  return (
    vorhandene.data.find(
      (kunde) => kunde.metadata?.[BETRIEB_SCHLUESSEL] === betriebId,
    ) ?? null
  );
}

/**
 * Findet den Stripe-Kunden zu diesem Betrieb oder legt ihn an.
 *
 * Der Idempotenz-Schlüssel fängt ab, was die Suche nicht kann: zwei
 * Anfragen im selben Augenblick, bei denen beide die Liste noch leer
 * gesehen haben.
 *
 * Neu angelegte Kunden tragen seit dem 2026-09-13 Betriebsname und Land
 * (siehe `stelleSteuerstandortSicher`); vorhandene bekommen beides
 * nachgetragen, falls es fehlt.
 */
export async function holeOderErstelleKunde({
  betriebId,
  email,
  kundeId = null,
  rechnung,
}: {
  betriebId: string;
  email: string;
  kundeId?: string | null;
  rechnung: Rechnungsangaben | null;
}): Promise<Stripe.Customer> {
  const stripe = stripeKlient();

  const passend = await sucheKunde({ betriebId, email, kundeId });
  if (passend) return stelleSteuerstandortSicher(passend, rechnung);

  if (!rechnung) {
    throw new Error(
      `Betrieb ${betriebId}: ohne Name und Land lässt sich kein Stripe-Kunde mit Steuerstandort anlegen.`,
    );
  }

  return stripe.customers.create(
    {
      email,
      name: rechnung.name,
      address: { country: rechnung.land },
      preferred_locales: ["de"],
      metadata: { [BETRIEB_SCHLUESSEL]: betriebId },
    },
    /*
     * `:steuer` im Schlüssel, weil sich die Parameter am 2026-09-13
     * geändert haben: ein Schlüssel aus den 24 Stunden davor mit den alten
     * Parametern würde sonst mit einem Idempotenzfehler abgelehnt.
     */
    { idempotencyKey: `betrieb:${betriebId}:kunde:steuer` },
  );
}
