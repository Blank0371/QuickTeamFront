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
 * auflaufen zu lassen, ohne dass jemand etwas gewinnt. Aus demselben Grund
 * `/api/cron/testphasen-beenden` (seit 2026-09-14): Vercel ruft ihn auf, er
 * kündigt nur bestehende, seit 90 Tagen pausierte Abos und steht hinter
 * `CRON_SECRET`.
 *
 * Die Sperre ist bewusst reversibel und löscht nichts: Auth-, Stepper-
 * und Dashboard-Code bleiben vollständig vorhanden.
 */

/**
 * Präfixe, die während des Soft-Launches nicht ausgeliefert werden.
 *
 * Jeder Eintrag sperrt die Route selbst **und** alles darunter
 * (`/einrichtung` deckt `/einrichtung/betrieb` mit ab). Die Liste ist am
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
] as const;

/*
 * ─────────────────────────────────────────────────────────────────────
 *  `/kontoloeschung` stand hier und steht seit dem 2026-09-17 **nicht**
 *  mehr hier. Das ist eine Entscheidung, kein Versehen.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Begründung von damals war, die Löschung stehe hinter einer
 * Anmeldung und sei während des Soft-Launches ohnehin unerreichbar. Seit
 * die Seite die Anmeldung **selbst** entgegennimmt, stimmt der zweite
 * Teil nicht mehr — und der erste war nie ein Grund, sondern eine
 * Beobachtung.
 *
 * Der Soft-Launch verhindert, dass ein Konto, eine Sitzung oder ein
 * Vertrag **entsteht**, solange die Rechtstexte Entwürfe sind. Löschen
 * erzeugt nichts davon. Und es ist das eine, das nicht davon abhängt, ob
 * die Texte geprüft sind: Art. 17 DSGVO gilt unabhängig vom Stand einer
 * Datenschutzerklärung, und Ziffer 15.2 sagt zu, dass man sein Konto
 * „jederzeit selbst" löschen kann — mit dieser Adresse im Text. Eine
 * Sperre, die das mitsperrt, sperrt ausgerechnet das weg, was sie
 * schützen soll, und macht die Zusage im selben Zug unwahr.
 *
 * **Die Route allein freizugeben reicht nicht**, und das ist der Teil,
 * der leicht übersehen wird: `createClient()` und `stripeKlient()`
 * leiten unabhängig von dieser Liste um. Die Seite braucht deshalb
 * `createClientOhneRiegel()` und `trotzSoftLaunch` — beides eng gefasst
 * und an Ort und Stelle begründet. Wer diesen Eintrag wieder aufnimmt,
 * nimmt die beiden anderen mit; wer nur einen der drei zurückdreht,
 * hinterlässt eine Seite, die sich öffnet und dann nichts kann.
 */

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
