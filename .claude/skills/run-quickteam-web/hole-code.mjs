#!/usr/bin/env node
/**
 * Holt einen echten OTP-Code für die Registrierungs-Bestätigung eines NEUEN
 * Test-Kontos, ohne dass eine Mail zugestellt werden muss — nötig, weil
 * dieser Container keine Postfächer erreicht.
 *
 * Nutzt den service_role-Key (nur lokal aus .env.local gelesen, nie
 * ausgegeben) und `auth.admin.generateLink()`. `properties.email_otp` ist
 * exakt der Code, den ein echter Nutzer aus der Mail abtippen würde
 * (8 Ziffern, siehe CODE_LAENGE in src/lib/validierung.ts). Ein Aufruf hier
 * ersetzt eine Mail, er umgeht keine Prüfung: `verifyOtp` auf der Website
 * prüft den Code danach ganz normal gegen Supabase.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Absichtlich NICHT unterstützt: type "recovery".
 * ─────────────────────────────────────────────────────────────────────────
 * "recovery" erzeugt einen Code, der über /passwort-neu das Passwort eines
 * BESTEHENDEN Kontos ändert. Kein Verifikations-Workflow darf ein echtes
 * Passwort zurücksetzen — deshalb ist der Typ hier fest gesperrt, nicht nur
 * per Doku empfohlen dagegen. Für Login-Tests: ein dediziertes Test-Konto
 * mit bekanntem Passwort verwenden (siehe SKILL.md, Abschnitt „Anmelden").
 * Für ein neues Konto: "signup"/"email" — das legt etwas Neues an, statt
 * etwas Bestehendes zu verändern.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Sicherheitssperre: nur gegen ein als lokal/dev/test erkanntes Projekt.
 * ─────────────────────────────────────────────────────────────────────────
 * `auth.admin.generateLink()` ist eine Admin-Funktion, die auf einem
 * produktiven oder geteilten Projekt echte Konten betrifft. Laut CLAUDE.md
 * ist das in .env.local hinterlegte Supabase-Projekt dieses Repos das EINE
 * geteilte Projekt für Website und App, mit echten Nutzerkonten — kein
 * Testprojekt. Das Skript bricht deshalb ab, ausser:
 *   - die URL zeigt auf localhost/127.0.0.1 (ein lokal per `supabase start`
 *     laufender Stack), oder
 *   - die Umgebungsvariable QT_CONFIRM_TEST_SUPABASE_REF ist explizit auf
 *     den Projekt-Ref gesetzt — ein bewusster, von einem Menschen getippter
 *     Beleg dafür, dass genau dieses Projekt geprüft und als Test-/Dev-
 *     Projekt bestätigt wurde. Nicht selbst setzen, ohne das geprüft zu
 *     haben.
 *
 * Usage:
 *   node hole-code.mjs <email> [email|signup]
 *
 * - email/signup → für die Registrierungs-Bestätigung eines neuen Kontos
 *   (Schritt 1 des Steppers). Beide Werte erzeugen denselben Code.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const hierDatei = fileURLToPath(import.meta.url);
// Von .claude/skills/run-quickteam-web/ zwei Ebenen hoch zum Projekt-Root,
// wo .env.local liegt (nicht das cwd — der Aufrufer steht oft anderswo,
// siehe „Warum aus einem anderen Verzeichnis heraus" in SKILL.md).
const projektWurzel = resolve(dirname(hierDatei), "../../..");

const email = process.argv[2];
const typ = process.argv[3] ?? "signup";

if (!email) {
  console.error("Usage: node hole-code.mjs <email> [email|signup]");
  process.exit(1);
}

if (typ === "recovery") {
  console.error(
    "Abgebrochen: 'recovery' wird von diesem Skript nicht unterstützt.\n" +
      "Es würde einen Code erzeugen, der ein BESTEHENDES Passwort ändert —\n" +
      "das darf kein Verifikations-Workflow tun. Für Login-Tests ein\n" +
      "dediziertes Test-Konto mit bekanntem Passwort verwenden, für ein\n" +
      "neues Konto 'signup' oder 'email'.",
  );
  process.exit(1);
}

if (typ !== "email" && typ !== "signup") {
  console.error(`Unbekannter Typ '${typ}'. Erlaubt: email, signup.`);
  process.exit(1);
}

const envDatei = resolve(projektWurzel, ".env.local");
const envInhalt = readFileSync(envDatei, "utf8");
const env = {};
for (const zeile of envInhalt.split(/\r?\n/)) {
  const treffer = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
  if (treffer) env[treffer[1]] = treffer[2];
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local",
  );
  process.exit(1);
}

/**
 * Bricht ab, ausser das Projekt ist eindeutig lokal oder von einem Menschen
 * ausdrücklich als Test-/Dev-Projekt bestätigt. Gibt nie den Key aus — nur
 * Host und Projekt-Ref, beides Teil der ohnehin öffentlichen URL.
 */
function pruefeTestUmgebung(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname;
  const istLokal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  if (istLokal) return;

  const projektRef = host.split(".")[0];
  const bestaetigt = process.env.QT_CONFIRM_TEST_SUPABASE_REF;
  if (bestaetigt && bestaetigt === projektRef) return;

  console.error(
    [
      "Abgebrochen: Supabase-Projekt ist nicht als lokal/dev/test erkannt.",
      `Host: ${host}`,
      "",
      "auth.admin.generateLink() betrifft auf einem produktiven oder",
      "geteilten Projekt echte Konten. Laut CLAUDE.md ist dieses Projekt",
      "das EINE geteilte Backend für Website und App mit echten",
      "Nutzerkonten — kein Testprojekt.",
      "",
      "Nur ausführen, wenn:",
      "  - die URL auf localhost/127.0.0.1 zeigt, oder",
      "  - nach eigener Prüfung bestätigt ist, dass dieses konkrete Projekt",
      "    wirklich ein Test-/Dev-Projekt ist:",
      `      QT_CONFIRM_TEST_SUPABASE_REF=${projektRef} node hole-code.mjs ...`,
    ].join("\n"),
  );
  process.exit(1);
}

pruefeTestUmgebung(env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// generateLink erwartet für den Bestätigungsfall "signup", nicht "email" —
// anders als verifyOtp auf der Website (das dort bewusst "email" nimmt,
// siehe CLAUDE.md „Bestätigung läuft über Codes"). Der Code, den GoTrue
// erzeugt, ist trotzdem derselbe Code, den verifyOtp mit type "email" prüft.
const generateTyp = typ === "email" ? "signup" : typ;

const { data, error } = await supabase.auth.admin.generateLink({
  type: generateTyp,
  email,
});

if (error) {
  console.error(`generateLink fehlgeschlagen: ${error.message}`);
  process.exit(1);
}

if (!data.properties?.email_otp) {
  console.error("Antwort enthielt keinen email_otp — Supabase-Version geändert?");
  process.exit(1);
}

console.log(data.properties.email_otp);
