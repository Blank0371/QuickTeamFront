import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { SprachProvider } from "@/i18n/sprach-provider";
import { softLaunchAktiv } from "@/lib/soft-launch";
import { leseThema } from "@/lib/thema";
import { plaene, siteName, siteUrl } from "@/lib/site";

import "./globals.css";

/* Drei Schriftrollen, self-hosted über next/font — kein CDN, kein FOUT. */
const display = Archivo({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-qt-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-qt-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-qt-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QuickTeam — Dienstplanung für Gastronomiebetriebe",
    template: "%s · QuickTeam",
  },
  description:
    "QuickTeam plant Schichten für Restaurants, Cafés und Bars in Österreich und Deutschland. Dienstplan erstellen, Team informieren, Stunden im Blick behalten.",
  alternates: { canonical: "/" },
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  openGraph: {
    type: "website",
    locale: "de_AT",
    url: siteUrl,
    siteName,
    title: "QuickTeam — Dienstplanung für Gastronomiebetriebe",
    description:
      "Schichtplanung für Gastronomie in Österreich und Deutschland. In Minuten geplant statt in Stunden.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuickTeam — Dienstplanung für Gastronomiebetriebe",
    description:
      "Schichtplanung für Gastronomie in Österreich und Deutschland. In Minuten geplant statt in Stunden.",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d100e" },
  ],
};

/**
 * Organization + SoftwareApplication.
 *
 * **`offers` entfällt während des Soft-Launches.** Ein Angebot mit
 * `availability: InStock` ist gegenüber Suchmaschinen die Aussage „das
 * lässt sich jetzt zu diesem Preis kaufen" — und genau das trifft nicht
 * zu, solange Registrierung und Zahlung serverseitig gesperrt sind. Ein
 * anderer `availability`-Wert hülfe nicht: `PreOrder` und `PreSale`
 * setzen beide voraus, dass bestellt werden kann. Die Preise stehen
 * weiterhin sichtbar auf der Seite; nur die maschinenlesbare Zusage,
 * sie seien buchbar, fehlt. Sie kommt zurück, sobald `SOFT_LAUNCH=aus`
 * gesetzt ist — dieselbe eine Stelle, die auch die Routen freigibt.
 */
function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        // Zeigt auf die Datei, die `src/app/icon.png` unter dieser
        // Adresse ausliefert. Seit dem Wechsel auf das echte Logo gibt
        // es kein `icon.svg` mehr; ein JSON-LD-Feld, das auf eine 404
        // zeigt, ist schlimmer als keines.
        logo: `${siteUrl}/icon.png`,
        areaServed: [
          { "@type": "Country", name: "Österreich" },
          { "@type": "Country", name: "Deutschland" },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: siteName,
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "de",
        publisher: { "@id": `${siteUrl}/#organization` },
        ...(softLaunchAktiv()
          ? {}
          : {
              offers: plaene.map((plan) => ({
                "@type": "Offer",
                name: plan.name,
                category: plan.id,
                price: plan.preis,
                priceCurrency: "EUR",
                url: `${siteUrl}/preise`,
                availability: "https://schema.org/InStock",
              })),
            }),
      },
    ],
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  /*
   * Sprache und Wörterbuch kommen aus dem Cookie, nicht mehr aus
   * `defaultLocale`. Damit stimmt auch `lang` am `<html>` — ein
   * englischer Text unter `lang="de"` lässt Screenreader mit deutscher
   * Aussprache vorlesen, und das ist unverständlicher als eine falsche
   * Übersetzung.
   */
  const sprache = await leseSprache();
  const t = getDictionary(sprache);

  /*
   * Ausdrückliche Themenwahl aus dem Cookie. `null` heisst „keine Wahl" —
   * dann bleibt `data-theme` weg und die Farben folgen dem System
   * (`prefers-color-scheme`). Serverseitig gesetzt, damit die Seite gleich
   * im richtigen Modus ankommt und nicht erst nachträglich umspringt.
   */
  const thema = await leseThema();

  return (
    <html
      lang={sprache}
      data-theme={thema ?? undefined}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-bg text-text antialiased">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-blk focus:bg-signal focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-signal-ink"
        >
          {t.nav.ueberspringen}
        </a>

        {/*
          Kopf- und Fussbereich stehen nicht mehr hier, sondern in
          `(site)/layout.tsx`. Grund: das Dashboard braucht eine eigene
          Schale — ein „Kostenlos testen"-Knopf über dem Dienstplan eines
          angemeldeten Betriebs wäre schlicht falsch. Die Klammer-Gruppe
          ändert keine einzige Adresse; sie trennt nur, wer welchen
          Rahmen bekommt.

          Was hier bleibt, gilt wirklich für alles: Sprache, Schriften,
          Sprungmarke, JSON-LD und das `main`, an das sie zeigt.
        */}
        {/*
          `flex flex-col`, damit der Fussbereich der öffentlichen Seite
          weiterhin am unteren Rand klebt: er ist jetzt ein Kind von
          `main` statt von `body`, und ohne diese Achse stünde er bei
          kurzen Seiten mitten im Bild.
        */}
        {/*
          Der Provider trägt die paar Texte, die eine Client-Insel nicht
          als Prop bekommen kann — Fehlergrenzen und Validierungsmeldungen.
          Aufgelöst wird hier, auf dem Server; über die Grenze gehen nur
          fertige Zeichenketten, kein Wörterbuch. Ausführlich in
          `src/i18n/sprach-provider.tsx`.

          Er steht **innerhalb** von `<body>` und umschliesst `main`, damit
          `app/error.tsx` darunter liegt: die Fehlergrenze rendert als Kind
          ihres Layouts, und nur so erreicht sie der Context.
        */}
        <SprachProvider
          texte={{
            locale: sprache,
            fehler: t.fehler,
            validierung: t.validierung,
            formular: t.formular,
          }}
        >
          <main id="inhalt" className="flex flex-1 flex-col">
            {children}
          </main>
        </SprachProvider>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
      </body>
    </html>
  );
}
