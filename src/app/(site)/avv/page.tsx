import type { Metadata } from "next";

import { RechtsDokument } from "@/components/rechtsdokument";
import { Hinweis } from "@/components/rechtstext";
import { holeTexte } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Auftragsverarbeitungsvertrag",
  description:
    "Auftragsverarbeitungsvertrag nach Art. 28 DSGVO zwischen dem Betrieb als Verantwortlichem und QuickTeam als Auftragsverarbeiter — mit Weisungen, technischen Massnahmen und der Liste der Unterauftragsverarbeiter.",
  alternates: { canonical: "/avv" },
};

/**
 * AVV / DPA — gerendert aus `docs/rechtliches/legals/`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum dieses Dokument eine eigene Route bekommt
 * ─────────────────────────────────────────────────────────────────────
 *
 * § 7 Abs. 3 der AGB setzt voraus, dass der Kunde den
 * Auftragsverarbeitungsvertrag **bei der Registrierung schliesst**. Ein
 * Vertrag, auf den ein anderer Vertrag verweist und dem jemand zustimmen
 * soll, muss vorher lesbar sein — sonst zeigt § 7 Abs. 3 ins Leere.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum hier ein Hinweis steht und bei AGB und Datenschutz nicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die beiden anderen Dokumente sind fertige Fassungen ohne Lücken. Der
 * AVV ist eine **Vorlage**: `[Firma / Name des Kunden]`, `[Anschrift]`
 * und `[gesetzliche Vertretung]` stehen wörtlich im Text und werden erst
 * beim Abschluss gefüllt. Ohne Einordnung liest sich das wie ein Versehen
 * — als hätte jemand vergessen, die Seite fertig zu machen.
 *
 * Der Kasten sagt deshalb, was die Klammern sind. Er behauptet
 * ausdrücklich **nicht**, der Abschluss sei schon gebaut: laut
 * `docs/rechtliches/legals/README.md` ist der Zustimmungs-Flow in der
 * Anwendung noch offen. Das ist eine Aufgabe, keine Aussage für diese
 * Seite, und sie wird von hier aus nicht miterledigt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Anlage 3 ist eine Tabelle
 * ─────────────────────────────────────────────────────────────────────
 *
 * Sie listet die Unterauftragsverarbeiter — Supabase, Expo, Apple,
 * Google —, je mit Ort der Verarbeitung und Übermittlungsgrundlage.
 * `MarkdownText` kann Tabellen und Blockzitate seit dem 2026-09-10;
 * vorher wäre daraus eine Absatzfolge voller Pipe-Zeichen geworden, und
 * das ausgerechnet bei einer Pflichtangabe nach Art. 28 Abs. 3 lit. d
 * DSGVO.
 */
export default async function AvvSeite() {
  const t = await holeTexte();

  return (
    <RechtsDokument
      dateien={{
        de: "legals/AVV-QuickTeam-de.md",
        en: "legals/DPA-QuickTeam-en.md",
      }}
      titel={{
        de: "Auftragsverarbeitungsvertrag",
        en: "Data Processing Agreement",
      }}
      hinweis={
        <Hinweis titel={t.rechtliches.mustertextTitel}>
          {t.rechtliches.mustertextHinweis}
        </Hinweis>
      }
    />
  );
}
