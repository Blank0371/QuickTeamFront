import type { Metadata } from "next";
import { leseSprache } from "@/i18n/sprache";

import { RechtsDokument } from "@/components/rechtsdokument";
import { Hinweis } from "@/components/rechtstext";
import { holeTexte } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const englisch = (await leseSprache()) === "en";
  return {
    title: englisch ? "Data Processing Agreement" : "Auftragsverarbeitungsvertrag",
    description: englisch ? "Agreement between your business and QuickTeam as processor, including instructions, safeguards and subprocessors." : "Auftragsverarbeitungsvertrag nach Art. 28 DSGVO zwischen dem Betrieb als Verantwortlichem und QuickTeam als Auftragsverarbeiter — mit Weisungen, technischen Massnahmen und der Liste der Unterauftragsverarbeiter.",
    alternates: { canonical: "/avv" },
  };
}

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
 * Bis zum 2026-09-13 war der AVV eine Vorlage mit `[Firma / Name des
 * Kunden]`, `[Anschrift]` und `[gesetzliche Vertretung]`, und der Kasten
 * behauptete, diese Angaben würden bei der Registrierung aus den Daten
 * des Betriebs übernommen. Die rechtliche Durchsicht vom 2026-09-13
 * (Befund 3) hat das zu Recht bemängelt: eine Anschrift fragt die
 * Registrierung gar nicht ab, und ausgefüllt wurde nie etwas.
 *
 * Seither bestimmt der Vertragstext die Partei über das Kundenkonto
 * (§ 1 Abs. 4 AGB), und § 1 Abs. 5 AVV beschreibt den elektronischen
 * Abschluss samt Vertretungsversicherung. Der Kasten erklärt genau das —
 * und nichts, was der Code nicht tut: gespeichert werden Fassung,
 * Zeitpunkt und handelndes Konto (`rechtliche_zustimmungen`), und die
 * Versicherung steht im Text von `ZustimmungFeld`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Anlage 3 ist eine Tabelle
 * ─────────────────────────────────────────────────────────────────────
 *
 * Sie listet die Unterauftragsverarbeiter — seit dem 2026-09-13 Supabase,
 * Vercel, Resend, Expo, Apple, Google und WEB.DE —, je mit Ort der
 * Verarbeitung und Übermittlungsgrundlage.
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
