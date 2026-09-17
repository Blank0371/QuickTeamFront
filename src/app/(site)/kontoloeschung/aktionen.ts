"use server";

import { redirect } from "next/navigation";

import { holeAuthTexte, holeValidierung } from "@/i18n/server";
import { holePositionen, loescheAktivePosition } from "@/lib/dashboard/position";
import {
  authFehlerText,
  feldFehler,
  protokolliereAuthFehler,
  type FormZustand,
} from "@/lib/formular";
import {
  bestaetigungswort,
  fuehreLoeschungAus,
  loeschFehlerText,
} from "@/lib/konto-loeschung";
import { createClientOhneRiegel } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validierung";

/**
 * Die Server Actions der Kontolöschung.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Alle drei benutzen `createClientOhneRiegel()`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das ist der Kern und keine Abkürzung: die Löschung soll auch während
 * des Soft-Launches arbeiten, und `createClient()` leitet dort auf `/`
 * um. Warum eine Löschung an dieser Sperre vorbei darf, steht
 * ausführlich an der Funktion selbst in `src/lib/supabase/server.ts`;
 * warum die Route dafür aus `GESPERRTE_PRAEFIXE` verschwunden ist, in
 * `src/lib/soft-launch.ts`. Die drei Stellen gehören zusammen — wer eine
 * zurücknimmt, nimmt die anderen mit.
 *
 * Was `konto_selbst_loeschen()` tut und was es ausdrücklich **nicht**
 * tut, steht in `src/lib/konto-loeschung.ts`. Hier bleibt nur, was die
 * Seite ausmacht: anmelden, abbrechen, das abgetippte Wort vergleichen.
 */

/**
 * Stufe 1: anmelden.
 *
 * Dieselbe Prüfung wie auf `/login` und ausdrücklich keine schwächere —
 * eine Löschseite, die jemanden anhand einer E-Mail-Adresse allein
 * einlässt, wäre ein Werkzeug gegen fremde Konten statt für das eigene.
 */
export async function anmeldenZurLoeschung(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const email = String(formData.get("email") ?? "");
  const passwort = String(formData.get("passwort") ?? "");

  const geprueft = loginSchema.safeParse({ email, passwort });
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: { email },
    };
  }

  const supabase = await createClientOhneRiegel();
  const { error } = await supabase.auth.signInWithPassword({
    email: geprueft.data.email,
    password: geprueft.data.passwort,
  });

  if (error) {
    protokolliereAuthFehler("kontoloeschung/signInWithPassword", error);
    return {
      status: "fehler",
      nachricht: authFehlerText(error, await holeAuthTexte()),
      felder: {},
      werte: { email },
    };
  }

  /*
   * Nicht direkt auf die letzte Stufe. Die Anmeldung beweist nur, wer
   * hier ist — gewarnt ist damit noch niemand.
   */
  redirect("/kontoloeschung?schritt=folgen");
}

/**
 * Abbrechen: die Sitzung wieder auflösen.
 *
 * Wichtiger, als es aussieht. Während des Soft-Launches ist dies die
 * einzige Stelle, an der überhaupt eine Sitzung entsteht; wer es sich
 * anders überlegt, soll keine offene zurücklassen — erst recht nicht auf
 * einem geteilten Gerät hinter der Theke.
 */
export async function loeschungAbbrechen(): Promise<void> {
  const supabase = await createClientOhneRiegel();
  await supabase.auth.signOut();
  await loescheAktivePosition();
  redirect("/");
}

/**
 * Stufe 3: die Löschung selbst.
 *
 * Das abgetippte Wort wird gegen den **serverseitig neu abgeleiteten**
 * Betriebsnamen verglichen, nie gegen ein mitgeschicktes Feld. Ein
 * verstecktes `erwartet` im Formular autorisiert hier nichts — dieselbe
 * Regel wie beim Positions-Cookie (`TESTING.md` §5.2), und es gibt einen
 * Test dafür.
 */
export async function kontoLoeschen(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClientOhneRiegel();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * Zurück an den Anfang **dieser** Seite, nicht auf `/login`: die
   * Anmeldung findet hier statt, und `/login` ist während des
   * Soft-Launches ohnehin gesperrt.
   */
  if (!user) redirect("/kontoloeschung");

  const bestaetigung = String(formData.get("bestaetigung") ?? "").trim();
  const positionen = await holePositionen(supabase, user.id);
  const erwartet = bestaetigungswort(positionen, user.email);

  // Bestätigungswort aus derselben vertrauenswürdigen Quelle wie auf der Seite.
  if (erwartet.length === 0 || bestaetigung !== erwartet) {
    return {
      status: "fehler",
      nachricht: `Die Eingabe stimmt nicht. Tipp „${erwartet}" genau so ein, wie es dasteht.`,
      felder: {},
    };
  }

  const ergebnis = await fuehreLoeschungAus({
    supabase,
    email: user.email ?? "",
    positionen,
    trotzSoftLaunch: true,
  });

  if (ergebnis.art !== "erfolg") {
    return { status: "fehler", nachricht: loeschFehlerText(ergebnis), felder: {} };
  }

  /*
   * Nach `/` und nicht nach `/login`: während des Soft-Launches ist
   * `/login` gesperrt, und wer gerade sein Konto gelöscht hat, hat dort
   * ohnehin nichts mehr verloren. Der offene Kündigungsfall reist als
   * Parameter mit, damit die Startseite ihn nennen kann.
   */
  if (ergebnis.kuendigungOffen) {
    redirect("/?geloescht=1&fehler=abo-kuendigung-offen");
  }
  redirect("/?geloescht=1");
}
