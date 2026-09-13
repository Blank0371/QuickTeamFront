import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { holeChefBetriebId } from "@/lib/betrieb";
import { holePositionen } from "@/lib/dashboard/position";
import { createClient } from "@/lib/supabase/server";

import { LoeschFormular } from "./loesch-formular";

export const metadata: Metadata = {
  title: "Konto löschen",
  description: "Dein QuickTeam-Konto endgültig entfernen.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Konto löschen — eine eigene Adresse, bewusst ausserhalb des Dashboards.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum nicht unter `/dashboard/…`
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betreteDashboard()` verlangt eine **gewählte Position** und leitet
 * sonst auf die Positionswahl um. Für das Löschen des ganzen Kontos ist
 * das die falsche Bedingung: es betrifft alle Anstellungen auf einmal,
 * nicht die gerade aktive. Wer über die Positionswahl gestolpert wäre,
 * käme hier gar nicht an.
 *
 * Geprüft wird deshalb nur die Anmeldung — wie bei `/dashboard/wechseln`,
 * und aus demselben Grund.
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
export default async function KontoloeschungSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [betriebId, positionen] = await Promise.all([
    holeChefBetriebId(supabase),
    holePositionen(supabase, user.id),
  ]);

  /*
   * Der Name kommt aus den Positionen und nicht aus einer eigenen
   * Abfrage: `holePositionen()` liefert ihn ohnehin mit, und
   * `betrieb_select` gäbe ihn für einen Betrieb, in dem man nicht aktiv
   * ist, gar nicht heraus.
   */
  const chefPosition = betriebId
    ? positionen.find((p) => p.betriebId === betriebId && p.rolleTyp === "chef")
    : undefined;

  const erwartet = chefPosition?.betriebName ?? user.email ?? "";

  /*
   * Ohne Vergleichswert kein Formular. Das kann eintreten, wenn ein
   * Konto weder eine aktive Anstellung noch eine E-Mail-Adresse trägt —
   * ein Zustand, den es nicht geben sollte, der aber kein Absturz sein
   * muss.
   */
  const bereit = erwartet.length > 0;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Konto
        </p>
        <h1 className="mt-2 text-3xl leading-[1.1] sm:text-4xl">Konto löschen</h1>

        <p className="mt-4 text-base leading-relaxed text-muted">
          Du bist angemeldet als <span className="text-text">{user.email}</span>. Was
          hier passiert, lässt sich nicht rückgängig machen — lies bitte erst, was
          genau gelöscht wird.
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
              <span className="text-text">Dein Zugang.</span> Anmeldung, Passwort und
              die Verknüpfung zu allen Betrieben, in denen du stehst.
            </li>
            <li>
              <span className="text-text">Deine persönlichen Daten.</span> Name,
              E-Mail-Adresse und Telefonnummer werden aus jeder deiner Anstellungen
              entfernt, dazu Mitteilungen und Benachrichtigungseinstellungen, die nur
              dich betreffen.
            </li>
          </ul>

          <h2 className="mt-6 font-display text-lg text-text">Was bleibt</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
            <li>
              <span className="text-text">Der Betrieb selbst</span> und die
              Dienstpläne, in denen du eingeteilt warst. Dein Name steht dort nicht
              mehr — die Einträge bleiben, weil dein Arbeitgeber Arbeitszeiten
              aufbewahren muss.
            </li>
          </ul>

          {chefPosition ? (
            <>
              <h2 className="mt-6 font-display text-lg text-text">Abo und Abrechnung</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Führst du <span className="text-text">{chefPosition.betriebName}</span>{" "}
                allein, endet mit der Löschung auch das Abonnement: es wird sofort
                gekündigt, und danach wird <span className="text-text">nichts mehr
                abgebucht</span>. Bereits abgebuchte Zeiträume werden nicht anteilig
                erstattet.
              </p>

              <p className="mt-6 rounded-blk border border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
                Stehen in <span className="text-text">{chefPosition.betriebName}</span>{" "}
                noch weitere Personen, lässt sich dein Konto nicht löschen — sonst bliebe
                ein Betrieb ohne Leitung zurück, und das Abo liefe weiter. Entferne sie
                zuvor unter{" "}
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

          {bereit ? (
            <LoeschFormular erwartet={erwartet} />
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-stop">
              Zu diesem Konto lässt sich kein Bestätigungswort ermitteln. Meld dich
              beim Support, statt es hier zu versuchen.
            </p>
          )}
        </section>

        <p className="mt-8 text-sm text-muted">
          <Link href="/dashboard" className="underline underline-offset-4 hover:text-text">
            Zurück zum Dashboard
          </Link>
        </p>
      </div>
    </Container>
  );
}
