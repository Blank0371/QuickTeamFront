"use client";

import Link from "next/link";
import { useState } from "react";

import { AbrechnungUmschalter } from "@/components/preise/abrechnung-umschalter";
import type { PreisKarte } from "@/lib/preis-karten";
import { type Abrechnung } from "@/lib/site";

/**
 * Preiskarten der Seite `/preise` samt Monatlich/Jährlich-Umschalter (helle
 * Variante). Gegenstück zu `pricing-karten.tsx` auf der Landing; dieselbe
 * Datenquelle (`bauePreisKarten`), nur die Farbwelt ist die der Site
 * (`surface`/`line`/`signal`) statt der dunklen Bühne.
 *
 * Client-Bauteil, weil der Umschalter die Preise ohne Serveraufruf tauscht.
 * Rahmen, Überschrift und der Custom-Streifen bleiben in der Server-Seite.
 */
export function PreisListe({
  karten,
  proMonat,
  proJahr,
  monatlich,
  jaehrlich,
  vorteil,
  ustHinweis,
  testphaseTage,
  b2b,
  authOffen,
  baldLabel,
  baldText,
}: {
  karten: PreisKarte[];
  proMonat: string;
  proJahr: string;
  monatlich: string;
  jaehrlich: string;
  vorteil: string;
  ustHinweis: string;
  testphaseTage: number;
  b2b: string;
  authOffen: boolean;
  baldLabel: string;
  baldText: string;
}) {
  const [intervall, setIntervall] = useState<Abrechnung>("monat");
  const istJahr = intervall === "jahr";

  return (
    <div>
      <div className="flex justify-center sm:justify-start">
        <AbrechnungUmschalter
          wert={intervall}
          beiWechsel={setIntervall}
          monatlich={monatlich}
          jaehrlich={jaehrlich}
          vorteil={vorteil}
          variante="hell"
        />
      </div>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {karten.map((karte) => (
          <li
            key={karte.id}
            className="flex flex-col rounded-panel border border-line bg-surface p-6 shadow-card"
          >
            <h3 className="font-display text-xl">{karte.name}</h3>

            <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className="whitespace-nowrap font-display text-3xl text-text">
                {istJahr ? karte.jahrBetrag : karte.monatBetrag}
              </span>
              <span className="text-sm text-muted">{istJahr ? proJahr : proMonat}</span>
              <span className="text-xs text-muted">{ustHinweis}</span>
            </p>

            {/* Nur jährlich: durchgestrichener Vergleich + Vorteil. Feste
                Höhe, damit die Karten beim Umschalten nicht springen. */}
            <p className="mt-1 min-h-[1.25rem] text-sm">
              {istJahr ? (
                <>
                  <span className="text-muted line-through">{karte.jahrStatt}</span>{" "}
                  <span className="font-medium text-signal">{vorteil}</span>
                </>
              ) : null}
            </p>

            <p className="mt-3 text-sm font-medium text-text">{karte.grenze}</p>

            <p className="mt-4 grow text-sm leading-relaxed text-muted">
              {testphaseTage} Tage testen, danach {istJahr ? "jährliche" : "monatliche"} Abrechnung im Voraus.{" "}
              {istJahr ? karte.jahrKuendigung : karte.monatKuendigung}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">{b2b}</p>

      {/*
        Derselbe Schalter wie in Kopfzeile, Fussbereich und Middleware.
        Steht die Sperre, führte ein Knopf auf `/registrieren` ins Leere —
        dann steht dort die ehrliche Auskunft statt eines Formulars.
      */}
      {authOffen ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/registrieren?abrechnung=${intervall}`}
            className="rounded-blk bg-signal px-6 py-3 text-center text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            Betrieb anlegen
          </Link>
          <p className="text-sm text-muted">
            Den Plan wählst du während der Einrichtung — wechseln geht dort jederzeit.
          </p>
        </div>
      ) : (
        <p className="mt-8 max-w-xl rounded-blk border border-dashed border-line px-5 py-4 text-sm leading-relaxed text-muted">
          <span className="font-medium text-text">{baldLabel}.</span> {baldText}
        </p>
      )}
    </div>
  );
}
