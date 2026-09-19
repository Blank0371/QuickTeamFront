import { redirect } from "next/navigation";

import { aboGekuendigt, holeAbo, testphaseAbgelaufen } from "@/lib/abo";
import { holeChefBetriebId } from "@/lib/betrieb";
import { holeEinladungen } from "@/lib/dashboard/position";
import { zustimmungAdresse } from "@/lib/dashboard/pfad";
import { aboLageBeiStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { ermittleZustimmungBefund, sperrtZugang } from "@/lib/zustimmung";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Der Einrichtungs-Stepper: wo steht dieser Betrieb, und wohin darf er.
 *
 * Die Reihenfolge der Prüfungen ist die Tabelle aus CLAUDE.md, Abschnitt
 * „Wiedereinstieg wird abgeleitet, nicht gespeichert". Sie ist kein Stil,
 * sondern Vorgabe — wer sie umsortiert, ändert das Verhalten: die Sperre
 * bei abgelaufener Testphase steht bewusst *vor* den Wizard-Prüfungen,
 * sonst käme jemand mit vollständigem Wizard daran vorbei.
 *
 * Es gibt kein Flag und keine Fortschrittsspalte. Jeder Schritt erkennt
 * sich an dem, was er hinterlassen hat.
 */

export const SCHRITTE = ["konto", "zahlung", "team", "schichten"] as const;
export type Schritt = (typeof SCHRITTE)[number];

/** Alles, was der Stepper anzeigen oder entscheiden muss. */
export type Stand = {
  /** Der erste Schritt, der noch nicht erledigt ist. */
  offen: Schritt | "fertig";
  /** Testphase abgelaufen, ohne dass je ein Zahlungsmittel kam. */
  gesperrt: boolean;
  /** `null`, solange Schritt 1 nicht durch ist. */
  betriebId: string | null;
};

export const SCHRITT_TITEL: Record<Schritt, string> = {
  konto: "Konto",
  zahlung: "Zahlung",
  team: "Team",
  schichten: "Schichten",
};

/** Position im Ablauf. `fertig` liegt hinter allen Schritten. */
export function schrittIndex(schritt: Schritt | "fertig"): number {
  return schritt === "fertig" ? SCHRITTE.length : SCHRITTE.indexOf(schritt);
}

/**
 * Ermittelt den Stand einmal pro Seitenaufruf.
 *
 * Die Prüfungen sind absichtlich nacheinander und nicht parallel: jede
 * spätere setzt voraus, dass die frühere gehalten hat. Ohne `betriebId`
 * gibt es nichts zu fragen, und ohne Abo braucht niemand nach Rollen zu
 * suchen. Der Normalfall — jemand mitten in der Einrichtung — kostet damit
 * genau die Abfragen, die seine Position auch wirklich belegen.
 */
export async function ermittleStand(): Promise<Stand | "nicht-angemeldet"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "nicht-angemeldet";

  return ermittleStandFuer(supabase, user.email ?? "");
}

/**
 * Der eigentliche Ablauf, ohne Request-Kontext.
 *
 * Getrennt von `ermittleStand`, damit derselbe Code auch ausserhalb einer
 * Server-Komponente laufen kann — die Ableitung ist die Stelle, an der
 * eine falsche Reihenfolge oder ein falscher Spaltenname am teuersten
 * wäre, und sie soll prüfbar bleiben, ohne dass jemand sie nachbaut.
 */
export async function ermittleStandFuer(
  supabase: SupabaseServerClient,
  email: string,
): Promise<Stand> {
  // Schritt 1: erst mit angelegtem Betrieb ist das Konto fertig.
  const betriebId = await holeChefBetriebId(supabase);
  if (betriebId === null) {
    if ((await holeEinladungen(supabase)).length > 0) redirect("/dashboard/wechseln");
    return { offen: "konto", gesperrt: false, betriebId: null };
  }

  /*
   * Schritt 2: gibt es ein Abo?
   *
   * Zuerst unsere eigene Zeile — die ist billig und im Normalfall
   * gefüllt. Steht dort nichts, wird Stripe gefragt, denn der Webhook
   * darf ein paar Sekunden brauchen: wer gerade eben bezahlt hat und
   * sofort weiterklickt, soll nicht in den Zahlungsschritt zurückfallen.
   *
   * Umgekehrt gilt: eine gefüllte Subscription-ID heisst nur „es gibt
   * ein Abo", nicht „es wurde bezahlt". Wer überspringt, hat auch eins.
   *
   * **`gekuendigt` zählt hier wie „kein Abo".** Die Subscription-ID
   * bleibt bei einer Kündigung stehen — sie zeigt ja weiter auf ein
   * echtes Objekt bei Stripe. Ohne die zweite Bedingung fiele ein
   * gekündigter Betrieb also durch diese Prüfung hindurch, träfe danach
   * auf `testphaseAbgelaufen()` (das nur `pausiert` kennt) und landete
   * am Ende auf dem Abschluss-Screen: voller Zugang ohne laufendes Abo.
   *
   * Mit ihr wird Stripe gefragt. `canceled` und `incomplete_expired`
   * zählen dort nicht als Abo, und der Weg führt zurück in den
   * Zahlungsschritt, wo sich ein neues abschliessen lässt. Die Abfrage
   * bleibt trotzdem nötig statt eines direkten `return`: wer nach der
   * Kündigung neu abgeschlossen hat, hat dort ein lebendes Abo, während
   * unsere Zeile noch auf den Webhook wartet.
   *
   * **`pausiert` fragt ebenfalls nach**, seit dem 2026-09-14: wer gerade
   * auf der Sperrseite bezahlt hat, ist bei Stripe schon `active`, und die
   * Zeile hinkt hinterher. Die Sperre steht dabei vor allem Weiteren,
   * siehe oben.
   *
   * Ein neues Abo, dessen erste Rechnung noch offen ist (`unbezahlt` —
   * ein Neuabschluss nach Kündigung hat keine Testphase mehr), hält den
   * Betrieb im Zahlungsschritt. Antwortet Stripe gar nicht, gilt die
   * Richtung, in die unsere Zeile zeigt: gesperrt bleibt gesperrt, und
   * alles andere geht in den Zahlungsschritt statt durch. Die Lagen im
   * Einzelnen stehen bei `aboLageBeiStripe`.
   */
  const abo = await holeAbo(supabase, betriebId);

  if (!abo?.stripe_subscription_id || aboGekuendigt(abo) || testphaseAbgelaufen(abo)) {
    const lage = await aboLageBeiStripe({
      betriebId,
      email,
      kundeId: abo?.stripe_customer_id ?? null,
    });
    if (lage === "pausiert" || (lage === "unbekannt" && testphaseAbgelaufen(abo))) {
      return { offen: "zahlung", gesperrt: true, betriebId };
    }
    if (lage !== "laeuft") {
      return { offen: "zahlung", gesperrt: false, betriebId };
    }
  }

  // Schritt 3: mindestens eine Rolle.
  const { data: rolle, error: rollenFehler } = await supabase
    .from("rollen")
    .select("id")
    .eq("betrieb_id", betriebId)
    .limit(1)
    .maybeSingle();

  if (rollenFehler) {
    console.error(`[einrichtung] rollen(${betriebId}): ${rollenFehler.message}`);
  }
  if (!rolle) {
    return { offen: "team", gesperrt: false, betriebId };
  }

  /*
   * Schritt 4: mindestens eine Vorlage mit Mindestbesetzung.
   *
   * Gefragt wird `schicht_vorlage_mindestbesetzung` und nicht
   * `schicht_vorlagen`. Das ist kein Umweg: eine Vorlage ohne
   * Mindestbesetzungs-Zeile ist in der App unsichtbar, weil
   * `scheduling.tsx` nur Vorlagen behält, für die eine Rolle hinterlegt
   * ist. Sie zu zählen hiesse, einen Schritt für erledigt zu erklären,
   * dessen Ergebnis niemand zu sehen bekommt.
   */
  const { data: bedarf, error: bedarfFehler } = await supabase
    .from("schicht_vorlage_mindestbesetzung")
    .select("schicht_vorlage_id")
    .eq("betrieb_id", betriebId)
    .limit(1)
    .maybeSingle();

  if (bedarfFehler) {
    console.error(`[einrichtung] svm(${betriebId}): ${bedarfFehler.message}`);
  }
  if (!bedarf) {
    return { offen: "schichten", gesperrt: false, betriebId };
  }

  return { offen: "fertig", gesperrt: false, betriebId };
}

/**
 * Wohin gehört diese Person gerade — als Pfad.
 *
 * Dieselbe Funktion bedient Login, den Einstieg in `/einrichtung` und den
 * Abschluss der Bestätigung. Gleicher Zustand, gleiche Antwort,
 * unabhängig davon, über welchen Weg jemand ankommt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  `fertig` führt seit dem 2026-08-29 direkt ins Dashboard.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher lag dazwischen `/einrichtung/fertig`, ein Abschluss-Screen mit
 * Zusammenfassung, Store-Badges und einem Knopf „Zum Dashboard". Der
 * war richtig, solange es hier nichts zu tun gab und die native App das
 * Ziel war — er hat die Lücke gefüllt, die zwischen fertiger
 * Einrichtung und einer noch unveröffentlichten App klaffte.
 *
 * Seit es das Web-Dashboard gibt, füllt er keine Lücke mehr, sondern
 * baut eine: **jede Anmeldung eines fertig eingerichteten Betriebs**
 * lief über ihn, nicht nur die erste. Wer sich morgens anmeldet, um
 * nachzusehen, wer Spätdienst hat, las stattdessen „Dein Betrieb steht"
 * und musste einmal klicken. Ein Abschluss, den man täglich abschliesst,
 * ist kein Abschluss.
 *
 * Der Zustand `fertig` bleibt und heisst weiter dasselbe — er ist der
 * Endpunkt der Ableitung, nicht der Name einer Seite. Nur sein Ziel ist
 * jetzt der Ort, an dem gearbeitet wird.
 */
export function pfadFuer(stand: Stand): string {
  if (stand.gesperrt) return "/einrichtung/testphase-abgelaufen";
  if (stand.offen === "fertig") return "/dashboard";
  return `/einrichtung/${stand.offen}`;
}

/**
 * Darf diese Person den angefragten Schritt sehen?
 *
 * Zurück ja, vorwärts nein. Wer in Schritt 4 steht, darf sich Schritt 2
 * noch einmal ansehen — die Angaben von dort sind ja gemacht, und ein
 * Plan lässt sich ändern. Wer in Schritt 2 steht, hat in Schritt 4 nichts
 * verloren: dort stünde ein Formular, dessen Voraussetzungen fehlen.
 *
 * Bei gesperrter Testphase gilt das nicht — dann führt jeder Weg auf die
 * Sperrseite, auch der zurück.
 */
export function darfSehen(ziel: Schritt, stand: Stand): boolean {
  if (stand.gesperrt) return false;
  return schrittIndex(ziel) <= schrittIndex(stand.offen);
}

/**
 * Betritt einen Schritt oder leitet dahin um, wo die Person hingehört.
 *
 * Jede Schritt-Seite ruft das als erstes auf. Die Prüfung gehört
 * hierher und nicht in eine Middleware: sie braucht Datenbank und Stripe,
 * und die Middleware läuft bei jedem Request auf jede Route.
 *
 * `konto` ist der einzige Schritt, den man ohne Anmeldung sehen darf —
 * dort steht ja das Registrierungsformular. Ohne diese Ausnahme schickte
 * der Stepper Neukunden auf `/login`, also genau dorthin, wo sie noch
 * nichts zu suchen haben.
 */
export async function betreteSchritt(ziel: Schritt): Promise<Stand | null> {
  const stand = await ermittleStand();

  if (stand === "nicht-angemeldet") {
    if (ziel === "konto") return null;
    redirect("/login");
  }

  if (!darfSehen(ziel, stand)) redirect(pfadFuer(stand));

  await verlangeZustimmungVorMitarbeiterdaten(ziel, stand);

  return stand;
}

/**
 * Sperrt die Schritte, die betriebliche Mitarbeiterdaten anfassen, bis
 * eine Zustimmung nachweisbar vorliegt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das Tor hier steht und nicht nur vor dem Dashboard
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Zustimmung wird in Schritt 1 gehakt und dort geschrieben. Schlägt
 * dieses Schreiben fehl, läuft die Einrichtung bewusst trotzdem weiter —
 * Konto und Betrieb stehen ja schon, und jemanden hier steckenzulassen
 * hiesse, ihm ein halbes Konto zu hinterlassen (Entscheidung des
 * Betreibers, 2026-09-12). Der Preis dafür wäre ohne dieses Tor eine
 * Lücke: der `team`-Schritt lädt Mitarbeiter ein — das ist die
 * Verarbeitung betrieblicher Mitarbeiterdaten, die der Audit (Punkt 13)
 * **ausdrücklich** an einen vorliegenden Annahmenachweis knüpft.
 *
 * Deshalb greift vor `team` und `schichten` dasselbe Zustimmungs-Tor wie
 * im Dashboard. Im Normalfall ist die Zeile längst geschrieben und dieser
 * Weg kostet eine billige Abfrage; nur wenn sie fehlt, wird sie
 * nachgeholt — danach führt `?weiter=` zurück in genau diesen Schritt.
 * `konto` und `zahlung` bleiben frei: dort werden noch keine
 * Mitarbeiterdaten verarbeitet, und `konto` trägt das Zustimmungsfeld
 * selbst.
 */
async function verlangeZustimmungVorMitarbeiterdaten(
  ziel: Schritt,
  stand: Stand,
): Promise<void> {
  if (ziel !== "team" && ziel !== "schichten") return;
  if (stand.betriebId === null) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  /*
   * Gesperrt wird nur, was den Zugang wirklich sperrt: eine nie erfolgte
   * Erstannahme oder eine gescheiterte Prüfung. Eine offene
   * **Vertragsänderung** hält den Stepper seit dem 2026-09-13 nicht mehr
   * auf — der Annahmenachweis, den Punkt 13 des Audits vor der
   * Verarbeitung von Mitarbeiterdaten verlangt, liegt dann ja vor, nur zu
   * einer älteren Fassung. Und nach § 13 Abs. 3 der AGB gilt genau die
   * bis zur Zustimmung weiter.
   */
  const befund = await ermittleZustimmungBefund(supabase, stand.betriebId, user.id);
  if (!sperrtZugang(befund)) return;

  redirect(zustimmungAdresse(`/einrichtung/${ziel}`));
}
