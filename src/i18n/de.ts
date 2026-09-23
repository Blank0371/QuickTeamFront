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
    registrieren: "Registrieren",
    /* Registerkarte zur Promo-Code-Anfrageseite. Erscheint nur, wenn
       `PROMO_CODE=an` — der Header hängt sie dann an `links` an. */
    promoPartner: "Promo-Partner",
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
  promo: {
    augenbraue: "Promo-Partnerschaft",
    titel: "Werde Promo-Partner von QuickTeam",
    lead: "Du empfiehlst QuickTeam an Gastronomiebetriebe weiter? Dann bekommst du einen eigenen Promo-Code, den neue Betriebe bei der Einrichtung ihres Kontos eintragen — so sehen wir, welche Anmeldungen von dir kommen.",
    schritteTitel: "So läuft die Anfrage",
    schritt1: "Lade das Antragsformular herunter.",
    schritt2: "Fülle es vollständig aus und unterschreibe es.",
    schritt3:
      "Sende es an blanktrading@web.de mit dem Betreff „Request Promo Partnership“.",
    formularHerunterladen: "Antragsformular herunterladen (PDF)",
    perMailSenden: "Ausgefülltes Formular per E-Mail senden",
    mailBetreff: "Request Promo Partnership",
    hinweisTitel: "Was danach passiert",
    hinweisText:
      "Wir prüfen deine Anfrage und melden uns per E-Mail. Die Vereinbarung kommt erst mit unserer Annahme zustande; dabei erhältst du deinen persönlichen Promo-Code. Ein Rabatt ist damit nicht verbunden — der Code hält nur fest, welche Betriebe über dich zu QuickTeam gefunden haben.",
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
    /* Untere Tab-Leiste auf dem Handy: die mittlere Kachel öffnet die
       Bereiche, die nicht als eigene Kachel unten stehen. Sie heisst für
       Chefs „Manager" (Team, Planung, Betriebseinstellungen), für
       Angestellte „Planung" (Urlaub, Verfügbarkeit, Tausch, Notfall). */
    mehr: "Mehr",
    mehrTitel: "Weitere Bereiche",
    mehrSchliessen: "Menü schließen",
    managerTab: "Manager",
    scheduleTab: "Planung",
    /* Untere Tab-Leiste: die „Konto"-Kachel rechts. Sammelt, was früher
       oben rechts stand (Sprache, Abmelden) plus Darstellung, Verbindungen
       und Kontolöschung. Bewusst „Konto", nicht „Einstellungen" — Letzteres
       trägt schon der Chef-Bereich für Abo und Abrechnung. */
    kontoTab: "Konto",
    kontoTitel: "Konto & Darstellung",
    spracheLabel: "Sprache",
    themaLabel: "Darstellung",
    themaSystem: "System",
    themaHell: "Hell",
    themaDunkel: "Dunkel",
    verbindungen: "Verbindungen verwalten",
    kontoLoeschen: "Konto löschen",
    kontoLoeschenHalten: "3 Sekunden gedrückt halten",
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
    /* `/dashboard/wechseln` — die Übersicht: zwischen Anstellungen wählen,
       Einladungen annehmen, oder als Konto ohne Verbindung einen eigenen
       Betrieb eröffnen. */
    wahl: {
      metaTitel: "Position wählen",
      metaBeschreibung:
        "Wähl den Betrieb, in dem du gerade arbeitest — oder nimm eine offene Einladung an.",
      titel: "Wo arbeitest du?",
      lead: "Wähl den Betrieb, in dem du gerade arbeitest.",
      leadMehrere:
        "Du gehörst zu mehreren Betrieben. Wähl den, um den es gerade geht — wechseln kannst du jederzeit.",
      deineBetriebe: "Deine Betriebe",
      einladungen: "Einladungen",
      einladungenText:
        "Ein Betrieb hat dich eingeladen. Sobald du annimmst, gehörst du zum Team und siehst deinen Dienstplan.",
      annehmen: "Annehmen",
      leerTitel: "Noch keine Verbindungen",
      leerText:
        "Dein Konto gehört zu keinem Team, und es liegt auch keine Einladung vor. Zwei Wege führen hier heraus: entweder lädt dich dein Betrieb ein — dann erscheint die Einladung auf dieser Seite, sobald sie da ist —, oder du eröffnest selbst einen Betrieb.",
      /* {email} = die eigene Adresse. */
      leerHinweis:
        "Wurdest du eingeladen und siehst nichts? Dann läuft die Einladung vermutlich auf eine andere Adresse als {email}. Sie wird über genau die Adresse zugeordnet, unter der sie verschickt wurde.",
      betriebEroeffnen: "Eigenen Betrieb eröffnen",
    },
  },

  /*
   * Kalender und Schichtdarstellung. Wochentag- und Monatsnamen stehen
   * bewusst NICHT hier — `kalender.ts` leitet sie über `Intl` aus der
   * Locale ab (`monatsnamen(locale)` …). Hier stehen nur die Texte, die
   * kein `Intl` liefert. Englisch aus der App (`calendar.*`) übernommen,
   * wo es ein Gegenstück gibt.
   */
  kalender: {
    metaTitel: "Kalender",
    metaBeschreibung:
      "Wer wann arbeitet — der Dienstplan deines Betriebs, Monat für Monat.",
    keineSchichten: "Keine Schichten in diesem Monat.",
    schichtEz: "Schicht",
    schichtMz: "Schichten",
    nurSichtbar: "nur was du sehen darfst",
    monatWechseln: "Monat wechseln",
    vorherigerMonat: "Vorheriger Monat",
    naechsterMonat: "Nächster Monat",
    monatWaehlen: "Monat wählen",
    vorJahr: "Vorheriges Jahr",
    nachJahr: "Nächstes Jahr",
    heute: "Heute",
    leerChef:
      "Für diesen Monat sind noch keine Schichten erzeugt. Das geschieht später über die Planung — Schichtvorlagen allein erzeugen keine Schichten.",
    leerMitarbeiter:
      "Für diesen Monat bist du zu keiner Schicht eingeteilt. Sobald der Dienstplan veröffentlicht ist, steht er hier.",
    legende: "Legende",
    meineSchicht: "Deine Schicht",
    legendeNacht: "gestrichelt = Nachtschicht vom Vortag, läuft hier weiter",
    legendeUnterbesetzt: "Mindestbesetzung nicht erreicht",
    legendeOffen: "an diesem Tag ist etwas frei",
    legendeMeine: "du bist an diesem Tag eingeteilt",
    rasterCaption: "Dienstplan als Monatsübersicht, Wochen beginnen am Montag",
    /* aria: Platzhalter {titel} {n} {wort} — Wortstellung je Sprache. */
    anzeigenAria: "{titel}, {n} {wort} anzeigen",
    weitere: "weitere",
    ueberMitternacht: "über Mitternacht",
    unterbesetzt: "unterbesetzt",
    freiUebernehmen: "frei zu übernehmen",
    duEingeteilt: "du bist eingeteilt",
    niemandEingeteilt: "niemand eingeteilt",
    nochNiemand: "Noch niemand eingeteilt",
    personEz: "Person",
    personMz: "Personen",
    tauschGesucht: "Tausch gesucht",
    notizEz: "Notiz",
    notizMz: "Notizen",
    fortsetzung: "Fortsetzung",
    fortsetzungVortag: "Fortsetzung vom Vortag",
    fortsetzungLang:
      "Fortsetzung der Nachtschicht vom Vortag, endet um {zeit} Uhr.",
    fortsetzungKurz: "bis {zeit}",
    fortsetzungHint: "Fortsetzung der Nachtschicht vom Vortag",
    ladeFehler: "Der Dienstplan liess sich nicht laden. Lad die Seite neu.",
    /* Leerer String = kein Hinweis (entspricht `null` in ZUSTAND_HINWEIS). */
    zustand: {
      abgemeldet: "abgemeldet",
      offen: "frei zu übernehmen",
      entwurf: "Entwurf",
      meine: "",
      normal: "",
    },
  },
  uebersicht: {
    metaTitel: "Übersicht",
    metaBeschreibung:
      "Wer heute und in den nächsten Tagen im Dienst ist — mit Uhrzeiten, Rollen und Namen.",
    ganzenMonat: "Ganzen Monat ansehen",
    heute: "Heute",
    morgen: "Morgen",
    /* {n} = Anzahl der Folgetage. */
    imDienstTitel: "Im Dienst — heute und die nächsten {n} Tage",
    kzImDienstTitel: "Heute im Einsatz",
    kzImDienstVon: "von {n}",
    kzImDienstLeer: "Heute ist keine Schicht geplant.",
    /* {n} {wort} = z. B. „3 Schichten". */
    kzImDienstFuss: "{n} {wort} heute.",
    kzOffenTitel: "Offene Positionen",
    kzOffenLeer: "Alle Vorschläge sind vollständig besetzt.",
    kzOffenFuss: "Noch unbesetzt in einem Planvorschlag.",
    kzUrlaubTitel: "Urlaubsanträge",
    kzUrlaubLeer: "Nichts wartet auf deine Freigabe.",
    kzUrlaubFuss: "Warten auf deine Freigabe.",
    kzFensterTitel: "Nächste {n} Tage",
    kzFensterFuss: "Im Zeitraum dieser Seite.",
    schichtEz: "Schicht",
    schichtMz: "Schichten",
    imDienst: "im Dienst",
    niemandZugeteilt: "Niemand zugeteilt",
    schichtName: "Schicht",
    unterbesetzt: "unterbesetzt",
    tauschGesucht: "Tausch gesucht",
    ueberMitternacht: "über Mitternacht",
    /* {rolle} = Rollenname. */
    leerRolle: "Niemand aus „{rolle}“ im Dienst.",
    leerChef: "Keine Schichten an diesem Tag.",
    leerMitarbeiter: "Für dich steht nichts an.",
    /* {name} Rollenname, {besetzt}/{benoetigt} Zahlen. */
    chipOhneBedarf: "{name}: {besetzt} im Dienst, keine Mindestbesetzung hinterlegt",
    chipFehlt: "{name}: {besetzt} von {benoetigt} besetzt, unterbesetzt",
    chipVoll: "{name}: {besetzt} von {benoetigt} besetzt, vollständig",
    /* {n} Tage, {spanne} = „Sa. bis Mo.". */
    leereAlle: "Gilt für alle {n} Tage im Blick — {spanne}.",
    leereSpanne: "{erster} bis {letzter}",
    alle: "Alle",
    rollenFilterAria: "Nach Rolle filtern",
    peErstellen: "Schichtplan erstellen",
    peIntro:
      "Aus deinen Schichtvorlagen entstehen die Dienste eines Zeitraums. Du legst den Zeitraum fest, das Rechenverfahren verteilt — freigegeben wird von dir.",
    pePruefen: "Vorschlag prüfen",
    peUnbesetzt: "{n} unbesetzt",
    peWirdGeplant: "Wird geplant",
    peUnbesetztHinweis:
      "Unbesetzte Stellen sind kein Fehler des Verfahrens, sondern seine Auskunft: für diese Rollen war in dem Zeitraum niemand verfügbar.",
  },
  urlaub: {
    metaTitel: "Urlaub",
    metaBeschreibung: "Urlaub beantragen und Anträge einsehen.",
    titel: "Urlaub",
    intro: "Urlaub beantragen und den Stand deiner Anträge einsehen.",
    resttage: "Resttage in diesem Jahr",
    beantragen: "Urlaub beantragen",
    gesendet: "Antrag gesendet — wartet auf Entscheidung.",
    von: "Von",
    bis: "Bis",
    kommentar: "Kommentar",
    optional: "(optional)",
    statusRequested: "Angefragt",
    statusApproved: "Genehmigt",
    statusDenied: "Abgelehnt",
    deineAntraege: "Deine Anträge",
    keineEigenen: "Noch keine Urlaubsanträge.",
    begruendung: "Begründung: ",
    antraegeTitel: "Urlaubsanträge",
    offen: "Offen",
    keineOffenen: "Keine offenen Anträge.",
    /* {n} = Anzahl. */
    entschieden: "Entschieden ({n})",
    nichtsEntschieden: "Noch nichts entschieden.",
    grundPlatzhalter: "Grund (optional)",
    abbrechen: "Abbrechen",
    ablehnungBestaetigen: "Ablehnung bestätigen",
    ablehnen: "Ablehnen",
    zuAbgelehnt: "Zu abgelehnt wechseln",
    genehmigen: "Genehmigen",
    zuGenehmigt: "Zu genehmigt wechseln",
  },
  mitteilungen: {
    metaTitel: "Mitteilungen",
    metaBeschreibung: "Ankündigungen, Checklisten und Umfragen für den Betrieb.",
    titel: "Mitteilungen",
    intro: "Ankündigungen, Checklisten und Umfragen für den ganzen Betrieb.",
    kategorie: {
      allgemein: "Ankündigung",
      aufgabenliste: "Checkliste",
      umfrage: "Umfrage",
      dokument: "Dokument",
    },
    prioritaet: { normal: "Normal", wichtig: "Wichtig", dringend: "Dringend" },
    suchen: "Suchen",
    suchenAria: "Mitteilungen durchsuchen",
    neueste: "Neueste",
    relevant: "Relevant",
    kategorieFilterAria: "Nach Kategorie filtern",
    alle: "Alle",
    keineVorhanden: "Noch keine Mitteilungen.",
    nichtsGefunden: "Nichts gefunden.",
    angeheftet: "Angeheftet",
    erledigt: "Erledigt",
    /* {n} = Stimmenzahl. */
    stimmen: "{n} Stimmen",
    anonymSuffix: " · Anonym",
    offeneSchichten: "Offene Schichten",
    ausschreibungIntro:
      "Ausgeschrieben für eine Rolle, die du hast. Wer zuerst übernimmt, ist eingeteilt — eine Bestätigung durch die Betriebsleitung gibt es nicht.",
    offeneSchicht: "Offene Schicht",
    zeitpunktUnbekannt: "Zeitpunkt unbekannt",
    schichtAnsehen: "Schicht ansehen",
    schonEingeteilt: "Du bist auf dieser Schicht bereits eingeteilt.",
    wirdUebernommen: "Wird übernommen …",
    /* {rolle} = Rollenname. */
    uebernehmen: "Als {rolle} übernehmen",
    /* {n} = freie Plätze. */
    frei: "{n} frei",
    wirdGesendet: "Wird gesendet…",
    senden: "Senden",
    zeileEntfernen: "Zeile entfernen",
    neueMitteilung: "Neue Mitteilung",
    verfassenAbbrechen: "Verfassen abbrechen",
    gesendet: "Gesendet.",
    katLabel: "Kategorie",
    titelLabel: "Titel",
    prioritaetLabel: "Priorität",
    textLabel: "Text",
    punkte: "Punkte",
    punktHinzufuegen: "Punkt hinzufügen",
    optionenLabel: "Optionen",
    optionHinzufuegen: "Option hinzufügen",
    mehrfachauswahl: "Mehrfachauswahl",
    anonym: "Anonym",
    fehlerFallback: "Das hat nicht geklappt.",
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
    heroTesten: "Registrieren",
    heroAnmelden: "Anmelden",
    heroFunktionen: "Funktionen entdecken",
    heroPreise: "Preise ansehen",

    versprechenTitel: "Unser Versprechen an dein Team",
    versprechenText:
      "QuickTeam bringt Klarheit in den Arbeitsalltag, ohne komplizierte Prozesse, versteckte Hürden oder unnötige Unruhe.",

    preiseKennzeichen: "Preise",
    preiseBald: "Bald verfügbar",
    preiseBaldText:
      "QuickTeam startet in Kürze. Den Plan wählst du dann während der Einrichtung — wechseln geht dort jederzeit.",
    preiseTitel: "Ein Preis pro Betrieb. Keine Rechnung pro Kopf.",
    preiseEmpfehlung: "Unsere Empfehlung",
    preiseKuendigungMonat: "Kündbar zum Ende des Abrechnungsmonats.",
    preiseKuendigungJahr: "Kündbar zum Ende des Abrechnungsjahres.",
    preiseTesten: "Registrieren",
    proMonat: "/ Monat",
    proJahr: "/ Jahr",
    preiseMonatlich: "Monatlich",
    preiseJaehrlich: "Jährlich",
    /** Gilt für alle drei Pläne: Jahrespreis = 10 × Monatspreis, also zwei Monate geschenkt. */
    preiseJahrVorteil: "2 Monate geschenkt",
    /*
     * Präfix des durchgestrichenen Vergleichs am Jahrespreis: „statt 468 €".
     * Bewusst nur ein Wort und **keine** Funktion: `landing` wird als Ganzes
     * an die Client-Component `Hero` gereicht (src/app/(landing)/page.tsx)
     * und muss serialisierbar bleiben. Den Betrag setzt `bauePreisKarten`
     * serverseitig davor.
     */
    preiseStattLabel: "statt",
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
    basic: "bis 15 Mitarbeiter, 1 Standort",
    pro: "bis 30 Mitarbeiter, 1 Standort",
    business: "bis 50 Mitarbeiter, 1 Standort",
  },

  /** Der Custom-Tarif steht neben den drei Plänen, nicht darin. */
  customTarif: {
    preis: "Auf Anfrage",
    grenze: "mehrere Standorte oder über 50 Mitarbeiter",
    kennzeichen: "Kein Tarif zum Anklicken",
    beschreibung:
      "Mehrere Standorte oder mehr als 50 Mitarbeiter lassen sich nicht sinnvoll klicken. Sag uns, wie dein Betrieb aussieht — Kette, Franchise oder zwei Lokale unter einer Leitung — und wir schneiden das darauf zu. Der Preis steht danach fest, nicht vorher:",
    anfragen: "Custom anfragen",
    betreff: "Custom-Tarif für meinen Betrieb",
    kontaktFolgt: "Kontaktadresse folgt in Kürze.",
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
      "Fällt jemand aus, macht QuickTeam die offene Schicht sichtbar und hilft deinem Team, eine passende Vertretung zu finden.",
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
   * Beschriftungen von Schritt 1 (Konto anlegen) — Formularfelder,
   * Überschriften, Hinweisboxen, Fussnoten. Als Prop an die
   * Client-Inseln gereicht, nicht über den Kontext: der trägt nur
   * `formular` und `validierung` (CLAUDE.md, „Zweisprachigkeit").
   */
  registrierung: {
    felder: {
      email: "E-Mail-Adresse",
      emailHinweis: "An diese Adresse geht dein Bestätigungscode.",
      passwort: "Passwort",
      passwortWiederholen: "Passwort wiederholen",
    },
    kontoAnlegen: "Konto anlegen",
    wirdAngelegt: "Wird angelegt …",
    daten: {
      titel: "Leg dein Konto an",
      lead: "E-Mail-Adresse und ein Passwort — mehr braucht es fürs Konto nicht. Danach bestätigst du deine Adresse mit einem Code; deinen Betrieb richtest du im nächsten Schritt ein.",
    },
    code: {
      titel: "Code aus der E-Mail eintragen",
      lead: "Wir haben dir einen Zahlencode geschickt. Trag ihn hier ein — dann steht dein Konto und es geht weiter.",
      label: "Code aus der E-Mail ({n} Ziffern)",
      hinweis: "Der Code gilt 60 Minuten.",
      emailHinweis: "Die Adresse, an die wir den Code geschickt haben.",
      bestaetigen: "Bestätigen",
      wirdGeprueft: "Wird geprüft …",
    },
    boxen: {
      geraetTitel: "Du kannst das Gerät wechseln",
      geraetText:
        "Die E-Mail am Handy öffnen und den Code am Rechner eintippen ist ausdrücklich vorgesehen. Trag dann einfach dieselbe E-Mail-Adresse mit ein.",
      fristTitel: "Bestätige innerhalb von 24 Stunden",
      fristText:
        "Danach wird die Registrierung automatisch gelöscht. Dann legst du das Konto einfach neu an — es geht nichts verloren, weil es bis zur Bestätigung noch gar nicht existiert. Der Code selbst gilt 60 Minuten; danach lässt du dir hier einen neuen schicken.",
      aendernSummary: "E-Mail-Adresse ändern",
      aendernText:
        "Beim erneuten Absenden schicken wir einen neuen Code an die dann eingetragene Adresse.",
    },
    fussnoteA:
      "Dein Konto wird erst angelegt, wenn du den Code aus der Bestätigungsmail einträgst. Passiert das nicht innerhalb von ",
    fussnote24: "24 Stunden",
    fussnoteB: ", wird die Registrierung wieder gelöscht und du fängst von vorn an.",
    b2b: "Angebot ausschließlich für Unternehmer im Sinne des § 14 BGB sowie für juristische Personen des öffentlichen Rechts — nicht für Verbraucher.",
    passwortKriterien: {
      min: "Mindestens {n} Zeichen",
      max: "Höchstens {n} Zeichen",
      gleich: "Beide Eingaben stimmen überein",
      alleErfuellt: "Alle Anforderungen an das Passwort sind erfüllt.",
      nochOffen: "Noch {n} von {gesamt} Anforderungen offen.",
      erfuellt: " — erfüllt",
      offen: " — offen",
    },
    fortschritt: {
      aria: "Fortschritt der Einrichtung",
      schrittVon: "Schritt {n} von {gesamt}",
      schritte: {
        betrieb: "Betrieb",
        zahlung: "Zahlung",
        team: "Team",
        schichten: "Schichten",
      },
    },
  },

  /**
   * Schritt 1 des Steppers: den Betrieb anlegen. Seit dem 2026-09-22 vom
   * Konto getrennt (`docs/claude-md-historie.md`). Betriebsdaten,
   * Promo-Code und die AGB/AVV-Vertragsannahme stehen hier — nicht mehr
   * bei der Registrierung.
   */
  betrieb: {
    titel: "Leg deinen Betrieb an",
    lead: "Betriebsname, Land und dein Name. Danach wählst du deinen Plan und hinterlegst ein Zahlungsmittel — dein Betrieb wird angelegt, sobald die Zahlung bestätigt ist.",
    b2b: "Angebot ausschließlich für Unternehmer im Sinne des § 14 BGB sowie für juristische Personen des öffentlichen Rechts — nicht für Verbraucher.",
    felder: {
      betriebName: "Betriebsname",
      land: "Land",
      vorname: "Vorname",
      nachname: "Nachname",
    },
    promoCode: "Promo-Code (optional)",
    promoCodeHinweis:
      "Hat dich jemand auf QuickTeam aufmerksam gemacht und dir einen Code gegeben? Dann trag ihn hier ein.",
    promoPruefen: "Promo-Code prüfen",
    promoPruefend: "Wird geprüft …",
    promoGueltig: "Code erkannt — passt.",
    promoNichtPruefbar:
      "Wir konnten den Code gerade nicht prüfen. Du kannst trotzdem fortfahren.",
    promoBittePruefen: "Bitte prüf den Promo-Code, bevor du den Betrieb anlegst.",
    betriebAnlegen: "Weiter zur Zahlung",
    wirdAngelegt: "Wird gespeichert …",
    erledigt: {
      titel: "Dein Betrieb ist angelegt",
      lead: "Dieser Schritt ist erledigt. Hier gibt es nichts mehr zu tun.",
      betriebLabel: "Betrieb",
      betriebFallback: "angelegt",
      hinweis: "Betriebsname und Land änderst du später in der App — nicht mehr hier.",
      weiter: "Weiter zur Einrichtung",
    },
  },

  /**
   * Die Stepper-Schritte 2 bis 4 (Zahlung, Team, Schichten). Schritt 1
   * (Konto) liegt oben in `registrierung`.
   */
  stepper: {
    zahlung: {
      titelMittel: "Zahlungsmittel hinterlegen",
      leadTestphase:
        "Plan {plan}{preis}. Jetzt wird nichts abgebucht — die Testphase läuft bis {datum}.",
      leadSofort:
        "Plan {plan}{preis}. Mit dem Hinterlegen beginnt dein Abo, und der erste Zeitraum wird abgebucht.",
      leadNur: "Plan {plan}{preis}.",
      leadBezahlt:
        "Wähl deinen Plan und das Abrechnungsintervall. Danach hinterlegst du ein Zahlungsmittel; dein Betrieb wird angelegt, sobald die Zahlung bestätigt ist. Einen Rabattcode kannst du dabei eingeben.",
      planLabel: "Plan",
      knopfSofort: "Kostenpflichtig abonnieren",
      zurueckLink: "Zurück zur Plan-Auswahl",
      zurueckRest: ".",
      titelPlan: "Plan wählen",
      leadOhneTestphase:
        "Die kostenlose Testphase gibt es einmal je Betrieb, und dein Betrieb hatte sie bereits. Im nächsten Schritt hinterlegst du ein Zahlungsmittel, und dein Abo beginnt sofort.",
      leadLebend:
        "Deine Testphase läuft bereits seit der ersten Planwahl; ein Planwechsel verlängert sie nicht. Das Zahlungsmittel kannst du jetzt hinterlegen oder später nachtragen.",
      leadNeu:
        "{tage} Tage kostenlos, danach {intervall}. Das Zahlungsmittel kannst du gleich hinterlegen oder später nachtragen — die Testphase läuft in beiden Fällen.",
      spaeter: "Später hinterlegen",
      planLegende: "Plan wählen",
      abrechnung: "Abrechnung:",
      intervallLegende: "Abrechnung wählen",
      monatlich: "monatlich",
      jaehrlich: "jährlich",
      monatVorteil: "Monatlich kündbar",
      jahrVorteil: "Zwei Monate sparen",
      uidLabel: "UID-Nummer (optional)",
      uidHinweis:
        "Mit gültiger UID rechnen wir ohne Umsatzsteuer ab (Reverse Charge), ohne UID mit. Form: ATU und acht Ziffern. Später änderbar unter Einstellungen → Abo verwalten.",
      uidLabelDe: "USt-IdNr (optional)",
      uidHinweisDe:
        "Für die Rechnung an dein Unternehmen. Form: DE und neun Ziffern. Später änderbar unter Einstellungen → Abo verwalten.",
      couponLabel: "Rabattcode (optional)",
      couponHinweis:
        "Falls du einen Rabattcode hast, gib ihn hier ein — er wird beim Abschluss verrechnet.",
      weiterLaufend: "Einen Moment …",
      weiterZahlung: "Weiter zur Zahlung",
      testphasenHinweis:
        "In beiden Fällen laufen zuerst {tage} Tage kostenlos. Ohne hinterlegtes Zahlungsmittel pausiert dein Betrieb danach, bis du eins nachträgst — deine Daten bleiben dafür 90 Tage erhalten.",
    },
    zahlungsFormular: {
      knopfStandard: "Zahlungsmittel hinterlegen",
      wirdHinterlegt: "Wird hinterlegt …",
      wirdGeladen: "Zahlungsformular wird geladen …",
      couponLabel: "Rabattcode (optional)",
      couponHinweis:
        "Hast du einen Rabattcode? Gib ihn hier ein — er wird auf dein Abo angewendet.",
      rechnungUnvollstaendig: "Bitte vervollständige die Rechnungsangaben.",
      bestaetigungFehlgeschlagen: "Die Zahlungsmethode liess sich nicht bestätigen.",
      keinErgebnis: "Stripe hat kein Ergebnis zurückgemeldet. Versuch es noch einmal.",
      verbindungUnterbrochen:
        "Die Verbindung wurde unterbrochen. Bitte versuch es erneut; prüfe bei einer bereits bestätigten Zahlung zunächst den Abostatus.",
    },
    rechnung: {
      legende: "Rechnungsangaben",
      intro:
        "Diese Angaben stehen auf jeder Rechnung. Ändern kannst du sie später jederzeit unter Einstellungen → „Abo verwalten\". Bereits gestellte Rechnungen bleiben unverändert.",
      firma: "Rechtlicher Unternehmensname",
      firmaHinweis:
        "Wie im Firmenbuch bzw. Handelsregister — nicht unbedingt derselbe Name wie im Dienstplan.",
      strasse: "Straße und Hausnummer",
      plz: "Postleitzahl",
      ort: "Ort",
      land: "Land der Rechnungsanschrift",
      landHinweis:
        "Gilt nur für die Rechnung. Der Standort deines Betriebs und die Arbeitszeitregeln deines Dienstplans ändern sich dadurch nicht.",
      uidWarnung:
        "Mit einem Länderwechsel ändert sich das Format deiner Steuernummer — ATU und acht Ziffern für Österreich, DE und neun Ziffern für Deutschland. Bereits gestellte Rechnungen bleiben davon unberührt.",
      uidLabel: "UID-Nummer",
      uidHinweis:
        "Für eine österreichische Rechnung erforderlich: Stripe rechnet damit im Reverse-Charge-Verfahren ab. Form: ATU und acht Ziffern.",
      uidLabelDe: "USt-IdNr",
      uidHinweisDe:
        "Für die Rechnung an dein Unternehmen erforderlich. Form: DE und neun Ziffern.",
    },
    team: {
      titel: "Wer arbeitet bei dir",
      lead: "Erst die Rollen — Küche, Service, Bar oder was bei dir passt. Danach lädst du deine Leute ein und hakst an, welche Rolle sie haben.",
      rollennameFehler: "Der Rollenname passt nicht.",
      rolleDoppelt: "Die Rolle „{name}\" gibt es schon.",
      rollenTitel: "Rollen",
      rollenText:
        "Womit wird bei dir gearbeitet? Ohne mindestens eine Rolle geht es nicht weiter — Schichtvorlagen brauchen sie, um in der App überhaupt sichtbar zu werden.",
      neueRolle: "Neue Rolle",
      hinzufuegen: "Hinzufügen",
      keineRolle: "Noch keine Rolle angelegt.",
      rolleEntfernen: "Rolle {name} entfernen",
      einladenTitel: "Mitarbeiter einladen",
      einladenText:
        "Optional — ein Betrieb, in dem vorerst nur du arbeitest, ist völlig in Ordnung. Eingeladene bekommen Zugang, sobald sie die App öffnen und die Einladung annehmen.",
      vorname: "Vorname",
      nachname: "Nachname",
      email: "E-Mail-Adresse",
      emailHinweis: "E-Mail oder Telefon — eins von beiden muss sein.",
      telefon: "Telefonnummer",
      telefonHinweis:
        "International mit +, z. B. +43 660 1234567 — sonst findet die App die Einladung nicht.",
      rollenLegende: "Rollen",
      einladenLaufend: "Wird eingeladen …",
      wochenstunden: "Sollstunden pro Woche",
      wochenstundenHinweis:
        "Laut Arbeitsvertrag. Gespeichert wird der Monatswert (× 4,33) — 40 Std./Woche → 173 Std./Monat.",
      toleranz: "Überstunden-Toleranz (Stunden)",
      toleranzHinweis:
        "Freibetrag für die automatische Planung: bis hierher bleiben Überstunden folgenlos. Darüber wird die Person seltener eingeteilt. Verhindert wird dadurch nichts.",
      urlaubstage: "Urlaubsanspruch (Tage pro Jahr)",
      urlaubstageHinweis:
        "Gezählt werden Kalendertage, nicht Arbeitstage — Wochenenden zählen mit.",
      einladen: "Einladen",
      niemand: "Noch niemand eingeladen.",
      einladungOffen: " · Einladung offen",
      entfernen: "Entfernen",
      weiterLaufend: "Wird gespeichert …",
      weiter: "Weiter zu den Schichten",
      ersteRolle: "Leg zuerst mindestens eine Rolle an.",
    },
    schichten: {
      titel: "Wie sieht eure Woche aus",
      lead: "Für jeden Wochentag die Schichten, die es bei dir gibt — und je Schicht, wie viele Leute welcher Rolle mindestens da sein müssen.",
      abschliessen: "Einrichtung abschliessen",
      ersteSchicht: "Leg zuerst mindestens eine Schicht mit Mindestbesetzung an.",
      anlegenTitel: "Schicht anlegen",
      anlegenText:
        "Eine Vorlage je Schicht und Wochentag. Nachtschichten über Mitternacht sind in Ordnung — trag einfach 22:00 bis 06:00 ein.",
      bezeichnung: "Bezeichnung",
      bezeichnungHinweis: "Zum Beispiel Frühdienst, Abenddienst oder Küche spät.",
      wochentag: "Wochentag",
      beginn: "Beginn",
      ende: "Ende",
      mindestbesetzung: "Mindestbesetzung",
      mindestbesetzungText:
        "Wie viele Leute welcher Rolle müssen mindestens da sein? Ohne mindestens eine Angabe taucht die Schicht in der App nicht auf.",
      anlegenLaufend: "Wird angelegt …",
      schichtHinzufuegen: "Schicht hinzufügen",
      wocheTitel: "Eure Woche",
      keineSchicht: "Noch keine Schicht angelegt.",
      unbekannteRolle: "unbekannt",
      ohneBedarf: "Ohne Mindestbesetzung — in der App unsichtbar",
      amTag: " am {tag}",
      bisZeit: " bis {zeit}",
      folgetag: ", endet am Folgetag",
      blockEntfernen: "{bezeichnung} am {tag}, {zeit}, entfernen",
    },
    sperre: {
      eyebrow: "Testphase",
      titel: "Deine Testphase ist abgelaufen",
      text: "Die {tage} Tage sind vorbei, und es ist kein Zahlungsmittel hinterlegt. Dein Betrieb, dein Team und deine Schichtvorlagen bleiben bis 90 Tage nach Ende der Testphase gespeichert, danach werden sie gelöscht (AGB § 5 Abs. 3). Sobald du eine Zahlungsmethode hinterlegst, läuft dein Plan {plan} weiter, wo er aufgehört hat.",
      knopfFortsetzen: "Kostenpflichtig fortsetzen",
      keinNeues: "Es entsteht kein neues Abonnement — dein bestehendes wird fortgesetzt.",
      aboVerwalten: "Abo verwalten oder kündigen",
      datenExport: "Daten exportieren",
    },
  },

  /**
   * Der Zustimmungssatz mit den drei Rechts-Links. In Segmente zerlegt,
   * weil die Links mitten im Satz stehen und die Wortstellung sich
   * zwischen den Sprachen verschiebt — ein einziger String liesse sich
   * nicht sauber übersetzen.
   */
  zustimmungFeld: {
    // Dashboard-Nachholung: alle drei Dokumente in einem Satz.
    vorAgb: "Ich schliesse für meinen Betrieb die ",
    agb: "AGB",
    zwischen: " und die ",
    avv: "Auftragsverarbeitungsvereinbarung (AVV)",
    nachAvv:
      " ab und bestätige, dass ich berechtigt bin, den Betrieb dabei zu vertreten. Die ",
    datenschutz: "Datenschutzerklärung",
    nachDatenschutz: " habe ich zur Kenntnis genommen.",
    // Betrieb-Schritt: nur die betriebliche Vertragsannahme (AGB + AVV).
    betriebVor: "Ich schliesse für meinen Betrieb die ",
    betriebZwischen: " und die ",
    betriebNach: " ab und bestätige, dass ich berechtigt bin, den Betrieb dabei zu vertreten.",
    // Registrierung (Konto): nur die persönliche Datenschutz-Kenntnisnahme.
    datenschutzVor: "Die ",
    datenschutzNach: " habe ich zur Kenntnis genommen.",
  },

  /**
   * „Code erneut senden" mit Countdown — geteilt von Registrierung
   * (Schritt 1) und Passwort-Reset.
   */
  codeVersand: {
    spamHinweis: "Nichts angekommen? Sieh im Spam-Ordner nach.",
    erneutSenden: "Code erneut senden",
    fristAktiv: "Aus Sicherheitsgründen erst in {n} Sekunden wieder möglich.",
    fristBereit: "Du kannst dir jetzt einen neuen Code schicken lassen.",
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

  /**
   * Die Anmeldeseite `/login`. Seitengerüst und Formularbeschriftungen als
   * Prop an die Client-Insel gereicht (CLAUDE.md, „Zweisprachigkeit").
   * `meldungen` sind die per Query-Parameter übergebenen Hinweise — als
   * Schlüssel, nie als Freitext angezeigt (`meldungFuer`).
   */
  login: {
    kicker: "Anmelden",
    titel: "Willkommen zurück",
    lead: "E-Mail-Adresse und Passwort eingeben — danach geht es direkt in die Planung deines Betriebs.",
    fussFrage: "Noch keinen Betrieb?",
    fussLink: "Jetzt anlegen",
    passwortVergessen: "Passwort vergessen?",
    emailLabel: "E-Mail-Adresse",
    passwortLabel: "Passwort",
    absenden: "Anmelden",
    absendenLaufend: "Wird geprüft …",
    meldungen: {
      "konto-geloescht": "Dein Konto wurde gelöscht.",
      "abo-kuendigung-offen":
        "Mindestens ein Abonnement konnte anschließend nicht gekündigt werden. Bitte kontaktiere umgehend blanktrading@web.de, damit keine weiteren Abbuchungen erfolgen.",
      abgemeldet: "Du bist abgemeldet.",
      "app-url-fehlt":
        "Dein Konto ist bereit, aber das Ziel der Weiterleitung ist nicht konfiguriert (NEXT_PUBLIC_APP_URL). Meld dich beim Support.",
    },
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
    "v.uid.form":
      "Eine Steuernummer hat die Form ATU und 8 Ziffern (Österreich, z. B. ATU12345678) oder DE und 9 Ziffern (Deutschland, z. B. DE123456789) — passend zum Rechnungsland.",
    "v.uid.pflicht":
      "Für ein kostenpflichtiges Abo ist eine gültige UID-Nummer (AT) bzw. USt-IdNr (DE) erforderlich.",
    "v.coupon.unbekannt": "Diesen Rabattcode kennt Stripe nicht oder er ist nicht mehr aktiv.",
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
    "v.sollstunden.pflicht": "Trag die Sollstunden pro Woche ein.",
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
