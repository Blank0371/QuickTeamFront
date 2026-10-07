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
    startseite: "Home page",
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
    kicker: "Error",
    kicker404: "Error 404",
    nichtGefundenMetaTitel: "Page not found",
    nichtGefundenMetaText:
      "This address leads nowhere. Use the navigation to get back to the home page or to pricing.",
    kennung: "Reference: {id}",
    bereichText:
      "This section could not be loaded. You are still signed in — try again or switch to another section.",
    zurUebersicht: "Go to overview",
    zumKalender: "Go to calendar",
    dashboardNichtGefundenTitel: "Nothing found",
    dashboardNichtGefundenText:
      "This page does not exist — or it belongs to something you are not allowed to see. For a shift that usually means: it has been deleted, it belongs to another business, or your business hides shifts you are not on.",
  },
  laden: {
    allgemein: "Loading",
    dashboard: "Loading dashboard",
    dienstplan: "Loading schedule",
  },
  meta: {
    titel: "QuickTeam — Staff scheduling for restaurants",
    beschreibung:
      "QuickTeam is a staff rota, shift planner and team planner for restaurants, cafés and bars in Austria and Germany. Assign staff, keep the team informed.",
    ogBeschreibung:
      "Staff rota and team planner for hospitality in Austria and Germany. Planned in minutes instead of hours.",
    ogLocale: "en_GB",
  },
  promo: {
    metaTitel: "Promo partner",
    metaBeschreibung:
      "Become a QuickTeam promo partner: download the application form, fill it in, sign it and send it in. For anyone who recommends QuickTeam to restaurants and bars.",
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
    schichtvorlagen: "Shift templates",
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
    betriebOhneNamen: "Business without a name",
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
      keinePosition: "No position was specified.",
      positionWeg:
        "This position no longer belongs to your account. Reload the page to see the current state.",
      keineEinladung: "No invitation was specified.",
      annehmenFehler:
        "The invitation could not be accepted. It may have been withdrawn — reload the page.",
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
    neueSchicht: "New shift",
    /* {titel} = Tag, z. B. „Mittwoch, 9. Oktober“. */
    neueSchichtAm: "Create shift on {titel}",
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
    kennzahlenAria: "Key figures",
    ohneRolle: "No role",
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
    rpc: {
      URLAUB_DATUM:
        "The dates do not fit — the start must not be in the past and must be before the end.",
      URLAUB_KONTINGENT: "This exceeds your remaining leave entitlement.",
      URLAUB_SCHICHTEN: "You are already assigned to shifts in this period.",
      URLAUB_GEPLANT: "A published schedule already exists for this period.",
    },
    nochmal: "That didn't work. Try again.",
    nurChef: "Only the management may decide on leave requests.",
    antragWeg: "This request no longer exists.",
    anspruchUnlesbar: "The leave entitlement could not be checked. Try again.",
    anspruchUeberschritten:
      "This exceeds the leave entitlement for {jahr}: {rest} of {anspruch} days left, this request needs {beantragt}.",
    antragWegNeuLaden: "This request no longer exists. Reload the page.",
    tagEins: "1 day",
    tageAnzahl: "{n} days",
    angerechnetKurz: "{n} counted",
    kalendertageBeantragt: "Days requested: {n}",
    angerechnetLabel: "Of these, count as vacation",
    angerechnetHinweis: "Not every day has to count, e.g. weekends.",
    angerechnetZuViel: "At most {max} — that's how many days the request covers.",
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
    ohneRolle: "No role",
    uebernahme: {
      angenommen: "Taken — the shift is now in your schedule.",
      schon_zugewiesen: "You are already assigned to this shift.",
      voll: "Too late — the last spot for this role was just taken. The posting was still up because only the management closes it.",
      nicht_qualifiziert:
        "You are not registered for this role. If that is wrong, tell the management.",
      nicht_moeglich:
        "Taking it is not possible right now — for example because of rest-period or maximum-hours limits. The check runs in the database and unfortunately does not give the exact reason.",
    },
    ausschreibungWeg: "This posting no longer exists.",
    ausschreibungZurueckgezogen:
      "That didn't work. The posting has probably been withdrawn in the meantime — reload the page.",
    nochmal: "That didn't work. Try again.",
    kategorieVerboten: "This category is not available to you.",
    sendenFehler: "The message could not be sent. Try again.",
    keineAufgabe: "No task was specified.",
    umschaltenFehler: "That didn't work. Try again.",
    keineUmfrage: "No poll was specified.",
    stimmeFehler: "Your vote could not be saved. Try again.",
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
    email: "Email",
    land: "Germany",
    metaAgb: "Terms for using QuickTeam: registration, services, trial, prices, term and cancellation.",
    metaAvv:
      "Agreement between your business and QuickTeam as processor, including instructions, safeguards and subprocessors.",
    metaDatenschutz:
      "How QuickTeam processes personal data, your rights, recipients and retention periods.",
    metaImpressum:
      "Provider identification for QuickTeam: company, registered office, representation, registering court, commercial register number and VAT identification number.",
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
      "QuickTeam is the staff rota and team planner for hospitality. One place for shifts, team and swaps — clear to everyone.",
    heroTesten: "Register",
    heroAnmelden: "Sign in",
    heroFunktionen: "Explore the features",
    heroPreise: "See pricing",
    navAria: "Sections of this page",
    navKalender: "What is QuickTeam?",
    navVersprechen: "Promise",
    navPreise: "Pricing",
    navRechtliches: "Legal",
    navMenue: "Menu",
    navSchliessen: "Close",
    scrollen: "Scroll",
    buehneAria: "QuickTeam: from an empty calendar frame to a complete schedule",

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
      "Staff scheduling and team planner for hospitality: build the rota, assign staff, track hours. For restaurants, cafés and bars in Austria and Germany.",
  },

  /* Headcount per plan. Keys are the plan IDs from `site.ts`. */
  preise: {
    metaTitel: "Pricing",
    metaBeschreibung:
      "Low for €39, Medium for €69, Business for €99 a month — or yearly with two months free (€390 / €690 / €990). Larger businesses and multiple locations on request.",
    kennzeichen: "Pricing",
    titel: "One price per business. No per-head bill.",
    leadVor: "Pick the size that fits your team. The first ",
    leadTage: "{n} days",
    leadNach:
      " are free — you can skip the payment details during setup and add them later.",
    plaeneTitel: "The three plans",
    testMonat: "{n}-day trial, then billed monthly in advance.",
    testJahr: "{n}-day trial, then billed yearly in advance.",
    betriebAnlegen: "Create business",
    planHinweis: "You choose the plan during setup — you can switch there at any time.",
  },

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
    heute: "Today",
    stunde: "Hour",
    minute: "Minute",
    andereZeit: "Other time",
    uebernehmen: "Apply",
    einerWeniger: "{label}: one less",
    einerMehr: "{label}: one more",
  },

  registrierung: {
    metaTitel: "Create account",
    metaBeschreibung:
      "Create your QuickTeam account and confirm your email address with a code — you set up your business afterwards.",
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
    metaTitel: "Set up business",
    metaBeschreibung:
      "Create your business: name, country, your name and acceptance of the Terms and DPA.",
    speichernFehler:
      "The details could not be saved just now. Try again in a moment — if the error persists, get in touch with support.",
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
      metaTitel: "Plan and payment",
      metaBeschreibung:
        "Choose your plan and add a payment method — your business is created as soon as the payment is confirmed.",
      planFehler:
        "The chosen plan could not be set up just now. Try again in a moment — if the error persists, get in touch with support.",
      planMerkenFehler: "The chosen plan could not be applied just now. Try again in a moment.",
      titelMittel: "Add a payment method",
      leadSofort:
        "{plan} plan{preis}. Adding a payment method starts your subscription, and the first period is charged.",
      leadBezahlt:
        "Choose your plan and billing interval. Then you add a payment method; your business is created as soon as the payment is confirmed. You can enter a discount code along the way.",
      planLabel: "Plan",
      knopfSofort: "Subscribe (paid)",
      zurueckLink: "Back to plan selection",
      zurueckRest: ".",
      titelPlan: "Choose a plan",
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
      metaTitel: "Roles and team",
      metaBeschreibung:
        "Create your business's roles and invite your staff — both in one step.",
      meldung: {
        keineRolle: "No role was specified.",
        rolleZugewiesen: "You cannot delete the role, because it is still assigned to a person.",
        rolleBelegt: "This role is already used by a shift template. Remove it there first.",
        rolleGesperrt:
          "The role could not be removed — it no longer exists, or you are not allowed to change it. Reload the page.",
        rolleEntfernenFehler: "The role could not be removed. Try again.",
        rollenAnlegenEinladung:
          "The roles could not be created — so nobody was invited either. Try again.",
        doppelt:
          "{name} has already been invited with exactly these details. For a second person at the same address, enter a different name.",
        einladungFehler: "The invitation could not be created. Try again.",
        rollenZuweisungFehler:
          "The person has been created, but the roles could not be assigned. Set them in the list below.",
        urlaubVorabFehler:
          "The person is invited, but the vacation days already taken couldn't be saved. Please add them in the dashboard under Team.",
        niemand: "Nobody was specified.",
        entfernenFehler: "The invitation could not be removed. Try again.",
        unvollstaendig: "Details incomplete.",
        rolleAendernFehler: "The role could not be changed. Try again.",
        rollenAnlegenFehler: "The roles could not be created. Try again.",
      },
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
      urlaubGenommen: "Already taken (days, this year)",
      urlaubGenommenHinweis:
        "Vacation the person has already taken this year. Deducted from the allowance; later requests in QuickTeam are added automatically.",
      einladen: "Invite",
      niemand: "No one invited yet.",
      einladungOffen: " · invitation pending",
      entfernen: "Remove",
      weiterLaufend: "Saving …",
      weiter: "Continue to shifts",
      ersteRolle: "Create at least one role first.",
    },
    schichten: {
      metaTitel: "Shift templates",
      metaBeschreibung:
        "Define what a typical week in your business looks like — each shift with minimum staffing per role.",
      meldung: {
        anzahlUngueltig: "The number for “{rolle}” is not a valid number.",
        anzahlFeld: "Please enter a number from 0 to 99.",
        keinBedarf:
          "Enter for at least one role how many people are needed — otherwise the shift will not show up in the app at all.",
        anlegenFehler: "The template could not be created. Try again.",
        bedarfFehler:
          "The minimum staffing could not be saved, so the template was not created. Try again.",
        keineVorlage: "No template was specified.",
        entfernenFehler: "The template could not be removed. Try again.",
        einTag: "Choose exactly one weekday.",
        bearbeitenFehler: "The changes could not be saved. Try again.",
        bearbeitenBedarfFehler: "The shift was saved, but the minimum staffing was not saved completely. Try again.",
        nichtGefunden: "This template no longer exists. Reload the page.",
      },
      titel: "What does your week look like",
      lead: "For each weekday, the shifts you have — and per shift, how many people of which role must be present at minimum.",
      abschliessen: "Finish setup",
      ersteSchicht: "Create at least one shift with a minimum staffing first.",
      anlegenTitel: "Create a shift",
      anlegenText:
        "One template per shift and weekday. Night shifts across midnight are fine — just enter 22:00 to 06:00.",
      bezeichnung: "Label",
      bezeichnungHinweis: "For example early shift, evening shift or kitchen late.",
      wochentag: "Weekdays",
      wochentagHinweis: "Pick one or more days. Each day gets its own template with the same times and minimum staffing.",
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
      blockBearbeiten: "Edit {bezeichnung} on {tag}, {zeit}",
      wochentagEinzeln: "Weekday",
      bearbeitenTitel: "Edit shift",
      bearbeitenText: "Changes apply to future planning; shifts that already exist stay as they are. For more days, add a new shift.",
      speichern: "Save changes",
      speichernLaufend: "Saving …",
      abbrechen: "Cancel",
    },
    sperre: {
      metaTitel: "Trial expired",
      metaBeschreibung:
        "Your trial is over. Add a payment method and your business keeps running — your data is kept for up to 90 days.",
      eyebrow: "Trial",
      titel: "Your trial has ended",
      text: "The {tage} days are over, and no payment method is on file. Your business, your team and your shift templates stay stored until 90 days after the trial ends, then they are deleted (Terms § 5(3)). As soon as you add a payment method, your {plan} plan continues where it left off.",
      knopfFortsetzen: "Resume (paid)",
      keinNeues: "No new subscription is created — your existing one continues.",
      aboVerwalten: "Manage or cancel subscription",
      datenExport: "Export data",
    },
    stores: {
      geraetIos: "iPhone and iPad",
      geraetAndroid: "Android",
      bald: "coming soon",
      text: "The app is not in the stores yet. As soon as it is, you will find the links and a QR code to scan here. You do not have to wait for it — everything is already open to you in the dashboard.",
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
    nichtBestaetigt: "The code could not be confirmed. Request a new one.",
    neuUnterwegs: "A new code is on its way. Check your spam folder too.",
    ohneEmail: "Without an email address there is nothing to resend. Go back to registration.",
  },

  zustimmungSeite: {
    metaTitel: "Consent required",
    metaBeschreibung:
      "Confirm the Terms, the Data Processing Agreement and the Privacy Policy to keep working in the dashboard.",
    pruefungKicker: "Check failed",
    pruefungTitel: "We could not check this just now",
    pruefungVor: "We could not look up whether consent exists for ",
    pruefungNach:
      " — that is on us, not you. Try again in a moment. If the error persists, get in touch with support; your access remains.",
    erneut: "Try again",
    titelAenderung: "New version — please take a look",
    titelErst: "Confirm quickly, then carry on",
    aenderungVor: "There is a new version of the contract documents for ",
    aenderungNach:
      ". Until you agree, the previous terms continue to apply — so you can also decide later.",
    erstVor: "We do not have a consent on file for ",
    erstNach: " yet. We will catch up on that once — then you are taken back to where you wanted to go.",
    fussnote:
      "You confirm on behalf of the business, not personally. Your plan, billing and payment method are not affected.",
    spaeter: "Decide later and keep working",
    aboVerwalten: "Manage or cancel subscription",
    datenExport: "Export data",
    dokument: { agb: "Terms", avv: "DPA", datenschutz: "Privacy" },
    zustimmen: "Agree and continue",
    laufend: "Saving …",
    speichernFehler:
      "The consent could not be saved just now. Try again in a moment — if the error persists, get in touch with support.",
    hinweis:
      "There is a new version of the contract documents. Until you agree, the previous terms continue to apply.",
    hinweisLink: "View",
  },

  sprachWahl: {
    gruppe: "Language",
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
    metaTitel: "Sign in",
    metaBeschreibung:
      "Sign in with your email address and password. You land straight in your business's planning.",
    angemeldetAls: "Signed in as",
    zurPlanung: "Go to planning",
    abmelden: "Sign out",
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

  verfuegbarkeit: {
    metaTitel: "Availability",
    metaBeschreibung: "Set your shift preferences, or see your team's preferences at a glance.",
    titel: "Availability",
    leadChef: "Your team's shift preferences at a glance.",
    lead: "The more preferences you enter, the less likely each single one is met. Preferences for a specific day override template preferences.",
    wiederkehrend: "Recurring preferences",
    wiederkehrendText: "Applies to every occurrence of this weekday.",
    tagWunsch: "Preference for a specific day",
    tagWunschText: "Choose a date, then your preference per shift — with a note if you like.",
    spezielleTage: "Specific days",
    schicht: "Shift",
    ohneNamen: "No name",
    gerneIch: "Like to work",
    ungerneIch: "Prefer not to work",
    gerne: "Likes to",
    ungerne: "Prefers not to",
    speichern: "Save changes",
    speichertLaufend: "Saving …",
    keineVorlagen: "No shift templates for your roles.",
    aenderungEins: "{n} change not yet saved",
    aenderungMehr: "{n} changes not yet saved",
    verwerfen: "Discard",
    notizBearbeiten: "Edit note",
    notizHinzufuegen: "Add note",
    notizLabel: "Note for the management",
    notizHinweis: "Optional. Visible to the management. Leaving it empty removes the note.",
    abbrechen: "Cancel",
    notizSpeichern: "Save note",
    datum: "Date",
    tagWaehlen: "Choose day",
    keineSchichtTag: "No shifts for your role on this day.",
    notizOptional: "Note for the management (optional)",
    notizZuLang: "Please check your entries — a note is too long.",
    keineTage: "No specific days yet.",
    wunschLoeschen: "Delete preference",
    gruppierungAria: "Grouping",
    gruppiertNach: "Grouped by",
    nachTag: "Day",
    nachPerson: "Person",
    teamWiederkehrendText: "Apply to every occurrence of the weekday.",
    teamTage: "Preferences for specific days",
    teamTageText: "Upcoming days, with notes. They override the recurring ones.",
    keineWiederkehrenden: "No recurring preferences yet.",
    keineKommenden: "No preferences for upcoming days.",
    nochmal: "That didn't work. Try again.",
    gespeichert: "Saved.",
    wunschWeg: "This preference no longer exists.",
    notizGespeichert: "Note saved.",
    notizEntfernt: "Note removed.",
  },

  schichtvorlagen: {
    metaTitel: "Shift templates",
    metaBeschreibung:
      "Create and remove shift templates per weekday, including minimum staffing.",
    titel: "Shift templates",
    lead: "Your business's standard week: the shifts on each weekday and how many people of each role must be there at minimum. New templates apply to future planning periods; shifts that already exist stay as they are.",
    keineRollen: "Create at least one role first — without a role there is no minimum staffing to set.",
    zumTeam: "Go to team",
    nurChef: "Only the business owner can edit shift templates.",
  },

  teamVerwaltung: {
    metaTitel: "Team",
    metaBeschreibung: "Invite staff, assign roles, manage status.",
    titel: "Team and roles",
    lead: "Who works with you, what they can be scheduled for and who is currently paused.",
    status: {
      eingeladen: "Invited",
      aktiv: "Active",
      pausiert: "Paused",
      inaktiv: "Inactive",
    },
    statusErklaerung: {
      eingeladen: "Has not accepted the invitation yet.",
      pausiert: "Temporarily not schedulable, stays on the team.",
      inaktiv: "No longer works here.",
      aktiv: "Is scheduled as usual.",
    },
    rollen: "Roles",
    rollenText:
      "What kinds of work are there in your business? Roles decide who is eligible for which shift — and which minimum staffing a template requires.",
    neueRolle: "New role",
    hinzufuegen: "Add",
    ausblenden: "Hide",
    entfernen: "Remove",
    keineRolle: "No role created yet.",
    ausgeblendet: "Hidden",
    ausgeblendetText:
      "These roles are no longer assigned but keep their names reserved — a new role cannot use the same name.",
    einblenden: "Show again",
    team: "Team",
    alleinDa: "Nobody else is here yet.",
    anzahl: "{n} people, including you.",
    du: " · you",
    keinKontakt: "No contact details",
    rolleFallback: "Role",
    ohneRolle: "No role",
    schliessen: "Close",
    verwalten: "Manage",
    keineZuweisbar: "There is no role yet that could be assigned.",
    anstellung: "Employment",
    anstellungSpeichern: "Save employment",
    statusTitel: "Status",
    leitungStatus:
      "The management's status cannot be changed here — otherwise a business could be left without active management and locked for everyone.",
    zuruecknehmen: "Withdraw invitation",
    zuruecknehmenText: "Deletes the entry entirely. Possible as long as the invitation has not been accepted.",
    dsgvo: "Delete data (GDPR)",
    dsgvoText:
      "Name, email address and the link to the sign-in are overwritten. The person is set to inactive. Past schedules are kept, but without the name — ",
    nichtRueckgaengig: "this cannot be undone.",
    dsgvoBestaetigen: "Yes, permanently delete this person's data.",
    endgueltigLoeschen: "Delete permanently",
    leitung: "Management",
    einladenTitel: "Invite someone",
    einladenText:
      "An email address or phone number is enough — that is how the person finds their invitation when they sign in.",
    vorname: "First name",
    nachname: "Last name",
    email: "Email",
    telefon: "Phone",
    telefonHinweis: "International format with + and country code, otherwise the invitation will not arrive.",
    anstellungOptional: "Employment details (optional)",
    anstellungSpaeter: "Everything here can also be added later in the profile.",
    einladen: "Invite",
    vertragsart: "Contract type",
    keineAngabe: "Not specified",
    sollstunden: "Target hours per week",
    sollstundenHinweis:
      "The monthly value is stored (× 4.33). 40 h/week → 173 h/month. Leave empty if no target is agreed.",
    toleranz: "Overtime tolerance (hours)",
    toleranzHinweis:
      "Allowance for automatic planning: up to this point overtime has no effect. Beyond it the person is scheduled less often. Nothing is prevented by it.",
    saldo: "Opening overtime balance (hours)",
    saldoHinweis:
      "Carry-over from before QuickTeam — not the current balance. QuickTeam calculates that continuously itself. Minus hours as a negative number.",
    urlaub: "Leave entitlement (days per year)",
    urlaubHinweis:
      "Calendar days are counted, not working days — weekends count too. Open requests already use up the allowance.",
    urlaubGenommen: "Already taken (days, this year)",
    urlaubGenommenHinweis:
      "Total for the current year. Requests in QuickTeam count automatically from the moment they're sent; denied ones drop out again.",
    /* {n} = number. */
    urlaubGenommenMindestens:
      "At least {n} — that many days are already requested or approved in QuickTeam. Going lower only works by denying requests.",
    urlaubGenommenUnlesbar: "The vacation requests couldn't be read. Please try again.",
    urlaubGenommenFehler:
      "The employment details are saved, the vacation days already taken are not. Please try again.",
    urlaubVorabEinladungFehler:
      "The person is invited, but the vacation days already taken couldn't be saved. Please add them in their profile.",
    nurChef: "Only the management may manage the team.",
    rollennameFalsch: "The role name is not valid.",
    rolleDoppelt: "The role “{name}” already exists.",
    rolleAusgeblendetDoppelt:
      "A hidden role already has the name “{name}”. Show it again instead of creating a second one.",
    nameDoppeltFeld: "This name already exists.",
    rolleAnlegenFehler: "The role could not be created. Try again.",
    keineRolleAngegeben: "No role was specified.",
    rolleZugewiesen: "You cannot delete the role, because it is still assigned to a person.",
    rolleBelegt:
      "This role is still attached to a shift template or planned shifts. Remove it there first.",
    rolleGesperrt:
      "The role could not be removed — it no longer exists, or you are not allowed to change it. Reload the page.",
    rolleEntfernenFehler: "The role could not be removed. Try again.",
    nochmal: "That didn't work. Try again.",
    rolleWeg: "This role no longer exists. Reload the page.",
    niemand: "Nobody was specified.",
    eingabenFalsch: "These entries are not valid.",
    rlsFehler:
      "Nothing was saved — either this person no longer exists, or you no longer have permission. Reload the page.",
    anstellungFehler: "The employment details could not be saved. Try again.",
    gespeichert: "Saved.",
    doppelt:
      "{name} is already on the team with exactly these details. For a second person at the same address, enter a different name.",
    einladungFehler: "The invitation could not be created. Try again.",
    rollenZuweisungFehler:
      "The person has been created, but the roles could not be assigned. Set them in the list.",
    angabeFehlt: "Details missing.",
    zuweisenFehler: "The role could not be assigned. Try again.",
    abnehmenFehler:
      "The role could not be removed — the person is probably already assigned to a shift with it.",
    statusNichtSetzbar: "This status cannot be set.",
    nichtImBetrieb: "This person does not belong to your business.",
    leitungStatusFehler:
      "The management's status cannot be changed here. Otherwise a business could be left without active management — and thus locked for everyone.",
    statusFehler: "The status could not be changed. Try again.",
    personWeg: "This person no longer exists. Reload the page.",
    schonImTeam: "This person is already on the team. Set them to inactive or anonymise them.",
    zuruecknehmenFehler: "The invitation could not be withdrawn.",
    haekchen: "Tick the box if you really want to do this.",
    selbstNicht: "You cannot anonymise yourself here.",
    leitungAnon: "Members of the management cannot be anonymised here.",
  },

  tausch: {
    metaTitel: "Swap",
    metaBeschreibung: "Offer your own shifts for a swap and respond to offers.",
    titel: "Swap",
    leadChef: "Offer your own shifts, respond to offers, give approvals.",
    lead: "Offer your own shifts, respond to offers.",
    anbieten: "Offer a shift",
    keineSchicht: "You have no upcoming shift in the next 60 days that you could offer.",
    gesendet: "Offer sent.",
    fehlerFallback: "That didn't work.",
    welcheSchicht: "Which shift?",
    bitteWaehlen: "Please choose",
    wunschtage: "Preferred days (optional, up to three)",
    wunschtageText:
      "Days on which you would like to work instead. Without a choice, the whole month of the offered shift counts.",
    tagEntfernen: "Remove {tag}",
    tagHinzufuegen: "Add day",
    senden: "Send offer",
    sendenLaufend: "Sending…",
    status: {
      offen: "Open",
      angefragt: "Requested",
      wartet_auf_chef: "Awaiting approval",
      bestaetigt: "Confirmed",
      abgelehnt_chef: "Declined",
      abgelehnt_system: "Not possible",
      zurueckgezogen: "Withdrawn",
    },
    keineAnfragen: "No open swap requests right now.",
    schichttausch: "Shift swap",
    bietetAn: "Offers",
    wunschtageListe: "Preferred days: {tage}",
    dagegen: "In exchange",
    wartetAnbieter: "Waiting for confirmation by {name}.",
    wartetChef: "Waiting for approval by the management.",
    deinAngebot: "Your offer — nobody has responded yet.",
    zurueckziehen: "Withdraw",
    ungueltig: "This offer is no longer valid.",
    welcheDeiner: "Which of your shifts do you offer in exchange?",
    annehmenFrage: "Someone offers a shift in exchange — accept?",
    bestaetigen: "Confirm",
    ablehnen: "Decline",
    freigabeNoetig: "Approval required.",
    genehmigen: "Approve",
    anlegenFehler: "The offer could not be created. Try again.",
    niemandPasst:
      "Nobody fits this right now — neither the role nor a free day matches anyone on the team.",
    ungueltigNeuLaden: "This offer is no longer valid. Reload the page.",
    eigeneWaehlen: "Choose one of your own shifts to offer in exchange.",
    nochmal: "That didn't work. Try again.",
    anfrageWeg: "This request no longer exists.",
    nurChef: "Only the management may decide on swap requests.",
    code: {
      bereits_besetzt: "This offer has already been taken.",
      nicht_moeglich: "This shift no longer exists.",
      eigene_schicht: "This is your own shift.",
      gegen_ungueltig: "This shift does not belong to you (any more).",
      nicht_qualifiziert: "You do not have the required role.",
      anbieter_nicht_qualifiziert: "The offering person does not have the right role for your shift.",
      schon_zugewiesen: "One of the two people is already assigned on the other day.",
      gegen_vergangen: "This shift is in the past.",
      nicht_wunschtag: "This day does not match the offering person's preferred days.",
      schon_belegt: "You are already working on this day.",
      anbieter_belegt: "The offering person is already working on this day.",
    },
  },

  /** `/dashboard/kalender/neu` — eine einzelne Schicht anlegen (Spiegel von `CreateShiftModal`). */
  schichtNeu: {
    metaTitel: "Create shift",
    metaBeschreibung: "Create a single shift and assign people or post it as open.",
    zurueck: "Back to calendar",
    titel: "Create shift",
    einleitung: "A single shift, independent of planning: assign people directly or post the shift as open per role.",
    datum: "Date",
    start: "Start",
    ende: "End",
    ueberNachtHinweis: "If the end is before the start, the shift runs past midnight.",
    kommentar: "Comment",
    kommentarPlatzhalter: "Optional note about this shift",
    kommentarHinweis: "Shown in the calendar as the shift's name.",
    modusLegende: "How is the shift staffed?",
    modusZuweisen: "Assign people",
    modusAusschreiben: "Post as open",
    personenWaehlen: "Pick who works this shift",
    gewaehlt: "{n} selected",
    suchen: "Search by name",
    alleRollen: "All roles",
    niemandGefunden: "No one matches.",
    keineRolle: "No role — can't be scheduled",
    rolleFuer: "Role for {name}",
    rollenBenoetigt: "Roles needed",
    keineRollen: "Your business has no roles yet. Add them under “Team”.",
    ausschreibenHinweis: "Only employees with these roles can claim a slot, first come first served.",
    warnTitel: "Heads up",
    warnUrlaub: "on vacation this day",
    warnUngerne: "prefers not to work this day",
    trotzdem: "Assign anyway",
    abbrechen: "Cancel",
    erstellen: "Create shift",
    ausschreiben: "Post shift",
    laeuft: "Creating …",
    sofortHinweis: "The shift is published right away and appears in the calendar immediately — no approval under “Planning” needed.",
    jemand: "Someone",
    /* Ausnahmen aus den Zuweisungs-Triggern (HC-1…HC-5); {name} = Person. */
    fehler: {
      urlaub: "{name} has approved vacation on this day.",
      ueberlappend: "{name} already has a shift on this day.",
      ruhezeit: "{name} wouldn't get enough rest time between shifts.",
      tag: "{name} would exceed the maximum working hours for the day.",
      woche: "{name} would exceed the maximum working hours for the week.",
      monat: "{name} would exceed the agreed monthly hour limit.",
      qualifikation: "{name} isn't qualified for this role.",
      deaktiviert: "{name} is deactivated and can't be scheduled.",
      berechtigung: "You don't have permission to do that.",
      allgemein: "Couldn't create the shift. Please try again.",
    },
  },
  schicht: {
    metaTitel: "Shift",
    metaBeschreibung: "A shift in detail: times, staffing, notes.",
    zurueck: "Back to calendar",
    schicht: "Shift",
    ueberMitternacht: " (past midnight)",
    merkerEntwurf: "Draft",
    merkerMein: "You're on this shift",
    merkerAbgemeldet: "Called out",
    merkerOffen: "Open to take",
    merkerTausch: "Swap wanted",
    merkerUnterbesetzt: "Understaffed",
    entwurfText:
      "This shift is a draft and not yet visible to the team. It becomes visible once the schedule is published.",
    ausgeschrieben: "This shift is up for grabs",
    ausgeschriebenText:
      "You have the matching role. Whoever takes it first is assigned — there is no confirmation by the management.",
    zeitenTitel: "Times and comment",
    hinweisTitel: "Note on this shift",
    besetzung: "Staffing",
    gefahrenzone: "Danger zone",
    niemandChef: "Nobody is assigned to this shift yet.",
    niemandSonst:
      "Nobody is listed — either nobody is assigned yet, or your business does not show the names of others.",
    du: " (you)",
    faelltAus: "called out",
    mindestbesetzung: "Minimum staffing",
    keinBedarf:
      "No minimum staffing is set for this shift — common for shifts that were created by hand and staffed directly. It is visible as usual; only the target value against which understaffing could be detected is missing.",
    ohneRolle: "No role",
    wuensche: "Requests for this day",
    gerne: "Likes to work",
    ungerne: "Prefers not to work",
    notizen: "Notes",
    vonDir: "by you",
    vonName: "by {name}",
    vonJemandem: "by someone on the team",
    entfernenAria: "Remove {name} from the shift",
    hinzufuegen: "Add person",
    suchen: "Search name",
    suchenAria: "Search person",
    alleRollen: "All roles",
    niemandGefunden: "Nobody found to add.",
    datum: "Date",
    start: "Start",
    ende: "End",
    speichern: "Save",
    speichertLaufend: "Saving …",
    loeschen: "Delete shift",
    loeschenText: "This shift is deleted permanently — along with everyone assigned to it. ",
    nichtRueckgaengig: "This cannot be undone.",
    loeschenBestaetigen: "Yes, delete this shift.",
    loeschenKnopf: "Delete",
    abbrechen: "Cancel",
    fehler: {
      urlaub: "This person has approved leave on this day.",
      ueberlappend: "This person is already assigned to another shift on this day.",
      ruhezeit: "This falls short of this person's statutory minimum rest period.",
      tag: "This exceeds this person's statutory maximum daily working time.",
      woche: "This exceeds this person's maximum weekly working time.",
      monat: "This exceeds this person's agreed monthly hour limit.",
      qualifikation: "This person is not qualified for this role.",
      deaktiviert: "This person is deactivated and cannot be assigned.",
      berechtigung: "You do not have permission for this.",
      weg: "This shift no longer exists.",
      nochmal: "That didn't work. Try again.",
      gleich: "Start and end must not be the same.",
      loeschen: "The shift could not be deleted. Try again.",
    },
    gespeichert: "Saved.",
  },

  planung: {
    metaTitel: "Planning",
    metaBeschreibung: "Create planning periods and follow the state of the schedules.",
    titel: "Planning",
    lead: "Which period should be planned? Your shift templates turn into the actual shifts within it.",
    ohneVorlagen:
      "You do not have a shift template with minimum staffing yet. Without one a period stays empty — a template without a role requirement produces no shift, and it would be invisible in the app anyway. You can still create the period already.",
    angelegt: "Created periods",
    fuss: "The shifts are distributed by an algorithm that takes leave, rest periods, statutory maximum working hours and your team's preferences into account. It proposes — you approve.",
    status: {
      offen: "Open",
      deadline_erreicht: "Deadline passed",
      solver_laeuft: "Planning",
      vorschlag_bereit: "Proposal ready",
      veroeffentlicht: "Published",
    },
    erklaerung: {
      offen: "Your team can still enter preferences and availability.",
      deadline_erreicht: "The deadline has passed, nothing has been planned yet.",
      solver_laeuft: "The shift distribution is being calculated right now.",
      vorschlag_bereit: "A proposal is ready — not yet visible to the team.",
      veroeffentlicht: "The schedule is approved and visible to everyone.",
    },
    neuerZeitraum: "New period",
    neuerZeitraumText:
      "The frame being planned — usually one month. The shifts are created from it in the next step.",
    beginn: "Start",
    ende: "End",
    frist: "Deadline for requests",
    optional: "(optional)",
    keineFrist: "No deadline",
    fristHinweis:
      "Until then your team can enter availability and requests. Without a date, the start of the period applies.",
    trotzUeberschneidung:
      "Yes, create the period despite the overlap. I understand that shifts may be created twice for the shared days.",
    trotzFrist:
      "Yes, plan now. Requests that come in after submitting will not be included in this schedule.",
    anlegen: "Create period",
    erinnern: "Reminder: enter preferences",
    keinZeitraum: "No period created yet. Start with next month.",
    haengtListe: "The run has been stuck for over ten minutes — probably aborted.",
    unbesetztEins:
      "{n} position remained unfilled — there was nobody who could step in without breaking a rule.",
    unbesetztMehr:
      "{n} positions remained unfilled — there was nobody who could step in without breaking a rule.",
    alleBesetzt: "All positions filled.",
    solverFehler: "Something went wrong during the last planning run:",
    entfernen: "Remove period",
    entfernenHinweis: "As long as no shifts are attached to it.",
    vorschlagEins: "A proposal is waiting for you",
    vorschlagMehr: "{n} proposals are waiting for you",
    vorschlagText:
      "The shifts are in place but still invisible to your team. Look at them in the calendar — drafts have a dashed outline there.",
    vorschlagAlle:
      " Approving and discarding apply to all proposals at once, not to a single period.",
    freigeben: "Approve schedule",
    stattdessenVerwerfen: "Discard instead",
    verwerfenText:
      "The planned shifts are deleted — and with them the period they were created in. To plan again, you create it anew. ",
    nichtRueckgaengig: "This cannot be undone.",
    verwerfenBestaetigen: "Yes, discard the proposal.",
    verwerfen: "Discard",
    sitzungAbgelaufen: "Your session has expired. Reload the page.",
    schonErgebnis: "There is already a result for this period. Reload the page.",
    keineBerechtigung: "You do not have permission for this.",
    gescheitert: "Planning failed: {text}",
    fehlerStatus: "Error {status}",
    verbindungWeg:
      "The connection was lost. The run may still have completed — reload the page.",
    laeuft:
      "The shifts are being distributed right now. This can take a few minutes — you can safely leave the page.",
    gesperrt:
      "A planning run was just started. The button is locked for a few seconds so it is not calculated twice by accident.",
    haengt:
      "This run has been on “planning” for over ten minutes. It was probably aborted without being able to report it. A new run discards this period's previous proposals and recalculates; manually set assignments are not affected.",
    wirdGestartet: "Starting …",
    neuBerechnen: "Recalculate",
    verteilen: "Distribute shifts",
    ohneSollEins: "One employee without target hours:",
    ohneSollMehr: "{n} employees without target hours:",
    eingeladen: " (invited)",
    ohneSollTextEins: "This person is",
    ohneSollTextMehr: "They are",
    ohneSollText:
      " still scheduled, but without a target for an even distribution — once a billing cut-off date is set, this can distort their overtime. Please ",
    imProfil: "add it in the profile",
    ohneSollEnde: ".",
    nurChefAnlegen: "Only the management may create periods.",
    beginnFehlt: "The start is missing or invalid.",
    endeFehlt: "The end is missing or invalid.",
    datumPruefen: "Check the date.",
    endeNachBeginn: "The end must be after the start.",
    endeNachBeginnFeld: "Must be after the start.",
    fristUngueltig: "The deadline is not a valid date.",
    fristNachBeginn:
      "The deadline is after the start of the period. The schedule should be in place long before then.",
    fristNachBeginnFeld: "Should be before the start.",
    warnungUeberschneidung:
      "There is already a period from {von} to {bis}. Two schedules for the same days create shifts twice.",
    warnungFrist:
      "The deadline for requests only expires on {datum}. Anyone who still enters availability or shift preferences until then will not be considered in this schedule.",
    haekchen: "Tick the box if you want it anyway.",
    anlegenFehler: "The period could not be created. Try again.",
    nurChefErinnern: "Only the management may send reminders.",
    erinnerungTitel: "Please enter your shift preferences",
    erinnerungText:
      "The new schedule is being planned. Please enter your shift preferences before the deadline.",
    erinnerungFehler: "The reminder could not be sent.",
    erinnerungGesendet: "Reminder sent to all employees.",
    nurChefEntfernen: "Only the management may remove periods.",
    keinZeitraumAngegeben: "No period was specified.",
    haengenSchichten:
      "Shifts are already attached to this period. Discard the schedule first, then it can be removed.",
    zeitraumWeg: "This period no longer exists. Reload the page.",
    nurChefFreigeben: "Only the management may approve schedules.",
    freigebenFehler: "The schedule could not be approved. Try again.",
    nichtsFrei: "There was nothing to approve.",
    freiEins: "{n} shift is now visible to your team.",
    freiMehr: "{n} shifts are now visible to your team.",
    nurChefVerwerfen: "Only the management may discard schedules.",
    verwerfenHaekchen: "Tick the box if you really want to discard the proposal.",
    verwerfenFehler: "The proposal could not be discarded. Try again.",
    verworfenEins: "{n} planned shift was discarded. The period has been removed as well.",
    verworfenMehr: "{n} planned shifts were discarded. The period has been removed as well.",
  },

  notfall: {
    metaTitel: "Emergency",
    metaBeschreibung: "Report emergencies, post cover requests and take them on.",
    titel: "Emergency",
    lead: "Report your own shifts as an emergency, post cover requests and take them on.",
    melden: "Report emergency",
    meldenLaufend: "Reporting…",
    keineSchicht: "You have no upcoming shift you could report as an emergency.",
    meldenText:
      "You are removed from this shift immediately. The management decides whether a cover request is posted.",
    gemeldet: "Reported.",
    welcheSchicht: "Which shift?",
    bitteWaehlen: "Please choose",
    grund: "Reason (optional)",
    grundHinweis:
      "Keep it short and leave out anything about your health. It can be read by the management and whoever takes over your shift.",
    fehlerFallback: "That didn't work.",
    status: {
      gemeldet: "Reported",
      vertretung_gesucht: "Looking for cover",
      besetzt: "Cover found",
      storniert: "Withdrawn",
    },
    deineMeldungen: "Your reports",
    offeneNotfaelle: "Open emergencies",
    ausschreiben: "Post cover request",
    wirdGesucht: "Looking for cover.",
    offeneVertretungen: "Open cover requests",
    keineVertretungen: "No cover requests for your roles right now.",
    uebernehmen: "Take over",
    meldenFehler: "That didn't work — reload the page and try again.",
    nurChef: "Only the management may post a cover request.",
    notfallWeg: "This emergency no longer exists.",
    nochmal: "That didn't work. Try again.",
    vertretungWeg: "This cover request is no longer open.",
    code: {
      bereits_besetzt: "This shift has already been taken.",
      nicht_qualifiziert: "You do not have the required role.",
      schon_zugewiesen: "You are already assigned to this shift.",
      nicht_moeglich: "This could not be assigned. Try again.",
    },
  },

  zahlung: {
    rechnungUnvollstaendig: "Please complete the billing details.",
    rechnungFehler:
      "The billing details could not be saved. Try again — if the error persists, get in touch with support.",
    keinAbo: "There is no subscription for your business. Choose a plan above.",
    rabattFehler:
      "The discount code could not be applied. Try again — if the error persists, get in touch with support.",
    fremdBetrieb: "This payment method does not belong to your business.",
    fremdKonto: "This payment method does not belong to your account.",
    nichtBestaetigt: "The payment method has not been confirmed yet. Please try again.",
    keineMethode: "Stripe did not return a payment method. Try again.",
    rechnungFehlt:
      "Some billing details are still missing. Fill in the fields above the payment form and submit it again.",
    uebernahmeFehler:
      "The payment method could not be applied. Try again — if the error persists, get in touch with support.",
    zahlungOffen:
      "The payment has not been confirmed yet. Please try again in a moment — with a direct debit this can take a little while.",
    betriebFehler:
      "The payment has been received, but the business could not be created. Reload the page — if the error persists, get in touch with support.",
    abschlussFehler:
      "Completing the setup failed just now. Try again — if the error persists, get in touch with support.",
    ablehnung: {
      "nicht-gestartet":
        "The payment was declined, the subscription has not started. Try a different payment method.",
      "noch-nicht":
        "The payment was declined, the subscription has not started yet. Try a different payment method.",
      testphase:
        "The card was declined. Your trial has ended and the first charge is due — try a different payment method.",
    },
  },

  aboKonditionen: {
    preis: "{betrag} {zeitraum} plus VAT",
    proMonat: "per month",
    proJahr: "per year",
    kuendigung:
      "Cancel at any time to the end of the paid period — in the dashboard under Settings → “Manage subscription” or by email (Terms § 6(2)).",
    rechnungsangaben:
      "Your billing details are passed to the payment provider Stripe, which creates the invoice from them and calculates VAT (Privacy Policy, section 6).",
    testphaseBis: "Free trial until {datum} — nothing is charged until then.",
    ersteAbbuchungPreis: "First charge on {datum}: {preis}, then in advance for each period.",
    ersteAbbuchung: "First charge on {datum}, then in advance for each period.",
    laeuftPreis: "The trial is over, the subscription is running. Next charge on {datum}: {preis}.",
    laeuft: "The trial is over, the subscription is running. Next charge on {datum}.",
    gekuendigt: "The subscription is cancelled and ends on {datum}.",
    verlaengert: "The subscription renews automatically for one further period at a time.",
    testphaseVerbraucht:
      "A new subscription starts without a free trial.",
    beginntSofortPreis:
      "Once you add it, your subscription starts immediately and {preis} is charged for the first period.",
    beginntSofort: "Once you add it, your subscription starts immediately and the first period is charged.",
    danachVoraus: "After that it renews automatically and is charged in advance each time.",
    fortsetzenPreis:
      "Once you add it, your subscription resumes immediately and {preis} is charged for the first period.",
    fortsetzen: "Once you add it, your subscription resumes immediately and the first period is charged.",
  },

  einstellungen: {
    metaTitel: "Settings",
    metaBeschreibung: "Visibility, workflows and billing of your business.",
    titel: "Settings",
    lead: "What your team may see, how swaps and emergencies are counted, and up to when billing is closed.",
    nurChef:
      "These settings belong to the management. As an employee you do not see them — but what is set here affects your calendar.",
    keineZeile:
      "No settings are stored for this business. That should not happen — reload the page, and get in touch with support if it persists.",
    exportTitel: "Export data",
    exportText1:
      "All of your business's data as one JSON file: staff and roles, templates and shifts, leave, availability, messages, swaps, emergencies and the change log. The package states what each section contains and lists what is deliberately missing.",
    exportText2:
      "Individual votes from anonymous polls are not included — the package contains the tally instead. The export is free and possible as often as you like, even after cancelling.",
    exportKnopf: "Download export",
    exportNurChef: "Only the management can request the business export.",
    kontoTitel: "Account",
    kontoText:
      "If you no longer want to use QuickTeam, you can permanently delete your access. The business and the schedules remain — your name disappears from them.",
    kontoLoeschen: "Delete account",
    gespeichert:
      "Saved. The visibility settings take effect for your team from their next page view — nobody needs to sign in again.",
    sichtTitel: "What your team sees",
    sichtText:
      "Both settings apply business-wide and immediately — they do not change the display, but which data employees can access at all.",
    fremdeSchichten: "Other people's shifts visible",
    fremdeSchichtenText:
      "Off: employees only see their own shifts in the calendar. On: they see the business's entire schedule.",
    namenSichtbar: "Names of assigned staff visible",
    namenSichtbarText:
      "Off: a shift only shows your own name. On: everyone assigned is shown with name and role.",
    ablaeufe: "Workflows",
    tauschFreigabe: "Shift swaps require approval",
    tauschFreigabeText:
      "On: a negotiated swap waits for your approval. Off: the two people involved settle it between themselves.",
    notfallStunden: "Count emergency hours",
    notfallStundenText:
      "Counts shifts someone called out of at short notice towards working time anyway.",
    frist: "Deadline for requests",
    fristText:
      "Day of the month by which your team can enter availability for the following month. {min} to {max}.",
    abrechnungTitel: "Billing and language",
    abrechnungBis: "Billing closed up to",
    keinStichtag: "No cut-off date",
    abrechnungHinweis:
      "Cut-off date for the hours report: time before it counts as billed. Without a date, everything is counted.",
    spracheTitel: "Business language",
    spracheVor: "Intended as the default language for new members. ",
    spracheOhneWirkung: "Currently without effect",
    spracheNach:
      " — the app picks its language on the device, and the website follows each person's language choice. The value is saved but only takes effect once the default language is built.",
    speichern: "Save",
    speichernLaufend: "Saving …",
    nurChefAendern: "Only the management may change the settings.",
    eingabenFalsch: "These entries are not valid.",
    rlsFehler: "Nothing was saved — you no longer have permission. Reload the page.",
    speichernFehler: "The settings could not be saved. Try again.",
    gespeichertKurz: "Saved.",
    abo: {
      titel: "Subscription and billing",
      status: {
        trial: "Trial",
        aktiv: "Active",
        zahlung_ausstehend: "Payment pending",
        pausiert: "Paused",
        gekuendigt: "Cancelled",
      },
      meldung: {
        "kein-abo":
          "There is no subscription for this business yet. Choose a plan in the setup first.",
        "portal-fehler":
          "The customer portal could not be opened just now. Try again in a few minutes or write to us at blanktrading@web.de — you can cancel by email at any time.",
        verweigert: "The subscription is managed by the management.",
      },
      plan: "Plan {plan}",
      abonnement: "Subscription",
      endet: "Cancelled — ends on {datum}.",
      testphaseBis: "Trial until {datum}.",
      naechsteAbbuchung: "Next charge on {datum}.",
      portalText:
        "In the customer portal of our payment provider Stripe you cancel at the end of the paid period, change your payment method and download invoices.",
      verwalten: "Manage subscription",
    },
  },

  kontoloeschung: {
    metaTitel: "Delete account and data",
    metaBeschreibung: "Permanently remove your QuickTeam account.",
    stufe: "Delete account · Step {n} of 3",
    abbrechen: "Cancel and sign out",
    anmelden: {
      titel: "Delete account and data",
      lead: "Here you permanently remove your QuickTeam access. This cannot be undone, and there is no recovery — not even through support.",
      zuerst: "Sign in first",
      zuerstText:
        "So that nobody can delete someone else's account, we need your email address and password. What exactly is deleted is shown in the next step — nothing is deleted yet.",
      vergessenFrage: "Forgot your password?",
      vergessenLink: "Reset it first",
      vergessenRest: ", then come back here.",
      email: "Email address",
      passwort: "Password",
      weiter: "Continue",
      laufend: "Checking …",
    },
    folgen: {
      titel: "What happens if you continue",
      angemeldetVor: "You are signed in as ",
      angemeldetNach: ". Please read this to the end — after that only one confirmation follows.",
      geloeschtTitel: "What is deleted",
      zugang: "Your access.",
      zugangText: " Sign-in, password and the link to every business you belong to.",
      daten: "Your personal data.",
      datenText:
        " Name, email address and phone number are removed from each of your employments, along with messages and notification settings that concern only you.",
      bleibtTitel: "What remains",
      betrieb: "The business itself",
      betriebText:
        " and the schedules you were on. Your name no longer appears there — the entries remain because your employer has to keep records of working hours.",
      aboTitel: "Subscription and billing",
      aboText:
        "The deletion affects every business you manage. Their running subscriptions are cancelled immediately afterwards. Periods already charged are not refunded pro rata. If the cancellation fails for technical reasons, support has to complete it.",
      mitgliederVor:
        "If other people are still part of a business you manage, your account cannot be deleted — otherwise a business would be left without a manager and the subscription would keep running. Remove them first under ",
      mitgliederLink: "Team",
      mitgliederNach: " or hand over management to someone else.",
      export:
        "If you want to take your data with you first, cancel here and download it in the dashboard under Settings. After the deletion this is no longer possible.",
      weiter: "Understood — continue",
    },
    endgueltig: {
      titel: "Final warning",
      leadVor: "The next click deletes the account ",
      leadNach: " immediately and permanently.",
      keinZurueck: "There is no way back",
      keinRueckgaengig: "There is no undo and no recovery.",
      abgemeldet: "You will be signed out immediately and cannot sign in again afterwards.",
      aboChef:
        "Running subscriptions of your businesses are cancelled immediately, without a pro-rata refund.",
      eintraege: "Your entries in past schedules remain without your name.",
      keinWort:
        "No confirmation word can be determined for this account. Contact support instead of trying here.",
      zurueck: "Back to the consequences",
      tippVor: "To confirm, type ",
      tippNach: "",
      tippHinweis: "Exactly as shown above — upper and lower case matter.",
      verstanden:
        "I understand that my access will no longer exist afterwards and cannot be restored.",
      loeschen: "Delete account permanently",
      loeschtLaufend: "Deleting …",
    },
    fehler: {
      eingabe: "That does not match. Type “{wort}” exactly as shown.",
      aboUnlesbar:
        "The subscriptions could not be checked. Your account was not deleted. Try again later.",
      chefMitMitgliedern:
        "Your account still manages a business that other people belong to. As long as that is the case, it cannot be deleted — otherwise a business would be left without a manager. First remove the other members under Team, or hand over management to someone else.",
      fehlgeschlagen:
        "The account could not be deleted. Try again — if the error persists, get in touch with support.",
    },
  },

  passwort: {
    kicker: "Reset password",
    vergessen: {
      metaTitel: "Forgot password",
      metaBeschreibung:
        "Enter your email address and you will receive a code to set a new password.",
      titel: "Request a new password",
      lead: "Enter the email address you created your business with. You will receive a code to set a new password in the next step.",
      fussFrage: "Remembered your password?",
      fussLink: "Go to sign-in",
      emailLabel: "Email address",
      emailHinweis: "The address you created your business with.",
      absenden: "Request code",
      absendenLaufend: "Sending …",
    },
    neu: {
      metaTitel: "Set a new password",
      metaBeschreibung:
        "Enter the code from the email and choose your new password. The code is single-use and expires after 60 minutes.",
      titel: "Choose a new password",
      lead: "Enter the code from your email and choose your new password right away — then you go straight on to planning.",
      zurueck: "Back to sign-in",
      geraetTitel: "You can switch devices",
      geraetText:
        "Opening the email on your phone and typing the code on your computer is fully supported. Just enter the same email address as well.",
      codeLabel: "Code from the email ({n} digits)",
      codeHinweis: "The code is valid for 60 minutes.",
      emailLabel: "Email address",
      emailHinweis: "The address we sent the code to.",
      passwortLabel: "New password",
      passwortHinweis: "At least {n} characters.",
      wiederholungLabel: "Repeat password",
      absenden: "Save password",
      absendenLaufend: "Saving …",
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
    "v.wochentag.wahl": "Choose at least one weekday.",
    "v.zeiten.beginnEnde": "Start and end must not be the same.",
    "v.zeiten.startEnde": "Start and end must not be the same.",

    "v.kategorie.wahl": "Choose a category.",
    "v.zeichen.max": "{max} characters at most.",
    "v.checkliste.leer": "A checklist needs at least one item.",
    "v.umfrage.leer": "A poll needs at least two options.",

    "v.schicht.wahl": "Choose a shift.",
    "v.schicht.weg": "This shift no longer exists.",
    "v.schicht.vergangen": "The shift must start in the future.",
    "v.schicht.niemand": "Pick at least one person.",
    "v.schicht.keinBedarf": "Enter how many people are needed for at least one role.",
    "v.schicht.modus": "Choose whether to assign people or post the shift.",
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
