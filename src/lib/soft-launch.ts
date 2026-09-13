/**
 * Die Soft-Launch-Sperre.
 *
 * Während des Soft-Launches ist die Website öffentlich, aber es entsteht
 * kein Konto, keine Sitzung und kein Vertrag: Anmeldung, Registrierung,
 * Passwort-Zurücksetzen, der Einrichtungs-Stepper, das Dashboard und
 * jede Zahlungsfunktion sind serverseitig gesperrt.
 *
 * **Standardmässig geschlossen.** Die Sperre ist aktiv, solange nicht
 * ausdrücklich `SOFT_LAUNCH=aus` gesetzt ist. Ein fehlender, leerer oder
 * vertippter Wert lässt sie also zu — das ist die richtige Richtung für
 * einen Schalter, der Zahlungen und Kontoanlage verhindert. Ein
 * `SOFT_LAUNCH=an`-Schalter hätte genau umgekehrt gewirkt: einmal
 * vergessen, und die Sperre wäre still aus.
 *
 * **Zwei Ebenen, nicht eine.**
 *
 * 1. `src/middleware.ts` beantwortet keine Anfrage an eine gesperrte
 *    Route, sondern leitet auf `/` um — für GET wie für POST. Damit sind
 *    direkte URLs, abgeschickte Formulare ohne JavaScript und die
 *    POST-Aufrufe der Server Actions abgedeckt, denn eine Server Action
 *    wird an die Adresse der Seite geschickt, die sie gerendert hat.
 *
 * 2. `createClient()` (Supabase, serverseitig) und `stripeKlient()`
 *    werfen, solange die Sperre aktiv ist. Das schliesst die Lücke, die
 *    Ebene 1 offen lässt: Server Actions sind über ihre ID adressierbar
 *    und lassen sich grundsätzlich von *jeder* Route derselben
 *    Auslieferung aus aufrufen, also auch von der offenen Startseite.
 *    Ohne Datenbank- und ohne Stripe-Client kommt keine dieser Aktionen
 *    an Daten — sie scheitert, statt zu wirken.
 *
 * Was **nicht** gesperrt ist und warum: `/api/stripe/webhook`. Der
 * Endpunkt kommt von Stripe, nicht von einem Besucher, und ist kein Weg
 * zu einem Vertragsabschluss. Er schreibt den Zahlungsstatus bereits
 * bestehender Abonnements; ihn abzuschalten hiesse, deren Zustand
 * auflaufen zu lassen, ohne dass jemand etwas gewinnt.
 *
 * Die Sperre ist bewusst reversibel und löscht nichts: Auth-, Stepper-
 * und Dashboard-Code bleiben vollständig vorhanden.
 */

/**
 * Präfixe, die während des Soft-Launches nicht ausgeliefert werden.
 *
 * Jeder Eintrag sperrt die Route selbst **und** alles darunter
 * (`/einrichtung` deckt `/einrichtung/konto` mit ab). Die Liste ist am
 * 2026-09-03 gegen `src/app/**` erhoben, nicht geraten — es gibt in
 * diesem Repo weder `/auth/*` noch `/api/auth/*`, keinen
 * OAuth-Callback, keinen Checkout-Redirect und kein Kundenportal als
 * eigene Route. Das Zahlungsformular läuft eingebettet über Server
 * Actions in `src/lib/zahlung-aktionen.ts` und hängt damit an den
 * gesperrten `/einrichtung`-Seiten.
 */
export const GESPERRTE_PRAEFIXE = [
  "/login",
  "/registrieren",
  "/passwort-vergessen",
  "/passwort-neu",
  "/einrichtung",
  "/dashboard",
  /*
   * Die Kontolöschung steht hinter einer Anmeldung und wäre während des
   * Soft-Launches ohnehin unerreichbar. Sie steht trotzdem hier: die
   * Liste ist die eine Stelle, an der „gehört hinter die Sperre"
   * festgehalten wird, und eine Route, die dort fehlt, fällt erst auf,
   * wenn sich die Bedingungen ändern.
   */
  "/kontoloeschung",
] as const;

/** Aktiv, solange nicht ausdrücklich abgeschaltet. */
export function softLaunchAktiv(): boolean {
  return process.env.SOFT_LAUNCH?.trim().toLowerCase() !== "aus";
}

/**
 * Gilt die Sperre für diesen Pfad?
 *
 * Der Vergleich prüft auf exakte Gleichheit oder auf einen Präfix mit
 * folgendem Schrägstrich. Ein reiner `startsWith` würde sonst auch
 * `/loginhilfe` treffen — eine Route, die es heute nicht gibt und die
 * morgen jemand anlegt, ohne diese Datei zu lesen.
 */
export function istGesperrt(pfad: string): boolean {
  if (!softLaunchAktiv()) return false;
  return GESPERRTE_PRAEFIXE.some(
    (praefix) => pfad === praefix || pfad.startsWith(`${praefix}/`),
  );
}

/*
 * Der eigentliche Riegel steht in `soft-launch-riegel.ts` und nicht
 * hier. Grund: diese Datei wird von `src/middleware.ts` importiert und
 * läuft damit in der Edge-Umgebung; der Riegel braucht `redirect()` aus
 * `next/navigation`, das dort nichts zu suchen hat.
 */
