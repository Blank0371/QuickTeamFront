/**
 * Fassungen der drei zustimmungspflichtigen Rechtstexte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum hier eine Konstante und kein Parser
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Dokumente tragen ihre Fassung bereits: `**Stand: 10. September
 * 2026**` in der zweiten Zeile, in beiden Sprachfassungen dieselbe.
 * Einen zweiten Marker daneben zu setzen, hiesse zwei Stellen zu
 * pflegen, die auseinanderlaufen können — deshalb steht hier keine
 * Zweitschrift des Datums, sondern der maschinenlesbare Schlüssel dazu.
 *
 * Aus der Zeile zur Laufzeit zu lesen wäre die Alternative gewesen und
 * ist verworfen: „10. September 2026" ist ein deutscher Fliesstext, das
 * englische Gegenstück schreibt „10 September 2026", und ein
 * Datumsparser über Rechtstexte ist genau die Art Mechanik, die
 * unbemerkt das falsche Ergebnis liefert. Eine Zustimmung, die auf die
 * falsche Fassung verweist, ist schlimmer als keine.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Format und `-draft`
 * ─────────────────────────────────────────────────────────────────────
 *
 * `YYYY-MM-DD` mit optionalem Zusatz — übernommen aus der Expo-App
 * (`../QuickTeam App/src/lib/terms.ts`, `TERMS_VERSION =
 * "2026-08-07-draft"`), damit beide Seiten dieselbe Schreibweise
 * benutzen, falls die App ihre Zustimmung eines Tages ebenfalls
 * serverseitig ablegt.
 *
 * Der Zusatz `-draft` ist keine Formalie: `docs/rechtliches/legals/
 * README.md` bezeichnet alle Dokumente ausdrücklich als „pre-lawyer
 * drafts". Fällt die anwaltliche Prüfung, wird der Zusatz entfernt —
 * und weil die Fassung sich damit ändert, ist an der geänderten
 * Zeichenkette ablesbar, wer noch der Entwurfsfassung zugestimmt hat.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Beim Ändern eines Rechtstextes
 * ─────────────────────────────────────────────────────────────────────
 *
 *   1. Text in `docs/rechtliches/legals/` ändern — **beide** Sprachen.
 *   2. `**Stand:**` in beiden Dateien auf das neue Datum setzen.
 *   3. Den Wert hier auf dasselbe Datum setzen.
 *
 * Schritt 3 zu vergessen heisst: neue Zustimmungen verweisen auf eine
 * Fassung, die es nicht mehr gibt.
 */

/** Die Dokumente, denen bei der Registrierung zugestimmt wird. */
export const ZUSTIMMUNG_DOKUMENTE = ["agb", "avv", "datenschutz"] as const;

export type ZustimmungDokument = (typeof ZUSTIMMUNG_DOKUMENTE)[number];

/**
 * Betrieblich oder persönlich — die zwei Arten von Zustimmung.
 *
 * `betrieblich` ist eine **Vertragsannahme für den Betrieb**: AGB und AVV
 * schliesst nur, wer den Betrieb vertreten darf, also ein Chef. `persoenlich`
 * ist eine **Kenntnisnahme durch die Person** selbst: die
 * Datenschutzerklärung. Der Audit (Punkt 11) hat die fehlende Trennung als
 * Fehler benannt — ein gewöhnlicher Mitarbeiter durfte Zeilen anlegen, die
 * als Zustimmung des Betriebs zählten.
 */
export type ZustimmungArt = "betrieblich" | "persoenlich";

/**
 * Welche Art trägt welches Dokument.
 *
 * **Spiegelt die generierte Spalte `rechtliche_zustimmungen.art`** — dort
 * `CASE WHEN dokument IN ('agb','avv') THEN 'betrieblich' ELSE 'persoenlich'`.
 * Die Datenbank ist die Quelle; diese Konstante ist die maschinenlesbare
 * Kopie für das Gate, damit die Website die Trennung explizit prüft und nicht
 * bloss „drei Zeilen vorhanden" zählt. Ändert sich die DB-Regel, gehört sie
 * hier nachgezogen.
 */
export const ZUSTIMMUNG_ART: Record<ZustimmungDokument, ZustimmungArt> = {
  agb: "betrieblich",
  avv: "betrieblich",
  datenschutz: "persoenlich",
};

/**
 * Aktuelle Fassung je Dokument.
 *
 * Deckt sich mit der `Stand:`-Zeile der jeweiligen Datei:
 * AGB und AVV vom 10.09.2026, Datenschutzerklärung vom 09.09.2026.
 */
export const RECHTSTEXT_VERSIONEN: Record<ZustimmungDokument, string> = {
  agb: "2026-09-10-draft",
  avv: "2026-09-10-draft",
  datenschutz: "2026-09-09-draft",
};
