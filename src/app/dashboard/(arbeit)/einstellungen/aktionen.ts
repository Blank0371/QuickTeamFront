"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { holeAbo } from "@/lib/abo";
import { speichereEinstellungen } from "@/lib/dashboard/einstellungen";
import { erstelleKundenportal, holeAboFuerBetrieb } from "@/lib/stripe";
import { leseSprache } from "@/i18n/sprache";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { einstellungenSchema } from "@/lib/validierung";
import { holeValidierung } from "@/i18n/server";

function fehler(nachricht: string, felder: Record<string, string> = {}): FormZustand {
  return { status: "fehler", nachricht, felder, werte: {} };
}

/** Ein angehaktes Kästchen kommt als `"an"`, ein leeres gar nicht. */
function schalter(formData: FormData, name: string): boolean {
  return formData.get(name) === "an";
}

/**
 * Alle sieben Felder auf einmal speichern.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Chef-Prüfung steht hier **und** in der Datenbank
 * ─────────────────────────────────────────────────────────────────────
 *
 * `einstellungen_update_chef` trägt `ist_chef(betrieb_id)` als USING und
 * als WITH CHECK; ohne Chef-Rolle erwischt das Update schlicht keine
 * Zeile. Das ist die eigentliche Absicherung, und sie liegt richtig — in
 * der Datenbank, nicht hier.
 *
 * Die Prüfung unten ist trotzdem keine zweite Autorisierungsebene im
 * Sinne von `CLAUDE.md`, sondern eine Anstandsregel: sie verwandelt ein
 * stilles „null Zeilen betroffen" in einen Satz, den man lesen kann.
 * Fällt sie weg, greift immer noch RLS — dann eben mit der Meldung aus
 * `speichereEinstellungen()`, die denselben Fall abdeckt.
 *
 * Geprüft wird gegen die **aktive Position**, nicht gegen irgendeine
 * Anstellung: `betreteDashboard()` leitet sie aus `auth.uid()` und dem
 * `qt_position`-Cookie ab, und das Cookie wird dabei gegen die eigenen
 * aktiven Anstellungen geprüft. Aus dem Formular kommt keine
 * Betriebs-ID — die wäre eine hereingereichte ID, der man glauben
 * müsste.
 */
export async function einstellungenSpeichern(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const { supabase, position } = await betreteDashboard();

  if (!istChef(position)) {
    return fehler("Nur die Betriebsleitung darf die Einstellungen ändern.");
  }

  const geprueft = einstellungenSchema.safeParse({
    sprache_standard: String(formData.get("sprache_standard") ?? ""),
    verfuegbarkeit_deadline_tag: String(formData.get("verfuegbarkeit_deadline_tag") ?? ""),
    notfall_stunden_anrechnen: schalter(formData, "notfall_stunden_anrechnen"),
    mitarbeiter_sehen_andere_schichten: schalter(
      formData,
      "mitarbeiter_sehen_andere_schichten",
    ),
    mitarbeiter_sehen_andere_mitarbeiter: schalter(
      formData,
      "mitarbeiter_sehen_andere_mitarbeiter",
    ),
    abrechnung_bis: String(formData.get("abrechnung_bis") ?? ""),
    ask_chef_for_shift_switch: schalter(formData, "ask_chef_for_shift_switch"),
  });

  if (!geprueft.success) {
    const felder = feldFehler(geprueft.error, await holeValidierung());
    return fehler(
      Object.values(felder)[0] ?? "Die Eingaben stimmen so nicht.",
      felder,
    );
  }

  const ergebnis = await speichereEinstellungen(supabase, position.betriebId, geprueft.data);

  if (!ergebnis.ok) {
    return fehler(
      ergebnis.grund === "rls"
        ? "Gespeichert wurde nichts — die Berechtigung dafür fehlt inzwischen. Lad die Seite neu."
        : "Die Einstellungen liessen sich nicht speichern. Versuch es noch einmal.",
    );
  }

  /*
   * Die beiden Sichtbarkeits-Schalter werden von `kalender_schichten`
   * und von der Policy `zuweisungen_select` **zum Abfragezeitpunkt**
   * gelesen — es gibt keinen zwischengespeicherten Stand, der ungültig
   * werden könnte, und keine Sitzung, die aufzufrischen wäre. Für andere
   * Personen wirkt die Änderung damit ab ihrer nächsten Anfrage von
   * selbst.
   *
   * Für diese eine Person ist der Cache von Next dagegen sehr wohl
   * relevant: ohne `revalidatePath` zeigte die Seite nach dem Speichern
   * weiter die alten Werte, und die Formularfelder fielen beim nächsten
   * Aufbau auf den Stand von vorher zurück. Deshalb genau diese eine
   * Route, und nicht der ganze Baum.
   */
  revalidatePath("/dashboard/einstellungen");

  return { status: "erfolg", nachricht: "Gespeichert.", felder: {}, werte: {} };
}

/**
 * Leitet die Betriebsleitung ins Stripe-Kundenportal.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein Portal statt eines eigenen Kündigen-Knopfs
 * ─────────────────────────────────────────────────────────────────────
 *
 * Entschieden am 2026-09-13 nach der rechtlichen Durchsicht (Befund 5:
 * „eine reguläre Kündigungsoberfläche habe ich nicht gefunden"). Das
 * Portal deckt Kündigung zum Periodenende, Wechsel des Zahlungsmittels
 * und Rechnungsabruf in einem ab — drei Dinge, die sonst je eine eigene
 * Oberfläche bräuchten. Was es anbietet, stellt der Betreiber im
 * Stripe-Dashboard ein, nicht dieser Code.
 *
 * **Die Kunden-Id kommt nie aus dem Formular.** Der Betrieb ergibt sich
 * aus der serverseitig geprüften Position, der Kunde aus unserer Zeile
 * in `betrieb_abonnements` oder — solange der Webhook noch nicht durch
 * ist — über `holeAboFuerBetrieb()` bei Stripe. Ein hereingereichter
 * Wert würde Zugriff auf das Portal eines fremden Kunden eröffnen.
 *
 * Kein `FormZustand`: der Erfolg ist ein Verlassen der Seite, und ein
 * Fehler landet als `?abo=…` wieder auf ihr. So braucht der Knopf kein
 * JavaScript.
 */
export async function aboVerwalten(): Promise<void> {
  const { supabase, position } = await betreteDashboard();
  if (!istChef(position)) redirect("/dashboard/einstellungen?abo=verweigert");

  let kundeId: string | null = null;
  try {
    const abo = await holeAbo(supabase, position.betriebId);
    kundeId = abo?.stripe_customer_id ?? null;

    if (!kundeId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const beiStripe = await holeAboFuerBetrieb({
        betriebId: position.betriebId,
        email: user?.email ?? "",
        kundeId: null,
      });
      if (beiStripe) {
        kundeId =
          typeof beiStripe.customer === "string" ? beiStripe.customer : beiStripe.customer.id;
      }
    }
  } catch (fehler) {
    console.error(`[abo] Kunde für Portal nicht ermittelbar: ${fehler}`);
  }

  if (!kundeId) redirect("/dashboard/einstellungen?abo=kein-abo");

  let ziel: string | null = null;
  try {
    ziel = await erstelleKundenportal({
      kundeId,
      rueckkehrUrl: `${await eigeneHerkunft()}/dashboard/einstellungen`,
      sprache: await leseSprache(),
    });
  } catch (fehler) {
    /*
     * Häufigster Grund: im Stripe-Dashboard ist noch keine
     * Portal-Konfiguration gespeichert. Das ist ein Einrichtungsfehler auf
     * unserer Seite, kein Fehler des Kunden — deshalb ins Protokoll mit
     * Kunden-Id, und dem Kunden der Weg per E-Mail.
     */
    console.error(`[abo] Kundenportal für ${kundeId} nicht erzeugt: ${fehler}`);
  }

  // `redirect` wirft; deshalb ausserhalb des try-Blocks.
  redirect(ziel ?? "/dashboard/einstellungen?abo=portal-fehler");
}

/**
 * Protokoll und Host dieser Anfrage — damit das Portal dorthin
 * zurückführt, wo es geöffnet wurde, auch lokal und auf Vorschau-Adressen.
 * `siteUrl` aus `src/lib/site.ts` zeigte ohne gesetzte Variable immer auf
 * die Produktionsdomain.
 */
async function eigeneHerkunft(): Promise<string> {
  const kopf = await headers();
  const host = kopf.get("x-forwarded-host") ?? kopf.get("host") ?? "quickteam.at";
  const proto = (kopf.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}
