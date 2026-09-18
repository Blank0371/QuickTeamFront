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
 * `preis` ist der Monatsbetrag, `preisJahr` der Jahresbetrag in Euro
 * (Preiserhöhung + Jahresabo am 2026-09-17). Beide Werte werden nur
 * **angezeigt** — abgerechnet wird nach dem Stripe-Preis hinter der
 * jeweiligen `STRIPE_PRICE_*`-Variablen (`_JAHR` für das Jahresabo).
 * Nichts im Code hält Anzeige und Stripe synchron, und ein
 * Auseinanderlaufen fällt niemandem auf, bevor eine Rechnung mit dem
 * falschen Betrag rausgeht — deshalb meldet `pruefePreisGleichstand`
 * (src/lib/abo-konditionen.ts) eine Abweichung ins Log.
 *
 * Wer einen Betrag ändert, ändert deshalb zwingend beides — und in Stripe
 * heisst das: einen **neuen** Price anlegen. Beträge sind dort
 * unveränderlich; `prices.update` kann alles ausser `unit_amount`. Danach
 * die neue ID in die Umgebung eintragen und den alten Price archivieren
 * (vorher `default_price` am Produkt umhängen, sonst weigert sich Stripe).
 *
 * Das Jahresabo ist **kein** eigener Plan: `betrieb_abonnements.plan` kennt
 * per CHECK nur `basic|pro|business`, und das Intervall steht nicht in
 * unserer Datenbank, sondern am Stripe-Price (`recurring.interval`). Ein
 * Plan hat damit zwei Preise, aber nur eine ID.
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
  { id: "basic", name: "Low", preis: 39, preisJahr: 390 },
  { id: "pro", name: "Medium", preis: 69, preisJahr: 690 },
  { id: "business", name: "Business", preis: 99, preisJahr: 990 },
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
 * Das Abrechnungsintervall — monatlich oder jährlich (Jahresabo seit dem
 * 2026-09-17). Bewusst **kein** Teil der Plan-ID: der CHECK auf
 * `betrieb_abonnements.plan` kennt nur `basic|pro|business`, und ob monatlich
 * oder jährlich abgerechnet wird, steht am Stripe-Price
 * (`recurring.interval`), nicht in unserer Datenbank. Die Werte sind kurz
 * gehalten, weil sie auch als Cookie- und Query-Wert durch den
 * Registrierungs-Trichter reisen (`abrechnung-merker.ts`).
 */
export type Abrechnung = "monat" | "jahr";

/** Ohne Angabe wird monatlich abgerechnet — der bisherige und häufigere Fall. */
export const ABRECHNUNG_STANDARD: Abrechnung = "monat";

/**
 * Name und Lebensdauer des Cookies, in dem die Abrechnungs-Wahl durch den
 * Trichter reist. Steht hier — in einer Datei ohne `next/headers` — damit
 * **beide** Schreiber denselben Namen nehmen: die Middleware (Edge, setzt
 * ihn beim Klick auf die Registrierung) und `abrechnung-merker.ts` (liest
 * und löscht ihn). Zwei Literale wären zwei Gelegenheiten, sich zu
 * vertippen, ohne dass es beim Bauen auffiele.
 */
export const ABRECHNUNG_COOKIE = "qt_abrechnung";
export const ABRECHNUNG_COOKIE_MAX_AGE = 60 * 60 * 24;

/** Ein hereingereichter Wert (Query, Cookie) als `Abrechnung`, sonst der Standard. */
export function alsAbrechnung(wert: unknown): Abrechnung {
  return wert === "jahr" ? "jahr" : "monat";
}

/**
 * Ersparnis in Euro pro Jahr gegenüber zwölf Monatszahlungen — die Zahl
 * hinter „statt 468 € nur 390 €". Kommt aus `plaene`, damit die Werbeaussage
 * nie einen anderen Betrag nennt als die Preiskarten daneben.
 */
export function ersparnisProJahr(plan: PlanId): number {
  const p = plaene.find((x) => x.id === plan);
  return p ? p.preis * 12 - p.preisJahr : 0;
}

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
