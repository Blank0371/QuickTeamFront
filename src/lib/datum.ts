/** Kalendertage sind keine Zeitspannen: Sommerzeit darf keinen Tag abziehen. */
export function istKalendertag(wert: string): boolean {
  if (wert.startsWith("0000") || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false;
  const datum = new Date(`${wert}T00:00:00Z`);
  return Number.isFinite(datum.getTime()) && datum.toISOString().slice(0, 10) === wert;
}

/** DE und AT verwenden dieselben Regeln für die mitteleuropäische Zeit. */
export function betriebsZeitpunkt(datum: string, tagesende = false): string {
  if (!istKalendertag(datum)) throw new RangeError("Ungültiger Kalendertag");
  const uhrzeit = tagesende ? "23:59:59" : "00:00:00";
  const lokalAlsUtc = Date.parse(`${datum}T${uhrzeit}Z`);
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", timeZoneName: "longOffset",
  });
  // Zweimal bestimmen: am Umstellungstag können Mittag und Mitternacht
  // verschiedene Offsets haben. Tagesanfang/-ende sind nie mehrdeutig.
  let zeitpunkt = lokalAlsUtc;
  for (let i = 0; i < 2; i++) {
    const zone = format.formatToParts(new Date(zeitpunkt)).find((p) => p.type === "timeZoneName")?.value;
    const offset = /GMT([+-])(\d{2}):(\d{2})/.exec(zone ?? "");
    if (!offset) throw new RangeError("Betriebszeitzone nicht verfügbar");
    const minuten = (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === "+" ? 1 : -1);
    zeitpunkt = lokalAlsUtc - minuten * 60_000;
  }
  return new Date(zeitpunkt).toISOString();
}

/**
 * Das heutige Datum in Betriebszeit. `new Date().toISOString()` liefert auf
 * Vercel (UTC) zwischen Mitternacht und 1–2 Uhr in Wien noch den Vortag.
 */
export function heuteImBetrieb(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(jetzt);
}

/** Das laufende Kalenderjahr in Betriebszeit — am 1. Januar ab 0 Uhr Wien, nicht ab 1 Uhr. */
export function jahrImBetrieb(jetzt: Date = new Date()): number {
  return Number(heuteImBetrieb(jetzt).slice(0, 4));
}

/** Kalendertage addieren, in UTC gerechnet — kein Sommerzeit-Versatz. */
export function tagPlus(datum: string, tage: number): string {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  return new Date(Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, (tag ?? 1) + tage)).toISOString().slice(0, 10);
}
