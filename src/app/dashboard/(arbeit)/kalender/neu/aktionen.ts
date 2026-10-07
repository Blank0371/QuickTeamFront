"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Dictionary } from "@/i18n/de";
import { holeTexte, holeValidierung } from "@/i18n/server";
import { fuelle } from "@/i18n/text";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { beginnVorbei } from "@/lib/datum";
import { feldFehler, type FormZustand } from "@/lib/formular";
import { leseSchichtErstellen, schichtErstellenSchema } from "@/lib/validierung";

export type SchichtNeuZustand = FormZustand & {
  /** Vorab-Hinweise aus `schicht_zuweisung_warnungen` — nur im Modus „zuweisung". */
  warnungen?: { name: string; gruende: string[] }[];
};

type Texte = Dictionary["schichtNeu"];

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu;

/**
 * Spiegel von `translateShiftError()` in `calendar.tsx`: die Ausnahmen der
 * Zuweisungs-Trigger (`HC-1`…`HC-5`) tragen die UUID der Person — sie wird
 * zum Namen aufgelöst. Codes wie in `schicht/[id]/aktionen.ts`.
 */
function erstellFehlerText(message: string, namen: Map<string, string>, t: Texte): string {
  const uuid = message.match(UUID_RE)?.[0];
  const name = (uuid && namen.get(uuid)) || t.jemand;
  const mit = (vorlage: string) => fuelle(vorlage, { name });
  if (message.includes("HC-1") || message.includes("Urlaub")) return mit(t.fehler.urlaub);
  if (message.includes("HC-2") || message.includes("ueberlappende")) return mit(t.fehler.ueberlappend);
  if (message.includes("HC-4") || message.includes("Ruhezeit")) return mit(t.fehler.ruhezeit);
  if (message.includes("Tageshoechstarbeitszeit")) return mit(t.fehler.tag);
  if (message.includes("Wochenhoechstarbeitszeit")) return mit(t.fehler.woche);
  if (message.includes("HC-5") || message.includes("max_stunden_hart")) return mit(t.fehler.monat);
  if (message.includes("HC-3") || message.includes("qualifiziert")) return mit(t.fehler.qualifikation);
  if (message.includes("deaktiviert")) return mit(t.fehler.deaktiviert);
  if (message.includes("Nur der Manager")) return t.fehler.berechtigung;
  return t.fehler.allgemein;
}

/**
 * Legt eine einzelne Schicht an — Spiegel von `doCreate()`/`submit()` in
 * `CreateShiftModal` (`calendar.tsx`).
 *
 * `benutzerdefinierte_schicht_erstellen` ist SECURITY DEFINER und prüft
 * `ist_chef` selbst; die Prüfung hier ist nur die bessere Meldung.
 *
 * **Sofort veröffentlicht, anders als die App** (Nutzerentscheidung
 * 2026-10-07). Die RPC legt immer `status = 'geplant'` an; danach setzt
 * diese Action genau diese eine Instanz auf `veroeffentlicht`
 * (`instanzen_update_chef`). Der Umweg über `geplante_schichten_-
 * veroeffentlichen` schiede aus: er gäbe **alle** Entwürfe des Betriebs
 * frei, auch einen offenen Solver-Vorschlag. Ein reiner Statuswechsel löst
 * keine Benachrichtigung und keine Regelprüfung aus (am 2026-10-07 in
 * `pg_proc` nachgesehen: die UPDATE-Trigger reagieren nur auf Datum,
 * Zeiten, Kommentar). Scheitert er, bleibt die Schicht ein Entwurf — sie
 * existiert dann trotzdem, und die Schichtseite zeigt den Entwurfsvermerk.
 *
 * **Nicht in der Vergangenheit.** Die RPC nimmt jedes Datum; die Grenze
 * zieht diese Action (`beginnVorbei()`, Betriebszeit) — im Browser steht
 * dieselbe Prüfung nur als Komfort davor.
 */
export async function schichtErstellen(
  _vorher: SchichtNeuZustand,
  formData: FormData,
): Promise<SchichtNeuZustand> {
  const { supabase, position } = await betreteDashboard();
  const t = (await holeTexte()).schichtNeu;
  const roh = leseSchichtErstellen(formData);
  const werte = {
    datum: roh.datum,
    start_zeit: roh.startZeit,
    end_zeit: roh.endZeit,
    kommentar: roh.kommentar,
  };

  if (!istChef(position)) {
    return { status: "fehler", nachricht: t.fehler.berechtigung, felder: {}, werte };
  }

  const geprueft = schichtErstellenSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte,
    };
  }
  const daten = geprueft.data;

  if (beginnVorbei(daten.datum, daten.startZeit)) {
    const v = await holeValidierung();
    return {
      status: "fehler",
      nachricht: null,
      felder: { datum: v["v.schicht.vergangen"] ?? "" },
      werte,
    };
  }

  // Eine Person nur einmal je Schicht; die erste gewählte Rolle gilt.
  const zuweisungen = [
    ...new Map(daten.zuweisungen.map((z) => [z.mitarbeiterId, z.rolleId])).entries(),
  ].map(([mitarbeiter_id, rolle_id]) => ({ mitarbeiter_id, rolle_id }));
  const bedarf = daten.bedarf
    .filter((b) => b.benoetigt > 0)
    .map((b) => ({ rolle_id: b.rolleId, benoetigt: b.benoetigt }));

  const namen = new Map<string, string>();
  if (daten.modus === "zuweisung") {
    const { data: personen } = await supabase
      .from("mitarbeiter")
      .select("id, vorname, nachname")
      .eq("betrieb_id", position.betriebId)
      .in("id", zuweisungen.map((z) => z.mitarbeiter_id));
    for (const p of personen ?? []) {
      namen.set(p.id, `${p.vorname} ${p.nachname}`.trim());
    }

    /*
     * Wie in der App: vor dem Anlegen auf Urlaub und „arbeitet ungern"
     * hinweisen, mit „Trotzdem zuweisen" als bewusster zweiter Klick.
     * Scheitert die Vorabprüfung selbst, wird nicht blockiert — die
     * Datenbank entscheidet ohnehin.
     */
    if (formData.get("trotzdem") !== "ja") {
      const { data, error } = await supabase.rpc("schicht_zuweisung_warnungen", {
        p_betrieb_id: position.betriebId,
        p_datum: daten.datum,
        p_mitarbeiter_ids: zuweisungen.map((z) => z.mitarbeiter_id),
      });
      if (error) {
        console.error(`[kalender/neu] warnungen: ${error.message}`);
      } else {
        const warnungen = ((data ?? []) as { mitarbeiter_id: string; im_urlaub: boolean; ungerne: boolean }[])
          .map((zeile) => ({
            name: namen.get(zeile.mitarbeiter_id) ?? t.jemand,
            gruende: [
              ...(zeile.im_urlaub ? [t.warnUrlaub] : []),
              ...(zeile.ungerne ? [t.warnUngerne] : []),
            ],
          }))
          .filter((w) => w.gruende.length > 0);
        if (warnungen.length > 0) {
          return { status: "fehler", nachricht: null, felder: {}, werte, warnungen };
        }
      }
    }
  }

  const { data: instanzId, error } = await supabase.rpc("benutzerdefinierte_schicht_erstellen", {
    p_betrieb_id: position.betriebId,
    p_datum: daten.datum,
    p_start: daten.startZeit,
    p_end: daten.endZeit,
    p_kommentar: daten.kommentar,
    p_modus: daten.modus,
    p_zuweisungen: daten.modus === "zuweisung" ? zuweisungen : [],
    p_bedarf: daten.modus === "ausschreibung" ? bedarf : [],
  });

  if (error || typeof instanzId !== "string") {
    console.error(`[kalender/neu] erstellen: ${error?.message ?? "keine ID"}`);
    return {
      status: "fehler",
      nachricht: erstellFehlerText(error?.message ?? "", namen, t),
      felder: {},
      werte,
    };
  }

  const { error: freigabeFehler } = await supabase
    .from("schicht_instanzen")
    .update({ status: "veroeffentlicht" })
    .eq("id", instanzId)
    .eq("betrieb_id", position.betriebId)
    .eq("status", "geplant");
  if (freigabeFehler) {
    console.error(`[kalender/neu] veroeffentlichen(${instanzId}): ${freigabeFehler.message}`);
  }

  revalidatePath("/dashboard/kalender");
  revalidatePath("/dashboard");
  redirect(`/dashboard/schicht/${instanzId}`);
}
