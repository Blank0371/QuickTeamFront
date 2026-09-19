import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuthError } from "@supabase/supabase-js";

import { authFehlerText } from "./formular";

/**
 * `authFehlerText()` — und vor allem: was **nicht** in `unbekannt` fallen darf.
 *
 * Der Sammelfall ist ehrlich, solange er selten ist. Gefährlich wird er,
 * wenn ein Fehler dort landet, den kein Wiederholen behebt: dann sagt die
 * Oberfläche „Versuch es noch einmal", während jeder weitere Versuch
 * zwingend scheitert. Genau das ist am 2026-09-17 auf `/kontoloeschung`
 * passiert — ein projektfremder `NEXT_PUBLIC_SUPABASE_ANON_KEY` kam als
 * 401 ohne `code` zurück und wurde zu „Das hat nicht geklappt."
 */

const texte = {
  serverMail: "SERVER_MAIL",
  server: "SERVER",
  zugangsdaten: "ZUGANGSDATEN",
  nichtBestaetigt: "NICHT_BESTAETIGT",
  zuVieleMails: "ZU_VIELE_MAILS",
  zuVieleVersuche: "ZU_VIELE_VERSUCHE",
  schwachesPasswort: "SCHWACHES_PASSWORT",
  gleichesPasswort: "GLEICHES_PASSWORT",
  codeAbgelaufen: "CODE_ABGELAUFEN",
  unvollstaendig: "UNVOLLSTAENDIG",
  registrierungAus: "REGISTRIERUNG_AUS",
  unbekannt: "UNBEKANNT",
};

/** GoTrue-Fehler nachbauen; `AuthError` ist eine Klasse mit privaten Feldern. */
function fehler(teile: { message: string; status?: number; code?: string }): AuthError {
  return { name: "AuthApiError", ...teile } as unknown as AuthError;
}

test("Falscher API-Key ist ein Serverfehler, nicht der Sammelfall", () => {
  /*
   * So antwortet GoTrue tatsächlich: 401, und `code` fehlt ganz. Am
   * 2026-09-17 gegen das Projekt gemessen, nicht angenommen.
   */
  const gemessen = fehler({ message: "Invalid API key", status: 401 });

  assert.equal(authFehlerText(gemessen, texte), "SERVER");
  assert.notEqual(
    authFehlerText(gemessen, texte),
    "UNBEKANNT",
    "„Versuch es noch einmal\" ist falsch: ohne richtigen Key kann kein Versuch gelingen",
  );
});

test("Falsche Zugangsdaten bleiben ein Zugangsdatenfehler", () => {
  const e = fehler({
    message: "Invalid login credentials",
    status: 400,
    code: "invalid_credentials",
  });
  assert.equal(authFehlerText(e, texte), "ZUGANGSDATEN");
});

test("Serverfehler unterscheidet Mailversand von allem Übrigen", () => {
  assert.equal(
    authFehlerText(fehler({ message: "Error sending confirmation email", status: 500 }), texte),
    "SERVER_MAIL",
  );
  assert.equal(authFehlerText(fehler({ message: "boom", status: 500 }), texte), "SERVER");
});

test("Ein echter Unbekannter landet weiterhin im Sammelfall", () => {
  const e = fehler({ message: "something new", status: 400, code: "brandneu" });
  assert.equal(authFehlerText(e, texte), "UNBEKANNT");
});

test("Ein 401 ohne API-Key-Bezug wird nicht zum Serverfehler umgedeutet", () => {
  /*
   * Die Bedingung prüft Status **und** Text — ein reiner Statusvergleich
   * hätte jeden 401 zum Konfigurationsfehler erklärt.
   */
  const e = fehler({
    message: "Invalid Refresh Token",
    status: 401,
    code: "refresh_token_not_found",
  });
  assert.equal(authFehlerText(e, texte), "UNBEKANNT");
});
