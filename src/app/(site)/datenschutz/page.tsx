import type { Metadata } from "next";

import { RechtsDokument } from "@/components/rechtsdokument";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Wie QuickTeam personenbezogene Daten verarbeitet: Rollenverteilung zwischen Arbeitgeber und Anbieter, Rechtsgrundlagen, Aufbewahrung und Ihre Betroffenenrechte.",
  alternates: { canonical: "/datenschutz" },
};

/**
 * Datenschutzerklärung — gerendert aus `docs/rechtliches/legals/`.
 *
 * **Verschoben am 2026-09-10.** Die beiden Dateien lagen zusätzlich eine
 * Ebene höher, byte-identisch. Zwei gleiche Fassungen eines Rechtstexts
 * sind eine Gelegenheit, die falsche zu pflegen — jetzt liegen alle
 * sechs Dokumente in `legals/`, beschrieben vom README daneben, und
 * alle vier Rechtsrouten zeigen in dasselbe Verzeichnis.
 *
 * Das Lesen, der Rahmen und die Sprachauflösung stehen jetzt in
 * `RechtsDokument`; hier bleibt nur, **welches** Dokument gemeint ist.
 * Die Gründe dafür, den Text nicht ins JSX zu schreiben und ihn zur
 * Laufzeit zu lesen, stehen dort und sind unverändert gültig.
 *
 * **Geändert am 2026-09-10: kein eigener `?sprache=`-Umschalter mehr.**
 * Die Seite folgt dem Cookie `qt_sprache` wie jede andere. Ausführlich
 * begründet in `src/components/rechtsdokument.tsx`; kurz: zwei
 * Umschalter, die voneinander nichts wissen, widersprechen sich
 * zwangsläufig.
 *
 * `export const dynamic = "force-dynamic"` ist damit ebenfalls
 * entfallen. Es stand hier wegen `searchParams`; die Sprache kommt jetzt
 * aus `cookies()`, und ein Cookie-Zugriff macht die Route ohnehin
 * dynamisch — Next erkennt das selbst.
 */
export default function DatenschutzSeite() {
  return (
    <RechtsDokument
      dateien={{
        de: "legals/datenschutzerklaerung-de.md",
        en: "legals/privacy-policy-en.md",
      }}
      titel={{
        de: "Datenschutzerklärung",
        en: "Privacy Policy",
      }}
    />
  );
}
