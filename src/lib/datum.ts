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
