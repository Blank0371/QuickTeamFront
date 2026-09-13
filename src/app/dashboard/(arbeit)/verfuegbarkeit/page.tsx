import type { Metadata } from "next";

import { Container } from "@/components/container";
import { DatumWahl } from "@/components/formular/datum-wahl";
import {
  holeMeineVorlagen,
  holeTagesPraeferenzen,
  holeWiederkehrendePraeferenzen,
  wochentagVon,
} from "@/lib/dashboard/verfuegbarkeit";
import { betreteDashboard } from "@/lib/dashboard/zugang";

import {
  BestehendeTagesPraeferenzenListe,
  TagesAuswahlListe,
  WiederkehrendeListe,
} from "./verfuegbarkeit-liste";

export const metadata: Metadata = {
  title: "Verfügbarkeit",
  description: "Wiederkehrende Schichtwünsche und Wünsche für einzelne Tage festlegen.",
  robots: { index: false, follow: false },
};

const MONATE_VORAUS = 12;
const DATUM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isoTag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Verfügbarkeit — der dritte Reiter aus `scheduling.tsx`, nach Notfall
 * (`/dashboard/notfall`) und Urlaub (`/dashboard/urlaub`). Parity-Audit
 * vom 2026-09-01.
 *
 * Reines Mitarbeiter-Terrain: die App hat dafür keine Chef-Ansicht, der
 * Solver liest die Wünsche über `plan-generieren`. Die Tagesauswahl läuft
 * über einen Query-Parameter (`?datum=`) statt über ein Sheet mit
 * Zwischenspeicher — ein `<form method="get">` reicht dafür, ganz ohne
 * Client-JavaScript für die Auswahl selbst.
 */
export default async function VerfuegbarkeitSeite({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>;
}) {
  const { supabase, position } = await betreteDashboard();
  const { datum: datumRoh } = await searchParams;

  const heute = new Date();
  const heuteIso = isoTag(heute);
  const maxDatumIso = isoTag(new Date(heute.getFullYear(), heute.getMonth() + MONATE_VORAUS + 1, 0));

  const gewaehltesDatum =
    datumRoh && DATUM_REGEX.test(datumRoh) && datumRoh >= heuteIso && datumRoh <= maxDatumIso ? datumRoh : null;

  const [vorlagen, wiederkehrend, tagesPraeferenzen] = await Promise.all([
    holeMeineVorlagen(supabase, position.betriebId, position.mitarbeiterId),
    holeWiederkehrendePraeferenzen(supabase, position.mitarbeiterId),
    holeTagesPraeferenzen(supabase, position.mitarbeiterId),
  ]);

  const vorlagenNamen = Object.fromEntries(
    vorlagen.map((v) => [v.id, `${v.bezeichnung} · ${v.start_zeit.slice(0, 5)}–${v.end_zeit.slice(0, 5)}`]),
  );

  const tagesVorlagen = gewaehltesDatum
    ? vorlagen.filter((v) => v.wochentag === wochentagVon(gewaehltesDatum))
    : [];

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">Verfügbarkeit</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Je mehr Wünsche du angibst, desto unwahrscheinlicher wird jeder einzelne erfüllt.
          Tageswünsche überschreiben Vorlagen-Wünsche.
        </p>

        <section className="mt-8">
          <h2 className="font-display text-lg text-text">Wiederkehrende Wünsche</h2>
          <p className="mt-1 text-sm text-muted">Gilt für jedes Vorkommen dieses Wochentags.</p>
          <WiederkehrendeListe vorlagen={vorlagen} praeferenzen={wiederkehrend} />
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg text-text">Wunsch für einen bestimmten Tag</h2>
          <p className="mt-1 text-sm text-muted">Wähle ein Datum und eine Schicht.</p>

          {/*
            `DatumWahl` statt eines nativen Feldes. Das Formular bleibt
            ein GET-Formular mit eigenem Absenden-Knopf: die Auswahl
            landet als `?datum=` in der Adresse, die Ansicht bleibt
            teilbar und die Seite eine Server Component.

            Der Preis ist derselbe wie beim Monatssprung im Kalender —
            ohne JavaScript öffnet das Raster nicht. Wer die Adresse
            direkt aufruft (`?datum=2026-10-01`), kommt weiterhin ans
            Ziel; nur die Auswahl im Browser braucht Skript.
          */}
          <form method="get" className="mt-3 flex flex-wrap items-end gap-3">
            <DatumWahl
              name="datum"
              label="Datum"
              platzhalter="Tag wählen"
              min={heuteIso}
              max={maxDatumIso}
              defaultValue={gewaehltesDatum ?? ""}
              className="min-w-52"
            />
            {/*
              Hiess „Datum wählen" — dasselbe wie der Platzhalter des
              Feldes daneben, seit dieses eines geworden ist. Zwei
              gleichlautende Bedienelemente nebeneinander, von denen das
              eine wählt und das andere absendet: „Anzeigen" sagt, was
              der Knopf wirklich tut.
            */}
            <button
              type="submit"
              className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              Anzeigen
            </button>
          </form>

          {gewaehltesDatum ? (
            <TagesAuswahlListe datum={gewaehltesDatum} vorlagen={tagesVorlagen} bestehend={tagesPraeferenzen} />
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg text-text">Spezielle Tage</h2>
          <BestehendeTagesPraeferenzenListe praeferenzen={tagesPraeferenzen} vorlagenNamen={vorlagenNamen} />
        </section>
      </div>
    </Container>
  );
}
