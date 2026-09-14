/**
 * Wann endet ein Vertrag — und was heisst „endet" überhaupt?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum es diese Datei gibt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Entwurf der Löschmigration rechnete Fristen auf
 * `betrieb_abonnements.aktualisiert_am`. Dieser Wert heisst „zuletzt vom
 * Webhook gesehen" — er springt bei jedem Ereignis nach vorn, auch bei
 * einem Planwechsel oder einer erfolgreichen Abbuchung. Eine Löschfrist
 * darauf zu rechnen heisst: der Betrieb wird 30 Tage nach dem letzten
 * *beliebigen* Stripe-Ereignis gelöscht. Bei einem gekündigten Vertrag,
 * für den danach noch eine Schlussrechnung entsteht, verschiebt sich die
 * Frist; bei einem stillen Vertrag greift sie zu früh. In beide
 * Richtungen falsch, und in einer Richtung unwiederbringlich.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Drei Zustände, die ständig verwechselt werden
 * ─────────────────────────────────────────────────────────────────────
 *
 * | Zustand | Stripe | Läuft der Dienst? | Löschfrist läuft? |
 * | ------- | ------ | ----------------- | ----------------- |
 * | **vorgemerkte Kündigung** | `cancel_at_period_end` / `cancel_at` gesetzt, Status weiter `active` | ja, bis zum Periodenende | **nein** |
 * | **beendet** | `ended_at` gesetzt, Status `canceled` | nein | ja, ab `ended_at` |
 * | **pausiertes Testabo** | Status `paused` | nein (Verwaltung gesperrt) | eigene Frist, ab `pausiert_seit` |
 *
 * Die erste Zeile ist die, an der man sich verrechnet: ein Kunde, der
 * heute kündigt, hat **noch keinen** beendeten Vertrag. Wer die
 * Löschfrist ab dem Kündigungsklick zählt, löscht mitten im bezahlten
 * Zeitraum.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Stripe ist die Quelle, nicht unsere Tabelle
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betrieb_abonnements` hat für keinen der drei Zeitpunkte eine Spalte.
 * Diese Datei leitet sie aus dem Stripe-Objekt ab — der Stelle, an der
 * sie tatsächlich entstehen. Die vorbereitete Migration
 * `docs/backend/migration-2026-09-14-vertragsende.sql` ergänzt die
 * Spalten und lässt den Webhook genau diese Werte schreiben, damit ein
 * Löschjob sie lesen kann, ohne für jeden Betrieb bei Stripe anzufragen.
 *
 * Bis dahin ist diese Ableitung der einzige belastbare Weg — und sie ist
 * ohne Migration benutzbar.
 */

/**
 * Die Felder eines Stripe-Abos, auf die es hier ankommt.
 *
 * Absichtlich ein eigener, schmaler Typ statt `Stripe.Subscription`:
 * diese Datei soll ohne das Stripe-SDK auskommen (und damit ohne den
 * Secret Key und ohne `next/navigation` im Testlauf — siehe
 * `scripts/test-loader.mjs`). Die Feldnamen sind die von Stripe;
 * Zeitangaben sind Unix-Sekunden, so wie die API sie liefert.
 */
export type AboZeiten = {
  status: string;
  /** Gesetzt, sobald das Abo tatsächlich beendet wurde. */
  ended_at?: number | null;
  /** Zeitpunkt, zu dem eine vorgemerkte Kündigung wirksam wird. */
  cancel_at?: number | null;
  /** Kündigung zum Ende des laufenden Zeitraums vorgemerkt. */
  cancel_at_period_end?: boolean | null;
  /** Wann die Kündigung *erklärt* wurde — nicht, wann sie wirkt. */
  canceled_at?: number | null;
  /** Ende der Testphase. */
  trial_end?: number | null;
  /** Ende des laufenden Abrechnungszeitraums (am Posten, seit API 2025-03-31). */
  periode_ende?: number | null;
};

export type VertragsLage =
  /** Läuft, nichts vorgemerkt. */
  | { art: "laeuft" }
  /**
   * Gekündigt, aber noch nicht beendet. Der Dienst läuft weiter, und es
   * läuft **keine** Löschfrist.
   */
  | { art: "kuendigung-vorgemerkt"; wirksamAm: Date | null }
  /** Beendet. Ab hier laufen Export- und Löschfristen. */
  | { art: "beendet"; beendetAm: Date }
  /**
   * Testphase ohne Zahlungsmittel abgelaufen, Abo pausiert. Eigene
   * Frist, eigener Ausgang (Zahlungsmittel nachreichen).
   */
  | { art: "pausiert"; seit: Date | null };

function alsDatum(sekunden: number | null | undefined): Date | null {
  return typeof sekunden === "number" && Number.isFinite(sekunden)
    ? new Date(sekunden * 1000)
    : null;
}

/**
 * Ordnet ein Stripe-Abo einer der vier Lagen zu.
 *
 * Die Reihenfolge der Prüfungen ist verhaltensrelevant:
 *
 * 1. **`ended_at` zuerst.** Ist es gesetzt, ist der Vertrag beendet —
 *    unabhängig davon, was `cancel_at_period_end` noch sagt. Stripe
 *    lässt beide Felder nebeneinander stehen.
 * 2. **`paused` vor der Kündigungsvormerkung**, weil ein pausiertes
 *    Testabo seine eigene Frist hat (AGB § 5 Abs. 3) und nicht in die
 *    Vertragsende-Frist des § 6 Abs. 4 fallen soll.
 * 3. **Vormerkung zuletzt** — sie ist der Zustand, in dem noch nichts
 *    passiert ist.
 *
 * `canceled` ohne `ended_at` kommt vor (etwa bei sehr alten Abos). Dann
 * fehlt uns der Zeitpunkt, und die Funktion sagt das, statt einen zu
 * erfinden: `beendetAm` bleibt dann nicht etwa `now()`, sondern die Lage
 * ist `beendet` mit dem einzigen Zeitpunkt, der belegt ist —
 * `canceled_at`. Fehlt auch der, ist es keine belastbare Grundlage für
 * eine Löschung, und `vertragsEndeFuerLoeschung()` unten gibt `null`
 * zurück.
 */
export function ermittleVertragsLage(abo: AboZeiten): VertragsLage {
  const beendet = alsDatum(abo.ended_at);
  if (beendet) return { art: "beendet", beendetAm: beendet };

  if (abo.status === "paused") {
    // `trial_end` ist der Zeitpunkt, zu dem Stripe pausiert hat — ein
    // eigenes „pausiert seit" führt die API nicht.
    return { art: "pausiert", seit: alsDatum(abo.trial_end) };
  }

  if (abo.status === "canceled") {
    const ersatz = alsDatum(abo.canceled_at);
    if (ersatz) return { art: "beendet", beendetAm: ersatz };
    // Beendet, aber ohne belegbaren Zeitpunkt — siehe unten.
    return { art: "kuendigung-vorgemerkt", wirksamAm: null };
  }

  if (abo.cancel_at_period_end === true || abo.cancel_at) {
    return {
      art: "kuendigung-vorgemerkt",
      wirksamAm: alsDatum(abo.cancel_at) ?? alsDatum(abo.periode_ende),
    };
  }

  return { art: "laeuft" };
}

/**
 * Der Zeitpunkt, ab dem die Fristen des § 6 Abs. 4 AGB laufen — oder
 * `null`, wenn keiner belegt ist.
 *
 * **`null` heisst: nicht löschen.** Nicht „sofort löschen", nicht „heute
 * annehmen". Ein Löschjob, der bei fehlendem Datum rät, löscht früher
 * oder später den falschen Betrieb; einer, der stehen bleibt, erzeugt
 * eine Zeile im Protokoll, die jemand ansieht.
 *
 * Eine **vorgemerkte** Kündigung ergibt ausdrücklich `null`: der Vertrag
 * läuft noch, der Kunde zahlt, und es gibt nichts zu löschen.
 */
export function vertragsEndeFuerLoeschung(abo: AboZeiten): Date | null {
  const lage = ermittleVertragsLage(abo);
  return lage.art === "beendet" ? lage.beendetAm : null;
}

/**
 * Der Beginn der 90-Tage-Frist für ein pausiertes Testabo (AGB § 5
 * Abs. 3), oder `null`.
 *
 * Getrennt von `vertragsEndeFuerLoeschung()`, weil es eine **andere**
 * Frist mit einem **anderen** Ausgang ist: aus `pausiert` führt das
 * Nachreichen eines Zahlungsmittels heraus, aus `beendet` nicht.
 */
export function pausiertSeit(abo: AboZeiten): Date | null {
  const lage = ermittleVertragsLage(abo);
  return lage.art === "pausiert" ? lage.seit : null;
}
