import type { createClient } from "@/lib/supabase/server";
import { betriebsZeitpunkt, istKalendertag } from "@/lib/datum";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Planungszeiträume.
 *
 * Ein Zyklus ist der Rahmen, in dem aus den Schichtvorlagen konkrete
 * Schichten entstehen: „für den September brauche ich einen Plan".
 * Erzeugt werden die Schichten erst vom Solver — das ist die
 * Edge Function `plan-generieren` und kommt in einem eigenen Schritt.
 * Hier entsteht nur der Rahmen.
 */

export type ZyklusStatus =
  | "offen"
  | "deadline_erreicht"
  | "solver_laeuft"
  | "vorschlag_bereit"
  | "veroeffentlicht";

/** Am 2026-08-26 aus `planungszyklen_status_check` gelesen. */
export const ZYKLUS_STATUS: readonly ZyklusStatus[] = [
  "offen",
  "deadline_erreicht",
  "solver_laeuft",
  "vorschlag_bereit",
  "veroeffentlicht",
];

export const ZYKLUS_TEXT: Record<ZyklusStatus, string> = {
  offen: "Offen",
  deadline_erreicht: "Frist abgelaufen",
  solver_laeuft: "Wird geplant",
  vorschlag_bereit: "Vorschlag liegt vor",
  veroeffentlicht: "Veröffentlicht",
};

export const ZYKLUS_ERKLAERUNG: Record<ZyklusStatus, string> = {
  offen: "Dein Team kann noch Wünsche und Verfügbarkeiten eintragen.",
  deadline_erreicht: "Die Frist ist vorbei, geplant wurde noch nicht.",
  solver_laeuft: "Die Schichtverteilung wird gerade berechnet.",
  vorschlag_bereit: "Ein Vorschlag steht — noch nicht für das Team sichtbar.",
  veroeffentlicht: "Der Plan ist freigegeben und für alle sichtbar.",
};

export function istZyklusStatus(wert: string): wert is ZyklusStatus {
  return (ZYKLUS_STATUS as readonly string[]).includes(wert);
}

export type Zyklus = {
  id: string;
  start: string;
  ende: string;
  deadline: string;
  status: ZyklusStatus;
  solverMethode: string;
  solverFehler: string | null;
  solverGestartetAm: string | null;
  erstelltAm: string;
};

export async function holeZyklen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Zyklus[]> {
  const { data, error } = await supabase
    .from("planungszyklen")
    .select(
      "id, zeitraum_start, zeitraum_ende, deadline, status, solver_methode, solver_fehler, solver_gestartet_am, erstellt_am",
    )
    .eq("betrieb_id", betriebId)
    .order("zeitraum_start", { ascending: false });

  if (error) {
    console.error(`[planung] zyklen(${betriebId}): ${error.message}`);
    return [];
  }

  return data.map((zeile) => ({
    id: zeile.id,
    start: zeile.zeitraum_start,
    ende: zeile.zeitraum_ende,
    deadline: zeile.deadline,
    status: istZyklusStatus(zeile.status) ? zeile.status : "offen",
    solverMethode: zeile.solver_methode,
    solverFehler: zeile.solver_fehler,
    solverGestartetAm: zeile.solver_gestartet_am,
    erstelltAm: zeile.erstellt_am,
  }));
}

/**
 * Überschneidet sich der neue Zeitraum mit einem bestehenden?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Diese Prüfung muss von hier kommen — die Datenbank macht sie nicht.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `TESTING.md` im App-Repo notiert zu `planungszyklus_erstellen`:
 * „Range must not overlap existing `schicht_instanzen`". Am 2026-08-26
 * im Quelltext nachgesehen — **die Funktion prüft das nicht.** Sie
 * kennt genau zwei Bedingungen: `ist_chef(p_betrieb_id)` und
 * `p_ende > p_start`. Einen UNIQUE- oder EXCLUDE-Constraint auf
 * `planungszyklen` gibt es ebenfalls nicht.
 *
 * Zwei sich überlappende Zyklen sind kein Datenbankfehler, aber ein
 * fachlicher: für denselben Tag entstünden zweimal Schichten aus
 * denselben Vorlagen, und welcher Zyklus dann „der" Plan ist, wäre
 * nicht mehr zu beantworten.
 *
 * Geprüft wird deshalb hier — und als **Warnung mit Bestätigung**, nicht
 * als Verbot: es ist nicht ausgeschlossen, dass jemand bewusst einen
 * kurzen Sonderzeitraum in einen längeren legt. Was nicht passieren
 * soll, ist, dass es aus Versehen geschieht.
 */
export function findeUeberschneidung(
  zyklen: readonly Zyklus[],
  start: string,
  ende: string,
): Zyklus | null {
  /*
   * Datumsvergleich als Zeichenkette: `YYYY-MM-DD` sortiert
   * lexikografisch wie chronologisch, und das erspart die Umrechnung in
   * `Date` samt Zeitzonenfrage. Zwei Zeiträume überlappen, wenn jeder
   * vor dem Ende des anderen beginnt.
   */
  return zyklen.find((zyklus) => start <= zyklus.ende && zyklus.start <= ende) ?? null;
}

/**
 * Wird geplant, bevor das Team seine Wünsche abgeben konnte?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was die App wirklich tut — am 2026-08-30 im Quelltext nachgesehen
 * ─────────────────────────────────────────────────────────────────────
 *
 * **Wo sie warnt:** ausschliesslich beim Anlegen des Zyklus, im
 * `CreateShiftsModal` von `manager.tsx`. Beim Auslösen des Solvers warnt
 * sie **nicht**, und im Bestätigungs-Popup davor steht nur die
 * Überschneidungswarnung (`csDupBody`), nicht die Fristwarnung.
 *
 * **Wie die Schwelle definiert ist:** eine feste Zahl Tage, kein Anteil.
 * `manager.tsx:1490` rechnet
 *
 *     const deadlineDate = hasPrevCycle && von
 *       ? new Date(addDays(von, -7) + "T23:59:59") : null;
 *     const deadlinePassed = now.getTime() > deadlineDate.getTime();
 *
 * — sieben Tage vor Beginn des Zeitraums, Tagesende. Gewarnt wird, wenn
 * die Frist **noch nicht** verstrichen ist; ist sie vorbei, erscheint an
 * derselben Stelle eine Entwarnung in Grün.
 *
 * **Nur ab dem zweiten Zyklus.** Ohne vorherigen Zyklus setzt die App
 * `p_deadline: null` und zeigt weder Warnung noch Entwarnung — beim
 * allerersten Plan konnte niemand Wünsche eintragen, eine Frist dafür
 * wäre sinnlos.
 *
 * **Kein hartes Verbot.** Das Banner steht da, `generate()` prüft nur
 * den Datumsbereich. Daneben sitzt ein Knopf, der über
 * `ankuendigung_erstellen` an alle erinnert.
 *
 * ── Wo wir abweichen, und warum ──────────────────────────────────────
 *
 * Die sieben Tage werden hier **nicht** nachgebaut. In der App ist die
 * Frist abgeleitet und nicht änderbar, deshalb braucht sie eine Zahl aus
 * der Luft; im Dashboard gibt der Chef sie selbst ein. Eine ausgedachte
 * Frist gegen eine eingegebene zu prüfen hiesse, die Eingabe zu
 * ignorieren. Gefragt wird deshalb, ob **die eingetragene** Frist noch
 * läuft — ohne Angabe der Beginn des Zeitraums, denn darauf fällt auch
 * der RPC zurück (`manager.tsx:1510`).
 *
 * **Gemeldet, nicht nachgebaut:** `betriebs_einstellungen` trägt
 * `verfuegbarkeit_deadline_tag` (Vorgabe 5, Eingabe 1–28), und
 * `manager.tsx` bietet dafür ein Feld an — benutzt wird es beim Anlegen
 * eines Zyklus aber nirgends. Die sieben Tage stehen hart im Code. Wer
 * die Einstellung ändert, ändert nichts.
 */
export function fristNochOffen(
  bisherigeZyklen: number,
  start: string,
  deadline: string,
  jetzt: Date = new Date(),
): { stichtag: string } | null {
  // Erster Zyklus überhaupt: es gab noch keine Gelegenheit, Wünsche
  // einzutragen. Dieselbe Bedingung wie `hasPrevCycle` in der App.
  if (bisherigeZyklen === 0) return null;

  const stichtag = deadline || start;
  if (!istKalendertag(stichtag)) return null;

  /*
   * Dieselbe Zonenangabe wie beim Schreiben von `p_deadline`: ohne sie
   * deutete der Server den Wert in seiner eigenen Zone, und die ist auf
   * Vercel UTC — die Frist verschöbe sich um zwei Stunden.
   *
   * Eine eingetragene Frist meint das Ende ihres Tages, der
   * ersatzweise herangezogene Beginn des Zeitraums dagegen dessen
   * Anfang: ab da wird gearbeitet, Wünsche kommen dann zu spät.
   */
  const ablauf = new Date(betriebsZeitpunkt(stichtag, Boolean(deadline)));
  return ablauf.getTime() > jetzt.getTime() ? { stichtag } : null;
}

/** `YYYY-MM-DD` → „1. September 2026". */
export function langesDatum(iso: string): string {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  if (!jahr || !monat || !tag) return iso;
  const namen = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  return `${tag}. ${namen[monat - 1]} ${jahr}`;
}

/**
 * Vorschlag für den nächsten Zeitraum: der Folgemonat.
 *
 * Ein Monat ist der übliche Zuschnitt — `DOCUMENTATION.md` nennt ihn so,
 * und die Testdaten sind ebenso gebaut. Vorbelegt wird der **nächste**,
 * weil der laufende meist schon geplant ist.
 */
export function naechsterMonat(heute: Date): { start: string; ende: string } {
  const ersterNaechster = new Date(heute.getFullYear(), heute.getMonth() + 1, 1);
  const letzterNaechster = new Date(heute.getFullYear(), heute.getMonth() + 2, 0);
  const alsIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { start: alsIso(ersterNaechster), ende: alsIso(letzterNaechster) };
}

/* ------------------------------------------------------------------ */
/* Der Solver-Lauf                                                     */
/* ------------------------------------------------------------------ */

/**
 * Wie lange ein Lauf höchstens dauern darf, bevor die Oberfläche ihn für
 * abgebrochen hält (Minuten).
 *
 * Das ist eine Anzeigefrage, keine Wahrheit: es gibt niemanden, der
 * `solver_laeuft` aufräumt. Bricht der Aufruf ab — geschlossener Tab,
 * verlorene Verbindung —, bleibt der Status stehen, und ohne diese
 * Grenze stünde dort für immer „wird geplant". Nach Ablauf bietet die
 * Seite einen neuen Lauf an, statt Fortschritt zu behaupten.
 */
export const LAUF_GEDULD_MINUTEN = 10;

export function laufWirktHaengend(zyklus: Zyklus, gestartetAm: string | null): boolean {
  if (zyklus.status !== "solver_laeuft") return false;
  if (!gestartetAm) return true;
  const vergangen = Date.now() - new Date(gestartetAm).getTime();
  return vergangen > LAUF_GEDULD_MINUTEN * 60 * 1000;
}

/**
 * Offene Stellen je Zyklus — was der Solver nicht besetzen konnte.
 *
 * `offene_stellen_pro_zyklus(p_betrieb_id)` liefert **nur** Zyklen mit
 * `status = 'vorschlag_bereit'`; für alle anderen gibt es keinen
 * Eintrag. Eine fehlende Zahl heisst deshalb nicht „alles besetzt",
 * sondern „dazu gibt es gerade nichts zu sagen".
 */
export async function holeOffeneStellen(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("offene_stellen_pro_zyklus", {
    p_betrieb_id: betriebId,
  });

  if (error) {
    console.error(`[planung] offene_stellen: ${error.message}`);
    return new Map();
  }

  const zeilen = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const proZyklus = new Map<string, number>();
  for (const zeile of zeilen) {
    const id = String(zeile["planungszyklus_id"] ?? "");
    const offen = Number(zeile["offene_stellen"] ?? 0);
    if (id) proZyklus.set(id, Number.isFinite(offen) ? offen : 0);
  }
  return proZyklus;
}

/**
 * Veröffentlichen und Verwerfen wirken auf den **ganzen Betrieb**, nicht
 * auf einen Zyklus.
 *
 * Am 2026-08-26 im Quelltext nachgesehen:
 * `geplante_schichten_veroeffentlichen(p_betrieb_id)` setzt jede
 * `schicht_instanz` mit `status = 'geplant'` auf `veroeffentlicht` und
 * jeden Zyklus mit `vorschlag_bereit` ebenso. `_verwerfen` **löscht**
 * beides — die Instanzen und die Zyklen.
 *
 * Beides nimmt keine Zyklus-ID entgegen. Liegen zwei Vorschläge vor,
 * trifft ein Klick also beide. Das lässt sich von hier aus nicht
 * eingrenzen, und deshalb muss es dastehen: eine Schaltfläche an einem
 * einzelnen Zyklus, die still auch den Nachbarn verwirft, wäre eine
 * Falle.
 */
export function zaehleVorschlaege(zyklen: readonly Zyklus[]): number {
  return zyklen.filter((zyklus) => zyklus.status === "vorschlag_bereit").length;
}

/* ------------------------------------------------------------------ */
/* Wer ohne Sollstunden in die Planung geht                            */
/* ------------------------------------------------------------------ */

export type OhneSollstunden = {
  id: string;
  name: string;
  /** `eingeladen` wird mitgeplant — deshalb sichtbar gehalten. */
  status: string;
};

/**
 * Aktive und eingeladene Mitarbeitende ohne `soll_stunden`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Der Filter spiegelt den Solver, nicht die Team-Liste.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `plan-generieren/index.ts:185` lädt genau:
 *
 *   status IN ('aktiv','eingeladen')  AND  rolle_typ = 'mitarbeiter'
 *
 * Beides ist verhaltensrelevant und beides überrascht:
 *
 *   · **Eingeladene zählen mit.** Die Function sagt es selbst — „the
 *     chef plans around them before they have finished onboarding". Wer
 *     hier nur `aktiv` prüfte, verschwiege genau die Neuzugänge, bei
 *     denen die Sollstunden am ehesten fehlen.
 *   · **Chefs werden nie eingeplant.** Eine Warnung über die fehlenden
 *     Sollstunden der Betriebsleitung wäre eine Aufforderung, etwas
 *     einzutragen, das nichts bewirkt.
 *
 * Eine Abweichung von diesem Filter würde die Warnung falsch machen —
 * entweder nennt sie Leute, die der Solver gar nicht anfasst, oder sie
 * schweigt über welche, die er anfasst.
 */
export async function holeOhneSollstunden(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<OhneSollstunden[]> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select("id, vorname, nachname, status")
    .eq("betrieb_id", betriebId)
    .eq("rolle_typ", "mitarbeiter")
    .in("status", ["aktiv", "eingeladen"])
    .is("soll_stunden", null)
    .is("anonymisiert_am", null)
    .order("nachname");

  if (error) {
    console.error(`[dashboard/planung] ohneSollstunden: ${error.message}`);
    return [];
  }

  return (data ?? []).map((person) => ({
    id: person.id,
    name: `${person.vorname} ${person.nachname}`.trim(),
    status: person.status,
  }));
}
