import { redirect } from "next/navigation";

import { aboGekuendigt, holeAbo, testphaseAbgelaufen } from "@/lib/abo";
import { wechselAdresse, zustimmungAdresse } from "@/lib/dashboard/pfad";
import {
  angefragterPfad,
  gewuenschtePositionsId,
  holePositionen,
  waehleAktive,
  type Position,
} from "@/lib/dashboard/position";
import { aboLageBeiStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { ermittleZustimmungStand } from "@/lib/zustimmung";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Das Tor vor dem Dashboard.
 *
 * Jede Seite unter `/dashboard` ruft das als erstes auf — mit einer
 * Ausnahme, der Positionswahl selbst, die sonst auf sich zurück
 * verwiese. Wie beim Stepper ist die **Reihenfolge verhaltensrelevant**
 * und keine Stilfrage.
 *
 * | Beobachtung                        | Ziel                          |
 * | ---------------------------------- | ----------------------------- |
 * | keine Session                      | `/login`                      |
 * | keine aktive Anstellung            | `/dashboard/wechseln`         |
 * | mehrere, keine gewählt             | `/dashboard/wechseln`         |
 * | Chef, Abo `pausiert`               | `/einrichtung/testphase-…`    |
 * | Chef, Abo `gekuendigt`             | `/einrichtung/zahlung`        |
 * | sonst                              | Seite rendern                 |
 *
 * Die Prüfung steht hier und nicht in der Middleware, aus demselben
 * Grund wie beim Stepper: sie braucht die Datenbank, und die Middleware
 * läuft auf jede Route.
 */
export type Zugang = {
  supabase: SupabaseServerClient;
  position: Position;
  /** Alle zulässigen Positionen — die Schale zeigt den Wechsel nur, wenn es etwas zu wechseln gibt. */
  alle: Position[];
};

export async function betreteDashboard(): Promise<Zugang> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const alle = await holePositionen(supabase, user.id);
  const position = waehleAktive(alle, await gewuenschtePositionsId());

  /*
   * Kein Ziel: entweder gibt es keine Anstellung (dann stehen dort
   * womöglich Einladungen) oder mehrere ohne Auswahl. Beides führt auf
   * dieselbe Seite, weil beides dieselbe Antwort braucht — „sag mir, als
   * wer du hier bist".
   *
   * Wohin es eigentlich gehen sollte, reist als `?weiter=` mit. Ohne das
   * ist die Positionswahl eine Einbahnstrasse: sie leitete fest auf die
   * Übersicht, und wer auf „Kalender" geklickt hatte, kam dort nie an —
   * er konnte den Klick beliebig oft wiederholen und landete jedes Mal
   * wieder auf der Übersicht. Genau so ist der Fehler am 2026-09-07 aus
   * dem Test gemeldet worden.
   */
  if (position === null) redirect(wechselAdresse(await angefragterPfad()));

  await pruefeSperre(supabase, position, user.email ?? "");
  await pruefeZustimmung(supabase, position);

  return { supabase, position, alle };
}

/**
 * Testphase abgelaufen, kein Zahlungsmittel → dieselbe Sperrseite wie im
 * Stepper. Nicht eine zweite: zwei Umsetzungen desselben Tors wären zwei
 * Gelegenheiten, sich zu widersprechen, und die Seite trägt bereits das
 * Zahlungsformular, mit dem man sich wieder freikauft.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Sperre greift nur für Chefs, und das ist eine Entscheidung.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Technisch könnte sie gar nicht anders: `betrieb_abonnements` trägt
 * ausschliesslich `abonnement_select_chef`. Für eine angestellte Person
 * liefert die Abfrage keine Zeile — nicht „kein Abo", sondern „nichts zu
 * sehen". Daraus eine Sperre abzuleiten hiesse, jeden Mitarbeiter jedes
 * Betriebs auszusperren.
 *
 * Inhaltlich passt es zusammen: die Zahlung schuldet der Betriebsinhaber,
 * und `CLAUDE.md` klammert eine Sperre, die Angestellte **an der Arbeit**
 * hindert, ausdrücklich aus diesem Repo aus. Wer schon eingeteilt ist,
 * soll seinen Dienstplan sehen können, auch wenn der Chef die Karte
 * nicht hinterlegt hat. Gesperrt wird die Verwaltung, nicht die Schicht.
 *
 * Gefragt wird zuerst die eigene Zeile. Sagt sie `pausiert` oder
 * `gekuendigt`, fragt das Tor bei Stripe nach, **genau wie der Stepper**
 * — bis zum 2026-09-14 tat es das nicht. Wer auf der Sperrseite bezahlt
 * oder nach einer Kündigung neu abgeschlossen hatte, wurde vom Stepper
 * durchgelassen (Stripe: `active`) und von hier zurückgeschickt (Zeile
 * noch alt), und zwar im Kreis, bis der Webhook ankam. Zwei Tore auf
 * demselben Zustand müssen dieselbe Frage stellen, und sie müssen sie
 * gleich beantworten — die Lagen stehen bei `aboLageBeiStripe`.
 */
async function pruefeSperre(
  supabase: SupabaseServerClient,
  position: Position,
  email: string,
): Promise<void> {
  if (position.rolleTyp !== "chef") return;

  const abo = await holeAbo(supabase, position.betriebId);
  if (!testphaseAbgelaufen(abo) && !aboGekuendigt(abo)) return;

  const lage = await aboLageBeiStripe({
    betriebId: position.betriebId,
    email,
    kundeId: abo?.stripe_customer_id ?? null,
  });
  if (lage === "laeuft") return;

  if (lage === "pausiert" || (lage === "unbekannt" && testphaseAbgelaufen(abo))) {
    redirect("/einrichtung/testphase-abgelaufen");
  }

  /*
   * Gekündigt führt zurück in den Zahlungsschritt, nicht auf die
   * Sperrseite — ebenso ein neues Abo, dessen erste Rechnung noch offen
   * ist, und eine Zeile, zu der Stripe gerade nichts sagt.
   *
   * Dieses Tor muss die Frage überhaupt stellen, weil es den Stand
   * **nicht** über `ermittleStand()` bezieht, sondern selbst prüft.
   * Ohne diese Zeile bliebe die Ableitung im Stepper korrigiert und die
   * Tür daneben offen: ein gekündigter Betrieb käme über `/dashboard`
   * weiter an Kalender, Team und Planung — genau der Zustand, gegen den
   * die Ergänzung in `ermittleStandFuer()` antritt.
   *
   * Das Ziel ist bewusst `/einrichtung/zahlung` und nicht
   * `/einrichtung/testphase-abgelaufen`. Die Sperrseite spricht von
   * einer abgelaufenen Testphase; einem Betrieb, der nach zwei Jahren
   * gekündigt hat, wäre damit etwas Falsches erzählt. Der
   * Zahlungsschritt trägt dagegen genau das, was jetzt gebraucht wird —
   * Planwahl und Zahlungsformular für einen neuen Abschluss.
   *
   * Wie die Sperre darüber gilt auch das nur für Chefs: `gekuendigt`
   * ist eine Aussage über das Abo des Betriebs, und lesen kann die Zeile
   * ohnehin nur, wer unter `abonnement_select_chef` fällt. Angestellte
   * behalten ihren Dienstplan.
   */
  redirect("/einrichtung/zahlung");
}

/**
 * Zustimmung zu AGB, AVV und Datenschutzerklärung — für Bestandsbetriebe
 * nachgeholt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum es dieses Tor überhaupt gibt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Seit dem 2026-09-10 hakt die Registrierung die drei Dokumente ab und
 * schreibt den Nachweis. Wer **vorher** registriert hat, hat den Haken nie
 * gesehen — die Tabelle war an dem Tag leer, und ohne dieses Tor bliebe sie
 * es für jeden Bestandsbetrieb. Die Lücke stand als offener Punkt in
 * `CLAUDE.md` und wird hier geschlossen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Nur Chefs — dieselbe Begründung wie bei der Sperre darüber
 * ─────────────────────────────────────────────────────────────────────
 *
 * Den Vertrag schliesst der Betriebsinhaber, nicht die angestellte Person.
 * Eine Küchenhilfe kann den AVV ihres Arbeitgebers nicht annehmen, und sie
 * an der Schicht zu hindern, bis ihr Chef geklickt hat, wäre genau die
 * Sperre, die `CLAUDE.md` ausschliesst: gesperrt wird die Verwaltung, nicht
 * der Dienstplan. Angestellte kommen deshalb unverändert durch, unabhängig
 * vom Zustimmungsstand ihres Betriebs.
 *
 * Technisch ginge es ohnehin nicht anders —
 * `zustimmung_select_chef_oder_selbst` zeigt einer angestellten Person nur
 * ihre **eigenen** Zeilen, und „keine eigene Zeile" heisst nicht „der
 * Betrieb hat nicht zugestimmt".
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Reihenfolge: erst die Zahlungssperre, dann die Zustimmung
 * ─────────────────────────────────────────────────────────────────────
 *
 * `pruefeSperre` läuft zuerst und bleibt unangetastet. Ein Betrieb mit
 * abgelaufener Testphase landet weiterhin auf der Zahlungsseite, statt
 * zwischendurch nach einer Zustimmung gefragt zu werden — er käme danach
 * ohnehin nicht weiter. Am bestehenden Zahlungsweg ändert diese
 * Reihenfolge nichts; sie stellt nur sicher, dass das neue Tor ihn nicht
 * überholt.
 */
async function pruefeZustimmung(
  supabase: SupabaseServerClient,
  position: Position,
): Promise<void> {
  if (position.rolleTyp !== "chef") return;

  const stand = await ermittleZustimmungStand(supabase, position.betriebId);
  if (stand === "zugestimmt") return;

  /*
   * `fehlend` **und** `pruefung-fehlgeschlagen` führen auf dieselbe Seite —
   * denn ein Lesefehler ist ausdrücklich keine Zustimmung mehr (Punkt 12).
   * Welchen der beiden Fälle sie zeigt, entscheidet die Seite selbst: sie
   * prüft erneut und rendert entweder das Formular oder den Hinweis
   * „Prüfung fehlgeschlagen, erneut versuchen". So steht die
   * Unterscheidung an genau einer Stelle, und ein zwischenzeitlich
   * behobener Fehler löst sich beim nächsten Laden von selbst auf.
   *
   * Dasselbe `?weiter=`-Muster wie bei der Positionswahl: das eigentliche
   * Ziel reist mit, damit es nach dem Haken dort weitergeht, wo der Klick
   * hinwollte — und nicht pauschal auf der Übersicht.
   */
  redirect(zustimmungAdresse(await angefragterPfad()));
}
/**
 * Fürs Layout: Chef-Bereiche sind für Angestellte nicht bloss leer,
 * sondern nicht vorhanden. Die App macht es genauso — dort entscheidet
 * `rolle_typ` über die Tab-Leiste, nicht über deren Inhalt.
 */
export function istChef(position: Position): boolean {
  return position.rolleTyp === "chef";
}
