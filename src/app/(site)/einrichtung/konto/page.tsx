import type { Metadata } from "next";
import Link from "next/link";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { abmelden } from "@/lib/auth-aktionen";
import { einzelwert, meldungFuer } from "@/lib/auth-meldungen";
import { betreteSchritt } from "@/lib/einrichtung";
import { leseBetriebsdaten } from "@/lib/registrierung-merker";
import { FormMeldung } from "@/components/formular/felder";
import { holeTexte } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { TESTPHASE_TAGE } from "@/lib/site";
import { feldSchemata, LAENDER } from "@/lib/validierung";

import { CodeAbschnitt } from "./code-abschnitt";
import { DatenAbschnitt } from "./daten-abschnitt";
import { NachtragenFormular } from "./nachtragen-formular";

export const metadata: Metadata = {
  title: "Konto anlegen",
  description:
    "Betriebsdaten, Zugangsdaten und die Bestätigung deiner E-Mail-Adresse — alles in einem Schritt.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Schritt 1 des Einrichtungs-Steppers.
 *
 * Zusammengelegt am 2026-08-21 aus `/registrieren` und
 * `/auth/bestaetigen`. Die Seite kennt vier Lagen, und sie ergeben sich
 * alle aus dem, was ohnehin da ist — Session, `betrieb_id`, Query-Parameter:
 *
 *   A  keine Session, kein `?email=`   Formular für die Betriebsdaten
 *   B  keine Session, mit `?email=`    Code-Eingabe, Daten zugeklappt darunter
 *   C  Session, kein Betrieb           Betrieb nachtragen
 *   D  Session mit Betrieb             erledigt, Weg nach vorn
 *
 * Lage D ist der Grund, warum die Seite die Session überhaupt ansieht:
 * die Rück-Navigation im Fortschrittsbalken führt hierher zurück, und wer
 * fertig ist, darf dann kein zweites Registrierungsformular sehen.
 *
 * Der Übergang A → B läuft über eine Weiterleitung mit `?email=`, nicht
 * über Client-Zustand. Das kostet nichts und trägt zwei Dinge: der Schritt
 * übersteht einen Reload, und die Adresse ist beim Gerätewechsel schon
 * vorausgefüllt — genau der Fall, für den es Codes statt Links gibt.
 */
export default async function KontoSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const stand = await betreteSchritt("konto");
  const params = await searchParams;

  // Der Parameter ist frei wählbar — nur eine echte Adresse wird übernommen.
  const geprueft = feldSchemata.email.safeParse(einzelwert(params["email"]) ?? "");
  const email = geprueft.success ? geprueft.data : null;

  /*
   * Einmal das ganze Wörterbuch holen — die Seite braucht Texte in jeder
   * ihrer vier Lagen, nicht nur im Formular. Die Länderliste bekommt
   * übersetzte Namen; der gespeicherte Code bleibt `AT`/`DE`.
   */
  const t = await holeTexte();
  const rt = t.registrierung;

  const meldung = meldungFuer(einzelwert(params["fehler"]), t.login.meldungen);
  const laender = LAENDER.map((land) => ({
    code: land.code,
    name: land.code === "AT" ? t.auswahl.landAT : t.auswahl.landDE,
  }));

  /* ---------------------------------------------------------------- */
  /* C und D: es gibt bereits eine Session                             */
  /* ---------------------------------------------------------------- */

  if (stand !== null) {
    if (stand.betriebId === null) {
      return (
        <SchrittRahmen
          schritt="konto"
          stand={stand}
          titel={rt.nachtragen.titel}
          lead={rt.nachtragen.lead}
        >
          <p className="text-sm leading-relaxed text-text">{rt.nachtragen.hinweis}</p>

          <div className="mt-6">
            <NachtragenFormular texte={rt} />
          </div>
        </SchrittRahmen>
      );
    }

    const supabase = await createClient();
    const { data: betrieb } = await supabase
      .from("betriebe")
      .select("name")
      .eq("id", stand.betriebId)
      .maybeSingle();

    return (
      <SchrittRahmen
        schritt="konto"
        stand={stand}
        titel={rt.erledigt.titel}
        lead={rt.erledigt.lead}
      >
        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="text-muted">{rt.erledigt.betriebLabel}</dt>
            <dd className="mt-1 font-medium text-text">
              {betrieb?.name ?? rt.erledigt.betriebFallback}
            </dd>
          </div>
        </dl>

        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">{rt.erledigt.hinweis}</p>

        <div className="mt-6">
          <Link
            href="/einrichtung"
            className="inline-block rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            {rt.erledigt.weiter}
          </Link>
        </div>

        {/*
          Der Weg zurück ans leere Formular. Auf einem geteilten Gerät im
          Lokal — der Grund, aus dem angemeldete Personen nirgends
          weitergeleitet werden — muss jemand anders an die Registrierung
          herankommen können, ohne den Browser aufzuräumen.
        */}
        <form action={abmelden} className="mt-6 border-t border-line pt-5">
          <p className="text-sm text-muted">
            {rt.erledigt.nichtDeinKonto}{" "}
            <button
              type="submit"
              className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
            >
              {rt.erledigt.abmelden}
            </button>
          </p>
        </form>
      </SchrittRahmen>
    );
  }

  /* ---------------------------------------------------------------- */
  /* A und B: noch keine Session                                       */
  /* ---------------------------------------------------------------- */

  const wartetAufCode = email !== null;

  /*
   * Nur in Lage B gelesen: dort steht das Formular zugeklappt darunter
   * und soll die bereits getippten Angaben zeigen. In Lage A ist ein
   * leeres Formular die richtige Antwort.
   */
  const gemerkt = wartetAufCode ? await leseBetriebsdaten() : null;

  return (
    <SchrittRahmen
      schritt="konto"
      stand={null}
      titel={wartetAufCode ? rt.code.titel : rt.daten.titel}
      lead={wartetAufCode ? rt.code.lead : rt.daten.lead}
    >
      {meldung ? (
        <div className="mb-6">
          <FormMeldung art="fehler">{meldung}</FormMeldung>
        </div>
      ) : null}

      {wartetAufCode ? (
        <>
          <CodeAbschnitt email={email} texte={rt} versandTexte={t.codeVersand} />

          <div className="mt-6 rounded-blk border border-line bg-surface-sunk p-5">
            <h2 className="font-display text-sm font-bold text-text">{rt.boxen.geraetTitel}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{rt.boxen.geraetText}</p>
          </div>

          <div className="mt-4 rounded-blk border border-line bg-surface-sunk p-5">
            <h2 className="font-display text-sm font-bold text-text">{rt.boxen.fristTitel}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{rt.boxen.fristText}</p>
          </div>

          {/*
            Abschnitt A bleibt erreichbar, aber zugeklappt. Als <details>
            und nicht als Link zurück: wer sich bei der Adresse vertippt
            hat, soll die Angaben sehen und korrigieren können, ohne die
            Seite zu verlassen und alles neu zu tippen. Zugeklappt, weil
            der Code jetzt die Aufgabe ist und ein zweites offenes
            Formular nur zum versehentlichen Absenden einlädt.
          */}
          <details className="mt-4 rounded-blk border border-line bg-surface-sunk p-5">
            <summary className="cursor-pointer text-sm font-semibold text-text">
              {rt.boxen.aendernSummary}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{rt.boxen.aendernText}</p>
            <div className="mt-5">
              {/*
                Vorbelegt aus dem Merker-Cookie plus der Adresse aus der
                Adresszeile. Leere Felder wären hier die schlechteste
                Antwort: wer sich bei der Adresse vertippt hat, müsste
                Betriebsname, Land und beide Namen noch einmal tippen,
                um eine einzige Ziffer zu korrigieren.
              */}
              <DatenAbschnitt
                idPraefix="aendern-"
                texte={rt}
                zustimmungTexte={t.zustimmungFeld}
                laender={laender}
                vorbelegung={{ ...(gemerkt ?? {}), email }}
              />
            </div>
          </details>
        </>
      ) : (
        <>
          <DatenAbschnitt
            texte={rt}
            zustimmungTexte={t.zustimmungFeld}
            laender={laender}
          />

          <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">
            {rt.fussnoteA}
            <strong className="font-semibold text-text">{rt.fussnote24}</strong>
            {rt.fussnoteB}
            <strong className="font-semibold text-text">
              {rt.fussnoteTage.replace("{tage}", String(TESTPHASE_TAGE))}
            </strong>
            {rt.fussnoteC}
          </p>

          {/*
            B2B-Hinweis an der Stelle, an der bestellt wird, nicht nur in
            § 1 Abs. 3 der AGB. Wer sich hier registriert, schliesst den
            Vertrag — dass das Angebot Verbrauchern nicht offensteht,
            gehört deshalb neben den Knopf und nicht hinter einen Link.
          */}
          <p className="mt-4 text-xs leading-relaxed text-muted">{rt.b2b}</p>
        </>
      )}
    </SchrittRahmen>
  );
}
