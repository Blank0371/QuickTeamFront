"use client";

import type { ReactNode } from "react";

import { useKlientTexte } from "@/i18n/sprach-provider";

/**
 * Eingabefelder für alle Auth-Formulare.
 *
 * Jedes Feld hat ein echtes `<label for>`, Fehlermeldung und Hinweis
 * hängen über `aria-describedby` daran. Die Höhe liegt bei 44px, damit
 * die Felder auch mit dem Daumen um 23 Uhr treffbar sind.
 */

const feldBasis =
  "w-full rounded-blk border bg-surface px-3.5 py-2.5 text-base text-text " +
  "transition-colors placeholder:text-muted";

/**
 * `weitere` hängt eine Beschreibung an, die **ausserhalb** des Feldes
 * steht — gebraucht für die Passwort-Kriterienliste unter dem
 * Registrierungsfeld. Sie über `hinweis` zu reichen ginge nicht: der
 * Hinweis wird in ein `<p>` gerendert, und eine `<ul>` darin ist
 * ungültiges HTML, das der Browser stillschweigend auseinandernimmt.
 */
function beschreibungIds(
  id: string,
  fehler?: string,
  hinweis?: ReactNode,
  weitere?: string,
) {
  const ids: string[] = [];
  if (hinweis) ids.push(`${id}-hinweis`);
  if (weitere) ids.push(weitere);
  if (fehler) ids.push(`${id}-fehler`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function Rahmen({
  id,
  label,
  fehler,
  hinweis,
  unten,
  children,
}: {
  id: string;
  label: string;
  fehler?: string;
  hinweis?: ReactNode;
  /** Zwischen Feld und Fehlermeldung — z. B. die Passwort-Kriterien. */
  unten?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>

      {hinweis ? (
        <p id={`${id}-hinweis`} className="text-xs leading-relaxed text-muted">
          {hinweis}
        </p>
      ) : null}

      {children}

      {unten ? <div className="mt-0.5">{unten}</div> : null}

      {fehler ? (
        <p id={`${id}-fehler`} className="text-sm font-medium text-stop">
          {fehler}
        </p>
      ) : null}
    </div>
  );
}

export function TextFeld({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  fehler,
  hinweis,
  maxLength,
  required = true,
  min,
  step,
  beschriebenVon,
  beiEingabe,
  wert,
  beiEnter,
  unten,
}: {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "tel" | "number";
  autoComplete?: string;
  defaultValue?: string;
  fehler?: string;
  hinweis?: ReactNode;
  maxLength?: number;
  required?: boolean;
  /** Nur für `type="number"`. */
  min?: number;
  /**
   * `"any"` schaltet die Schrittprüfung des Browsers ab.
   *
   * Für alles, dessen Wert aus einer Umrechnung zurückkommt, ist das die
   * einzig sichere Angabe: `87 / 4,33` ergibt 20,1, und gegen ein
   * `step="0.5"` ist das ein Verstoss. Der Browser blockiert dann **das
   * ganze Formular** — ohne Meldung, wenn der Absendeversuch nicht vom
   * Nutzer selbst kam. Genau so ist es am 2026-09-08 im Test
   * aufgefallen: gespeichert wurde nichts mehr, und nichts sagte warum.
   */
  step?: number | "any";
  /** ID einer Beschreibung, die unterhalb des Feldes steht. */
  beschriebenVon?: string;
  /**
   * Wird bei jedem Tastendruck mit dem aktuellen Wert gerufen. Das Feld
   * bleibt dabei ungesteuert — der Wert kommt aus dem DOM, nicht aus
   * React. Ein gesteuertes Passwortfeld würde den Wert durch den
   * Render-Zyklus schleifen, ohne dass irgendetwas davon hätte.
   */
  beiEingabe?: (wert: string) => void;
  /**
   * Macht das Feld gesteuert. Nur setzen, wo der Wert von aussen
   * zurückgesetzt werden muss — im Rollen-Editor von Schritt 3 etwa
   * leert der „Hinzufügen"-Knopf das Feld, und ein `defaultValue` würde
   * das nicht mitbekommen: das DOM behält seinen Wert.
   */
  wert?: string;
  /** Enter im Feld, ohne dass ein `<form>` darum herum stehen muss. */
  beiEnter?: () => void;
  /** Erscheint direkt unter dem Feld, vor der Fehlermeldung. */
  unten?: ReactNode;
}) {
  return (
    <Rahmen id={id} label={label} fehler={fehler} hinweis={hinweis} unten={unten}>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        {...(wert === undefined ? { defaultValue } : { value: wert })}
        maxLength={maxLength}
        required={required}
        min={min}
        step={step}
        onChange={beiEingabe ? (e) => beiEingabe(e.target.value) : undefined}
        onKeyDown={
          beiEnter
            ? (e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                beiEnter();
              }
            : undefined
        }
        aria-invalid={fehler ? true : undefined}
        aria-describedby={beschreibungIds(id, fehler, hinweis, beschriebenVon)}
        className={`${feldBasis} ${fehler ? "border-stop" : "border-line-strong"}`}
      />
    </Rahmen>
  );
}

/**
 * Eingabe für den Bestätigungscode aus der E-Mail.
 *
 * Bewusst **ein** Feld und nicht acht einzelne Kästchen. Einzelkästchen
 * sehen aufgeräumter aus, kosten aber genau das, was hier zählt:
 * Screenreader lesen acht unbeschriftete Felder vor, Einfügen aus der
 * Zwischenablage muss per JavaScript auf die Kästchen verteilt werden, und
 * Rücktaste am Feldanfang braucht Sonderbehandlung. Ein Feld mit
 * `autoComplete="one-time-code"` bekommt die Code-Erkennung von iOS und
 * Android geschenkt, Einfügen funktioniert von selbst, und es bleibt bei
 * einem `<label>`.
 *
 * `inputMode="numeric"` öffnet mobil den Ziffernblock; `pattern` ist die
 * Rückfallebene für Browser ohne `inputMode`.
 */
export function CodeFeld({
  id,
  name,
  label,
  laenge,
  defaultValue,
  fehler,
  hinweis,
}: {
  id: string;
  name: string;
  label: string;
  laenge: number;
  defaultValue?: string;
  fehler?: string;
  hinweis?: ReactNode;
}) {
  return (
    <Rahmen id={id} label={label} fehler={fehler} hinweis={hinweis}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern={`[0-9]{${laenge}}`}
        autoComplete="one-time-code"
        autoCapitalize="off"
        spellCheck={false}
        // Etwas Luft für versehentlich mitkopierte Leerzeichen; die
        // Validierung entfernt sie, bevor sie stören.
        maxLength={laenge + 4}
        defaultValue={defaultValue}
        required
        aria-invalid={fehler ? true : undefined}
        aria-describedby={beschreibungIds(id, fehler, hinweis)}
        className={
          "w-full rounded-blk border bg-surface px-3.5 py-3 text-center font-mono " +
          "text-2xl tracking-[0.3em] text-text transition-colors placeholder:tracking-normal " +
          "placeholder:text-muted " +
          (fehler ? "border-stop" : "border-line-strong")
        }
      />
    </Rahmen>
  );
}

export function SelectFeld({
  id,
  name,
  label,
  optionen,
  defaultValue,
  fehler,
  hinweis,
  leerText,
  beiAenderung,
}: {
  id: string;
  name: string;
  label: string;
  optionen: readonly { code: string; name: string }[];
  defaultValue?: string;
  fehler?: string;
  hinweis?: ReactNode;
  /**
   * Beschriftung einer **wählbaren** Leer-Option. Ohne diese Angabe
   * bleibt es beim gesperrten „Bitte wählen" — der Pflichtfall, für den
   * das Feld gebaut wurde (Land bei der Registrierung).
   *
   * Gesetzt wird sie dort, wo „nichts davon" eine gültige Antwort ist:
   * die Vertragsart ist nullable, und ein Select ohne Rückweg zwänge
   * jeden, der sich verklickt hat, zu einer Angabe, die er nicht machen
   * wollte.
   */
  leerText?: string;
  /**
   * Wird bei jeder Auswahl mit dem neuen Code aufgerufen.
   *
   * Ergänzt am 2026-09-14 für die Landwahl in den Rechnungsangaben: dort
   * hängt ein weiteres Feld an der Auswahl (die UID gibt es nur für
   * Österreich), und das muss die Insel mitbekommen. Das Feld bleibt
   * **unkontrolliert** — `defaultValue` steuert weiterhin die Anzeige,
   * der Rückruf meldet nur. Ein kontrolliertes Feld hätte die acht
   * bestehenden Aufrufer verändert, die alle ohne Zustand auskommen.
   */
  beiAenderung?: (wert: string) => void;
}) {
  const { formular } = useKlientTexte();

  return (
    <Rahmen id={id} label={label} fehler={fehler} hinweis={hinweis}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        onChange={beiAenderung ? (e) => beiAenderung(e.target.value) : undefined}
        required={leerText === undefined}
        aria-invalid={fehler ? true : undefined}
        aria-describedby={beschreibungIds(id, fehler, hinweis)}
        className={`${feldBasis} ${fehler ? "border-stop" : "border-line-strong"}`}
      >
        <option value="" disabled={leerText === undefined}>
          {leerText ?? formular.bitteWaehlen}
        </option>
        {optionen.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </Rahmen>
  );
}

/**
 * Formularweite Meldung. `role="alert"` sorgt dafür, dass sie nach dem
 * Absenden auch vorgelesen wird, statt nur dazustehen.
 */
export function FormMeldung({
  art,
  children,
}: {
  art: "fehler" | "erfolg";
  children: ReactNode;
}) {
  const stil =
    art === "fehler"
      ? "border-stop/40 bg-stop/10 text-text"
      : "border-ok/40 bg-ok/10 text-text";

  return (
    <p role="alert" className={`rounded-blk border px-4 py-3 text-sm leading-relaxed ${stil}`}>
      {children}
    </p>
  );
}
