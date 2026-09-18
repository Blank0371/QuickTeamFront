import { rechnungSchema } from "@/lib/validierung";
import type { Textblock } from "@/i18n/text";
import { feldFehler } from "@/lib/formular";

/**
 * Die geprüfte Rechnungsanschrift — und nur sie.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das ein eigenes Modul ist
 * ─────────────────────────────────────────────────────────────────────
 *
 * Weil es **nichts** ausser Zod und den Wörterbüchern braucht. `rechnung.ts`
 * daneben spricht mit Stripe und mit Supabase und zieht damit über
 * `soft-launch-riegel.ts` auch `next/navigation` herein — das ist in einer
 * Server Action richtig und in einem Unit-Test nicht lauffähig
 * (`scripts/test-loader.mjs` erklärt die Grenze).
 *
 * Die Prüfung ist aber genau der Teil, der Tests am nötigsten hat: sie ist
 * die Verteidigung gegen alles, was am Formular vorbei hereinkommt. Sie
 * hier hinzustellen kostet eine Datei und macht sie prüfbar, ohne dass ein
 * Testlauf einen Bundler bräuchte.
 */

/**
 * Die vollständige Rechnungsanschrift.
 *
 * Gespeichert wird sie am Stripe-Kunden (siehe
 * `speichereRechnungAmKunden` in `stripe.ts`): dort entsteht die
 * Rechnung, und `betriebe` hat für Straße, PLZ und Ort keine Spalten —
 * das Schema wird von hier aus nicht verändert (`CLAUDE.md`).
 */
export type RechnungsProfil = {
  /** Rechtlicher Unternehmensname (§ 14 Abs. 4 Nr. 1 UStG). */
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: "AT" | "DE";
  /** Österreichische UID, oder `""` für „keine Angabe". */
  uid: string;
};

export type RechnungsPruefung =
  | { ok: true; profil: RechnungsProfil }
  | { ok: false; felder: Record<string, string> };

/**
 * Prüft die hereingereichten Rechnungsangaben — serverseitig.
 *
 * Dieselbe Regel läuft im Browser (`rechnungSchema` in der Client-Insel).
 * Das ist kein doppelter Aufwand, sondern die Arbeitsteilung aus
 * `.claude/rules/coding.md`: die Browserprüfung ist Bequemlichkeit, diese
 * hier ist die Verteidigung. Wer das Formular umgeht, kommt nicht an ihr
 * vorbei.
 *
 * **Für österreichische Rechnungsempfänger ist die UID Pflicht**
 * (Produktentscheidung vom 2026-09-18): das erzwingt `rechnungSchema`,
 * eine leere UID bei `land = "AT"` fällt hier durch. **Für deutsche
 * Betriebe wird eine hereingereichte UID verworfen**, nicht abgelehnt:
 * das Feld wird dort gar nicht angezeigt, ein Wert kann also nur aus
 * einer manipulierten Anfrage stammen — und für einen Inlandsumsatz
 * ändert er ohnehin nichts. Ein Fehler wäre eine Meldung zu einem Feld,
 * das der Absender nie gesehen hat.
 */
export function pruefeRechnung(
  roh: Record<string, string>,
  texte: Textblock,
): RechnungsPruefung {
  const geprueft = rechnungSchema.safeParse({
    rechnung_firma: roh["rechnung_firma"] ?? "",
    rechnung_strasse: roh["rechnung_strasse"] ?? "",
    rechnung_plz: roh["rechnung_plz"] ?? "",
    rechnung_ort: roh["rechnung_ort"] ?? "",
    land: roh["land"] ?? "",
    uid: roh["uid"] ?? "",
  });

  if (!geprueft.success) {
    return { ok: false, felder: feldFehler(geprueft.error, texte) };
  }

  const daten = geprueft.data;

  return {
    ok: true,
    profil: {
      firma: daten.rechnung_firma,
      strasse: daten.rechnung_strasse,
      plz: daten.rechnung_plz,
      ort: daten.rechnung_ort,
      land: daten.land,
      uid: daten.land === "AT" ? daten.uid : "",
    },
  };
}
