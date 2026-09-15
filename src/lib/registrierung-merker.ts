import { cookies } from "next/headers";

import { betriebsMetadatenSchema, feldSchemata } from "@/lib/validierung";

/**
 * Die Betriebsdaten aus Abschnitt A, bis der Code bestätigt ist.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum nicht aus `user_metadata`, wo sie doch dort liegen
 * ─────────────────────────────────────────────────────────────────────
 *
 * Sie liegen dort, aber sie sind an dieser Stelle nicht lesbar.
 * `signUp` liefert bei aktivierter Bestätigungspflicht **keine
 * Session** — genau deshalb gibt es Schritt 1 in zwei Abschnitten. Ohne
 * Session hat `supabase.auth.getUser()` niemanden zurückzugeben, und
 * `user_metadata` ist ein Feld auf ebendiesem Benutzer. Die Seite weiss
 * in Lage B nachweislich nichts über das Konto; sie erkennt die Lage
 * allein am `?email=`-Parameter.
 *
 * Ab der Bestätigung ist `user_metadata` sehr wohl die Quelle — dort
 * holt `stelleBetriebSicher()` die Werte, und `betriebNachtragen()`
 * ebenso. Dieser Merker überbrückt also nur die Lücke dazwischen und
 * ist bewusst kein zweiter Speicherort: geschrieben wird der Betrieb
 * weiterhin ausschliesslich aus `user_metadata`.
 *
 * Deshalb auch kein Passwort und keine E-Mail-Adresse darin. Das
 * Passwort hat in einem Cookie nichts verloren, und die Adresse steht
 * ohnehin schon in der Adresszeile — zwei Quellen für dasselbe Feld
 * wären eine zu viel.
 */

const MERKER = "qt_registrierung";

/** 24 Stunden — dieselbe Frist, nach der `cleanup_unconfirmed_users()` das Konto löscht. */
const GUELTIG_SEKUNDEN = 60 * 60 * 24;

export type Vorbelegung = {
  betrieb_name: string;
  land: string;
  vorname: string;
  nachname: string;
  /** Freiwillig; fehlt er im Merker, bleibt das Feld leer. */
  promo_code?: string;
};

export async function merkeBetriebsdaten(daten: Vorbelegung): Promise<void> {
  const store = await cookies();
  store.set(MERKER, JSON.stringify(daten), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    /*
     * Eng auf die eine Route begrenzt, auf der er gebraucht wird. Ein
     * Cookie auf `/` würde bei jedem Bild und jeder Server Action
     * mitgeschickt, ohne dass es irgendwo gelesen wird.
     */
    path: "/einrichtung/konto",
    maxAge: GUELTIG_SEKUNDEN,
  });
}

/**
 * Liest den Merker — und traut ihm nicht.
 *
 * Der Inhalt geht durch dasselbe Zod-Schema wie die Metadaten beim
 * Anlegen des Betriebs. Kaputtes JSON, ein fremdes Land, ein leerer
 * Name: alles endet als `null` und damit bei leeren Feldern, nicht bei
 * einer Fehlerseite. Vorbelegen ist Komfort; scheitert es, ist der
 * Schritt trotzdem bedienbar.
 */
export async function leseBetriebsdaten(): Promise<Vorbelegung | null> {
  const roh = (await cookies()).get(MERKER)?.value;
  if (!roh) return null;

  try {
    const json: unknown = JSON.parse(roh);
    const geprueft = betriebsMetadatenSchema.safeParse(json);
    if (!geprueft.success) return null;

    // Getrennt geprüft: ein kaputter Code soll nicht die übrigen Felder leeren.
    const promo = feldSchemata.promo_code.safeParse(
      (json as Record<string, unknown>)["promo_code"] ?? "",
    );
    return promo.success && promo.data !== ""
      ? { ...geprueft.data, promo_code: promo.data }
      : geprueft.data;
  } catch {
    return null;
  }
}

/** Nach bestätigtem Code trägt `user_metadata` die Daten — der Merker hat ausgedient. */
export async function vergissBetriebsdaten(): Promise<void> {
  (await cookies()).delete({ name: MERKER, path: "/einrichtung/konto" });
}
