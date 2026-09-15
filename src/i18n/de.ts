/**
 * Deutsche Strings für alles, was auf mehreren Seiten auftaucht.
 *
 * Ansprache: Du-Form, durchgehend. Wer einen Betrieb führt, wird hier
 * geduzt — auch in Fehlermeldungen.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum hier kein `as const` mehr steht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-09 war dieses Objekt `as const` und `Dictionary` war
 * `typeof de`. Solange es nur eine Sprache gab, war das harmlos; mit
 * einer zweiten wird es zur Sperre: `as const` macht jeden Wert zu
 * seinem eigenen **Literaltyp**, und `en` müsste dann wörtlich
 * „Übersicht" heissen, um `Dictionary` zu erfüllen.
 *
 * Ohne `as const` leitet TypeScript `string` ab — und genau dann trägt
 * `Dictionary` das, was man von ihm will: `en.ts` muss **dieselben
 * Schlüssel** haben, aber darf andere Wörter enthalten. Ein vergessener
 * Schlüssel ist damit ein Übersetzungsfehler, den `npm run typecheck`
 * findet, und keiner, den ein Nutzer findet.
 */

export const de = {
  nav: {
    ueberspringen: "Zum Inhalt springen",
    menueOeffnen: "Menü öffnen",
    menueSchliessen: "Menü schliessen",
    hauptnavigation: "Hauptnavigation",
    fussnavigation: "Fussbereich",
    links: [
      { href: "/", label: "Start" },
      { href: "/preise", label: "Preise" },
    ],
    login: "Anmelden",
    registrieren: "Kostenlos testen",
  },
  footer: {
    claim: "Dienstpläne für Gastronomiebetriebe in Österreich und Deutschland.",
    produkt: "Produkt",
    konto: "Konto",
    rechtliches: "Rechtliches",
    rechtlichesLinks: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
      { href: "/agb", label: "AGB" },
      { href: "/avv", label: "AVV" },
    ],
    kontoLinks: [
      { href: "/login", label: "Anmelden" },
      { href: "/registrieren", label: "Registrieren" },
      { href: "/passwort-vergessen", label: "Passwort vergessen" },
    ],
    copyright: (jahr: number) => `© ${jahr} QuickTeam`,
  },
  fehler: {
    nichtGefundenTitel: "Diese Seite gibt es nicht",
    nichtGefundenText:
      "Die Adresse führt ins Leere. Möglich, dass sich ein Tippfehler eingeschlichen hat oder die Seite verschoben wurde.",
    fehlerTitel: "Da ist etwas schiefgelaufen",
    fehlerText:
      "Die Seite konnte nicht geladen werden. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    erneutVersuchen: "Erneut versuchen",
    zurStartseite: "Zur Startseite",
  },
  platzhalter: {
    hinweis: "Platzhalter — Inhalt folgt.",
  },
  dashboard: {
    navigation: "Dashboard-Navigation",
    uebersicht: "Übersicht",
    kalender: "Kalender",
    team: "Team",
    planung: "Planung",
    mitteilungen: "Mitteilungen",
    tausch: "Tausch",
    urlaub: "Urlaub",
    verfuegbarkeit: "Verfügbarkeit",
    notfall: "Notfall",
    einstellungen: "Einstellungen",
    /* Gruppentitel der Sidebar. Zwei, nicht fünf: die Gliederung soll
       das Suchen verkürzen, nicht selbst zum Lesestoff werden. */
    gruppeDienstplan: "Dienstplan",
    gruppeBetrieb: "Betrieb",
    folgt: "folgt",
    folgtHinweis: "Dieser Bereich ist noch nicht gebaut.",
    wechseln: "Position wechseln",
    abmelden: "Abmelden",
    rolle: {
      chef: "Chef",
      mitarbeiter: "Mitarbeiter",
    },
    /* `/dashboard/beendet` — Angestellte eines Betriebs mit beendetem Vertrag. */
    beendet: {
      metaTitel: "Betrieb nicht mehr aktiv",
      titel: "Dieser Betrieb nutzt QuickTeam nicht mehr",
      text: "Sein Abonnement ist beendet. Dienstplan, Mitteilungen, Urlaub und Tausch sind deshalb hier nicht mehr erreichbar.",
      loeschung:
        "Die Daten des Betriebs werden nach Ablauf der vertraglichen Frist gelöscht. Brauchst du etwas daraus, wende dich an deinen Arbeitgeber.",
      mehrere: "Du gehörst noch zu weiteren Betrieben — wechsle zu einem davon, um weiterzuarbeiten.",
    },
  },

  /**
   * Anzeigenamen, die zu einem gespeicherten **Code** gehören.
   *
   * `betriebe.land` hält `AT`/`DE`, `betriebs_einstellungen.
   * sprache_standard` hält `de`/`en`. Übersetzt wird hier also nur das
   * Etikett, nie der Wert — die Datenbank sieht von dieser Datei nichts.
   *
   * **`VERTRAG_TYPEN` steht bewusst nicht hier.** Dort ist der
   * Anzeigetext selbst der Spaltenwert (`mitarbeiter.vertrag_typ`, `text`
   * ohne CHECK), und `manager.tsx:598` in der App gibt ihn ungeprüft aus.
   * Eine Übersetzung schriebe englische Vertragsarten in eine geteilte
   * Tabelle, die die deutsche App dann wörtlich anzeigt. Die Begründung
   * steht ausführlich an der Konstante in `src/lib/validierung.ts`.
   */
  /**
   * Die Rechtsseiten.
   *
   * Nur Rahmen und Beschriftungen — die eigentlichen Texte stehen als
   * Markdown in `docs/rechtliches/` und werden zur Laufzeit gelesen.
   * Das Impressum ist die Ausnahme: es besteht aus Registerangaben, und
   * die sind keine Übersetzung, sondern Tatsachen. Übersetzt sind dort
   * deshalb die Rubriken, nicht die Werte.
   */
  rechtliches: {
    bereich: "Rechtliches",
    datenschutz: "Datenschutzerklärung",
    agb: "Allgemeine Geschäftsbedingungen",
    avv: "Auftragsverarbeitungsvertrag",
    avvKurz: "AVV",
    mustertextTitel: "So kommt dieser Vertrag zustande",
    mustertextHinweis:
      "Der Vertrag wird bei der Registrierung elektronisch geschlossen: Wer den Betrieb registriert, stimmt ihm für den Betrieb zu und bestätigt dabei, den Betrieb vertreten zu dürfen. Vertragspartner ist der registrierte Betrieb mit den Angaben aus seinem Kundenkonto. Wir speichern die angenommene Fassung, den Zeitpunkt und das handelnde Konto.",
    impressum: "Impressum",
    nichtAbrufbar: "Dieser Text ist gerade nicht abrufbar.",
    impressumLead: "Angaben gemäss § 5 Digitale-Dienste-Gesetz (DDG).",
    diensteanbieter: "Diensteanbieter",
    kontakt: "Kontakt",
    telefon: "Telefon",
    vertretenDurch: "Vertreten durch",
    geschaeftsfuehrer: "Geschäftsführer",
    register: "Register",
    registergericht: "Registergericht",
    handelsregister: "Handelsregister",
    ustIdTitel: "Umsatzsteuer-Identifikationsnummer",
    ustIdText: "Umsatzsteuer-Identifikationsnummer gemäss § 27a Umsatzsteuergesetz:",
    inhaltVerantwortlich: "Verantwortlich für den Inhalt",
    anschriftWieOben: "Anschrift wie oben",
  },

  /**
   * Beschriftungen der geteilten Formular-Bausteine — `SelectFeld` und
   * `DatumWahl`.
   *
   * Ein Block, nicht zwei: es sind dieselbe Art Text, nämlich Chrome
   * eines wiederverwendeten Bedienelements. Sie sagen nichts über die
   * Seite aus, auf der das Element steht, und gehören deshalb in den
   * Context statt durch dreissig Aufrufer.
   */
  /**
   * Landingpage und Preisdarstellung.
   *
   * **Die Beträge stehen nicht hier**, sondern in `plaene` in
   * `src/lib/site.ts` — eine Zahl, eine Quelle. Übersetzt wird nur, was
   * Sprache ist: die Grenze („bis 15 Mitarbeiter") und die Fliesstexte.
   * Die Plannamen Low / Medium / Business sind Produktnamen und bleiben
   * in beiden Sprachen gleich.
   */
  landing: {
    heroSub:
      "QuickTeam ist die Dienstplanung für Gastrobetriebe. Ein Ort für Schichten, Team und Tausch, klar für alle.",
    heroTesten: "Kostenlos testen",
    heroAnmelden: "Anmelden",
    heroFunktionen: "Funktionen entdecken",
    heroPreise: "Preise ansehen",

    versprechenTitel: "Unser Versprechen an dein Team",
    versprechenText:
      "QuickTeam bringt Klarheit in den Arbeitsalltag, ohne komplizierte Prozesse, versteckte Hürden oder unnötige Unruhe.",

    preiseKennzeichen: "Preise",
    preiseBald: "Bald verfügbar",
    preiseTitel: "Ein Preis pro Betrieb. Keine Rechnung pro Kopf.",
    preiseEmpfehlung: "Unsere Empfehlung",
    preiseTesten: "Kostenlos testen",
    proMonat: "/ Monat",
    preiseUst: "zzgl. USt.",
    preiseUstAlle: "Alle Preise zzgl. USt.",
    preiseB2b:
      "Angebot ausschließlich für Unternehmer im Sinne des § 14 BGB — nicht für Verbraucher.",
    preiseGesperrt:
      "QuickTeam startet in Kürze. Buchen ist noch nicht möglich — die Preise stehen hier, damit du weisst, woran du bist.",

    metaTitel: "QuickTeam — Dienstplanung für Gastronomiebetriebe",
    metaText:
      "Der Wochenplan fürs Lokal: Schichten verteilen, Team benachrichtigen, Stunden zählen lassen. Für Restaurants, Cafés und Bars in Österreich und Deutschland.",
  },

  /** Teilnehmerzahl je Plan. Schlüssel sind die Plan-IDs aus `site.ts`. */
  planGrenzen: {
    basic: "bis 15 Mitarbeiter",
    pro: "bis 30 Mitarbeiter",
    business: "bis 50 Mitarbeiter, 1 Standort",
  },

  /** Der Custom-Tarif steht neben den drei Plänen, nicht darin. */
  customTarif: {
    preis: "Auf Anfrage",
    grenze: "mehrere Standorte oder über 50 Mitarbeiter",
  },

  /** Die drei Versprechen der Scroll-Sequenz. */
  versprechen: {
    planTitel: "Der Plan steht",
    planText:
      "Rollen, Mindestbesetzung und Schichtvorlagen ergeben in Minuten ein verlässliches Grundgerüst für die ganze Woche.",
    teamTitel: "Das Team bestätigt",
    teamText:
      "Ankündigungen, Verfügbarkeiten und Rückmeldungen laufen sichtbar zusammen, bevor der erste Tag beginnt.",
    notfallTitel: "Ein Ausfall, sofort sichtbar",
    notfallText:
      "Fällt jemand aus, springt der Tausch ein und schließt die Lücke, ohne eine einzige Telefonkette.",
  },

  /** Die drei Karten vor dem Preisabschnitt. */
  versprechenKarten: {
    klarheitTitel: "Klarheit und Verlässlichkeit",
    klarheitEins: "Dienstplan, Verfügbarkeiten und Änderungen an einem Ort.",
    klarheitZwei: "Jeder weiß, wann und wo er gebraucht wird.",
    einfachheitTitel: "Wertschätzung und Einfachheit",
    einfachheitEins: "Planung soll dem Team Arbeit abnehmen, nicht neue Arbeit verursachen.",
    einfachheitZwei: "Klare Bedienung, verständliche Abläufe.",
    sichtbarkeitTitel: "Probleme rechtzeitig sichtbar",
    sichtbarkeitEins: "Notfälle, Konflikte und offene Vertretungen gehen nicht unter.",
    sichtbarkeitZwei: "Unterbesetzte Schichten fallen auf, bevor der Dienst beginnt.",
  },

  formular: {
    bitteWaehlen: "Bitte wählen",
    datumWaehlen: "Datum wählen",
    vorherigerMonat: "Voriger Monat",
    naechsterMonat: "Nächster Monat",
    wochenBeginn: "Wochen beginnen am Montag",
    leeren: "Leeren",
  },

  /**
   * Beschriftungen der Registrierung. Bisher nur das Promo-Code-Feld —
   * der übrige Text des Formulars steht noch im JSX (CLAUDE.md,
   * „Aufgabe für die nächste Sitzung", Punkt 1).
   */
  registrierung: {
    promoCode: "Promo-Code (optional)",
    promoCodeHinweis:
      "Hat dich jemand auf QuickTeam aufmerksam gemacht und dir einen Code gegeben? Dann trag ihn hier ein.",
  },

  auswahl: {
    landAT: "Österreich",
    landDE: "Deutschland",
    spracheDE: "Deutsch",
    spracheEN: "Englisch",
  },

  /**
   * Meldungen der Zod-Schemata.
   *
   * Flach und mit gepunkteten Schlüsseln, weil `loeseMeldung()` sie zur
   * Laufzeit über einen String nachschlägt — eine Verschachtelung müsste
   * dafür erst wieder aufgelöst werden. Die Schlüssel selbst stehen als
   * `message` in `src/lib/validierung.ts`; welche es gibt, sagt der Typ
   * `ValidierungsSchluessel` unten, und ein Vertipper dort bricht den
   * Typecheck statt erst unter einem Eingabefeld aufzufallen.
   *
   * `{name}` sind Platzhalter, gefüllt aus den Werten, die das Schema
   * mitgibt — Grenzen wie `PASSWORT_MIN` stehen genau einmal im Code
   * und nicht doppelt in zwei Wörterbüchern.
   */
  /**
   * Supabase-Auth-Fehler in Sätzen, die sagen, was passiert ist und was
   * zu tun ist. Die Zuordnung von Fehlercode auf Schlüssel steht in
   * `authFehlerText()` in `src/lib/formular.ts`; die Begründungen für
   * einzelne Formulierungen — besonders bei `serverMail` — stehen dort
   * als Kommentar und nicht hier.
   */
  auth: {
    serverMail:
      "Die Registrierung hat nicht geklappt: der Bestätigungscode liess sich nicht verschicken, und damit wurde auch kein Konto angelegt. Das liegt an unserem Mailversand, nicht an deinen Angaben. Versuch es gleich noch einmal — bleibt es dabei, meld dich beim Support.",
    server:
      "Auf unserer Seite ist etwas schiefgelaufen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    zugangsdaten: "E-Mail-Adresse oder Passwort stimmt nicht. Prüf beides und versuch es noch einmal.",
    nichtBestaetigt:
      "Diese E-Mail-Adresse ist noch nicht bestätigt. Trag den Code aus der Bestätigungsmail ein, dann kannst du dich anmelden.",
    zuVieleMails:
      "Es sind gerade zu viele E-Mails an diese Adresse rausgegangen. Warte ein paar Minuten und versuch es dann erneut.",
    zuVieleVersuche: "Zu viele Versuche in kurzer Zeit. Warte einen Moment und versuch es dann erneut.",
    schwachesPasswort:
      "Dieses Passwort ist zu schwach. Nimm ein längeres oder eines mit mehr verschiedenen Zeichen.",
    gleichesPasswort: "Das ist dein bisheriges Passwort. Wähl ein anderes.",
    codeAbgelaufen: "Der Code stimmt nicht oder ist abgelaufen. Prüf ihn, oder lass dir einen neuen schicken.",
    unvollstaendig: "Die Eingaben sind unvollständig. Prüf die markierten Felder.",
    registrierungAus:
      "Neue Konten sind derzeit abgeschaltet — das liegt nicht an deinen Angaben. QuickTeam ist noch nicht öffentlich; sobald die Registrierung freigegeben ist, funktioniert dieses Formular unverändert.",
    unbekannt: "Das hat nicht geklappt. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
  },

  validierung: {
    /* Bezeichnungen — eingesetzt in `v.pflicht.*` über `@`-Verweise. */
    "bez.betriebName": "Der Betriebsname",
    "bez.vorname": "Der Vorname",
    "bez.nachname": "Der Nachname",
    "bez.rollenName": "Der Rollenname",
    "bez.bezeichnung": "Die Bezeichnung",
    "bez.titel": "Der Titel",
    "bez.firma": "Der Unternehmensname",
    "bez.strasse": "Die Straße",
    "bez.plz": "Die Postleitzahl",
    "bez.ort": "Der Ort",

    "v.pflicht.leer": "{bez} darf nicht leer sein.",
    "v.pflicht.lang": "{bez} ist zu lang — höchstens {max} Zeichen.",

    "v.land.wahl": "Wähl Österreich oder Deutschland.",
    "v.email.leer": "Trag deine E-Mail-Adresse ein.",
    "v.email.form": "Das sieht nicht nach einer E-Mail-Adresse aus.",
    "v.passwort.leer": "Trag dein Passwort ein.",
    "v.passwort.kurz": "Das Passwort braucht mindestens {min} Zeichen.",
    "v.passwort.lang": "Das Passwort darf höchstens {max} Zeichen haben.",
    "v.wiederholung.leer": "Wiederhol das Passwort.",
    "v.wiederholung.ungleich": "Die beiden Passwörter stimmen nicht überein.",
    "v.zustimmung.fehlt":
      "Ohne Abschluss von AGB und AVV und die Kenntnisnahme der Datenschutzerklärung geht es nicht weiter.",
    "v.code.leer": "Trag den Code aus der E-Mail ein.",
    "v.code.ziffern": "Der Code besteht aus {anzahl} Ziffern.",
    "v.uid.form": "Eine österreichische UID-Nummer hat die Form ATU und 8 Ziffern, z. B. ATU12345678.",
    "v.promo.form": "Ein Promo-Code besteht aus Buchstaben, Ziffern, - und _, höchstens {max} Zeichen.",
    "v.promo.unbekannt": "Diesen Promo-Code kennen wir nicht. Prüf die Schreibweise — oder lass das Feld leer.",
    "v.plz.ziffern": "Die Postleitzahl besteht nur aus Ziffern.",
    "v.plz.at": "Österreichische Postleitzahlen haben {anzahl} Ziffern.",
    "v.plz.de": "Deutsche Postleitzahlen haben {anzahl} Ziffern.",

    "v.telefon.kurz": "Die Telefonnummer braucht mindestens {min} Ziffern.",
    "v.einladung.kontakt":
      "Trag eine E-Mail-Adresse oder eine Telefonnummer ein — sonst kommt die Einladung nicht an.",

    "v.vertrag.wahl": "Wähl eine Vertragsart.",
    "v.sollstunden.zahl": "Sollstunden bitte als Zahl.",
    "v.sollstunden.negativ": "Sollstunden können nicht negativ sein.",
    "v.toleranz.zahl": "Toleranz bitte als Zahl.",
    "v.toleranz.negativ": "Die Toleranz kann nicht negativ sein.",
    "v.saldo.zahl": "Anfangssaldo bitte als Zahl.",
    "v.urlaubstage.zahl": "Urlaubstage bitte als Zahl.",
    "v.urlaubstage.negativ": "Urlaubstage können nicht negativ sein.",
    "v.urlaubstage.max": "Höchstens {max} Tage.",
    "v.stunden.ganz": "Nur ganze Stunden.",
    "v.stunden.max": "Höchstens {max} Stunden.",
    "v.stunden.maxMonat": "Höchstens {max} Stunden im Monat.",
    "v.stunden.min": "Nicht unter −{max} Stunden.",
    "v.tage.ganz": "Nur ganze Tage.",

    "v.uhrzeit.form": "Uhrzeit im Format HH:MM, z. B. 17:00.",
    "v.uhrzeit.ungueltig": "Ungültige Uhrzeit.",
    "v.wochentag.wahl": "Wähl einen Wochentag.",
    "v.zeiten.beginnEnde": "Beginn und Ende dürfen nicht gleich sein.",
    "v.zeiten.startEnde": "Start und Ende dürfen nicht gleich sein.",

    "v.kategorie.wahl": "Wähl eine Kategorie.",
    "v.zeichen.max": "Höchstens {max} Zeichen.",
    "v.checkliste.leer": "Eine Checkliste braucht mindestens einen Punkt.",
    "v.umfrage.leer": "Eine Umfrage braucht mindestens zwei Optionen.",

    "v.schicht.wahl": "Wähl eine Schicht.",
    "v.schicht.weg": "Diese Schicht gibt es nicht mehr.",
    "v.person.weg": "Diese Person gibt es nicht mehr.",
    "v.rolle.wahl": "Bitte eine Rolle wählen.",
    "v.vorlage.weg": "Diese Vorlage gibt es nicht mehr.",
    "v.antrag.weg": "Diesen Antrag gibt es nicht mehr.",

    "v.datum.ungueltig": "Ungültiges Datum.",
    "v.datum.pruefen": "Datum prüfen.",
    "v.datum.start": "Wähl ein Startdatum.",
    "v.datum.ende": "Wähl ein Enddatum.",
    "v.datum.reihenfolge": "Das Ende darf nicht vor dem Beginn liegen.",

    "v.wunschtage.max": "Höchstens drei Wunschtage.",
    "v.wunsch.ungueltig": "Ungültiger Wunsch.",
    "v.aenderungen.max": "Zu viele Änderungen auf einmal.",
    "v.entscheidung.ungueltig": "Ungültige Entscheidung.",

    "v.sprache.wahl": "Wähl eine Sprache.",
    "v.zahl.pflicht": "Bitte eine Zahl eintragen.",
    "v.deadline.min": "Frühestens Tag {min}.",
    "v.deadline.max": "Spätestens Tag {max}.",
  },
};

export type Dictionary = typeof de;

/** Erlaubte `message`-Schlüssel der Zod-Schemata. */
export type ValidierungsSchluessel = keyof typeof de.validierung;
