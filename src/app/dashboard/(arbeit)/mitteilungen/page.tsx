import type { Metadata } from "next";

import { Container } from "@/components/container";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { holeOffeneAusschreibungen } from "@/lib/dashboard/ausschreibung";
import { holeMitteilungen, markiereAlsGelesen } from "@/lib/dashboard/mitteilungen";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { AusschreibungenAbschnitt } from "./ausschreibungen-abschnitt";
import { MitteilungenListe } from "./mitteilungen-liste";
import { MitteilungVerfassen } from "./neue-mitteilung-formular";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await leseSprache());
  return {
    title: t.mitteilungen.metaTitel,
    description: t.mitteilungen.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

/**
 * Rundschreiben des Betriebs — Ankündigungen, Checklisten, Umfragen.
 *
 * Referenz: `messages.tsx`/`compose.tsx` in der Expo-App, Parity-Audit
 * vom 2026-08-31. Absichtlich ausserhalb dieser Seite: `notfall_
 * vertretung`, `schicht_ausschreibung`, `schicht_tausch` und
 * `aenderungswunsch` — die teilen sich in der App denselben Feed-Screen,
 * gehören laut `CLAUDE.md` aber zu Notfall bzw. Tausch, eigenen
 * Prüfbereichen.
 *
 * Für beide Rollensichten: anders als Team oder Planung ist dieser
 * Bereich kein Chef-Werkzeug — jedes aktive Mitglied darf Ankündigungen
 * und Umfragen posten, Aufgaben abhaken, abstimmen. Nur die Checkliste
 * bleibt dem Chef vorbehalten, geprüft in `ankuendigung_erstellen()`
 * selbst, gespiegelt in `erlaubteKategorien()`.
 */
export default async function MitteilungenSeite() {
  const { supabase, position } = await betreteDashboard();
  const sprache = await leseSprache();
  const t = getDictionary(sprache).mitteilungen;

  const [mitteilungen, ausschreibungen] = await Promise.all([
    holeMitteilungen(supabase, position.betriebId, position.mitarbeiterId),
    holeOffeneAusschreibungen(supabase, position.betriebId, position.mitarbeiterId),
  ]);
  await markiereAlsGelesen(supabase, mitteilungen);

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl leading-tight sm:text-3xl">{t.titel}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">{t.intro}</p>

        {/*
          Offene Schichten stehen über dem Einstieg ins Verfassen: sie
          sind das Einzige auf dieser Seite mit einer Frist. Wer hier
          hereinkommt, um etwas anzukündigen, drückt einen Knopf; wer eine
          Schicht übernehmen könnte, soll das nicht übersehen.
        */}
        <AusschreibungenAbschnitt
          ausschreibungen={ausschreibungen}
          texte={t}
          locale={sprache}
        />

        <div className="mt-8 flex flex-col">
          <MitteilungVerfassen chef={istChef(position)} texte={t} />
        </div>

        <MitteilungenListe mitteilungen={mitteilungen} texte={t} locale={sprache} />
      </div>
    </Container>
  );
}
