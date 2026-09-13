"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { FormMeldung } from "@/components/formular/felder";

/**
 * Wie lange der Knopf nach einem Klick gesperrt bleibt (Millisekunden).
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Das ist Komfort, keine Verteidigung. Ausdrücklich.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Gegen einen absichtlichen Missbrauch richtet diese Sperre **nichts**
 * aus, und sie soll auch nicht so gelesen werden. Der Aufruf geht direkt
 * aus dem Browser an die Edge Function, mit dem Zugangstoken der
 * angemeldeten Person (siehe Kopfkommentar oben). Wer den Solver
 * absichtlich hintereinander anstossen will, umgeht diese Zeile mit
 * einem `curl` — das Token liegt ohnehin lesbar im Cookie.
 *
 * Was sie verhindert, ist der versehentliche Doppellauf: zweimal
 * geklickt, weil die Seite kurz nicht reagiert hat, oder direkt noch
 * einmal, weil das Ergebnis noch nicht sichtbar ist. Das ist der
 * realistische Fall und der kostet echtes Geld — `plan-generieren`
 * rechnet synchron durch.
 *
 * **Der wirksame Schutz gehört in die Edge Function selbst** und ist
 * dort noch nicht gebaut: eine harte Wartezeit pro Betrieb und eine
 * Ablehnung gleichzeitiger Läufe auf demselben Zyklus. Nur dort greift
 * er auch für Aufrufer, die nicht durch diese Oberfläche gehen — also
 * auch für die Expo-App. Beschrieben in
 * `docs/audit-a/app-entwickler-handover.md`, Abschnitt 5.
 *
 * `gestartet` allein reicht dafür nicht: es steht nur, solange die
 * Anfrage läuft, und fällt zurück, sobald die Antwort da ist. Genau
 * dann ist die Versuchung am grössten, gleich noch einmal zu klicken.
 */
const KLICKSPERRE_MS = 5000;

/**
 * Den Solver anstossen und dabei zusehen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum der Aufruf aus dem Browser kommt und nicht aus einer
 *  Server Action.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `plan-generieren` ist **synchron**: die Edge Function antwortet erst,
 * wenn der Solver durch ist. Am Quelltext abgelesen — sie materialisiert
 * die Instanzen, rechnet, schreibt die Zuweisungen und gibt dann erst
 * `{ ok, instanzen, zuweisungen, fehlbesetzungen }` zurück. Bei hundert
 * Mitarbeitern und einem Monatsraster dauert das.
 *
 * Eine Server Action, die darauf wartet, hinge an der Laufzeitgrenze
 * ihrer Umgebung — auf Vercel je nach Plan zwischen zehn und sechzig
 * Sekunden. Läuft sie ab, bekommt die Person einen Fehler, während der
 * Solver in Ruhe weiterrechnet und danach ein Ergebnis hinterlässt, von
 * dem die Oberfläche nichts weiss. Das ist die schlechteste Kombination:
 * eine Fehlermeldung über eine geglückte Arbeit.
 *
 * Der Browser hat diese Grenze nicht. Er ruft die Function direkt auf —
 * wie `manager.tsx` in der App, mit demselben Auth-Header, den die
 * Function für ihre eigene `ist_chef`-Prüfung braucht.
 *
 * **Mit `fetch` statt `supabase.functions.invoke`.** Der bequeme Weg
 * kostete gemessene 71 kB in dieser Route, weil er das gesamte
 * supabase-js in ein Bündel zieht, das sonst aus einem Knopf besteht.
 * Der Aufruf ist ein POST mit zwei Kopfzeilen; dafür lohnt sich kein
 * SDK. Das Zugangstoken kommt vom Server als Eigenschaft — im Browser
 * liegt es ohnehin lesbar im Cookie, `@supabase/ssr` setzt die
 * Auth-Cookies nicht `httpOnly`.
 *
 * **Der Fortschritt kommt trotzdem nicht aus dieser Antwort**, sondern
 * aus `planungszyklen.status`. Die Function setzt beim Start
 * `solver_laeuft` und am Ende `vorschlag_bereit`; scheitert sie, stellt
 * sie den vorherigen Status wieder her und schreibt `solver_fehler`. Die
 * Seite fragt das in Abständen neu ab. Damit sieht auch jemand den
 * richtigen Stand, der die Seite in einem zweiten Tab geöffnet hat oder
 * erst später wiederkommt.
 *
 * Was bleibt: bricht der Browser weg, bleibt `solver_laeuft` stehen —
 * niemand räumt das auf. Deshalb gilt ein Lauf nach
 * `LAUF_GEDULD_MINUTEN` als hängend, und die Seite bietet einen neuen an
 * statt weiter Fortschritt zu behaupten.
 */

export function SolverLauf({
  zyklusId,
  laeuft,
  haengend,
  funktionsUrl,
  token,
  anonKey,
}: {
  zyklusId: string;
  laeuft: boolean;
  /** Läuft angeblich, aber schon zu lange — Neustart anbieten. */
  haengend: boolean;
  funktionsUrl: string;
  token: string;
  anonKey: string;
}) {
  const router = useRouter();
  const [fehler, setFehler] = useState<string | null>(null);
  const [gestartet, setGestartet] = useState(false);
  const [klickGesperrt, setKlickGesperrt] = useState(false);
  const sperrUhr = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Läuft die Uhr noch, wenn die Komponente verschwindet, feuert sie in
  // einen abgeräumten Zustand.
  useEffect(() => () => {
    if (sperrUhr.current) clearTimeout(sperrUhr.current);
  }, []);

  const starten = useCallback(
    async (erzwingen: boolean) => {
      setFehler(null);
      setGestartet(true);

      // Sperre beim Klick setzen, nicht erst bei der Antwort: der teure
      // Teil ist bereits abgeschickt.
      setKlickGesperrt(true);
      if (sperrUhr.current) clearTimeout(sperrUhr.current);
      sperrUhr.current = setTimeout(() => setKlickGesperrt(false), KLICKSPERRE_MS);

      try {
        const antwort = await fetch(funktionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
          },
          body: JSON.stringify(
            erzwingen
              ? { planungszyklus_id: zyklusId, force: true }
              : { planungszyklus_id: zyklusId },
          ),
        });

        if (!antwort.ok) {
          /*
           * Die Function antwortet mit Sätzen, nicht nur mit Codes: 409
           * „Zyklus bereits bearbeitet", 403 „Nicht berechtigt", 500 mit
           * dem Fehler des Solvers. Ausgewertet wird der Körper, nicht
           * der Status — ausser bei 401, denn das ist kein Fehler der
           * Planung, sondern ein abgelaufenes Zugangstoken.
           */
          if (antwort.status === 401) {
            setFehler("Deine Sitzung ist abgelaufen. Lad die Seite neu.");
            setGestartet(false);
            return;
          }

          const koerper = (await antwort.json().catch(() => null)) as
            | { error?: unknown }
            | null;
          const text = String(koerper?.error ?? `Fehler ${antwort.status}`);

          setFehler(
            text.includes("bereits bearbeitet")
              ? "Für diesen Zeitraum liegt schon ein Ergebnis vor. Lad die Seite neu."
              : text.includes("Nicht berechtigt")
                ? "Dafür fehlt dir die Berechtigung."
                : `Die Planung ist gescheitert: ${text}`,
          );
          setGestartet(false);
          router.refresh();
          return;
        }

        router.refresh();
      } catch {
        /*
         * Netzabbruch oder geschlossene Verbindung. Der Solver rechnet
         * womöglich weiter — deshalb kein „ist gescheitert", sondern ein
         * Verweis auf den Stand, der in der Datenbank steht.
         */
        setFehler(
          "Die Verbindung ist abgerissen. Der Lauf kann trotzdem durchgelaufen sein — lad die Seite neu.",
        );
      }

      setGestartet(false);
    },
    [router, zyklusId, funktionsUrl, token, anonKey],
  );

  if (laeuft && !haengend) {
    return (
      <div className="mt-3">
        <p className="text-sm text-muted">
          <span aria-hidden="true">⋯</span> Die Schichten werden gerade verteilt. Das
          kann ein paar Minuten dauern — du kannst die Seite ruhig verlassen.
        </p>
        <StatusPoller />
      </div>
    );
  }

  return (
    <div className="mt-3">
      {fehler ? (
        <div className="mb-3">
          <FormMeldung art="fehler">{fehler}</FormMeldung>
        </div>
      ) : null}

      {klickGesperrt && !gestartet ? (
        <p className="mb-3 text-sm text-muted" role="status">
          Ein Planungslauf wurde gerade angestossen. Der Knopf ist ein paar
          Sekunden gesperrt, damit nicht versehentlich zweimal gerechnet wird.
        </p>
      ) : null}

      {haengend ? (
        <>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            Dieser Lauf steht seit über zehn Minuten auf „wird geplant". Vermutlich
            ist er abgebrochen, ohne das melden zu können. Ein neuer Lauf verwirft
            die bisherigen Vorschläge dieses Zeitraums und rechnet neu; von Hand
            gesetzte Zuweisungen bleiben unberührt.
          </p>
          <button
            type="button"
            onClick={() => void starten(true)}
            disabled={gestartet || klickGesperrt}
            className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-70"
          >
            {gestartet ? "Wird gestartet …" : "Neu berechnen"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void starten(false)}
          disabled={gestartet || klickGesperrt}
          className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {gestartet ? "Wird gestartet …" : "Schichten verteilen"}
        </button>
      )}
    </div>
  );
}

/**
 * Fragt den Serverstand in Abständen neu ab, solange gerechnet wird.
 *
 * `router.refresh()` lässt die Server Components neu laufen und tauscht
 * das Ergebnis aus, ohne die Seite neu zu laden oder Eingaben zu
 * verlieren. Kein Zustand hier, keine Abfrage von Hand — die Seite liest
 * `planungszyklen.status` ohnehin schon.
 *
 * Sechs Sekunden: oft genug, dass ein kurzer Lauf nicht ewig als „läuft"
 * dasteht, selten genug, dass ein langer nicht hundert Anfragen erzeugt.
 * Das Intervall wird beim Verlassen aufgeräumt.
 */
function StatusPoller() {
  const router = useRouter();
  const merker = useRef(router);
  merker.current = router;

  useEffect(() => {
    const uhr = setInterval(() => merker.current.refresh(), 6000);
    return () => clearInterval(uhr);
  }, []);

  return null;
}
