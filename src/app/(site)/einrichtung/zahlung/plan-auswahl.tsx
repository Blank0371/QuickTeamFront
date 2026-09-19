"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { WahlKarte } from "@/components/formular/wahl";
import { RadioGroup } from "@/components/ui/radio-group";
import { leererZustand } from "@/lib/formular";
import type { Dictionary } from "@/i18n/de";
import { plaene, TESTPHASE_TAGE, type Abrechnung, type PlanId } from "@/lib/site";

import { planWaehlen } from "./aktionen";

/**
 * „Später hinterlegen" — der zweite Knopf desselben Formulars.
 *
 * Beide Knöpfe müssen den gewählten Plan mitschicken, deshalb ein
 * Formular und nicht zwei. Welcher gedrückt wurde, steht in `name`/`value`
 * des Submitters; dasselbe Muster wie beim erneuten Codeversand.
 *
 * Eigene Komponente, weil `useFormStatus` den Zustand des umgebenden
 * Formulars liest und dafür innerhalb davon stehen muss.
 */
function UeberspringenButton({ text }: { text: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="absicht"
      value="ueberspringen"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-blk border border-line-strong px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {text}
    </button>
  );
}

/**
 * Plan-Auswahl von Schritt 2.
 *
 * Echte Radiobuttons in einem `<fieldset>`, nur optisch als Karten. Eine
 * Sammlung anklickbarer `<div>`s sähe genauso aus und wäre mit der
 * Tastatur nicht bedienbar — Pfeiltasten innerhalb einer Radiogruppe
 * bekommt man geschenkt, sobald es wirklich Radiobuttons sind.
 */
/**
 * `grenzen` und `proMonat` kommen als Prop vom Server-Elternteil, nicht
 * aus dem Context: sie gehören zu **dieser** Seite und nicht zu jedem
 * Formular der Anwendung. Das ist der Normalfall dieses Projekts — der
 * Context trägt nur Querschnittliches (`src/i18n/sprach-provider.tsx`).
 */
export function PlanAuswahl({
  aktuell,
  intervall,
  grenzen,
  proMonat,
  proJahr,
  ustHinweis,
  uidFeld,
  ohneTestphase,
  texte,
}: {
  aktuell: PlanId;
  /**
   * Monatlich oder jährlich — auf der Preisseite gewählt und im Cookie
   * durchgereicht (`abrechnung-merker.ts`). Bestimmt hier nur Anzeige und
   * die versteckte Weitergabe an die Server Action; einen Schalter gibt es
   * in diesem Schritt bewusst nicht.
   */
  intervall: Abrechnung;
  grenzen: Dictionary["planGrenzen"];
  proMonat: string;
  proJahr: string;
  ustHinweis: string;
  /**
   * Gesetzt nur für Betriebe in Österreich — dort entscheidet die UID über
   * Reverse Charge. `vorbelegt` ist die bei Stripe hinterlegte Nummer.
   */
  uidFeld: { vorbelegt: string | null } | null;
  /**
   * Der Betrieb hatte schon ein Abo, das neue beginnt ohne Testphase.
   * Dann gibt es nichts zu überspringen — ohne Zahlung kein Zugang.
   */
  ohneTestphase: boolean;
  texte: Dictionary["stepper"]["zahlung"];
}) {
  const [zustand, aktion] = useActionState(planWaehlen, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["uid"]);

  const jaehrlich = intervall === "jahr";

  return (
    <form action={aktion} onBlur={beiVerlassen} className="flex flex-col gap-6">
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

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

        {/*
          Kein Umschalter, nur die Anzeige: monatlich oder jährlich hat der
          Besucher auf der Preisseite gewählt. Die Zeile macht die Wahl
          sichtbar, statt sie still im Cookie zu lassen — geändert wird sie
          auf `/preise`.
        */}
        <p className="mt-2 text-xs text-muted">
          {texte.abrechnung}{" "}
          <span className="font-medium text-text">
            {jaehrlich ? texte.jaehrlich : texte.monatlich}
          </span>
        </p>
      </fieldset>

      {uidFeld ? (
        <TextFeld
          id="uid"
          name="uid"
          label={texte.uidLabel}
          required={false}
          autoComplete="off"
          maxLength={20}
          defaultValue={zustand.werte?.uid ?? uidFeld.vorbelegt ?? ""}
          fehler={fehlerFuer("uid", zustand.felder)}
          hinweis={texte.uidHinweis}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <span className="sm:w-auto">
          <AbsendenButton laufend={texte.weiterLaufend}>{texte.weiterZahlung}</AbsendenButton>
        </span>
        {ohneTestphase ? null : <UeberspringenButton text={texte.spaeter} />}
      </div>

      {ohneTestphase ? null : (
        <p className="text-xs leading-relaxed text-muted">
          {texte.testphasenHinweis.replace("{tage}", String(TESTPHASE_TAGE))}
        </p>
      )}
    </form>
  );
}
