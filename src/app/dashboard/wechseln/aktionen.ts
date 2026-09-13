"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sicheresZiel, ZIEL_PARAMETER } from "@/lib/dashboard/pfad";
import { holePositionen, setzeAktivePosition } from "@/lib/dashboard/position";
import { type FormZustand } from "@/lib/formular";
import { createClient } from "@/lib/supabase/server";

const PFAD = "/dashboard/wechseln";

function fehler(nachricht: string): FormZustand {
  return { status: "fehler", nachricht, felder: {} };
}

/**
 * Übernimmt die Auswahl einer Position.
 *
 * Der Wert kommt aus einem Formularfeld und wird deshalb **nicht**
 * geglaubt, sondern in der Liste der eigenen aktiven Anstellungen
 * gesucht. Steht er nicht darin, passiert nichts.
 *
 * Sicherheitskritisch ist das nicht — jeder RPC prüft `p_mitarbeiter_id`
 * ohnehin selbst gegen `auth.uid()`, und RLS liesse eine fremde Zeile
 * nirgends durch. Es geht um etwas anderes: ohne diese Prüfung liesse
 * sich ein Cookie setzen, das auf nichts zeigt, und das Dashboard
 * schickte die Person bei jedem Aufruf zurück auf diese Seite, ohne
 * je zu sagen, warum. Ein Zustand, der nicht eintreten kann, muss auch
 * nicht erklärt werden.
 */
export async function waehlePosition(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const gewuenscht = String(formData.get("mitarbeiter_id") ?? "");
  if (!gewuenscht) return fehler("Es wurde keine Position angegeben.");

  const positionen = await holePositionen(supabase, user.id);
  if (!positionen.some((p) => p.mitarbeiterId === gewuenscht)) {
    return fehler(
      "Diese Position gehört nicht mehr zu deinem Konto. Lad die Seite neu, dann siehst du den aktuellen Stand.",
    );
  }

  await setzeAktivePosition(gewuenscht);

  /*
   * Zurück dorthin, wo der Klick hinwollte — nicht pauschal auf die
   * Übersicht. Das Ziel kommt aus einem versteckten Feld und ist damit
   * so vertrauenswürdig wie jedes Formularfeld; `sicheresZiel()` lässt
   * deshalb nur Adressen innerhalb des Dashboards durch.
   */
  redirect(sicheresZiel(String(formData.get(ZIEL_PARAMETER) ?? "")));
}

/**
 * Nimmt eine Einladung an — derselbe Weg, den `select.tsx` in der App
 * geht: `einladung_annehmen(p_mitarbeiter_id)` hebt die Zeile von
 * `eingeladen` auf `aktiv` und trägt `auth_id` ein.
 *
 * Danach wird **nicht** automatisch in den Betrieb gewechselt. Wer
 * mehrere Einladungen auf einmal bekommt, soll sie nacheinander annehmen
 * können, ohne dazwischen aus der Liste geworfen zu werden; die Auswahl
 * ist der eigene, sichtbare Schritt daneben.
 */
export async function nimmEinladungAn(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "");
  if (!mitarbeiterId) return fehler("Es wurde keine Einladung angegeben.");

  const { error } = await supabase.rpc("einladung_annehmen", {
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[dashboard] einladung_annehmen: ${error.message}`);
    return fehler(
      "Die Einladung liess sich nicht annehmen. Möglich, dass sie zurückgezogen wurde — lad die Seite neu.",
    );
  }

  revalidatePath(PFAD);
  return { status: "erfolg", nachricht: null, felder: {} };
}
