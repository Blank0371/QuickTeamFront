"use client";

import { SelectFeld, TextFeld } from "@/components/formular/felder";
import type { Dictionary } from "@/i18n/de";

/**
 * Die Rechnungsanschrift über dem Zahlungsformular.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum sie hier steht und nicht im Kundenportal
 * ─────────────────────────────────────────────────────────────────────
 *
 * Entscheidung vom 2026-09-14: **vor** der Aktivierung eines
 * kostenpflichtigen Abonnements, nicht danach. Das Stripe-Kundenportal
 * bleibt der Ort zum *Ändern* — es taugt aber nicht zum erstmaligen
 * Vervollständigen, weil man es erst erreicht, wenn ein Abo schon läuft.
 * Die erste Rechnung wäre dann bereits ohne Anschrift gestellt.
 *
 * **Nicht im Planwahl-Schritt.** Dort entsteht das Abo mit Testphase und
 * ohne Zahlungsmittel; es wird nichts abgebucht und keine Rechnung
 * gestellt. Eine Pflichtanschrift vor einem unentgeltlichen Test wäre
 * eine Hürde ohne Zweck — kostenloses Testen ohne Zahlungsmittel bleibt
 * ausdrücklich möglich.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Firma ist nicht Betriebsname
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betriebe.name` ist die Bezeichnung im Dienstplan („Café am Markt"),
 * auf die Rechnung gehört die Firma nach § 14 Abs. 4 Nr. 1 UStG
 * („Marktcafé Huber GmbH"). Vorbelegt wird mit dem Betriebsnamen, weil
 * es bei Einzelunternehmen meistens stimmt — überschreibbar, weil es
 * das oft genug nicht tut.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Das Land hier ist das RECHNUNGSLAND
 * ─────────────────────────────────────────────────────────────────────
 *
 * Nicht der Standort des Betriebs. Seit dem 2026-09-14 sind das zwei
 * verschiedene Angaben, und die Trennung ist keine Feinheit:
 * `betriebe.land` steuert die Arbeitszeitprüfung
 * (`pruefe_zuweisung_regeln`, `netto_arbeitszeit_stunden` — Höchst­arbeits­zeit,
 * Ruhezeit, Pausen). Wer hier die Rechnungsadresse auf den Sitz seines
 * Steuerberaters ändert, darf damit nicht die arbeitsrechtliche
 * Bewertung der Schichten seiner Beschäftigten verschieben.
 *
 * Das Feld schreibt deshalb **ausschliesslich** an den Stripe-Kunden.
 * Der Hinweistext sagt das auch — ein Auswahlfeld, dessen Reichweite
 * man raten muss, ist ein Auswahlfeld, das falsch bedient wird.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die UID hängt am Rechnungsland
 * ─────────────────────────────────────────────────────────────────────
 *
 * Unverändert zum bestehenden Steuerablauf: nur für `AT`, freiwillig.
 * Sie entscheidet bei Stripe Tax über das Reverse-Charge-Verfahren; für
 * einen deutschen Inlandsumsatz ändert sie nichts, deshalb gibt es dort
 * kein Feld. Weil das Land hier **wählbar** ist, erscheint und
 * verschwindet das Feld mit der Auswahl — die Server Action verwirft
 * einen Wert, der trotzdem zu einem deutschen Rechnungsland hereinkommt,
 * und **entfernt eine bereits hinterlegte UID**, sobald das
 * Rechnungsland nicht mehr Österreich ist.
 *
 * Genau darauf weist der Warnhinweis unten hin. Eine stehen gebliebene
 * `ATU…` an einem deutschen Rechnungsempfänger wäre keine harmlose
 * Altlast, sondern eine falsche Grundlage für die Steuerbehandlung —
 * und der Kunde erführe es erst auf der Rechnung.
 */
export type RechnungsWerte = {
  rechnung_firma: string;
  rechnung_strasse: string;
  rechnung_plz: string;
  rechnung_ort: string;
  land: string;
  uid: string;
};

export function RechnungsFelder({
  werte,
  beiAenderung,
  felder,
  uidVorhanden,
  texte,
  laender,
}: {
  werte: RechnungsWerte;
  beiAenderung: (feld: keyof RechnungsWerte, wert: string) => void;
  texte: Dictionary["stepper"]["rechnung"];
  laender: readonly { code: string; name: string }[];
  /** Feldfehler aus der Browser- oder der Serverprüfung. */
  felder: Record<string, string>;
  /**
   * Stand **beim Laden**, nicht der aktuelle Feldinhalt.
   *
   * Der Warnhinweis soll erscheinen, wenn eine bereits gespeicherte UID
   * durch den Länderwechsel wegfiele — nicht, wenn jemand gerade eine
   * eintippt und sich dann für Deutschland entscheidet. Deshalb der
   * eingefrorene Ausgangswert und nicht `werte.uid`.
   */
  uidVorhanden: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-panel border border-line bg-surface-sunk p-4 sm:p-5">
      <legend className="px-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {texte.legende}
      </legend>

      <p className="text-sm leading-relaxed text-muted">
        {texte.intro}
      </p>

      <TextFeld
        id="rechnung-firma"
        name="rechnung_firma"
        label={texte.firma}
        autoComplete="organization"
        maxLength={120}
        wert={werte.rechnung_firma}
        beiEingabe={(wert) => beiAenderung("rechnung_firma", wert)}
        fehler={felder["rechnung_firma"]}
        hinweis={texte.firmaHinweis}
      />

      <TextFeld
        id="rechnung-strasse"
        name="rechnung_strasse"
        label={texte.strasse}
        autoComplete="street-address"
        maxLength={120}
        wert={werte.rechnung_strasse}
        beiEingabe={(wert) => beiAenderung("rechnung_strasse", wert)}
        fehler={felder["rechnung_strasse"]}
      />

      {/*
        Zwei Spalten ab `sm`, darunter untereinander: Postleitzahl und
        Ort gehören zusammen gelesen, und auf 375px nebeneinander wäre
        das Ortsfeld zu schmal für „Bad Reichenhall".
      */}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,9rem)_1fr]">
        <TextFeld
          id="rechnung-plz"
          name="rechnung_plz"
          label={texte.plz}
          autoComplete="postal-code"
          maxLength={10}
          wert={werte.rechnung_plz}
          beiEingabe={(wert) => beiAenderung("rechnung_plz", wert)}
          fehler={felder["rechnung_plz"]}
        />
        <TextFeld
          id="rechnung-ort"
          name="rechnung_ort"
          label={texte.ort}
          autoComplete="address-level2"
          maxLength={80}
          wert={werte.rechnung_ort}
          beiEingabe={(wert) => beiAenderung("rechnung_ort", wert)}
          fehler={felder["rechnung_ort"]}
        />
      </div>

      <SelectFeld
        id="rechnung-land"
        name="land"
        label={texte.land}
        optionen={laender}
        defaultValue={werte.land}
        beiAenderung={(wert) => beiAenderung("land", wert)}
        fehler={felder["land"]}
        hinweis={texte.landHinweis}
      />

      {/*
        Der Hinweis erscheint genau dann, wenn er etwas zu sagen hat:
        eine hinterlegte UID war da, und das Rechnungsland ist nicht mehr
        Österreich. Dann wird sie beim Speichern entfernt, und das gehört
        vorher gesagt statt hinterher entdeckt.

        Bewusst **ohne Betragsangabe**. Welcher Steuersatz sich ergibt,
        rechnet Stripe Tax aus den Registrierungen und der OSS-Einstellung
        des Kontos — eine hier ausgerechnete Zahl wäre geraten, und eine
        geratene Steuerangabe ist schlimmer als gar keine.
      */}
      {uidVorhanden && werte.land !== "" && werte.land !== "AT" ? (
        <p
          role="status"
          className="rounded-blk border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-text"
        >
          {texte.uidWarnung}
        </p>
      ) : null}

      {werte.land === "AT" ? (
        <TextFeld
          id="rechnung-uid"
          name="uid"
          label={texte.uidLabel}
          maxLength={20}
          required={false}
          wert={werte.uid}
          beiEingabe={(wert) => beiAenderung("uid", wert)}
          fehler={felder["uid"]}
          hinweis={texte.uidHinweis}
        />
      ) : null}
    </fieldset>
  );
}
