import { holeRechnungsProfil, speichereRechnungAmKunden } from "@/lib/stripe";
import type { RechnungsProfil } from "@/lib/rechnung-pruefung";

/**
 * Rechnungsangaben — Vorbelegung, Prüfung, Speicherung.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum es diese Datei gibt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Entscheidung vom 2026-09-14: **Rechnungsdaten werden vor der
 * Aktivierung des kostenpflichtigen Abonnements verpflichtend erfasst.**
 * Das Stripe-Kundenportal dient danach zum Ändern, nicht zur erstmaligen
 * Vervollständigung.
 *
 * Die Erfassung findet an **zwei** Stellen statt, die dasselbe Formular
 * zeigen: Schritt 2 der Einrichtung und die Sperrseite nach abgelaufener
 * Testphase (Wiederaufnahme eines pausierten Abos). Beide führen zur
 * selben Handlung — eine Zahlungsmethode wird hinterlegt und das Abo
 * damit kostenpflichtig. Deshalb steht die Logik einmal hier und nicht
 * zweimal dort.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was **nicht** davon berührt wird: das kostenlose Testen
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Planwahl legt weiterhin ein Abo mit Testphase **ohne**
 * Zahlungsmittel und **ohne** Rechnungsanschrift an. Das ist keine
 * Nachlässigkeit, sondern die Bedingung: in der Testphase ist nichts
 * fällig, es entsteht keine Rechnung, und eine Pflichtanschrift wäre
 * eine Hürde vor einem unentgeltlichen Angebot. Erst wenn eine Karte
 * hinterlegt wird — also genau dann, wenn eine Rechnung entstehen kann
 * —, sind die Angaben Pflicht.
 */

/**
 * Was das Formular anzeigt, bevor jemand tippt.
 *
 * Die Schlüssel heissen **wie die `name`-Attribute im Formular** und wie
 * die Felder in `rechnungSchema` — nicht wie die Felder von
 * `RechnungsProfil`. Das ist Absicht: so wandert der Zustand der
 * Client-Insel ohne Umbenennung in die Prüfung und von dort in die
 * Fehlermeldungen, die an genau diesen Feldern hängen. Eine Umbenennung
 * dazwischen wäre eine Stelle, an der `plz` und `rechnung_plz`
 * auseinanderlaufen können, ohne dass etwas wirft.
 */
export type RechnungsVorbelegung = {
  rechnung_firma: string;
  rechnung_strasse: string;
  rechnung_plz: string;
  rechnung_ort: string;
  land: string;
  uid: string;
};

const LEER: RechnungsVorbelegung = {
  rechnung_firma: "",
  rechnung_strasse: "",
  rechnung_plz: "",
  rechnung_ort: "",
  land: "",
  uid: "",
};

/**
 * Stellt die Vorbelegung zusammen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Vorrang: Stripe zuerst, `betriebe` nur als Erstbelegung
 * ─────────────────────────────────────────────────────────────────────
 *
 * Was am Stripe-Kunden steht, hat jemand entweder hier eingetragen oder
 * im Kundenportal gepflegt; in beiden Fällen ist es die neuere und für
 * die Rechnung maßgebliche Angabe. Sie darf **nie** von einem Wert aus
 * `betriebe` überschrieben werden — sonst nähme das Formular eine im
 * Portal vorgenommene Korrektur beim nächsten Öffnen wieder zurück.
 *
 * `betriebe` füllt deshalb nur Lücken, und zwar genau eine Lage: es gibt
 * **noch keine Rechnungsadresse**. Dann ist der Betriebsname ein
 * brauchbarer Vorschlag für die Firma und das Betriebsland ein
 * brauchbarer Vorschlag für das Rechnungsland — mehr nicht. Ab dem
 * ersten Speichern ist Stripe die Quelle.
 *
 * **Firma wird vorbelegt, nicht gleichgesetzt.** Bei einem
 * Einzelunternehmen stimmt beides meistens überein; bei einer GmbH heisst
 * der Dienstplan „Café am Markt" und die Rechnung „Marktcafé Huber GmbH".
 *
 * Das Betriebsland als Vorschlag heisst ausdrücklich **nicht**, dass die
 * beiden Werte gekoppelt wären: eine Änderung im Formular wirkt nur auf
 * die Rechnung (siehe `speichereRechnungsangaben`).
 */
export async function holeVorbelegung(
  betriebName: string | null,
  betriebLand: string | null,
  kundeId: string | null,
): Promise<RechnungsVorbelegung> {
  const beiStripe = await holeRechnungsProfil(kundeId);

  /*
   * „Gibt es schon eine Rechnungsadresse?" wird an der **Strasse**
   * festgemacht, nicht am Land. Stripe trägt bei Kunden aus der Zeit vor
   * dieser Änderung nur `address.country` (gesetzt von
   * `stelleSteuerstandortSicher`); ein Land allein ist keine Anschrift.
   * Ohne diese Unterscheidung sähe ein Altkunde „Land vorhanden" und
   * bekäme seinen Betriebsnamen nicht mehr als Firmenvorschlag.
   */
  const hatAnschrift = Boolean(beiStripe?.strasse?.trim());

  return {
    ...LEER,
    rechnung_firma: beiStripe?.firma?.trim() || (hatAnschrift ? "" : betriebName ?? ""),
    rechnung_strasse: beiStripe?.strasse ?? "",
    rechnung_plz: beiStripe?.plz ?? "",
    rechnung_ort: beiStripe?.ort ?? "",
    land: beiStripe?.land ?? (hatAnschrift ? "" : betriebLand ?? ""),
    uid: beiStripe?.uid ?? "",
  };
}

/**
 * Schreibt die geprüften Angaben — **ausschliesslich** an den
 * Stripe-Kunden.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Entscheidung vom 2026-09-14: `betriebe.land` wird hier NICHT
 *  geändert.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Fassung vom Vormittag schrieb ein geändertes Rechnungsland nach
 * `betriebe.land` durch — mit der Begründung, ein Betrieb dürfe nicht
 * zwei Länder haben. Die Begründung war richtig, die Folgerung falsch:
 * es sind zwei **verschiedene** Angaben, und sie dürfen auseinanderfallen.
 *
 * `betriebe.land` ist ein **betrieblicher Standort** und steuert die
 * Arbeitszeitprüfung. Am 2026-09-14 im Katalog nachgesehen, welche
 * Funktionen ihn lesen:
 *
 *   - `pruefe_zuweisung_regeln`   — Höchstarbeitszeit, Ruhezeit, Pausen
 *   - `netto_arbeitszeit_stunden` — Pausenabzug nach Landesrecht
 *   - `registriere_betrieb`       — setzt ihn einmalig bei der Anlage
 *
 * Er entscheidet also darüber, ob eine Schicht überhaupt zugewiesen
 * werden darf. Ein Kunde, der im Zahlungsformular seine Rechnungsadresse
 * korrigiert — etwa auf den Sitz der Muttergesellschaft oder des
 * Steuerberaters —, ändert damit **stillschweigend die arbeitsrechtliche
 * Bewertung jeder Schicht seines Betriebs**. Das ist der schlimmste
 * denkbare Nebeneffekt eines Adressfeldes: unsichtbar, wirksam, und er
 * betrifft Dritte (die Beschäftigten), nicht den, der geklickt hat.
 *
 * **Das Rechnungsland lebt deshalb allein bei Stripe.** Dort entsteht
 * die Rechnung, dort rechnet Stripe Tax, und dort hat es keine Wirkung
 * auf den Dienstplan.
 *
 * Ein Wechsel des **betrieblichen** Standorts braucht einen eigenen,
 * ausdrücklich bestätigten Ablauf — mit einer Aussage darüber, was mit
 * bereits geplanten Schichten geschieht, die nach altem Recht geprüft
 * wurden. Solange es den nicht gibt, bleibt `betriebe.land` für
 * bestehende Betriebe unveränderlich. Gesetzt wird er einmal bei der
 * Registrierung, und dabei bleibt es.
 */
export async function speichereRechnungsangaben(
  kundeId: string,
  profil: RechnungsProfil,
): Promise<void> {
  await speichereRechnungAmKunden(kundeId, profil);
}
