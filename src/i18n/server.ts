import type { Dictionary } from "./de";
import { getDictionary } from "./index";
import { leseSprache } from "./sprache";

/**
 * Das Wörterbuch der aktiven Sprache — für Server Components und Server
 * Actions.
 *
 * Zwei Zeilen, die sonst in jeder Datei stünden.
 *
 * **Nicht aus einer Client-Insel importieren.** Über `leseSprache()`
 * hängt hier `next/headers` dran; Next bricht den Build dann mit einer
 * Meldung ab, die auf `next/headers` zeigt statt auf diese Datei. Ein
 * `import "server-only"` würde die Meldung hierher holen — das Paket ist
 * in diesem Projekt aber keine Abhängigkeit, und für eine Fehlermeldung
 * wird keine aufgenommen. Die Grenze steht auch so.
 *
 * `cookies()` ist innerhalb einer Anfrage von Next zwischengespeichert;
 * mehrfaches Aufrufen kostet also nichts.
 */
export async function holeTexte(): Promise<Dictionary> {
  return getDictionary(await leseSprache());
}

/**
 * Nur der Validierungsblock — die häufigste Frage einer Server Action.
 *
 * Gibt es, damit `feldFehler(geprueft.error, await holeValidierung())`
 * an der Aufrufstelle in eine Zeile passt. Die Alternative wäre in jeder
 * der gut zwanzig Aktionen eine eigene `const t`-Zeile gewesen, die dort
 * sonst nichts zu tun hat.
 */
export async function holeValidierung(): Promise<Dictionary["validierung"]> {
  return (await holeTexte()).validierung;
}

/** Dasselbe für `authFehlerText()`. */
export async function holeAuthTexte(): Promise<Dictionary["auth"]> {
  return (await holeTexte()).auth;
}
