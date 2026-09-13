"use server";

import { revalidatePath } from "next/cache";

import {
  darfStatusAendern,
  holeTeam,
  istStatus,
  SETZBARE_STATUS,
  speichereAnstellung,
} from "@/lib/dashboard/team";
import { betreteDashboard } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { entferneMitglied, entferneRolle, holeEingeladene, schonEingeladen } from "@/lib/team";
import { holeValidierung } from "@/i18n/server";
import type { Textblock } from "@/i18n/text";
import {
  anstellungSchema,
  einladungSchema,
  monatsstundenAusWoche,
  rollenNameSchema,
} from "@/lib/validierung";

/**
 * Server Actions der laufenden Team-Verwaltung.
 *
 * Geschrieben wird direkt in `rollen`, `mitarbeiter` und
 * `mitarbeiter_rollen` — dieselben Policies wie im Wizard, alle an
 * `ist_chef(betrieb_id)`. Die Autorisierung macht RLS; hier steht keine
 * zweite Ebene.
 *
 * **Jede Aktion prüft zusätzlich, dass sie von einem Chef kommt.** Das
 * ist keine zweite Autorisierungsebene, sondern eine Anzeigefrage: für
 * Angestellte gibt es diesen Bereich gar nicht, und ein untergeschobenes
 * Formular soll eine verständliche Absage bekommen statt eines rohen
 * RLS-Fehlers. Verlassen wird sich weiterhin auf die Policy.
 */

const PFAD = "/dashboard/team";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder };
}

const NUR_CHEF = "Nur die Betriebsleitung darf das Team verwalten.";

async function alsChef() {
  const { supabase, position } = await betreteDashboard();
  return {
    supabase,
    betriebId: position.betriebId,
    chef: position.rolleTyp === "chef",
    eigeneId: position.mitarbeiterId,
  };
}

/* ------------------------------------------------------------------ */
/* Rollen                                                              */
/* ------------------------------------------------------------------ */

export async function rolleAnlegen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const geprueft = rollenNameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!geprueft.success) {
    const meldung = geprueft.error.issues[0]?.message ?? "Der Rollenname passt nicht.";
    return fehler(meldung, { name: meldung });
  }

  const name = geprueft.data;

  /*
   * Vorher nachsehen, obwohl `UNIQUE (betrieb_id, name)` den Fall
   * ohnehin abfängt — die Rohmeldung von Postgres ist für niemanden
   * lesbar. Anders als im Wizard wird hier über **alle** Rollen
   * geprüft, auch die ausgeblendeten: der Constraint kennt `aktiv`
   * nicht, und eine von der App weich gelöschte „Küche" blockiert ihren
   * Namen weiter. Ohne diese Prüfung käme eine Fehlermeldung über einen
   * Datensatz, den man in einer Liste aktiver Rollen gar nicht sieht.
   */
  const { data: vorhanden } = await supabase
    .from("rollen")
    .select("id, name, aktiv")
    .eq("betrieb_id", betriebId);

  const kollision = (vorhanden ?? []).find(
    (rolle) => rolle.name.toLowerCase() === name.toLowerCase(),
  );

  if (kollision) {
    return fehler(
      kollision.aktiv
        ? `Die Rolle „${name}" gibt es schon.`
        : `Den Namen „${name}" trägt eine ausgeblendete Rolle. Blend sie wieder ein, statt eine zweite anzulegen.`,
      { name: "Diesen Namen gibt es schon." },
    );
  }

  const { error } = await supabase
    .from("rollen")
    .insert({ betrieb_id: betriebId, name, aktiv: true });

  if (error) {
    console.error(`[dashboard/team] rolleAnlegen: ${error.message}`);
    return fehler("Die Rolle liess sich nicht anlegen. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

export async function rolleEntfernen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const rolleId = String(formData.get("rolle_id") ?? "");
  if (!rolleId) return fehler("Es wurde keine Rolle angegeben.");

  const ergebnis = await entferneRolle(supabase, betriebId, rolleId);

  if (ergebnis.art === "belegt") {
    return fehler(
      "Diese Rolle hängt noch an einer Schichtvorlage oder an geplanten Schichten. " +
        "Entfern sie zuerst dort.",
    );
  }

  if (ergebnis.art === "gesperrt") {
    /*
     * `werte` trägt hier den Wert des abgeschickten Feldes `rolle_id`
     * zurück — genau das, wofür `werte` da ist. Die Oberfläche braucht
     * ihn, um das Ergebnis überhaupt anzeigen zu können: alle
     * Rollenzeilen teilen sich **eine** `useActionState`-Instanz, der
     * Zustand allein sagt also nicht, welcher Knopf ihn ausgelöst hat.
     */
    return {
      status: "fehler",
      nachricht:
        "Rollen lassen sich derzeit nicht entfernen — die Datenbank lässt das Löschen " +
        "noch nicht zu. Das ist gemeldet. Deine Rollenzuweisungen sind unverändert.",
      felder: {},
      werte: { rolle_id: rolleId },
    };
  }

  if (ergebnis.art === "fehler") {
    return fehler("Die Rolle liess sich nicht entfernen. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Blendet eine Rolle ein oder aus — der weiche Weg, den die App geht.
 *
 * `manager.tsx` setzt `rollen.aktiv = false`, weil dort Rollen an
 * vergangenen Zuweisungen hängen und ein hartes Löschen Geschichte
 * zerstören würde. Im Dashboard steht beides nebeneinander: ausblenden
 * für Rollen, die es einmal gab, hartes Entfernen für einen Vertipper
 * von vorhin. Solange die DELETE-Policy fehlt, ist Ausblenden ohnehin
 * der einzige Weg, der ankommt.
 */
export async function rolleUmblenden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const rolleId = String(formData.get("rolle_id") ?? "");
  const zielRoh = String(formData.get("aktiv") ?? "");
  if (!rolleId) return fehler("Es wurde keine Rolle angegeben.");

  const ziel = zielRoh === "true";

  const { data: geaendert, error } = await supabase
    .from("rollen")
    .update({ aktiv: ziel })
    .eq("betrieb_id", betriebId)
    .eq("id", rolleId)
    .select("id");

  if (error) {
    console.error(`[dashboard/team] rolleUmblenden: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  if (geaendert.length === 0) {
    return fehler("Diese Rolle gibt es nicht mehr. Lad die Seite neu.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/* ------------------------------------------------------------------ */
/* Anstellungsdaten                                                    */
/* ------------------------------------------------------------------ */

/**
 * Liest die fünf Anstellungsfelder aus einem Formular.
 *
 * Gemeinsam für das Einladen und das Profil, damit beide Wege dieselbe
 * Umrechnung und dieselben Grenzen benutzen. Die Sollstunden kommen als
 * **Wochen**wert herein und werden hier auf den Monatswert gebracht —
 * die Spalte trägt Monatsstunden (`index.tsx:74` in der App, und der
 * Bestand bestätigt es).
 *
 * `max_stunden_hart` fehlt bewusst; siehe `anstellungSchema`.
 *
 * `texte` kommt als Argument herein, statt dass die Funktion es sich
 * selbst holt: sie hat sonst nichts Asynchrones zu tun, und ein `await`
 * allein für eine Fehlermeldung machte aus beiden Aufrufstellen eine
 * Kette, die es nicht braucht.
 */
function anstellungAus(formData: FormData, texte: Textblock):
  | { ok: true; daten: ReturnType<typeof anstellungSchema.parse> }
  | { ok: false; felder: Record<string, string> } {
  const geprueft = anstellungSchema.safeParse({
    vertrag_typ: String(formData.get("vertrag_typ") ?? ""),
    soll_stunden: monatsstundenAusWoche(String(formData.get("wochenstunden") ?? "")),
    toleranz_ueberstunden: String(formData.get("toleranz_ueberstunden") ?? ""),
    ueberstunden_saldo: String(formData.get("ueberstunden_saldo") ?? ""),
    urlaubsanspruch_tage: String(formData.get("urlaubsanspruch_tage") ?? ""),
  });

  if (!geprueft.success) return { ok: false, felder: feldFehler(geprueft.error, texte) };
  return { ok: true, daten: geprueft.data };
}

/**
 * Speichert die Anstellungsdaten einer bestehenden Person — alle fünf
 * Felder auf einen Knopf, wie die Betriebseinstellungen.
 *
 * Einzeln zu speichern wäre hier schlechter als dort, wo es ohnehin
 * Umschalter sind: Vertragsart, Stunden und Urlaubsanspruch ändert man
 * typischerweise zusammen, wenn ein neuer Vertrag gilt. Fünf einzelne
 * Schreibvorgänge wären fünf Gelegenheiten, auf halbem Weg
 * steckenzubleiben.
 */
export async function anstellungSpeichern(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  if (!mitarbeiterId) return fehler("Es wurde niemand angegeben.");

  const gelesen = anstellungAus(formData, await holeValidierung());
  if (!gelesen.ok) {
    return {
      status: "fehler",
      nachricht: Object.values(gelesen.felder)[0] ?? "Die Eingaben stimmen so nicht.",
      felder: gelesen.felder,
      /*
       * Die ID reist zurück, damit die Oberfläche weiss, **welche** der
       * aufgeklappten Personen die Meldung betrifft — alle Zeilen teilen
       * sich eine `useActionState`-Instanz. Dasselbe Muster wie bei
       * `rolleEntfernen()` oben.
       */
      werte: { mitarbeiter_id: mitarbeiterId },
    };
  }

  const ergebnis = await speichereAnstellung(
    supabase,
    betriebId,
    mitarbeiterId,
    gelesen.daten,
  );

  if (!ergebnis.ok) {
    return {
      status: "fehler",
      nachricht:
        ergebnis.grund === "rls"
          ? "Gespeichert wurde nichts — entweder gibt es diese Person nicht mehr, oder die Berechtigung fehlt inzwischen. Lad die Seite neu."
          : "Die Anstellungsdaten liessen sich nicht speichern. Versuch es noch einmal.",
      felder: {},
      werte: { mitarbeiter_id: mitarbeiterId },
    };
  }

  revalidatePath(PFAD);
  return {
    status: "erfolg",
    nachricht: "Gespeichert.",
    felder: {},
    werte: { mitarbeiter_id: mitarbeiterId },
  };
}

/* ------------------------------------------------------------------ */
/* Mitarbeiter                                                         */
/* ------------------------------------------------------------------ */

export async function mitarbeiterEinladen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

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

  /*
   * Die Anstellungsdaten werden **vor** dem Insert geprüft, nicht
   * danach: sonst stünde die Person schon in der Tabelle, während das
   * Formular eine Fehlermeldung zeigt — und der zweite Anlauf liefe in
   * die Doppelprüfung von `schonEingeladen()`. Alle fünf Felder sind
   * optional; leer bedeutet den Spalten-Default.
   */
  const anstellung = anstellungAus(formData, await holeValidierung());
  if (!anstellung.ok) {
    return {
      status: "fehler",
      nachricht: null,
      felder: anstellung.felder,
      werte: roh,
    };
  }

  /*
   * `mitarbeiter.email` hat keinen UNIQUE-Constraint — die Idempotenz
   * muss von hier kommen. Geprüft wird seit dem 2026-09-07 Name **und**
   * Kontakt: eine Adresse darf mehrere Anstellungen tragen, auch im
   * selben Betrieb, und der Kontakt allein hat genau das verboten. Die
   * ganze Begründung an `schonEingeladen()` in `src/lib/team.ts`.
   */
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
      nachricht: `${doppelt.vorname} ${doppelt.nachname} ist mit genau diesen Angaben schon im Team. Für eine zweite Person unter derselben Adresse trag einen anderen Namen ein.`,
      felder: {},
      werte: roh,
    };
  }

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
      ...anstellung.daten,
    })
    .select("id")
    .single();

  if (error || !angelegt) {
    console.error(`[dashboard/team] einladen: ${error?.message ?? "keine Zeile"}`);
    return {
      status: "fehler",
      nachricht: "Die Einladung liess sich nicht anlegen. Versuch es noch einmal.",
      felder: {},
      werte: roh,
    };
  }

  const rollenIds = formData.getAll("rollen").map(String).filter(Boolean);
  if (rollenIds.length > 0) {
    const { error: zuweisungFehler } = await supabase.from("mitarbeiter_rollen").insert(
      rollenIds.map((rolleId) => ({
        betrieb_id: betriebId,
        mitarbeiter_id: angelegt.id,
        rolle_id: rolleId,
      })),
    );
    if (zuweisungFehler) {
      console.error(`[dashboard/team] einladen/rollen: ${zuweisungFehler.message}`);
      return fehler(
        "Die Person ist angelegt, aber die Rollen konnten nicht zugewiesen werden. Setz sie in der Liste.",
      );
    }
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/** Hakt eine Rolle bei einer Person an oder ab. */
export async function rolleUmschalten(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  const rolleId = String(formData.get("rolle_id") ?? "");
  const anhaken = String(formData.get("anhaken") ?? "") === "true";

  if (!mitarbeiterId || !rolleId) return fehler("Angabe fehlt.");

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
    console.error(`[dashboard/team] rolleUmschalten: ${error.message}`);
    /*
     * Beim Abhaken ist der wahrscheinlichste Fehler kein technischer:
     * `schicht_zuweisungen` verweist auf die Rolle, mit der jemand
     * eingeteilt wurde. Die Rolle wegzunehmen, während eine Schicht
     * daran hängt, verhindert der Constraint.
     */
    return fehler(
      anhaken
        ? "Die Rolle liess sich nicht zuweisen. Versuch es noch einmal."
        : "Die Rolle liess sich nicht entfernen — vermutlich ist die Person damit schon zu einer Schicht eingeteilt.",
    );
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/* ------------------------------------------------------------------ */
/* Status und Ausscheiden                                              */
/* ------------------------------------------------------------------ */

/**
 * Setzt `mitarbeiter.status`.
 *
 * Direkt per UPDATE und ohne RPC: `schuetze_mitarbeiter_spalten` lässt
 * einen Chef jede Spalte ändern (`if ist_chef(new.betrieb_id) then
 * return new`), und `mitarbeiter_update_chef` deckt den Zugriff ab.
 *
 * Chef-Zeilen bleiben aussen vor — siehe `darfStatusAendern()`. Der
 * Trigger, der den letzten aktiven Chef schützen sollte, ist nicht
 * angehängt; diese Prüfung ist die einzige, die es gibt.
 */
export async function statusSetzen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  const ziel = String(formData.get("status") ?? "");

  if (!mitarbeiterId) return fehler("Es wurde niemand angegeben.");
  if (!istStatus(ziel) || !SETZBARE_STATUS.includes(ziel)) {
    return fehler("Dieser Status lässt sich nicht setzen.");
  }

  const team = await holeTeam(supabase, betriebId);
  const person = team.find((mitglied) => mitglied.id === mitarbeiterId);

  if (!person) return fehler("Diese Person gehört nicht zu deinem Betrieb.");

  if (!darfStatusAendern(person)) {
    return fehler(
      "Der Status der Betriebsleitung lässt sich hier nicht ändern. Sonst könnte ein " +
        "Betrieb ohne aktive Leitung zurückbleiben — und damit für alle verschlossen sein.",
    );
  }

  const { data: geaendert, error } = await supabase
    .from("mitarbeiter")
    .update({ status: ziel })
    .eq("betrieb_id", betriebId)
    .eq("id", mitarbeiterId)
    .select("id");

  if (error) {
    console.error(`[dashboard/team] statusSetzen: ${error.message}`);
    return fehler("Der Status liess sich nicht ändern. Versuch es noch einmal.");
  }

  if (geaendert.length === 0) {
    return fehler("Diese Person gibt es nicht mehr. Lad die Seite neu.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * Entfernt jemanden ganz — nur solange die Einladung offen ist.
 *
 * Wer die Einladung schon angenommen hat, hinterlässt Spuren:
 * Zuweisungen, Urlaube, Nachrichten. Für die gibt es
 * `mitarbeiter_anonymisieren`, nicht das Löschen.
 */
export async function einladungZuruecknehmen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  if (!mitarbeiterId) return fehler("Es wurde niemand angegeben.");

  const team = await holeTeam(supabase, betriebId);
  const person = team.find((mitglied) => mitglied.id === mitarbeiterId);

  if (!person) return fehler("Diese Person gehört nicht zu deinem Betrieb.");
  if (person.status !== "eingeladen") {
    return fehler(
      "Diese Person ist bereits im Team. Setz sie auf inaktiv oder anonymisiere sie.",
    );
  }

  const ok = await entferneMitglied(supabase, betriebId, mitarbeiterId);
  if (!ok) return fehler("Die Einladung liess sich nicht zurücknehmen.");

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}

/**
 * DSGVO-Weg: Name überschreiben, Kontaktdaten und Anmeldung lösen.
 *
 * `mitarbeiter_anonymisieren(p_mitarbeiter_id)` setzt `vorname =
 * 'Geloescht'`, `nachname` auf die ersten acht Zeichen der ID, löscht
 * `email` und `auth_id`, setzt `status = 'inaktiv'` und
 * `anonymisiert_am`. Die Zeile bleibt, damit vergangene Dienstpläne
 * nicht auseinanderfallen — was verschwindet, ist die Person dahinter.
 *
 * Unumkehrbar: nach dem Aufruf gibt es keine Angabe mehr, aus der sich
 * der Name wiederherstellen liesse. Die Oberfläche verlangt deshalb
 * eine ausdrückliche Bestätigung.
 */
export async function anonymisieren(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, betriebId, chef, eigeneId } = await alsChef();
  if (!chef) return fehler(NUR_CHEF);

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  const bestaetigt = String(formData.get("bestaetigt") ?? "") === "ja";

  if (!mitarbeiterId) return fehler("Es wurde niemand angegeben.");
  if (!bestaetigt) return fehler("Setz das Häkchen, wenn du das wirklich willst.");

  if (mitarbeiterId === eigeneId) {
    return fehler("Dich selbst kannst du hier nicht anonymisieren.");
  }

  const team = await holeTeam(supabase, betriebId);
  const person = team.find((mitglied) => mitglied.id === mitarbeiterId);

  if (!person) return fehler("Diese Person gehört nicht zu deinem Betrieb.");

  /*
   * Auch hier bleibt die Leitung aussen vor: die Funktion setzt
   * `status = 'inaktiv'` und `auth_id = null`, und beim letzten aktiven
   * Chef hiesse das dasselbe wie ein deaktivierter Betrieb — mit dem
   * Unterschied, dass es sich nicht rückgängig machen lässt.
   */
  if (person.rolleTyp === "chef") {
    return fehler(
      "Mitglieder der Betriebsleitung lassen sich hier nicht anonymisieren.",
    );
  }

  const { error } = await supabase.rpc("mitarbeiter_anonymisieren", {
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard/team] anonymisieren: ${error.message}`);
    return fehler("Das hat nicht geklappt. Versuch es noch einmal.");
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
