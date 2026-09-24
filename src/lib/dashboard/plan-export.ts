import type { KalenderSchicht } from "./kalender";
import { alsDatum, hhmm, schichtName, ueberNacht } from "./kalender";

/**
 * Der Dienstplan als Woche oder Monat — zum Ausdrucken und für Excel.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Formen für zwei Zwecke, aus einer Quelle
 * ─────────────────────────────────────────────────────────────────────
 *
 * Papier und Tabellenkalkulation wollen dieselben Daten in
 * entgegengesetzter Form, und der häufigste Fehler wäre, sich für eine zu
 * entscheiden:
 *
 *   **Gedruckt** ist der Plan eine **Matrix** — Schichten untereinander,
 *   Tage nebeneinander, Namen in den Feldern. So hängt er seit jeher an
 *   der Wand, und so liest ihn jemand, der wissen will „wer hat Freitag
 *   früh?". Eine Liste mit 120 Zeilen beantwortet dieselbe Frage erst
 *   nach Suchen.
 *
 *   **In Excel** ist dieselbe Matrix wertlos: verbundene Bedeutungen in
 *   Spaltenköpfen, ein Name je Zelle, und keine Pivot-Tabelle greift
 *   darauf zu. Dort gehört der Plan in die **lange Form** — eine Zeile je
 *   Zuweisung, jede Angabe in ihrer eigenen Spalte. Danach ist Summieren,
 *   Filtern und Gruppieren Bordmittel.
 *
 * Beide entstehen hier aus derselben `kalender_schichten`-Antwort. Das ist
 * der Punkt: es gibt keine zweite Abfrage, die anders zählen könnte.
 *
 * Diese Datei enthält **keine** Datenbank- und keine React-Berührung —
 * damit läuft sie in `npm test` ohne Bundler (`plan-export.test.ts`).
 */

/* ------------------------------------------------------------------ */
/* Zeitraum                                                            */
/* ------------------------------------------------------------------ */

export type ZeitraumArt = "woche" | "monat";

export type Zeitraum = {
  art: ZeitraumArt;
  /** Erster Tag, `YYYY-MM-DD`. Immer ein Montag. */
  von: string;
  /** Letzter Tag, `YYYY-MM-DD`. Immer ein Sonntag. */
  bis: string;
  /** Der Wert, der als `?woche=` bzw. `?monat=` in der Adresse steht. */
  wert: string;
};

/**
 * `YYYY-MM-DD` als UTC-Zeitstempel.
 *
 * Alle Datumsrechnungen dieser Datei laufen über UTC, nie über die lokale
 * Zone. In einer Nacht mit Zeitumstellung hat der lokale Tag 23 oder 25
 * Stunden; eine Woche, die über sie hinweg zählt, landet dann einen Tag
 * daneben — und eine Wochenansicht, die im März einmal falsch beginnt,
 * fällt niemandem auf, bis jemand zur falschen Zeit erscheint.
 */
function alsUtc(datum: string): number {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  return Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, tag ?? 1);
}

const TAG_IN_MS = 86_400_000;

/** Tage addieren, über Monats- und Jahresgrenzen hinweg. */
function tagPlus(datum: string, tage: number): string {
  return new Date(alsUtc(datum) + tage * TAG_IN_MS).toISOString().slice(0, 10);
}

/** Der Montag der Woche, in der `datum` liegt. */
export function montagDerWoche(datum: string): string {
  // `getUTCDay()` liefert 0 = Sonntag; dieselbe Verschiebung wie überall
  // sonst im Projekt macht daraus 0 = Montag.
  const versatz = (new Date(alsUtc(datum)).getUTCDay() + 6) % 7;
  return tagPlus(datum, -versatz);
}

/**
 * Die ISO-Kalenderwoche — die Zahl, unter der ein Betrieb seinen Plan
 * ablegt („KW 39").
 *
 * Der Donnerstag-Trick ist die Definition selbst: eine ISO-Woche gehört
 * dem Jahr, in dem ihr Donnerstag liegt. Deshalb steht die Woche vom
 * 29.12. bis 04.01. je nach Wochentag mal als KW 1 des Folgejahres da und
 * mal als KW 52/53 — eine Zählung ab dem 1. Januar bekäme genau das
 * falsch, und zwar jedes Jahr einmal.
 */
export function kalenderwoche(datum: string): number {
  const donnerstag = tagPlus(montagDerWoche(datum), 3);
  const jahr = Number(donnerstag.slice(0, 4));
  const abstand = alsUtc(donnerstag) - Date.UTC(jahr, 0, 1);
  return Math.floor(abstand / TAG_IN_MS / 7) + 1;
}

/** Das Jahr, zu dem die ISO-Woche gehört — nicht zwingend das des Datums. */
export function kalenderwochenJahr(datum: string): number {
  return Number(tagPlus(montagDerWoche(datum), 3).slice(0, 4));
}

/**
 * `?woche=` / `?monat=` einlesen. Unsinn fällt still auf die laufende
 * Woche zurück — wie `leseMonat()` im Kalender, und aus demselben Grund:
 * ein falscher Parameter ist kein Anlass für eine Fehlerseite.
 */
export function leseZeitraum(
  params: { woche?: string; monat?: string },
  heute: Date,
): Zeitraum {
  const monatTreffer = /^(\d{4})-(\d{2})$/.exec(params.monat ?? "");
  if (monatTreffer) {
    const jahr = Number(monatTreffer[1]);
    const monat = Number(monatTreffer[2]);
    if (jahr >= 2000 && jahr <= 2100 && monat >= 1 && monat <= 12) {
      return monatsZeitraum(jahr, monat);
    }
  }

  const wocheTreffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.woche ?? "");
  if (wocheTreffer) {
    const kandidat = params.woche as string;
    // `2026-02-31` besteht den Regex und ist trotzdem kein Tag.
    if (tagPlus(kandidat, 0) === kandidat) return wochenZeitraum(kandidat);
  }

  return wochenZeitraum(alsDatum(heute.getFullYear(), heute.getMonth() + 1, heute.getDate()));
}

export function wochenZeitraum(datum: string): Zeitraum {
  const von = montagDerWoche(datum);
  return { art: "woche", von, bis: tagPlus(von, 6), wert: von };
}

/**
 * Der Monat, aufgerundet auf volle Wochen.
 *
 * Randtage gehören dazu, genau wie im Bildschirmraster: ein gedruckter
 * Monat, der am Mittwoch beginnt, hätte sonst eine erste Zeile mit zwei
 * leeren Spalten, und die Schicht am Sonntag vor dem Ersten fiele aus dem
 * Blatt. Was dazugehört und was nicht, sagt die Spalte `imMonat`.
 */
export function monatsZeitraum(jahr: number, monat: number): Zeitraum {
  const von = montagDerWoche(alsDatum(jahr, monat, 1));
  const letzter = alsDatum(jahr, monat, new Date(Date.UTC(jahr, monat, 0)).getUTCDate());
  const bis = tagPlus(montagDerWoche(letzter), 6);
  return { art: "monat", von, bis, wert: alsMonat(jahr, monat) };
}

function alsMonat(jahr: number, monat: number): string {
  return `${jahr}-${String(monat).padStart(2, "0")}`;
}

/** Der Nachbar-Zeitraum als Parameterwert (`?woche=` / `?monat=`). */
export function verschiebeZeitraum(zeitraum: Zeitraum, um: number): string {
  if (zeitraum.art === "woche") return tagPlus(zeitraum.von, um * 7);
  const [jahr, monat] = zeitraum.wert.split("-").map(Number);
  const d = new Date(Date.UTC(jahr ?? 1970, (monat ?? 1) - 1 + um, 1));
  return alsMonat(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

/** Alle Tage des Zeitraums, aufsteigend. */
export function tageIm(zeitraum: Zeitraum): string[] {
  const tage: string[] = [];
  for (let d = zeitraum.von; d <= zeitraum.bis; d = tagPlus(d, 1)) tage.push(d);
  return tage;
}

/**
 * Der Zeitraum in Wochen zerlegt.
 *
 * Ein Monat wird **nicht** als ein breites Gitter gedruckt: einunddreissig
 * Spalten passen auf kein Blatt, auch nicht quer. Er wird zu vier bis sechs
 * Wochentabellen untereinander — dieselbe Tabelle wie bei der Wochenansicht,
 * nur mehrfach. Damit gibt es eine Darstellung statt zwei, und der Umbruch
 * fällt von selbst zwischen zwei Wochen statt mitten in eine.
 */
export function wochenIm(zeitraum: Zeitraum): { von: string; tage: string[] }[] {
  const alle = tageIm(zeitraum);
  const wochen: { von: string; tage: string[] }[] = [];
  for (let i = 0; i < alle.length; i += 7) {
    const tage = alle.slice(i, i + 7);
    wochen.push({ von: tage[0]!, tage });
  }
  return wochen;
}

/* ------------------------------------------------------------------ */
/* Matrix — die gedruckte Form                                         */
/* ------------------------------------------------------------------ */

export type Besetzung = {
  name: string;
  rolle: string | null;
  /**
   * Die Person hat sich von dieser Schicht abgemeldet (Notfall).
   *
   * Das ist `!participants[].attendet`, und die Umkehrung ist Absicht.
   * `attendet` klingt nach „hat zugesagt" und wurde hier zunächst auch so
   * gelesen; im Quelltext der App heisst `attendet === false` aber
   * **abgemeldet** — `shift/[id].tsx` streicht den Namen durch und setzt
   * `manager.calledOut` daneben, `manager.tsx:205` überspringt die Zeile bei
   * der Besetzungsrechnung. Ein Aushang, der daraus „noch nicht zugesagt"
   * macht, sagt das Gegenteil dessen, was die App sagt.
   */
  abgemeldet: boolean;
};

export type MatrixZelle = {
  datum: string;
  /** Leer, wenn an diesem Tag keine Schicht dieser Zeile liegt. */
  schichten: {
    id: string;
    start: string;
    ende: string;
    ueberNacht: boolean;
    entwurf: boolean;
    unterbesetzt: boolean;
    besetzung: Besetzung[];
  }[];
};

export type MatrixZeile = {
  /** Gruppenschlüssel — Bezeichnung und Uhrzeit zusammen. */
  schluessel: string;
  /** `schichtName()`, oder `null` für eine Schicht ohne Bezeichnung. */
  name: string | null;
  start: string;
  ende: string;
  ueberNacht: boolean;
  zellen: MatrixZelle[];
};

/**
 * Wie eine Schicht ihre Zeile findet.
 *
 * Gruppiert wird über **Bezeichnung und Uhrzeit zusammen**, nicht über die
 * Vorlagen-Id: die steht in `kalender_schichten` gar nicht, und
 * benutzerdefinierte Schichten haben ohnehin keine. Zwei Schichten „Früh
 * 06:00–14:00" an verschiedenen Tagen landen damit in einer Zeile, auch
 * wenn sie aus verschiedenen Vorlagen stammen — was auf Papier richtig ist,
 * denn dort steht die Zeile für eine Aufgabe, nicht für einen Datensatz.
 *
 * Umgekehrt bekommt „Früh 06:00–14:00" und „Früh 07:00–15:00" zwei Zeilen.
 * Das ist gewollt: eine Stunde Unterschied ist genau das, was man auf einem
 * Aushang sehen können muss.
 */
function zeilenSchluessel(schicht: KalenderSchicht): string {
  return `${schichtName(schicht) ?? ""}|${schicht.start_zeit}|${schicht.end_zeit}`;
}

/**
 * Baut die Matrix eines Wochenblocks.
 *
 * Die Zeilenreihenfolge kommt aus der Startzeit, nicht aus dem Namen:
 * „Früh", „Spät", „Nacht" stehen dann untereinander wie der Tag verläuft.
 * Alphabetisch stünde „Abendservice" über „Brunch".
 */
export function baueMatrix(
  tage: readonly string[],
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
): MatrixZeile[] {
  const zeilen = new Map<string, MatrixZeile>();

  for (const [spalte, datum] of tage.entries()) {
    for (const schicht of proTag.get(datum) ?? []) {
      const schluessel = zeilenSchluessel(schicht);
      let zeile = zeilen.get(schluessel);

      if (!zeile) {
        zeile = {
          schluessel,
          name: schichtName(schicht),
          start: hhmm(schicht.start_zeit),
          ende: hhmm(schicht.end_zeit),
          ueberNacht: ueberNacht(schicht),
          zellen: tage.map((d) => ({ datum: d, schichten: [] })),
        };
        zeilen.set(schluessel, zeile);
      }

      // `zellen` ist aus derselben `tage`-Liste gebaut — die Spalte gibt es.
      zeile.zellen[spalte]!.schichten.push({
        id: schicht.id,
        start: hhmm(schicht.start_zeit),
        ende: hhmm(schicht.end_zeit),
        ueberNacht: ueberNacht(schicht),
        entwurf: schicht.status === "geplant",
        unterbesetzt: schicht.understaffed,
        besetzung: (schicht.participants ?? []).map((p) => ({
          name: p.name,
          rolle: p.role_name,
          abgemeldet: !p.attendet,
        })),
      });
    }
  }

  return [...zeilen.values()].sort(
    (a, b) => a.start.localeCompare(b.start) || (a.name ?? "").localeCompare(b.name ?? ""),
  );
}

/* ------------------------------------------------------------------ */
/* Lange Form — die Excel-Datei                                        */
/* ------------------------------------------------------------------ */

/** Spaltenköpfe der CSV, in der aktiven Sprache. */
export type CsvKopf = {
  datum: string;
  wochentag: string;
  schicht: string;
  beginn: string;
  ende: string;
  ueberNacht: string;
  status: string;
  person: string;
  rolle: string;
  abgemeldet: string;
  ja: string;
  nein: string;
  entwurf: string;
  veroeffentlicht: string;
  archiviert: string;
  unbesetzt: string;
};

/**
 * Eine Zeile je **Zuweisung**, nicht je Schicht.
 *
 * Eine Schicht mit drei Personen ergibt drei Zeilen; eine unbesetzte ergibt
 * eine mit leerem Namen. Das ist die Form, in der eine Pivot-Tabelle
 * „Stunden je Person je Woche" ohne eine einzige Formel beantwortet — und
 * der Grund, warum die unbesetzte Schicht trotzdem eine Zeile bekommt: sonst
 * verschwindet die Lücke aus der Auswertung, und gerade die sucht man.
 */
export function langeForm(
  tage: readonly string[],
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
  kopf: CsvKopf,
  wochentagName: (datum: string) => string,
): string[][] {
  const zeilen: string[][] = [
    [
      kopf.datum,
      kopf.wochentag,
      kopf.schicht,
      kopf.beginn,
      kopf.ende,
      kopf.ueberNacht,
      kopf.status,
      kopf.person,
      kopf.rolle,
      kopf.abgemeldet,
    ],
  ];

  const statusText: Record<string, string> = {
    geplant: kopf.entwurf,
    veroeffentlicht: kopf.veroeffentlicht,
    archiviert: kopf.archiviert,
  };

  for (const datum of tage) {
    for (const schicht of proTag.get(datum) ?? []) {
      const basis = [
        deutschesDatum(datum),
        wochentagName(datum),
        schichtName(schicht) ?? "",
        hhmm(schicht.start_zeit),
        hhmm(schicht.end_zeit),
        ueberNacht(schicht) ? kopf.ja : kopf.nein,
        statusText[schicht.status] ?? schicht.status,
      ];

      const teilnehmer = schicht.participants ?? [];
      if (teilnehmer.length === 0) {
        zeilen.push([...basis, kopf.unbesetzt, "", ""]);
        continue;
      }
      for (const p of teilnehmer) {
        zeilen.push([...basis, p.name, p.role_name ?? "", p.attendet ? kopf.nein : kopf.ja]);
      }
    }
  }

  return zeilen;
}

/**
 * `YYYY-MM-DD` → `DD.MM.YYYY`, **unabhängig von der Sprachwahl**.
 *
 * Nur für die CSV. Das Format richtet sich hier nicht nach der Oberfläche,
 * sondern nach dem Programm, das die Datei aufmacht: Excel liest ein Datum
 * nach den **Ländereinstellungen des Rechners**, und der Markt dieser
 * Anwendung ist per `betriebe.land` genau AT und DE. Wer die Oberfläche auf
 * Englisch stellt, wechselt damit nicht sein Windows.
 *
 * Für Bildschirm und Papier gilt das Gegenteil — dort formatiert
 * `datumKurz()` / `datumLang()` nach der Locale.
 */
export function deutschesDatum(datum: string): string {
  return `${datum.slice(8, 10)}.${datum.slice(5, 7)}.${datum.slice(0, 4)}`;
}

/**
 * Datum für Bildschirm und Ausdruck, nach der aktiven Sprache.
 *
 * `Intl` und nicht selbst zusammengesetzt, aus demselben Grund wie bei den
 * Monatsnamen in `kalender.ts`: das sind Locale-Daten, keine Produktbegriffe.
 * Der Tageskopf zeigte auf Englisch sonst „7.9." — ein Format, das dort
 * niemand liest.
 */
export function datumKurz(datum: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(alsUtc(datum)));
}

/**
 * Die Zeitzone des Stand-Vermerks auf dem Ausdruck.
 *
 * Fest und nicht die des Servers: Vercel rechnet in UTC, und ein Aushang,
 * der kurz nach Mitternacht gedruckt wird, trüge sonst das Datum von
 * gestern. Der Markt ist per `betriebe.land` AT und DE — beide liegen in
 * derselben Zone, also genügt eine.
 */
export const DRUCK_ZEITZONE = "Europe/Vienna";

/** „Stand: 24.09.2026, 14:32" — wann das Blatt entstanden ist. */
export function standText(jetzt: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DRUCK_ZEITZONE,
  }).format(jetzt);
}

/**
 * Eine Spanne von Tagen, so wie die Sprache sie schreibt.
 *
 * `formatRange` statt zweier formatierter Daten mit Strich dazwischen: es
 * lässt weg, was sich wiederholt, und kennt die Reihenfolge der Sprache —
 * „21.–27. September 2026", „September 21 – 27, 2026", über eine
 * Monatsgrenze „31. August – 6. September 2026". Zusammengesetzt stünde
 * dort „21.9. – 27.09.2026", zwei Formate in einer Zeile.
 */
export function zeitraumSpanne(von: string, bis: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(new Date(alsUtc(von)), new Date(alsUtc(bis)));
}

/** Dasselbe mit Jahr — für Zeitraumangaben („21.09.2026 – 27.09.2026"). */
export function datumLang(datum: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(alsUtc(datum)));
}

/**
 * CSV, das Excel im deutschsprachigen Raum ohne Import-Dialog aufmacht.
 *
 * Zwei Eigenheiten, beide keine Geschmacksfrage:
 *
 * **Semikolon statt Komma.** Excel liest das Trennzeichen aus den
 * Ländereinstellungen, und in AT/DE ist das Komma das *Dezimal*zeichen —
 * eine komma-getrennte Datei landet dort vollständig in Spalte A. Der Markt
 * dieser Anwendung ist per `betriebe.land` genau AT und DE.
 *
 * **Byte Order Mark.** Ohne die drei Bytes am Anfang rät Excel die Kodierung
 * und trifft die Windows-Codepage; aus „Müller" wird „MÃ¼ller". Mit ihnen
 * erkennt es UTF-8. Jeder andere Leser überliest sie.
 */
export function alsCsv(zeilen: readonly (readonly string[])[]): string {
  const inhalt = zeilen.map((zeile) => zeile.map(feld).join(";")).join("\r\n");
  return `﻿${inhalt}\r\n`;
}

/**
 * Ein Feld maskieren.
 *
 * Das führende Hochkomma bei `=`, `+`, `-` und `@` ist kein Stilmittel: Excel
 * behandelt eine so beginnende Zelle als **Formel**. Ein Mitarbeitername wie
 * „-Ali" oder eine Notiz, die mit `=` anfängt, würde sonst ausgewertet — im
 * harmlosen Fall als Fehlerwert, im unangenehmen als CSV-Injection, die beim
 * Öffnen der Datei Befehle nachlädt. Die Daten kommen aus Freitextfeldern
 * fremder Nutzer; hier ist die Grenze, an der sie zu Text werden.
 */
function feld(wert: string): string {
  const entschaerft = /^[=+\-@\t\r]/.test(wert) ? `'${wert}` : wert;
  return /[";\r\n]/.test(entschaerft)
    ? `"${entschaerft.replace(/"/g, '""')}"`
    : entschaerft;
}

/**
 * Dateiname für den Download.
 *
 * Bewusst dieselbe Machart wie im Betriebsexport: klein, ohne Umlaute, ohne
 * Anführungszeichen — letztere bräche den `Content-Disposition`-Kopf auf.
 */
export function dateiname(betriebName: string, zeitraum: Zeitraum): string {
  const teil =
    zeitraum.art === "woche"
      ? `kw${String(kalenderwoche(zeitraum.von)).padStart(2, "0")}-${zeitraum.von.slice(0, 4)}`
      : zeitraum.wert;
  return `quickteam-dienstplan-${dateiSicher(betriebName)}-${teil}.csv`;
}

/**
 * Reihenfolge mit Grund: erst die deutschen Umlaute, **dann** der Rest.
 *
 * `ü` wird zu `ue`, `é` nur zu `e` — beides ist die übliche Schreibweise
 * der jeweiligen Sprache. Eine Zerlegung in Grundzeichen und Akzent
 * (`normalize("NFD")`) macht aus `ü` aber ebenfalls nur `u`. Wer sie zuerst
 * laufen lässt, bekommt „cafe-grun" statt „cafe-gruen".
 */
function dateiSicher(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "betrieb"
  );
}
