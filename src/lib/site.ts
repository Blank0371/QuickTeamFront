/**
 * Zentrale Konstanten der Marketing-Site.
 * Alles, was sowohl Metadata als auch Sitemap, JSON-LD oder Navigation
 * braucht, steht hier — nicht dreimal verstreut.
 */

/**
 * Eine gesetzte, aber leere Env-Variable kommt als `""` an — `??` greift
 * dann nicht. Ohne diesen Schritt scheitert `new URL("")` beim Build.
 */
function env(wert: string | undefined, fallback = ""): string {
  const getrimmt = wert?.trim() ?? "";
  return (getrimmt.length > 0 ? getrimmt : fallback).replace(/\/$/, "");
}

export const siteUrl = env(process.env.NEXT_PUBLIC_SITE_URL, "https://quickteam.at");

/**
 * Adresse der nativen App.
 *
 * **Zurzeit ohne Verwendung, und das ist Absicht.** Bis zum 2026-08-29
 * war das hier das Ziel nach Anmeldung und nach Passwort-Reset — ein
 * Rest aus der Zeit vor der Kursänderung vom 2026-08-26, als hinter dem
 * Login in diesem Repo nichts wartete. Beide Stellen zeigen jetzt auf
 * `/einrichtung`, wo die Ableitung entscheidet.
 *
 * Die Variable bleibt, weil `CLAUDE.md` sie als Zeiger auf die native App
 * führt und ein späterer App-Hinweis sie wieder braucht. Was sie **nicht**
 * mehr ist: ein Ziel für angemeldete Nutzer dieser Website.
 */
export const appUrl = env(process.env.NEXT_PUBLIC_APP_URL);

export const siteName = "QuickTeam";

/*
 * Hier stand `callbackUrl()` für `emailRedirectTo` und `redirectTo`.
 * Entfallen mit der Umstellung auf Bestätigungscodes: die Mail-Vorlagen
 * verschicken `{{ .Token }}` und enthalten keinen Link mehr, also gibt es
 * auch kein Rücksprungziel und keine Abhängigkeit von der
 * Redirect-Allowlist.
 */

/**
 * Die drei Pläne bilden `betrieb_abonnements.plan` ab
 * (`basic` | `pro` | `business`). Einstieg läuft immer über `trial`.
 * Preise sind Platzhalter, bis sie festgelegt sind.
 */
/*
 * `id` ist der Wert in `betrieb_abonnements.plan` und im CHECK festgezurrt
 * — `basic` | `pro` | `business`, daran wird nicht gerührt. `name` ist
 * reiner Anzeigetext und darf sich ändern, ohne dass die Datenbank etwas
 * davon merkt. Genau deshalb sind es zwei Felder und nicht eins.
 *
 * `preis` ist der Monatsbetrag in Euro, festgelegt am 2026-08-23. Dieser
 * Wert wird nur **angezeigt** — abgerechnet wird nach dem Stripe-Preis
 * hinter der jeweiligen `STRIPE_PRICE_*`-Variablen. Nichts im Code hält
 * die beiden synchron, und ein Auseinanderlaufen fällt niemandem auf,
 * bevor eine Rechnung mit dem falschen Betrag rausgeht.
 *
 * Wer den Betrag ändert, ändert deshalb zwingend beides — und in Stripe
 * heisst das: einen **neuen** Price anlegen. Beträge sind dort
 * unveränderlich; `prices.update` kann alles ausser `unit_amount`. Danach
 * die neue ID in die Umgebung eintragen und den alten Price archivieren
 * (vorher `default_price` am Produkt umhängen, sonst weigert sich Stripe).
 */
/*
 * **Die Teilnehmergrenze steht seit dem 2026-09-10 im Wörterbuch**
 * (`planGrenzen` in `src/i18n/de.ts`), nicht mehr hier: „bis 15
 * Mitarbeiter" ist Sprache und keine Konfiguration. Drei Oberflächen
 * zeigen sie — Landing, `/preise` und Schritt 2 des Steppers —, und eine
 * deutsche Fassung hier neben einer englischen dort wäre genau die
 * Divergenz, die das Glossar verhindern soll.
 *
 * Betrag und Plan-ID bleiben: der CHECK auf `betrieb_abonnements.plan`
 * kennt genau diese drei IDs, und `name` ist ein Produktname, der in
 * beiden Sprachen gleich lautet.
 */
export const plaene = [
  { id: "basic", name: "Low", preis: 29 },
  { id: "pro", name: "Medium", preis: 49 },
  { id: "business", name: "Business", preis: 69 },
] as const;

/**
 * Der vierte Tarif — und ausdrücklich **kein** Eintrag in `plaene`.
 *
 * `betrieb_abonnements.plan` lässt per CHECK nur die drei IDs zu. Custom
 * hier aufzunehmen hiesse, ihn in die Plan-Auswahl von Schritt 2 und in
 * jede Preisberechnung zu lassen, wo er nur einen Constraint-Fehler
 * auslösen könnte. Er läuft komplett ausserhalb des Self-Service: mehrere
 * Standorte oder mehr als 50 Mitarbeiter werden besprochen, nicht geklickt.
 */
export const customTarif = {
  name: "Custom",
} as const;

/**
 * Adresse für Custom-Anfragen. Fehlt sie, wird der Weg sichtbar
 * angekündigt statt als toter Link angeboten — dieselbe Regel wie bei den
 * Store-Badges.
 */
export const kontaktEmail = env(process.env.NEXT_PUBLIC_KONTAKT_EMAIL);

export type PlanId = (typeof plaene)[number]["id"];

/**
 * Länge der Testphase, Entscheidung vom 2026-08-10. Steht hier und nicht
 * in `lib/stripe.ts`, weil die Preisseite den Wert nennt und dafür nicht
 * das Stripe-SDK importieren soll. `trial_period_days` beim Checkout
 * liest denselben Wert — eine Zahl, eine Quelle.
 */
export const TESTPHASE_TAGE = 14;

/**
 * Öffentliche Routen — Grundlage für Sitemap und Navigation.
 *
 * Während des Soft-Launches sind das genau die sechs Seiten, die
 * ausgeliefert werden; alles andere ist serverseitig gesperrt (siehe
 * `src/lib/soft-launch.ts`).
 *
 * `/avv` ist am 2026-09-10 dazugekommen: § 7 Abs. 3 der AGB setzt
 * voraus, dass der Kunde den Auftragsverarbeitungsvertrag bei der
 * Registrierung schliesst. Ein Vertrag, auf den ein anderer Vertrag
 * verweist, muss lesbar sein, bevor jemand ihm zustimmt.
 */
export const oeffentlicheRouten = [
  "/",
  "/preise",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/avv",
] as const;

/**
 * Von Crawlern ausgeschlossen und nicht in der Sitemap.
 *
 * Nicht nur Auth: `/einrichtung` gehört genauso hierher. Der Stepper
 * setzt eine Anmeldung voraus, hat keinen Suchwert und würde im Index nur
 * als weitergeleitete Seite auftauchen.
 *
 * Die Liste deckt sich mit `GESPERRTE_PRAEFIXE` in
 * `src/lib/soft-launch.ts` — und bleibt trotzdem eine eigene: sie
 * beantwortet die Frage „gehört das in den Index?", nicht „darf das
 * ausgeliefert werden?". Nach dem Soft-Launch fällt die eine weg, diese
 * hier bleibt.
 */
export const authRouten = [
  "/registrieren",
  "/login",
  "/passwort-vergessen",
  "/passwort-neu",
  "/einrichtung",
  "/dashboard",
] as const;
