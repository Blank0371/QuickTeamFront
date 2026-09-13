/**
 * Startet `next build` bzw. `next start` mit eigenem Ausgabeverzeichnis.
 *
 * Grund: Dev-Server und Build teilen sich sonst `.next`. Laufen beide
 * gleichzeitig, zieht der Build dem Dev-Server die Chunks weg — alle
 * Routen antworten mit 500 und „Cannot find module './331.js'". Das sieht
 * wie ein Codefehler aus, ist keiner, und hat hier schon zweimal Zeit
 * gekostet.
 *
 * `next.config.ts` liest `NEXT_DIST_DIR` und fällt ohne die Variable auf
 * `.next` zurück.
 *
 * **In CI wird die Variable bewusst nicht gesetzt.** Der Grund für das
 * eigene Verzeichnis ist ein lokaler: der gleichzeitig laufende
 * Dev-Server. Auf einem Build-Runner gibt es keinen, dafür aber einen
 * Hoster, der das Ergebnis an einer festen Stelle erwartet — Netlify
 * veröffentlicht `.next`. Ohne diese Ausnahme bliebe `.next` leer,
 * während der fertige Build in `.next-build` läge; das Deployment
 * schlüge fehl oder lieferte einen veralteten Stand aus. `CI` setzen
 * Netlify und praktisch jeder andere Runner selbst.
 *
 * Als Skriptdatei und nicht als Präfix im npm-Script, weil `VAR=wert cmd`
 * unter Windows (cmd.exe) nicht funktioniert.
 */
import { spawnSync } from "node:child_process";

const befehl = process.argv[2];

if (befehl !== "build" && befehl !== "start") {
  console.error(`Unbekannter Befehl: ${befehl ?? "(keiner)"}\nErwartet: build | start`);
  process.exit(1);
}

const inCi = (process.env.CI ?? "").toLowerCase() === "true" || process.env.NETLIFY === "true";

const { status } = spawnSync("npx", ["next", befehl, ...process.argv.slice(3)], {
  stdio: "inherit",
  shell: true,
  env: inCi ? process.env : { ...process.env, NEXT_DIST_DIR: ".next-build" },
});

process.exit(status ?? 1);
