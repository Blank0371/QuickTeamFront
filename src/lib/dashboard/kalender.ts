import type { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Schichtdaten für den Kalender.
 *
 * Gelesen wird ausschliesslich über `kalender_schichten` — kein eigener
 * Join über `schicht_instanzen`, `schicht_zuweisungen` und `mitarbeiter`.
 * Das ist keine Bequemlichkeit: die Funktion entscheidet selbst, wer wen
 * sehen darf (`mitarbeiter_sehen_andere_schichten` /
 * `_mitarbeiter`), blendet Entwürfe für Nicht-Chefs aus und schneidet die
 * Teilnehmerliste zu. Ein eigener Join wäre schneller getippt, würde die
 * Roster-Privacy umgehen und die zweite Autorisierungsebene einziehen,
 * die es in diesem Projekt nicht geben soll.
 *
 * Am 2026-08-26 im Quelltext der Funktion nachgesehen; die Felder unten
 * stammen von dort, nicht aus dem Typ in `calendar.tsx`.
 */

/** Eine Schicht, wie `kalender_schichten` sie zurückgibt. */
export type KalenderSchicht = {
  id: string;
  /** `geplant` (Entwurf) | `veroeffentlicht` | `archiviert`. */
  status: string;
  /** `YYYY-MM-DD`. */
  datum: string;
  /** `HH:MM:SS`. */
  start_zeit: string;
  end_zeit: string;
  /**
   * `schicht_vorlagen.bezeichnung` — **nullable**, und zwar auf zwei
   * Wegen: die Spalte selbst erlaubt NULL, und benutzerdefinierte
   * Schichten haben gar keine Vorlage. Nie ungeprüft rendern, sonst
   * steht dort „null".
   */
  label: string | null;
  kommentar: string | null;
  /** Ich bin dieser Schicht zugeteilt. */
  mine: boolean;
  /** Nur für Chefs wahr — die Funktion setzt es auf `rolle_typ = 'chef'`. */
  can_edit: boolean;
  /** Ich habe mich für diese Schicht abgemeldet (Notfall). */
  canceled: boolean;
  /** Offen für mich: Ausschreibung oder gesuchte Vertretung in meiner Rolle. */
  open: boolean;
  /** Jemand auf dieser Schicht möchte tauschen. */
  swap_wanted: boolean;
  /**
   * Mindestbesetzung nicht erreicht. **Nur für Chefs berechnet** — für
   * alle anderen kommt hier immer `false` an, unabhängig von der Lage.
   */
  understaffed: boolean;
  notiz_anzahl: number;
  participants: {
    name: string;
    role_name: string | null;
    attendet: boolean;
    is_me: boolean;
  }[];
};

/* ------------------------------------------------------------------ */
/* Datum — bewusst ohne Zeitzonen-Umweg                                */
/* ------------------------------------------------------------------ */

/**
 * `YYYY-MM-DD` aus Jahr, Monat (1–12) und Tag.
 *
 * Selbst zusammengesetzt statt über `toISOString()`: das rechnet nach
 * UTC um, und in einer Zeitzone östlich von Greenwich — also in unserer —
 * wird aus dem 1. August lokal der 31. Juli. Ein Kalender, der die erste
 * Zeile um einen Tag verschiebt, fällt niemandem sofort auf.
 */
export function alsDatum(jahr: number, monat: number, tag: number): string {
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/** `HH:MM` aus `HH:MM:SS`. */
export function hhmm(zeit: string): string {
  return zeit.slice(0, 5);
}

/**
 * Wochentag montagsbasiert: 0 = Montag, 6 = Sonntag.
 *
 * Dieselbe Rechnung wie in der App (`(d.getDay() + 6) % 7`) und dieselbe
 * Konvention wie `schicht_vorlagen.wochentag`. `Date.getDay()` liefert
 * 0 = Sonntag; wer den Wert ungeprüft übernimmt, verschiebt das ganze
 * Raster um einen Tag.
 */
function wochentag(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export type Rasterzelle = {
  /** `YYYY-MM-DD`. */
  datum: string;
  tag: number;
  /** Gehört zum angezeigten Monat — Randtage werden gedämpft. */
  imMonat: boolean;
  istHeute: boolean;
};

export type Monatsraster = {
  jahr: number;
  /** 1–12. */
  monat: number;
  /** Immer volle Wochen à sieben Zellen, montags beginnend. */
  wochen: Rasterzelle[][];
  /** Erster und letzter Tag im Raster — der Bereich, der geladen wird. */
  von: string;
  bis: string;
};

/**
 * Baut das Raster eines Monats, aufgefüllt zu vollen Wochen.
 *
 * Die Randtage gehören dazu, statt als Lücken zu erscheinen: eine Schicht
 * am Sonntag, dem 1., läge sonst in einer leeren Zelle, und der Monat
 * begänne optisch mit einem Loch. Geladen wird deshalb genau der
 * Rasterbereich — nicht der Monat plus sieben Tage wie in der App, wo
 * die Wochenansicht andere Ränder braucht.
 *
 * `new Date(jahr, monat, 0)` ist der letzte Tag des Vormonats, weil der
 * Monat hier nullbasiert gemeint ist — `monat` ist bereits 1–12, also
 * zeigt der Ausdruck auf das Ende von `monat` selbst.
 */
export function baueRaster(jahr: number, monat: number, heute: Date): Monatsraster {
  const ersterDesMonats = new Date(jahr, monat - 1, 1);
  const tageImMonat = new Date(jahr, monat, 0).getDate();
  const vorlauf = wochentag(ersterDesMonats);

  const heuteDatum = alsDatum(
    heute.getFullYear(),
    heute.getMonth() + 1,
    heute.getDate(),
  );

  /*
   * Ein einziger Durchlauf über fortlaufende Tage, statt Vorlauf, Monat
   * und Nachlauf getrennt zu rechnen. `new Date(j, m, tag)` normalisiert
   * Überläufe selbst — Tag 0 ist der letzte des Vormonats, Tag 32 der
   * erste des Folgemonats —, und damit entfällt jede Sonderbehandlung an
   * den Monats- und Jahresgrenzen. Drei getrennte Schleifen wären drei
   * Gelegenheiten, sich um einen Tag zu vertun.
   */
  const zellen: Rasterzelle[] = [];
  const gesamt = Math.ceil((vorlauf + tageImMonat) / 7) * 7;

  for (let i = 0; i < gesamt; i++) {
    const d = new Date(jahr, monat - 1, 1 - vorlauf + i);
    const imMonat = d.getFullYear() === jahr && d.getMonth() === monat - 1;
    zellen.push(zelle(d, imMonat, heuteDatum));
  }

  const wochen: Rasterzelle[][] = [];
  for (let i = 0; i < zellen.length; i += 7) {
    wochen.push(zellen.slice(i, i + 7));
  }

  return {
    jahr,
    monat,
    wochen,
    von: zellen[0]?.datum ?? alsDatum(jahr, monat, 1),
    bis: zellen[zellen.length - 1]?.datum ?? alsDatum(jahr, monat, tageImMonat),
  };
}

function zelle(d: Date, imMonat: boolean, heuteDatum: string): Rasterzelle {
  const datum = alsDatum(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { datum, tag: d.getDate(), imMonat, istHeute: datum === heuteDatum };
}

/** `?monat=YYYY-MM` einlesen. Unsinn fällt still auf den laufenden Monat zurück. */
export function leseMonat(
  param: string | undefined,
  heute: Date,
): { jahr: number; monat: number } {
  const treffer = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (treffer) {
    const jahr = Number(treffer[1]);
    const monat = Number(treffer[2]);
    if (jahr >= 2000 && jahr <= 2100 && monat >= 1 && monat <= 12) {
      return { jahr, monat };
    }
  }
  return { jahr: heute.getFullYear(), monat: heute.getMonth() + 1 };
}

/** Nachbarmonat als `YYYY-MM`, über den Jahreswechsel hinweg. */
export function verschiebeMonat(jahr: number, monat: number, um: number): string {
  const d = new Date(jahr, monat - 1 + um, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monats- und Wochentagsnamen kommen aus `Intl`, nicht aus dem Wörterbuch.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum nicht `de.ts` / `en.ts`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das sind keine Produktbegriffe, sondern Locale-Daten — die Plattform
 * kennt sie bereits, und zwar für jede Sprache. Ein Wörterbucheintrag
 * wäre eine zweite Quelle für etwas, das nur an einer Stelle falsch
 * werden kann: an der abgeschriebenen.
 *
 * **Am 2026-09-10 gegengemessen:** für `de` liefert `Intl` zeichengenau
 * dieselben Namen, die hier vorher als Konstanten standen — Januar bis
 * Dezember, Mo bis So, Montag bis Sonntag. Der deutsche Bestand ändert
 * sich durch die Umstellung also nicht. Für `en` kommen genau die
 * Kurzformen heraus, die auch die Expo-App führt (`calendar.monday` =
 * „Mon"), womit die Paritätsregel aus `docs/i18n-glossar.md` ohne
 * eigenes Zutun erfüllt ist.
 *
 * **Montagsbasiert bleibt montagsbasiert.** Der 5. Januar 2026 ist ein
 * Montag; von dort aus sieben Tage weiterzuzählen ergibt dieselbe
 * Reihenfolge wie `schicht_vorlagen.wochentag` (0 = Montag). Ein
 * `Intl`-Aufruf allein wüsste davon nichts — die Konvention steckt im
 * Startdatum, nicht in der Formatierung.
 */
const MONTAG_ANKER = new Date(2026, 0, 5);

function nameListe(
  locale: Locale,
  anzahl: number,
  datum: (i: number) => Date,
  optionen: Intl.DateTimeFormatOptions,
): string[] {
  const format = new Intl.DateTimeFormat(locale, optionen);
  return Array.from({ length: anzahl }, (_, i) => format.format(datum(i)));
}

/** Januar … Dezember in der aktiven Sprache. */
export function monatsnamen(locale: Locale): string[] {
  return nameListe(locale, 12, (i) => new Date(2026, i, 1), { month: "long" });
}

/** Mo … So, montagsbasiert. */
export function wochentageKurz(locale: Locale): string[] {
  return nameListe(locale, 7, (i) => tagNach(MONTAG_ANKER, i), { weekday: "short" });
}

/** Montag … Sonntag, montagsbasiert. */
export function wochentageLang(locale: Locale): string[] {
  return nameListe(locale, 7, (i) => tagNach(MONTAG_ANKER, i), { weekday: "long" });
}

function tagNach(basis: Date, tage: number): Date {
  return new Date(basis.getFullYear(), basis.getMonth(), basis.getDate() + tage);
}

/**
 * Deutsche Fassungen als Konstanten — **abgeleitet, nicht abgeschrieben**.
 *
 * Sie stehen noch da, weil rund zehn Dateien sie benutzen, die noch nicht
 * übersetzt sind (`docs/i18n-glossar.md`, Reihenfolge der Bereiche). Wer
 * eine davon anfasst, ersetzt den Zugriff durch die Funktion oben und
 * reicht die Locale herein; verschwindet der letzte Aufrufer, können
 * diese drei Zeilen weg.
 *
 * Wichtig ist, was sie **nicht** mehr sind: eine zweite, handgepflegte
 * Liste. Sie kommen aus derselben Quelle wie die englische Fassung und
 * können deshalb nicht mehr von ihr abweichen.
 */
export const MONATSNAMEN = monatsnamen("de");
export const WOCHENTAGE = wochentageKurz("de");
export const WOCHENTAGE_LANG = wochentageLang("de");

/* ------------------------------------------------------------------ */
/* Laden                                                               */
/* ------------------------------------------------------------------ */

/**
 * Schichten eines Zeitraums, nach Datum gruppiert.
 *
 * `p_mitarbeiter_id` wird **immer** mitgegeben. Die Funktion hat dafür
 * zwar einen Default und fällt auf `meine_mitarbeiter_id()` zurück, aber
 * die ist `select … limit 1` **ohne `order by`**: wer mehrere
 * Anstellungen im selben Betrieb hält, bekäme eine beliebige davon — und
 * damit womöglich die Chef-Sicht, obwohl er als Angestellter angemeldet
 * ist, oder umgekehrt. Genau dafür gibt es die gewählte Position.
 */
export async function holeSchichten(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
  von: string,
  bis: string,
): Promise<{ proTag: Map<string, KalenderSchicht[]>; fehler: string | null }> {
  const { data, error } = await supabase.rpc("kalender_schichten", {
    p_betrieb_id: betriebId,
    p_von: von,
    p_bis: bis,
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[kalender] kalender_schichten(${betriebId}): ${error.message}`);
    return {
      proTag: new Map(),
      fehler: "Der Dienstplan liess sich nicht laden. Lad die Seite neu.",
    };
  }

  const schichten = Array.isArray(data) ? (data as KalenderSchicht[]) : [];
  const proTag = new Map<string, KalenderSchicht[]>();

  /*
   * Die Funktion sortiert bereits nach Datum und Startzeit. Die
   * Reihenfolge innerhalb eines Tages wird deshalb nicht noch einmal
   * angefasst — sie hier neu zu bestimmen hiesse, eine zweite Meinung
   * über dieselbe Frage zu haben.
   */
  for (const schicht of schichten) {
    const liste = proTag.get(schicht.datum);
    if (liste) liste.push(schicht);
    else proTag.set(schicht.datum, [schicht]);
  }

  return { proTag, fehler: null };
}

/* ------------------------------------------------------------------ */
/* Zustand einer Schicht                                               */
/* ------------------------------------------------------------------ */

/**
 * Der eine Zustand, den eine Schicht in der Darstellung annimmt.
 *
 * Die Rangfolge ist aus `calendar.tsx` übernommen — abgemeldet schlägt
 * offen, offen schlägt Entwurf, Entwurf schlägt „meine", und alles
 * andere ist der Normalfall. Sie ist bewusst dieselbe: wer beide
 * Oberflächen nebeneinander benutzt, soll nicht zwei verschiedene
 * Antworten auf „was ist mit dieser Schicht?" bekommen.
 *
 * **Sie steht hier und nicht in einer Komponente**, weil inzwischen zwei
 * Ansichten dieselbe Frage stellen: die Kachel im Monatsraster und die
 * Zeile in der Tagesliste der Übersicht. Beide malen anders — eine
 * Kachel hat keinen Platz für eine Personenliste, eine Zeile keinen für
 * gestrichelte Ränder in Kachelgrösse —, aber sie dürfen nicht
 * verschiedener Meinung darüber sein, *was* sie malen. Die Zuordnung von
 * Zustand zu Aussehen bleibt in der jeweiligen Komponente; die
 * Rangfolge liegt hier.
 */
export type SchichtZustand =
  | "abgemeldet"
  | "offen"
  | "entwurf"
  | "meine"
  | "normal";

export function schichtZustand(schicht: KalenderSchicht): SchichtZustand {
  if (schicht.canceled) return "abgemeldet";
  if (schicht.open) return "offen";
  if (schicht.status === "geplant") return "entwurf";
  if (schicht.mine) return "meine";
  return "normal";
}

/**
 * Kurzer Hinweis zum Zustand, oder `null` für den Normalfall.
 *
 * „meine" bekommt bewusst keinen: dass es die eigene Schicht ist, trägt
 * die Hervorhebung. Ein Wort „meine" daneben wäre die dritte Aussage
 * über dieselbe Sache.
 */
export const ZUSTAND_HINWEIS: Record<SchichtZustand, string | null> = {
  abgemeldet: "abgemeldet",
  offen: "frei zu übernehmen",
  entwurf: "Entwurf",
  meine: null,
  normal: null,
};

/**
 * Läuft die Schicht über Mitternacht?
 *
 * `chk_vorlage_zeiten_verschieden` verbietet nur `start = end`;
 * Nachtschichten sind erlaubt und in den Daten von Testbetrieb 12 mit
 * 47 von 164 Schichten kein Randfall. Ohne Hinweis läse sich
 * „22:00–06:00" wie ein Fehler.
 */
export function ueberNacht(schicht: KalenderSchicht): boolean {
  return schicht.end_zeit < schicht.start_zeit;
}

/* ------------------------------------------------------------------ */
/* Die Lage eines ganzen Tages                                         */
/* ------------------------------------------------------------------ */

/**
 * Was an einem Tag aus der Entfernung zählt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das Raster eine eigene Zusammenfassung braucht
 * ─────────────────────────────────────────────────────────────────────
 *
 * `schichtZustand()` beantwortet „was ist mit **dieser** Schicht?" und
 * trägt die Kachel. Ein Monatsraster wird aber nicht Kachel für Kachel
 * gelesen, sondern überflogen: die Frage lautet „an welchen Tagen muss
 * ich hinsehen?". Mit echtem Inhalt beantwortete das Raster sie bis zum
 * 2026-09-06 gar nicht — 18 Schichten sahen aus wie 18 gleiche beige
 * Kacheln, und die einzige Farbe der ganzen Seite war der Kreis um den
 * heutigen Tag.
 *
 * Zusammengefasst wird deshalb je Tag, und zwar genau das, was ein
 * Eingriff wäre:
 *
 *   `unterbesetzt`  eine Schicht erreicht ihre Mindestbesetzung nicht.
 *                   Das ist eine Störung, also Rot — die eine
 *                   Verwendung, die die Palette dafür vorsieht.
 *                   **Nur für Chefs**: `kalender_schichten` rechnet
 *                   `understaffed` für alle anderen gar nicht erst aus.
 *   `offen`         etwas ist frei zu übernehmen. Bronze, dasselbe
 *                   Signal wie der Übernehmen-Zustand aus Phase 2 —
 *                   zwei Farben für dieselbe Sache wären zwei Sachen.
 *   `meine`         ich bin an diesem Tag eingeteilt.
 *
 * Alles andere bleibt farblos. Das ist keine Sparsamkeit um ihrer
 * selbst willen: ein Raster, in dem jeder Tag etwas signalisiert,
 * signalisiert nichts.
 */
export type TagesLage = {
  anzahl: number;
  offen: boolean;
  unterbesetzt: boolean;
  meine: boolean;
};

export function tagesLage(schichten: readonly KalenderSchicht[]): TagesLage {
  return {
    anzahl: schichten.length,
    offen: schichten.some((schicht) => schicht.open),
    unterbesetzt: schichten.some((schicht) => schicht.understaffed),
    meine: schichten.some((schicht) => schicht.mine && !schicht.canceled),
  };
}

/**
 * Wie viele Kacheln eine Rasterzelle zeigt, bevor sie zusammenfasst.
 *
 * Drei, und die Zahl ist gemessen statt geraten: in Testbetrieb 12
 * liegen an einem gewöhnlichen Tag vier Schichten und im dichtesten Fall
 * fünf (am 2026-09-06 gegen die Live-Daten gezählt). Ohne Grenze wächst
 * die Zeile mit dem vollsten Tag der Woche, und sechs halbleere Zellen
 * daneben werden mitgestreckt — bei fünf Schichten war die erste
 * Wochenzeile bereits doppelt so hoch wie die übrigen.
 *
 * Drei zeigt den gewöhnlichen Tag vollständig und kürzt erst den
 * ungewöhnlichen. Der Rest ist nicht fort, sondern einen Klick entfernt:
 * das aufklappbare Tagesdetail listet ohnehin **alle** Schichten samt
 * Namen, und der Auslöser trägt die Zahl der ausgeblendeten.
 */
export const SICHTBARE_KACHELN = 3;

/**
 * Wie eine Schicht heisst — und warum das nicht nur `label` ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ohne Namen sind alle Kacheln dieselbe Kachel
 * ─────────────────────────────────────────────────────────────────────
 *
 * `label` ist `schicht_vorlagen.bezeichnung`. Eine **benutzerdefinierte**
 * Schicht hat gar keine Vorlage, also auch kein Label — und genau die
 * entstehen über `benutzerdefinierte_schicht_erstellen`, den einzigen
 * Weg, auf dem im Dashboard überhaupt Schichten angelegt werden. Am
 * 2026-09-06 mit echtem Inhalt nachgesehen: **jede** Kachel im Raster
 * trug nur eine Uhrzeit, und in der Tagesliste stand achtzehnmal
 * „Schicht".
 *
 * Der Name steht in diesen Fällen in `kommentar` — dort hat ihn die
 * Funktion abgelegt („Abendservice", „Brunch", „Nachtbar"). Er wird
 * deshalb als Ersatz genommen, aber nicht als Ersatz **verkleidet**:
 * `kommentar` ist ein Freitextfeld und kann ein ganzer Satz sein, also
 * bleibt es bei einer Zeile, die die Darstellung abschneiden darf.
 *
 * Erfunden wird nichts — steht in beiden Feldern nichts, gibt es auch
 * keinen Namen. Die App rendert `label` ungeprüft und zeigt dann „null";
 * genau die Falle, vor der `CLAUDE.md` warnt, und der Grund für das
 * `trim()` auf beiden Seiten.
 *
 * Die Funktion steht hier und nicht in einer Komponente, aus demselben
 * Grund wie `schichtZustand()`: Kachel und Tagesliste stellen dieselbe
 * Frage und dürfen sie nicht verschieden beantworten.
 */
export function schichtName(schicht: KalenderSchicht): string | null {
  if (schicht.label?.trim()) return schicht.label.trim();
  if (schicht.kommentar?.trim()) return schicht.kommentar.trim();
  return null;
}

/* ------------------------------------------------------------------ */
/* Nachtschichten am Folgetag                                          */
/* ------------------------------------------------------------------ */

/**
 * Eine Nachtschicht, wie sie am **Folgetag** erscheint.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Der Fehler, den das behebt
 * ─────────────────────────────────────────────────────────────────────
 *
 * `schicht_instanzen` kennt nur **ein** Datum. Eine Schicht von 17:00
 * bis 02:00 steht damit ausschliesslich am Vortag im Raster — mit einem
 * kleinen „+1" an der Uhrzeit. Wer den Dienstplan überfliegt und wissen
 * will, wer am Samstag um 01:00 im Haus ist, sieht am Samstag nichts.
 * Genau so war es im Audit gemeldet: „bleibt nur am Tag davor".
 *
 * Erzeugt wird deshalb eine **Fortsetzung**: derselbe Datensatz, am
 * Folgetag, mit dem Ausschnitt nach Mitternacht (`00:00` bis `end_zeit`).
 * Sie ist ausdrücklich keine zweite Schicht — sie zählt in keiner
 * Statistik mit, hat keinen eigenen Zustand und trägt die ID der
 * ursprünglichen Schicht, damit der Klick auf dieselbe Detailseite
 * führt.
 *
 * **Warum kein Eintrag in `proTag`.** Die Karte des Folgetags soll die
 * Fortsetzung zeigen, aber der Tageszähler („3 Schichten") darf sie
 * nicht mitzählen, und `tagesLage()` darf aus ihr keine Unterbesetzung
 * ableiten — die gehört dem Vortag. Eine getrennte Liste hält beides
 * auseinander, ohne dass jede Auswertung einen Sonderfall braucht.
 */
export type Fortsetzung = {
  /** ID der ursprünglichen Schicht — Ziel des Links. */
  id: string;
  /** Der Tag, an dem die Fortsetzung erscheint. */
  datum: string;
  /** Immer `00:00`. */
  start_zeit: string;
  /** Das Ende der ursprünglichen Schicht. */
  end_zeit: string;
  /** Datum des Vortags, für die Beschriftung. */
  herkunftDatum: string;
  label: string | null;
};

/**
 * Sammelt für jeden Tag die Nachtschichten, die vom Vortag hereinragen.
 *
 * Der Vortag muss dafür im geladenen Zeitraum liegen. Am Monatsersten
 * fehlt er deshalb, und das ist hingenommen: die Alternative wäre, für
 * jeden Monatswechsel einen zusätzlichen Tag nachzuladen, um eine
 * einzige Kachel zu gewinnen. Die Schicht selbst geht dabei nicht
 * verloren — sie steht am letzten Tag des Vormonats, wo sie beginnt.
 */
export function sammleFortsetzungen(
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
): Map<string, Fortsetzung[]> {
  const ergebnis = new Map<string, Fortsetzung[]>();

  for (const [datum, schichten] of proTag) {
    for (const schicht of schichten) {
      if (!ueberNacht(schicht)) continue;

      const folgetag = naechsterTag(datum);
      const liste = ergebnis.get(folgetag) ?? [];
      liste.push({
        id: schicht.id,
        datum: folgetag,
        start_zeit: "00:00:00",
        end_zeit: schicht.end_zeit,
        herkunftDatum: datum,
        label: schicht.label,
      });
      ergebnis.set(folgetag, liste);
    }
  }

  return ergebnis;
}

/**
 * Der Tag danach als ISO-Datum.
 *
 * Über `Date.UTC` gerechnet und nicht über die lokale Zeitzone: ein
 * `new Date("2026-10-25")` plus ein Tag landet in Zeitzonen mit
 * Sommerzeitwechsel sonst auf demselben Datum zurück, weil der Tag dort
 * 25 Stunden hat. In UTC gibt es diesen Sprung nicht.
 */
function naechsterTag(datum: string): string {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  const d = new Date(Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, (tag ?? 1) + 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Die Rollennamen eines Zeitraums, stabil sortiert.
 *
 * Bestimmt, welche Kennfarbe eine Rolle im Monatsraster bekommt
 * (`rollenFarbe()` in `tages-indikator.tsx`). Sortiert wird alphabetisch
 * und nicht nach Häufigkeit: eine Rolle soll ihre Farbe behalten, wenn
 * im nächsten Monat mehr Küchen- als Bardienste anfallen.
 *
 * Gelesen wird aus den Schichten selbst und nicht aus `rollen`, weil die
 * Kalenderansicht die Rollentabelle gar nicht lädt — und weil eine
 * Rolle, die im Zeitraum nicht vorkommt, auch keine Farbe belegen soll.
 */
export function rollenReihenfolge(
  proTag: ReadonlyMap<string, KalenderSchicht[]>,
): string[] {
  const namen = new Set<string>();
  for (const schichten of proTag.values()) {
    for (const schicht of schichten) {
      for (const t of schicht.participants ?? []) {
        if (t.role_name) namen.add(t.role_name);
      }
    }
  }
  return [...namen].sort((a, b) => a.localeCompare(b, "de"));
}
