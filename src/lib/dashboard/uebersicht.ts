import type { createClient } from "@/lib/supabase/server";

import {
  MONATSNAMEN,
  WOCHENTAGE,
  WOCHENTAGE_LANG,
  alsDatum,
  type KalenderSchicht,
} from "@/lib/dashboard/kalender";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Die Startansicht: heute und die nächsten beiden Tage.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum drei Tage und nicht ein Monat.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis hierher stand der volle Monatskalender auf `/dashboard`. Der zeigt
 * je Tag eine Zelle mit Uhrzeit und Bezeichnung — wer tatsächlich
 * arbeitet, war erst nach einem Klick zu sehen. Für die Frage, die
 * morgens gestellt wird („wer hat heute Spätdienst?"), ist das zu grob:
 * 42 Zellen, in denen die eigentliche Auskunft fehlt.
 *
 * Drei Tage passen dagegen mit Namen und Uhrzeiten auf einen Bildschirm.
 * Der Monat ist damit nicht fort, sondern liegt unter
 * `/dashboard/kalender` — er hat nur seinen Platz als Startseite
 * verloren.
 *
 * Warum genau drei: heute, morgen, übermorgen sind die Tage, für die
 * eine Vertretung noch zu organisieren ist. Ab dem vierten wird aus der
 * Auskunft eine Planung, und dafür gibt es den Kalender.
 */
export const TAGE_IM_BLICK = 3;

/** Ein Tag der Startansicht, fertig zum Rendern. */
export type Tagesblock = {
  /** `YYYY-MM-DD`. */
  datum: string;
  /** „Heute" | „Morgen" | „Montag". */
  titel: string;
  /** „Sa, 29. August" — steht neben dem Titel, damit „Heute" datierbar bleibt. */
  untertitel: string;
  istHeute: boolean;
  schichten: KalenderSchicht[];
};

/**
 * Das Fenster als Datumsgrenzen und als Tagesliste.
 *
 * `new Date(j, m, tag + i)` normalisiert Monats- und Jahresüberläufe
 * selbst — dieselbe Begründung wie in `baueRaster`. Eine eigene
 * Rechnung über Millisekunden (`+ i * 86400000`) wäre hier falsch: an
 * den Umstellungstagen der Sommerzeit hat ein Tag 23 oder 25 Stunden,
 * und die Liste spränge einen Tag.
 */
export function baueFenster(heute: Date): { von: string; bis: string; tage: string[] } {
  const tage: string[] = [];
  let von = "";
  let bis = "";

  for (let i = 0; i < TAGE_IM_BLICK; i++) {
    const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + i);
    const datum = alsDatum(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (i === 0) von = datum;
    bis = datum;
    tage.push(datum);
  }

  /*
   * `von` und `bis` entstehen in der Schleife statt als `tage[0]` und
   * `tage.at(-1)`. Mit `noUncheckedIndexedAccess` sind Zugriffe auf ein
   * Array `string | undefined`, und die drei Fälle, die daraus folgen,
   * wären hier alle unerreichbar — TAGE_IM_BLICK ist eine Konstante
   * grösser null. Eine Behauptung mit `!` wollte ich dafür nicht
   * schreiben; so ist gar nichts zu behaupten.
   */
  return { von, bis, tage };
}

/** „Sa, 29. August" aus `YYYY-MM-DD`. */
function untertitel(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  return `${WOCHENTAGE[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MONATSNAMEN[d.getMonth()]}`;
}

/**
 * Aus dem Fenster und den geladenen Schichten die Tagesblöcke bauen.
 *
 * Ein Tag ohne Schichten fällt **nicht** heraus. „Morgen hat niemand
 * Dienst" ist eine Auskunft; ein fehlender Kasten wäre keine, sondern
 * sähe aus wie ein Ladefehler.
 */
export function baueTage(
  tage: readonly string[],
  proTag: Map<string, KalenderSchicht[]>,
): Tagesblock[] {
  return tage.map((datum, i) => ({
    datum,
    titel: i === 0 ? "Heute" : i === 1 ? "Morgen" : wochentagName(datum),
    untertitel: untertitel(datum),
    istHeute: i === 0,
    schichten: proTag.get(datum) ?? [],
  }));
}

/**
 * Ausgeschriebener Wochentag, montagsbasiert wie überall sonst.
 *
 * Der Rückfallwert kann nicht eintreten — `% 7` landet immer in 0..6,
 * und `WOCHENTAGE_LANG` hat sieben Einträge. Er steht da, weil
 * `noUncheckedIndexedAccess` das nicht wissen kann, und er ist ein
 * leerer String und keine Ausweichbeschriftung: eine Überschrift, die
 * fehlt, fällt auf: eine, die „Unbekannt" sagt, wird geglaubt.
 */
function wochentagName(datum: string): string {
  const i = (new Date(`${datum}T12:00:00`).getDay() + 6) % 7;
  return WOCHENTAGE_LANG[i] ?? "";
}

/* ------------------------------------------------------------------ */
/* Rollen                                                              */
/* ------------------------------------------------------------------ */

/**
 * Der Filterwert für Zuweisungen ohne Rolle.
 *
 * `kalender_schichten` holt `role_name` über einen **LEFT JOIN** auf
 * `rollen` — am 2026-08-29 im Quelltext nachgesehen. Eine Zuweisung ohne
 * `rolle_id` liefert also `null`, und das ist kein Fehlerfall: die
 * Spalte `schicht_zuweisungen.rolle_id` ist nullable, und der Solver
 * setzt sie nicht in jedem Fall. Diese Personen brauchen einen eigenen
 * Eimer, sonst wären sie unter jedem Filter unsichtbar.
 *
 * Der Wert beginnt mit einem Zeichen, das in `rollen.name` nicht
 * vorkommen darf — der CHECK verlangt `length(trim(name)) > 0`, ein
 * Name aus einem einzelnen Bindestrich wäre allerdings zulässig.
 * Deshalb zwei: eine Rolle namens „--ohne--" ist keine, die jemand
 * versehentlich anlegt.
 */
export const OHNE_ROLLE = "--ohne--";

export type RollenEimer = {
  /** Der Wert für `?rolle=` — der Rollenname selbst, siehe unten. */
  wert: string;
  /** Was auf dem Knopf steht. */
  name: string;
  /** Wie viele Zuteilungen im Fenster auf diese Rolle entfallen. */
  anzahl: number;
};

/**
 * Welche Rollen im Fenster überhaupt Dienst haben.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Liste kommt aus den Schichten, nicht aus `rollen`.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ein Filter, der Rollen anbietet, die in diesen drei Tagen niemand
 * hat, führt auf leere Ansichten — und für einen Betrieb mit acht
 * Rollen wären das meistens sechs tote Knöpfe. Gefragt ist „wer ist im
 * Dienst", und die Antwort steht in den Zuweisungen.
 *
 * **Der Wert in der Adresse ist der Rollenname selbst**, nicht ein
 * daraus abgeleiteter Slug. `rollen` trägt `UNIQUE (betrieb_id, name)`
 * ohne jede Normalisierung: „Küche" und „Kueche" sind zwei erlaubte,
 * verschiedene Rollen, und jeder vernünftige Slug führte beide auf
 * `kueche` zusammen. Ein Filter, der zwei Rollen vermengt, ist schlimmer
 * als eine unschöne Adresse.
 *
 * Gezählt werden Zuteilungen, nicht Köpfe: wer an einem Tag zwei
 * Schichten hat, steht zweimal im Dienst, und genau das soll die Zahl
 * neben dem Rollennamen sagen. Abgemeldete (`attendet = false`) zählen
 * nicht mit — sie stehen zwar noch in der Schicht, arbeiten aber nicht.
 */
export function sammleRollen(schichten: readonly KalenderSchicht[]): RollenEimer[] {
  const gezaehlt = new Map<string, { name: string; anzahl: number }>();

  for (const schicht of schichten) {
    for (const person of schicht.participants) {
      if (person.attendet === false) continue;

      const name = person.role_name?.trim();
      const wert = name ? name : OHNE_ROLLE;
      const beschriftung = name ? name : "Ohne Rolle";

      const eintrag = gezaehlt.get(wert);
      if (eintrag) eintrag.anzahl += 1;
      else gezaehlt.set(wert, { name: beschriftung, anzahl: 1 });
    }
  }

  /*
   * Alphabetisch, nicht nach Häufigkeit. Eine Leiste, die ihre
   * Reihenfolge ändert, sobald jemand krank wird, lässt sich nicht
   * blind bedienen — und blind bedient wird sie, wer sie täglich
   * benutzt. `localeCompare` mit `de`, damit Umlaute einsortiert werden
   * und nicht hinten anstehen.
   */
  return [...gezaehlt.entries()]
    .map(([wert, { name, anzahl }]) => ({ wert, name, anzahl }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/**
 * Den Rollenparameter gegen die tatsächlich vorhandenen Rollen prüfen.
 *
 * Ein unbekannter Wert fällt still auf „alle" zurück, wie `leseMonat`
 * auf den laufenden Monat. Eine Fehlerseite für einen falsch getippten
 * Filter wäre unverhältnismässig, und ein leeres Ergebnis ohne
 * Erklärung irreführend.
 */
export function leseRolle(
  param: string | undefined,
  eimer: readonly RollenEimer[],
): string | null {
  if (!param) return null;
  return eimer.some((e) => e.wert === param) ? param : null;
}

/**
 * Auf eine Rolle einschränken.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Der Filter reduziert **beides**: die Schichten und die Namen darin.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das ist eine Entscheidung, keine technische Notwendigkeit, und die
 * Gegenposition ist vertretbar: man könnte auch nur die Schichten
 * filtern und jede davon weiter mit voller Besetzung zeigen. Dann bliebe
 * sichtbar, wer mit wem zusammen arbeitet.
 *
 * Dagegen spricht, was der Knopf verspricht. Wer „Küche" wählt, fragt
 * nicht „in welchen Schichten ist die Küche dabei", sondern „wer aus der
 * Küche arbeitet wann". Bliebe der Service danebenstehen, wäre der
 * Filter eine Hervorhebung, die sich als Filter ausgibt — und bei einer
 * Schicht mit zwölf Namen findet man die zwei gesuchten trotzdem nicht.
 *
 * Die volle Besetzung ist einen Klick entfernt: „Alle" daneben, und
 * jede Schichtkachel führt auf `/dashboard/schicht/[id]`.
 *
 * `understaffed` bleibt unangetastet. Der Wert kommt aus der Datenbank
 * und bezieht sich auf die ganze Schicht; ihn hier auf die gefilterte
 * Rolle umzurechnen ginge gar nicht — `kalender_schichten` liefert die
 * Mindestbesetzung je Rolle nicht mit, nur das Gesamturteil.
 */
export function filtereNachRolle(
  schichten: readonly KalenderSchicht[],
  rolle: string | null,
): KalenderSchicht[] {
  if (rolle === null) return [...schichten];

  const passt = (person: KalenderSchicht["participants"][number]) => {
    const name = person.role_name?.trim();
    return rolle === OHNE_ROLLE ? !name : name === rolle;
  };

  return schichten
    .map((schicht) => ({
      ...schicht,
      participants: schicht.participants.filter(passt),
    }))
    .filter((schicht) => schicht.participants.length > 0);
}

/** Zuteilungen im Fenster, Abgemeldete nicht mitgezählt. */
export function zaehleImDienst(schichten: readonly KalenderSchicht[]): number {
  let summe = 0;
  for (const schicht of schichten) {
    for (const person of schicht.participants) {
      if (person.attendet !== false) summe += 1;
    }
  }
  return summe;
}

/* ------------------------------------------------------------------ */
/* Besetzung: wie viele werden gebraucht, wie viele sind da            */
/* ------------------------------------------------------------------ */

/**
 * Mindestbesetzung je Schicht und Rolle.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das hier gelesen wird und nicht aus einem RPC kommt.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Datenbank kennt die Zahl an zwei Stellen: `kalender_schichten`
 * rechnet sie aus, gibt aber nur das Gesamturteil `understaffed` als
 * Wahrheitswert heraus — welche Rolle fehlt und wie viele, steht dort
 * nicht. `schicht_ansehen` liefert die Aufschlüsselung als `bedarf`,
 * aber **je Schicht einzeln**; für drei Tage mit bis zu vier Schichten
 * täglich wären das ein Dutzend Aufrufe für eine Übersichtsseite.
 *
 * Am 2026-08-29 nachgesehen: einen RPC, der die Aufschlüsselung für
 * einen Zeitraum liefert, gibt es nicht. Gelesen wird deshalb direkt —
 * und das ist hier zulässig, anders als bei den Namen: beide Tabellen
 * tragen eine SELECT-Policy auf `betrieb_id in (select meine_betriebe())`,
 * also für jedes Mitglied des Betriebs. Es wird keine Policy umgangen
 * und keine zweite Autorisierungsebene eingezogen.
 *
 * **Die Regel, welche Zeile gilt, ist aus der Datenbank übernommen**, aus
 * dem `union all` in `schicht_ansehen`: eine Zeile in
 * `schicht_instanz_mindestbesetzung` schlägt die Vorlagenzeile derselben
 * Rolle, fehlt sie, gilt die Vorlage. Ausgeblendete Rollen
 * (`aktiv = false`) zählen nicht mit — auch das steht dort so.
 *
 * **Gezeigt wird das Ergebnis trotzdem nur Chefs.** Lesen dürften es
 * alle, aber beide RPCs entscheiden sich ausdrücklich dagegen
 * (`understaffed` und `bedarf` sind für Nicht-Chefs `false` bzw. `null`).
 * Wer beide Oberflächen benutzt, soll nicht in der einen eine
 * Unterbesetzung sehen, die die andere ihm verschweigt.
 */
export type Bedarf = Map<string, Map<string, number>>;

export async function holeBedarf(
  supabase: SupabaseServerClient,
  betriebId: string,
  von: string,
  bis: string,
): Promise<Bedarf> {
  /*
   * Erste Welle: die Instanzen des Fensters samt ihrer Vorlage, und
   * parallel dazu der Vorlagenbedarf des ganzen Betriebs. Der ist klein
   * — Vorlagen mal Rollen — und lässt sich nicht sinnvoll auf das
   * Fenster einschränken, weil die Zuordnung erst über die Instanzen
   * entsteht.
   */
  const [instanzen, vorlagenBedarf] = await Promise.all([
    supabase
      .from("schicht_instanzen")
      .select("id, schicht_vorlage_id")
      .eq("betrieb_id", betriebId)
      .gte("datum", von)
      .lte("datum", bis),
    supabase
      .from("schicht_vorlage_mindestbesetzung")
      .select("schicht_vorlage_id, rolle_id, mindestanzahl")
      .eq("betrieb_id", betriebId),
  ]);

  if (instanzen.error) {
    console.error(`[uebersicht] instanzen(${betriebId}): ${instanzen.error.message}`);
    return new Map();
  }
  if (vorlagenBedarf.error) {
    console.error(`[uebersicht] svm(${betriebId}): ${vorlagenBedarf.error.message}`);
  }

  const zeilen = instanzen.data ?? [];
  const ids = zeilen.map((z) => z.id);
  if (ids.length === 0) return new Map();

  /*
   * Zweite Welle: die Ausnahmen. `schicht_instanz_mindestbesetzung` ist
   * im Normalfall leer — sie füllt sich nur, wenn jemand für eine
   * einzelne Schicht vom Vorlagenbedarf abweicht. Gefragt wird trotzdem,
   * denn genau diese Ausnahme wäre der Fall, in dem eine falsche Zahl am
   * meisten schadet.
   */
  const instanzBedarf = await supabase
    .from("schicht_instanz_mindestbesetzung")
    .select("schicht_instanz_id, rolle_id, mindestanzahl")
    .in("schicht_instanz_id", ids);

  if (instanzBedarf.error) {
    console.error(`[uebersicht] sim(${betriebId}): ${instanzBedarf.error.message}`);
  }

  const proVorlage = new Map<string, Map<string, number>>();
  for (const zeile of vorlagenBedarf.data ?? []) {
    const eintrag = proVorlage.get(zeile.schicht_vorlage_id) ?? new Map<string, number>();
    eintrag.set(zeile.rolle_id, zeile.mindestanzahl ?? 0);
    proVorlage.set(zeile.schicht_vorlage_id, eintrag);
  }

  const proInstanz = new Map<string, Map<string, number>>();
  for (const zeile of instanzBedarf.data ?? []) {
    const eintrag = proInstanz.get(zeile.schicht_instanz_id) ?? new Map<string, number>();
    eintrag.set(zeile.rolle_id, zeile.mindestanzahl ?? 0);
    proInstanz.set(zeile.schicht_instanz_id, eintrag);
  }

  const bedarf: Bedarf = new Map();
  for (const zeile of zeilen) {
    /*
     * Erst die Vorlage, dann die Ausnahme darüber — die Reihenfolge ist
     * die Regel: `set` überschreibt, und die Instanzzeile soll gewinnen.
     * Andersherum geschrieben wäre der Ausdruck derselbe und das
     * Ergebnis das Gegenteil.
     */
    const zusammen = new Map<string, number>(
      zeile.schicht_vorlage_id ? (proVorlage.get(zeile.schicht_vorlage_id) ?? []) : [],
    );
    for (const [rolle, anzahl] of proInstanz.get(zeile.id) ?? []) {
      zusammen.set(rolle, anzahl);
    }

    if (zusammen.size > 0) bedarf.set(zeile.id, zusammen);
  }

  return bedarf;
}

/** Eine Rolle im Tagesüberblick: gebraucht, tatsächlich da. */
export type Besetzungsstand = {
  name: string;
  /** Summe der Mindestbesetzung über alle Schichten des Tages. */
  benoetigt: number;
  /** Zugeteilte, die nicht abgemeldet sind. */
  besetzt: number;
};

/**
 * Der Besetzungsstreifen eines Tages.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Summiert über den Tag, nicht über die Schicht.
 * ─────────────────────────────────────────────────────────────────────
 *
 * „Küche 2/3" heisst hier: an diesem Tag verlangen alle Schichten
 * zusammen drei Küchen-Besetzungen, zwei davon sind vergeben. Es heisst
 * **nicht**, dass eine bestimmte Schicht unterbesetzt ist — welche das
 * ist, steht an der Schicht selbst, und die Detailseite rechnet je
 * Schicht.
 *
 * Der Streifen kann deshalb „3/3" zeigen, während abends niemand da ist
 * und morgens einer zu viel. Das ist die bekannte Schwäche jeder
 * Tagessumme, und sie ist der Preis für eine Zeile statt einer Tabelle.
 * Aufgefangen wird sie dadurch, dass die Warnung an der Schicht stehen
 * bleibt, wo sie hingehört: `understaffed` kommt je Instanz aus
 * `kalender_schichten` und wird nicht aus dieser Summe abgeleitet.
 *
 * Rollen ohne hinterlegten Bedarf, auf denen trotzdem jemand steht,
 * kommen mit `benoetigt = 0` vor. Sie zu verschweigen hiesse, Arbeit
 * unsichtbar zu machen, nur weil niemand sie vorher verlangt hat.
 */
export function fasseBesetzung(
  schichten: readonly KalenderSchicht[],
  bedarf: Bedarf,
  rollenNamen: ReadonlyMap<string, string>,
): Besetzungsstand[] {
  const stand = new Map<string, Besetzungsstand>();

  const hole = (name: string): Besetzungsstand => {
    const vorhanden = stand.get(name);
    if (vorhanden) return vorhanden;
    const neu = { name, benoetigt: 0, besetzt: 0 };
    stand.set(name, neu);
    return neu;
  };

  for (const schicht of schichten) {
    for (const [rolleId, anzahl] of bedarf.get(schicht.id) ?? []) {
      /*
       * Eine Rolle, die nicht in der Namensliste steht, ist ausgeblendet
       * (`aktiv = false`) — `holeRollen` filtert danach, und
       * `schicht_ansehen` tut dasselbe mit `join rollen on … and
       * r.aktiv`. Ihr Bedarf zählt nicht mehr mit.
       */
      const name = rollenNamen.get(rolleId);
      if (name) hole(name).benoetigt += anzahl;
    }

    for (const person of schicht.participants) {
      if (person.attendet === false) continue;
      const name = person.role_name?.trim();
      hole(name ? name : "Ohne Rolle").besetzt += 1;
    }
  }

  return [...stand.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Eine Rolle mit den Personen, die sie in dieser Schicht ausfüllen. */
export type RollenGruppe = {
  rolle: string;
  personen: KalenderSchicht["participants"];
};

/**
 * Die Besetzung einer Schicht nach Rollen gruppiert.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum gruppiert und nicht als eine Reihe Namen.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis hierher standen die Namen als flache Liste mit angehängter Rolle
 * hinter jedem („Anna Berger · Küche, Tim Roth · Service"). Das liest
 * sich bei zwei Personen noch, bei sieben nicht mehr: die Rolle ist die
 * Frage („ist die Küche besetzt?"), der Name die Antwort, und in der
 * flachen Liste steht die Frage hinter jeder einzelnen Antwort statt
 * einmal davor.
 *
 * Die Vorlage in `docs/Kalender Vorlage.png` ordnet aus demselben Grund
 * nach Rollen — dort als Zeilenblöcke über die ganze Woche. Übernommen
 * ist die Gliederung, nicht das Format: eine Wochenmatrix ist der
 * Zuschnitt des Kalenders, nicht der einer Drei-Tage-Übersicht.
 *
 * Abgemeldete bleiben in ihrer Gruppe stehen und werden durchgestrichen.
 * Sie zählen für die Mindestbesetzung nicht mehr — das rechnet
 * `kalender_schichten` bereits so —, aber aus der Schicht verschwinden
 * sie nicht: wer heute früh abgesagt hat, ist die wichtigste Nachricht
 * des Tages und nicht die unsichtbarste.
 */
export function gruppiereNachRolle(
  participants: KalenderSchicht["participants"],
): RollenGruppe[] {
  const gruppen = new Map<string, KalenderSchicht["participants"]>();

  for (const person of participants) {
    const name = person.role_name?.trim();
    const rolle = name ? name : "Ohne Rolle";
    const vorhanden = gruppen.get(rolle);
    if (vorhanden) vorhanden.push(person);
    else gruppen.set(rolle, [person]);
  }

  return [...gruppen.entries()]
    .map(([rolle, personen]) => ({ rolle, personen }))
    .sort((a, b) => a.rolle.localeCompare(b.rolle, "de"));
}
