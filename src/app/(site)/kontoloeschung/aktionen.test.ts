import assert from "node:assert/strict";
import { mock, test, beforeEach } from "node:test";
import type { Position } from "@/lib/dashboard/position";

let positionen: Position[] = [];
let aufrufe: string[] = [];
let aboFehler = false;
let loeschFehler = false;
let kuendigungsFehler = false;
let angemeldet = true;
let anmeldeFehler: { code?: string; status?: number; message: string } | null = null;
/** Mitgeschriebene `trotzSoftLaunch`-Werte — die Sperre darf hier nicht greifen. */
let riegelFrei: boolean[] = [];

const client = {
  auth: {
    getUser: async () => ({
      data: { user: angemeldet ? { id: "u", email: "test@example.invalid" } : null },
    }),
    signOut: async () => { aufrufe.push("signOut"); },
    signInWithPassword: async ({ email }: { email: string }) => {
      aufrufe.push(`anmelden:${email}`);
      return { error: anmeldeFehler };
    },
  },
  rpc: async (name: string) => {
    aufrufe.push(name);
    return { error: loeschFehler ? { message: "CHEF_MIT_MITGLIEDERN" } : null };
  },
};
mock.module("next/navigation", { namedExports: { redirect: (url: string) => { throw new Error(`redirect:${url}`); } } });
/*
 * Gemockt wird `createClientOhneRiegel` — genau die Funktion, die die
 * Aktionen benutzen. Stünde hier nur `createClient`, liefe der Test still
 * am Riegel vorbei und bewiese nichts.
 */
mock.module("@/lib/supabase/server", { namedExports: {
  createClient: async () => { aufrufe.push("MIT-RIEGEL"); return client; },
  createClientOhneRiegel: async () => client,
} });
mock.module("@/lib/dashboard/position", { namedExports: {
  holePositionen: async () => positionen,
  loescheAktivePosition: async () => { aufrufe.push("cookieLoeschen"); },
} });
mock.module("@/lib/abo", { namedExports: { holeAbo: async (_: unknown, id: string) => {
  aufrufe.push(`pruefe:${id}`);
  return aboFehler ? null : { stripe_customer_id: `kunde-${id}` };
} } });
mock.module("@/lib/stripe", { namedExports: {
  holeAboFuerBetrieb: async ({ betriebId, trotzSoftLaunch }: { betriebId: string; trotzSoftLaunch?: boolean }) => {
    riegelFrei.push(trotzSoftLaunch === true);
    return { id: `abo-${betriebId}` };
  },
  kuendigeAbo: async (id: string, trotzSoftLaunch?: boolean) => {
    riegelFrei.push(trotzSoftLaunch === true);
    aufrufe.push(`kuendige:${id}`);
    if (kuendigungsFehler) throw new Error("Stripe nicht erreichbar");
  },
} });
mock.module("@/i18n/server", { namedExports: {
  holeValidierung: async () => ({}),
  holeAuthTexte: async () => ({ zugangsdaten: "Zugangsdaten stimmen nicht.", unbekannt: "Unbekannt." }),
} });

const { kontoLoeschen, anmeldenZurLoeschung, loeschungAbbrechen } = await import("./aktionen");

const chef = (id: string): Position => ({ mitarbeiterId: id, betriebId: id, betriebName: id, name: id, rolleTyp: "chef" });
const vorher = { status: "leer" as const, nachricht: null, felder: {} };
function formular(bestaetigung = "a") {
  const f = new FormData(); f.set("bestaetigung", bestaetigung); f.set("erwartet", bestaetigung); return f;
}
function anmeldung(email = "test@example.invalid", passwort = "geheim-genug") {
  const f = new FormData(); f.set("email", email); f.set("passwort", passwort); return f;
}
beforeEach(() => {
  positionen = [chef("a"), chef("b")];
  aufrufe = []; riegelFrei = [];
  aboFehler = false; loeschFehler = false; kuendigungsFehler = false;
  angemeldet = true; anmeldeFehler = null;
});

test("Alle geleiteten Betriebe prüfen und erst nach erfolgreicher Löschung kündigen", async () => {
  positionen.push({ ...chef("a"), mitarbeiterId: "a2" });
  await assert.rejects(kontoLoeschen(vorher, formular()), /redirect:\/\?geloescht=1/);
  assert.deepEqual(aufrufe, ["pruefe:a", "pruefe:b", "konto_selbst_loeschen", "kuendige:abo-a", "kuendige:abo-b", "cookieLoeschen", "signOut"]);
});
test("Manipuliertes Bestätigungswort aus hidden input autorisiert keine Löschung", async () => {
  assert.equal((await kontoLoeschen(vorher, formular("falsch"))).status, "fehler");
  assert.deepEqual(aufrufe, []);
});
test("Unlesbarer Abostatus verhindert irreversible Kontolöschung", async () => {
  aboFehler = true;
  assert.equal((await kontoLoeschen(vorher, formular())).status, "fehler");
  assert.deepEqual(aufrufe, ["pruefe:a"]);
});
test("Verweigerte Kontolöschung kündigt keine laufenden Abonnements", async () => {
  loeschFehler = true;
  assert.equal((await kontoLoeschen(vorher, formular())).status, "fehler");
  assert.deepEqual(aufrufe, ["pruefe:a", "pruefe:b", "konto_selbst_loeschen"]);
});
test("Reines Mitarbeiterkonto braucht keine Aboverwaltung", async () => {
  positionen = [{ ...chef("a"), rolleTyp: "mitarbeiter" }];
  await assert.rejects(kontoLoeschen(vorher, formular("test@example.invalid")), /redirect:/);
  assert.deepEqual(aufrufe, ["konto_selbst_loeschen", "cookieLoeschen", "signOut"]);
});

test("Fehlgeschlagene Kündigung meldet offenen Handlungsbedarf und versucht weitere Abos", async () => {
  kuendigungsFehler = true;
  await assert.rejects(kontoLoeschen(vorher, formular()), /abo-kuendigung-offen/);
  assert.ok(aufrufe.includes("kuendige:abo-b"));
  assert.ok(aufrufe.includes("signOut"));
});

/* ---- Soft-Launch: die Löschung muss auch bei geschlossener Sperre laufen ---- */

test("Jeder Stripe-Aufruf der Löschung geht ausdrücklich am Soft-Launch-Riegel vorbei", async () => {
  await assert.rejects(kontoLoeschen(vorher, formular()), /redirect:/);
  // zwei Betriebe: je ein holeAboFuerBetrieb und ein kuendigeAbo
  assert.equal(riegelFrei.length, 4);
  assert.ok(riegelFrei.every(Boolean), "ein Aufruf lief ohne trotzSoftLaunch — unter Soft-Launch bricht die Löschung dort ab");
});

test("Keine Aktion greift zum Client mit Riegel", async () => {
  await assert.rejects(kontoLoeschen(vorher, formular()), /redirect:/);
  assert.ok(!aufrufe.includes("MIT-RIEGEL"));
});

/* ---- Stufe 1: Anmeldung auf der Seite selbst ---- */

test("Erfolgreiche Anmeldung führt auf die Folgen-Stufe, nicht direkt aufs Löschen", async () => {
  await assert.rejects(
    anmeldenZurLoeschung(vorher, anmeldung()),
    /redirect:\/kontoloeschung\?schritt=folgen/,
  );
  assert.deepEqual(aufrufe, ["anmelden:test@example.invalid"]);
});

test("Falsche Zugangsdaten löschen nichts und geben das Passwort nicht zurück", async () => {
  anmeldeFehler = { code: "invalid_credentials", message: "Invalid login credentials" };
  const zustand = await anmeldenZurLoeschung(vorher, anmeldung());
  assert.equal(zustand.status, "fehler");
  assert.equal(zustand.werte?.["passwort"], undefined);
  assert.ok(!aufrufe.includes("konto_selbst_loeschen"));
});

test("Ungültige E-Mail kommt gar nicht erst bis zur Anmeldung", async () => {
  const zustand = await anmeldenZurLoeschung(vorher, anmeldung("keine-adresse"));
  assert.equal(zustand.status, "fehler");
  assert.deepEqual(aufrufe, []);
});

/* ---- Abbrechen und abgelaufene Sitzung ---- */

test("Abbrechen löst die Sitzung auf, statt sie offen liegen zu lassen", async () => {
  await assert.rejects(loeschungAbbrechen(), /redirect:\//);
  assert.deepEqual(aufrufe, ["signOut", "cookieLoeschen"]);
});

test("Ohne Sitzung führt das Löschformular zurück an den Anfang, nicht auf /login", async () => {
  angemeldet = false;
  await assert.rejects(kontoLoeschen(vorher, formular()), /redirect:\/kontoloeschung$/);
  assert.ok(!aufrufe.includes("konto_selbst_loeschen"));
});
