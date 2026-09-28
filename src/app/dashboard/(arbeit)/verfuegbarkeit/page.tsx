import type { Metadata } from "next";

import { Container } from "@/components/container";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { wochentageLang } from "@/lib/dashboard/kalender";
import {
  holeMeineVorlagen,
  holeTagesPraeferenzen,
  holeTeamTagesPraeferenzen,
  holeTeamWiederkehrendePraeferenzen,
  holeWiederkehrendePraeferenzen,
} from "@/lib/dashboard/verfuegbarkeit";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";
import { holeVorlagen } from "@/lib/schichten";

import {
  BestehendeTagesPraeferenzenListe,
  TagesWunschEditor,
  WiederkehrendeListe,
} from "./verfuegbarkeit-liste";
import { TeamWuensche } from "./team-wuensche";

export async function generateMetadata(): Promise<Metadata> {
  const { verfuegbarkeit } = await holeTexte();
  return {
    title: verfuegbarkeit.metaTitel,
    description: verfuegbarkeit.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

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
 * Die App hat dafür keine Chef-Ansicht, der Solver liest die Wünsche über
 * `plan-generieren`. Web-eigen: ein Chef sieht hier statt der Eingabe die
 * Tageswünsche seines Teams (`TeamWuensche`). Die Tagesauswahl
 * läuft seit 2026-09-23 im Browser (`TagesWunschEditor`): die Schichten
 * des gewählten Tags erscheinen ohne Neuladen, gespeichert wird erst auf
 * Bestätigung. `?datum=` belegt das Feld nur noch vor.
 */
export default async function VerfuegbarkeitSeite({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string; sortierung?: string }>;
}) {
  const { supabase, position } = await betreteDashboard();
  const { datum: datumRoh, sortierung } = await searchParams;
  const [texte, locale] = await Promise.all([holeTexte(), leseSprache()]);
  const t = texte.verfuegbarkeit;

  /*
   * Der Chef gibt hier keine eigenen Wünsche ein — er plant. Statt der
   * Eingabe sieht er die Tageswünsche seines Teams (web-eigen, seit
   * 2026-09-23). Entschieden an der aktiven Position, nicht am Konto: wer
   * in einem Betrieb Chef und zugleich angestellt ist, wechselt die
   * Position, um eigene Wünsche einzutragen.
   */
  if (istChef(position)) {
    const [wiederkehrend, tageswuensche, vorlagen] = await Promise.all([
      holeTeamWiederkehrendePraeferenzen(supabase, position.betriebId, t.ohneNamen),
      holeTeamTagesPraeferenzen(supabase, position.betriebId, t.ohneNamen),
      holeVorlagen(supabase, position.betriebId),
    ]);
    return (
      <Container className="py-8 sm:py-10">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
          <p className="mt-2 text-base leading-relaxed text-muted">{t.leadChef}</p>
          <TeamWuensche
            wiederkehrend={wiederkehrend}
            tageswuensche={tageswuensche}
            vorlagen={vorlagen}
            sortierung={sortierung === "person" ? "person" : "tag"}
            texte={t}
            locale={locale}
          />
        </div>
      </Container>
    );
  }

  const heute = new Date();
  const heuteIso = isoTag(heute);
  const maxDatumIso = isoTag(new Date(heute.getFullYear(), heute.getMonth() + MONATE_VORAUS + 1, 0));

  const gewaehltesDatum =
    datumRoh && DATUM_REGEX.test(datumRoh) && datumRoh >= heuteIso && datumRoh <= maxDatumIso ? datumRoh : null;

  const [vorlagen, wiederkehrend, tagesPraeferenzen] = await Promise.all([
    holeMeineVorlagen(supabase, position.betriebId, position.mitarbeiterId, t.schicht),
    holeWiederkehrendePraeferenzen(supabase, position.mitarbeiterId),
    holeTagesPraeferenzen(supabase, position.mitarbeiterId),
  ]);

  const vorlagenNamen = Object.fromEntries(
    vorlagen.map((v) => [v.id, `${v.bezeichnung} · ${v.start_zeit.slice(0, 5)}–${v.end_zeit.slice(0, 5)}`]),
  );

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.lead}</p>

        <section className="mt-8">
          <h2 className="font-display text-lg text-text">{t.wiederkehrend}</h2>
          <p className="mt-1 text-sm text-muted">{t.wiederkehrendText}</p>
          <WiederkehrendeListe
            vorlagen={vorlagen}
            praeferenzen={wiederkehrend}
            texte={t}
            wochentage={wochentageLang(locale)}
          />
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg text-text">{t.tagWunsch}</h2>
          <p className="mt-1 text-sm text-muted">{t.tagWunschText}</p>

          <TagesWunschEditor
            vorlagen={vorlagen}
            bestehend={tagesPraeferenzen}
            min={heuteIso}
            max={maxDatumIso}
            startDatum={gewaehltesDatum}
            texte={t}
          />
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg text-text">{t.spezielleTage}</h2>
          <BestehendeTagesPraeferenzenListe
            praeferenzen={tagesPraeferenzen}
            vorlagenNamen={vorlagenNamen}
            texte={t}
          />
        </section>
      </div>
    </Container>
  );
}
