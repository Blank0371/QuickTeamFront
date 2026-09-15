/**
 * Fassungen von AGB, AVV und Datenschutzinformation.
 * AGB/AVV werden für den Betrieb angenommen; Datenschutz wird persönlich
 * zur Kenntnis genommen und ist keine pauschale Verarbeitungseinwilligung.
 * Bei Änderungen beide Sprachfassungen, Dokumentdatum und Versionsschlüssel
 * gemeinsam aktualisieren. Vorgängertexte samt Hash archivieren.
 * Der Zusatz -draft kennzeichnet den noch nicht anwaltlich geprüften Stand.
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
 * Deckt sich mit der `Stand:`-Zeile der jeweiligen Datei.
 *
 * **AGB und Datenschutzerklärung tragen seit dem 2026-09-13 den Zusatz
 * `-r2-`**, weil sie an diesem Tag ein zweites Mal geändert wurden:
 *
 * - AGB § 6 Abs. 4 — Exportanfrage und Löschung waren nicht aufeinander
 *   abgestimmt. Ein am dreissigsten Tag nach Vertragsende gestelltes
 *   Verlangen hatte eine Bearbeitungszeit von dreissig Tagen, die Daten
 *   wurden aber am selben dreissigsten Tag gelöscht — die Frist lief
 *   also gegen bereits gelöschte Quelldaten. Dazu § 5 Abs. 3, der für
 *   ruhende Abos ausdrücklich **abweichend** sofort löschen liess und
 *   damit sowohl § 8 Abs. 2 des AVV als auch Ziffer 15.3 der
 *   Datenschutzerklärung widersprach.
 * - Datenschutzerklärung Ziffer 6 — die Aufzählung der an Stripe
 *   übermittelten Daten nannte E-Mail, Betriebskennung und Tarif. Seit
 *   der Umstellung auf Stripe Tax gehen zusätzlich Betriebsname, Land,
 *   Rechnungssprache und, bei österreichischen Betrieben auf Wunsch,
 *   die UID-Nummer mit.
 *
 * **Die Datenschutzerklärung ist am 2026-09-14 ein weiteres Mal geändert**
 * (`2026-09-14-draft`, auf der r2-Fassung aufbauend): Ziffer 5.2 und 15 —
 * Zustimmungen zu AGB und AVV werden archiviert und bis zum Ende des dritten
 * Kalenderjahres nach Vertragsende aufbewahrt; Ziffer 15.3 — Anmeldekonten
 * ohne weitere Anstellung werden mit dem Betrieb gelöscht. Hintergrund:
 * `docs/backend-befunde-2026-09-14.md`.
 *
 * **Der AVV ist unverändert** und behält deshalb seine Fassung. Dass die
 * drei Werte auseinanderlaufen dürfen, ist der Sinn eines Wertes je
 * Dokument: eine gemeinsame Konstante hätte hier eine Änderung des AVV
 * behauptet, die es nicht gab — und jeden Kunden nach einer Zustimmung
 * zu einem Dokument gefragt, an dem sich nichts geändert hat.
 *
 * Eine geänderte Fassung **sperrt niemanden** (siehe
 * `ermittleZustimmungBefund` in `zustimmung.ts`): wer schon einmal
 * zugestimmt hat, bekommt einen Hinweis und arbeitet nach § 13 Abs. 3
 * der AGB unter den bisherigen Bedingungen weiter.
 */
// Überarbeitung 15.09.2026: AGB, AVV und Datenschutz in beiden Sprachen.
// Vorgängerfassungen: docs/rechtliches/archiv/vor-2026-09-15/.
// Betriebsabhängigkeiten vor Veröffentlichung: docs/rechtliches/ABGLEICH-2026-09-15.md.
export const RECHTSTEXT_VERSIONEN: Record<ZustimmungDokument, string> = {
  agb: "2026-09-15-r2-draft",
  avv: "2026-09-15-r2-draft",
  datenschutz: "2026-09-15-r2-draft",
};

/**
 * Welche Datei trägt welches Dokument, je Sprache — relativ zu
 * `docs/rechtliches/`.
 *
 * Dieselben Pfade wie in den drei Rechtsrouten (`/agb`, `/avv`,
 * `/datenschutz`). Sie stehen hier ein zweites Mal, weil der
 * Zustimmungsnachweis seit dem 2026-09-13 den **Inhalt** der
 * angenommenen Fassung festhält (`rechtliche_zustimmungen.inhalt_hash`)
 * und dafür wissen muss, welche Datei zu welchem Dokument gehört. Die
 * Routen bleiben die Anzeige, das hier ist die Beweisspur; sie fallen
 * auseinander, wenn jemand eine Datei umbenennt und nur eine Seite
 * mitzieht — deshalb prüft `zustimmungHashes()` das Lesen und meldet
 * einen Fehlschlag ins Protokoll, statt still ohne Hash zu schreiben.
 */
export const ZUSTIMMUNG_DATEIEN: Record<
  ZustimmungDokument,
  { de: string; en: string }
> = {
  agb: { de: "legals/AGB-QuickTeam-de.md", en: "legals/Terms-QuickTeam-en.md" },
  avv: { de: "legals/AVV-QuickTeam-de.md", en: "legals/DPA-QuickTeam-en.md" },
  datenschutz: {
    de: "legals/datenschutzerklaerung-de.md",
    en: "legals/privacy-policy-en.md",
  },
};

/**
 * Blockiert eine fehlende Zustimmung den Zugang?
 *
 * **Nur die betriebliche Vertragsannahme**, und auch die nur bei der
 * Erstannahme (siehe `ermittleZustimmungBefund` in `zustimmung.ts`).
 * Die Datenschutzerklärung ist eine Information, keine Willenserklärung
 * — Art. 13 DSGVO verlangt, dass sie *bereitgestellt* wird, nicht dass
 * ihr jemand zustimmt. Jemanden aus seinem Dienstplan auszusperren,
 * weil er eine Information nicht abgehakt hat, wäre ohne Grundlage.
 */
export function istZugangsvoraussetzung(dokument: ZustimmungDokument): boolean {
  return ZUSTIMMUNG_ART[dokument] === "betrieblich";
}
