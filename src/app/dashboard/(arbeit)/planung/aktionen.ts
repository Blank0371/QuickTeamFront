"use server";

import { revalidatePath } from "next/cache";
import { betriebsZeitpunkt, istKalendertag } from "@/lib/datum";

import {
  findeUeberschneidung,
  fristNochOffen,
  holeZyklen,
  langesDatum,
} from "@/lib/dashboard/planung";
import { betreteDashboard } from "@/lib/dashboard/zugang";
import type { FormZustand } from "@/lib/formular";

const PFAD = "/dashboard/planung";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

/**
 * Legt einen Planungszeitraum an.
 *
 * Geschrieben wird über `planungszyklus_erstellen(p_betrieb_id, p_start,
 * p_ende, p_deadline)`. Der RPC bestimmt die Solver-Methode selbst
 * (`solver_methode_fuer_betrieb`) und setzt `status = 'offen'`; beides
 * gehört nicht hierher.
 *
 * **Was der RPC nicht tut, steht in `findeUeberschneidung()`.** Kurz:
 * `TESTING.md` behauptet eine Überlappungsprüfung, die es nicht gibt.
 */
export async function zyklusAnlegen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  if (position.rolleTyp !== "chef") {
    return fehler("Nur die Betriebsleitung darf Zeiträume anlegen.");
  }

  const start = String(formData.get("start") ?? "");
  const ende = String(formData.get("ende") ?? "");
  const deadlineRoh = String(formData.get("deadline") ?? "").trim();
  const trotzdem = String(formData.get("trotzdem") ?? "") === "ja";
  const fristEgal = String(formData.get("frist_trotzdem") ?? "") === "ja";

  if (!istKalendertag(start)) return fehler("Der Beginn fehlt oder ist ungültig.", { start: "Datum prüfen." });
  if (!istKalendertag(ende)) return fehler("Das Ende fehlt oder ist ungültig.", { ende: "Datum prüfen." });

  /*
   * Dieselbe Bedingung wie `chk_zeitraum` und der RPC: das Ende muss
   * **nach** dem Start liegen, ein eintägiger Zeitraum ist nicht
   * möglich. Vorher abgefangen, weil die Rohmeldung der Datenbank
   * niemandem hilft.
   */
  if (ende <= start) {
    return fehler("Das Ende muss nach dem Beginn liegen.", {
      ende: "Muss nach dem Beginn liegen.",
    });
  }

  if (deadlineRoh && !istKalendertag(deadlineRoh)) {
    return fehler("Die Frist ist kein gültiges Datum.", { deadline: "Datum prüfen." });
  }

  if (deadlineRoh && deadlineRoh > start) {
    return fehler(
      "Die Frist liegt nach dem Beginn des Zeitraums. Bis dahin müsste der Plan längst stehen.",
      { deadline: "Sollte vor dem Beginn liegen." },
    );
  }

  const zyklen = await holeZyklen(supabase, position.betriebId);
  const kollision = findeUeberschneidung(zyklen, start, ende);

  /*
   * Zwei Warnungen, die unabhängig voneinander auftreten können. Beide
   * verlangen ein eigenes Häkchen, keine verbietet etwas — sonst müsste
   * jemand, der beides bewusst will, den Umweg über die Datenbank gehen.
   */
  const warnungen: string[] = [];
  const felder: Record<string, string> = {};

  if (kollision && !trotzdem) {
    felder["ueberschneidung"] = "ja";
    warnungen.push(
      `Es gibt schon einen Zeitraum von ${langesDatum(kollision.start)} bis ` +
        `${langesDatum(kollision.ende)}. Zwei Pläne für dieselben Tage erzeugen ` +
        `Schichten doppelt.`,
    );
  }

  const frist = fristNochOffen(zyklen.length, start, deadlineRoh);
  if (frist && !fristEgal) {
    felder["frist"] = "ja";
    warnungen.push(
      `Die Frist für Wünsche läuft erst am ${langesDatum(frist.stichtag)} ab. Wer ` +
        `bis dahin noch Verfügbarkeiten oder Schichtvorlieben einträgt, wird in ` +
        `diesem Plan nicht mehr berücksichtigt.`,
    );
  }

  if (warnungen.length > 0) {
    return {
      status: "fehler",
      nachricht: `${warnungen.join(" ")} Setz das Häkchen, wenn du es trotzdem willst.`,
      felder,
      /*
       * Ohne diese Zeile fallen die Datumsfelder auf ihren Vorschlag
       * zurück, während die Warnung darüber noch von den eingegebenen
       * Daten spricht. Wer dann anhakt und abschickt, bestätigt einen
       * Zeitraum und legt einen anderen an — die Warnung wäre nicht nur
       * wirkungslos, sondern irreführend.
       */
      werte: { start, ende, deadline: deadlineRoh },
    };
  }

  /*
   * `p_deadline` ist ein `timestamptz`, das Formularfeld liefert ein
   * Datum. Ohne Uhrzeit läge die Frist auf Mitternacht — also am Beginn
   * des Tages, den jemand als letzten meint. Angehängt wird deshalb das
   * Tagesende in Ortszeit; ohne Zonenangabe deutete Postgres den Wert
   * in seiner eigenen Zone, und die ist UTC.
   */
  const deadline = betriebsZeitpunkt(deadlineRoh || start, Boolean(deadlineRoh));

  const { error } = await supabase.rpc("planungszyklus_erstellen", {
    p_betrieb_id: position.betriebId,
    p_start: start,
    p_ende: ende,
    p_deadline: deadline,
  });

  if (error) {
    console.error(`[planung] zyklusAnlegen: ${error.message}`);
    return fehler("Der Zeitraum liess sich nicht anlegen. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Löscht einen Zeitraum wieder — nur solange nichts daran hängt.
 *
 * `schicht_instanzen.planungszyklus_id` verweist auf die Zeile. Sind
 * bereits Schichten erzeugt, verhindert der Fremdschlüssel das Löschen,
 * und das ist richtig so: verworfen wird ein Vorschlag über
 * `geplante_schichten_verwerfen`, nicht über das Entfernen des Rahmens.
 */
/**
 * Erinnert das ganze Team an die Fristen für Wünsche/Verfügbarkeiten —
 * Spiegel des „Send reminder"-Knopfs im `CreateShiftsModal` von
 * `manager.tsx`. Dieselbe RPC wie in Mitteilungen, mit denselben festen
 * Werten wie die App: `p_typ: "allgemein"`, `p_prioritaet: "dringend"`,
 * Titel und Text wörtlich aus `de.json` übernommen.
 */
export async function erinnerungSenden(
  _vorher: FormZustand,
  _formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  if (position.rolleTyp !== "chef") {
    return fehler("Nur die Betriebsleitung darf erinnern.");
  }

  const { error } = await supabase.rpc("ankuendigung_erstellen", {
    p_betrieb_id: position.betriebId,
    p_typ: "allgemein",
    p_titel: "Bitte Schichtvorlieben eintragen",
    p_text: "Der neue Dienstplan wird geplant. Bitte trage deine Schichtvorlieben vor der Deadline ein.",
    p_prioritaet: "dringend",
  });

  if (error) {
    console.error(`[planung] erinnerungSenden: ${error.message}`);
    return fehler("Erinnerung konnte nicht gesendet werden.");
  }

  return { status: "erfolg", nachricht: "Erinnerung an alle Mitarbeiter gesendet.", felder: {} };
}

export async function zyklusEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  if (position.rolleTyp !== "chef") {
    return fehler("Nur die Betriebsleitung darf Zeiträume entfernen.");
  }

  const zyklusId = String(formData.get("zyklus_id") ?? "");
  if (!zyklusId) return fehler("Es wurde kein Zeitraum angegeben.");

  const { data: geloescht, error } = await supabase
    .from("planungszyklen")
    .delete()
    .eq("betrieb_id", position.betriebId)
    .eq("id", zyklusId)
    .select("id");

  if (error) {
    console.error(`[planung] zyklusEntfernen: ${error.message}`);
    return fehler(
      "An diesem Zeitraum hängen bereits Schichten. Verwirf zuerst den Plan, dann lässt er sich entfernen.",
    );
  }

  if (geloescht.length === 0) {
    return fehler("Diesen Zeitraum gibt es nicht mehr. Lad die Seite neu.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Gibt den Vorschlag frei — für den ganzen Betrieb.
 *
 * `geplante_schichten_veroeffentlichen(p_betrieb_id)` nimmt **keine**
 * Zyklus-ID: sie setzt jede `schicht_instanz` mit `status = 'geplant'`
 * auf `veroeffentlicht` und jeden Zyklus mit `vorschlag_bereit` ebenso.
 * Liegen zwei Vorschläge vor, trifft ein Klick beide. Eingrenzen lässt
 * sich das von hier aus nicht — die Oberfläche sagt es deshalb vorher.
 *
 * Rückgabe ist die Zahl der freigegebenen Schichten.
 */
export async function planVeroeffentlichen(
  _vorher: FormZustand,
  _formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  if (position.rolleTyp !== "chef") {
    return fehler("Nur die Betriebsleitung darf Pläne freigeben.");
  }

  const { data, error } = await supabase.rpc("geplante_schichten_veroeffentlichen", {
    p_betrieb_id: position.betriebId,
  });

  if (error) {
    console.error(`[planung] veroeffentlichen: ${error.message}`);
    return fehler("Der Plan liess sich nicht freigeben. Versuch es noch einmal.");
  }

  const anzahl = typeof data === "number" ? data : 0;
  revalidatePath(PFAD);
  revalidatePath("/dashboard/kalender");

  return {
    status: "erfolg",
    nachricht:
      anzahl === 0
        ? "Es gab nichts freizugeben."
        : `${anzahl} ${anzahl === 1 ? "Schicht ist" : "Schichten sind"} jetzt für dein Team sichtbar.`,
    felder: {},
  };
}

/**
 * Verwirft den Vorschlag — und zwar endgültig.
 *
 * `geplante_schichten_verwerfen(p_betrieb_id)` **löscht** die geplanten
 * Instanzen und dazu die Zyklen mit `vorschlag_bereit`. Nach dem Aufruf
 * ist nicht nur der Vorschlag fort, sondern auch der Zeitraum, in dem er
 * entstanden ist — wer neu planen will, legt ihn wieder an.
 *
 * Auch das gilt betriebsweit und nimmt keine Zyklus-ID.
 */
export async function planVerwerfen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  if (position.rolleTyp !== "chef") {
    return fehler("Nur die Betriebsleitung darf Pläne verwerfen.");
  }

  if (String(formData.get("bestaetigt") ?? "") !== "ja") {
    return fehler("Setz das Häkchen, wenn du den Vorschlag wirklich verwerfen willst.");
  }

  const { data, error } = await supabase.rpc("geplante_schichten_verwerfen", {
    p_betrieb_id: position.betriebId,
  });

  if (error) {
    console.error(`[planung] verwerfen: ${error.message}`);
    return fehler("Der Vorschlag liess sich nicht verwerfen. Versuch es noch einmal.");
  }

  const anzahl = typeof data === "number" ? data : 0;
  revalidatePath(PFAD);
  revalidatePath("/dashboard/kalender");

  return {
    status: "erfolg",
    nachricht: `${anzahl} geplante ${anzahl === 1 ? "Schicht wurde" : "Schichten wurden"} verworfen. Der Zeitraum ist mit entfernt worden.`,
    felder: {},
  };
}
