import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * Dev-Server und Build teilen sich sonst `.next`. Läuft beides
   * gleichzeitig, zieht der Build dem Dev-Server die Chunks weg:
   * „Cannot find module './331.js'", alle Routen 500. Das sieht wie ein
   * Codefehler aus, ist keiner — und hat in diesem Projekt schon zweimal
   * Zeit gekostet.
   *
   * `npm run build` setzt deshalb NEXT_DIST_DIR auf ein eigenes
   * Verzeichnis — aber nur lokal. In CI lässt
   * `scripts/next-getrennt.mjs` die Variable weg, und es bleibt bei
   * `.next`: dort erwartet Netlify das Ergebnis (`publish = ".next"` in
   * `netlify.toml`).
   */
  distDir: process.env["NEXT_DIST_DIR"] || ".next",
  // Ohne das sucht Next sich bei mehreren Lockfiles im Dateibaum die
  // falsche Wurzel und packt zu viel in die serverseitige Funktion.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  /*
   * Der Werbepartner-Vertrag liegt als Markdown unter `docs/` und wird
   * von `/promocode/antrag` zur Laufzeit gelesen und als PDF gerendert.
   * Nexts Datei-Tracer sieht den `fs`-Zugriff über `process.cwd()` nicht
   * als statischen Pfad und würde die Datei sonst nicht mitpacken — im
   * Deployment fehlte sie dann. Hier ausdrücklich einschliessen.
   */
  outputFileTracingIncludes: {
    "/promocode/antrag": ["./docs/rechtliches/legals/Werbepartner-Vertrag-QuickTeam-de-en.md"],
  },
  /*
   * Ausgaben von Testwerkzeugen lösen keinen Neubau mehr aus.
   *
   * `playwright-cli` schreibt Snapshots, Konsolenprotokolle und
   * Screenshots nach `.playwright-cli/` **relativ zum
   * Arbeitsverzeichnis**. Wird es versehentlich mit dem Repo als cwd
   * gestartet, landet der Ordner im beobachteten Baum, und der
   * Dev-Server wertet jede geschriebene Datei als Quelltextänderung:
   * ein Neubau pro Browser-Befehl. Trifft eine Anfrage genau in das
   * Neuschreiben der Manifeste, liest sie eine abgeschnittene
   * JSON-Datei — `SyntaxError: Unexpected end of JSON input`, und die
   * Route antwortet mit 500. Am 2026-09-10 gemessen: 25 solcher
   * Fehler in einer Sitzung, nach dem Umstellen null.
   *
   * Die Disziplin bleibt die erste Verteidigung:
   * `.claude/skills/run-quickteam-web/SKILL.md` verlangt den Aufruf
   * von ausserhalb des Repos, und nur so entstehen die Dateien hier
   * gar nicht erst. Dies ist das Netz darunter, nicht ihr Ersatz —
   * eine Fehlbedienung darf Arbeitszeit kosten, aber keine
   * Messergebnisse verfälschen.
   *
   * `.next-build` steht mit in der Liste, weil es dasselbe Problem aus
   * anderer Richtung ist: `npm run build` schreibt dorthin, während
   * der Dev-Server läuft (siehe `distDir` oben), und Next ignoriert
   * von Haus aus nur `.next`.
   *
   * Greift nur unter Webpack. `next dev` läuft hier ohne `--turbo`;
   * unter Turbopack bliebe dieser Block wirkungslos.
   */
  webpack: (config) => {
    /*
     * Nicht als String-Array: Nexts Vorgabe ist ein **RegExp**
     * (`baseWatchOptions` in `next/dist/build/webpack-config.js`), und
     * webpacks Schema lässt in `ignored` kein Gemisch aus RegExp und
     * Strings zu — ein Array mit dem geerbten RegExp darin bricht den
     * Start mit `should be a non-empty string`. Deshalb werden die
     * Quellen zusammengefügt statt die Vorgabe ersetzt: was Next
     * ohnehin ignoriert (node_modules, .git, .next), bleibt erhalten.
     */
    const eigene = /(^|\/)\.(playwright-cli|playwright|screens|next-build|netlify)(\/|$)/;
    const vorgabe = config.watchOptions?.ignored;
    config.watchOptions = {
      ...config.watchOptions,
      ignored:
        vorgabe instanceof RegExp
          ? new RegExp(`(?:${vorgabe.source})|(?:${eigene.source})`)
          : eigene,
    };
    return config;
  },

  // Bleibt aus: keine Source Maps in Produktion.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  /**
   * Sicherheits-Kopfzeilen für jede Antwort.
   *
   * Kein Hoster setzt sie von allein — ohne diesen Block liefert die
   * Seite überhaupt keine aus. Netlify übernimmt `headers()` aus der
   * Next-Konfiguration über seinen Next.js-Adapter; eine zweite,
   * abweichende Kopie in `netlify.toml` wäre nur eine weitere Stelle,
   * an der sie auseinanderlaufen können. Für eine Anwendung, hinter der eine
   * Anmeldung und ein Zahlungsformular liegen, ist das die billigste
   * Verteidigung, die es gibt: keine Zeile Anwendungscode, kein
   * Laufzeitaufwand.
   *
   * **Kein vollständiges CSP, und das ist eine Entscheidung.** Ein
   * `script-src` müsste Stripe.js, die Payment-Element-Frames und die
   * Inline-Bootstrap-Skripte von Next gleichzeitig zulassen; Next
   * erzeugt diese Skripte ohne feste Nonce, also liefe es auf
   * `'unsafe-inline'` hinaus — ein CSP, das genau die Lücke offenlässt,
   * gegen die es antritt, und dabei aussieht, als schütze es. Es käme
   * eine Zeile Konfiguration mit dem Anschein von Sicherheit heraus,
   * nicht Sicherheit. Wird es gebaut, dann mit Nonce über die
   * Middleware und gegen den Zahlungsschritt getestet, nicht nebenbei.
   *
   * `frame-ancestors` steht trotzdem schon hier: die Direktive braucht
   * keine Skript-Allowlist, und sie ist die einzige, die moderne
   * Browser statt `X-Frame-Options` auswerten. Beide zusammen decken
   * Alt und Neu ab — geklickt wird sonst im unsichtbaren Rahmen über
   * dem Dashboard.
   */
  async headers() {
    return [
      {
        source: "/:pfad*",
        headers: [
          // Kein fremder Rahmen um unsere Seiten. Betrifft nicht die
          // Stripe-Frames, die *wir* einbetten — dort sind wir der Elternteil.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },

          // Kein Raten des Inhaltstyps: ein hochgeladenes „Bild", das in
          // Wahrheit HTML ist, soll nicht als HTML ausgeführt werden.
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Beim Sprung auf eine fremde Domain nur die Herkunft mitgeben.
          // Sonst reisen Pfade wie `/passwort-neu?email=…` im Referer mit.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          /*
           * Kamera, Mikrofon und Standort braucht diese Anwendung
           * nirgends — die bleiben zu.
           *
           * `payment` dagegen wird ausdrücklich an Stripe delegiert.
           * Der Standardwert der Direktive ist `self`, und das reicht
           * hier **nicht**: das Payment Element läuft in einem Frame von
           * `js.stripe.com`, also cross-origin, und die Payment Request
           * API darin (Apple Pay, Google Pay) fällt ohne ausdrückliche
           * Nennung still aus. „Still" ist das Problem — es gäbe keine
           * Fehlermeldung, nur eine Bezahlmöglichkeit weniger, und das
           * fiele erst einem Kunden auf.
           */
          {
            key: "Permissions-Policy",
            value:
              'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://hooks.stripe.com")',
          },

          /*
           * Zwei Jahre, Subdomains eingeschlossen. `preload` bewusst
           * nicht: der Eintrag in die Browser-Liste ist praktisch nicht
           * rückgängig zu machen und gehört gesetzt, wenn die eigene
           * Domain endgültig steht — nicht solange sie Platzhalter ist.
           */
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
