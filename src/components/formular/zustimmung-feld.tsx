/**
 * Das Pflicht-Kontrollkästchen für AGB, AVV und Datenschutzerklärung.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine Umsetzung, zwei Aufrufer
 * ─────────────────────────────────────────────────────────────────────
 *
 * Es steht an zwei Stellen: bei der Registrierung (Schritt 1) und im
 * Zustimmungs-Tor des Dashboards, das Bestandsbetriebe nachholen lässt,
 * was es bei ihrer Registrierung noch nicht gab. Beide zeigen denselben
 * Satz, dieselben drei Links und dieselbe Fehlermeldung — zwei Kopien
 * wären zwei Gelegenheiten, sich zu widersprechen, und ausgerechnet bei
 * dem Text, der später den Nachweis trägt.
 *
 * Der Wert ist `"ja"` und nicht der Browser-Standard `"on"`: geprüft
 * wird er gegen `z.literal("ja")` in `feldSchemata.zustimmung`, und ein
 * sprechender Wert erspart beim Lesen des Schemas die Rückfrage, woher
 * `"on"` kommt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Links in einem neuen Tab öffnen
 * ─────────────────────────────────────────────────────────────────────
 *
 * An beiden Stellen ist das Formular zu diesem Zeitpunkt ausgefüllt —
 * bei der Registrierung mit Betriebsname, Land und zwei Namen. Ein
 * Wechsel im selben Tab nähme das beim Zurückkommen mit. `rel` gehört
 * zu `target="_blank"` dazu.
 *
 * `required` ist dabei nur die Browser-Zusage. Die Prüfung, die zählt,
 * steht im Zod-Schema und läuft damit auch in der Server Action —
 * belegt am 2026-09-10, indem das Attribut im Browser entfernt und
 * abgeschickt wurde: der Server hat abgelehnt.
 */
import type { Dictionary } from "@/i18n/de";

export function ZustimmungFeld({
  idPraefix = "",
  vorbelegt = false,
  fehler,
  texte,
}: {
  /** Trennt die Feld-Ids, wenn zwei Formulare auf derselben Seite stehen. */
  idPraefix?: string;
  /** Nach einem Validierungsfehler bleibt der Haken gesetzt. */
  vorbelegt?: boolean;
  /** Meldung aus der Server Action, sonst `undefined`. */
  fehler?: string;
  /**
   * Der Zustimmungssatz in Segmenten, in der Sprache der Anfrage. Kommt
   * vom Server-Elternteil — sowohl bei der Registrierung als auch im
   * Zustimmungs-Tor des Dashboards.
   */
  texte: Dictionary["zustimmungFeld"];
}) {
  const fehlerId = `${idPraefix}zustimmung-fehler`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-text">
        <input
          type="checkbox"
          name="zustimmung"
          value="ja"
          required
          defaultChecked={vorbelegt}
          aria-describedby={fehler ? fehlerId : undefined}
          className="mt-1"
        />
        {/*
          Seit dem 2026-09-13 mit der Vertretungsversicherung (§ 1 Abs. 5
          AVV) und ohne „akzeptiere die Datenschutzerklärung": AGB und AVV
          schliesst man für den Betrieb ab, eine Datenschutzerklärung nimmt
          man zur Kenntnis — sie ist eine Information, kein Vertrag.
        */}
        <span>
          {texte.vorAgb}
          <a
            href="/agb"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-signal"
          >
            {texte.agb}
          </a>
          {texte.zwischen}
          <a
            href="/avv"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-signal"
          >
            {texte.avv}
          </a>
          {texte.nachAvv}
          <a
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-signal"
          >
            {texte.datenschutz}
          </a>
          {texte.nachDatenschutz}
        </span>
      </label>

      {fehler ? (
        <p id={fehlerId} className="text-sm text-stop">
          {fehler}
        </p>
      ) : null}
    </div>
  );
}
