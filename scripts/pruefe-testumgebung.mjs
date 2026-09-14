#!/usr/bin/env node
/**
 * Prüft, ob die geladene Umgebung eine **isolierte Testumgebung** ist —
 * bevor jemand die integrierten Zahlungstests fährt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum es dieses Skript gibt
 * ─────────────────────────────────────────────────────────────────────
 *
 * Am 2026-09-14 lag im Arbeitsverzeichnis eine `.env.local`, die
 * **byteweise identisch** mit `.env.production` war. Ein `npm run dev`
 * hätte damit den lokalen Server gegen die Produktions-Supabase und mit
 * Live-Stripe-Werten laufen lassen — und das Testprotokoll legt Kunden,
 * Abos und Zahlungsmethoden an. Der Unterschied zwischen „Sandbox" und
 * „Produktion" war ein Dateiname.
 *
 * Eine Notiz im Protokoll („bitte darauf achten") ist für so etwas das
 * falsche Mittel. Wer ein Protokoll mit zehn Fällen abarbeitet, prüft
 * nicht bei jedem Schritt die Projekt-Id. Deshalb hier eine Prüfung, die
 * man **ausführt** und die mit Exitcode 1 endet, wenn etwas nicht passt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Beide Seiten, nicht nur Stripe
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ein Stripe-Testschlüssel macht eine verbundene Supabase-Instanz nicht
 * zur Sandbox. Der Zahlungsweg schreibt auf **beiden** Seiten: bei
 * Stripe (Kunde, Anschrift, Steuer-Id, Abo) und in Supabase
 * (`betrieb_abonnements` über den Webhook, `mitarbeiter`,
 * `rechtliche_zustimmungen`). Beide werden deshalb geprüft.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Es wird kein einziger Wert ausgegeben
 * ─────────────────────────────────────────────────────────────────────
 *
 * Geprüft werden Präfixe, Vorhandensein und die Frage „ist das die
 * bekannte Produktions-Id?". Ausgegeben werden nur Befunde. Das ist
 * dieselbe Linie wie in `.claude/rules/security.md`: Vorhandensein
 * prüfen, nie den Wert.
 *
 * Aufruf:
 *
 *     node --env-file=.env.local scripts/pruefe-testumgebung.mjs
 *
 * `--env-file` statt eines eigenen Parsers: Node lädt die Datei selbst,
 * und das Skript sieht nur `process.env` — es liest die Datei nie.
 */

/**
 * Die Referenz des geteilten Produktionsprojekts.
 *
 * Sie steht bereits offen in `CLAUDE.md` und in den Befundberichten; es
 * ist kein Geheimnis, sondern eine Kennung. Sie hier zu führen ist der
 * Kern der Prüfung: ohne sie liesse sich „ist das Produktion?" nicht
 * beantworten, und genau diese Frage soll das Skript beantworten.
 */
const PRODUKTION_SUPABASE_REF = "jqpfuotwsgnqihspsmmf";

const befunde = [];
const fehler = (text) => befunde.push({ art: "fehler", text });
const warnung = (text) => befunde.push({ art: "warnung", text });
const ok = (text) => befunde.push({ art: "ok", text });

const wert = (name) => (process.env[name] ?? "").trim();
const da = (name) => wert(name).length > 0;

/* ---------------------------------------------------------------- */
/* Supabase                                                          */
/* ---------------------------------------------------------------- */

const supabaseUrl = wert("NEXT_PUBLIC_SUPABASE_URL");

if (!supabaseUrl) {
  fehler("NEXT_PUBLIC_SUPABASE_URL fehlt — ohne Supabase gibt es keine Sitzung.");
} else if (supabaseUrl.includes(PRODUKTION_SUPABASE_REF)) {
  fehler(
    "NEXT_PUBLIC_SUPABASE_URL zeigt auf das PRODUKTIONSPROJEKT. " +
      "Die integrierten Zahlungstests legen echte Zeilen in betrieb_abonnements an " +
      "und veraendern echte Betriebe. Es braucht ein eigenes Supabase-Projekt.",
  );
} else {
  ok("Supabase zeigt nicht auf das bekannte Produktionsprojekt.");
}

if (!da("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  fehler("NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt.");
}

/*
 * Der Service-Role-Key gehört nicht in eine Testumgebung, in der jemand
 * einen Browser aufmacht. Er umgeht RLS vollstaendig; im Web-Code hat er
 * genau eine erlaubte Stelle (den Stripe-Webhook). Wer ihn fuer das
 * Protokoll nicht braucht, soll ihn auch nicht geladen haben.
 */
if (da("SUPABASE_SERVICE_ROLE_KEY")) {
  warnung(
    "SUPABASE_SERVICE_ROLE_KEY ist geladen. Fuer das Zahlungsprotokoll wird er " +
      "nicht gebraucht; er umgeht RLS. Nur behalten, wenn ein Schritt ihn " +
      "ausdruecklich verlangt.",
  );
}

/* ---------------------------------------------------------------- */
/* Stripe                                                            */
/* ---------------------------------------------------------------- */

const geheim = wert("STRIPE_SECRET_KEY");
const oeffentlich = wert("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

if (!geheim) {
  fehler("STRIPE_SECRET_KEY fehlt.");
} else if (geheim.startsWith("sk_test_") || geheim.startsWith("rk_test_")) {
  ok("Stripe-Secret-Key ist ein Testschluessel.");
} else {
  fehler(
    "STRIPE_SECRET_KEY ist KEIN Testschluessel (erwartet sk_test_ oder rk_test_). " +
      "Das Protokoll legt Kunden, Abos und Zahlungsmethoden an.",
  );
}

if (!oeffentlich) {
  fehler("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY fehlt — ohne ihn laedt das Payment Element nicht.");
} else if (oeffentlich.startsWith("pk_test_")) {
  ok("Stripe-Publishable-Key ist ein Testschluessel.");
} else {
  fehler("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist KEIN Testschluessel (erwartet pk_test_).");
}

/*
 * Gemischte Schluessel sind der unangenehmste Fall: das Formular laedt
 * gegen Test, der Server rechnet gegen Live (oder umgekehrt). Der
 * SetupIntent aus der einen Welt ist in der anderen unbekannt, und die
 * Fehlermeldung sagt nicht, warum.
 */
if (geheim && oeffentlich) {
  const geheimTest = geheim.includes("_test_");
  const oeffentlichTest = oeffentlich.includes("_test_");
  if (geheimTest !== oeffentlichTest) {
    fehler(
      "Stripe-Schluessel gemischt: einer Test, einer Live. Beide muessen aus " +
        "demselben Konto und derselben Welt stammen.",
    );
  }
}

if (!da("STRIPE_WEBHOOK_SECRET")) {
  fehler(
    "STRIPE_WEBHOOK_SECRET fehlt. Ohne Webhook bleibt betrieb_abonnements auf dem " +
      "alten Stand, und die Faelle c, e und i des Protokolls sind nicht aussagekraeftig.",
  );
} else {
  ok("Webhook-Secret ist gesetzt.");
}

const preise = ["STRIPE_PRICE_BASIC", "STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS"];
const fehlendePreise = preise.filter((name) => !da(name));
if (fehlendePreise.length > 0) {
  fehler(`Preis-Ids fehlen: ${fehlendePreise.join(", ")}. Sie muessen im selben Testkonto liegen.`);
} else {
  ok("Alle drei Preis-Ids sind gesetzt.");
}

/* ---------------------------------------------------------------- */
/* Soft Launch                                                       */
/* ---------------------------------------------------------------- */

/*
 * `softLaunchAktiv()` ist standardmaessig geschlossen — ein fehlender
 * Wert sperrt. Fuer das Protokoll muss der Stepper erreichbar sein.
 */
if (wert("SOFT_LAUNCH").toLowerCase() !== "aus") {
  fehler(
    'SOFT_LAUNCH ist nicht "aus". /einrichtung und /dashboard werden auf / umgeleitet, ' +
      "das Protokoll ist damit nicht durchfuehrbar.",
  );
} else {
  ok("SOFT_LAUNCH ist aus — der Stepper ist erreichbar.");
}

/* ---------------------------------------------------------------- */
/* Ergebnis                                                          */
/* ---------------------------------------------------------------- */

const zeichen = { ok: "  ok   ", warnung: " warn  ", fehler: " FEHLER" };
for (const b of befunde) console.log(`[${zeichen[b.art]}] ${b.text}`);

const anzahlFehler = befunde.filter((b) => b.art === "fehler").length;

console.log("");
if (anzahlFehler > 0) {
  console.log(
    `${anzahlFehler} Punkt(e) sprechen dagegen. Die integrierten Zahlungstests ` +
      "bleiben offen, bis sie behoben sind.",
  );
  process.exit(1);
}

console.log(
  "Die Umgebung sieht nach einer isolierten Testumgebung aus. " +
    "Das ersetzt keinen Blick ins Stripe-Dashboard, aber es schliesst die " +
    "Verwechslung aus, die am 2026-09-14 moeglich war.",
);
