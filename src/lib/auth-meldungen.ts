/**
 * Meldungen, die per Query-Parameter von einer Weiterleitung übergeben
 * werden.
 *
 * Der Parameter wird nie direkt angezeigt, sondern nur als Schlüssel in
 * die übergebene, sprachabhängige Tabelle (`t.login.meldungen`)
 * nachgeschlagen. Sonst könnte man über einen präparierten Link
 * beliebigen Text auf die Seite schreiben.
 */
export function meldungFuer(
  schluessel: string | undefined,
  meldungen: Record<string, string>,
): string | null {
  if (!schluessel) return null;
  return meldungen[schluessel] ?? null;
}

/** Query-Parameter kommen als string | string[] | undefined. */
export function einzelwert(wert: string | string[] | undefined): string | undefined {
  if (Array.isArray(wert)) return wert[0];
  return wert;
}
