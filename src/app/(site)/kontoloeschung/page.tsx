import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import type { Dictionary } from "@/i18n/de";
import { holeTexte } from "@/i18n/server";
import { fuelle } from "@/i18n/text";
import { holePositionen } from "@/lib/dashboard/position";
import { bestaetigungswort } from "@/lib/konto-loeschung";
import { createClientOhneRiegel } from "@/lib/supabase/server";

import { loeschungAbbrechen } from "./aktionen";
import { AnmeldeFormular } from "./anmelde-formular";
import { LoeschFormular } from "./loesch-formular";

export async function generateMetadata(): Promise<Metadata> {
  const { kontoloeschung } = await holeTexte();
  return {
    title: kontoloeschung.metaTitel,
    description: kontoloeschung.metaBeschreibung,
    robots: { index: false, follow: false },
  };
}

type Texte = Dictionary["kontoloeschung"];

export const dynamic = "force-dynamic";

/**
 * Konto und Daten löschen — eine Seite, drei Stufen, zwei Adressen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine Seite
 * ─────────────────────────────────────────────────────────────────────
 *
 * `/datenloeschung` leitet hierher. Es ist ausdrücklich keine zweite
 * Umsetzung: bei einem Vorgang, den niemand rückgängig machen kann, wäre
 * eine zweite Fassung eine zweite Gelegenheit, sich zu widersprechen.
 * Warum diese Adresse die echte ist und nicht umgekehrt, steht in
 * `src/lib/konto-loeschung.ts` — kurz: die Datenschutzerklärung nennt
 * sie in Ziffer 15.2 wörtlich.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Drei Stufen, und jede fängt etwas anderes ab
 * ─────────────────────────────────────────────────────────────────────
 *
 *   1. **Anmelden.** Beweist, wer hier ist. Ohne das wäre die Seite ein
 *      Werkzeug gegen fremde Konten.
 *   2. **Folgen lesen.** Was verschwindet, was bleibt, was mit dem Abo
 *      geschieht. Wer hier abbricht, hat nichts angefasst.
 *   3. **Betriebsnamen abtippen.** Der Punkt, an dem aus einem Klick
 *      eine Entscheidung wird.
 *
 * Die Stufe steht im Query-String und nicht im Client-Zustand. Das ist
 * der Grund, aus dem `curl` auf jede Stufe den vollständigen sichtbaren
 * Text liefert — die Vorgabe aus `CLAUDE.md`. Ein Stepper im Browser
 * hätte die Warnungen vor genau dem Werkzeug versteckt, mit dem man
 * nachsieht, ob sie dastehen.
 *
 * Stufe 3 lässt sich damit auch direkt ansteuern, und das ist kein Leck:
 * die Warnungen sollen zum Nachdenken zwingen, nicht den Zugang regeln.
 * Den regeln die Anmeldung und das abgetippte Wort, und beide werden in
 * `aktionen.ts` serverseitig neu abgeleitet.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Kein Tor, keine Position, kein Riegel
 * ─────────────────────────────────────────────────────────────────────
 *
 * **Nicht unter `/dashboard`:** `betreteDashboard()` verlangt eine
 * gewählte Position und leitet sonst auf die Positionswahl um. Für das
 * Löschen des ganzen Kontos ist das die falsche Bedingung — es betrifft
 * alle Anstellungen auf einmal, nicht die gerade aktive.
 *
 * **`createClientOhneRiegel()`:** damit die Seite auch während des
 * Soft-Launches arbeitet. Begründung an der Funktion selbst und in
 * `src/lib/soft-launch.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Was hier ehrlich stehen muss
 * ─────────────────────────────────────────────────────────────────────
 *
 * `konto_selbst_loeschen()` löscht **den Zugang**, nicht den Betrieb:
 * die `mitarbeiter`-Zeilen werden anonymisiert und bleiben stehen, weil
 * der Arbeitgeber Arbeitszeiten aufbewahren muss. Die Seite sagt das,
 * statt „alles wird gelöscht" zu versprechen — die Zeile bleibt, nur
 * ohne Namen.
 *
 * Der abzutippende Text ist der **Betriebsname**, wo es einen gibt, sonst
 * die eigene E-Mail-Adresse. Beides ist etwas, das man kennt und nicht
 * versehentlich trifft; eine feste Formel wie „LÖSCHEN" wäre überall
 * dieselbe und damit Routine.
 */
export default async function KontoloeschungSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const schritt = typeof params["schritt"] === "string" ? params["schritt"] : null;

  const supabase = await createClientOhneRiegel();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = (await holeTexte()).kontoloeschung;

  if (!user) return <StufeAnmelden t={t} />;

  /*
   * Der Name kommt aus den Positionen und nicht aus einer eigenen
   * Abfrage: `holePositionen()` liefert ihn ohnehin mit, und
   * `betrieb_select` gäbe ihn für einen Betrieb, in dem man nicht aktiv
   * ist, gar nicht heraus.
   */
  const positionen = await holePositionen(supabase, user.id);
  const leitetBetrieb = positionen.some((p) => p.rolleTyp === "chef");
  const email = user.email ?? "";

  if (schritt === "endgueltig") {
    return (
      <StufeEndgueltig
        t={t}
        email={email}
        erwartet={bestaetigungswort(positionen, user.email)}
        leitetBetrieb={leitetBetrieb}
      />
    );
  }

  return <StufeFolgen t={t} email={email} leitetBetrieb={leitetBetrieb} />;
}

/* ------------------------------------------------------------------ */
/* Gerüst                                                              */
/* ------------------------------------------------------------------ */

function Rahmen({
  t,
  stufe,
  titel,
  children,
}: {
  t: Texte;
  stufe: 1 | 2 | 3;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
          {fuelle(t.stufe, { n: stufe })}
        </p>
        <h1 className="mt-2 text-3xl leading-[1.1] sm:text-4xl">{titel}</h1>
        {children}
      </div>
    </Container>
  );
}

/** „Abbrechen" ist ein echter Form-Post, weil es die Sitzung auflöst. */
function AbbrechenKnopf({ t }: { t: Texte }) {
  return (
    <form action={loeschungAbbrechen}>
      <button
        type="submit"
        className="text-sm text-muted underline underline-offset-4 hover:text-text"
      >
        {t.abbrechen}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 1 — anmelden                                                  */
/* ------------------------------------------------------------------ */

function StufeAnmelden({ t }: { t: Texte }) {
  const a = t.anmelden;
  return (
    <Rahmen t={t} stufe={1} titel={a.titel}>
      <p className="mt-4 text-base leading-relaxed text-muted">{a.lead}</p>

      <section
        aria-labelledby="anmelden"
        className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 id="anmelden" className="font-display text-lg text-text">
          {a.zuerst}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{a.zuerstText}</p>

        <AnmeldeFormular texte={a} />
      </section>

      <p className="mt-8 text-sm text-muted">
        {a.vergessenFrage}{" "}
        <Link
          href="/passwort-vergessen"
          className="underline underline-offset-4 hover:text-text"
        >
          {a.vergessenLink}
        </Link>
        {a.vergessenRest}
      </p>
    </Rahmen>
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 2 — Folgen                                                    */
/* ------------------------------------------------------------------ */

function StufeFolgen({
  t,
  email,
  leitetBetrieb,
}: {
  t: Texte;
  email: string;
  leitetBetrieb: boolean;
}) {
  const f = t.folgen;
  return (
    <Rahmen t={t} stufe={2} titel={f.titel}>
      <p className="mt-4 text-base leading-relaxed text-muted">
        {f.angemeldetVor}
        <span className="text-text">{email}</span>
        {f.angemeldetNach}
      </p>

      <section
        aria-labelledby="was-passiert"
        className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 id="was-passiert" className="font-display text-lg text-text">
          {f.geloeschtTitel}
        </h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-text">{f.zugang}</span>
            {f.zugangText}
          </li>
          <li>
            <span className="text-text">{f.daten}</span>
            {f.datenText}
          </li>
        </ul>

        <h2 className="mt-6 font-display text-lg text-text">{f.bleibtTitel}</h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-text">{f.betrieb}</span>
            {f.betriebText}
          </li>
        </ul>

        {leitetBetrieb ? (
          <>
            <h2 className="mt-6 font-display text-lg text-text">{f.aboTitel}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{f.aboText}</p>

            <p className="mt-6 rounded-blk border border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
              {f.mitgliederVor}
              <Link
                href="/dashboard/team"
                className="text-text underline underline-offset-4"
              >
                {f.mitgliederLink}
              </Link>
              {f.mitgliederNach}
            </p>
          </>
        ) : null}

        <p className="mt-6 rounded-blk border border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
          {f.export}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href="/kontoloeschung?schritt=endgueltig"
            className="rounded-blk border border-line-strong px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            {f.weiter}
          </Link>
          <AbbrechenKnopf t={t} />
        </div>
      </section>
    </Rahmen>
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 3 — endgültig                                                 */
/* ------------------------------------------------------------------ */

function StufeEndgueltig({
  t,
  email,
  erwartet,
  leitetBetrieb,
}: {
  t: Texte;
  email: string;
  erwartet: string;
  leitetBetrieb: boolean;
}) {
  const e = t.endgueltig;
  /*
   * Ohne Vergleichswert kein Formular. Das kann eintreten, wenn ein
   * Konto weder eine aktive Anstellung noch eine E-Mail-Adresse trägt —
   * ein Zustand, den es nicht geben sollte, der aber kein Absturz sein
   * muss.
   */
  const bereit = erwartet.length > 0;

  return (
    <Rahmen t={t} stufe={3} titel={e.titel}>
      <p className="mt-4 text-base leading-relaxed text-muted">
        {e.leadVor}
        <span className="text-text">{email}</span>
        {e.leadNach}
      </p>

      <section
        aria-labelledby="endgueltig"
        className="mt-8 rounded-panel border border-stop/60 bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 id="endgueltig" className="font-display text-lg text-stop">
          {e.keinZurueck}
        </h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
          <li>{e.keinRueckgaengig}</li>
          <li>{e.abgemeldet}</li>
          <li>{leitetBetrieb ? e.aboChef : e.eintraege}</li>
        </ul>

        {bereit ? (
          <LoeschFormular erwartet={erwartet} texte={e} />
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-stop">{e.keinWort}</p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <Link
          href="/kontoloeschung?schritt=folgen"
          className="text-sm text-muted underline underline-offset-4 hover:text-text"
        >
          {e.zurueck}
        </Link>
        <AbbrechenKnopf t={t} />
      </div>
    </Rahmen>
  );
}
