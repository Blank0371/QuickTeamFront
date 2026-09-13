import type { createClient } from "@/lib/supabase/server";
import { MITTEILUNGS_TYPEN, PRIORITAETEN, type ErstellbarerTyp } from "@/lib/validierung";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Mitteilungen — Ankündigungen, Checklisten, Umfragen und (nur zum
 * Anzeigen) Dokumente. Referenz: `messages.tsx` / `compose.tsx` in der
 * Expo-App, Parity-Audit vom 2026-08-31.
 *
 * Absichtlich **nicht** Teil dieser Seite: `notfall_vertretung`,
 * `schicht_ausschreibung`, `schicht_tausch`, `aenderungswunsch` — die
 * teilen sich in der App zwar denselben Feed-Screen und dieselbe Tabelle,
 * gehören laut `CLAUDE.md` aber zu Notfall bzw. Tausch, eigenen
 * Prüfbereichen mit eigenen Zuweisungs- und Entscheidungs-RPCs.
 */

export type MitteilungsTyp = (typeof MITTEILUNGS_TYPEN)[number] | "dokument";

/**
 * Die Typen, die in diesem Feed erscheinen — und damit zugleich die
 * Abgrenzung zu den Bereichen Notfall, Tausch und den offenen Schichten.
 *
 * `schicht_ausschreibung` steht bewusst nicht darin: die Zeilen tragen
 * andere Daten (Schicht, Rollen, Restbedarf) und verlangen eine
 * Handlung. Sie werden über `holeOffeneAusschreibungen()` geladen und
 * stehen als eigener Abschnitt über dem Feed.
 */
export const ANZEIGBARE_TYPEN = [
  "allgemein",
  "aufgabenliste",
  "umfrage",
  "dokument",
] as const;
export type Prioritaet = (typeof PRIORITAETEN)[number];

export const KATEGORIE_LABEL: Record<MitteilungsTyp, string> = {
  allgemein: "Ankündigung",
  aufgabenliste: "Checkliste",
  umfrage: "Umfrage",
  dokument: "Dokument",
};

/*
 * Bewusst nicht die App-Übersetzungen übernommen: `notifications.item.*`
 * in `de.json`/`en.json` der App trägt nur die rohen `typ`-Werte
 * (`allgemein`, `umfrage`, …) als Schlüssel, während `messages.tsx` beim
 * Anzeigen über `catKey()` andere Namen anfragt (`announcement`, `tasks`,
 * `polls`, …) — keiner davon existiert in der Übersetzungsdatei. Jede
 * Badge zeigt in der Live-App deshalb wörtlich `notifications.item.
 * announcement` statt „Ankündigungen". Gemeldet im Audit, hier nicht
 * nachgebaut.
 */

export const PRIORITAET_LABEL: Record<Prioritaet, string> = {
  normal: "Normal",
  wichtig: "Wichtig",
  dringend: "Dringend",
};

function istTyp(wert: string): wert is MitteilungsTyp {
  return wert === "dokument" || (MITTEILUNGS_TYPEN as readonly string[]).includes(wert);
}

function istPrioritaet(wert: string): wert is Prioritaet {
  return (PRIORITAETEN as readonly string[]).includes(wert);
}

/**
 * Kategorien, die eine Person anlegen darf — Spiegel der Prüfung in
 * `ankuendigung_erstellen()`: Checkliste nur Chef, `allgemein`/`umfrage`
 * für alle. `dokument` fehlt hier absichtlich, siehe oben.
 */
export function erlaubteKategorien(chef: boolean): ErstellbarerTyp[] {
  return chef ? ["allgemein", "aufgabenliste", "umfrage"] : ["allgemein", "umfrage"];
}

export type Aufgabe = {
  id: string;
  text: string;
  reihenfolge: number;
  erledigtAm: string | null;
};

export type UmfrageOption = {
  id: string;
  text: string;
  reihenfolge: number;
  anzahl: number;
  meineStimme: boolean;
  /** Nur bei nicht-anonymen Umfragen gefüllt. */
  waehlerNamen: string[];
};

export type Anhang = {
  id: string;
  dateiName: string | null;
};

export type Mitteilung = {
  id: string;
  typ: MitteilungsTyp;
  titel: string | null;
  text: string | null;
  prioritaet: Prioritaet;
  angeheftet: boolean;
  mehrfachauswahl: boolean;
  anonym: boolean;
  erstelltAm: string;
  autorName: string;
  gelesen: boolean;
  aufgaben: Aufgabe[];
  optionen: UmfrageOption[];
  anhaenge: Anhang[];
};

function gruppiert<T extends { benachrichtigung_id: string }>(zeilen: T[]): Map<string, T[]> {
  const karte = new Map<string, T[]>();
  for (const zeile of zeilen) {
    const bisher = karte.get(zeile.benachrichtigung_id) ?? [];
    bisher.push(zeile);
    karte.set(zeile.benachrichtigung_id, bisher);
  }
  return karte;
}

/**
 * Alle Rundschreiben eines Betriebs — Spiegel von `load()` in
 * `messages.tsx`, ohne die dortige Mobil-Pagination (`visibleCount`):
 * eine Web-Seite verträgt eine längere Liste über natives Scrollen, ohne
 * dass ein „Mehr laden"-Knopf etwas Zusätzliches leistet.
 *
 * **Abweichung vom Referenzverhalten, bewusst nicht nachgebaut:** die
 * App fragt `benachrichtigung_gelesen` ohne Filter auf `mitarbeiter_id`.
 * Für eine angestellte Person liefert `bg_select` dadurch ohnehin nur die
 * eigenen Zeilen, für einen Chef aber alle des Betriebs — `ist_chef()`
 * hebt den Filter in der Policy auf. Ein Chef in der App sieht eine
 * Mitteilung deshalb schon als gelesen, sobald irgendein Mitarbeiter sie
 * geöffnet hat, nicht erst, wenn er selbst es tut. Hier wird deshalb
 * ausdrücklich auf die eigene `mitarbeiter_id` gefiltert.
 */
export async function holeMitteilungen(
  supabase: SupabaseServerClient,
  betriebId: string,
  mitarbeiterId: string,
): Promise<Mitteilung[]> {
  const { data: zeilen, error } = await supabase
    .from("benachrichtigungen")
    .select("id, typ, titel, text, prioritaet, angeheftet, mehrfachauswahl, anonym, erstellt_am, autor_id")
    .eq("betrieb_id", betriebId)
    /*
     * Positiv filtern, nicht die Fremdtypen einzeln ausschliessen.
     *
     * Der Kopfkommentar dieser Datei behauptete seit dem Parity-Audit,
     * `schicht_ausschreibung`, `notfall_vertretung`, `schicht_tausch` und
     * `aenderungswunsch` seien „absichtlich nicht Teil dieser Seite" —
     * eine Bedingung dafür gab es aber nie. Die Abfrage holte alle
     * Rundrufe, und `istTyp()` bog jeden unbekannten Typ auf
     * `allgemein` um: eine Ausschreibung stand als gewöhnliche
     * „Ankündigung" im Feed, ohne Rollen, ohne Restbedarf, ohne Weg sie
     * anzunehmen. Am 2026-09-06 im Browser bestätigt.
     *
     * Eine Aufzählung der erlaubten Typen ist die haltbarere Form: ein
     * neuer Meldungstyp im geteilten Backend taucht dann nicht
     * automatisch und falsch beschriftet hier auf, sondern gar nicht —
     * bis jemand ihn bewusst aufnimmt.
     */
    .in("typ", ANZEIGBARE_TYPEN)
    .is("mitarbeiter_id", null)
    .is("geloescht_am", null)
    .order("angeheftet", { ascending: false })
    .order("erstellt_am", { ascending: false });

  if (error) {
    console.error(`[dashboard/mitteilungen] benachrichtigungen: ${error.message}`);
    return [];
  }

  const rohe = zeilen ?? [];
  const ids = rohe.map((zeile) => zeile.id);
  if (ids.length === 0) return [];

  const offeneUmfrageIds = new Set(
    rohe.filter((zeile) => zeile.typ === "umfrage" && !zeile.anonym).map((zeile) => zeile.id),
  );

  const [aufgaben, optionen, stimmen, anhaenge, gelesen] = await Promise.all([
    supabase
      .from("aufgaben")
      .select("id, benachrichtigung_id, text, reihenfolge, erledigt_am")
      .in("benachrichtigung_id", ids),
    supabase
      .from("umfrage_optionen")
      .select("id, benachrichtigung_id, text, reihenfolge")
      .in("benachrichtigung_id", ids),
    supabase
      .from("umfrage_stimmen")
      .select("benachrichtigung_id, option_id, mitarbeiter_id")
      .in("benachrichtigung_id", ids),
    supabase
      .from("nachricht_anhaenge")
      .select("id, benachrichtigung_id, datei_name")
      .in("benachrichtigung_id", ids),
    supabase
      .from("benachrichtigung_gelesen")
      .select("benachrichtigung_id")
      .eq("mitarbeiter_id", mitarbeiterId)
      .in("benachrichtigung_id", ids),
  ]);

  /*
   * Anonyme Umfragen zählen serverseitig, nicht hier.
   *
   * Seit der Audit-Migration vom 2026-09-11 gibt `us_select` bei einer
   * anonymen Umfrage nur noch die EIGENE Stimme heraus — vorher lieferte
   * sie jedem Betriebsmitglied jede Einzelstimme samt `mitarbeiter_id`,
   * und die Anonymität bestand allein darin, dass `zeigeWaehler` unten
   * die Namen nicht auflöste. Wer die Netzwerkantwort las, sah die
   * Zuordnung trotzdem.
   *
   * Die Folge: `stimmenHier.length` ist für anonyme Umfragen jetzt immer
   * höchstens 1. Die Gesamtzahl kommt deshalb aus `umfrage_ergebnis()`
   * (SECURITY DEFINER, filtert selbst auf `meine_betriebe()`), die
   * Rohzeilen tragen nur noch `meineStimme`.
   */
  const anonymeUmfrageIds = rohe
    .filter((zeile) => zeile.typ === "umfrage" && zeile.anonym)
    .map((zeile) => zeile.id);

  const anonymAnzahl = new Map<string, number>();
  if (anonymeUmfrageIds.length > 0) {
    const ergebnisse = await Promise.all(
      anonymeUmfrageIds.map((id) =>
        supabase.rpc("umfrage_ergebnis", { p_benachrichtigung_id: id }),
      ),
    );
    for (const ergebnis of ergebnisse) {
      if (ergebnis.error) {
        console.error(`[dashboard/mitteilungen] umfrage_ergebnis: ${ergebnis.error.message}`);
        continue;
      }
      for (const zeile of (ergebnis.data ?? []) as { option_id: string; anzahl: number }[]) {
        anonymAnzahl.set(zeile.option_id, Number(zeile.anzahl));
      }
    }
  }

  const autorIds = rohe.map((zeile) => zeile.autor_id).filter((id): id is string => Boolean(id));
  const waehlerIds = (stimmen.data ?? [])
    .filter((stimme) => offeneUmfrageIds.has(stimme.benachrichtigung_id))
    .map((stimme) => stimme.mitarbeiter_id);
  const namenIds = Array.from(new Set([...autorIds, ...waehlerIds]));

  const namenAntwort =
    namenIds.length > 0
      ? await supabase.rpc("mitarbeiter_namen", { p_betrieb_id: betriebId, p_ids: namenIds })
      : { data: [] as { id: string; name: string }[] };

  const nameVon = new Map<string, string>(
    (namenAntwort.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );
  const geleseneIds = new Set((gelesen.data ?? []).map((zeile) => zeile.benachrichtigung_id));

  const aufgabenNach = gruppiert(aufgaben.data ?? []);
  const optionenNach = gruppiert(optionen.data ?? []);
  const stimmenNach = gruppiert(stimmen.data ?? []);
  const anhaengeNach = gruppiert(anhaenge.data ?? []);

  return rohe.map((zeile): Mitteilung => {
    const stimmenHier = stimmenNach.get(zeile.id) ?? [];
    const zeigeWaehler = zeile.typ === "umfrage" && !zeile.anonym;

    const optionenHier = (optionenNach.get(zeile.id) ?? [])
      .slice()
      .sort((a, b) => a.reihenfolge - b.reihenfolge)
      .map((option): UmfrageOption => {
        const stimmenFuerOption = stimmenHier.filter((stimme) => stimme.option_id === option.id);
        return {
          id: option.id,
          text: option.text,
          reihenfolge: option.reihenfolge,
          anzahl: zeile.anonym
            ? (anonymAnzahl.get(option.id) ?? 0)
            : stimmenFuerOption.length,
          meineStimme: stimmenFuerOption.some((stimme) => stimme.mitarbeiter_id === mitarbeiterId),
          waehlerNamen: zeigeWaehler
            ? stimmenFuerOption.flatMap((stimme) => {
                const name = nameVon.get(stimme.mitarbeiter_id);
                return name ? [name] : [];
              })
            : [],
        };
      });

    return {
      id: zeile.id,
      typ: istTyp(zeile.typ) ? zeile.typ : "allgemein",
      titel: zeile.titel,
      text: zeile.text,
      prioritaet: istPrioritaet(zeile.prioritaet) ? zeile.prioritaet : "normal",
      angeheftet: zeile.angeheftet,
      mehrfachauswahl: zeile.mehrfachauswahl,
      anonym: zeile.anonym,
      erstelltAm: zeile.erstellt_am,
      autorName: zeile.autor_id ? (nameVon.get(zeile.autor_id) ?? "") : "",
      gelesen: geleseneIds.has(zeile.id),
      aufgaben: (aufgabenNach.get(zeile.id) ?? [])
        .slice()
        .sort((a, b) => a.reihenfolge - b.reihenfolge)
        .map((aufgabe) => ({
          id: aufgabe.id,
          text: aufgabe.text,
          reihenfolge: aufgabe.reihenfolge,
          erledigtAm: aufgabe.erledigt_am,
        })),
      optionen: optionenHier,
      anhaenge: (anhaengeNach.get(zeile.id) ?? []).map((anhang) => ({
        id: anhang.id,
        dateiName: anhang.datei_name,
      })),
    };
  });
}

/**
 * Markiert alle noch ungelesenen Mitteilungen dieser Ladung als gelesen —
 * Spiegel von „opening the tab marks everything read" in `messages.tsx`.
 * Läuft nach dem Aufbau der Liste, damit der Ungelesen-Punkt in genau
 * diesem Render noch den Stand *davor* zeigt.
 */
export async function markiereAlsGelesen(
  supabase: SupabaseServerClient,
  mitteilungen: readonly Mitteilung[],
): Promise<void> {
  const ungelesen = mitteilungen.filter((mitteilung) => !mitteilung.gelesen);
  if (ungelesen.length === 0) return;

  await Promise.all(
    ungelesen.map(async (mitteilung) => {
      const { error } = await supabase.rpc("als_gelesen_markieren", {
        p_benachrichtigung_id: mitteilung.id,
      });
      if (error) {
        console.error(`[dashboard/mitteilungen] als_gelesen_markieren: ${error.message}`);
      }
    }),
  );
}

/**
 * Nächster Stimmzettel nach einem Klick auf `optionId` — Spiegel von
 * `vote()` in `messages.tsx`: bei Einfachauswahl ersetzt die neue Wahl die
 * alte oder hebt sie auf; bei Mehrfachauswahl wird nur die eine Option
 * an- oder abgehakt.
 */
export function naechsteAuswahl(
  meineStimmen: readonly string[],
  optionId: string,
  mehrfachauswahl: boolean,
): string[] {
  const gewaehlt = meineStimmen.includes(optionId);
  if (mehrfachauswahl) {
    return gewaehlt ? meineStimmen.filter((id) => id !== optionId) : [...meineStimmen, optionId];
  }
  return gewaehlt ? [] : [optionId];
}
