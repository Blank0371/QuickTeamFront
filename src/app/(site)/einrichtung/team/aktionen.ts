"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { holeChefBetriebId } from "@/lib/betrieb";
import { feldFehler, type FormZustand } from "@/lib/formular";
import {
  entferneRolle,
  holeEingeladene,
  schonEingeladen,
  schreibeRollen,
  type Rolle,
} from "@/lib/team";
import { createClient } from "@/lib/supabase/server";
import { einladungSchema, rollenNameSchema } from "@/lib/validierung";
import { holeValidierung } from "@/i18n/server";

/**
 * Server Actions von Schritt 3.
 *
 * Geschrieben wird direkt in `rollen`, `mitarbeiter` und
 * `mitarbeiter_rollen` — dafür gibt es keinen RPC, die Policies
 * `rollen_insert_chef`, `mitarbeiter_insert_chef` und
 * `mitarbeiter_rollen_write_chef` hängen alle an `ist_chef(betrieb_id)`.
 * Die Autorisierung macht also RLS; hier steht keine zweite Ebene.
 */

const PFAD = "/einrichtung/team";

async function betriebOderWeiter(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; betriebId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const betriebId = await holeChefBetriebId(supabase);
  if (betriebId === null) redirect("/einrichtung/konto");

  return { supabase, betriebId };
}

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

/* ------------------------------------------------------------------ */
/* Rollen                                                              */
/* ------------------------------------------------------------------ */

/**
 * Liest die gesammelten Rollennamen aus dem Formular.
 *
 * Sie stehen als wiederholtes Feld `entwurf_rollen` darin — die
 * Oberfläche hält sie bis dahin nur im eigenen Zustand. Geprüft wird
 * hier trotzdem gegen dieselbe Zod-Regel wie früher beim Anlegen: was
 * aus einem versteckten Feld kommt, ist eine Eingabe wie jede andere.
 * Unbrauchbare Namen werden übergangen statt den ganzen Schritt zum
 * Scheitern zu bringen — clientseitig sind sie ohnehin schon abgefangen,
 * und ein stehengebliebener Wizard wäre die schlechtere Antwort.
 */
function entwuerfeAus(formData: FormData): string[] {
  return formData
    .getAll("entwurf_rollen")
    .map(String)
    .flatMap((roh) => {
      const geprueft = rollenNameSchema.safeParse(roh);
      return geprueft.success ? [geprueft.data] : [];
    });
}

/**
 * Schreibt die gesammelten Rollen und liefert den Bestand mit IDs.
 *
 * Gemeinsame Vorstufe von „Einladen" und „Weiter zu den Schichten" —
 * den beiden Stellen, an denen aus einem Entwurf eine Zeile werden muss.
 * Die Begründung steht an `schreibeRollen()` in `src/lib/team.ts`.
 */
async function rollenSicherstellen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  betriebId: string,
  formData: FormData,
): Promise<Rolle[] | null> {
  return schreibeRollen(supabase, betriebId, entwuerfeAus(formData));
}

/**
 * Entfernt eine Rolle — hart, nicht über `aktiv = false`.
 *
 * Das weicht bewusst von `manager.tsx` ab, und zwar wegen
 * `UNIQUE (betrieb_id, name)`: der Constraint kennt `aktiv` nicht. Eine
 * weich gelöschte „Küche" blockiert also den Namen für immer, und der
 * naheliegendste Handgriff im Wizard — anlegen, vertippt, weg damit, neu
 * anlegen — liefe in eine Fehlermeldung über einen Datensatz, den man gar
 * nicht mehr sieht.
 *
 * Die App löscht weich, weil ihre Rollen an vergangenen Zuweisungen
 * hängen. Im Wizard gibt es diese Vergangenheit noch nicht. Sollte doch
 * schon etwas daran hängen, verhindert der FK das Löschen — dann bleibt
 * die Meldung sichtbar, statt still weich zu löschen.
 *
 * **Stand 2026-08-24: das harte Löschen kommt nicht durch.** `rollen`
 * hat keine DELETE-Policy, also filtert RLS die Zeile aus dem DELETE
 * heraus — ohne Fehler, mit null betroffenen Zeilen. Die Absicht oben
 * bleibt richtig und beschreibt, was passieren soll, sobald die Policy
 * existiert; bis dahin sagt die Funktion den Fehlschlag an, statt ihn
 * als Erfolg auszugeben. Beheben lässt es sich nur ausserhalb dieses
 * Repos — hier werden keine Policies geändert.
 */
export async function rolleEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await betriebOderWeiter();
  const rolleId = String(formData.get("rolle_id") ?? "");
  if (!rolleId) return fehler("Es wurde keine Rolle angegeben.");

  const ergebnis = await entferneRolle(supabase, betriebId, rolleId);

  if (ergebnis.art === "belegt") {
    return fehler(
      "Diese Rolle wird bereits von einer Schichtvorlage gebraucht. Entfern sie zuerst dort.",
    );
  }

  if (ergebnis.art === "gesperrt") {
    return fehler(
      "Rollen lassen sich derzeit nicht entfernen — die Datenbank lässt das Löschen " +
        "noch nicht zu. Das ist gemeldet. Deine Rollenzuweisungen sind unverändert.",
    );
  }

  if (ergebnis.art === "fehler") {
    return fehler("Die Rolle liess sich nicht entfernen. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/* ------------------------------------------------------------------ */
/* Mitarbeiter                                                         */
/* ------------------------------------------------------------------ */

export async function mitarbeiterEinladen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await betriebOderWeiter();

  /*
   * Die gesammelten Rollen werden hier fällig, noch bevor die Person
   * angelegt wird: `mitarbeiter_rollen` braucht eine `rolle_id`, und ein
   * Entwurf hat keine. Bis zu diesem Klick liessen sie sich frei wieder
   * entfernen — genau das ist der Sinn der Sammlung.
   */
  const rollen = await rollenSicherstellen(supabase, betriebId, formData);
  if (rollen === null) {
    return fehler(
      "Die Rollen liessen sich nicht anlegen — deshalb wurde auch niemand eingeladen. Versuch es noch einmal.",
    );
  }

  const roh = {
    vorname: String(formData.get("vorname") ?? ""),
    nachname: String(formData.get("nachname") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefon: String(formData.get("telefon") ?? ""),
  };

  const geprueft = einladungSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: roh,
    };
  }

  const daten = geprueft.data;

  const bestand = await holeEingeladene(supabase, betriebId);
  const doppelt = schonEingeladen(
    bestand,
    daten.vorname,
    daten.nachname,
    daten.email,
    daten.telefon,
  );
  if (doppelt) {
    return {
      status: "fehler",
      nachricht: `${doppelt.vorname} ${doppelt.nachname} ist mit genau diesen Angaben schon eingeladen. Für eine zweite Person unter derselben Adresse trag einen anderen Namen ein.`,
      felder: {},
      werte: roh,
    };
  }

  /*
   * `status` und `rolle_typ` haben passende Spalten-Defaults
   * (`eingeladen` / `mitarbeiter`) — sie stehen hier trotzdem
   * ausgeschrieben. Der Wert `eingeladen` ist die Voraussetzung dafür,
   * dass `meine_einladungen()` die Zeile überhaupt findet; auf `aktiv`
   * hebt sie erst `einladung_annehmen()` aus der App. Das ist zu wichtig,
   * um es einem Default zu überlassen, den jemand später ändern könnte.
   */
  const { data: angelegt, error } = await supabase
    .from("mitarbeiter")
    .insert({
      betrieb_id: betriebId,
      vorname: daten.vorname,
      nachname: daten.nachname,
      email: daten.email,
      telefon: daten.telefon,
      rolle_typ: "mitarbeiter",
      status: "eingeladen",
    })
    .select("id")
    .single();

  if (error || !angelegt) {
    console.error(`[team] mitarbeiterEinladen: ${error?.message ?? "keine Zeile"}`);
    return {
      status: "fehler",
      nachricht: "Die Einladung liess sich nicht anlegen. Versuch es noch einmal.",
      felder: {},
      werte: roh,
    };
  }

  /*
   * Angehakte Rollen gleich mitschreiben. Die Chips tragen den **Namen**
   * und nicht mehr die ID: zum Zeitpunkt des Anhakens kann die Rolle
   * noch ein Entwurf ohne ID sein. Aufgelöst wird gegen den Bestand, den
   * `rollenSicherstellen()` oben gerade zurückgegeben hat — dort ist
   * jeder Entwurf bereits eine Zeile.
   */
  const nachName = new Map(rollen.map((rolle) => [rolle.name.toLowerCase(), rolle.id]));
  const rollenIds = formData
    .getAll("rollen")
    .map(String)
    .flatMap((name) => {
      const id = nachName.get(name.toLowerCase());
      return id ? [id] : [];
    });
  if (rollenIds.length > 0) {
    const { error: zuweisungFehler } = await supabase.from("mitarbeiter_rollen").insert(
      rollenIds.map((rolleId) => ({
        betrieb_id: betriebId,
        mitarbeiter_id: angelegt.id,
        rolle_id: rolleId,
      })),
    );
    if (zuweisungFehler) {
      console.error(`[team] mitarbeiterEinladen/rollen: ${zuweisungFehler.message}`);
      return {
        status: "fehler",
        nachricht:
          "Die Person ist angelegt, aber die Rollen konnten nicht zugewiesen werden. Setz sie unten in der Liste.",
        felder: {},
      };
    }
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Entfernt eine Einladung wieder.
 *
 * `trg_mitarbeiter_spaltenschutz` ist BEFORE UPDATE und greift bei
 * Inserts nicht — nachträglich korrigieren lässt sich eine Zeile hier
 * also nicht sinnvoll. Der Wizard bietet deshalb „löschen und neu
 * anlegen" statt Bearbeiten an.
 *
 * Erst die Rollen, dann die Person: der Rollen-FK ist ON DELETE RESTRICT,
 * der Mitarbeiter-FK hat gar keine Regel.
 */
export async function mitarbeiterEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await betriebOderWeiter();
  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  if (!mitarbeiterId) return fehler("Es wurde niemand angegeben.");

  const { error: rollenFehler } = await supabase
    .from("mitarbeiter_rollen")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("mitarbeiter_id", mitarbeiterId);

  if (rollenFehler) {
    console.error(`[team] mitarbeiterEntfernen/rollen: ${rollenFehler.message}`);
    return fehler("Die Einladung liess sich nicht entfernen. Versuch es noch einmal.");
  }

  const { error } = await supabase
    .from("mitarbeiter")
    .delete()
    .eq("betrieb_id", betriebId)
    .eq("id", mitarbeiterId)
    .neq("rolle_typ", "chef");

  if (error) {
    console.error(`[team] mitarbeiterEntfernen: ${error.message}`);
    return fehler("Die Einladung liess sich nicht entfernen. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/** Hakt eine Rolle bei einer Person an oder ab. */
export async function rolleUmschalten(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await betriebOderWeiter();

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  const rolleId = String(formData.get("rolle_id") ?? "");
  const anhaken = formData.get("an") === "1";

  if (!mitarbeiterId || !rolleId) return fehler("Angaben unvollständig.");

  const { error } = anhaken
    ? await supabase
        .from("mitarbeiter_rollen")
        .insert({ betrieb_id: betriebId, mitarbeiter_id: mitarbeiterId, rolle_id: rolleId })
    : await supabase
        .from("mitarbeiter_rollen")
        .delete()
        .eq("betrieb_id", betriebId)
        .eq("mitarbeiter_id", mitarbeiterId)
        .eq("rolle_id", rolleId);

  if (error) {
    console.error(`[team] rolleUmschalten: ${error.message}`);
    return fehler("Die Rolle liess sich nicht ändern. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Weiter zu Schritt 4 — und der eigentliche Abschluss von Schritt 3.
 *
 * Hier werden die gesammelten Rollen geschrieben. Das ist der Punkt, an
 * dem sie gebraucht werden: `schicht_vorlage_mindestbesetzung` in
 * Schritt 4 hängt an einer `rolle_id`, und ohne mindestens eine Rolle
 * bliebe jede Vorlage in der App unsichtbar.
 *
 * Schlägt das Schreiben fehl, wird **nicht** weitergeleitet — sonst
 * stünde man in Schritt 4 vor einer Vorlagenmaske ohne Rollen und
 * verstünde nicht, warum. Die Ableitung schickt einen von dort ohnehin
 * wieder hierher zurück, nur ohne Erklärung.
 */
export async function weiterZuSchichten(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId } = await betriebOderWeiter();

  const rollen = await rollenSicherstellen(supabase, betriebId, formData);
  if (rollen === null) {
    return fehler("Die Rollen liessen sich nicht anlegen. Versuch es noch einmal.");
  }

  if (rollen.length === 0) {
    return fehler("Leg zuerst mindestens eine Rolle an.");
  }

  revalidatePath(PFAD);
  redirect("/einrichtung/schichten");
}
