"use client";

import { useActionState, useState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { WahlKarte } from "@/components/formular/wahl";
import { RadioGroup } from "@/components/ui/radio-group";
import { leererZustand, type FormZustand } from "@/lib/formular";
import type { Dictionary } from "@/i18n/de";
import { plaene, type Abrechnung, type PlanId } from "@/lib/site";

import { planWaehlen } from "./aktionen";

/**
 * Plan-Auswahl von Schritt 2.
 *
 * Echte Radiobuttons in einem `<fieldset>`, nur optisch als Karten. Eine
 * Sammlung anklickbarer `<div>`s sähe genauso aus und wäre mit der
 * Tastatur nicht bedienbar — Pfeiltasten innerhalb einer Radiogruppe
 * bekommt man geschenkt, sobald es wirklich Radiobuttons sind.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Der Monats/Jahres-Umschalter (seit 2026-09-21)
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis dahin zeigte dieser Schritt nur die auf `/preise` getroffene Wahl
 * an; geändert wurde sie dort. Jetzt steht hier ein echter Umschalter:
 * `intervall` ist Client-Zustand, damit die Preiszeilen sofort umspringen,
 * und wandert über das versteckte Radiofeld `intervall` an die Server
 * Action, die es dem Preisseiten-Cookie vorzieht.
 */
export function PlanAuswahl({
  aktuell,
  intervall,
  grenzen,
  proMonat,
  proJahr,
  ustHinweis,
  uidFeld,
  texte,
  aktion = planWaehlen,
}: {
  aktuell: PlanId;
  /**
   * Anfangswert des Umschalters — auf der Preisseite gewählt und im Cookie
   * durchgereicht (`abrechnung-merker.ts`), sonst monatlich bzw. das
   * Intervall eines bestehenden Abos.
   */
  intervall: Abrechnung;
  grenzen: Dictionary["planGrenzen"];
  proMonat: string;
  proJahr: string;
  ustHinweis: string;
  /**
   * Gesetzt für Betriebe in AT und DE (Kursänderung 2026-09-21). `land`
   * steuert Beschriftung und Formprüfung, `vorbelegt` ist die bei Stripe
   * hinterlegte Nummer.
   */
  uidFeld: { vorbelegt: string | null; land: "AT" | "DE" } | null;
  texte: Dictionary["stepper"]["zahlung"];
  /**
   * Welche Server Action den Plan entgegennimmt: `planWaehlen` für einen
   * bestehenden Betrieb (Neuabschluss), `planMerken` für den noch nicht
   * angelegten Betrieb (parkt die Wahl in der Stripe-Metadata).
   */
  aktion?: (zustand: FormZustand, formData: FormData) => Promise<FormZustand>;
}) {
  const [zustand, formAktion] = useActionState(aktion, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["uid"]);

  const [gewaehltesIntervall, setzeIntervall] = useState<Abrechnung>(intervall);
  const jaehrlich = gewaehltesIntervall === "jahr";

  const uidLabel = uidFeld?.land === "DE" ? texte.uidLabelDe : texte.uidLabel;
  const uidHinweis = uidFeld?.land === "DE" ? texte.uidHinweisDe : texte.uidHinweis;

  return (
    <form action={formAktion} onBlur={beiVerlassen} className="flex flex-col gap-6">
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      {/*
        Der Umschalter monatlich/jährlich. Eigene Radiogruppe mit `name`,
        damit Radix das versteckte echte Feld mitschickt; `value`/
        `onValueChange` machen ihn zum Client-Zustand, an dem die
        Preiszeilen der Pläne hängen.
      */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-text">{texte.intervallLegende}</legend>
        <RadioGroup
          name="intervall"
          value={gewaehltesIntervall}
          onValueChange={(wert) => setzeIntervall(wert === "jahr" ? "jahr" : "monat")}
          className="gap-3 sm:grid-cols-2"
        >
          <WahlKarte wert="monat" titel={texte.monatlich} text={texte.monatVorteil} />
          <WahlKarte wert="jahr" titel={texte.jaehrlich} text={texte.jahrVorteil} />
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-text">{texte.planLegende}</legend>

        {/*
          `gap-3` und nicht enger: die gewählte Karte wächst um zwei
          Prozent, und ohne diese Luft schöbe sie sich sichtbar unter
          ihre Nachbarn.
        */}
        <RadioGroup name="plan" defaultValue={aktuell} className="gap-3">
          {plaene.map((plan) => (
            <WahlKarte
              key={plan.id}
              wert={plan.id}
              titel={plan.name}
              /*
                Als eine Zeichenkette statt aus Teilen zusammengesetzt:
                React schiebt zwischen zwei Ausdrücke einen
                Kommentar-Marker, und dann steht im HTML `29<!-- --> €`.
                Sichtbar ist das nicht, aber es zerreisst die Zeile beim
                Kopieren und bei jeder Suche über den Quelltext.
              */
              text={`${jaehrlich ? plan.preisJahr : plan.preis} € ${jaehrlich ? proJahr : proMonat} · ${grenzen[plan.id]}`}
            />
          ))}
        </RadioGroup>

        <p className="mt-3 text-xs text-muted">{ustHinweis}</p>
      </fieldset>

      {uidFeld ? (
        <TextFeld
          id="uid"
          name="uid"
          label={uidLabel}
          required={false}
          autoComplete="off"
          maxLength={20}
          defaultValue={zustand.werte?.uid ?? uidFeld.vorbelegt ?? ""}
          fehler={fehlerFuer("uid", zustand.felder)}
          hinweis={uidHinweis}
        />
      ) : null}

      {/*
        Stripe-Rabattcode — freiwillig, echter `promotion_code` und nicht
        der interne Partner-Promo-Code. Ein unbekannter Code kommt als
        Feldfehler aus der Server Action zurück.
      */}
      <TextFeld
        id="coupon"
        name="coupon"
        label={texte.couponLabel}
        required={false}
        autoComplete="off"
        maxLength={40}
        defaultValue={zustand.werte?.coupon ?? ""}
        fehler={zustand.felder?.["coupon"]}
        hinweis={texte.couponHinweis}
      />

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <span className="sm:w-auto">
          <AbsendenButton laufend={texte.weiterLaufend}>{texte.weiterZahlung}</AbsendenButton>
        </span>
      </div>
    </form>
  );
}
