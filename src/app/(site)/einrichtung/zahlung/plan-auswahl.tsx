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
import { plaene, TESTPHASE_TAGE, type PlanId } from "@/lib/site";

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
function UeberspringenButton() {
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
      Später hinterlegen
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
  grenzen,
  proMonat,
  ustHinweis,
  uidFeld,
}: {
  aktuell: PlanId;
  grenzen: Dictionary["planGrenzen"];
  proMonat: string;
  ustHinweis: string;
  /**
   * Gesetzt nur für Betriebe in Österreich — dort entscheidet die UID über
   * Reverse Charge. `vorbelegt` ist die bei Stripe hinterlegte Nummer.
   */
  uidFeld: { vorbelegt: string | null } | null;
}) {
  const [zustand, aktion] = useActionState(planWaehlen, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung(["uid"]);

  return (
    <form action={aktion} onBlur={beiVerlassen} className="flex flex-col gap-6">
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-text">Plan wählen</legend>

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
              text={`${plan.preis} € ${proMonat} · ${grenzen[plan.id]}`}
            />
          ))}
        </RadioGroup>

        <p className="mt-3 text-xs text-muted">{ustHinweis}</p>
      </fieldset>

      {uidFeld ? (
        <TextFeld
          id="uid"
          name="uid"
          label="UID-Nummer (optional)"
          required={false}
          autoComplete="off"
          maxLength={20}
          defaultValue={zustand.werte?.uid ?? uidFeld.vorbelegt ?? ""}
          fehler={fehlerFuer("uid", zustand.felder)}
          hinweis="Mit gültiger UID rechnen wir ohne Umsatzsteuer ab (Reverse Charge), ohne UID mit. Später änderbar unter Einstellungen → Abo verwalten."
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <span className="sm:w-auto">
          <AbsendenButton laufend="Einen Moment …">Weiter zur Zahlung</AbsendenButton>
        </span>
        <UeberspringenButton />
      </div>

      <p className="text-xs leading-relaxed text-muted">
        In beiden Fällen laufen zuerst {TESTPHASE_TAGE} Tage kostenlos. Ohne hinterlegtes
        Zahlungsmittel pausiert dein Betrieb danach, bis du eins nachträgst — deine Daten
        bleiben dafür 90 Tage erhalten.
      </p>
    </form>
  );
}
