import type { createClient } from "@/lib/supabase/server";
import { RECHTSTEXT_VERSIONEN } from "@/lib/rechtstexte";
import { serialisierePaket } from "./serialisierung";

import {
  AUSSCHLUESSE,
  EXPORT_TABELLEN,
  ZUSATZ_ABSCHNITTE,
  type TabellenSpec,
} from "./tabellen";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type Zeile = Record<string, unknown>;

/**
 * Wie viele Zeilen eine Abfrage holt. PostgREST deckelt die Antwort
 * ohnehin (Standard 1000); ohne eigene Seiten bekäme der Export
 * stillschweigend ein abgeschnittenes Ergebnis und sähe vollständig aus.
 * Genau das ist der Fehler, den ein Datenexport nicht machen darf.
 */
const SEITE = 1000;

/**
 * Notbremse gegen eine Endlosschleife, falls eine Sortierung einmal
 * nicht eindeutig ist. 500 Seiten sind 500.000 Zeilen je Tabelle —
 * weit jenseits dessen, was ein Gastrobetrieb erzeugt, und trotzdem
 * eine feste Obergrenze. Wird sie erreicht, steht es als Hinweis im
 * Paket statt als stille Kürzung.
 */
const SEITEN_MAX = 500;

/**
 * Ab dieser Paketgrösse warnt der Export.
 *
 * 40 MB ist kein hartes Limit, sondern die Schwelle, ab der die
 * Auslieferung in einer serverlosen Umgebung unangenehm wird: das Paket
 * liegt als Objekt **und** als JSON-Zeichenkette im Speicher, wird also
 * kurzzeitig doppelt gehalten. Die Zahl ist eine bewusste Vorwarnung mit
 * Abstand zur tatsächlichen Grenze, nicht deren Abbild — die hängt vom
 * Hoster ab und steht in `docs/export/README.md`.
 */
const GROESSE_WARNUNG = 40 * 1_048_576;

export const PAKET_FORMAT = "quickteam-betriebsexport/3";

/** Die Tabelle, die das Änderungsprotokoll trägt. */
export const PROTOKOLL_TABELLE = "plan_aenderungen";

/** Die Adresse, unter der das vollständige Protokoll abrufbar ist. */
export const PROTOKOLL_ABRUF = "/api/betrieb-export?protokoll=voll";

/**
 * Wie viel Änderungsprotokoll in das Paket geht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das Protokoll nicht mehr im Standardpaket steht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Weil es alles andere erdrückt. Gemessen am 2026-09-17 an Testbetrieb
 * 12 — einem Betrieb mit 21 Anstellungen, 164 Schichten und 533
 * Zuweisungen, also wenig Daten: 5.719 Protokollzeilen, rund 3,95 MB
 * von 4,4 MB des ganzen Pakets. Jede Änderung an `schicht_instanzen`
 * und `schicht_zuweisungen` legt die **vollständige Zeile vorher und
 * nachher** ab, und ein verworfener Solver-Lauf erzeugt für jede
 * einzelne Schicht ein Einfüge- und ein Löschpaar. Alle 5.719 Einträge
 * stammten aus vier Wochen; ein Zeitfenster hätte davon nichts
 * abgeschnitten.
 *
 * Wer die Datei herunterlädt, will in aller Regel den **Bestand**:
 * Mitarbeiter, Rollen, Schichten, Urlaub — das, was ein neuer Anbieter
 * einliest. Die Entstehungsgeschichte braucht er dafür nicht. Sie ist
 * trotzdem nicht entbehrlich: für einen Nachweis, wer wann welche
 * Schicht geändert hat, ist sie die einzige Quelle.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das rechtlich trägt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das Protokoll sind **exportierbare Daten** — Art. 2 Nr. 38 der
 * Verordnung (EU) 2023/2854 zählt ausdrücklich „Metadaten, die
 * unmittelbar oder mittelbar durch die Nutzung … generiert werden" dazu.
 * Weglassen dürfte man es also nicht. Man muss es aber auch nicht in
 * dieselbe Datei legen: Art. 30 Abs. 5 verlangt, dass der Anbieter
 * „**auf Verlangen des Kunden** alle exportierbaren Daten in einem
 * strukturierten, gängigen und maschinenlesbaren Format" exportiert.
 * Genau das ist `PROTOKOLL_ABRUF` — ein Verlangen, das keine E-Mail und
 * keine Wartezeit kostet, sondern einen zweiten Knopf.
 *
 * Drei Bedingungen hängen daran, und sie sind keine Kür:
 *
 *  1. „Änderungsprotokolle" bleiben in der erschöpfenden Kategorienliste
 *     des Vertrags (§ 6 Abs. 5 AGB, Art. 25 Abs. 2 lit. e der
 *     Verordnung). Dort wird nichts gestrichen.
 *  2. Der Abruf ist unentgeltlich und für dieselbe berechtigte Person
 *     ohne Umweg erreichbar (Art. 29).
 *  3. **Das Paket behauptet keine Vollständigkeit, die es nicht hat.**
 *     Der Umfang steht als eigenes Feld darin, mit der Adresse des
 *     Vollabrufs — siehe `ExportPaket.protokoll`.
 */
export type ProtokollUmfang =
  /** Standardpaket: das Protokoll bleibt draussen, der Abrufweg steht drin. */
  | "keins"
  /** Vollabruf: das Protokoll geht vollständig mit. */
  | "voll";

/**
 * Wie ein Dateiverweis aussieht — **ohne** ihn abzurufen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum hier nichts geladen wird
 * ─────────────────────────────────────────────────────────────────────
 *
 * `nachricht_anhaenge.datei_pfad` ist eine gewöhnliche Textspalte, die
 * unter `na_insert`-Rechten von jedem Betriebsmitglied beschrieben
 * werden kann. Ein Export, der diesen Wert serverseitig abruft, ist eine
 * Server-Side Request Forgery mit Ansage: `http://169.254.169.254/…`
 * holt Cloud-Metadaten, `http://localhost:54321/…` erreicht Dienste, die
 * von aussen nicht erreichbar sind — und beides mit den Rechten unseres
 * Servers, nicht denen des Nutzers.
 *
 * Deshalb wird der Wert **eingeordnet, nie aufgerufen**. Signierte
 * Adressen entstehen später ausschliesslich über das Supabase-SDK für
 * Pfade, die im Ordner dieses Betriebs liegen; eine absolute URL bekommt
 * keine Signatur, sondern eine Markierung.
 */
export type PfadArt =
  /** Relativer Objektspeicher-Pfad — das erwartete Format. */
  | "speicherpfad"
  /** Enthält ein Schema (`http:`, `file:`, …). Wird nicht aufgelöst. */
  | "absolute-url"
  /** Leer oder nur Leerzeichen. */
  | "leer";

export type DateiEintrag = Zeile & {
  /** Einordnung von `datei_pfad`, siehe `PfadArt`. */
  pfad_art: PfadArt;
  /** Liegt der Pfad im Ordner dieses Betriebs (`<betrieb_id>/…`)? */
  im_betriebsordner: boolean;
  /**
   * Immer `false`, solange es keinen Objektspeicher gibt. Steht
   * ausdrücklich als Feld da, damit ein Leser des Pakets nicht aus dem
   * Fehlen einer Adresse schliessen muss.
   */
  datei_enthalten: false;
};

/**
 * Drei Fragen, die **nicht** dieselbe sind — getrennt seit dem
 * 2026-09-14.
 *
 * Die Fassung davor hatte ein einziges `vollstaendig`, in dem eine nicht
 * lesbare Tabelle und eine fehlende Anhangsdatei denselben Wert
 * umlegten. Das verwischt die Frage, die ein Empfänger tatsächlich
 * stellt: *Kann ich damit weiterarbeiten?* Eine fehlende PDF-Datei ist
 * etwas anderes als ein fehlender Dienstplan, und beides ist etwas
 * anderes als „die Daten stammen nicht aus einem Zeitpunkt".
 */
export type Vollstaendigkeit = {
  /**
   * **Fachlich**: konnten alle gelisteten Tabellen vollständig gelesen
   * werden? `false` bei Lesefehlern, erreichten Seitengrenzen und
   * abgeschnittenen Tabellen ohne eindeutige Sortierung.
   */
  fachlich: boolean;
  /**
   * **Dateien**: sind alle referenzierten Anhänge im Paket? `true`, wenn
   * gar keine referenziert sind — kein Anhang ist kein fehlender Anhang.
   */
  dateien: boolean;
  /**
   * **Zeitlich**: stammt das Paket aus einem Zeitpunkt?
   *
   * `"keiner"` heisst: nein. Jede Tabelle ist eine eigene Transaktion,
   * und Keyset-Blättern allein löst das nicht — es verhindert nur, dass
   * *innerhalb* einer Tabelle Zeilen verrutschen. `"schnappschuss"`
   * setzt eine Datenbankfunktion mit `repeatable read` voraus, die es
   * noch nicht gibt (`docs/export/migration-export-schnappschuss.sql`).
   */
  zeitlich: "schnappschuss" | "keiner";
  /**
   * Verweise zwischen Tabellen, die ins Leere zeigen.
   *
   * Die unmittelbare Folge fehlender zeitlicher Konsistenz: wird während
   * des Laufs eine Schicht angelegt, nachdem `schicht_instanzen` gelesen
   * war, aber bevor `schicht_zuweisungen` gelesen wurde, steht im Paket
   * eine Zuweisung ohne ihre Schicht. Das ist keine Katastrophe — aber es
   * gehört gesagt, weil ein Importeur sonst über einen Fremdschlüssel
   * stolpert, den er für garantiert hielt.
   */
  offene_verweise: { von: string; feld: string; nach: string; anzahl: number }[];
};

export type ExportPaket = {
  format: typeof PAKET_FORMAT;
  /**
   * **Die wichtigste Angabe des Pakets** — die Und-Verknüpfung aus
   * `vollstaendigkeit.fachlich` und `.dateien`.
   *
   * Die zeitliche Konsistenz geht **nicht** ein: sie ist heute
   * grundsätzlich `"keiner"`, und ein Paket, das sich deshalb immer
   * unvollständig nennt, sagt nichts mehr aus. Wer sie braucht, liest
   * `vollstaendigkeit.zeitlich`.
   */
  vollstaendig: boolean;
  /** Die drei Fragen einzeln. */
  vollstaendigkeit: Vollstaendigkeit;
  /** Was genau fehlt. Leer, wenn `vollstaendig` gilt. */
  unvollstaendig: string[];
  meta: {
    betrieb: { id: string; name: string };
    erzeugtVon: { auth_id: string; mitarbeiter_id: string; rolle_typ: string };
    /** Beginn und Ende des Auslesens, ISO 8601 in UTC. */
    begonnen_am: string;
    beendet_am: string;
    zeitzone:
      "Alle Zeitstempel sind UTC (ISO 8601, Suffix Z), sofern die Spalte eine Zeitzone trägt. Reine Datumsfelder (z. B. `datum`, `von`, `bis`) sind Kalendertage ohne Zeitzone.";
    konsistenz: string;
    /**
     * Grösse des fertigen Pakets in Bytes, wie es ausgeliefert wird.
     *
     * Steht drin, weil die Hostingumgebung eine Grenze hat und ein
     * Empfänger wissen soll, ob er sie erreicht: der Export wird
     * vollständig im Arbeitsspeicher zusammengesetzt und als eine
     * Antwort ausgeliefert. Details und die Warnschwelle in
     * `docs/export/README.md`, Abschnitt „Grenzen der Laufzeitumgebung".
     */
    groesse_bytes: number;
    rechtstexte_fassungen: Record<string, string>;
  };
  /** Kurzbeschreibung je Abschnitt — damit das Paket für sich lesbar ist. */
  beschreibungen: Record<string, string>;
  /** Was nicht enthalten ist, mit Grund. */
  ausschluesse: readonly { name: string; grund: string }[];
  /** Auffälligkeiten des Laufs: Redaktionen, Fehlschläge, Grenzen. */
  hinweise: string[];
  /**
   * Umfang des Änderungsprotokolls in **diesem** Paket, maschinenlesbar.
   *
   * Steht als eigenes Feld da und nicht bloss als Satz unter
   * `hinweise`, weil ein Empfänger es auswerten können muss, ohne
   * Fliesstext zu lesen: „ist das Protokoll hier drin, und wenn nicht,
   * wo bekomme ich es?" ist eine Frage mit zwei möglichen Antworten,
   * nicht eine Nuance.
   *
   * Es geht **nicht** in `vollstaendig` ein. Das Feld bezeichnet einen
   * Mangel — eine nicht lesbare Tabelle, eine fehlende Anhangsdatei —,
   * und ein bewusst gewählter Umfang ist keiner. Stünde `UNVOLLSTAENDIG`
   * im Dateinamen jedes gewöhnlichen Exports, wäre die Markierung dort
   * wertlos, wo sie wirklich gebraucht wird.
   */
  protokoll: {
    umfang: ProtokollUmfang;
    /** Anzahl der enthaltenen Protokolleinträge. */
    eintraege: number;
    /** Wo das vollständige Protokoll abrufbar ist. */
    vollstaendig_abrufbar_unter: typeof PROTOKOLL_ABRUF;
    hinweis: string;
  };
  tabellen: Record<string, Zeile[]>;
  umfrage_ergebnisse_anonym: {
    benachrichtigung_id: string;
    ergebnis: { option_id: string; anzahl: number }[];
  }[];
  rechtliche_zustimmungen: Zeile[];
  kenntnisnahmen_datenschutz: Zeile[];
  referenz: { gesetzliche_parameter: Zeile[] };
  dateien: DateiEintrag[];
};

/* ------------------------------------------------------------------ */
/* Seitenweises Lesen                                                  */
/* ------------------------------------------------------------------ */

/**
 * PostgREST-Filterwert: in doppelte Anführungszeichen, Sonderzeichen
 * maskiert.
 *
 * Ohne Anführungszeichen beendet ein Komma im Wert den Filter und der
 * Rest wird als weitere Bedingung gelesen. Unsere Schlüssel sind UUIDs
 * und Zeitstempel, aber „unsere Schlüssel sind harmlos" ist keine
 * Eigenschaft, auf die eine Filterkonstruktion sich stützen sollte.
 */
function filterWert(wert: unknown): string {
  const text = wert instanceof Date ? wert.toISOString() : String(wert);
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Die Keyset-Bedingung „alles nach dieser Zeile".
 *
 * Für eine Ordnung `[a, b]` und die zuletzt gelesene Zeile `(x, y)`:
 *
 *     or=(a.gt."x",and(a.eq."x",b.gt."y"))
 *
 * Das ist die Übersetzung von `(a, b) > (x, y)` in die Filtersprache
 * von PostgREST, die Zeilenwert-Vergleiche nicht kennt.
 */
function keysetBedingung(ordnung: string[], letzte: Zeile): string {
  const teile: string[] = [];

  for (let i = 0; i < ordnung.length; i += 1) {
    const gleich = ordnung
      .slice(0, i)
      .map((spalte) => `${spalte}.eq.${filterWert(letzte[spalte])}`);
    const groesser = `${ordnung[i]}.gt.${filterWert(letzte[ordnung[i]!])}`;
    teile.push(gleich.length === 0 ? groesser : `and(${[...gleich, groesser].join(",")})`);
  }

  return teile.join(",");
}

/**
 * Holt eine Tabelle vollständig.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum Keyset und nicht `range()` — die Korrektur vom 2026-09-14
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die erste Fassung blätterte mit `range(n*1000, …)`, also über einen
 * Zeilenversatz. Das ist bei gleichzeitigen Änderungen **nachweislich
 * falsch**, und zwar in beide Richtungen:
 *
 *  - Wird während des Laufs eine Zeile eingefügt, deren Schlüssel
 *    **vor** dem aktuellen Versatz liegt, rutscht alles um eins nach
 *    hinten. Die Zeile, die gerade an der Seitengrenze stand, wird
 *    **übersprungen** — sie steht nicht im Export, und nichts fällt auf.
 *  - Wird eine Zeile gelöscht, rutscht alles um eins nach vorn, und die
 *    Zeile an der Grenze kommt **doppelt**.
 *
 * Ein Dienstplan ändert sich während eines Exports ständig: der Solver
 * schreibt, jemand nimmt eine Schicht an, ein Trigger protokolliert. Bei
 * `plan_aenderungen` (heute rund 7.600 Zeilen, also acht Seiten) ist das
 * kein Randfall.
 *
 * Keyset-Blättern fragt stattdessen „alles nach dieser Zeile" und hat
 * keinen Versatz, der verrutschen könnte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Garantie, die daraus folgt — und die, die daraus nicht folgt
 * ─────────────────────────────────────────────────────────────────────
 *
 * **Es gilt:** jede Zeile, die während des gesamten Lesevorgangs
 * unverändert vorhanden ist, erscheint **genau einmal**. Weder
 * übersprungen noch doppelt.
 *
 * **Es gilt nicht:** ein Schnappschuss. Eine Zeile, die während des
 * Laufs entsteht, kann enthalten sein oder fehlen — je nachdem, ob ihr
 * Schlüssel vor oder hinter dem Cursor liegt. Eine Zeile, die gelöscht
 * wird, bevor der Cursor sie erreicht, fehlt. Und zwischen zwei
 * Tabellen gibt es ohnehin keine gemeinsame Transaktion.
 *
 * Beides steht so im Paket (`meta.konsistenz`).
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Voraussetzung: die Ordnung muss eindeutig sein
 * ─────────────────────────────────────────────────────────────────────
 *
 * Keyset setzt voraus, dass keine zwei Zeilen denselben Ordnungswert
 * tragen — sonst überspränge `gt` die Geschwister. Für alle Tabellen
 * bis auf eine ist die Ordnung der Primärschlüssel und damit eindeutig.
 * Die Ausnahme ist `einladungen`, deren Primärschlüssel der
 * Einladungs-Hash ist: den exportieren wir nicht, und wir wollen ihn
 * auch nicht als Sortierkriterium verwenden — eine Sortierung über ein
 * Zugangsgeheimnis ist ein Seitenkanal, so schmal er sein mag.
 *
 * Dafür der zweite Zweig: **eine Seite lesen und den Überlauf melden**.
 * Kommt sie voll zurück, ist die Tabelle womöglich länger, und das Paket
 * sagt es, statt stillschweigend abzuschneiden. Bei einer Tabelle, die
 * durch die Mitarbeiterzahl des Tarifs begrenzt ist (höchstens 50),
 * ist das eine Grenze, die praktisch nie greift und im Ernstfall
 * sichtbar wird.
 */
async function leseTabelle(
  supabase: SupabaseServerClient,
  spec: TabellenSpec,
  betriebId: string,
  hinweise: string[],
  maengel: string[],
): Promise<Zeile[]> {
  const basis = () =>
    supabase.from(spec.name).select(spec.spalten ?? "*").eq(spec.schluessel, betriebId);

  const sortiert = (abfrage: ReturnType<typeof basis>) => {
    let a = abfrage;
    for (const spalte of spec.ordnung) a = a.order(spalte, { ascending: true });
    return a;
  };

  /* --- Ordnung nicht eindeutig: eine Seite, Überlauf melden --------- */

  if (!spec.eindeutig) {
    const { data, error } = await sortiert(basis()).limit(SEITE);

    if (error) {
      hinweise.push(`FEHLER: ${spec.name} nicht lesbar (${error.message}).`);
      maengel.push(`${spec.name}: nicht lesbar`);
      return [];
    }

    const zeilen = (data ?? []) as unknown as Zeile[];
    if (zeilen.length === SEITE) {
      hinweise.push(
        `FEHLER: ${spec.name} hat die Obergrenze von ${SEITE} Zeilen erreicht und wird ohne eindeutige Sortierung gelesen — es können Zeilen fehlen.`,
      );
      maengel.push(`${spec.name}: möglicherweise abgeschnitten`);
    }
    return zeilen;
  }

  /* --- Keyset ------------------------------------------------------- */

  const alle: Zeile[] = [];
  let letzte: Zeile | null = null;

  for (let seite = 0; seite < SEITEN_MAX; seite += 1) {
    let abfrage = sortiert(basis());
    if (letzte) abfrage = abfrage.or(keysetBedingung(spec.ordnung, letzte));

    const { data, error } = await abfrage.limit(SEITE);

    if (error) {
      /*
       * Ein Fehlschlag bricht den Export nicht ab, wird aber sichtbar
       * vermerkt — und zwar an zwei Stellen: als Hinweis im Klartext und
       * als Mangel, der das Paket insgesamt als unvollständig kennzeichnet.
       * Ein Paket, in dem eine Tabelle fehlt und niemand es weiss, ist
       * schlimmer als eines mit einer Fehlzeile; bei einem
       * Anbieterwechsel entscheidet genau diese Zeile, ob der Kunde
       * nachfragt oder mit einer Lücke weiterzieht.
       */
      hinweise.push(
        `FEHLER: ${spec.name} konnte nicht vollständig gelesen werden (${error.message}).`,
      );
      maengel.push(`${spec.name}: unvollständig gelesen`);
      return alle;
    }

    const zeilen = (data ?? []) as unknown as Zeile[];
    alle.push(...zeilen);
    if (zeilen.length < SEITE) return alle;
    letzte = zeilen[zeilen.length - 1] ?? null;
    if (!letzte) return alle;
  }

  hinweise.push(
    `FEHLER: ${spec.name} hat die Seitengrenze von ${SEITEN_MAX * SEITE} Zeilen erreicht — das Paket ist an dieser Stelle unvollständig.`,
  );
  maengel.push(`${spec.name}: Seitengrenze erreicht`);
  return alle;
}

/* ------------------------------------------------------------------ */
/* Verweise zwischen Tabellen                                          */
/* ------------------------------------------------------------------ */

/**
 * Die Beziehungen, die ein Empfänger beim Einlesen voraussetzen würde.
 *
 * Bewusst eine kurze, gepflegte Liste statt aller Fremdschlüssel des
 * Schemas: geprüft wird, was beim Wiederaufbau eines Dienstplans
 * wirklich gebraucht wird. Eine vollständige FK-Abbildung wäre mehr
 * Rauschen als Auskunft — und sie müsste bei jedem Schemazuwachs
 * nachgezogen werden, ohne dass jemand es merkt.
 */
const VERWEISE: readonly { von: string; feld: string; nach: string; schluessel: string }[] = [
  { von: "notfall_gruende", feld: "notfall_id", nach: "notfaelle", schluessel: "id" },
  { von: "schicht_zuweisungen", feld: "schicht_instanz_id", nach: "schicht_instanzen", schluessel: "id" },
  { von: "schicht_zuweisungen", feld: "mitarbeiter_id", nach: "mitarbeiter", schluessel: "id" },
  { von: "schicht_zuweisungen", feld: "rolle_id", nach: "rollen", schluessel: "id" },
  { von: "schicht_instanz_mindestbesetzung", feld: "schicht_instanz_id", nach: "schicht_instanzen", schluessel: "id" },
  { von: "schicht_vorlage_mindestbesetzung", feld: "schicht_vorlage_id", nach: "schicht_vorlagen", schluessel: "id" },
  { von: "mitarbeiter_rollen", feld: "mitarbeiter_id", nach: "mitarbeiter", schluessel: "id" },
  { von: "mitarbeiter_rollen", feld: "rolle_id", nach: "rollen", schluessel: "id" },
  { von: "urlaub", feld: "mitarbeiter_id", nach: "mitarbeiter", schluessel: "id" },
  { von: "verfuegbarkeiten", feld: "schicht_instanz_id", nach: "schicht_instanzen", schluessel: "id" },
  { von: "umfrage_optionen", feld: "benachrichtigung_id", nach: "benachrichtigungen", schluessel: "id" },
  { von: "aufgaben", feld: "benachrichtigung_id", nach: "benachrichtigungen", schluessel: "id" },
  { von: "nachricht_anhaenge", feld: "benachrichtigung_id", nach: "benachrichtigungen", schluessel: "id" },
  { von: "notfaelle", feld: "schicht_instanz_id", nach: "schicht_instanzen", schluessel: "id" },
];

/**
 * Findet Verweise, die im Paket ins Leere zeigen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das überhaupt vorkommt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Weil der Export **kein Schnappschuss** ist. Die Tabellen werden
 * nacheinander gelesen, jede in ihrer eigenen Transaktion. Wird eine
 * Schicht angelegt, nachdem `schicht_instanzen` gelesen war, aber bevor
 * `schicht_zuweisungen` an der Reihe ist, steht im Paket eine Zuweisung
 * ohne ihre Schicht.
 *
 * Keyset-Blättern ändert daran **nichts** — es verhindert nur, dass
 * *innerhalb* einer Tabelle Zeilen verrutschen. Wer beides
 * durcheinanderbringt, hält den Export für konsistenter, als er ist.
 *
 * Der Ausweg ist nicht, es zu verhindern (dafür bräuchte es die
 * Datenbankfunktion aus `migration-export-schnappschuss.sql`), sondern
 * es **zu bemerken und zu nennen**. Ein Importeur, der über einen
 * Fremdschlüssel stolpert, den er für garantiert hielt, hat ein Problem;
 * einer, der die Liste vorher liest, hat eine Aufgabe.
 */
export function findeOffeneVerweise(
  tabellen: Record<string, Zeile[]>,
): { von: string; feld: string; nach: string; anzahl: number }[] {
  const offen: { von: string; feld: string; nach: string; anzahl: number }[] = [];

  for (const bez of VERWEISE) {
    const quelle = tabellen[bez.von];
    const ziel = tabellen[bez.nach];
    if (!quelle || !ziel || quelle.length === 0) continue;

    const vorhanden = new Set(ziel.map((zeile) => String(zeile[bez.schluessel])));
    let anzahl = 0;

    for (const zeile of quelle) {
      const wert = zeile[bez.feld];
      // `null` ist kein offener Verweis, sondern „nicht gesetzt" —
      // `schicht_instanzen.planungszyklus_id` ist genau so gemeint.
      if (wert === null || wert === undefined) continue;
      if (!vorhanden.has(String(wert))) anzahl += 1;
    }

    if (anzahl > 0) offen.push({ von: bez.von, feld: bez.feld, nach: bez.nach, anzahl });
  }

  return offen;
}

/* ------------------------------------------------------------------ */
/* Dateianhänge                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ordnet einen gespeicherten Pfad ein — ohne ihn aufzurufen.
 *
 * Erkannt wird ein Schema am Muster `xyz:`; das deckt `http:`, `https:`,
 * `file:`, `data:` und alles andere ab, was ein Abrufversuch
 * interpretieren würde. Ein führender `//` (protokollrelativ) zählt
 * ebenfalls als absolut.
 */
export function ordnePfadEin(pfad: unknown): PfadArt {
  if (typeof pfad !== "string" || pfad.trim() === "") return "leer";
  const wert = pfad.trim();
  if (wert.startsWith("//")) return "absolute-url";
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(wert) ? "absolute-url" : "speicherpfad";
}

/**
 * Liegt der Pfad im Ordner dieses Betriebs?
 *
 * Die Tabellenzeile ist über `betrieb_id` eingegrenzt — der **Pfad
 * darin** ist es nicht. Wer eine Anhangszeile anlegen darf, bestimmt
 * ihren Pfad frei und könnte auf den Ordner eines fremden Betriebs
 * zeigen. Die Prüfung ist deshalb nicht Kosmetik, sondern die
 * Mandantengrenze für die Datei; sie entscheidet später darüber, ob ein
 * Pfad überhaupt signiert werden darf.
 */
export function imBetriebsordner(pfad: unknown, betriebId: string): boolean {
  if (typeof pfad !== "string") return false;
  const wert = pfad.trim().replace(/^\/+/, "");
  return wert.startsWith(`${betriebId}/`);
}

/* ------------------------------------------------------------------ */
/* Nachbearbeitung                                                     */
/* ------------------------------------------------------------------ */

/**
 * Schlüsselnamen, deren Wert im Änderungsprotokoll nie mitgeht.
 *
 * `plan_aenderungen` hält ganze Zeilen als JSON fest — und zwar so, wie
 * sie vor und nach einer Änderung aussahen. Was heute aus einer Tabelle
 * herausgefiltert wird, kann dort also noch im Klartext stehen: ein
 * Einladungs-Hash, ein Token, der Notfallgrund. Die Redaktion greift am
 * Schlüsselnamen und nicht an der Tabelle, weil dasselbe Feld in
 * mehreren Zeilenarten auftaucht.
 */
const GEHEIM_SCHLUESSEL = [
  "hash",
  "token",
  "expo_token",
  "secret",
  "passwort",
  "password",
  "api_key",
  "stripe_customer_id",
  "stripe_subscription_id",
];

/** Felder, die bei einer pseudonymisierten Anstellung nicht zurückkehren dürfen. */
const PERSONENFELDER = ["vorname", "nachname", "email", "telefon"];

const REDIGIERT = "[entfernt]";

function redigiereJson(
  wert: unknown,
  tabelle: string | null,
  personenfelderEntfernen: boolean,
): unknown {
  if (Array.isArray(wert)) {
    return wert.map((eintrag) => redigiereJson(eintrag, tabelle, personenfelderEntfernen));
  }
  if (typeof wert !== "object" || wert === null) return wert;

  const aus: Zeile = {};
  for (const [schluessel, inhalt] of Object.entries(wert as Zeile)) {
    const klein = schluessel.toLowerCase();

    if (GEHEIM_SCHLUESSEL.some((geheim) => klein === geheim || klein.endsWith(`_${geheim}`))) {
      aus[schluessel] = REDIGIERT;
      continue;
    }
    /*
     * Der Notfallgrund ist eine Angabe, zu der die App ausdrücklich
     * „Ich bin krank." vorschlägt — also potenziell ein Gesundheitsdatum
     * nach Art. 9 DSGVO. Im Änderungsprotokoll steht er unabhängig
     * davon, wer ihn heute lesen darf, und ein Export würde ihn dauerhaft
     * aus dem Rechtekreis der Datenbank herausholen.
     */
    if (tabelle === "notfaelle" && klein === "grund") {
      aus[schluessel] = REDIGIERT;
      continue;
    }
    if (personenfelderEntfernen && PERSONENFELDER.includes(klein)) {
      aus[schluessel] = REDIGIERT;
      continue;
    }

    aus[schluessel] = redigiereJson(inhalt, tabelle, personenfelderEntfernen);
  }
  return aus;
}

/**
 * Bereinigt das Änderungsprotokoll.
 *
 * Zwei Eingriffe, beide aus der Aufgabenstellung des Reviews:
 *
 * 1. **Geheimnisse und Art.-9-Daten** verschwinden aus den JSON-Werten
 *    (siehe `GEHEIM_SCHLUESSEL` und der Notfallgrund oben).
 * 2. **Pseudonymisierung bleibt bestehen.** Wer sein Konto gelöscht hat,
 *    ist in `mitarbeiter` anonymisiert — im Protokoll steht sein Name
 *    aber noch in den alten Werten. Ein Export, der ihn mitnimmt, macht
 *    die Löschung rückgängig, und zwar an einem Ort ausserhalb unserer
 *    Reichweite.
 */
function bereinigeProtokoll(zeilen: Zeile[], anonymisierte: Set<string>): Zeile[] {
  return zeilen.map((zeile) => {
    const tabelle = typeof zeile["tabelle"] === "string" ? (zeile["tabelle"] as string) : null;
    const datensatz = typeof zeile["datensatz_id"] === "string" ? (zeile["datensatz_id"] as string) : null;
    const betrifftAnonymisierte =
      tabelle === "mitarbeiter" && datensatz !== null && anonymisierte.has(datensatz);

    return {
      ...zeile,
      alte_werte: redigiereJson(zeile["alte_werte"], tabelle, betrifftAnonymisierte),
      neue_werte: redigiereJson(zeile["neue_werte"], tabelle, betrifftAnonymisierte),
    };
  });
}

/**
 * Bei `update` bleiben nur die Felder, die sich tatsächlich geändert
 * haben.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was der Trigger ablegt und was davon Auskunft ist
 * ─────────────────────────────────────────────────────────────────────
 *
 * `alte_werte` und `neue_werte` halten bei einer Änderung **beide Male
 * die ganze Zeile** — auch die zehn Felder, die gleich geblieben sind.
 * Gemessen an Testbetrieb 12: im Schnitt ändert sich **1,0 von 10,9
 * Feldern**, und die 492 Änderungseinträge belegen 394 kB statt 34 kB.
 * Neun Zehntel davon sind dieselbe Angabe, links und rechts.
 *
 * Verglichen wird auf den **rohen** Werten, nicht auf den redigierten:
 * sonst fiele eine Änderung, die ausschliesslich ein Geheimnis betrifft,
 * als „[entfernt] = [entfernt]" unter den Tisch, und das Protokoll
 * behauptete, es habe sich nichts geändert. Redigiert wird danach, auf
 * dem verbliebenen Teil.
 *
 * `insert` und `delete` bleiben unangetastet: dort trägt genau eine
 * Seite die ganze Zeile, und sie ist bei einem gelöschten Datensatz die
 * einzige Spur, die es überhaupt noch gibt.
 */
export function verdichteAenderung(zeile: Zeile): Zeile {
  if (zeile["aktion"] !== "update") return zeile;

  const alt = zeile["alte_werte"];
  const neu = zeile["neue_werte"];
  if (!istDatensatz(alt) || !istDatensatz(neu)) return zeile;

  const altAus: Zeile = {};
  const neuAus: Zeile = {};

  for (const schluessel of new Set([...Object.keys(alt), ...Object.keys(neu)])) {
    if (gleich(alt[schluessel], neu[schluessel])) continue;
    altAus[schluessel] = alt[schluessel] ?? null;
    neuAus[schluessel] = neu[schluessel] ?? null;
  }

  /*
   * ─────────────────────────────────────────────────────────────────
   *  Der Eintrag, bei dem sich gar nichts geändert hat
   * ─────────────────────────────────────────────────────────────────
   *
   * Es gibt ihn wirklich — am 2026-09-17 in Testbetrieb 12 acht Stück:
   * ein `update`, bei dem `alte_werte` und `neue_werte` Feld für Feld
   * gleich sind. Der Auslöser feuert bei jedem `UPDATE`, auch bei
   * einem, das denselben Wert noch einmal schreibt. Der erste dieser
   * Fälle liegt sechzehn Sekunden nach dem Anlegen der Schicht:
   * aufgemacht, angesehen, gespeichert.
   *
   * Nach der Verdichtung bliebe davon zweimal `{}` übrig — ein Eintrag,
   * der aussieht, als sei unterwegs etwas verlorengegangen. Er wird
   * deshalb **gekennzeichnet, nicht weggelassen**: das Protokoll ist
   * auch ein Nachweis darüber, wer wann an einem Dienstplan war, und
   * einen Schreibvorgang aus einer Beweisspur zu nehmen, um acht
   * Einträge zu sparen, ist der schlechteste der drei möglichen
   * Tausche. Entschieden am 2026-09-17.
   */
  if (Object.keys(neuAus).length === 0) {
    return { ...zeile, alte_werte: {}, neue_werte: {}, ohne_wirkung: true };
  }

  return { ...zeile, alte_werte: altAus, neue_werte: neuAus };
}

function istDatensatz(wert: unknown): wert is Zeile {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert);
}

/**
 * Wertgleichheit über den JSON-Text.
 *
 * Für die Werte, die hier vorkommen — Skalare und die verschachtelten
 * JSON-Werte einer Zeile — ist das der ehrlichere Vergleich als `===`,
 * das zwei inhaltsgleiche Objekte für verschieden hielte und damit
 * unveränderte Felder als Änderung ausgäbe. Die Schlüsselreihenfolge
 * stammt bei beiden Seiten aus derselben Zeile, ist also stabil; im
 * Zweifel bleibt ein Feld drin, und das ist die richtige Richtung.
 */
function gleich(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/* ------------------------------------------------------------------ */
/* Das Paket                                                           */
/* ------------------------------------------------------------------ */

export type PaketAuftrag = {
  betriebId: string;
  betriebName: string;
  authId: string;
  mitarbeiterId: string;
  rolleTyp: string;
  /**
   * Ohne Vorgabewert, mit Absicht: der Umfang ist eine Zusage an den
   * Kunden, und eine Zusage soll an der Aufrufstelle sichtbar stehen.
   * Ein stillschweigendes „keins" wäre genau die Art von Vorgabe, die
   * beim nächsten Aufrufer niemandem auffällt.
   */
  protokoll: ProtokollUmfang;
};

/**
 * Baut das vollständige Exportpaket eines Betriebs.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was diese Funktion **nicht** entscheidet
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ob jemand exportieren darf. Der Auftrag kommt bereits mit einer
 * serverseitig abgeleiteten Position herein; hier wird keine ID aus
 * einer Anfrage gelesen und keine geglaubt. Die Aufrufstelle
 * (`/api/betrieb-export`) prüft Anmeldung, aktive Anstellung und
 * Chef-Eigenschaft, und RLS prüft danach noch einmal.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Konsistenz: was hier nicht zu haben ist
 * ─────────────────────────────────────────────────────────────────────
 *
 * Jede Tabelle ist eine eigene Anfrage über PostgREST, also eine eigene
 * Transaktion. Ein Export über mehrere Sekunden kann deshalb eine
 * Schicht enthalten, deren Zuweisung erst danach entstanden ist. Ein
 * echter Schnappschuss bräuchte eine wiederholbare Leseransicht in
 * **einer** Transaktion — also eine Datenbankfunktion, und die anzulegen
 * ist von hier aus ausgeschlossen (`CLAUDE.md`, „Was hier nicht
 * passiert").
 *
 * Deshalb wird nicht so getan, als sei es einer: Anfang und Ende des
 * Laufs stehen im Paket, und `meta.konsistenz` sagt in einem Satz, was
 * das bedeutet. Für die Fassung mit Schnappschuss liegt ein
 * Migrationsentwurf bei (`docs/export/migration-export-schnappschuss.sql`).
 */
export async function baueExportPaket(
  supabase: SupabaseServerClient,
  auftrag: PaketAuftrag,
): Promise<ExportPaket> {
  const begonnen = new Date().toISOString();
  const hinweise: string[] = [];
  /*
   * `maengel` ist nicht dasselbe wie `hinweise`. Hinweise erklären, was
   * der Export mit den Daten gemacht hat (Redaktionen, Aggregationen) —
   * das ist Auskunft, kein Mangel. In `maengel` steht ausschliesslich,
   * was **fehlt**, und genau daraus entsteht `vollstaendig`.
   */
  const maengel: string[] = [];
  /*
   * Getrennt gezählt: `maengel` sammelt alles, `dateiMaengel` nur das,
   * was an Dateien fehlt. Nur so lässt sich am Ende sagen, ob der
   * fachliche Teil vollständig ist — eine fehlende PDF-Datei ist kein
   * fehlender Dienstplan.
   */
  const dateiMaengel: string[] = [];
  const tabellen: Record<string, Zeile[]> = {};

  for (const spec of EXPORT_TABELLEN) {
    /*
     * Das Protokoll wird im Standardlauf gar nicht erst gelesen, nicht
     * nur nicht ausgegeben: es ist die mit Abstand grösste Tabelle, und
     * sie zu holen, um sie wegzuwerfen, kostet bei einem gewachsenen
     * Betrieb Dutzende Seitenabrufe und den ganzen Arbeitsspeicher.
     */
    if (spec.name === PROTOKOLL_TABELLE && auftrag.protokoll === "keins") {
      tabellen[spec.name] = [];
      continue;
    }

    tabellen[spec.name] = await leseTabelle(
      supabase,
      spec,
      auftrag.betriebId,
      hinweise,
      maengel,
    );
  }

  /* --- Pseudonymisierung erhalten ------------------------------------ */

  const anonymisierte = new Set(
    (tabellen["mitarbeiter"] ?? [])
      .filter((zeile) => zeile["anonymisiert_am"] !== null && zeile["anonymisiert_am"] !== undefined)
      .map((zeile) => String(zeile["id"])),
  );
  if (anonymisierte.size > 0) {
    hinweise.push(
      `${anonymisierte.size} Anstellung(en) sind pseudonymisiert. Ihre früheren Namen und Kontaktdaten sind auch aus dem Änderungsprotokoll entfernt.`,
    );
  }

  if (auftrag.protokoll === "voll") {
    tabellen[PROTOKOLL_TABELLE] = bereinigeProtokoll(
      (tabellen[PROTOKOLL_TABELLE] ?? []).map(verdichteAenderung),
      anonymisierte,
    );
    hinweise.push(
      "Im Änderungsprotokoll sind Geheimnisse (Hashes, Token, Kennungen des Zahlungsdienstleisters) und der Notfallgrund durch „[entfernt]“ ersetzt.",
    );
    hinweise.push(
      "Bei Einträgen der Aktion „update“ enthalten `alte_werte` und `neue_werte` ausschliesslich die Felder, die sich geändert haben — der Datenbank-Auslöser legt dort jeweils die ganze Zeile ab, auch die unveränderten Felder. Bei „insert“ und „delete“ steht die vollständige Zeile. Ein „update“, bei dem sich kein Feld geändert hat, trägt `ohne_wirkung: true` und bleibt als Schreibvorgang erhalten.",
    );
  } else {
    hinweise.push(
      `Das Änderungsprotokoll (\`${PROTOKOLL_TABELLE}\`) ist in diesem Paket leer. Es ist nicht ausgeschlossen, sondern wird gesondert abgerufen: ${PROTOKOLL_ABRUF}. Grund ist der Umfang — bei einem Betrieb mittlerer Grösse macht es ein Vielfaches aller übrigen Daten aus. Siehe die Anlage „Export- und Wechselinformationen“ der AGB.`,
    );
  }

  /* --- Anonyme Umfragen ---------------------------------------------- */

  const anonymeUmfragen = new Set(
    (tabellen["benachrichtigungen"] ?? [])
      .filter((zeile) => zeile["anonym"] === true)
      .map((zeile) => String(zeile["id"])),
  );

  const stimmenVorher = (tabellen["umfrage_stimmen"] ?? []).length;
  tabellen["umfrage_stimmen"] = (tabellen["umfrage_stimmen"] ?? []).filter(
    (zeile) => !anonymeUmfragen.has(String(zeile["benachrichtigung_id"])),
  );
  const entfernt = stimmenVorher - tabellen["umfrage_stimmen"].length;

  /*
   * Die Datenbank hält Fremdstimmen anonymer Umfragen ohnehin zurück
   * (`us_select`, Audit-Punkt 1) — die **eigene** Stimme lässt sie
   * durch, und genau die käme sonst mit ins Paket. Eine Umfrage, die
   * als anonym angekündigt war, hätte danach einen Teil ihrer
   * Anonymität verloren, ohne dass jemand dafür etwas tun musste.
   */
  if (entfernt > 0) {
    hinweise.push(
      `${entfernt} Einzelstimme(n) anonymer Umfragen wurden entfernt; ihre Ergebnisse stehen ausschliesslich als Auszählung unter „umfrage_ergebnisse_anonym“.`,
    );
  }

  const ergebnisse: ExportPaket["umfrage_ergebnisse_anonym"] = [];
  for (const id of anonymeUmfragen) {
    const { data, error } = await supabase.rpc("umfrage_ergebnis", {
      p_benachrichtigung_id: id,
    });
    if (error) {
      hinweise.push(`FEHLER: Auszählung der anonymen Umfrage ${id} nicht abrufbar (${error.message}).`);
      maengel.push(`umfrage_ergebnisse_anonym: ${id} fehlt`);
      continue;
    }
    ergebnisse.push({
      benachrichtigung_id: id,
      ergebnis: ((data ?? []) as { option_id: string; anzahl: number }[]).map((eintrag) => ({
        option_id: eintrag.option_id,
        anzahl: Number(eintrag.anzahl),
      })),
    });
  }
  if (ergebnisse.length > 0) {
    hinweise.push(
      "Auszählungen anonymer Umfragen können bei sehr kleinen Teams mittelbar Rückschlüsse zulassen (etwa bei nur einer abgegebenen Stimme). Das lässt sich nicht aus dem Export heraus beheben — vor einer Weitergabe abwägen.",
    );
  }

  /* --- Zustimmungen: betrieblich und persönlich getrennt -------------- */

  const { data: zustimmungen, error: zustimmungFehler } = await supabase
    .from("rechtliche_zustimmungen")
    .select("id, dokument, version, art, auth_id, akzeptiert_am, sprache, inhalt_hash")
    .eq("betrieb_id", auftrag.betriebId)
    .order("akzeptiert_am", { ascending: true });

  if (zustimmungFehler) {
    hinweise.push(`FEHLER: Zustimmungsnachweise nicht lesbar (${zustimmungFehler.message}).`);
    maengel.push("rechtliche_zustimmungen: nicht lesbar");
  }

  const alleZustimmungen = (zustimmungen ?? []) as unknown as Zeile[];

  /* --- Referenzwerte ------------------------------------------------- */

  const land = tabellen["betriebe"]?.[0]?.["land"];
  const { data: parameter } = await supabase
    .from("gesetzliche_parameter")
    .select("*")
    .eq("land", typeof land === "string" ? land : "");

  /* --- Dateien ------------------------------------------------------- */

  /*
   * ───────────────────────────────────────────────────────────────────
   *  Anhänge: eingeordnet, nicht abgerufen.
   * ───────────────────────────────────────────────────────────────────
   *
   * Der Export enthält das Verzeichnis der Anhänge, aber keine Datei —
   * und **sagt das**, statt es den Leser aus dem Fehlen erschliessen zu
   * lassen. Solange auch nur ein Anhang verzeichnet ist, gilt das Paket
   * als unvollständig.
   *
   * Das hängt ausdrücklich **nicht** an einer einmaligen Beobachtung
   * („die Buckets waren leer"). Es hängt an den Zeilen, die dieser Lauf
   * tatsächlich vorfindet — legt jemand morgen einen Upload-Weg an,
   * meldet der Export sich von selbst als unvollständig, ohne dass
   * jemand diese Datei anfassen muss.
   */
  const anhaengeRoh = tabellen["nachricht_anhaenge"] ?? [];
  const anhaenge: DateiEintrag[] = anhaengeRoh.map((zeile) => ({
    ...zeile,
    pfad_art: ordnePfadEin(zeile["datei_pfad"]),
    im_betriebsordner: imBetriebsordner(zeile["datei_pfad"], auftrag.betriebId),
    datei_enthalten: false as const,
  }));

  if (anhaenge.length > 0) {
    hinweise.push(
      `${anhaenge.length} Dateianhang/-anhänge sind nur als Verzeichnis enthalten (Pfad, Name, Typ, Grösse) — die Dateien selbst fehlen. Siehe docs/export/README.md, „Offene Integrationslücke: Anhänge“.`,
    );
    dateiMaengel.push(`nachricht_anhaenge: ${anhaenge.length} Datei(en) nicht im Paket`);

    const fremd = anhaenge.filter(
      (a) => a.pfad_art === "speicherpfad" && !a.im_betriebsordner,
    ).length;
    if (fremd > 0) {
      hinweise.push(
        `WARNUNG: ${fremd} Anhangspfad(e) liegen nicht im Ordner dieses Betriebs. Sie werden nicht aufgelöst und dürfen auch später nicht signiert werden.`,
      );
    }

    const absolut = anhaenge.filter((a) => a.pfad_art === "absolute-url").length;
    if (absolut > 0) {
      hinweise.push(
        `WARNUNG: ${absolut} Anhangsverweis(e) sind vollständige Adressen statt Speicherpfade. Sie werden vom Export grundsätzlich nicht abgerufen.`,
      );
    }
  }

  const beschreibungen: Record<string, string> = {};
  for (const spec of EXPORT_TABELLEN) {
    beschreibungen[spec.name] = spec.anmerkung
      ? `${spec.beschreibung} — ${spec.anmerkung}`
      : spec.beschreibung;
  }
  for (const abschnitt of ZUSATZ_ABSCHNITTE) {
    beschreibungen[abschnitt.name] = abschnitt.beschreibung;
  }
  /*
   * Die Beschreibung eines leeren Abschnitts muss sagen, warum er leer
   * ist — sonst liest sie sich wie eine Zusage, die das Paket nicht
   * einlöst („Änderungsprotokoll des Betriebs." über einer leeren Liste).
   */
  if (auftrag.protokoll === "keins") {
    beschreibungen[PROTOKOLL_TABELLE] =
      `Änderungsprotokoll des Betriebs — in diesem Paket leer. Vollständig abrufbar unter ${PROTOKOLL_ABRUF}; siehe \`protokoll\` und \`hinweise\`.`;
  }

  const offeneVerweise = findeOffeneVerweise(tabellen);
  if (offeneVerweise.length > 0) {
    const summe = offeneVerweise.reduce((n, v) => n + v.anzahl, 0);
    hinweise.push(
      `${summe} Verweis(e) zwischen Tabellen zeigen ins Leere — die übliche Folge davon, dass der Export kein Schnappschuss ist. Einzeln aufgeführt unter \`vollstaendigkeit.offene_verweise\`.`,
    );
  }

  const vollstaendigkeit: Vollstaendigkeit = {
    fachlich: maengel.length === 0,
    dateien: dateiMaengel.length === 0,
    zeitlich: "keiner",
    offene_verweise: offeneVerweise,
  };

  const paket: ExportPaket = {
    format: PAKET_FORMAT,
    vollstaendig: maengel.length === 0 && dateiMaengel.length === 0,
    vollstaendigkeit,
    unvollstaendig: [...maengel, ...dateiMaengel],
    meta: {
      betrieb: { id: auftrag.betriebId, name: auftrag.betriebName },
      erzeugtVon: {
        auth_id: auftrag.authId,
        mitarbeiter_id: auftrag.mitarbeiterId,
        rolle_typ: auftrag.rolleTyp,
      },
      begonnen_am: begonnen,
      beendet_am: new Date().toISOString(),
      zeitzone:
        "Alle Zeitstempel sind UTC (ISO 8601, Suffix Z), sofern die Spalte eine Zeitzone trägt. Reine Datumsfelder (z. B. `datum`, `von`, `bis`) sind Kalendertage ohne Zeitzone.",
      konsistenz:
        "KEIN transaktionaler Schnappschuss. Was gilt: innerhalb EINER Tabelle wird per Keyset geblättert (sortiert nach dem Primärschlüssel, Bedingung „alles nach der zuletzt gelesenen Zeile\"); jede Zeile, die während des Lesens dieser einen Tabelle unverändert vorhanden ist, erscheint genau einmal. Was NICHT gilt: (a) das Paket bildet keinen Zeitpunkt ab — Zeilen, die zwischen `begonnen_am` und `beendet_am` entstehen oder verschwinden, können enthalten sein oder fehlen; (b) zwischen zwei Tabellen gibt es keine gemeinsame Transaktion, weshalb Verweise ins Leere zeigen können — sie stehen einzeln unter `vollstaendigkeit.offene_verweise`; (c) `einladungen` wird ohne eindeutige Sortierung gelesen (eine Seite, Überlauf unter `unvollstaendig`). Keyset-Blättern loest also die Nebenlaeufigkeit INNERHALB einer Tabelle und sonst nichts.",
      // Wird unten nachgetragen: die Grösse kennt man erst, wenn das
      // Paket steht.
      groesse_bytes: 0,
      rechtstexte_fassungen: { ...RECHTSTEXT_VERSIONEN },
    },
    beschreibungen,
    ausschluesse: AUSSCHLUESSE,
    hinweise,
    protokoll: {
      umfang: auftrag.protokoll,
      eintraege: (tabellen[PROTOKOLL_TABELLE] ?? []).length,
      vollstaendig_abrufbar_unter: PROTOKOLL_ABRUF,
      hinweis:
        auftrag.protokoll === "voll"
          ? "Dieses Paket enthält das vollständige Änderungsprotokoll. Bei der Aktion „update“ sind nur die geänderten Felder aufgeführt."
          : "Dieses Paket enthält das Änderungsprotokoll nicht — es ist wegen seines Umfangs gesondert abrufbar, unentgeltlich und über dieselbe Anmeldung. Alle übrigen Abschnitte sind vollständig.",
    },
    tabellen,
    umfrage_ergebnisse_anonym: ergebnisse,
    rechtliche_zustimmungen: alleZustimmungen.filter((zeile) => zeile["art"] === "betrieblich"),
    kenntnisnahmen_datenschutz: alleZustimmungen.filter((zeile) => zeile["art"] === "persoenlich"),
    referenz: { gesetzliche_parameter: (parameter ?? []) as unknown as Zeile[] },
    dateien: anhaenge,
  };

  /*
   * Die Grösse wird gemessen, nicht geschätzt — und zwar mit demselben
   * Serialisierer, den der Route Handler benutzt. Liefe hier
   * `JSON.stringify` und dort `serialisierePaket`, stünde im Paket eine
   * Zahl, die für keine existierende Datei gilt. Der zweite Durchlauf
   * kostet bei einem Gastrobetrieb Millisekunden.
   *
   * Warum überhaupt: das Paket entsteht vollständig im Arbeitsspeicher.
   * Die Grenzen der Laufzeitumgebung stehen in `docs/export/README.md`;
   * hier wird nur gemessen und ab einer Schwelle gewarnt, damit ein
   * wachsender Betrieb es merkt, bevor die Antwort abbricht.
   */
  paket.meta.groesse_bytes = Buffer.byteLength(serialisierePaket(paket), "utf8");

  if (paket.meta.groesse_bytes > GROESSE_WARNUNG) {
    const mb = (paket.meta.groesse_bytes / 1_048_576).toFixed(1);
    hinweise.push(
      `WARNUNG: Das Paket ist ${mb} MB gross. Ab dieser Grössenordnung kann die Auslieferung an Grenzen der Laufzeitumgebung stossen — siehe docs/export/README.md, „Grenzen der Laufzeitumgebung".`,
    );
  }

  return paket;
}
