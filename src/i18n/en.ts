import type { Dictionary } from "./de";

/**
 * English strings.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  The type annotation is the whole point
 * ─────────────────────────────────────────────────────────────────────
 *
 * `: Dictionary` is not decoration. It makes `npm run typecheck` fail
 * the moment a key is missing or misspelled here — which is the one
 * failure mode that actually bites in translation work, because a
 * missing string does not crash, it just silently shows the wrong
 * language (or `undefined`) on one page nobody opened yet.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Register: second person, direct — same as the German
 * ─────────────────────────────────────────────────────────────────────
 *
 * The German copy uses „du" throughout, including in error messages.
 * English has no formal/informal split, so the equivalent is plain
 * second person and short sentences — not the passive, corporate voice
 * that English SaaS copy often falls into. „Try again" beats „Please
 * attempt the operation again."
 *
 * **Route paths stay German.** `/preise`, `/impressum`, `/datenschutz`
 * are the actual URLs; translating the labels while keeping the paths
 * is correct. Localised paths would mean a second route tree, and that
 * decision is not made here (see `sprache.ts`).
 */
export const en: Dictionary = {
  nav: {
    ueberspringen: "Skip to content",
    menueOeffnen: "Open menu",
    menueSchliessen: "Close menu",
    hauptnavigation: "Main navigation",
    fussnavigation: "Footer",
    links: [
      { href: "/", label: "Home" },
      { href: "/preise", label: "Pricing" },
    ],
    login: "Sign in",
    registrieren: "Start free trial",
  },
  footer: {
    claim: "Staff scheduling for restaurants and bars in Austria and Germany.",
    produkt: "Product",
    konto: "Account",
    rechtliches: "Legal",
    rechtlichesLinks: [
      { href: "/impressum", label: "Imprint" },
      { href: "/datenschutz", label: "Privacy" },
      { href: "/agb", label: "Terms" },
      { href: "/avv", label: "DPA" },
    ],
    kontoLinks: [
      { href: "/login", label: "Sign in" },
      { href: "/registrieren", label: "Sign up" },
      { href: "/passwort-vergessen", label: "Forgot password" },
    ],
    copyright: (jahr: number) => `© ${jahr} QuickTeam`,
  },
  fehler: {
    nichtGefundenTitel: "This page does not exist",
    nichtGefundenText:
      "That address leads nowhere. Either there is a typo in it, or the page has moved.",
    fehlerTitel: "Something went wrong",
    fehlerText:
      "The page could not be loaded. Try again — if it keeps failing, get in touch with support.",
    erneutVersuchen: "Try again",
    zurStartseite: "Go to home page",
  },
  platzhalter: {
    hinweis: "Placeholder — content to follow.",
  },
  /*
   * Dashboard vocabulary follows the Expo app, not this file's own taste.
   *
   * `../QuickTeam App/src/i18n/locales/en.json` is the reference — the web
   * dashboard is a 1:1 rebuild of that app, and the same person may use
   * both in the same shift. „Time off" here against „Vacation" there is
   * not a nuance, it reads as two different features.
   *
   * Checked against the app on 2026-09-10:
   *   urlaub      → scheduling.tabVacation  „Vacation"   (also
   *                 vacationRequests, vacationDaysLeft, vacationAllowance)
   *   notfall     → scheduling.tabEmergency „Emergency"  (also
   *                 home.emergencyWaiting, emergencyModalTitle)
   *   mitarbeiter → **„Employee"** — bewusst Singular statt des
   *                 wörtlichen `manager.tabEmployees` („Employees").
   *                 Das ist in der App ein Reiter über einer Liste, hier
   *                 aber die Rolle **einer** Person unter ihrem Namen.
   *                 Die App selbst sagt für den Einzelfall ebenfalls
   *                 Singular (`manager.denyReasonPlaceholder`: „shown to
   *                 employee"). Entschieden 2026-09-10, Begründung in
   *                 docs/i18n-glossar.md.
   *   team        → manager.employees       „Team"       ✓ already matched
   *   chef        → tabs.manager            „Manager"    ✓
   *   mitteilungen→ tabs.messages           „Messages"   ✓
   *   kalender    → tabs.calendar           „Calendar"   ✓
   *   einstellungen→ tabs.settings          „Settings"   ✓
   *   abmelden    → settings.signOut        „Sign out"   ✓
   *
   * **Three labels have no counterpart in the app and stay web-specific.**
   * `tausch` is a navigable area here; in the app swapping is a section
   * inside a single shift („Swap this shift"), so there is no nav label to
   * copy — the plural „Swaps" uses the app's word for a list of them.
   * `verfuegbarkeit` likewise: the app calls the content „preferences"
   * but has no area by that name. And `uebersicht` is not the app's
   * `tabs.main` („Home") — that is an employee start screen, this is a
   * business overview.
   */
  dashboard: {
    navigation: "Dashboard navigation",
    uebersicht: "Overview",
    kalender: "Calendar",
    team: "Team",
    planung: "Planning",
    mitteilungen: "Messages",
    tausch: "Swaps",
    urlaub: "Vacation",
    verfuegbarkeit: "Availability",
    notfall: "Emergency",
    einstellungen: "Settings",
    gruppeDienstplan: "Schedule",
    gruppeBetrieb: "Business",
    folgt: "soon",
    folgtHinweis: "This area has not been built yet.",
    wechseln: "Switch position",
    abmelden: "Sign out",
    rolle: {
      chef: "Manager",
      mitarbeiter: "Employee",
    },
  },

  /*
   * Display names for a stored **code** (`AT`/`DE`, `de`/`en`). Only the
   * label is translated; the value written to the database never is.
   * `VERTRAG_TYPEN` is deliberately absent — there the display string is
   * the column value itself. See the note in `de.ts`.
   */
  /*
   * The legal pages — frame and labels only; the texts themselves are
   * Markdown in `docs/rechtliches/`, read at runtime. The imprint is the
   * exception: it is register data, which is fact rather than
   * translation, so only the headings are translated, never the values.
   *
   * German legal terms keep their German form where the English one
   * would name a different institution: an "Amtsgericht" is not a
   * "district court" in any sense a reader could act on.
   */
  rechtliches: {
    bereich: "Legal",
    datenschutz: "Privacy Policy",
    agb: "General Terms and Conditions",
    avv: "Data Processing Agreement",
    avvKurz: "DPA",
    mustertextTitel: "Template text",
    mustertextHinweis:
      "This agreement is concluded on registration. The details marked in square brackets are taken from the business's own data at that point.",
    impressum: "Imprint",
    nichtAbrufbar: "This text is currently unavailable.",
    impressumLead: "Provider identification under section 5 of the German Digital Services Act (DDG).",
    diensteanbieter: "Service provider",
    kontakt: "Contact",
    vertretenDurch: "Represented by",
    geschaeftsfuehrer: "Managing Director",
    register: "Register",
    registergericht: "Registering court",
    handelsregister: "Commercial register",
    ustIdTitel: "VAT identification number",
    ustIdText: "VAT identification number under section 27a of the German VAT Act:",
    inhaltVerantwortlich: "Responsible for content",
    anschriftWieOben: "Address as above",
  },

  /*
   * Labels of the shared form building blocks — `SelectFeld` and
   * `DatumWahl`. One block, not two: same kind of text, namely chrome of
   * a reused control.
   */
  /*
   * Landing page and pricing. Amounts live in `plaene` in
   * `src/lib/site.ts`, not here. Plan names (Low / Medium / Business)
   * are product names and stay identical in both languages.
   */
  landing: {
    heroSub:
      "QuickTeam is staff scheduling for hospitality. One place for shifts, team and swaps — clear to everyone.",
    heroTesten: "Start free trial",
    heroAnmelden: "Sign in",
    heroFunktionen: "Explore the features",
    heroPreise: "See pricing",

    versprechenTitel: "What we promise your team",
    versprechenText:
      "QuickTeam brings clarity to the working day — without complicated processes, hidden hurdles or needless noise.",

    preiseKennzeichen: "Pricing",
    preiseBald: "Coming soon",
    preiseTitel: "One price per business. No per-head invoice.",
    preiseEmpfehlung: "Our recommendation",
    preiseTesten: "Start free trial",
    proMonat: "/ month",
    preiseUst: "plus VAT",
    preiseUstAlle: "All prices plus VAT.",
    preiseB2b:
      "Directed exclusively at entrepreneurs within the meaning of Section 14 BGB — not at consumers.",
    preiseGesperrt:
      "QuickTeam launches shortly. Booking is not possible yet — the prices are here so you know where you stand.",

    metaTitel: "QuickTeam — staff scheduling for hospitality",
    metaText:
      "The weekly plan for your venue: assign shifts, notify the team, let the hours add themselves up. For restaurants, cafés and bars in Austria and Germany.",
  },

  /* Headcount per plan. Keys are the plan IDs from `site.ts`. */
  planGrenzen: {
    basic: "up to 15 employees",
    pro: "up to 30 employees",
    business: "up to 50 employees, 1 location",
  },

  /* The custom tariff sits beside the three plans, not among them. */
  customTarif: {
    preis: "On request",
    grenze: "multiple locations or more than 50 employees",
  },

  /* The three promises of the scroll sequence. */
  versprechen: {
    planTitel: "The plan is set",
    planText:
      "Roles, minimum staffing and shift templates give you a dependable framework for the whole week in minutes.",
    teamTitel: "The team confirms",
    teamText:
      "Announcements, availability and replies come together visibly, before the first day begins.",
    notfallTitel: "An absence, visible at once",
    notfallText:
      "If someone drops out, a swap steps in and closes the gap — without a single round of phone calls.",
  },

  /* The three cards above the pricing section. */
  versprechenKarten: {
    klarheitTitel: "Clarity and reliability",
    klarheitEins: "Schedule, availability and changes in one place.",
    klarheitZwei: "Everyone knows when and where they are needed.",
    einfachheitTitel: "Respect and simplicity",
    einfachheitEins: "Scheduling should take work off the team, not create new work.",
    einfachheitZwei: "Clear controls, comprehensible steps.",
    sichtbarkeitTitel: "Problems visible in time",
    sichtbarkeitEins: "Emergencies, conflicts and open replacements do not slip through.",
    sichtbarkeitZwei: "Understaffed shifts stand out before the shift begins.",
  },

  formular: {
    bitteWaehlen: "Please select",
    datumWaehlen: "Choose date",
    vorherigerMonat: "Previous month",
    naechsterMonat: "Next month",
    wochenBeginn: "Weeks start on Monday",
    leeren: "Clear",
  },

  auswahl: {
    landAT: "Austria",
    landDE: "Germany",
    spracheDE: "German",
    spracheEN: "English",
  },

  /*
   * Zod messages. Same flat keys as `de.ts`; `{name}` placeholders are
   * filled from values the schema passes along, so numeric limits live
   * once in the code instead of twice in two dictionaries.
   */
  /*
   * Supabase auth errors as sentences that say what happened and what to
   * do. The code-to-key mapping lives in `authFehlerText()` in
   * `src/lib/formular.ts`.
   */
  auth: {
    serverMail:
      "Sign-up did not go through: the confirmation code could not be sent, so no account was created either. That is our mail delivery, not your details. Try again right away — if it keeps failing, get in touch with support.",
    server: "Something went wrong on our side. Try again — if the error persists, get in touch with support.",
    zugangsdaten: "That email address or password is not right. Check both and try again.",
    nichtBestaetigt:
      "This email address has not been confirmed yet. Enter the code from the confirmation email, then you can sign in.",
    zuVieleMails: "Too many emails have gone out to this address just now. Wait a few minutes, then try again.",
    zuVieleVersuche: "Too many attempts in a short time. Wait a moment, then try again.",
    schwachesPasswort: "This password is too weak. Use a longer one, or one with more varied characters.",
    gleichesPasswort: "That is your current password. Choose a different one.",
    codeAbgelaufen: "That code is wrong or has expired. Check it, or have a new one sent.",
    unvollstaendig: "Some entries are incomplete. Check the marked fields.",
    registrierungAus:
      "New accounts are switched off at the moment — this is not about your details. QuickTeam is not public yet; once sign-up is open, this form will work unchanged.",
    unbekannt: "That did not work. Try again — if the error persists, get in touch with support.",
  },

  validierung: {
    "bez.betriebName": "The business name",
    "bez.vorname": "The first name",
    "bez.nachname": "The last name",
    "bez.rollenName": "The role name",
    "bez.bezeichnung": "The label",
    "bez.titel": "The title",

    "v.pflicht.leer": "{bez} must not be empty.",
    "v.pflicht.lang": "{bez} is too long — {max} characters at most.",

    "v.land.wahl": "Choose Austria or Germany.",
    "v.email.leer": "Enter your email address.",
    "v.email.form": "That does not look like an email address.",
    "v.passwort.leer": "Enter your password.",
    "v.passwort.kurz": "The password needs at least {min} characters.",
    "v.passwort.lang": "The password can be {max} characters at most.",
    "v.wiederholung.leer": "Repeat the password.",
    "v.wiederholung.ungleich": "The two passwords do not match.",
    "v.zustimmung.fehlt":
      "You have to accept the Terms, the DPA and the Privacy Policy to continue.",
    "v.code.leer": "Enter the code from the email.",
    "v.code.ziffern": "The code is {anzahl} digits long.",

    "v.telefon.kurz": "The phone number needs at least {min} digits.",
    "v.einladung.kontakt":
      "Enter an email address or a phone number — otherwise the invitation cannot reach anyone.",

    "v.vertrag.wahl": "Choose a contract type.",
    "v.sollstunden.zahl": "Target hours must be a number.",
    "v.sollstunden.negativ": "Target hours cannot be negative.",
    "v.toleranz.zahl": "Tolerance must be a number.",
    "v.toleranz.negativ": "The tolerance cannot be negative.",
    "v.saldo.zahl": "The opening balance must be a number.",
    "v.urlaubstage.zahl": "Vacation days must be a number.",
    "v.urlaubstage.negativ": "Vacation days cannot be negative.",
    "v.urlaubstage.max": "{max} days at most.",
    "v.stunden.ganz": "Whole hours only.",
    "v.stunden.max": "{max} hours at most.",
    "v.stunden.maxMonat": "{max} hours per month at most.",
    "v.stunden.min": "Not below −{max} hours.",
    "v.tage.ganz": "Whole days only.",

    "v.uhrzeit.form": "Time as HH:MM, e.g. 17:00.",
    "v.uhrzeit.ungueltig": "Invalid time.",
    "v.wochentag.wahl": "Choose a weekday.",
    "v.zeiten.beginnEnde": "Start and end must not be the same.",
    "v.zeiten.startEnde": "Start and end must not be the same.",

    "v.kategorie.wahl": "Choose a category.",
    "v.zeichen.max": "{max} characters at most.",
    "v.checkliste.leer": "A checklist needs at least one item.",
    "v.umfrage.leer": "A poll needs at least two options.",

    "v.schicht.wahl": "Choose a shift.",
    "v.schicht.weg": "This shift no longer exists.",
    "v.person.weg": "This person no longer exists.",
    "v.rolle.wahl": "Please choose a role.",
    "v.vorlage.weg": "This template no longer exists.",
    "v.antrag.weg": "This request no longer exists.",

    "v.datum.ungueltig": "Invalid date.",
    "v.datum.pruefen": "Check the date.",
    "v.datum.start": "Choose a start date.",
    "v.datum.ende": "Choose an end date.",
    "v.datum.reihenfolge": "The end cannot be before the start.",

    "v.wunschtage.max": "Three preferred days at most.",
    "v.wunsch.ungueltig": "Invalid preference.",
    "v.aenderungen.max": "Too many changes at once.",
    "v.entscheidung.ungueltig": "Invalid decision.",

    "v.sprache.wahl": "Choose a language.",
    "v.zahl.pflicht": "Please enter a number.",
    "v.deadline.min": "Day {min} at the earliest.",
    "v.deadline.max": "Day {max} at the latest.",
  },
};
