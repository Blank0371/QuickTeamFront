"use client";

import { type FormEvent, useActionState, useRef, useState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, SelectFeld, TextFeld } from "@/components/formular/felder";
import { ZustimmungFeld } from "@/components/formular/zustimmung-feld";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { useKlientTexte } from "@/i18n/sprach-provider";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";
import { PROMO_CODE_MAX } from "@/lib/validierung";

import { pendingInfoSpeichern, promoCodePruefen } from "./aktionen";

type PromoStatus = "ungeprueft" | "pruefend" | "gueltig" | "unbekannt" | "nicht-pruefbar";

/**
 * Das Formular des Betrieb-Schritts: Betriebsname, Land, Chef-Name,
 * optionaler Promo-Code und die AGB/AVV-Vertragsannahme.
 *
 * Seit dem 2026-09-22 ein eigener Schritt nach der Kontoerstellung. Die
 * Session steht bereits; die Angaben werden direkt geschrieben, nicht mehr
 * durch eine Bestätigungsmail geschleust.
 *
 * Ohne JavaScript sendet das Formular normal an die Server Action — die
 * Client-Prüfung ist Komfort, keine Voraussetzung.
 */
export function BetriebFormular({
  texte,
  zustimmungTexte,
  laender,
}: {
  texte: Dictionary["betrieb"];
  zustimmungTexte: Dictionary["zustimmungFeld"];
  laender: readonly { code: string; name: string }[];
}) {
  const [zustand, aktion] = useActionState(pendingInfoSpeichern, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung();
  const { validierung } = useKlientTexte();

  const werte: Record<string, string | undefined> = { ...(zustand.werte ?? {}) };
  const fehler = (feld: string) => fehlerFuer(feld, zustand.felder);

  const [promoWert, setzePromoWert] = useState(werte["promo_code"] ?? "");
  const [promoStatus, setzePromoStatus] = useState<PromoStatus>("ungeprueft");
  const pruefButtonRef = useRef<HTMLButtonElement>(null);
  const [absendeVersucht, setzeAbsendeVersucht] = useState(false);

  // Der Knopf bleibt gesperrt, bis die AGB/AVV-Zustimmung gesetzt ist
  // (Client-Komfort; Zod in der Server Action bleibt die eigentliche
  // Verteidigung). Vorbelegt nach einem Validierungsfehler.
  const [zugestimmt, setzeZugestimmt] = useState(werte["zustimmung"] === "ja");

  async function pruefePromo() {
    const wert = promoWert.trim();
    if (wert === "") return;
    setzePromoStatus("pruefend");
    setzePromoStatus(await promoCodePruefen(wert));
  }

  const promoLeer = promoWert.trim() === "";
  const promoOk = promoLeer || promoStatus === "gueltig" || promoStatus === "nicht-pruefbar";

  function beiAbsenden(ereignis: FormEvent<HTMLFormElement>) {
    if (!promoOk) {
      ereignis.preventDefault();
      setzeAbsendeVersucht(true);
      pruefButtonRef.current?.focus();
    }
  }

  return (
    <form
      action={aktion}
      noValidate
      onSubmit={beiAbsenden}
      onBlur={beiVerlassen}
      className="flex flex-col gap-5"
    >
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <TextFeld
        id="betrieb_name"
        name="betrieb_name"
        label={texte.felder.betriebName}
        autoComplete="organization"
        maxLength={120}
        defaultValue={werte["betrieb_name"]}
        fehler={fehler("betrieb_name")}
      />

      <SelectFeld
        id="land"
        name="land"
        label={texte.felder.land}
        optionen={laender}
        defaultValue={werte["land"]}
        fehler={fehler("land")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextFeld
          id="vorname"
          name="vorname"
          label={texte.felder.vorname}
          autoComplete="given-name"
          maxLength={80}
          defaultValue={werte["vorname"]}
          fehler={fehler("vorname")}
        />
        <TextFeld
          id="nachname"
          name="nachname"
          label={texte.felder.nachname}
          autoComplete="family-name"
          maxLength={80}
          defaultValue={werte["nachname"]}
          fehler={fehler("nachname")}
        />
      </div>

      <TextFeld
        id="promo_code"
        name="promo_code"
        label={texte.promoCode}
        required={false}
        autoComplete="off"
        maxLength={PROMO_CODE_MAX}
        defaultValue={werte["promo_code"]}
        fehler={fehler("promo_code")}
        hinweis={texte.promoCodeHinweis}
        beiEingabe={(wert) => {
          setzePromoWert(wert);
          setzePromoStatus("ungeprueft");
        }}
        unten={
          <div className="flex flex-col gap-2">
            <button
              ref={pruefButtonRef}
              type="button"
              onClick={pruefePromo}
              disabled={promoLeer || promoStatus === "pruefend"}
              className="self-start rounded-blk border border-line-strong px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              {promoStatus === "pruefend" ? texte.promoPruefend : texte.promoPruefen}
            </button>

            <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm">
              {promoStatus === "gueltig" ? (
                <span className="font-medium text-signal">{texte.promoGueltig}</span>
              ) : promoStatus === "unbekannt" ? (
                <span className="font-medium text-stop">
                  {validierung["v.promo.unbekannt"]}
                </span>
              ) : promoStatus === "nicht-pruefbar" ? (
                <span className="text-muted">{texte.promoNichtPruefbar}</span>
              ) : null}
            </p>
          </div>
        }
      />

      <ZustimmungFeld
        variante="betrieb"
        vorbelegt={werte["zustimmung"] === "ja"}
        fehler={fehler("zustimmung")}
        texte={zustimmungTexte}
        beiAenderung={setzeZugestimmt}
      />

      {absendeVersucht && !promoOk ? (
        <p role="alert" className="text-sm font-medium text-stop">
          {promoStatus === "unbekannt"
            ? validierung["v.promo.unbekannt"]
            : texte.promoBittePruefen}
        </p>
      ) : null}

      <AbsendenButton laufend={texte.wirdAngelegt} deaktiviert={!zugestimmt}>
        {texte.betriebAnlegen}
      </AbsendenButton>
    </form>
  );
}
