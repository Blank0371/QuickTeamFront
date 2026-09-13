import type { Metadata } from "next";
import Link from "next/link";

import { SchrittRahmen } from "@/components/einrichtung/schritt-rahmen";
import { abmelden } from "@/lib/auth-aktionen";
import { einzelwert, meldungFuer } from "@/lib/auth-meldungen";
import { betreteSchritt } from "@/lib/einrichtung";
import { leseBetriebsdaten } from "@/lib/registrierung-merker";
import { FormMeldung } from "@/components/formular/felder";
import { createClient } from "@/lib/supabase/server";
import { TESTPHASE_TAGE } from "@/lib/site";
import { feldSchemata } from "@/lib/validierung";

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

  const meldung = meldungFuer(einzelwert(params["fehler"]));

  // Der Parameter ist frei wählbar — nur eine echte Adresse wird übernommen.
  const geprueft = feldSchemata.email.safeParse(einzelwert(params["email"]) ?? "");
  const email = geprueft.success ? geprueft.data : null;

  /* ---------------------------------------------------------------- */
  /* C und D: es gibt bereits eine Session                             */
  /* ---------------------------------------------------------------- */

  if (stand !== null) {
    if (stand.betriebId === null) {
      return (
        <SchrittRahmen
          schritt="konto"
          stand={stand}
          titel="Dein Konto steht — der Betrieb fehlt noch"
          lead="Deine E-Mail-Adresse ist bestätigt. Beim Anlegen des Betriebs ist etwas dazwischengekommen; das holen wir jetzt nach."
        >
          <p className="text-sm leading-relaxed text-text">
            Deine Angaben von der Registrierung sind gespeichert. Ein Klick genügt —
            dein Konto bleibt in jedem Fall bestehen.
          </p>

          <div className="mt-6">
            <NachtragenFormular />
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
        titel="Dieser Schritt ist erledigt"
        lead="Dein Konto ist bestätigt und dein Betrieb angelegt. Hier gibt es nichts mehr zu tun."
      >
        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="text-muted">Betrieb</dt>
            <dd className="mt-1 font-medium text-text">{betrieb?.name ?? "angelegt"}</dd>
          </div>
        </dl>

        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Betriebsname und Land änderst du später in der App — nicht mehr hier.
        </p>

        <div className="mt-6">
          <Link
            href="/einrichtung"
            className="inline-block rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
          >
            Weiter zur Einrichtung
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
            Nicht dein Konto oder ein weiterer Betrieb?{" "}
            <button
              type="submit"
              className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
            >
              Abmelden
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
      titel={wartetAufCode ? "Code aus der E-Mail eintragen" : "Leg deinen Betrieb an"}
      lead={
        wartetAufCode
          ? "Wir haben dir einen Zahlencode geschickt. Trag ihn hier ein — dann legen wir deinen Betrieb an und es geht weiter mit der Zahlung."
          : "Betriebsname, Land, dein Name und ein Passwort. Danach bestätigst du deine Adresse mit einem Code — noch auf dieser Seite."
      }
    >
      {meldung ? (
        <div className="mb-6">
          <FormMeldung art="fehler">{meldung}</FormMeldung>
        </div>
      ) : null}

      {wartetAufCode ? (
        <>
          <CodeAbschnitt email={email} />

          <div className="mt-6 rounded-blk border border-line bg-surface-sunk p-5">
            <h2 className="font-display text-sm font-bold text-text">
              Du kannst das Gerät wechseln
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Die E-Mail am Handy öffnen und den Code am Rechner eintippen ist
              ausdrücklich vorgesehen. Trag dann einfach dieselbe E-Mail-Adresse mit ein.
            </p>
          </div>

          <div className="mt-4 rounded-blk border border-line bg-surface-sunk p-5">
            <h2 className="font-display text-sm font-bold text-text">
              Bestätige innerhalb von 24 Stunden
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Danach wird die Registrierung automatisch gelöscht. Dann legst du den
              Betrieb einfach neu an — es geht nichts verloren, weil er bis zur
              Bestätigung noch gar nicht existiert. Der Code selbst gilt 60 Minuten;
              danach lässt du dir hier einen neuen schicken.
            </p>
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
              Angaben zum Betrieb ändern
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Beim erneuten Absenden schicken wir einen neuen Code an die dann
              eingetragene Adresse.
            </p>
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
                vorbelegung={{ ...(gemerkt ?? {}), email }}
              />
            </div>
          </details>
        </>
      ) : (
        <>
          <DatenAbschnitt />

          <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">
            Der Betrieb wird erst angelegt, wenn du den Code aus der Bestätigungsmail
            einträgst. Passiert das nicht innerhalb von{" "}
            <strong className="font-semibold text-text">24 Stunden</strong>, wird die
            Registrierung wieder gelöscht und du fängst von vorn an. Danach folgen{" "}
            <strong className="font-semibold text-text">{TESTPHASE_TAGE} Tage</strong>{" "}
            Testphase — Zahlungsdaten kannst du dabei überspringen.
          </p>

          {/*
            B2B-Hinweis an der Stelle, an der bestellt wird, nicht nur in
            § 1 Abs. 3 der AGB. Wer sich hier registriert, schliesst den
            Vertrag — dass das Angebot Verbrauchern nicht offensteht,
            gehört deshalb neben den Knopf und nicht hinter einen Link.
          */}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Angebot ausschließlich für Unternehmer im Sinne des § 14 BGB sowie für
            juristische Personen des öffentlichen Rechts — nicht für Verbraucher.
          </p>
        </>
      )}
    </SchrittRahmen>
  );
}
