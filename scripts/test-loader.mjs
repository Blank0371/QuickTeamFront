import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "node:module";

/**
 * Auflösungshilfe, damit `node --test` die Quelldateien dieses Projekts
 * lädt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum überhaupt etwas Eigenes
 * ─────────────────────────────────────────────────────────────────────
 *
 * Node 23+ entfernt Typangaben aus `.ts`-Dateien von sich aus — der
 * Testlauf braucht dafür also keinen Transpiler und keine neue
 * Abhängigkeit. Zwei Dinge kennt Node aber nicht:
 *
 * 1. **`@/…`** — der Pfad-Alias aus `tsconfig.json`. Er ist eine Angabe
 *    an den TypeScript-Dienst und an den Bundler von Next, nicht an die
 *    Laufzeit.
 * 2. **Endungslose Importe** (`"./tabellen"`). In ESM verlangt Node die
 *    Dateiendung; TypeScript und Next ergänzen sie selbst.
 *
 * Beides hier nachzureichen ist billiger als die Alternative, eine
 * Testbibliothek samt Transpiler in ein Projekt zu holen, das bisher
 * ohne auskommt. Getestet werden damit die **echten** Quelldateien, nicht
 * eine Kopie ihrer Logik.
 *
 * Umgekehrt heisst das: was hier läuft, muss ohne Bundler auskommen.
 * Module, die React, `next/headers` oder `server-only` ziehen, gehören
 * nicht in einen Unit-Test — dafür ist der Browserlauf da
 * (`.claude/skills/run-quickteam-web`).
 */
const wurzel = path.resolve(import.meta.dirname, "..");
const src = path.join(wurzel, "src");

const ENDUNGEN = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

function ersteVorhandene(basis) {
  for (const endung of ENDUNGEN) {
    const kandidat = basis + endung;
    if (existsSync(kandidat) && !kandidat.endsWith("/")) return kandidat;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const treffer = ersteVorhandene(path.join(src, specifier.slice(2)));
    if (treffer) return { url: pathToFileURL(treffer).href, shortCircuit: true };
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const elternPfad = path.dirname(new URL(context.parentURL).pathname);
    // Unter Windows steht dem Pfad aus `URL` ein Schrägstrich voran.
    const basis = path.resolve(
      process.platform === "win32" ? elternPfad.replace(/^\//, "") : elternPfad,
      specifier,
    );
    const treffer = ersteVorhandene(basis);
    if (treffer) return { url: pathToFileURL(treffer).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

register(import.meta.url);
