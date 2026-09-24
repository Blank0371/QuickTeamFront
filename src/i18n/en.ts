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
    registrieren: "Register",
    promoPartner: "Promo partner",
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
  promo: {
    augenbraue: "Promo partnership",
    titel: "Become a QuickTeam promo partner",
    lead: "Do you recommend QuickTeam to restaurants and bars? Then you get your own promo code that new businesses enter when setting up their account — so we can see which businesses came through you.",
    schritteTitel: "How to apply",
    schritt1: "Download the application form.",
    schritt2: "Fill it in completely and sign it.",
    schritt3:
      "Send it to blanktrading@web.de with the subject “Request Promo Partnership”.",
    formularHerunterladen: "Download application form (PDF)",
    perMailSenden: "Send the completed form by email",
    mailBetreff: "Request Promo Partnership",
    hinweisTitel: "What happens next",
    hinweisText:
      "We review your request and reply by email. The agreement is only concluded once we accept it; with that you receive your personal promo code. It carries no discount — the code only records which businesses found QuickTeam through you.",
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
    joseph: "Joseph",
    gruppeArbeitsplatz: "Workspace",
    gruppeOrganisation: "Organisation",
    folgt: "soon",
    folgtHinweis: "This area has not been built yet.",
    mehr: "More",
    mehrTitel: "More areas",
    mehrSchliessen: "Close menu",
    managerTab: "Manager",
    scheduleTab: "Scheduling",
    kontoTab: "Account",
    kontoTitel: "Account & appearance",
    spracheLabel: "Language",
    themaLabel: "Appearance",
    themaSystem: "System",
    themaHell: "Light",
    themaDunkel: "Dark",
    verbindungen: "Manage connections",
    kontoLoeschen: "Delete account",
    kontoLoeschenHalten: "Press and hold for 3 seconds",
    wechseln: "Switch position",
    abmelden: "Sign out",
    rolle: {
      chef: "Manager",
      mitarbeiter: "Employee",
    },
    josephSeite: {
      metaTitel: "Joseph",
      metaBeschreibung: "Joseph, the secretary for managers — in development.",
      titel: "Joseph",
      untertitel: "The secretary for managers.",
      beschreibung: [
        "Joseph is the secretary that answers your employees' questions automatically.",
        "Someone asks where to find the folder with the recipes? Joseph checks the documentation and previous questions and answers for you within seconds.",
      ],
      entwicklung: "Joseph is still in development.",
      kontakt: "Have suggestions, wishes or questions? Contact us:",
      mailBetreff: "About Joseph",
      experimentell:
        "Experimental — Joseph does not reply yet. Messages are not stored or sent anywhere.",
      chatLabel: "Message to Joseph",
      chatPlatzhalter: "Write Joseph a message …",
      senden: "Send",
    },
    beendet: {
      metaTitel: "Business no longer active",
      titel: "This business no longer uses QuickTeam",
      text: "Its subscription has ended, so the schedule, messages, vacation and swaps are no longer available here.",
      loeschung:
        "The business's data will be deleted once the contractual period has passed. If you need anything from it, please ask your employer.",
      mehrere: "You also belong to other businesses — switch to one of them to keep working.",
    },
    wahl: {
      metaTitel: "Choose position",
      metaBeschreibung:
        "Pick the business you're currently working in — or accept an open invitation.",
      titel: "Where do you work?",
      lead: "Pick the business you're currently working in.",
      leadMehrere:
        "You belong to several businesses. Pick the one this is about — you can switch anytime.",
      deineBetriebe: "Your businesses",
      einladungen: "Invitations",
      einladungenText:
        "A business has invited you. Once you accept, you're part of the team and can see your schedule.",
      annehmen: "Accept",
      leerTitel: "No connections yet",
      leerText:
        "Your account doesn't belong to any team, and there's no invitation waiting either. There are two ways out: either your business invites you — the invitation then shows up on this page as soon as it arrives — or you open a business of your own.",
      leerHinweis:
        "Were you invited but see nothing? Then the invitation is probably on a different address than {email}. It's matched by exactly the address it was sent to.",
      betriebEroeffnen: "Open my own business",
    },
  },

  kalender: {
    metaTitel: "Calendar",
    metaBeschreibung:
      "Who works when — your business's schedule, month by month.",
    keineSchichten: "No shifts this month.",
    schichtEz: "shift",
    schichtMz: "shifts",
    nurSichtbar: "only what you're allowed to see",
    monatWechseln: "Change month",
    vorherigerMonat: "Previous month",
    naechsterMonat: "Next month",
    monatWaehlen: "Choose month",
    vorJahr: "Previous year",
    nachJahr: "Next year",
    heute: "Today",
    leerChef:
      "No shifts have been generated for this month yet. That happens later in planning — shift templates alone don't create shifts.",
    leerMitarbeiter:
      "You're not scheduled for any shift this month. Once the schedule is published, it will appear here.",
    legende: "Legend",
    meineSchicht: "Your shift",
    legendeNacht: "dashed = night shift from the previous day, continuing here",
    legendeUnterbesetzt: "Understaffed",
    legendeOffen: "something is open to take this day",
    legendeMeine: "you're scheduled this day",
    rasterCaption: "Schedule as a monthly overview, weeks start on Monday",
    anzeigenAria: "{titel}, show {n} {wort}",
    weitere: "more",
    ueberMitternacht: "past midnight",
    unterbesetzt: "understaffed",
    freiUebernehmen: "open to take",
    duEingeteilt: "you're scheduled",
    niemandEingeteilt: "no one scheduled",
    nochNiemand: "No one scheduled yet",
    personEz: "person",
    personMz: "people",
    tauschGesucht: "Swap wanted",
    notizEz: "note",
    notizMz: "notes",
    fortsetzung: "Continuation",
    fortsetzungVortag: "Continuation from the previous day",
    fortsetzungLang:
      "Continuation of the previous day's night shift, ends at {zeit}.",
    fortsetzungKurz: "until {zeit}",
    fortsetzungHint: "Continuation of the previous day's night shift",
    ladeFehler: "The schedule couldn't be loaded. Please reload the page.",
    zustand: {
      abgemeldet: "cancelled",
      offen: "open to take",
      entwurf: "Draft",
      meine: "",
      normal: "",
    },
  },
  uebersicht: {
    metaTitel: "Overview",
    metaBeschreibung:
      "Who's on duty today and over the next few days — with times, roles and names.",
    ganzenMonat: "View the whole month",
    heute: "Today",
    morgen: "Tomorrow",
    imDienstTitel: "On duty — today and the next {n} days",
    kzImDienstTitel: "On duty today",
    kzImDienstVon: "of {n}",
    kzImDienstLeer: "No shift is scheduled today.",
    kzImDienstFuss: "{n} {wort} today.",
    kzOffenTitel: "Open positions",
    kzOffenLeer: "Every proposal is fully staffed.",
    kzOffenFuss: "Still unfilled in a plan proposal.",
    kzUrlaubTitel: "Vacation requests",
    kzUrlaubLeer: "Nothing is waiting for your approval.",
    kzUrlaubFuss: "Waiting for your approval.",
    kzFensterTitel: "Next {n} days",
    kzFensterFuss: "Within this page's range.",
    schichtEz: "shift",
    schichtMz: "shifts",
    imDienst: "on duty",
    niemandZugeteilt: "No one assigned",
    schichtName: "Shift",
    unterbesetzt: "understaffed",
    tauschGesucht: "Swap wanted",
    ueberMitternacht: "past midnight",
    leerRolle: "No one from “{rolle}” on duty.",
    leerChef: "No shifts on this day.",
    leerMitarbeiter: "Nothing scheduled for you.",
    chipOhneBedarf: "{name}: {besetzt} on duty, no minimum staffing set",
    chipFehlt: "{name}: {besetzt} of {benoetigt} filled, understaffed",
    chipVoll: "{name}: {besetzt} of {benoetigt} filled, complete",
    leereAlle: "Applies to all {n} days in view — {spanne}.",
    leereSpanne: "{erster} to {letzter}",
    alle: "All",
    rollenFilterAria: "Filter by role",
    peErstellen: "Create schedule",
    peIntro:
      "Your shift templates become the shifts of a period. You set the period, the algorithm distributes them — you approve.",
    pePruefen: "Review proposal",
    peUnbesetzt: "{n} unfilled",
    peWirdGeplant: "Being planned",
    peUnbesetztHinweis:
      "Unfilled positions aren't a fault of the algorithm but its finding: no one was available for these roles in that period.",
  },
  urlaub: {
    metaTitel: "Vacation",
    metaBeschreibung: "Request vacation and review requests.",
    titel: "Vacation",
    intro: "Request vacation and check the status of your requests.",
    resttage: "Days left this year",
    beantragen: "Request vacation",
    gesendet: "Request sent — awaiting a decision.",
    von: "From",
    bis: "To",
    kommentar: "Comment",
    optional: "(optional)",
    statusRequested: "Requested",
    statusApproved: "Approved",
    statusDenied: "Denied",
    deineAntraege: "Your requests",
    keineEigenen: "No vacation requests yet.",
    begruendung: "Reason: ",
    antraegeTitel: "Vacation requests",
    offen: "Open",
    keineOffenen: "No open requests.",
    entschieden: "Decided ({n})",
    nichtsEntschieden: "Nothing decided yet.",
    grundPlatzhalter: "Reason (optional)",
    abbrechen: "Cancel",
    ablehnungBestaetigen: "Confirm denial",
    ablehnen: "Deny",
    zuAbgelehnt: "Switch to denied",
    genehmigen: "Approve",
    zuGenehmigt: "Switch to approved",
  },
  mitteilungen: {
    metaTitel: "Messages",
    metaBeschreibung: "Announcements, checklists and polls for the business.",
    titel: "Messages",
    intro: "Announcements, checklists and polls for the whole business.",
    kategorie: {
      allgemein: "Announcement",
      aufgabenliste: "Checklist",
      umfrage: "Poll",
      dokument: "Document",
    },
    prioritaet: { normal: "Normal", wichtig: "Important", dringend: "Urgent" },
    suchen: "Search",
    suchenAria: "Search messages",
    neueste: "Newest",
    relevant: "Relevant",
    kategorieFilterAria: "Filter by category",
    alle: "All",
    keineVorhanden: "No messages yet.",
    nichtsGefunden: "Nothing found.",
    angeheftet: "Pinned",
    erledigt: "Done",
    stimmen: "{n} votes",
    anonymSuffix: " · Anonymous",
    offeneSchichten: "Open shifts",
    ausschreibungIntro:
      "Posted for a role you have. Whoever takes it first is scheduled — there is no confirmation from management.",
    offeneSchicht: "Open shift",
    zeitpunktUnbekannt: "Time unknown",
    schichtAnsehen: "View shift",
    schonEingeteilt: "You're already scheduled on this shift.",
    wirdUebernommen: "Taking over …",
    uebernehmen: "Take as {rolle}",
    frei: "{n} open",
    wirdGesendet: "Sending…",
    senden: "Send",
    zeileEntfernen: "Remove row",
    neueMitteilung: "New message",
    verfassenAbbrechen: "Cancel composing",
    gesendet: "Sent.",
    katLabel: "Category",
    titelLabel: "Title",
    prioritaetLabel: "Priority",
    textLabel: "Text",
    punkte: "Items",
    punktHinzufuegen: "Add item",
    optionenLabel: "Options",
    optionHinzufuegen: "Add option",
    mehrfachauswahl: "Multiple choice",
    anonym: "Anonymous",
    fehlerFallback: "That didn't work.",
  },

  /*
   * Roster for printing and for Excel. The `tabellenKopf` group are **column
   * headings in a file**, not screen text — they live here anyway, because a
   * file outlives the session it was created in.
   */
  planExport: {
    metaTitel: "Print roster",
    titel: "Roster",
    beschreibung:
      "The roster as a weekly or monthly sheet — to pin up, or as a table for Excel.",
    woche: "Week",
    monat: "Month",
    kw: "W",
    zurueck: "Back to the calendar",
    vorheriger: "Previous period",
    naechster: "Next period",
    heute: "Today",
    drucken: "Print",
    csv: "Download for Excel",
    spalteSchicht: "Shift",
    keineSchichten: "No shifts fall within this period.",
    erstelltAm: "As of",
    legendeTitel: "Key",
    legendeUnbesetzt: "nobody assigned",
    legendeAbgemeldet: "called out (emergency)",
    legendeUnterbesetzt: "below minimum staffing",
    legendeEntwurf: "draft, not published yet",
    legendeUeberNacht: "shift ends the next day",
    legendeMuster: "Name",
    hinweisEntwurf:
      "Contains drafts (italic) that are not published yet — your team cannot see them.",
    wocheLeer: "No shifts this week.",
    blattKalender: "Calendar",
    fortsetzung: "continued",
    weitere: "… +{anzahl} more – full list on sheet \"{blatt}\"",
    blattPlan: "Shift plan",
    blattListe: "List",
    tabellenKopf: {
      datum: "Date",
      wochentag: "Weekday",
      schicht: "Shift",
      beginn: "Start",
      ende: "End",
      stunden: "Hours",
      ueberNacht: "Past midnight",
      status: "Status",
      person: "Employee",
      rolle: "Role",
      abgemeldet: "Called out",
      ja: "yes",
      nein: "no",
      entwurf: "draft",
      veroeffentlicht: "published",
      archiviert: "archived",
      unbesetzt: "(unassigned)",
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
    mustertextTitel: "How this agreement is concluded",
    mustertextHinweis:
      "The agreement is concluded electronically at registration: whoever registers the business accepts it on the business's behalf and confirms that they are authorised to represent it. The contracting party is the registered business with the details from its customer account. We store the accepted version, the time and the acting account.",
    impressum: "Imprint",
    nichtAbrufbar: "This text is currently unavailable.",
    impressumLead: "Provider identification under section 5 of the German Digital Services Act (DDG).",
    diensteanbieter: "Service provider",
    kontakt: "Contact",
    telefon: "Phone",
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
    heroTesten: "Register",
    heroAnmelden: "Sign in",
    heroFunktionen: "Explore the features",
    heroPreise: "See pricing",

    versprechenTitel: "What we promise your team",
    versprechenText:
      "QuickTeam brings clarity to the working day — without complicated processes, hidden hurdles or needless noise.",

    preiseKennzeichen: "Pricing",
    preiseBald: "Coming soon",
    preiseBaldText:
      "QuickTeam launches shortly. You'll pick your plan during setup — and can switch there anytime.",
    preiseTitel: "One price per business. No per-head invoice.",
    preiseEmpfehlung: "Our recommendation",
    preiseKuendigungMonat: "Cancellation takes effect at the end of the billing month.",
    preiseKuendigungJahr: "Cancellation takes effect at the end of the billing year.",
    preiseTesten: "Register",
    proMonat: "/ month",
    proJahr: "/ year",
    preiseMonatlich: "Monthly",
    preiseJaehrlich: "Yearly",
    preiseJahrVorteil: "2 months free",
    preiseStattLabel: "instead of",
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
    basic: "up to 15 employees, 1 location",
    pro: "up to 30 employees, 1 location",
    business: "up to 50 employees, 1 location",
  },

  /* The custom tariff sits beside the three plans, not among them. */
  customTarif: {
    preis: "On request",
    grenze: "multiple locations or more than 50 employees",
    kennzeichen: "Not a tariff you click",
    beschreibung:
      "Multiple locations or more than 50 employees can't sensibly be clicked together. Tell us what your business looks like — a chain, a franchise or two venues under one management — and we'll tailor it to that. The price is set afterwards, not before:",
    anfragen: "Request Custom",
    betreff: "Custom tariff for my business",
    kontaktFolgt: "Contact address coming shortly.",
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
      "If someone drops out, QuickTeam highlights the open shift and helps your team find a suitable replacement.",
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

  registrierung: {
    felder: {
      email: "Email address",
      emailHinweis: "Your confirmation code goes to this address.",
      passwort: "Password",
      passwortWiederholen: "Repeat password",
    },
    kontoAnlegen: "Create account",
    wirdAngelegt: "Creating …",
    daten: {
      titel: "Create your account",
      lead: "An email address and a password — that's all the account needs. After that you confirm your address with a code; you set up your business in the next step.",
    },
    code: {
      titel: "Enter the code from the email",
      lead: "We've sent you a numeric code. Enter it here — then your account is ready and you can continue.",
      label: "Code from the email ({n} digits)",
      hinweis: "The code is valid for 60 minutes.",
      emailHinweis: "The address we sent the code to.",
      bestaetigen: "Confirm",
      wirdGeprueft: "Checking …",
    },
    boxen: {
      geraetTitel: "You can switch devices",
      geraetText:
        "Opening the email on your phone and typing the code on your computer is entirely fine. Just enter the same email address as well.",
      fristTitel: "Confirm within 24 hours",
      fristText:
        "After that the registration is deleted automatically. Then you simply create the account again — nothing is lost, because until confirmation it doesn't exist yet. The code itself is valid for 60 minutes; after that you can have a new one sent here.",
      aendernSummary: "Change your email address",
      aendernText:
        "When you submit again, we send a new code to the address entered then.",
    },
    fussnoteA:
      "Your account is only created once you enter the code from the confirmation email. If that doesn't happen within ",
    fussnote24: "24 hours",
    fussnoteB: ", the registration is deleted and you start over.",
    b2b: "This offer is intended solely for entrepreneurs within the meaning of section 14 of the German Civil Code (BGB) and for legal entities under public law — not for consumers.",
    passwortKriterien: {
      min: "At least {n} characters",
      max: "At most {n} characters",
      gleich: "Both entries match",
      alleErfuellt: "All password requirements are met.",
      nochOffen: "{n} of {gesamt} requirements still open.",
      erfuellt: " — met",
      offen: " — open",
    },
    fortschritt: {
      aria: "Setup progress",
      schrittVon: "Step {n} of {gesamt}",
      schritte: {
        betrieb: "Business",
        zahlung: "Payment",
        team: "Team",
        schichten: "Shifts",
      },
    },
  },

  betrieb: {
    titel: "Create your business",
    lead: "Business name, country and your name. Then you choose a plan and add a payment method — your business is created as soon as the payment is confirmed.",
    b2b: "This offer is intended solely for entrepreneurs within the meaning of section 14 of the German Civil Code (BGB) and for legal entities under public law — not for consumers.",
    felder: {
      betriebName: "Business name",
      land: "Country",
      vorname: "First name",
      nachname: "Last name",
    },
    promoCode: "Promo code (optional)",
    promoCodeHinweis:
      "Did someone tell you about QuickTeam and give you a code? Enter it here.",
    promoPruefen: "Check promo code",
    promoPruefend: "Checking …",
    promoGueltig: "Code recognised.",
    promoNichtPruefbar:
      "We couldn't check the code right now. You can continue anyway.",
    promoBittePruefen: "Please check the promo code before creating your business.",
    betriebAnlegen: "Continue to payment",
    wirdAngelegt: "Saving …",
    erledigt: {
      titel: "Your business is created",
      lead: "This step is done. There's nothing more to do here.",
      betriebLabel: "Business",
      betriebFallback: "created",
      hinweis: "You change the business name and country later in the app — no longer here.",
      weiter: "Continue to setup",
    },
  },

  stepper: {
    zahlung: {
      titelMittel: "Add a payment method",
      leadTestphase:
        "{plan} plan{preis}. Nothing is charged now — your trial runs until {datum}.",
      leadSofort:
        "{plan} plan{preis}. Adding a payment method starts your subscription, and the first period is charged.",
      leadNur: "{plan} plan{preis}.",
      leadBezahlt:
        "Choose your plan and billing interval. Then you add a payment method; your business is created as soon as the payment is confirmed. You can enter a discount code along the way.",
      planLabel: "Plan",
      knopfSofort: "Subscribe (paid)",
      zurueckLink: "Back to plan selection",
      zurueckRest: ".",
      titelPlan: "Choose a plan",
      leadOhneTestphase:
        "The free trial is available once per business, and yours has already used it. In the next step you add a payment method, and your subscription starts right away.",
      leadLebend:
        "Your trial has been running since you first chose a plan; changing plans doesn't extend it. You can add a payment method now or later.",
      leadNeu:
        "{tage} days free, then billed {intervall}. You can add a payment method now or later — the trial runs either way.",
      spaeter: "Add it later",
      planLegende: "Choose a plan",
      abrechnung: "Billing:",
      intervallLegende: "Choose billing",
      monatlich: "monthly",
      jaehrlich: "yearly",
      monatVorteil: "Cancel monthly",
      jahrVorteil: "Save two months",
      uidLabel: "VAT ID (optional)",
      uidHinweis:
        "With a valid VAT ID we bill without VAT (reverse charge), without one we add VAT. Format: ATU and eight digits. You can change this later under Settings → Manage subscription.",
      uidLabelDe: "VAT ID (optional)",
      uidHinweisDe:
        "For the invoice to your company. Format: DE and nine digits. You can change this later under Settings → Manage subscription.",
      couponLabel: "Discount code (optional)",
      couponHinweis:
        "If you have a discount code, enter it here — it's applied at checkout.",
      weiterLaufend: "One moment …",
      weiterZahlung: "Continue to payment",
      testphasenHinweis:
        "Either way, the first {tage} days are free. Without a payment method your business is then paused until you add one — your data is kept for 90 days.",
    },
    zahlungsFormular: {
      knopfStandard: "Add a payment method",
      wirdHinterlegt: "Saving …",
      wirdGeladen: "Loading payment form …",
      couponLabel: "Discount code (optional)",
      couponHinweis:
        "Have a discount code? Enter it here — it will be applied to your subscription.",
      rechnungUnvollstaendig: "Please complete the invoice details.",
      bestaetigungFehlgeschlagen: "The payment method could not be confirmed.",
      keinErgebnis: "Stripe returned no result. Please try again.",
      verbindungUnterbrochen:
        "The connection was interrupted. Please try again; if a payment was already confirmed, check the subscription status first.",
    },
    rechnung: {
      legende: "Invoice details",
      intro:
        "These details appear on every invoice. You can change them any time under Settings → “Manage subscription”. Invoices already issued stay unchanged.",
      firma: "Legal company name",
      firmaHinweis:
        "As in the commercial register — not necessarily the same name as in the schedule.",
      strasse: "Street and number",
      plz: "Postal code",
      ort: "City",
      land: "Country of the invoice address",
      landHinweis:
        "Applies to the invoice only. Your business location and your schedule's working-time rules don't change because of it.",
      uidWarnung:
        "Changing the country changes the format of your tax number — ATU and eight digits for Austria, DE and nine digits for Germany. Invoices already issued are unaffected.",
      uidLabel: "VAT ID",
      uidHinweis:
        "Required for an Austrian invoice: Stripe bills under the reverse-charge procedure. Format: ATU and eight digits.",
      uidLabelDe: "VAT ID",
      uidHinweisDe:
        "Required for the invoice to your company. Format: DE and nine digits.",
    },
    team: {
      titel: "Who works with you",
      lead: "Roles first — kitchen, service, bar or whatever fits your business. Then you invite your people and tick which role they have.",
      rollennameFehler: "That role name doesn't work.",
      rolleDoppelt: "The role “{name}” already exists.",
      rollenTitel: "Roles",
      rollenText:
        "What kind of work happens at your business? You can't continue without at least one role — shift templates need one to be visible in the app at all.",
      neueRolle: "New role",
      hinzufuegen: "Add",
      keineRolle: "No role created yet.",
      rolleEntfernen: "Remove role {name}",
      einladenTitel: "Invite employees",
      einladenText:
        "Optional — a business where only you work for now is perfectly fine. Invitees get access as soon as they open the app and accept the invitation.",
      vorname: "First name",
      nachname: "Last name",
      email: "Email address",
      emailHinweis: "Email or phone — one of the two is required.",
      telefon: "Phone number",
      telefonHinweis:
        "International, with +, e.g. +43 660 1234567 — otherwise the app won't find the invitation.",
      rollenLegende: "Roles",
      einladenLaufend: "Inviting …",
      wochenstunden: "Target hours per week",
      wochenstundenHinweis:
        "As in the employment contract. The monthly figure is stored (× 4.33) — 40 h/week → 173 h/month.",
      toleranz: "Overtime tolerance (hours)",
      toleranzHinweis:
        "Allowance for automatic scheduling: overtime up to this point has no effect. Above it, the person is scheduled less often. It doesn't prevent anything.",
      urlaubstage: "Vacation allowance (days per year)",
      urlaubstageHinweis:
        "Counted in calendar days, not working days — weekends count too.",
      einladen: "Invite",
      niemand: "No one invited yet.",
      einladungOffen: " · invitation pending",
      entfernen: "Remove",
      weiterLaufend: "Saving …",
      weiter: "Continue to shifts",
      ersteRolle: "Create at least one role first.",
    },
    schichten: {
      titel: "What does your week look like",
      lead: "For each weekday, the shifts you have — and per shift, how many people of which role must be present at minimum.",
      abschliessen: "Finish setup",
      ersteSchicht: "Create at least one shift with a minimum staffing first.",
      anlegenTitel: "Create a shift",
      anlegenText:
        "One template per shift and weekday. Night shifts across midnight are fine — just enter 22:00 to 06:00.",
      bezeichnung: "Label",
      bezeichnungHinweis: "For example early shift, evening shift or kitchen late.",
      wochentag: "Weekday",
      beginn: "Start",
      ende: "End",
      mindestbesetzung: "Minimum staffing",
      mindestbesetzungText:
        "How many people of which role must be present at minimum? Without at least one entry the shift won't appear in the app.",
      anlegenLaufend: "Creating …",
      schichtHinzufuegen: "Add shift",
      wocheTitel: "Your week",
      keineSchicht: "No shift created yet.",
      unbekannteRolle: "unknown",
      ohneBedarf: "No minimum staffing — invisible in the app",
      amTag: " on {tag}",
      bisZeit: " to {zeit}",
      folgetag: ", ends the next day",
      blockEntfernen: "Remove {bezeichnung} on {tag}, {zeit}",
    },
    sperre: {
      eyebrow: "Trial",
      titel: "Your trial has ended",
      text: "The {tage} days are over, and no payment method is on file. Your business, your team and your shift templates stay stored until 90 days after the trial ends, then they are deleted (Terms § 5(3)). As soon as you add a payment method, your {plan} plan continues where it left off.",
      knopfFortsetzen: "Resume (paid)",
      keinNeues: "No new subscription is created — your existing one continues.",
      aboVerwalten: "Manage or cancel subscription",
      datenExport: "Export data",
    },
  },

  zustimmungFeld: {
    // Dashboard follow-up: all three documents in one sentence.
    vorAgb: "On behalf of my business, I accept the ",
    agb: "General Terms and Conditions",
    zwischen: " and the ",
    avv: "Data Processing Agreement (DPA)",
    nachAvv:
      " and confirm that I am authorised to represent the business in doing so. I have taken note of the ",
    datenschutz: "Privacy Policy",
    nachDatenschutz: ".",
    // Business step: the business contract acceptance only (Terms + DPA).
    betriebVor: "On behalf of my business, I accept the ",
    betriebZwischen: " and the ",
    betriebNach: " and confirm that I am authorised to represent the business in doing so.",
    // Registration (account): the personal privacy-policy acknowledgement only.
    datenschutzVor: "I have taken note of the ",
    datenschutzNach: ".",
  },

  codeVersand: {
    spamHinweis: "Nothing arrived? Check your spam folder.",
    erneutSenden: "Resend code",
    fristAktiv: "For security reasons, available again in {n} seconds.",
    fristBereit: "You can request a new code now.",
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

  login: {
    kicker: "Sign in",
    titel: "Welcome back",
    lead: "Enter your email address and password — then you go straight to your business's planning.",
    fussFrage: "No business yet?",
    fussLink: "Create one now",
    passwortVergessen: "Forgot your password?",
    emailLabel: "Email address",
    passwortLabel: "Password",
    absenden: "Sign in",
    absendenLaufend: "Checking …",
    meldungen: {
      "konto-geloescht": "Your account has been deleted.",
      "abo-kuendigung-offen":
        "At least one subscription could not be cancelled afterwards. Please contact blanktrading@web.de right away so that no further charges are made.",
      abgemeldet: "You have been signed out.",
      "app-url-fehlt":
        "Your account is ready, but the redirect target is not configured (NEXT_PUBLIC_APP_URL). Get in touch with support.",
    },
  },

  validierung: {
    "bez.betriebName": "The business name",
    "bez.vorname": "The first name",
    "bez.nachname": "The last name",
    "bez.rollenName": "The role name",
    "bez.bezeichnung": "The label",
    "bez.titel": "The title",
    "bez.firma": "The company name",
    "bez.strasse": "The street",
    "bez.plz": "The postal code",
    "bez.ort": "The city",

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
      "To continue, you have to accept the Terms and the DPA and take note of the Privacy Policy.",
    "v.code.leer": "Enter the code from the email.",
    "v.code.ziffern": "The code is {anzahl} digits long.",
    "v.uid.form":
      "A tax number has the form ATU and 8 digits (Austria, e.g. ATU12345678) or DE and 9 digits (Germany, e.g. DE123456789) — matching the invoice country.",
    "v.uid.pflicht":
      "A valid VAT ID (AT) or USt-IdNr (DE) is required for a paid subscription.",
    "v.coupon.unbekannt": "Stripe doesn't recognize this discount code, or it's no longer active.",
    "v.promo.form": "A promo code consists of letters, digits, - and _, at most {max} characters.",
    "v.promo.unbekannt": "We don't recognize this promo code. Check the spelling — or leave the field empty.",
    "v.plz.ziffern": "The postal code consists of digits only.",
    "v.plz.at": "Austrian postal codes have {anzahl} digits.",
    "v.plz.de": "German postal codes have {anzahl} digits.",

    "v.telefon.kurz": "The phone number needs at least {min} digits.",
    "v.einladung.kontakt":
      "Enter an email address or a phone number — otherwise the invitation cannot reach anyone.",

    "v.vertrag.wahl": "Choose a contract type.",
    "v.sollstunden.zahl": "Target hours must be a number.",
    "v.sollstunden.pflicht": "Enter the target hours per week.",
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
