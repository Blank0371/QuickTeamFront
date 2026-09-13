import type { Metadata } from "next";

import { RechtstextSeite } from "@/components/rechtstext";
import { holeTexte } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Impressum",
  description:
    "Anbieterkennzeichnung von QuickTeam: Firma, Sitz, Vertretung, Registergericht, Handelsregisternummer und Umsatzsteuer-Identifikationsnummer.",
  alternates: { canonical: "/impressum" },
};

/**
 * Angaben nach § 5 DDG.
 *
 * **§ 5 DDG, nicht § 5 TMG.** Das Telemediengesetz ist am 14. Mai 2024
 * durch das Digitale-Dienste-Gesetz abgelöst worden; die
 * Anbieterkennzeichnung steht seither dort. Ein Impressum, das noch das
 * TMG zitiert, nennt eine Norm, die es nicht mehr gibt.
 *
 * **Kein Österreich-Teil mehr.** Die Vorgängerfassung nannte zusätzlich
 * § 5 ECG und § 25 MedienG. Anbieterin ist eine deutsche UG mit Sitz in
 * Ostfildern — für sie gilt deutsches Recht, unabhängig davon, dass
 * QuickTeam sich an Betriebe in beiden Ländern richtet.
 *
 * **Kontaktadresse und Telefonnummer sind vom Auftraggeber genannt
 * worden**, nicht aus dem Repository abgeleitet: `blanktrading@web.de`
 * und `+43 664 2538798`.
 *
 * **Die Telefonnummer steht seit dem 2026-09-13 hier.** Vorher hiess es
 * an dieser Stelle, die E-Mail allein erfülle § 5 Abs. 1 Nr. 2 DDG. Die
 * rechtliche Durchsicht vom 2026-09-13 (Befund 4) hat das zu Recht als zu
 * pauschal bemängelt: Nach EuGH C-298/07 (Rn. 25, 40) braucht es neben der
 * E-Mail einen weiteren schnellen, unmittelbaren und effizienten
 * Kommunikationsweg. Ein Telefon ist dafür nicht zwingend, erfüllt es aber.
 * Die Nummer muss tatsächlich erreichbar sein.
 *
 * **Keine Aussage zur Verbraucherschlichtung, kein OS-Link.** Die
 * OS-Plattform der EU-Kommission ist am 20. Juli 2025 eingestellt
 * worden; ein Link dorthin ginge ins Leere. Ob eine Bereitschaft zur
 * Teilnahme an einem Streitbeilegungsverfahren besteht, ist eine
 * Entscheidung des Unternehmens und keine, die hier erfunden wird.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Zweisprachig sind die Rubriken, nicht die Angaben
 * ─────────────────────────────────────────────────────────────────────
 *
 * „Registergericht" wird zu „Registering court", „Amtsgericht Stuttgart"
 * aber nicht. Registerangaben sind Tatsachen und keine Übersetzung: das
 * Gericht heisst so, die Nummer lautet so, die Strasse heisst so. Wer
 * „Amtsgericht" zu „District Court" macht, benennt eine Einrichtung, die
 * es unter dem Namen nicht gibt — und ein Impressum ist genau der Ort,
 * an dem jemand diese Angabe nachschlagen können muss.
 *
 * Aus demselben Grund bleibt „BlankTrading UG (haftungsbeschränkt)"
 * unangetastet: der Rechtsformzusatz ist Teil der Firma.
 */
export default async function ImpressumSeite() {
  const t = await holeTexte();

  return (
    <RechtstextSeite titel={t.rechtliches.impressum} lead={t.rechtliches.impressumLead}>
      <h2>{t.rechtliches.diensteanbieter}</h2>
      <p>
        BlankTrading UG (haftungsbeschränkt)
        <br />
        Gabriele-Münter-Straße 31
        <br />
        73760 Ostfildern
        <br />
        Deutschland
      </p>

      <h2>{t.rechtliches.kontakt}</h2>
      <p>
        E-Mail: <a href="mailto:blanktrading@web.de">blanktrading@web.de</a>
        <br />
        {t.rechtliches.telefon}: <a href="tel:+436642538798">+43 664 2538798</a>
      </p>

      <h2>{t.rechtliches.vertretenDurch}</h2>
      <p>{t.rechtliches.geschaeftsfuehrer} Leo Solomon</p>

      <h2>{t.rechtliches.register}</h2>
      <p>
        {t.rechtliches.registergericht}: Amtsgericht Stuttgart
        <br />
        {t.rechtliches.handelsregister}: HRB 795737
        <br />
        EUID: DEB8534.HRB795737
      </p>

      <h2>{t.rechtliches.ustIdTitel}</h2>
      <p>
        {t.rechtliches.ustIdText}
        <br />
        DE369517679
      </p>

      <h2>{t.rechtliches.inhaltVerantwortlich}</h2>
      <p>
        Leo Solomon
        <br />
        {t.rechtliches.anschriftWieOben}
      </p>
    </RechtstextSeite>
  );
}
