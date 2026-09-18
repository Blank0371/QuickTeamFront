"use client";

import Link from "next/link";
import { useState } from "react";

import { AbrechnungUmschalter } from "@/components/preise/abrechnung-umschalter";
import type { PreisKarte } from "@/lib/preis-karten";
import { type Abrechnung } from "@/lib/site";

/**
 * Preiskarten der Landingpage samt Monatlich/Jährlich-Umschalter.
 *
 * Client-Bauteil, weil der Umschalter die Preise ohne Serveraufruf tauscht.
 * Der äussere Rahmen (Sektion, Überschrift, B2B-Hinweis) bleibt in der
 * Server Component `pricing-abschnitt.tsx`; hierher wandert nur, was der
 * Zustand berührt — Umschalter, Karten und der Weiter-Knopf, dessen Ziel
 * die gewählte Abrechnung als `?abrechnung=…` mitnimmt.
 */
const HERVORGEHOBEN = "pro";

export function PricingKarten({
  karten,
  proMonat,
  proJahr,
  monatlich,
  jaehrlich,
  vorteil,
  ustHinweis,
  empfehlung,
  b2b,
  authOffen,
  ctaText,
  gesperrtText,
}: {
  karten: PreisKarte[];
  proMonat: string;
  proJahr: string;
  monatlich: string;
  jaehrlich: string;
  vorteil: string;
  ustHinweis: string;
  empfehlung: string;
  b2b: string;
  authOffen: boolean;
  ctaText: string;
  gesperrtText: string;
}) {
  const [intervall, setIntervall] = useState<Abrechnung>("monat");
  const istJahr = intervall === "jahr";

  const gedaempft = (prozent: number) =>
    `color-mix(in oklab, var(--qt-c-bone) ${prozent}%, transparent)`;

  return (
    <div>
      <div className="mt-12 flex justify-center">
        <AbrechnungUmschalter
          wert={intervall}
          beiWechsel={setIntervall}
          monatlich={monatlich}
          jaehrlich={jaehrlich}
          vorteil={vorteil}
          variante="dunkel"
        />
      </div>

      <ul className="mt-12 grid gap-6 sm:mt-14 lg:grid-cols-3 lg:items-end lg:gap-8">
        {karten.map((karte) => {
          const hervorgehoben = karte.id === HERVORGEHOBEN;
          return (
            <li
              key={karte.id}
              className={
                hervorgehoben
                  ? "flex flex-col rounded-panel p-10 lg:scale-105"
                  : "flex flex-col rounded-panel p-10"
              }
              style={{
                background: "var(--qt-c-graphite)",
                border: hervorgehoben
                  ? "1px solid var(--qt-c-bronze)"
                  : `1px solid ${gedaempft(12)}`,
                boxShadow: hervorgehoben
                  ? "0 24px 60px -20px color-mix(in oklab, var(--qt-c-bronze) 45%, transparent)"
                  : undefined,
              }}
            >
              {hervorgehoben ? (
                <p
                  className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--qt-c-bronze-hi)" }}
                >
                  {empfehlung}
                </p>
              ) : null}

              <h3 className="text-xl font-semibold" style={{ color: "var(--qt-c-bone)" }}>
                {karte.name}
              </h3>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold" style={{ color: "var(--qt-c-bone)" }}>
                  {istJahr ? karte.jahrBetrag : karte.monatBetrag}
                </span>
                <span className="text-sm" style={{ color: gedaempft(65) }}>
                  {istJahr ? proJahr : proMonat}
                </span>
                <span className="text-xs" style={{ color: gedaempft(55) }}>
                  {ustHinweis}
                </span>
              </p>

              {/*
                Nur im Jahrestarif: der durchgestrichene Vergleich und der
                Vorteil. Feste Höhe über `min-h`, damit die Karten beim
                Umschalten nicht springen.
              */}
              <p className="mt-1 min-h-[1.25rem] text-sm">
                {istJahr ? (
                  <>
                    <span className="line-through" style={{ color: gedaempft(45) }}>
                      {karte.jahrStatt}
                    </span>{" "}
                    <span className="font-medium" style={{ color: "var(--qt-c-bronze-hi)" }}>
                      {vorteil}
                    </span>
                  </>
                ) : null}
              </p>

              <p className="mt-5 text-sm font-medium" style={{ color: gedaempft(85) }}>
                {karte.grenze}
              </p>
            </li>
          );
        })}
      </ul>

      <p
        className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed"
        style={{ color: gedaempft(60) }}
      >
        {b2b}
      </p>

      {authOffen ? (
        <div className="mt-12 flex justify-center sm:mt-16">
          <Link
            href={`/registrieren?abrechnung=${intervall}`}
            className="flex min-h-[3.5rem] touch-manipulation items-center justify-center rounded-blk px-10 text-base font-semibold transition-colors hover:bg-[var(--qt-c-bronze-hi)] active:translate-y-px"
            style={{ background: "var(--qt-c-bronze)", color: "var(--qt-c-carbon)" }}
          >
            {ctaText}
          </Link>
        </div>
      ) : (
        <p
          className="mx-auto mt-16 max-w-md text-center text-base leading-relaxed sm:mt-20"
          style={{ color: gedaempft(78) }}
        >
          {gesperrtText}
        </p>
      )}
    </div>
  );
}
