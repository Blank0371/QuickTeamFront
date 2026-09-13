/**
 * Auflösung von Meldungsschlüsseln.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum Zod-Meldungen Schlüssel tragen und keine Sätze
 * ─────────────────────────────────────────────────────────────────────
 *
 * `src/lib/validierung.ts` baut seine Schemata im Modul-Scope auf — das
 * ist Absicht und soll so bleiben: dieselben Regeln laufen im Browser
 * (sofortige Rückmeldung) und in der Server Action (die eigentliche
 * Verteidigung), und beide greifen auf dieselbe Konstante zu.
 *
 * Ein Modul-Scope kennt aber keine Sprache. Die Locale steht in einem
 * Cookie und ist erst pro Anfrage bekannt, lange nachdem das Schema
 * gebaut wurde. Ein Schema mit deutschen Sätzen darin ist damit
 * unweigerlich einsprachig.
 *
 * Der Ausweg ist, die Meldung **später** zu übersetzen: Zod trägt einen
 * stabilen Schlüssel, und aufgelöst wird er an genau zwei Stellen —
 * `pruefeFeld()` für den Client und `feldFehler()` für den Server. Beide
 * kennen die Sprache, weil beide zur Laufzeit einer Anfrage stehen.
 *
 * **Die Alternative war eine Schema-Fabrik** — `erstelleSchemata(t)`,
 * pro Sprache neu gebaut. Sie hätte lesbare Sätze im Code behalten,
 * dafür aber rund dreissig Call-Sites umgebaut und jede Client-Insel
 * gezwungen, einen Textblock durchzureichen, nur um ein Schema zu
 * bekommen. Verworfen zugunsten der kleineren Änderung.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Das Format
 * ─────────────────────────────────────────────────────────────────────
 *
 *     "v.email.leer"
 *     "v.passwort.kurz|min=8"
 *     "v.pflicht.lang|bez=@bez.betriebName|max=120"
 *
 * Der Teil vor dem ersten `|` ist der Schlüssel, alles danach sind
 * `name=wert`-Paare. Ein Wert mit führendem `@` ist **selbst ein
 * Schlüssel** und wird zuerst aufgelöst — so kommt „Der Betriebsname"
 * in „Der Betriebsname darf nicht leer sein." hinein, ohne dass die
 * Bezeichnung zweisprachig im Schema stehen müsste.
 *
 * Platzhalter in der Vorlage stehen in geschweiften Klammern:
 * `"{bez} ist zu lang — höchstens {max} Zeichen."`
 */

/** Ein Textblock: flache Zuordnung von Schlüssel auf Vorlage. */
export type Textblock = Record<string, string>;

/**
 * Ersetzt `{name}` durch den passenden Wert.
 *
 * Ein Platzhalter ohne Wert bleibt **stehen**, statt zu „undefined" zu
 * werden: ein sichtbares `{max}` im Text ist ein Fehler, den jemand
 * meldet, ein „undefined" liest sich wie ein Absturz.
 */
export function fuelle(vorlage: string, werte?: Record<string, string | number>): string {
  if (!werte) return vorlage;
  return vorlage.replace(/\{(\w+)\}/gu, (ganzes, name: string) => {
    const wert = werte[name];
    return wert === undefined ? ganzes : String(wert);
  });
}

/**
 * Baut den Meldungsstring, den Zod als `message` trägt.
 *
 * Die Typbindung an `Textblock`-Schlüssel passiert bei den Aufrufern in
 * `validierung.ts` — dort ist der Schlüsseltyp aus dem Wörterbuch
 * importiert, und zwar als `import type`, also ohne dass eine einzige
 * Zeile Deutsch im Client-Bündel landet.
 */
export function meldung(schluessel: string, werte?: Record<string, string | number>): string {
  if (!werte) return schluessel;
  const teile = Object.entries(werte).map(([name, wert]) => `${name}=${wert}`);
  return [schluessel, ...teile].join("|");
}

/**
 * Löst einen Meldungsstring gegen einen Textblock auf.
 *
 * Fehlt ein Schlüssel, kommt er selbst zurück. Das ist kein stiller
 * Rückfall auf Deutsch, sondern eine sichtbare Lücke: `v.email.leer`
 * unter einem Eingabefeld ist offensichtlich falsch und wird gemeldet,
 * während ein deutscher Satz auf einer englischen Seite jahrelang
 * durchgeht.
 */
export function loeseMeldung(roh: string, texte: Textblock): string {
  const [schluessel, ...paare] = roh.split("|");
  if (schluessel === undefined) return roh;

  const vorlage = texte[schluessel];
  if (vorlage === undefined) return schluessel;
  if (paare.length === 0) return vorlage;

  const werte: Record<string, string> = {};
  for (const paar of paare) {
    const trenner = paar.indexOf("=");
    if (trenner === -1) continue;
    const name = paar.slice(0, trenner);
    const wert = paar.slice(trenner + 1);
    /* Führendes @ heisst: der Wert ist selbst ein Schlüssel. */
    werte[name] = wert.startsWith("@") ? (texte[wert.slice(1)] ?? wert.slice(1)) : wert;
  }

  return fuelle(vorlage, werte);
}
