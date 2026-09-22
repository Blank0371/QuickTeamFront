import type { createClient } from "@/lib/supabase/server";
import {
  istZugangsvoraussetzung,
  RECHTSTEXT_VERSIONEN,
  ZUSTIMMUNG_ART,
  ZUSTIMMUNG_DOKUMENTE,
  type ZustimmungDokument,
} from "@/lib/rechtstexte";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ZustimmungVersionen = Record<ZustimmungDokument, string>;

/** Schlüssel in `user_metadata`, unter dem die Zustimmung mitreist. */
export const ZUSTIMMUNG_METADATEN_SCHLUESSEL = "zustimmung_versionen";

/**
 * Liest die Zustimmung aus `user_metadata` — oder stellt fest, dass keine
 * da ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Zustimmung überhaupt durch die Metadaten reist
 * ─────────────────────────────────────────────────────────────────────
 *
 * Der Haken wird in Abschnitt A gesetzt, der Betrieb entsteht aber erst
 * nach der Code-Bestätigung — dazwischen liegen eine Mail, bis zu 24
 * Stunden und womöglich ein Gerätewechsel. `betrieb_id` gibt es zum
 * Zeitpunkt des Hakens noch nicht, und eine Zustimmungszeile ohne
 * Betrieb wäre kein Nachweis, sondern eine Waise. Die Zustimmung nimmt
 * deshalb denselben Weg wie die vier Betriebsfelder: `options.data` beim
 * `signUp`.
 *
 * **Mitgeführt werden die Fassungen, nicht nur ein Ja.** Ändert sich ein
 * Rechtstext zwischen Abschicken und Bestätigen, hat die Person der
 * alten Fassung zugestimmt — die neue einzutragen wäre eine falsche
 * Angabe in genau dem Datensatz, der sie widerlegen soll.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein fehlender Eintrag ist kein Fehler
 * ─────────────────────────────────────────────────────────────────────
 *
 * Über `auth.admin.createUser()` angelegte Testkonten
 * (`.claude/rules/security.md`) durchlaufen das Formular nie und tragen
 * die Metadaten folglich nicht. Sie bekommen dann auch keine
 * Zustimmungszeile — das ist richtig so und darf die Anlage des Betriebs
 * nicht aufhalten.
 */
export function zustimmungAusMetadaten(
  metadaten: Record<string, unknown> | null | undefined,
): ZustimmungVersionen | null {
  const roh = metadaten?.[ZUSTIMMUNG_METADATEN_SCHLUESSEL];
  if (typeof roh !== "object" || roh === null) return null;

  const versionen: Partial<ZustimmungVersionen> = {};
  for (const dokument of ZUSTIMMUNG_DOKUMENTE) {
    const wert = (roh as Record<string, unknown>)[dokument];
    if (typeof wert !== "string" || wert.trim() === "") return null;
    versionen[dokument] = wert;
  }

  return versionen as ZustimmungVersionen;
}

/** Nachweis wird bei der Registrierung erfasst, nicht erst nach dem E-Mail-Code. */
export const ZUSTIMMUNG_NACHWEIS_SCHLUESSEL = "zustimmung_nachweis";

export function zustimmungNachweisAusMetadaten(
  metadaten: Record<string, unknown> | null | undefined,
): { sprache?: string; hashes?: Partial<Record<ZustimmungDokument, string>> } {
  const roh = metadaten?.[ZUSTIMMUNG_NACHWEIS_SCHLUESSEL];
  if (typeof roh !== "object" || roh === null) return {};
  const nachweis = roh as Record<string, unknown>;
  const hashes: Partial<Record<ZustimmungDokument, string>> = {};
  if (nachweis.hashes && typeof nachweis.hashes === "object") {
    for (const dokument of ZUSTIMMUNG_DOKUMENTE) {
      const hash = (nachweis.hashes as Record<string, unknown>)[dokument];
      if (typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)) hashes[dokument] = hash;
    }
  }
  // Bei älteren Registrierungen bleibt der Nachweis unvollständig. Heutige
  // Sprache/Dateiinhalte nachzutragen würde historische Angaben erfinden.
  return {
    ...(nachweis.sprache === "de" || nachweis.sprache === "en" ? { sprache: nachweis.sprache } : {}),
    hashes,
  };
}

/** Die Fassungen, die beim Abschicken des Formulars gegolten haben. */
export function aktuelleZustimmungVersionen(): ZustimmungVersionen {
  return { ...RECHTSTEXT_VERSIONEN };
}

/**
 * Nur die Datenschutz-Fassung — beim Konto-Signup mitgeführt.
 *
 * Seit dem 2026-09-22 entsteht das Konto **ohne** Betrieb; AGB und AVV
 * (betriebliche Vertragsannahme) folgen erst beim Anlegen des Betriebs.
 * Beim Signup wird deshalb allein die Datenschutz-Kenntnisnahme abgehakt.
 * Sie kann noch nicht geschrieben werden — `rechtliche_zustimmungen`
 * verlangt eine `betrieb_id` —, also reist ihre Fassung in `user_metadata`
 * mit, wie zuvor die drei Fassungen, und wird beim Anlegen des Betriebs
 * eingetragen.
 */
export function datenschutzSignupVersionen(): Pick<ZustimmungVersionen, "datenschutz"> {
  return { datenschutz: RECHTSTEXT_VERSIONEN.datenschutz };
}

/** Die beim Signup zugestimmte Datenschutz-Fassung; `null`, wenn keine mitkam. */
export function datenschutzAusMetadaten(
  metadaten: Record<string, unknown> | null | undefined,
): string | null {
  const roh = metadaten?.[ZUSTIMMUNG_METADATEN_SCHLUESSEL];
  if (typeof roh !== "object" || roh === null) return null;
  const wert = (roh as Record<string, unknown>)["datenschutz"];
  return typeof wert === "string" && wert.trim() !== "" ? wert : null;
}

/**
 * Die drei Fassungen für den Betrieb-Insert: AGB und AVV in ihrer
 * geltenden Fassung (eben im Betriebsformular angenommen), Datenschutz in
 * der Fassung, der beim Konto-Signup zugestimmt wurde — sonst der
 * geltenden. So hält die Beweisspur fest, welchem Datenschutztext die
 * Person tatsächlich zugestimmt hat, auch wenn er sich zwischen Signup und
 * Betrieb-Anlage geändert hat.
 */
export function zustimmungFuerBetrieb(
  metadaten: Record<string, unknown> | null | undefined,
): ZustimmungVersionen {
  return {
    agb: RECHTSTEXT_VERSIONEN.agb,
    avv: RECHTSTEXT_VERSIONEN.avv,
    datenschutz: datenschutzAusMetadaten(metadaten) ?? RECHTSTEXT_VERSIONEN.datenschutz,
  };
}

/**
 * Schreibt die drei Zustimmungszeilen.
 *
 * Ein einziges `insert` mit drei Zeilen, nicht drei Aufrufe: entweder
 * stehen alle drei da oder keine. Drei getrennte Anfragen könnten
 * teilweise durchlaufen, und „hat den AGB zugestimmt, dem AVV
 * vielleicht" ist der schlechteste aller Zustände.
 *
 * `ignoreDuplicates` fängt den zweiten Anlauf ab — ein doppelt
 * eingegebener Code, ein Reload auf der Bestätigungsseite. Einmalig ist
 * die Zeile ohnehin durch den Index
 * `(betrieb_id, auth_id, dokument, version)`; hier wird nur der Fehler
 * vermieden, den er sonst würfe.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Seit dem 2026-09-13 wandern zwei Angaben mit: `sprache` und
 *  `inhalt_hash`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Beide Spalten gab es schon, nur schrieb sie niemand. Ohne sie hält
 * die Zeile fest, *dass* zugestimmt wurde und unter welcher
 * Versionsangabe — aber nicht, welchem Text und in welcher Sprache
 * gelesen. `inhalt_hash` deckt den Fall ab, dass ein Rechtstext
 * geändert und der Wert in `rechtstexte.ts` vergessen wird
 * (`rechtstexte-inhalt.ts` erklärt es im Einzelnen); `sprache` den, dass
 * jemand die englische Übersetzung gelesen hat.
 *
 * Beide sind optional: eine nicht lesbare Datei schreibt die Zeile ohne
 * Hash statt gar nicht. Ein Nachweis mit einer Angabe weniger ist
 * besser als kein Nachweis.
 */
export async function schreibeZustimmungen(
  supabase: SupabaseServerClient,
  betriebId: string,
  authId: string,
  versionen: ZustimmungVersionen,
  nachweis: { sprache?: string; hashes?: Partial<Record<ZustimmungDokument, string>> } = {},
): Promise<{ art: "ok" } | { art: "fehler"; grund: string }> {
  const zeilen = ZUSTIMMUNG_DOKUMENTE.map((dokument) => ({
    betrieb_id: betriebId,
    auth_id: authId,
    dokument,
    version: versionen[dokument],
    sprache: nachweis.sprache ?? null,
    inhalt_hash: nachweis.hashes?.[dokument] ?? null,
  }));

  const { error } = await supabase
    .from("rechtliche_zustimmungen")
    .upsert(zeilen, {
      onConflict: "betrieb_id,auth_id,dokument,version",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(`[zustimmung] ${betriebId}: ${error.message}`);
    return { art: "fehler", grund: error.message };
  }

  return { art: "ok" };
}

/* ------------------------------------------------------------------ */
/* Liegt eine Zustimmung vor — und welche Art von Lücke ist es?         */
/* ------------------------------------------------------------------ */

/**
 * Der Stand je Dokument. Drei Antworten, und die Unterscheidung
 * zwischen den beiden mittleren ist der Kern der Änderung vom
 * 2026-09-13.
 *
 * - `"aktuell"` — zur geltenden Fassung liegt eine Zeile vor.
 * - `"nie"` — zu diesem Dokument liegt **überhaupt keine** Zeile vor.
 *   Das ist die fehlende Erstannahme.
 * - `"veraltet"` — es liegt eine Zeile vor, aber zu einer anderen
 *   Fassung. Das ist eine **angebotene Vertragsänderung**, der noch
 *   nicht zugestimmt wurde.
 */
export type DokumentStand = "aktuell" | "veraltet" | "nie";

export type ZustimmungBefund =
  | { art: "zugestimmt" }
  /**
   * Mindestens ein zustimmungspflichtiges Dokument wurde **nie**
   * angenommen. Erst hier wird gesperrt: ohne AGB und AVV gibt es
   * weder einen Vertrag noch eine Grundlage, Beschäftigtendaten im
   * Auftrag zu verarbeiten.
   */
  | { art: "erstannahme-fehlt"; stand: Record<ZustimmungDokument, DokumentStand> }
  /**
   * Alles Pflichtige war schon einmal angenommen, nur nicht in der
   * geltenden Fassung. **Sperrt nicht** — siehe unten.
   */
  | { art: "aenderung-offen"; stand: Record<ZustimmungDokument, DokumentStand> }
  | { art: "pruefung-fehlgeschlagen" };

/**
 * Ermittelt, wie es um die Zustimmung dieses Betriebs steht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Änderung vom 2026-09-13: eine neue Fassung sperrt nicht mehr
 * ─────────────────────────────────────────────────────────────────────
 *
 * **Vorher** verlangte die Prüfung für alle drei Dokumente eine Zeile in
 * der **aktuellen** Fassung und gab sonst „fehlend" zurück; das Tor in
 * `dashboard/zugang.ts` sperrte daraufhin die gesamte Verwaltung,
 * einschliesslich des Wegs ins Stripe-Kundenportal.
 *
 * Das widersprach dem eigenen Vertrag. § 13 Abs. 2 und 3 der AGB sagen:
 * eine Änderung wird wirksam, **wenn der Kunde ihr zustimmt**; Schweigen
 * gilt nicht als Zustimmung, und *solange er nicht zugestimmt hat, gelten
 * für ihn die bisherigen Bedingungen*. Ein Betrieb, der unter der alten
 * Fassung zahlt, hat also einen laufenden Vertrag — ihn auszusperren,
 * bis er die neue abnickt, ist genau die Drucksituation, die § 13 Abs. 3
 * ausschliesst. Praktisch hätte zudem ein einziger geänderter Wert in
 * `rechtstexte.ts` **alle** zahlenden Bestandskunden gleichzeitig
 * ausgesperrt.
 *
 * **Jetzt** wird unterschieden:
 *
 * | Beobachtung | Folge |
 * | ----------- | ----- |
 * | keine Zeile zu AGB oder AVV | Sperre — ohne Vertrag kein Dienst |
 * | Zeile zu einer älteren Fassung | Hinweis, kein Riegel |
 * | Datenschutzerklärung fehlt | Hinweis, kein Riegel (siehe unten) |
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Betrieblich wird je Betrieb gefragt, persönlich je Person
 * ─────────────────────────────────────────────────────────────────────
 *
 * AGB und AVV sind eine Vertragsannahme **für den Betrieb** (Punkt 11
 * des Audits, generierte Spalte `art`): hat ein Chef sie angenommen,
 * steht der Vertrag, und ein zweiter Chef schliesst ihn nicht noch
 * einmal. Die Datenschutzerklärung ist dagegen eine Kenntnisnahme
 * **durch die Person**. Bis zum 2026-09-13 zählte auch sie je Betrieb —
 * damit galt die Kenntnisnahme des einen Chefs stillschweigend für
 * jeden weiteren, was den Sinn einer persönlichen Angabe aufhebt.
 * Gefragt wird sie jetzt gegen die eigene `auth_id`.
 *
 * Dass sie trotzdem nicht sperrt, ist kein Widerspruch: Art. 13 DSGVO
 * verlangt, dass informiert **wird**, nicht dass jemand zustimmt
 * (`istZugangsvoraussetzung()` in `rechtstexte.ts`).
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Ein Lesefehler ist keine Zustimmung
 * ─────────────────────────────────────────────────────────────────────
 *
 * Unverändert seit dem 2026-09-12 (Punkt 12): ein Abfragefehler ist ein
 * eigener Zustand, weder Zustimmung noch Dauersperre. Das Tor führt auf
 * dieselbe Seite, die dann „Prüfung fehlgeschlagen, bitte erneut
 * versuchen" zeigt.
 */
export async function ermittleZustimmungBefund(
  supabase: SupabaseServerClient,
  betriebId: string,
  authId: string,
): Promise<ZustimmungBefund> {
  const { data, error } = await supabase
    .from("rechtliche_zustimmungen")
    .select("dokument, version, art, auth_id")
    .eq("betrieb_id", betriebId);

  if (error) {
    console.error(`[zustimmung] Prüfung ${betriebId}: ${error.message}`);
    return { art: "pruefung-fehlgeschlagen" };
  }

  const zeilen = data ?? [];

  const stand = {} as Record<ZustimmungDokument, DokumentStand>;
  for (const dokument of ZUSTIMMUNG_DOKUMENTE) {
    /*
     * Eine Zeile zählt nur, wenn sie die **richtige Art** trägt. Die
     * Datenbank stellt das über die generierte Spalte `art` und die
     * getrennten INSERT-Policies bereits sicher — nur ein Chef kann eine
     * betriebliche Zeile anlegen. Dass hier trotzdem ausdrücklich
     * verglichen wird, ist die sichtbare Kopplung an genau diese
     * Trennung: gezählt wird die betriebliche Annahme, nicht irgendeine
     * Zeile mit passendem Dokumentnamen.
     */
    const passend = zeilen.filter(
      (zeile) =>
        zeile.dokument === dokument &&
        zeile.art === ZUSTIMMUNG_ART[dokument] &&
        (ZUSTIMMUNG_ART[dokument] === "betrieblich" || zeile.auth_id === authId),
    );

    if (passend.length === 0) stand[dokument] = "nie";
    else if (passend.some((zeile) => zeile.version === RECHTSTEXT_VERSIONEN[dokument]))
      stand[dokument] = "aktuell";
    else stand[dokument] = "veraltet";
  }

  const sperrend = ZUSTIMMUNG_DOKUMENTE.filter(istZugangsvoraussetzung);

  if (sperrend.some((dokument) => stand[dokument] === "nie")) {
    return { art: "erstannahme-fehlt", stand };
  }
  if (ZUSTIMMUNG_DOKUMENTE.some((dokument) => stand[dokument] !== "aktuell")) {
    return { art: "aenderung-offen", stand };
  }
  return { art: "zugestimmt" };
}

/**
 * Wird der Zugang durch diesen Befund gesperrt?
 *
 * Ausdrücklich eine eigene Funktion und kein `befund.art !==
 * "zugestimmt"` an der Aufrufstelle: die Frage „liegt etwas vor" und die
 * Frage „darf jemand deshalb nicht arbeiten" sind seit dem 2026-09-13
 * verschieden, und ein Vergleich an der Aufrufstelle wäre die
 * Gelegenheit, sie beim nächsten Mal wieder zu verwechseln.
 */
export function sperrtZugang(befund: ZustimmungBefund): boolean {
  return befund.art === "erstannahme-fehlt" || befund.art === "pruefung-fehlgeschlagen";
}

/** Welche Dokumente die Person jetzt bestätigen soll. */
export function offeneDokumente(befund: ZustimmungBefund): ZustimmungDokument[] {
  if (befund.art === "zugestimmt" || befund.art === "pruefung-fehlgeschlagen") return [];
  return ZUSTIMMUNG_DOKUMENTE.filter((dokument) => befund.stand[dokument] !== "aktuell");
}
