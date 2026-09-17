/**
 * Wie das Exportpaket zu Text wird.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum nicht `JSON.stringify(paket, null, 2)`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Weil die Einrückung jedem einzelnen Wert eine eigene Zeile gibt. Ein
 * Protokolleintrag mit acht Feldern wird so zu zehn Zeilen, und bei
 * einem Testbetrieb mit 5.719 Einträgen sind das 122.863 Zeilen für
 * knapp 4 MB Daten — eine Datei, die kein Werkzeug mehr gern öffnet und
 * die niemand überfliegen kann.
 *
 * Ohne Einrückung wäre das Gegenteil der Fall: **eine** Zeile, 4 MB
 * lang. Maschinell einwandfrei, für einen Menschen unbrauchbar — und
 * der Export ist ausdrücklich auch ein Dokument, das ein Kunde ansieht,
 * bevor er es weitergibt (`beschreibungen`, `hinweise`, `ausschluesse`
 * sind für ihn geschrieben, nicht für einen Importer).
 *
 * Deshalb der Mittelweg: **die Struktur wird eingerückt, ein Datensatz
 * ist eine Zeile.** Das Gerüst — `meta`, `hinweise`, die Tabellennamen —
 * bleibt lesbar wie zuvor, und die Datensatzlisten darunter werden zu
 * je einer Zeile pro Zeile der Tabelle. Aus 140.000 Zeilen werden rund
 * 7.000, ohne dass ein einziger Wert fehlt.
 *
 * Die Ausgabe ist gewöhnliches JSON — jedes Werkzeug liest sie wie
 * bisher. Es ändert sich nur, wo die Zeilenumbrüche stehen.
 */

const EINZUG = "  ";

/** Serialisiert das Paket: Struktur eingerückt, ein Datensatz je Zeile. */
export function serialisierePaket(wert: unknown): string {
  return schreibe(wert, "");
}

/**
 * Eine Liste, deren Einträge allesamt Datensätze sind — genau die Form,
 * die kompakt geschrieben wird.
 *
 * Bewusst nicht „Liste von irgendetwas": `hinweise` ist eine Liste von
 * Sätzen, und die steht besser einzeln untereinander, weil ein Mensch
 * sie liest. Gemeint sind die Zeilen der Tabellen.
 */
function istDatensatzListe(werte: unknown[]): boolean {
  return werte.every(
    (eintrag) => typeof eintrag === "object" && eintrag !== null && !Array.isArray(eintrag),
  );
}

function schreibe(wert: unknown, einzug: string): string {
  if (wert === undefined) return "null";
  if (wert === null || typeof wert !== "object") return JSON.stringify(wert) ?? "null";

  /*
   * Ein Objekt mit eigener `toJSON` (allen voran `Date`) bringt seine
   * Darstellung selbst mit; würde der Walker es aufzählen, käme `{}`
   * heraus. Supabase liefert Zeitstempel zwar als Zeichenketten, aber
   * ein Serialisierer, der bei einem `Date` still Daten verliert, ist
   * die falsche Art von Überraschung.
   */
  if (typeof (wert as { toJSON?: unknown }).toJSON === "function") {
    return JSON.stringify(wert) ?? "null";
  }

  const innen = einzug + EINZUG;

  if (Array.isArray(wert)) {
    if (wert.length === 0) return "[]";
    const eintraege = istDatensatzListe(wert)
      ? wert.map((eintrag) => innen + (JSON.stringify(eintrag) ?? "null"))
      : wert.map((eintrag) => innen + schreibe(eintrag, innen));
    return `[\n${eintraege.join(",\n")}\n${einzug}]`;
  }

  const paare = Object.entries(wert as Record<string, unknown>).filter(
    ([, inhalt]) => inhalt !== undefined,
  );
  if (paare.length === 0) return "{}";

  const zeilen = paare.map(
    ([schluessel, inhalt]) => `${innen}${JSON.stringify(schluessel)}: ${schreibe(inhalt, innen)}`,
  );
  return `{\n${zeilen.join(",\n")}\n${einzug}}`;
}
