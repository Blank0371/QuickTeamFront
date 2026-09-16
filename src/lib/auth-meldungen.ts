/**
 * Meldungen, die per Query-Parameter von einer Weiterleitung übergeben
 * werden.
 *
 * Der Parameter wird nie direkt angezeigt, sondern nur als Schlüssel
 * benutzt. Sonst könnte man über einen präparierten Link beliebigen Text
 * auf die Seite schreiben.
 */
const MELDUNGEN: Record<string, string> = {
  "konto-geloescht": "Dein Konto wurde gelöscht.",
  "abo-kuendigung-offen": "Mindestens ein Abonnement konnte anschließend nicht gekündigt werden. Bitte kontaktiere umgehend blanktrading@web.de, damit keine weiteren Abbuchungen erfolgen.",
  abgemeldet: "Du bist abgemeldet.",
  "app-url-fehlt":
    "Dein Konto ist bereit, aber das Ziel der Weiterleitung ist nicht konfiguriert (NEXT_PUBLIC_APP_URL). Meld dich beim Support.",
};

export function meldungFuer(schluessel: string | undefined): string | null {
  if (!schluessel) return null;
  return MELDUNGEN[schluessel] ?? null;
}

/** Query-Parameter kommen als string | string[] | undefined. */
export function einzelwert(wert: string | string[] | undefined): string | undefined {
  if (Array.isArray(wert)) return wert[0];
  return wert;
}
