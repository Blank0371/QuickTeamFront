import { readFileSync, writeFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Sprachkontrolle: hält `de.ts` und `en.ts` deckungsgleich und zählt,
 * wie viel Text noch am Wörterbuch vorbei in der Oberfläche steht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die Wörterbücher importiert und nicht gelesen werden
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ein Regex über `de.ts` zählt Doppelpunkte, keine Schlüssel — verschachtelte
 * Objekte, mehrzeilige Werte und Doppelpunkte im Text selbst („Stand: …")
 * machen daraus eine Schätzung. Node entfernt Typangaben inzwischen selbst,
 * und `scripts/test-loader.mjs` löst `@/…` auf; damit lässt sich das echte
 * Objekt laden. Was hier gezählt wird, ist dasselbe, was zur Laufzeit ankommt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zwei Härtegrade, mit Absicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * **Fehler** sind Schlüssel, die in einer Sprache fehlen oder zu viel sind —
 * das ist immer falsch und immer sofort behebbar.
 *
 * **Bestand** ist der hartkodierte Text. `CLAUDE.md` hält fest, dass der
 * Seitentext „überwiegend hartkodiertes Deutsch" ist; ein Gate, das darauf
 * mit einem roten Lauf antwortet, wird am ersten Tag umgangen. Gezählt wird
 * deshalb je Datei gegen `docs/i18n-bestand.json`, und angeschlagen wird nur,
 * wenn eine Zahl **wächst** oder eine neue Datei dazukommt. Die Richtung ist
 * damit erzwungen, ohne den Bestand zur Vorbedingung zu machen.
 *
 * Aufruf:
 *   npm run i18n:pruefen                     prüfen
 *   npm run i18n:pruefen -- --schreiben      Bestand neu festschreiben
 *   npm run i18n:pruefen -- --datei <pfad>   Fundstellen einer Datei auflisten
 */

const wurzel = path.resolve(import.meta.dirname, "..");
const BESTAND_DATEI = path.join(wurzel, "docs", "i18n-bestand.json");
const schreiben = process.argv.includes("--schreiben");
const nurDatei = process.argv.includes("--datei")
  ? process.argv[process.argv.indexOf("--datei") + 1]
  : null;

/* ------------------------------------------------------------------ */
/* Wörterbücher                                                        */
/* ------------------------------------------------------------------ */

// Unter Windows ist ein absoluter Pfad kein gültiger ESM-Spezifizierer.
const { de } = await import(pathToFileURL(path.join(wurzel, "src/i18n/de.ts")).href);
const { en } = await import(pathToFileURL(path.join(wurzel, "src/i18n/en.ts")).href);

/** Verschachteltes Objekt zu `pfad.zum.schluessel` → Wert. */
function flach(objekt, praefix = "") {
  const raus = new Map();
  for (const [schluessel, wert] of Object.entries(objekt)) {
    const pfad = praefix ? `${praefix}.${schluessel}` : schluessel;
    if (wert && typeof wert === "object" && !Array.isArray(wert)) {
      for (const [k, v] of flach(wert, pfad)) raus.set(k, v);
    } else {
      raus.set(pfad, wert);
    }
  }
  return raus;
}

const deFlach = flach(de);
const enFlach = flach(en);

const fehltInEn = [...deFlach.keys()].filter((k) => !enFlach.has(k));
const fehltInDe = [...enFlach.keys()].filter((k) => !deFlach.has(k));

/*
 * Gleicher Wert in beiden Sprachen ist ein Verdacht, kein Fehler: „QuickTeam",
 * „Basic" und „Pro" sollen gleich bleiben. Gemeldet wird deshalb nur, was nach
 * einem Satz aussieht — ab drei Wörtern wird eine zufällige Übereinstimmung
 * unwahrscheinlich genug, um sie anzusehen.
 */
const unuebersetzt = [...deFlach.entries()].filter(([k, v]) => {
  if (typeof v !== "string") return false;
  if (enFlach.get(k) !== v) return false;
  return v.trim().split(/\s+/).length >= 3;
});

/* ------------------------------------------------------------------ */
/* Quelldateien                                                        */
/* ------------------------------------------------------------------ */

const dateien = [];
for await (const treffer of glob("src/**/*.{ts,tsx}", { cwd: wurzel })) {
  const rel = treffer.split(path.sep).join("/");
  if (rel.startsWith("src/i18n/")) continue;
  if (rel.endsWith(".test.ts")) continue;
  dateien.push(rel);
}
dateien.sort();

const inhalte = new Map(
  dateien.map((rel) => [rel, readFileSync(path.join(wurzel, rel), "utf8")]),
);

/* ------------------------------------------------------------------ */
/* Abtastung                                                           */
/* ------------------------------------------------------------------ */

/**
 * Trennt Quelltext, Kommentare und Zeichenketten — zeichengenau.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum kein Regex
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ein Muster wie „Anführungszeichen, zwanzig Zeichen ohne Anführungszeichen,
 * Anführungszeichen" sieht aus wie ein String-Literal, ist aber keines: ein
 * Regex kennt keinen Zustand und kann öffnendes und schliessendes Zeichen
 * nicht unterscheiden. Findet er an einer Stelle nichts, rückt er vor — und
 * beginnt dann beim **schliessenden** Zeichen, womit der folgende Quelltext
 * bis zum nächsten öffnenden Zeichen als Zeichenkette durchgeht. Im ersten
 * Lauf stand deshalb „; type AboStatus = |" im Bericht.
 *
 * Derselbe Fehler trifft Kommentare: zwei Schrägstriche innerhalb einer
 * Zeichenkette (in einer URL) beginnen keinen Kommentar. Ein Durchlauf mit
 * vier Zuständen löst beides exakt statt ungefähr.
 *
 * Zurück kommen zwei Dinge:
 *
 *   `maske`    die Datei, in der Kommentare und Zeichenketten-Inhalte durch
 *              Leerzeichen ersetzt sind. Zeichen für Zeichen gleich lang wie
 *              das Original, damit Zeilennummern stimmen. Darin wird der
 *              JSX-Text gesucht: der steht im Quelltext, nicht in einer
 *              Zeichenkette, und bleibt deshalb stehen.
 *   `strings`  die Zeichenketten selbst, mit Position und Anführungszeichen.
 */
function taste(quelle) {
  const maske = [...quelle];
  const strings = [];
  let i = 0;

  const leere = (von, bis) => {
    for (let k = von; k < bis; k++) if (maske[k] !== "\n") maske[k] = " ";
  };

  while (i < quelle.length) {
    const c = quelle[i];
    const naechstes = quelle[i + 1];

    if (c === "/" && naechstes === "/") {
      const ende = quelle.indexOf("\n", i);
      const bis = ende === -1 ? quelle.length : ende;
      leere(i, bis);
      i = bis;
      continue;
    }

    if (c === "/" && naechstes === "*") {
      const ende = quelle.indexOf("*/", i + 2);
      const bis = ende === -1 ? quelle.length : ende + 2;
      leere(i, bis);
      i = bis;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      const start = i;
      i++;
      while (i < quelle.length) {
        if (quelle[i] === "\\") {
          i += 2;
          continue;
        }
        if (quelle[i] === c) break;
        // Ein Template-Literal darf über Zeilen gehen, die anderen nicht —
        // ein unbalanciertes Zeichen soll nicht den Rest der Datei schlucken.
        if (quelle[i] === "\n" && c !== "`") break;
        i++;
      }
      const inhalt = quelle.slice(start + 1, i);
      leere(start + 1, i);
      if (quelle[i] === c) i++;
      strings.push({ text: inhalt, index: start + 1, zeichen: c });
      continue;
    }

    i++;
  }

  return { maske: maske.join(""), strings };
}

/** Zeilennummer zu einem Zeichenindex. */
function zeileVon(quelle, index) {
  let zeile = 1;
  for (let k = 0; k < index; k++) if (quelle[k] === "\n") zeile++;
  return zeile;
}

const getastet = new Map(dateien.map((rel) => [rel, taste(inhalte.get(rel))]));

/* ------------------------------------------------------------------ */
/* Ungenutzte Schlüssel                                                */
/* ------------------------------------------------------------------ */

/*
 * Gesucht wird der **Blattname**, nicht der volle Pfad. Zugegriffen wird im
 * Code selten über `t.dashboard.kalender` — häufiger über eine
 * Zwischenvariable (`const d = t.dashboard; d.kalender`) oder über eine Prop.
 * Ein Pfadvergleich meldete diese alle als ungenutzt. Der Blattname ist die
 * verzeihende Variante: er übersieht eher einen toten Schlüssel, als einen
 * lebenden anzuschwärzen — und genau herum soll ein Bericht irren, den jemand
 * ernst nehmen soll.
 *
 * Durchsucht werden Quelltext **und** Zeichenketten, nur keine Kommentare. Die
 * Zeichenketten müssen mit, weil nicht jeder Schlüssel als Eigenschaft
 * angesprochen wird: `meldung("v.wiederholung.ungleich")` reicht den Pfad als
 * Text herein, und `login.meldungen["konto-geloescht"]` trägt einen Namen, den
 * es als Bezeichner gar nicht geben kann. Ohne sie stünde der halbe
 * Validierungsbaum als tot im Bericht.
 */
const benutzteNamen = new Set(
  dateien
    .flatMap((rel) => {
      const { maske, strings } = getastet.get(rel);
      return [maske, ...strings.map((s) => s.text)];
    })
    .join("\n")
    .match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? [],
);

const ungenutzt = [...deFlach.keys()].filter((pfad) => {
  const blatt = pfad.slice(pfad.lastIndexOf(".") + 1);
  return !benutzteNamen.has(blatt);
});

/* ------------------------------------------------------------------ */
/* Hartkodierter Text                                                  */
/* ------------------------------------------------------------------ */

/**
 * Sieht das nach Text für Menschen aus?
 *
 * Absichtlich sprachunabhängig: hartkodiertes Englisch geht genauso am
 * Wörterbuch vorbei wie hartkodiertes Deutsch. Aussortiert wird, was ohnehin
 * keine Übersetzung braucht — Pfade, Bezeichner, Klassenlisten, Zahlen.
 *
 * Die letzte Bedingung ist die Schwelle: **zwei Wörter oder ein Umlaut.** Ein
 * einzelnes Wort ohne Umlaut („nodejs", „flex", „force-dynamic") ist häufiger
 * ein Bezeichner als ein Satz; „Grösse" ist es nie.
 */
function menschentext(roh) {
  const text = roh.trim();
  if (text.length < 4) return false;
  if (!/\p{L}{2}/u.test(text)) return false;
  if (/^(https?:|\/|\.\/|@|#)/.test(text)) return false;
  // XML-/HTML-Bausteine (`<font><sz val="11"/>…`) — der Excel-Schreiber
  // besteht fast nur daraus. Ein Satz für Menschen beginnt nie mit `<`.
  if (/^</.test(text)) return false;
  if (/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(text)) return false;
  if (/^[A-Z][A-Za-z0-9]*$/.test(text)) return false;
  if (istKlassenliste(text)) return false;
  return /\p{L}\s+\p{L}/u.test(text) || /[äöüßÄÖÜ]/.test(text);
}

/**
 * Klassenlisten aussortieren, ohne Sätze mitzunehmen.
 *
 * Der erste Versuch verwarf alles, was nur aus Buchstaben, Bindestrich und
 * Punkt bestand und keinen Umlaut trug. Damit fiel „Der Dienstplan als
 * Wochen- oder Monatsblatt zum Ausdrucken." heraus — ein Satz, der genau
 * diese Zeichen benutzt. Ein Tippfehler in der Heuristik ist schlimmer als
 * keine Heuristik: er macht das Gate still blind.
 *
 * Das tragfähige Unterscheidungsmerkmal ist der **Anteil**. In einer
 * Tailwind-Liste trägt fast jedes Token einen Bindestrich, Doppelpunkt oder
 * Schrägstrich (`text-sm`, `hover:bg-signal-weak`, `w-1/2`); in einem
 * deutschen Satz ist ein Bindestrich die Ausnahme. Die Hälfte als Schwelle
 * trennt beides deutlich — echte Listen liegen weit darüber, Sätze weit
 * darunter.
 */
function istKlassenliste(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  // `+`, `,` und `*` stehen in Arbitrary Values (`pb-[calc(3.5rem+env(…))]`,
  // `grid-cols-[1fr,auto]`, `[&>*]:…`) — ohne sie galt die Klassenliste der
  // Dashboard-Schale als Satz.
  if (!/^[\w\-./:[\]()%#!+,*&>=\s]+$/.test(text)) return false;
  const technisch = tokens.filter((tok) => /[-:/]/.test(tok)).length;
  return technisch * 2 >= tokens.length;
}

/**
 * JSX-Text steht im Quelltext, nicht in einer Zeichenkette — gesucht wird
 * deshalb in der Maske, zwischen `>` und `<`.
 *
 * Denselben Schnitt macht aber auch gewöhnlicher Code: ein Pfeil liefert ein
 * `>`, ein Vergleich ein `<`. Was dazwischen steht, trägt dann Zeichen, die
 * in Fliesstext nicht vorkommen — Semikolon, Gleichheitszeichen, Klammern.
 * Genau daran wird es aussortiert.
 */
const JSX_TEXT = />([^<>{}]{4,})</g;
const CODE_ZEICHEN = /[;=(){}[\]`$|&*\\]/;

/** Beschriftungen, die im Browser landen — nicht `className`, nicht `href`. */
const SICHTBARE_PROPS =
  /\b(title|alt|placeholder|aria-label|aria-description|aria-placeholder|label|beschriftung|hinweis|titel|meldung|text)\s*=\s*$/;

/**
 * Ab wann eine Zeichenkette ohne Prop-Zusammenhang als Satz zählt.
 *
 * Sie greift in beiden Dateiarten. In `.ts` sind es die `nachricht`-Sätze aus
 * `src/lib/`, die `CLAUDE.md` als offenen Rest führt. In `.tsx` ist es der
 * Text, der als Ausdruck im JSX steht statt zwischen den Klammern —
 * `{anzahl === 0 ? "Keine Schichten in diesem Monat." : …}` ist in diesem
 * Code der Normalfall, nicht die Ausnahme, und wäre sonst unsichtbar.
 *
 * Zwanzig Zeichen, weil kürzere Zeichenketten fast immer Spaltennamen,
 * Statuswerte, Klassenlisten oder Schlüssel sind.
 */
const SATZLAENGE = 20;

/** Protokollzeilen sind kein Oberflächentext. */
function istProtokoll(maske, index) {
  const anfang = maske.lastIndexOf("\n", index) + 1;
  const ende = maske.indexOf("\n", index);
  const zeile = maske.slice(anfang, ende === -1 ? undefined : ende);
  return /console\.|^\s*(import|export \*)/.test(zeile);
}

const funde = new Map();

for (const rel of dateien) {
  const { maske, strings } = getastet.get(rel);
  const treffer = [];
  const gesehen = new Set();

  const merke = (text, index) => {
    if (gesehen.has(index)) return;
    gesehen.add(index);
    treffer.push({
      text: text.trim().replace(/\s+/g, " "),
      zeile: zeileVon(maske, index),
    });
  };

  if (rel.endsWith(".tsx")) {
    for (const t of maske.matchAll(JSX_TEXT)) {
      if (CODE_ZEICHEN.test(t[1])) continue;
      if (menschentext(t[1])) merke(t[1], t.index);
    }
  }

  for (const s of strings) {
    if (s.zeichen === "`") continue;
    if (istProtokoll(maske, s.index)) continue;
    if (!menschentext(s.text)) continue;

    const davor = maske.slice(Math.max(0, s.index - 48), s.index - 1);
    const sichtbar = SICHTBARE_PROPS.test(davor);

    if (sichtbar || s.text.length >= SATZLAENGE) merke(s.text, s.index);
  }

  if (treffer.length > 0) {
    treffer.sort((a, b) => a.zeile - b.zeile);
    funde.set(rel, treffer);
  }
}

/* ------------------------------------------------------------------ */
/* Einzelne Datei                                                      */
/* ------------------------------------------------------------------ */

if (nurDatei) {
  const treffer = funde.get(nurDatei.split(path.sep).join("/"));
  if (!treffer) {
    console.log(`Keine Fundstellen in ${nurDatei}.`);
    process.exit(0);
  }
  console.log(`\n  ${nurDatei}  —  ${treffer.length} Fundstellen\n`);
  for (const t of treffer) {
    console.log(`  ${String(t.zeile).padStart(5)}  ${t.text.slice(0, 96)}`);
  }
  console.log("");
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* Bestand                                                             */
/* ------------------------------------------------------------------ */

const jetzt = Object.fromEntries(
  [...funde.entries()].map(([rel, treffer]) => [rel, treffer.length]),
);

if (schreiben) {
  writeFileSync(BESTAND_DATEI, `${JSON.stringify(jetzt, null, 2)}\n`, "utf8");
  const summe = Object.values(jetzt).reduce((a, b) => a + b, 0);
  console.log(
    `Bestand festgeschrieben: ${summe} hartkodierte Strings in ${Object.keys(jetzt).length} Dateien.`,
  );
  console.log(`  ${path.relative(wurzel, BESTAND_DATEI)}`);
  process.exit(0);
}

let bestand = {};
try {
  bestand = JSON.parse(readFileSync(BESTAND_DATEI, "utf8"));
} catch {
  console.error(
    `Kein Bestand unter ${path.relative(wurzel, BESTAND_DATEI)}.\n` +
      "Einmalig festschreiben mit:  npm run i18n:pruefen -- --schreiben",
  );
  process.exit(1);
}

const gewachsen = [];
for (const [rel, anzahl] of Object.entries(jetzt)) {
  const vorher = bestand[rel] ?? 0;
  if (anzahl > vorher) gewachsen.push({ rel, vorher, jetzt: anzahl });
}
const geschrumpft = Object.entries(jetzt).filter(
  ([rel, anzahl]) => (bestand[rel] ?? 0) > anzahl,
).length;
const erledigt = Object.keys(bestand).filter((rel) => !(rel in jetzt)).length;

/* ------------------------------------------------------------------ */
/* Bericht                                                             */
/* ------------------------------------------------------------------ */

const F = (s) => `[31m${s}[0m`;
const W = (s) => `[33m${s}[0m`;
const G = (s) => `[32m${s}[0m`;
const grau = (s) => `[90m${s}[0m`;
const kurz = (text) => (text.length > 72 ? `${text.slice(0, 69)}…` : text);

const zeilen = ["", `  Sprachkontrolle  ${grau(`${deFlach.size} Schlüssel · de/en`)}`, ""];

if (fehltInEn.length === 0 && fehltInDe.length === 0) {
  zeilen.push(`  ${G("✓")} Schlüssel deckungsgleich`);
} else {
  for (const k of fehltInEn) zeilen.push(`  ${F("✗")} fehlt in en.ts   ${k}`);
  for (const k of fehltInDe) zeilen.push(`  ${F("✗")} fehlt in de.ts   ${k}`);
}

if (unuebersetzt.length > 0) {
  zeilen.push("", `  ${W("!")} ${unuebersetzt.length} Schlüssel wörtlich gleich in de und en`);
  for (const [k, v] of unuebersetzt.slice(0, 10)) {
    zeilen.push(`      ${k}`, `        ${grau(kurz(v))}`);
  }
  if (unuebersetzt.length > 10) {
    zeilen.push(grau(`      … ${unuebersetzt.length - 10} weitere`));
  }
}

if (ungenutzt.length > 0) {
  zeilen.push("", `  ${W("!")} ${ungenutzt.length} Schlüssel ohne Verwendung im Quelltext`);
  for (const k of ungenutzt.slice(0, 15)) zeilen.push(`      ${k}`);
  if (ungenutzt.length > 15) zeilen.push(grau(`      … ${ungenutzt.length - 15} weitere`));
}

const summeJetzt = Object.values(jetzt).reduce((a, b) => a + b, 0);
const summeVorher = Object.values(bestand).reduce((a, b) => a + b, 0);

zeilen.push("");
if (gewachsen.length === 0) {
  zeilen.push(`  ${G("✓")} hartkodierter Text: ${summeJetzt} ${grau(`(Bestand ${summeVorher})`)}`);
  if (geschrumpft + erledigt > 0) {
    zeilen.push(
      grau(
        `      ${geschrumpft} Dateien entlastet, ${erledigt} ganz übersetzt — ` +
          "Bestand nachziehen mit --schreiben",
      ),
    );
  }
} else {
  zeilen.push(`  ${F("✗")} hartkodierter Text neu hinzugekommen`);
  for (const { rel, vorher, jetzt: n } of gewachsen) {
    zeilen.push(`      ${rel}  ${grau(`${vorher} → ${n}`)}`);
    for (const t of funde.get(rel).slice(0, 5)) {
      zeilen.push(`        ${grau(`:${t.zeile}`)}  ${kurz(t.text)}`);
    }
  }
  zeilen.push(
    "",
    grau("      Neuer Text gehört ins Wörterbuch (src/i18n/de.ts + en.ts)."),
    grau("      Einzelne Datei ansehen: npm run i18n:pruefen -- --datei <pfad>"),
    grau("      War es unvermeidbar:    npm run i18n:pruefen -- --schreiben"),
  );
}

zeilen.push("");
console.log(zeilen.join("\n"));

process.exit(fehltInEn.length > 0 || fehltInDe.length > 0 || gewachsen.length > 0 ? 1 : 0);
