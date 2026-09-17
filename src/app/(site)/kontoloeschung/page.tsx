import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { holePositionen } from "@/lib/dashboard/position";
import { bestaetigungswort } from "@/lib/konto-loeschung";
import { createClientOhneRiegel } from "@/lib/supabase/server";

import { loeschungAbbrechen } from "./aktionen";
import { AnmeldeFormular } from "./anmelde-formular";
import { LoeschFormular } from "./loesch-formular";

export const metadata: Metadata = {
  title: "Konto und Daten löschen",
  description: "Dein QuickTeam-Konto endgültig entfernen.",
  robots: { index: false, follow: false },
};

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

  if (!user) return <StufeAnmelden />;

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
        email={email}
        erwartet={bestaetigungswort(positionen, user.email)}
        leitetBetrieb={leitetBetrieb}
      />
    );
  }

  return <StufeFolgen email={email} leitetBetrieb={leitetBetrieb} />;
}

/* ------------------------------------------------------------------ */
/* Gerüst                                                              */
/* ------------------------------------------------------------------ */

function Rahmen({
  stufe,
  titel,
  children,
}: {
  stufe: 1 | 2 | 3;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Konto löschen · Schritt {stufe} von 3
        </p>
        <h1 className="mt-2 text-3xl leading-[1.1] sm:text-4xl">{titel}</h1>
        {children}
      </div>
    </Container>
  );
}

/** „Abbrechen" ist ein echter Form-Post, weil es die Sitzung auflöst. */
function AbbrechenKnopf() {
  return (
    <form action={loeschungAbbrechen}>
      <button
        type="submit"
        className="text-sm text-muted underline underline-offset-4 hover:text-text"
      >
        Abbrechen und abmelden
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 1 — anmelden                                                  */
/* ------------------------------------------------------------------ */

function StufeAnmelden() {
  return (
    <Rahmen stufe={1} titel="Konto und Daten löschen">
      <p className="mt-4 text-base leading-relaxed text-muted">
        Hier entfernst du deinen QuickTeam-Zugang endgültig. Das lässt sich nicht
        rückgängig machen, und es gibt keine Wiederherstellung — auch nicht durch den
        Support.
      </p>

      <section
        aria-labelledby="anmelden"
        className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 id="anmelden" className="font-display text-lg text-text">
          Zuerst anmelden
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Damit niemand ein fremdes Konto löschen kann, brauchen wir deine
          E-Mail-Adresse und dein Passwort. Was genau gelöscht wird, steht im nächsten
          Schritt — gelöscht wird jetzt noch nichts.
        </p>

        <AnmeldeFormular />
      </section>

      <p className="mt-8 text-sm text-muted">
        Passwort vergessen?{" "}
        <Link
          href="/passwort-vergessen"
          className="underline underline-offset-4 hover:text-text"
        >
          Erst zurücksetzen
        </Link>
        , dann hierher zurück.
      </p>
    </Rahmen>
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 2 — Folgen                                                    */
/* ------------------------------------------------------------------ */

function StufeFolgen({ email, leitetBetrieb }: { email: string; leitetBetrieb: boolean }) {
  return (
    <Rahmen stufe={2} titel="Was passiert, wenn du fortfährst">
      <p className="mt-4 text-base leading-relaxed text-muted">
        Du bist angemeldet als <span className="text-text">{email}</span>. Lies das hier
        bitte zu Ende — danach folgt nur noch eine Bestätigung.
      </p>

      <section
        aria-labelledby="was-passiert"
        className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 id="was-passiert" className="font-display text-lg text-text">
          Was gelöscht wird
        </h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-text">Dein Zugang.</span> Anmeldung, Passwort und die
            Verknüpfung zu allen Betrieben, in denen du stehst.
          </li>
          <li>
            <span className="text-text">Deine persönlichen Daten.</span> Name,
            E-Mail-Adresse und Telefonnummer werden aus jeder deiner Anstellungen
            entfernt, dazu Mitteilungen und Benachrichtigungseinstellungen, die nur dich
            betreffen.
          </li>
        </ul>

        <h2 className="mt-6 font-display text-lg text-text">Was bleibt</h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-text">Der Betrieb selbst</span> und die Dienstpläne, in
            denen du eingeteilt warst. Dein Name steht dort nicht mehr — die Einträge
            bleiben, weil dein Arbeitgeber Arbeitszeiten aufbewahren muss.
          </li>
        </ul>

        {leitetBetrieb ? (
          <>
            <h2 className="mt-6 font-display text-lg text-text">Abo und Abrechnung</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Die Löschung betrifft alle Betriebe, die du leitest. Ihre laufenden
              Abonnements werden anschließend sofort gekündigt. Bereits abgebuchte
              Zeiträume werden nicht anteilig erstattet. Falls die Kündigung technisch
              fehlschlägt, muss der Support sie nachholen.
            </p>

            <p className="mt-6 rounded-blk border border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
              Stehen in einem deiner geleiteten Betriebe noch weitere Personen, lässt sich
              dein Konto nicht löschen — sonst bliebe ein Betrieb ohne Leitung zurück, und
              das Abo liefe weiter. Entferne sie zuvor unter{" "}
              <Link
                href="/dashboard/team"
                className="text-text underline underline-offset-4"
              >
                Team
              </Link>{" "}
              oder übergib die Leitung an jemand anderen.
            </p>
          </>
        ) : null}

        <p className="mt-6 rounded-blk border border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
          Willst du deine Daten vorher mitnehmen, brich hier ab und lade sie im Dashboard
          unter Einstellungen herunter. Nach der Löschung ist das nicht mehr möglich.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href="/kontoloeschung?schritt=endgueltig"
            className="rounded-blk border border-line-strong px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
          >
            Verstanden — weiter
          </Link>
          <AbbrechenKnopf />
        </div>
      </section>
    </Rahmen>
  );
}

/* ------------------------------------------------------------------ */
/* Stufe 3 — endgültig                                                 */
/* ------------------------------------------------------------------ */

function StufeEndgueltig({
  email,
  erwartet,
  leitetBetrieb,
}: {
  email: string;
  erwartet: string;
  leitetBetrieb: boolean;
}) {
  /*
   * Ohne Vergleichswert kein Formular. Das kann eintreten, wenn ein
   * Konto weder eine aktive Anstellung noch eine E-Mail-Adresse trägt —
   * ein Zustand, den es nicht geben sollte, der aber kein Absturz sein
   * muss.
   */
  const bereit = erwartet.length > 0;

  return (
    <Rahmen stufe={3} titel="Letzte Warnung">
      <p className="mt-4 text-base leading-relaxed text-muted">
        Der nächste Klick löscht das Konto <span className="text-text">{email}</span>{" "}
        sofort und endgültig.
      </p>

      <section
        aria-labelledby="endgueltig"
        className="mt-8 rounded-panel border border-stop/60 bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 id="endgueltig" className="font-display text-lg text-stop">
          Es gibt kein Zurück
        </h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Es gibt keine Rückgängig-Funktion und keine Wiederherstellung.</li>
          <li>Du wirst sofort abgemeldet und kannst dich danach nicht mehr anmelden.</li>
          <li>
            {leitetBetrieb
              ? "Laufende Abonnements deiner Betriebe werden sofort gekündigt, ohne anteilige Erstattung."
              : "Deine Einträge in vergangenen Dienstplänen bleiben ohne deinen Namen bestehen."}
          </li>
        </ul>

        {bereit ? (
          <LoeschFormular erwartet={erwartet} />
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-stop">
            Zu diesem Konto lässt sich kein Bestätigungswort ermitteln. Meld dich beim
            Support, statt es hier zu versuchen.
          </p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <Link
          href="/kontoloeschung?schritt=folgen"
          className="text-sm text-muted underline underline-offset-4 hover:text-text"
        >
          Zurück zu den Folgen
        </Link>
        <AbbrechenKnopf />
      </div>
    </Rahmen>
  );
}
