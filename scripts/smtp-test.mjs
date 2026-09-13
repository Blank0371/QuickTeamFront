/**
 * Testet die Resend-SMTP-Zugangsdaten direkt — ohne Supabase dazwischen.
 *
 * Damit lässt sich trennen, ob der Benutzername oder der API-Key
 * abgelehnt wird. Supabase meldet beides als "Error sending confirmation
 * email" und verschluckt die eigentliche SMTP-Antwort.
 *
 * Aufruf:
 *   node scripts/smtp-test.mjs re_DEIN_API_KEY
 *   node scripts/smtp-test.mjs re_DEIN_API_KEY meinbenutzername
 *
 * Der Key wird nur an Resend geschickt und nirgends gespeichert. Er
 * landet allerdings in der Shell-History — danach ggf. löschen.
 */
import tls from "node:tls";

const [, , apiKey, benutzer = "resend"] = process.argv;

if (!apiKey) {
  console.error("Kein API-Key übergeben.\nAufruf: node scripts/smtp-test.mjs re_DEIN_API_KEY");
  process.exit(1);
}

const HOST = "smtp.resend.com";
const PORT = 465;

/**
 * Macht den Benutzernamen bytegenau sichtbar.
 *
 * SMTP vergleicht Bytes, das Terminal zeigt Zeichen. Ein angehängtes
 * Leerzeichen, ein aus einem Web-Formular mitkopiertes U+00A0 oder ein
 * Zeilenumbruch sind in der normalen Ausgabe nicht von einem sauberen
 * "resend" zu unterscheiden — erzeugen aber exakt den 535, der hier
 * untersucht wird. Deshalb vor dem Verbinden Länge und Hex zeigen.
 */
function zeigeBytes(wert) {
  const bytes = Buffer.from(wert, "utf8");
  const sichtbar = wert
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    // Explizite Escapes: diese beiden Zeichen sind im Quelltext selbst
    // unsichtbar und würden bei jedem Kopieren dieser Datei stillschweigend
    // verschwinden.
    .replace(/\u00a0/g, "<U+00A0>")
    .replace(/\u200b/g, "<U+200B>");

  console.log(`Benutzername : "${sichtbar}"`);
  console.log(`Länge        : ${bytes.length} Byte (erwartet: 6 für "resend")`);
  // Ein leeres Feld ist ein realistischer Befund in Lauf C — dann darf die
  // Hex-Zeile nicht selbst mit einem Fehler abbrechen.
  const hex = bytes.toString("hex").match(/../g) ?? [];
  console.log(`Hex          : ${hex.length > 0 ? hex.join(" ") : "(leer)"}`);
  console.log(`Erwartet hex : 72 65 73 65 6e 64`);

  const auffaellig = [];
  if (wert !== wert.trim()) auffaellig.push("führendes oder abschliessendes Whitespace");
  if (/[^\x21-\x7e]/.test(wert)) auffaellig.push("Zeichen ausserhalb des druckbaren ASCII-Bereichs");
  if (wert !== wert.toLowerCase()) auffaellig.push("Grossbuchstaben");

  if (auffaellig.length > 0) {
    console.log(`\n⚠  Auffällig: ${auffaellig.join(", ")}.`);
    console.log("   Der Wert wird trotzdem unverändert gesendet — genau das ist der Zweck");
    console.log("   von Lauf C: prüfen, was wirklich im Supabase-Feld steht.");
  }

  console.log("");
}

zeigeBytes(benutzer);
console.log(
  `API-Key      : ${apiKey.length} Zeichen, ` +
    `Präfix "${apiKey.slice(0, 3)}", Endung "…${apiKey.slice(-4)}"` +
    (apiKey !== apiKey.trim() ? "  ⚠ mit Whitespace!" : ""),
);
console.log("");

const sock = tls.connect({ host: HOST, port: PORT, servername: HOST });
sock.setEncoding("utf8");

const schritte = [
  { sende: null, erwarte: /^220 / },
  { sende: "EHLO quickteam.test", erwarte: /^250 /m },
  { sende: "AUTH LOGIN", erwarte: /^334 / },
  { sende: Buffer.from(benutzer).toString("base64"), erwarte: /^334 |^535 /, was: "Benutzername" },
  { sende: Buffer.from(apiKey).toString("base64"), erwarte: /^235 |^535 /, was: "Passwort" },
];

let index = 0;
let puffer = "";
let fertig = false;

/**
 * Übersetzt eine 535-Antwort in eine Aussage darüber, welches Feld schuld ist.
 *
 * Am 2026-08-06 gegen smtp.resend.com verifiziert: Resend beantwortet den
 * Benutzernamen *immer* mit „334 Password:" — auch einen falschen. Entschieden
 * wird erst nach dem Passwort. Der Text der 535 unterscheidet aber sauber:
 *
 *   535 Invalid username                → Benutzername ≠ "resend"
 *                                         (Gross-/Kleinschreibung, Whitespace,
 *                                         irgendetwas — der Key wird dann gar
 *                                         nicht mehr geprüft)
 *   535 Authentication credentials invalid → Benutzername ok, API-Key abgelehnt
 *
 * Deshalb darf aus einem 535 nach dem Passwort-Schritt *nicht* geschlossen
 * werden, der Benutzername sei akzeptiert worden. Genau dieser Fehlschluss
 * stand in einer früheren Fassung dieses Skripts.
 */
function deute(antwort, schrittName) {
  if (/invalid username/i.test(antwort)) {
    return (
      `Ergebnis: Resend lehnt den BENUTZERNAMEN ab.\n` +
      `Gesendet wurde "${benutzer}" (${Buffer.byteLength(benutzer)} Byte). Der API-Key wurde\n` +
      `dabei nicht einmal geprüft — über ihn sagt dieser Lauf nichts aus.`
    );
  }
  if (/credentials invalid/i.test(antwort)) {
    return (
      `Ergebnis: Der Benutzername "${benutzer}" ist korrekt, der API-KEY wird abgelehnt.\n` +
      `Das ist die andere 535 — sie beweist, dass das Username-Feld stimmt.`
    );
  }
  return `Ergebnis: 535 im Schritt „${schrittName}", Text unbekannt: ${antwort}`;
}

sock.on("data", (chunk) => {
  puffer += chunk;
  if (!/\r\n$/.test(puffer)) return;

  const antwort = puffer.trim();
  puffer = "";

  // Nach dem QUIT kommt noch ein „221 Bye". Das gehört zu keinem Schritt mehr
  // und wurde sonst der zuletzt gesendeten Stufe zugeschlagen.
  if (fertig) return;

  const schritt = schritte[index];
  if (schritt?.was) {
    console.log(`${schritt.was} gesendet → ${antwort}`);
    if (antwort.startsWith("535")) {
      console.log(`\n${deute(antwort, schritt.was)}`);
      fertig = true;
      sock.write("QUIT\r\n");
      return;
    }
  }

  if (antwort.startsWith("235")) {
    console.log(`\nErgebnis: Anmeldung erfolgreich mit Benutzername "${benutzer}".`);
    console.log("Diese Kombination gehört unverändert in die Supabase-SMTP-Einstellungen.");
    fertig = true;
    sock.write("QUIT\r\n");
    return;
  }

  index += 1;
  const naechster = schritte[index];
  if (!naechster) {
    sock.write("QUIT\r\n");
    return;
  }
  if (naechster.sende) sock.write(`${naechster.sende}\r\n`);
});

sock.on("error", (fehler) => {
  console.error("Verbindungsfehler:", fehler.message);
  process.exit(1);
});

// Nach dem QUIT ist der Test fertig — der Timeout darf dann nicht mehr
// zuschlagen und ein erfolgreiches Ergebnis nachträglich als Fehler
// hinstellen.
const abbruch = setTimeout(() => {
  console.error("Zeitüberschreitung — keine vollständige Antwort erhalten.");
  sock.destroy();
  process.exit(1);
}, 15000);

sock.on("close", () => {
  clearTimeout(abbruch);
});
