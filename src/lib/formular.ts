import type { AuthError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

import type { Dictionary } from "@/i18n/de";
import { loeseMeldung, type Textblock } from "@/i18n/text";

/**
 * Rückgabewert aller Server Actions in diesem Projekt. `useActionState`
 * reicht ihn unverändert ins Formular zurück.
 *
 * `felder` trägt Meldungen pro Eingabefeld, `nachricht` alles, was sich
 * keinem Feld zuordnen lässt. `werte` füllt das Formular nach einem
 * Fehler wieder — Passwörter kommen dort nie hinein.
 */
export type FormZustand = {
  status: "leer" | "fehler" | "erfolg";
  nachricht: string | null;
  felder: Record<string, string>;
  werte?: Record<string, string>;
};

export const leererZustand: FormZustand = {
  status: "leer",
  nachricht: null,
  felder: {},
};

/**
 * Erste Meldung je Feld. Mehr als eine hilft beim Ausfüllen nicht.
 *
 * `issue.message` trägt seit der Zweisprachigkeit einen **Schlüssel**
 * und keinen Satz — `src/i18n/text.ts` erklärt, warum. Hier ist die eine
 * Stelle, an der eine Server Action ihn auflöst; `pruefeFeld()` ist die
 * andere, für den Browser.
 */
export function feldFehler(error: ZodError, texte: Textblock): Record<string, string> {
  const felder: Record<string, string> = {};
  for (const issue of error.issues) {
    const feld = issue.path[0];
    if (typeof feld === "string" && !(feld in felder)) {
      felder[feld] = loeseMeldung(issue.message, texte);
    }
  }
  return felder;
}

/**
 * Übersetzt Supabase-Fehler in Sätze, die sagen, was passiert ist und was
 * zu tun ist. Kein „Ups", keine Entschuldigung, kein englischer Rohtext.
 *
 * Unbekannte Codes bekommen eine ehrliche Sammelmeldung statt einer
 * geratenen Ursache.
 */
export function authFehlerText(error: AuthError, texte: Dictionary["auth"]): string {
  /*
   * Serverfehler zuerst — und zwar über `status`, nicht über `code`.
   * Bei einem 500er aus GoTrue ist `error.code` regelmässig gar nicht
   * gesetzt; übrig bleiben Status und Klartext. Eine Verzweigung nur auf
   * `code` läuft hier ins Leere.
   *
   * ─────────────────────────────────────────────────────────────────
   *  Scheitert der Mailversand, entsteht **kein** Konto.
   * ─────────────────────────────────────────────────────────────────
   *
   * Hier stand bis zum 2026-08-29 „Dein Konto wurde angelegt, aber die
   * Bestätigungsmail liess sich nicht verschicken". Das ist falsch, und
   * zwar in der teuersten Richtung: GoTrue führt `/signup` samt
   * Mailversand in einem Zug aus und **rollt den Benutzer zurück**, wenn
   * die Mail nicht rausgeht. Am 2026-08-29 zweimal nachgesehen — nach
   * dem Fehler steht in `auth.users` nichts.
   *
   * Wer den alten Satz las, wartete also auf eine Mail für ein Konto,
   * das es nicht gibt, und versuchte es genau nicht noch einmal. Die
   * Meldung muss deshalb sagen, dass nichts entstanden ist.
   *
   * **Die Ursache steht nicht in `error.message`.** GoTrue reicht nur
   * „Error sending confirmation email" durch; der eigentliche
   * SMTP-Grund — am 2026-08-29 ein `550` von Resend, weil dort keine
   * Absenderdomain verifiziert ist und nur an die eigene Adresse des
   * Kontos zugestellt wird — steht ausschliesslich in den `auth_logs`
   * des Supabase-Projekts. Wer den Fehler sucht, sucht ihn dort und
   * nicht im Anwendungslog.
   */
  if (error.code === "unexpected_failure" || error.status === 500) {
    if (/mail/i.test(error.message)) {
      return texte.serverMail;
    }
    return texte.server;
  }

  /*
   * ─────────────────────────────────────────────────────────────────
   *  „Invalid API key" ist ein Konfigurationsfehler, kein Anmeldefehler
   * ─────────────────────────────────────────────────────────────────
   *
   * Passt `NEXT_PUBLIC_SUPABASE_ANON_KEY` nicht zum Projekt, antwortet
   * GoTrue mit **401 und ohne `code`**. Beides zusammen führte bis zum
   * 2026-09-17 am 500er-Zweig vorbei und durch den `switch` hindurch in
   * `default` — also in „Das hat nicht geklappt. Versuch es noch
   * einmal." Das ist die teuerste Antwort, die hier möglich ist: der
   * Versuch **kann** nicht gelingen, egal wie oft, und die Meldung
   * schickt den Benutzer zum Support, während der Fehler in unserer
   * Umgebung steht. Dieselbe Falle wie bei `signup_disabled` unten.
   *
   * Aufgefallen ist es an `/kontoloeschung`: die Seite prüft als einzige
   * während des Soft-Launches ein Passwort, war also die erste, an der
   * ein falscher Key überhaupt sichtbar werden konnte. Die übrigen
   * Auth-Routen sind gesperrt — der Key war schon vorher falsch, nur hat
   * es niemand gemerkt.
   *
   * Gemeldet wird es als Serverfehler, weil es einer ist. Ein eigener
   * Satz im Wörterbuch wäre falsch: dem Benutzer hilft die
   * Unterscheidung nicht, und `protokolliereAuthFehler()` nennt die
   * Ursache im Protokoll beim Namen.
   */
  if (error.status === 401 && /invalid api key/i.test(error.message)) {
    return texte.server;
  }

  switch (error.code) {
    case "invalid_credentials":
      return texte.zugangsdaten;
    case "email_not_confirmed":
      return texte.nichtBestaetigt;
    case "over_email_send_rate_limit":
      return texte.zuVieleMails;
    case "over_request_rate_limit":
      return texte.zuVieleVersuche;
    case "weak_password":
      return texte.schwachesPasswort;
    case "same_password":
      return texte.gleichesPasswort;
    /*
     * Derselbe Code deckt „abgelaufen" und „stimmt nicht" ab — GoTrue
     * unterscheidet das nach aussen nicht, und das ist auch richtig so:
     * eine Unterscheidung verriete, ob ein Code für diese Adresse
     * überhaupt offen ist.
     */
    case "otp_expired":
      return texte.codeAbgelaufen;
    case "validation_failed":
      return texte.unvollstaendig;
    /*
     * Registrierung projektweit abgeschaltet — Supabase-Dashboard unter
     * Authentication → Sign In / Providers → Email, am 2026-09-07 über
     * `/auth/v1/settings` bestätigt (`disable_signup: true`).
     *
     * Ohne eigenen Zweig landete das im `default` darunter: „Versuch es
     * noch einmal." Das ist die falscheste aller Antworten — der Versuch
     * kann nicht gelingen, egal wie oft. Aus dem Test kam die
     * Rückmeldung entsprechend als „Betrieb erstellen ist deaktiviert",
     * ohne dass jemand hätte sagen können, woran es liegt.
     *
     * Die Sperre selbst wird von hier aus **nicht** angefasst: sie steht
     * in der Projektkonfiguration, nicht im Code, und passt zum
     * Soft-Launch. Geändert ist nur, dass sie sich zu erkennen gibt.
     * Siehe `docs/backend-befunde-2026-09-07.md`, Punkt 11.
     */
    case "signup_disabled":
      return texte.registrierungAus;
    default:
      return texte.unbekannt;
  }
}

/**
 * Schreibt den Originalfehler ins Server-Log.
 *
 * Ohne das bleibt von einem Supabase-Fehler nur der übersetzte Satz für
 * die Oberfläche übrig — im Terminal steht dann bloss `POST /registrieren
 * 200` und die eigentliche Ursache ist weg. Genau daran ist die Diagnose
 * des SMTP-Problems zuerst gescheitert.
 */
export function protokolliereAuthFehler(wo: string, error: AuthError): void {
  console.error(
    `[auth] ${wo}: code=${error.code ?? "—"} status=${error.status ?? "—"} — ${error.message}`,
  );

  /*
   * Eine Zeile mehr, die den Unterschied macht. Die Zeile oben nennt bei
   * einem falschen Key nur „status=401 — Invalid API key" — richtig, aber
   * leicht als Anmeldefehler misszulesen. Hier steht, wo zu suchen ist:
   * nicht am Konto, sondern in der Umgebung. Der **Name** der Variablen
   * gehört ins Protokoll, ihr Wert nie (`.claude/rules/security.md`).
   */
  if (error.status === 401 && /invalid api key/i.test(error.message)) {
    console.error(
      "[auth] Ursache ist die Umgebung, nicht das Konto: NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "gehört nicht zu NEXT_PUBLIC_SUPABASE_URL. Richtigen Wert im Supabase-Dashboard " +
        "unter Project Settings → API Keys holen. Kein Anmeldeversuch kann gelingen, bis das stimmt.",
    );
  }
}
