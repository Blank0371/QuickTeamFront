"use server";

/**
 * Die Server Actions von Schritt 1.
 *
 * Zusammengelegt am 2026-08-21 aus `/registrieren` und
 * `/auth/bestaetigen`. Die drei Aktionen bedienen jetzt zwei Abschnitte
 * einer Seite statt zweier Seiten — inhaltlich unveraendert, nur die
 * Weiterleitung von `registrieren()` zeigt nicht mehr auf eine eigene
 * Route, sondern auf dieselbe mit `?email=`.
 */

import { redirect } from "next/navigation";

import { stelleBetriebSicher } from "@/lib/betrieb";
import { leseSprache } from "@/i18n/sprache";
import {
  PROMO_METADATEN_SCHLUESSEL,
  promoCodeAusMetadaten,
  pruefePromoCode,
  schreibePromoCode,
} from "@/lib/promo-code";
import { zustimmungHashes } from "@/lib/rechtstexte-inhalt";
import {
  aktuelleZustimmungVersionen,
  schreibeZustimmungen,
  ZUSTIMMUNG_METADATEN_SCHLUESSEL,
  ZUSTIMMUNG_NACHWEIS_SCHLUESSEL,
  zustimmungNachweisAusMetadaten,
  zustimmungAusMetadaten,
} from "@/lib/zustimmung";
import {
  authFehlerText,
  feldFehler,
  protokolliereAuthFehler,
  type FormZustand,
} from "@/lib/formular";
import {
  merkeBetriebsdaten,
  vergissBetriebsdaten,
} from "@/lib/registrierung-merker";
import { createClient } from "@/lib/supabase/server";
import { holeAuthTexte, holeValidierung } from "@/i18n/server";
import {
  bestaetigungSchema,
  passwortVergessenSchema,
  registrierungSchema,
} from "@/lib/validierung";

/**
 * Bestätigt die Registrierung mit dem Code aus der E-Mail.
 *
 * `type: "email"` ist der aktuelle Wert für die Signup-Bestätigung — so
 * steht es in der JS-Referenz unter „Verify Signup One-Time Password
 * (OTP)". `"signup"` existiert im Typ weiterhin, ist aber der ältere Weg.
 *
 * Achtung, die beiden Aufrufe hier verlangen unterschiedliche Werte:
 * `verifyOtp` will `"email"`, `resend` akzeptiert laut Typ ausdrücklich
 * nur `"signup"` oder `"email_change"`. Das ist kein Versehen unten.
 */
export async function bestaetigen(
  vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  /*
   * Beide Buttons liegen im selben Formular, damit sie sich das
   * E-Mail-Feld teilen — sonst müsste die Adresse doppelt gepflegt
   * werden. Welcher gedrückt wurde, steht im `name`/`value` des
   * Submitters.
   */
  if (formData.get("absicht") === "erneut") {
    return erneutSenden(vorher, formData);
  }

  const roh = {
    email: String(formData.get("email") ?? ""),
    code: String(formData.get("code") ?? ""),
  };

  const geprueft = bestaetigungSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte: { email: roh.email },
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: geprueft.data.email,
    token: geprueft.data.code,
    type: "email",
  });

  if (error || !data.session) {
    if (error) protokolliereAuthFehler("verifyOtp/email", error);
    return {
      status: "fehler",
      nachricht: error
        ? authFehlerText(error, await holeAuthTexte())
        : "Der Code liess sich nicht bestätigen. Fordere einen neuen an.",
      felder: {},
      werte: { email: geprueft.data.email },
    };
  }

  const ergebnis = await stelleBetriebSicher(
    supabase,
    data.session.user.user_metadata ?? {},
  );

  /*
   * Ab hier ist die Adresse bestätigt und die Sitzung steht — zurück zur
   * Registrierung zu schicken wäre falsch, das Konto gibt es ja schon.
   * Deshalb bleibt die Person auf dieser Seite und bekommt gesagt, was
   * fehlt.
   */
  if (ergebnis.art === "daten-fehlen") {
    return {
      status: "fehler",
      nachricht:
        "Deine E-Mail-Adresse ist bestätigt, aber die Betriebsdaten sind unterwegs verloren gegangen. Meld dich beim Support — dein Konto bleibt bestehen.",
      felder: {},
      werte: { email: geprueft.data.email },
    };
  }

  if (ergebnis.art === "fehler") {
    return {
      status: "fehler",
      nachricht:
        "Deine E-Mail-Adresse ist bestätigt, aber der Betrieb liess sich nicht anlegen. Versuch es gleich noch einmal — bleibt der Fehler, meld dich beim Support.",
      felder: {},
      werte: { email: geprueft.data.email },
    };
  }

  /*
   * Ab hier steht der Betrieb, "angelegt" und "vorhanden" sind
   * gleichwertig. Weiter über `/einrichtung`, das den offenen Schritt
   * selbst ermittelt — im Normalfall die Zahlung.
   *
   * Früher wurde hier die Checkout-Sitzung angelegt und auf Stripe
   * weitergeleitet. Das ist mit dem eingebetteten Zahlungsschritt
   * entfallen: die Zahlung ist überspringbar, also darf sie nicht mehr
   * zwischen Bestätigung und Einrichtung stehen.
   */

  /*
   * Zustimmung festhalten — in derselben Aktion, die den Betrieb anlegt,
   * nicht als zweiter Schritt, der für sich fehlschlagen kann.
   *
   * Fehlt der Eintrag in den Metadaten, wurde das Formular nie
   * durchlaufen: so entstehen die über `auth.admin.createUser()`
   * angelegten Testkonten. Die bekommen dann auch keine
   * Zustimmungszeile, und das ist richtig so — siehe
   * `src/lib/zustimmung.ts`.
   *
   * Schlägt das Schreiben fehl, hält es die Einrichtung **nicht** auf:
   * Konto und Betrieb stehen an dieser Stelle bereits, und jemanden
   * hier steckenzulassen hiesse, ihm ein halbes Konto zu hinterlassen
   * (Entscheidung des Betreibers, 2026-09-12).
   *
   * Der Fehler wird dabei nicht mehr stillschweigend geschluckt: er steht
   * im Serverprotokoll (`[zustimmung] …`), und die fehlende Zeile fängt
   * ab jetzt das Zustimmungs-Tor auf — vor dem `team`-Schritt des
   * Steppers (`verlangeZustimmungVorMitarbeiterdaten` in `einrichtung.ts`)
   * und vor dem Dashboard (`pruefeZustimmung` in `dashboard/zugang.ts`).
   * Damit liegt vor jeder Verarbeitung betrieblicher Mitarbeiterdaten ein
   * Nachweis vor (Audit-Punkt 13), ohne die Einrichtung an einem
   * Schreibfehler scheitern zu lassen.
   */
  const zustimmungVersionen = zustimmungAusMetadaten(data.session.user.user_metadata);
  if (zustimmungVersionen) {
    await schreibeZustimmungen(
      supabase,
      ergebnis.betriebId,
      data.session.user.id,
      zustimmungVersionen,
      zustimmungNachweisAusMetadaten(data.session.user.user_metadata),
    );
  }

  const promoCode = promoCodeAusMetadaten(data.session.user.user_metadata);
  if (promoCode) await schreibePromoCode(supabase, ergebnis.betriebId, promoCode);

  // Ab hier trägt `user_metadata` die Daten; der Merker wäre ein zweiter Speicherort.
  await vergissBetriebsdaten();
  redirect("/einrichtung");
}

/**
 * Schickt den Bestätigungscode noch einmal.
 *
 * Kein `emailRedirectTo`: die Vorlage verschickt `{{ .Token }}` und
 * enthält gar keinen Link mehr, den ein Redirect-Ziel bräuchte.
 */
export async function erneutSenden(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const geprueft = passwortVergessenSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht:
        "Ohne E-Mail-Adresse lässt sich nichts erneut verschicken. Geh zurück zur Registrierung.",
      felder: feldFehler(geprueft.error, await holeValidierung()),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: geprueft.data.email,
  });

  if (error) {
    protokolliereAuthFehler("resend", error);
    return { status: "fehler", nachricht: authFehlerText(error, await holeAuthTexte()), felder: {} };
  }

  return {
    status: "erfolg",
    nachricht: "Ein neuer Code ist unterwegs. Schau auch im Spam-Ordner nach.",
    felder: {},
  };
}

/* ------------------------------------------------------------------ */
/* Abschnitt A: Betriebs- und Zugangsdaten                             */
/* ------------------------------------------------------------------ */

function text(formData: FormData, feld: string): string {
  const wert = formData.get(feld);
  return typeof wert === "string" ? wert : "";
}

export async function registrieren(
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const roh = {
    betrieb_name: text(formData, "betrieb_name"),
    land: text(formData, "land"),
    vorname: text(formData, "vorname"),
    nachname: text(formData, "nachname"),
    email: text(formData, "email"),
    passwort: text(formData, "passwort"),
    wiederholung: text(formData, "wiederholung"),
    zustimmung: text(formData, "zustimmung"),
    promo_code: text(formData, "promo_code"),
  };

  // Nach einem Fehler wird das Formular wieder gefüllt — Passwörter nie.
  const werte = {
    betrieb_name: roh.betrieb_name,
    land: roh.land,
    vorname: roh.vorname,
    nachname: roh.nachname,
    email: roh.email,
    zustimmung: roh.zustimmung,
    promo_code: roh.promo_code,
  };

  const geprueft = registrierungSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      status: "fehler",
      nachricht: null,
      felder: feldFehler(geprueft.error, await holeValidierung()),
      werte,
    };
  }

  const daten = geprueft.data;
  const supabase = await createClient();

  /*
   * Vor dem `signUp`, nicht danach: ein Vertipper soll am Feld auffallen,
   * solange die Person noch im Formular steht — nach dem Absenden ist
   * die Mail schon unterwegs.
   */
  if (daten.promo_code && (await pruefePromoCode(supabase, daten.promo_code)) === "unbekannt") {
    return {
      status: "fehler",
      nachricht: null,
      felder: { promo_code: (await holeValidierung())["v.promo.unbekannt"] },
      werte,
    };
  }

  /*
   * Die Betriebsdaten reisen in `options.data` mit. `registriere_betrieb`
   * braucht eine Session, die es erst nach der E-Mail-Bestätigung gibt —
   * sie müssen also die Bestätigungsmail überleben. Angelegt wird der
   * Betrieb später, sobald der Code auf /auth/bestaetigen stimmt.
   *
   * Kein `emailRedirectTo`: die Vorlage verschickt `{{ .Token }}` und
   * enthält keinen Link, für den ein Rücksprungziel nötig wäre.
   */
  const { error } = await supabase.auth.signUp({
    email: daten.email,
    password: daten.passwort,
    options: {
      data: {
        betrieb_name: daten.betrieb_name,
        land: daten.land,
        vorname: daten.vorname,
        nachname: daten.nachname,
        /*
         * Die Zustimmung reist mit, weil der Betrieb erst nach der
         * Bestätigung entsteht — vorher gibt es keine `betrieb_id`, an
         * der eine Zustimmungszeile hängen könnte. Mitgeführt werden die
         * **Fassungen**, damit später nicht eine andere eingetragen wird
         * als die, der jemand tatsächlich zugestimmt hat.
         */
        [ZUSTIMMUNG_METADATEN_SCHLUESSEL]: aktuelleZustimmungVersionen(),
        [ZUSTIMMUNG_NACHWEIS_SCHLUESSEL]: { sprache: await leseSprache(), hashes: await zustimmungHashes() },
        // Ohne Code gar kein Schlüssel — ein leerer String wäre eine Angabe.
        ...(daten.promo_code ? { [PROMO_METADATEN_SCHLUESSEL]: daten.promo_code } : {}),
      },
    },
  });

  if (error) {
    protokolliereAuthFehler("signUp", error);
    return {
      status: "fehler",
      nachricht: authFehlerText(error, await holeAuthTexte()),
      felder: {},
      werte,
    };
  }

  /*
   * Gibt es die Adresse bereits, liefert Supabase bei aktivierter
   * Bestätigungspflicht trotzdem einen Erfolg zurück und verschickt
   * stattdessen einen Hinweis an den bestehenden Account. Das ist
   * Absicht: sonst liesse sich über diese Seite herausfinden, wer
   * registriert ist. Wir behandeln beide Fälle deshalb gleich.
   */
  /*
   * Die vier Betriebsfelder für den aufklappbaren Abschnitt „Angaben
   * zum Betrieb ändern". Sie liegen zwar schon in `user_metadata`, sind
   * dort aber bis zur Bestätigung nicht lesbar — es gibt noch keine
   * Session. Die Begründung steht ausführlich in `registrierung-merker.ts`.
   */
  await merkeBetriebsdaten({
    betrieb_name: daten.betrieb_name,
    land: daten.land,
    vorname: daten.vorname,
    nachname: daten.nachname,
    promo_code: daten.promo_code,
  });

  /*
   * Bleibt auf dieser Route. Der Parameter klappt Abschnitt B auf und
   * fuellt die Adresse vor — deshalb eine Weiterleitung und kein
   * Client-Zustand: so uebersteht der Schritt einen Reload, und der Link
   * fuehrt auf einem zweiten Geraet an dieselbe Stelle.
   */
  redirect(`/einrichtung/konto?email=${encodeURIComponent(daten.email)}`);
}

/* ------------------------------------------------------------------ */
/* Nachzügler: Konto steht, Betrieb fehlt                              */
/* ------------------------------------------------------------------ */

/**
 * Legt den Betrieb nachträglich an.
 *
 * Gebraucht für den Fall, den CLAUDE.md ausdrücklich benennt: die
 * Adresse ist bestätigt, aber `registriere_betrieb` ist danach
 * fehlgeschlagen. Diese Person hat eine Session und keinen Betrieb —
 * ihr das Registrierungsformular hinzustellen wäre falsch, denn das
 * Konto existiert bereits, und ein zweiter `signUp` auf dieselbe Adresse
 * käme nicht durch.
 *
 * Die Betriebsdaten liegen weiterhin in `user_metadata`, wo sie die
 * Bestätigungsmail überlebt haben. `stelleBetriebSicher` prüft sie noch
 * einmal gegen dieselben Zod-Regeln und legt genau einmal an.
 */
export async function betriebNachtragen(
  _vorher: FormZustand,
  _formData: FormData,
): Promise<FormZustand> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/einrichtung/konto");

  const ergebnis = await stelleBetriebSicher(supabase, user.user_metadata ?? {});

  if (ergebnis.art === "daten-fehlen") {
    return {
      status: "fehler",
      nachricht:
        "Die Angaben zu deinem Betrieb sind nicht mehr auffindbar. Meld dich beim Support — dein Konto bleibt bestehen, es muss nur der Betrieb von Hand angelegt werden.",
      felder: {},
    };
  }

  if (ergebnis.art === "fehler") {
    return {
      status: "fehler",
      nachricht:
        "Der Betrieb liess sich gerade nicht anlegen. Versuch es gleich noch einmal — bleibt der Fehler, meld dich beim Support.",
      felder: {},
    };
  }

  /*
   * Zustimmung festhalten — in derselben Aktion, die den Betrieb anlegt,
   * nicht als zweiter Schritt, der für sich fehlschlagen kann.
   *
   * Fehlt der Eintrag in den Metadaten, wurde das Formular nie
   * durchlaufen: so entstehen die über `auth.admin.createUser()`
   * angelegten Testkonten. Die bekommen dann auch keine
   * Zustimmungszeile, und das ist richtig so — siehe
   * `src/lib/zustimmung.ts`.
   *
   * Schlägt das Schreiben fehl, hält es die Einrichtung **nicht** auf:
   * Konto und Betrieb stehen an dieser Stelle bereits, und jemanden
   * hier steckenzulassen hiesse, ihm ein halbes Konto zu hinterlassen
   * (Entscheidung des Betreibers, 2026-09-12).
   *
   * Der Fehler wird dabei nicht mehr stillschweigend geschluckt: er steht
   * im Serverprotokoll (`[zustimmung] …`), und die fehlende Zeile fängt
   * ab jetzt das Zustimmungs-Tor auf — vor dem `team`-Schritt des
   * Steppers (`verlangeZustimmungVorMitarbeiterdaten` in `einrichtung.ts`)
   * und vor dem Dashboard (`pruefeZustimmung` in `dashboard/zugang.ts`).
   * Damit liegt vor jeder Verarbeitung betrieblicher Mitarbeiterdaten ein
   * Nachweis vor (Audit-Punkt 13), ohne die Einrichtung an einem
   * Schreibfehler scheitern zu lassen.
   */
  const zustimmungVersionen = zustimmungAusMetadaten(user.user_metadata);
  if (zustimmungVersionen) {
    await schreibeZustimmungen(
      supabase,
      ergebnis.betriebId,
      user.id,
      zustimmungVersionen,
      zustimmungNachweisAusMetadaten(user.user_metadata),
    );
  }

  const promoCode = promoCodeAusMetadaten(user.user_metadata);
  if (promoCode) await schreibePromoCode(supabase, ergebnis.betriebId, promoCode);

  redirect("/einrichtung");
}
