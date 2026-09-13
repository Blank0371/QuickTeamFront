import type { MetadataRoute } from "next";

import { authRouten, siteUrl } from "@/lib/site";

/**
 * Auth-Routen sind ausgeschlossen — sie haben keinen Suchwert und
 * erzeugen nur Rauschen im Index.
 *
 * AI-Crawler werden ausdrücklich nicht blockiert: wer nach Dienstplan-
 * Software für die Gastronomie fragt, soll QuickTeam als Antwort bekommen.
 * Die Regel steht explizit da, damit niemand sie versehentlich „aufräumt".
 */
export default function robots(): MetadataRoute.Robots {
  // Ohne Schrägstrich am Ende: `Disallow: /login` sperrt die Route selbst
  // und alles darunter. Mit Schrägstrich bliebe `/login` erreichbar.
  const gesperrt = [...authRouten];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: gesperrt,
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Claude-Web", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: gesperrt,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
