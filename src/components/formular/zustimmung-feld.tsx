/**
 * Das Pflicht-Kontrollkästchen für die Rechtstexte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine Umsetzung, drei Varianten
 * ─────────────────────────────────────────────────────────────────────
 *
 * Seit dem 2026-09-22 ist die Zustimmung auf zwei Schritte verteilt: die
 * **Datenschutz**-Kenntnisnahme gehört zum Konto (Registrierung), die
 * **AGB/AVV**-Vertragsannahme zum Betrieb (`/einrichtung/betrieb`). Das
 * Dashboard-Nachhol-Tor zeigt weiterhin **alle drei** in einem Satz. Drei
 * Sätze, ein Kontrollkästchen, eine Fehlermeldung — die `variante`
 * entscheidet nur über den Text und die Links, nicht über die Mechanik.
 *
 * Der Wert ist `"ja"` und nicht der Browser-Standard `"on"`: geprüft
 * wird er gegen `z.literal("ja")` in `feldSchemata.zustimmung`, und ein
 * sprechender Wert erspart beim Lesen des Schemas die Rückfrage, woher
 * `"on"` kommt.
 *
 * Die Links öffnen in einem neuen Tab: an jeder Stelle ist das Formular zu
 * diesem Zeitpunkt ausgefüllt, ein Wechsel im selben Tab nähme das beim
 * Zurückkommen mit. `rel` gehört zu `target="_blank"` dazu.
 *
 * `required` ist dabei nur die Browser-Zusage. Die Prüfung, die zählt,
 * steht im Zod-Schema und läuft damit auch in der Server Action.
 */
import type { Dictionary } from "@/i18n/de";

/** Welche Dokumente der Satz nennt. */
export type ZustimmungVariante = "alle" | "betrieb" | "datenschutz";

function Rechtslink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-signal"
    >
      {children}
    </a>
  );
}

export function ZustimmungFeld({
  idPraefix = "",
  vorbelegt = false,
  fehler,
  texte,
  variante = "alle",
  beiAenderung,
}: {
  /** Trennt die Feld-Ids, wenn zwei Formulare auf derselben Seite stehen. */
  idPraefix?: string;
  /** Nach einem Validierungsfehler bleibt der Haken gesetzt. */
  vorbelegt?: boolean;
  /** Meldung aus der Server Action, sonst `undefined`. */
  fehler?: string;
  /** Der Zustimmungssatz in Segmenten, in der Sprache der Anfrage. */
  texte: Dictionary["zustimmungFeld"];
  variante?: ZustimmungVariante;
  /** Meldet den aktuellen Haken-Zustand nach oben (Client-Komfort). */
  beiAenderung?: (gesetzt: boolean) => void;
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
          onChange={beiAenderung ? (e) => beiAenderung(e.currentTarget.checked) : undefined}
          aria-describedby={fehler ? fehlerId : undefined}
          className="mt-1"
        />
        <span>
          {variante === "datenschutz" ? (
            <>
              {texte.datenschutzVor}
              <Rechtslink href="/datenschutz">{texte.datenschutz}</Rechtslink>
              {texte.datenschutzNach}
            </>
          ) : variante === "betrieb" ? (
            <>
              {texte.betriebVor}
              <Rechtslink href="/agb">{texte.agb}</Rechtslink>
              {texte.betriebZwischen}
              <Rechtslink href="/avv">{texte.avv}</Rechtslink>
              {texte.betriebNach}
            </>
          ) : (
            <>
              {texte.vorAgb}
              <Rechtslink href="/agb">{texte.agb}</Rechtslink>
              {texte.zwischen}
              <Rechtslink href="/avv">{texte.avv}</Rechtslink>
              {texte.nachAvv}
              <Rechtslink href="/datenschutz">{texte.datenschutz}</Rechtslink>
              {texte.nachDatenschutz}
            </>
          )}
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
