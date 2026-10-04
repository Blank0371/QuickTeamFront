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
    startseite: "Startseite",
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
    kicker: "Fehler",
    kicker404: "Fehler 404",
    nichtGefundenMetaTitel: "Seite nicht gefunden",
    nichtGefundenMetaText:
      "Diese Adresse führt ins Leere. Über die Navigation kommst du zurück zur Startseite oder zu den Preisen.",
    /* {id} = Digest-Kennung des Fehlers. */
    kennung: "Kennung: {id}",
    bereichText:
      "Dieser Bereich liess sich nicht laden. Die Anmeldung besteht weiter — du kannst es noch einmal versuchen oder in einen anderen Bereich wechseln.",
    zurUebersicht: "Zur Übersicht",
    zumKalender: "Zum Kalender",
    dashboardNichtGefundenTitel: "Nichts gefunden",
    dashboardNichtGefundenText:
      "Diese Seite gibt es nicht — oder sie gehört zu etwas, das du nicht sehen darfst. Bei einer Schicht heisst das meistens: sie wurde inzwischen gelöscht, sie gehört zu einem anderen Betrieb, oder dein Betrieb zeigt Schichten ohne dich nicht an.",
  },
  /* Screenreader-Ansage der Ladeskelette (`LadeAnsage`). */
  laden: {
    allgemein: "Wird geladen",
    dashboard: "Dashboard wird geladen",
    dienstplan: "Dienstplan wird geladen",
  },
  /* Standard-Metadaten des Root-Layouts (Titel, Description, Open Graph). */
  meta: {
    titel: "QuickTeam — Dienstplanung für Gastronomiebetriebe",
    beschreibung:
      "QuickTeam plant Schichten für Restaurants, Cafés und Bars in Österreich und Deutschland. Dienstplan erstellen, Team informieren, Stunden im Blick behalten.",
    ogBeschreibung:
      "Schichtplanung für Gastronomie in Österreich und Deutschland. In Minuten geplant statt in Stunden.",
    ogLocale: "de_AT",
  },
  promo: {
    metaTitel: "Promo-Partner",
    metaBeschreibung:
      "Werde Promo-Partner von QuickTeam: Antragsformular herunterladen, ausfüllen, unterschreiben und einsenden. Für alle, die QuickTeam an Gastronomiebetriebe weiterempfehlen.",
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
    joseph: "Joseph",
    /* Gruppentitel der Sidebar. Zwei, nicht fünf: die Gliederung soll
       das Suchen verkürzen, nicht selbst zum Lesestoff werden.

       Sie hiessen bis zum 2026-09-21 `gruppeDienstplan`/`gruppeBetrieb`
       und trugen „Dienstplan"/„Betrieb" — die Sidebar schrieb da längst
       „Arbeitsplatz"/„Organisation" hartkodiert daneben. Gefunden hat das
       `npm run i18n:pruefen` als Schlüssel ohne Verwendung; sichtbar war
       es nur auf Englisch, wo zwei deutsche Wörter stehen blieben. */
    gruppeArbeitsplatz: "Arbeitsplatz",
    gruppeOrganisation: "Organisation",
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
    /* Ersatz, falls der Betriebsname nicht lesbar ist. */
    betriebOhneNamen: "Betrieb ohne Namen",
    abmelden: "Abmelden",
    rolle: {
      chef: "Chef",
      mitarbeiter: "Mitarbeiter",
    },
    /* `/dashboard/joseph` — experimentell, noch nicht umgesetzt. Zwei
       Schalter (`src/lib/joseph.ts`): Vorschau zeigt nur den Hinweis,
       aktiv eine Chat-Attrappe ohne Funktion. */
    josephSeite: {
      metaTitel: "Joseph",
      metaBeschreibung: "Joseph, der Sekretär für Chefs — in Entwicklung.",
      titel: "Joseph",
      untertitel: "Der Sekretär für Chefs.",
      beschreibung: [
        "Joseph ist der Sekretär, der die Fragen deiner Mitarbeiter automatisch beantwortet.",
        "Fragt jemand, wo der Ordner mit den Rezepten liegt? Joseph sieht in der Dokumentation und in früheren Fragen nach und antwortet in Sekunden für dich.",
      ],
      entwicklung: "Joseph befindet sich noch in Entwicklung.",
      kontakt:
        "Du hast Vorschläge, Wünsche oder Fragen? Schreib uns:",
      mailBetreff: "About Joseph",
      experimentell:
        "Experimentell — Joseph antwortet noch nicht. Nachrichten werden nicht gespeichert und nirgendwohin gesendet.",
      chatLabel: "Nachricht an Joseph",
      chatPlatzhalter: "Schreib Joseph eine Nachricht …",
      senden: "Senden",
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
      /* Meldungen der Server Actions. */
      keinePosition: "Es wurde keine Position angegeben.",
      positionWeg:
        "Diese Position gehört nicht mehr zu deinem Konto. Lad die Seite neu, dann siehst du den aktuellen Stand.",
      keineEinladung: "Es wurde keine Einladung angegeben.",
      annehmenFehler:
        "Die Einladung liess sich nicht annehmen. Möglich, dass sie zurückgezogen wurde — lad die Seite neu.",
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
    kennzahlenAria: "Kennzahlen",
    ohneRolle: "Ohne Rolle",
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
    /* Server Actions — die `URLAUB_*`-Codes der RPC. */
    rpc: {
      URLAUB_DATUM:
        "Das Datum passt nicht — der Beginn darf nicht in der Vergangenheit liegen und muss vor dem Ende liegen.",
      URLAUB_KONTINGENT: "Das übersteigt deinen verbleibenden Urlaubsanspruch.",
      URLAUB_SCHICHTEN: "Für diesen Zeitraum bist du bereits zu Schichten eingeteilt.",
      URLAUB_GEPLANT: "Für diesen Zeitraum ist bereits ein veröffentlichter Plan vorhanden.",
    },
    nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
    nurChef: "Nur die Betriebsleitung darf über Urlaubsanträge entscheiden.",
    antragWeg: "Diesen Antrag gibt es nicht mehr.",
    anspruchUnlesbar: "Der Urlaubsanspruch liess sich nicht prüfen. Versuch es noch einmal.",
    /* {jahr}, {rest}, {anspruch}, {beantragt} = Zahlen. */
    anspruchUeberschritten:
      "Das übersteigt den Urlaubsanspruch für {jahr}: noch {rest} von {anspruch} Tagen übrig, dieser Antrag braucht {beantragt}.",
    antragWegNeuLaden: "Diesen Antrag gibt es nicht mehr. Lad die Seite neu.",
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
    /* Meldungen der Server Actions. */
    ohneRolle: "Ohne Rolle",
    /* Übernahme einer ausgeschriebenen Schicht — die Rückgabecodes der RPC. */
    uebernahme: {
      angenommen: "Übernommen — die Schicht steht jetzt in deinem Plan.",
      schon_zugewiesen: "Du bist auf dieser Schicht schon eingeteilt.",
      voll: "Zu spät — der letzte Platz für diese Rolle ist gerade vergeben worden. Die Ausschreibung stand noch, weil sie erst der Chef schliesst.",
      nicht_qualifiziert:
        "Für diese Rolle bist du nicht eingetragen. Wenn das nicht stimmt, sag es der Betriebsleitung.",
      nicht_moeglich:
        "Übernahme aktuell nicht möglich — zum Beispiel wegen Ruhezeit- oder Höchstarbeitszeit-Grenzen. Die Prüfung liegt in der Datenbank und nennt den genauen Grund leider nicht.",
    },
    ausschreibungWeg: "Diese Ausschreibung gibt es nicht mehr.",
    ausschreibungZurueckgezogen:
      "Das hat nicht geklappt. Wahrscheinlich ist die Ausschreibung inzwischen zurückgezogen worden — lad die Seite neu.",
    nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
    kategorieVerboten: "Diese Kategorie steht dir nicht zur Verfügung.",
    sendenFehler: "Die Mitteilung liess sich nicht senden. Versuch es noch einmal.",
    keineAufgabe: "Es wurde keine Aufgabe angegeben.",
    umschaltenFehler: "Das hat nicht geklappt. Versuch es noch einmal.",
    keineUmfrage: "Es wurde keine Umfrage angegeben.",
    stimmeFehler: "Die Stimme liess sich nicht speichern. Versuch es noch einmal.",
  },

  /**
   * Dienstplan zum Ausdrucken und für Excel (`/dashboard/kalender/drucken`).
   *
   * `tabellenKopf` sind **Spaltenköpfe einer Excel-Datei**, keine Oberfläche.
   * Sie stehen trotzdem hier und nicht als Literal im Route Handler: wer den
   * Plan auf Englisch liest, bekommt sonst eine Tabelle mit deutschen
   * Spalten — und die Datei überlebt die Sitzung, in der sie entstanden ist.
   */
  planExport: {
    metaTitel: "Dienstplan drucken",
    titel: "Dienstplan",
    beschreibung:
      "Der Dienstplan als Wochen- oder Monatsblatt — zum Aushängen oder als Tabelle für Excel.",
    woche: "Woche",
    monat: "Monat",
    kw: "KW",
    zurueck: "Zurück zum Kalender",
    vorheriger: "Vorheriger Zeitraum",
    naechster: "Nächster Zeitraum",
    heute: "Heute",
    drucken: "Drucken",
    csv: "Für Excel herunterladen",
    spalteSchicht: "Schicht",
    keineSchichten: "In diesem Zeitraum liegt keine Schicht.",
    erstelltAm: "Stand",
    legendeTitel: "Zeichen",
    legendeUnbesetzt: "niemand eingeteilt",
    legendeAbgemeldet: "abgemeldet (Notfall)",
    legendeUnterbesetzt: "Mindestbesetzung nicht erreicht",
    legendeEntwurf: "Entwurf, noch nicht veröffentlicht",
    legendeUeberNacht: "Schicht endet am Folgetag",
    /* Musterwort in der Legende, an dem Durchstreichung und Kursive gezeigt werden. */
    legendeMuster: "Name",
    hinweisEntwurf:
      "Enthält Entwürfe (kursiv), die noch nicht veröffentlicht sind — das Team sieht sie nicht.",
    wocheLeer: "In dieser Woche liegt keine Schicht.",
    blattKalender: "Kalender",
    fortsetzung: "Fortsetzung",
    /* Wenn ein Tag mehr Namen hat, als in einen Excel-Kasten passen. */
    weitere: "… +{anzahl} weitere – vollständig im Blatt „{blatt}“",
    blattPlan: "Schichtplan",
    blattListe: "Liste",
    tabellenKopf: {
      datum: "Datum",
      wochentag: "Wochentag",
      schicht: "Schicht",
      beginn: "Beginn",
      ende: "Ende",
      stunden: "Stunden",
      ueberNacht: "Über Mitternacht",
      status: "Status",
      person: "Mitarbeiter",
      rolle: "Rolle",
      abgemeldet: "Abgemeldet",
      ja: "ja",
      nein: "nein",
      entwurf: "Entwurf",
      veroeffentlicht: "veröffentlicht",
      archiviert: "archiviert",
      unbesetzt: "(unbesetzt)",
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
    email: "E-Mail",
    /* Land der Anschrift im Impressum — Rubrik-Übersetzung, keine Registerangabe. */
    land: "Deutschland",
    metaAgb:
      "Vertragsbedingungen für die Nutzung von QuickTeam: Vertragsschluss, Leistungsumfang, Testphase, Entgelte, Laufzeit und Kündigung.",
    metaAvv:
      "Auftragsverarbeitungsvertrag nach Art. 28 DSGVO zwischen dem Betrieb als Verantwortlichem und QuickTeam als Auftragsverarbeiter — mit Weisungen, technischen Massnahmen und der Liste der Unterauftragsverarbeiter.",
    metaDatenschutz:
      "Wie QuickTeam personenbezogene Daten verarbeitet: Rollenverteilung zwischen Arbeitgeber und Anbieter, Rechtsgrundlagen, Aufbewahrung und Ihre Betroffenenrechte.",
    metaImpressum:
      "Anbieterkennzeichnung von QuickTeam: Firma, Sitz, Vertretung, Registergericht, Handelsregisternummer und Umsatzsteuer-Identifikationsnummer.",
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
    /* Abschnitts-Navigation der Landingpage (`LandingNavigation`). */
    navAria: "Abschnitte dieser Seite",
    navKalender: "Was ist QuickTeam?",
    navVersprechen: "Versprechen",
    navPreise: "Preise",
    navRechtliches: "Rechtliches",
    navMenue: "Menü",
    navSchliessen: "Schließen",
    scrollen: "Scrollen",
    buehneAria: "QuickTeam: vom leeren Kalenderrahmen zum vollständigen Plan",

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

  /** Die Seite `/preise` (Rahmen und `PreisListe`). */
  preise: {
    metaTitel: "Preise",
    metaBeschreibung:
      "Low für 39 €, Medium für 69 €, Business für 99 € im Monat — oder jährlich mit zwei Monaten geschenkt (390 / 690 / 990 €). Grössere Betriebe und mehrere Standorte auf Anfrage.",
    kennzeichen: "Preise",
    titel: "Ein Preis pro Betrieb. Keine Rechnung pro Kopf.",
    /* Lead in drei Teilen, weil die Tageszahl hervorgehoben dazwischen steht. */
    leadVor: "Such dir die Grösse aus, die zu deinem Team passt. Die ersten ",
    leadTage: "{n} Tage",
    leadNach:
      " sind kostenlos — Zahlungsdaten kannst du beim Einrichten auch überspringen und später nachtragen.",
    plaeneTitel: "Die drei Pläne",
    /* {n} = Testphasentage. */
    testMonat: "{n} Tage testen, danach monatliche Abrechnung im Voraus.",
    testJahr: "{n} Tage testen, danach jährliche Abrechnung im Voraus.",
    betriebAnlegen: "Betrieb anlegen",
    planHinweis: "Den Plan wählst du während der Einrichtung — wechseln geht dort jederzeit.",
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
    heute: "Heute",
    /* `ZeitWahl` */
    stunde: "Stunde",
    minute: "Minute",
    andereZeit: "Andere Zeit",
    uebernehmen: "Übernehmen",
    /* `ZahlStepper` — {label} = wofür gezählt wird. */
    einerWeniger: "{label}: einer weniger",
    einerMehr: "{label}: einer mehr",
  },

  /**
   * Beschriftungen von Schritt 1 (Konto anlegen) — Formularfelder,
   * Überschriften, Hinweisboxen, Fussnoten. Als Prop an die
   * Client-Inseln gereicht, nicht über den Kontext: der trägt nur
   * `formular` und `validierung` (CLAUDE.md, „Zweisprachigkeit").
   */
  registrierung: {
    metaTitel: "Konto anlegen",
    metaBeschreibung:
      "Leg dein QuickTeam-Konto an und bestätige deine E-Mail-Adresse mit einem Code — den Betrieb richtest du danach ein.",
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
    metaTitel: "Betrieb einrichten",
    metaBeschreibung:
      "Leg deinen Betrieb an: Name, Land, dein Name und die Zustimmung zu AGB und AVV.",
    speichernFehler:
      "Die Angaben liessen sich gerade nicht speichern. Versuch es gleich noch einmal — bleibt der Fehler, meld dich beim Support.",
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
      metaTitel: "Plan und Zahlung",
      metaBeschreibung:
        "Wähle deinen Plan und hinterlege ein Zahlungsmittel — dein Betrieb wird angelegt, sobald die Zahlung bestätigt ist.",
      planFehler:
        "Der gewählte Plan liess sich gerade nicht einrichten. Versuch es in einem Moment noch einmal — bleibt der Fehler, meld dich beim Support.",
      planMerkenFehler:
        "Der gewählte Plan liess sich gerade nicht übernehmen. Versuch es in einem Moment noch einmal.",
      titelMittel: "Zahlungsmittel hinterlegen",
      leadSofort:
        "Plan {plan}{preis}. Mit dem Hinterlegen beginnt dein Abo, und der erste Zeitraum wird abgebucht.",
      leadBezahlt:
        "Wähl deinen Plan und das Abrechnungsintervall. Danach hinterlegst du ein Zahlungsmittel; dein Betrieb wird angelegt, sobald die Zahlung bestätigt ist. Einen Rabattcode kannst du dabei eingeben.",
      planLabel: "Plan",
      knopfSofort: "Kostenpflichtig abonnieren",
      zurueckLink: "Zurück zur Plan-Auswahl",
      zurueckRest: ".",
      titelPlan: "Plan wählen",
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
      metaTitel: "Rollen und Team",
      metaBeschreibung:
        "Leg die Rollen deines Betriebs an und lade deine Mitarbeiter ein — beides in einem Schritt.",
      /* Meldungen der Server Actions von Schritt 3. */
      meldung: {
        keineRolle: "Es wurde keine Rolle angegeben.",
        rolleBelegt:
          "Diese Rolle wird bereits von einer Schichtvorlage gebraucht. Entfern sie zuerst dort.",
        rolleGesperrt:
          "Rollen lassen sich derzeit nicht entfernen — die Datenbank lässt das Löschen noch nicht zu. Das ist gemeldet. Deine Rollenzuweisungen sind unverändert.",
        rolleEntfernenFehler: "Die Rolle liess sich nicht entfernen. Versuch es noch einmal.",
        rollenAnlegenEinladung:
          "Die Rollen liessen sich nicht anlegen — deshalb wurde auch niemand eingeladen. Versuch es noch einmal.",
        /* {name} = Vor- und Nachname der bereits eingeladenen Person. */
        doppelt:
          "{name} ist mit genau diesen Angaben schon eingeladen. Für eine zweite Person unter derselben Adresse trag einen anderen Namen ein.",
        einladungFehler: "Die Einladung liess sich nicht anlegen. Versuch es noch einmal.",
        rollenZuweisungFehler:
          "Die Person ist angelegt, aber die Rollen konnten nicht zugewiesen werden. Setz sie unten in der Liste.",
        niemand: "Es wurde niemand angegeben.",
        entfernenFehler: "Die Einladung liess sich nicht entfernen. Versuch es noch einmal.",
        unvollstaendig: "Angaben unvollständig.",
        rolleAendernFehler: "Die Rolle liess sich nicht ändern. Versuch es noch einmal.",
        rollenAnlegenFehler: "Die Rollen liessen sich nicht anlegen. Versuch es noch einmal.",
      },
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
      metaTitel: "Schichtvorlagen",
      metaBeschreibung:
        "Leg fest, wie eine gewöhnliche Woche in deinem Betrieb aussieht — je Schicht mit Mindestbesetzung pro Rolle.",
      /* Meldungen der Server Actions von Schritt 4. */
      meldung: {
        /* {rolle} = Rollenname. */
        anzahlUngueltig: "Die Anzahl für „{rolle}“ ist keine gültige Zahl.",
        anzahlFeld: "Bitte eine Zahl von 0 bis 99.",
        keinBedarf:
          "Trag bei mindestens einer Rolle ein, wie viele Leute gebraucht werden — sonst taucht die Schicht in der App gar nicht auf.",
        anlegenFehler: "Die Vorlage liess sich nicht anlegen. Versuch es noch einmal.",
        bedarfFehler:
          "Die Mindestbesetzung liess sich nicht speichern, deshalb wurde die Vorlage nicht angelegt. Versuch es noch einmal.",
        keineVorlage: "Es wurde keine Vorlage angegeben.",
        entfernenFehler: "Die Vorlage liess sich nicht entfernen. Versuch es noch einmal.",
      },
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
      metaTitel: "Testphase abgelaufen",
      metaBeschreibung:
        "Deine Testphase ist vorbei. Hinterleg ein Zahlungsmittel, dann läuft dein Betrieb weiter — deine Daten bleiben bis zu 90 Tage erhalten.",
      eyebrow: "Testphase",
      titel: "Deine Testphase ist abgelaufen",
      text: "Die {tage} Tage sind vorbei, und es ist kein Zahlungsmittel hinterlegt. Dein Betrieb, dein Team und deine Schichtvorlagen bleiben bis 90 Tage nach Ende der Testphase gespeichert, danach werden sie gelöscht (AGB § 5 Abs. 3). Sobald du eine Zahlungsmethode hinterlegst, läuft dein Plan {plan} weiter, wo er aufgehört hat.",
      knopfFortsetzen: "Kostenpflichtig fortsetzen",
      keinNeues: "Es entsteht kein neues Abonnement — dein bestehendes wird fortgesetzt.",
      aboVerwalten: "Abo verwalten oder kündigen",
      datenExport: "Daten exportieren",
    },
    /* `StoreBadges` — Platzhalter, solange die App nicht in den Stores ist. */
    stores: {
      geraetIos: "iPhone und iPad",
      geraetAndroid: "Android",
      bald: "bald verfügbar",
      text: "Die App ist noch nicht in den Stores. Sobald sie da ist, findest du hier die Links und einen QR-Code zum Abscannen. Warten musst du darauf nicht — im Dashboard steht dir schon alles offen.",
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

  /** `/dashboard/zustimmung` samt Hinweisstreifen (`ZustimmungHinweis`). */
  zustimmungSeite: {
    metaTitel: "Zustimmung erforderlich",
    metaBeschreibung:
      "Bestätige AGB, Auftragsverarbeitungsvereinbarung und Datenschutzerklärung, um mit dem Dashboard weiterzuarbeiten.",
    pruefungKicker: "Prüfung fehlgeschlagen",
    pruefungTitel: "Das ließ sich gerade nicht prüfen",
    /* Sätze um den hervorgehobenen Betriebsnamen herum. */
    pruefungVor: "Ob für ",
    pruefungNach:
      " eine Zustimmung vorliegt, konnten wir gerade nicht abfragen — das liegt an uns, nicht an dir. Versuch es gleich noch einmal. Bleibt der Fehler, meld dich beim Support; dein Zugang besteht weiter.",
    erneut: "Erneut versuchen",
    titelAenderung: "Neue Fassung — bitte einmal ansehen",
    titelErst: "Kurz bestätigen, dann geht's weiter",
    aenderungVor: "Für ",
    aenderungNach:
      " gibt es eine neue Fassung der Vertragsunterlagen. Bis du zustimmst, gelten die bisherigen Bedingungen weiter — du kannst also auch später entscheiden.",
    erstVor: "Für ",
    erstNach:
      " liegt uns noch keine Zustimmung vor. Das holen wir einmal nach — danach landest du wieder dort, wo du hinwolltest.",
    fussnote:
      "Du bestätigst für den Betrieb, nicht für dich persönlich. An deinem Tarif, deiner Abrechnung und deinem Zahlungsmittel ändert sich dadurch nichts.",
    spaeter: "Später entscheiden und weiterarbeiten",
    aboVerwalten: "Abo verwalten oder kündigen",
    datenExport: "Daten exportieren",
    dokument: { agb: "AGB", avv: "AVV", datenschutz: "Datenschutz" },
    zustimmen: "Zustimmen und weiter",
    laufend: "Wird gespeichert …",
    speichernFehler:
      "Die Zustimmung liess sich gerade nicht speichern. Versuch es gleich noch einmal — bleibt der Fehler, meld dich beim Support.",
    hinweis:
      "Es gibt eine neue Fassung der Vertragsunterlagen. Bis du zustimmst, gelten die bisherigen Bedingungen weiter.",
    hinweisLink: "Ansehen",
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
    /* Meldungen der Server Actions rund um den Code. */
    nichtBestaetigt: "Der Code liess sich nicht bestätigen. Fordere einen neuen an.",
    neuUnterwegs: "Ein neuer Code ist unterwegs. Schau auch im Spam-Ordner nach.",
    ohneEmail:
      "Ohne E-Mail-Adresse lässt sich nichts erneut verschicken. Geh zurück zur Registrierung.",
  },

  /* sr-only-Beschriftungen des Sprachumschalters (`SprachWahl`). */
  sprachWahl: {
    gruppe: "Sprache",
    aktuell: " — aktuelle Sprache",
    zuDe: " — auf Deutsch wechseln",
    zuEn: " — auf Englisch wechseln",
    zuSq: " — auf Albanisch wechseln",
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
    metaTitel: "Anmelden",
    metaBeschreibung:
      "Melde dich mit deiner E-Mail-Adresse und deinem Passwort an. Danach landest du direkt in der Planung deines Betriebs.",
    /* Banner über den Auth-Formularen, wenn schon eine Sitzung besteht. */
    angemeldetAls: "Angemeldet als",
    zurPlanung: "Zur Planung",
    abmelden: "Abmelden",
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

  /** `/dashboard/verfuegbarkeit` — eigene Wünsche, Team-Übersicht, Aktionen. */
  verfuegbarkeit: {
    metaTitel: "Verfügbarkeit",
    metaBeschreibung: "Schichtwünsche festlegen bzw. die Wünsche des Teams im Überblick.",
    titel: "Verfügbarkeit",
    leadChef: "Die Schichtwünsche deines Teams im Überblick.",
    lead: "Je mehr Wünsche du angibst, desto unwahrscheinlicher wird jeder einzelne erfüllt. Tageswünsche überschreiben Vorlagen-Wünsche.",
    wiederkehrend: "Wiederkehrende Wünsche",
    wiederkehrendText: "Gilt für jedes Vorkommen dieses Wochentags.",
    tagWunsch: "Wunsch für einen bestimmten Tag",
    tagWunschText: "Wähle ein Datum, dann deinen Wunsch je Schicht — auf Wunsch mit Notiz.",
    spezielleTage: "Spezielle Tage",
    /* Ersatz für fehlende Bezeichnung / fehlenden Namen. */
    schicht: "Schicht",
    ohneNamen: "Ohne Namen",
    gerneIch: "Arbeite gerne",
    ungerneIch: "Arbeite ungerne",
    gerne: "Gerne",
    ungerne: "Ungerne",
    speichern: "Änderungen speichern",
    speichertLaufend: "Speichert …",
    keineVorlagen: "Keine Schichtvorlagen für deine Rollen.",
    /* {n} = Anzahl Änderungen. */
    aenderungEins: "{n} Änderung noch nicht gespeichert",
    aenderungMehr: "{n} Änderungen noch nicht gespeichert",
    verwerfen: "Verwerfen",
    notizBearbeiten: "Notiz bearbeiten",
    notizHinzufuegen: "Notiz hinzufügen",
    notizLabel: "Notiz für die Betriebsleitung",
    notizHinweis: "Optional. Sichtbar für die Betriebsleitung. Leer lassen entfernt die Notiz.",
    abbrechen: "Abbrechen",
    notizSpeichern: "Notiz speichern",
    datum: "Datum",
    tagWaehlen: "Tag wählen",
    keineSchichtTag: "Keine Schichten für deine Rolle an diesem Tag.",
    notizOptional: "Notiz für die Betriebsleitung (optional)",
    notizZuLang: "Bitte die Eingaben prüfen — eine Notiz ist zu lang.",
    keineTage: "Noch keine speziellen Tage.",
    wunschLoeschen: "Wunsch löschen",
    /* Team-Übersicht (Chef) */
    gruppierungAria: "Gruppierung",
    gruppiertNach: "Gruppiert nach",
    nachTag: "Tag",
    nachPerson: "Person",
    teamWiederkehrendText: "Gelten für jedes Vorkommen des Wochentags.",
    teamTage: "Wünsche für einzelne Tage",
    teamTageText: "Kommende Tage, mit Notizen. Überschreiben die wiederkehrenden.",
    keineWiederkehrenden: "Noch keine wiederkehrenden Wünsche.",
    keineKommenden: "Keine Wünsche für kommende Tage.",
    /* Server Actions */
    nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
    gespeichert: "Gespeichert.",
    wunschWeg: "Diesen Wunsch gibt es nicht mehr.",
    notizGespeichert: "Notiz gespeichert.",
    notizEntfernt: "Notiz entfernt.",
  },

  /** `/dashboard/team` — Rollen, Team-Liste, Einladen, Anstellung, Aktionen. */
  teamVerwaltung: {
    metaTitel: "Team",
    metaBeschreibung: "Mitarbeiter einladen, Rollen vergeben, Status pflegen.",
    titel: "Team und Rollen",
    lead: "Wer bei dir arbeitet, wofür er eingeteilt werden kann und wer gerade pausiert.",
    status: {
      eingeladen: "Eingeladen",
      aktiv: "Aktiv",
      pausiert: "Pausiert",
      inaktiv: "Inaktiv",
    },
    statusErklaerung: {
      eingeladen: "Hat die Einladung noch nicht angenommen.",
      pausiert: "Vorübergehend nicht einplanbar, bleibt im Team.",
      inaktiv: "Arbeitet nicht mehr hier.",
      aktiv: "Wird ganz normal eingeplant.",
    },
    /* Rollen-Abschnitt */
    rollen: "Rollen",
    rollenText:
      "Womit wird bei dir gearbeitet? Rollen entscheiden, wer für welche Schicht in Frage kommt — und welche Mindestbesetzung eine Vorlage verlangt.",
    neueRolle: "Neue Rolle",
    hinzufuegen: "Hinzufügen",
    ausblenden: "Ausblenden",
    entfernen: "Entfernen",
    entfernenGesperrtTitel: "Die Datenbank lässt das Löschen von Rollen zurzeit nicht zu.",
    entfernenGesperrt: "Entfernen gesperrt",
    keineRolle: "Noch keine Rolle angelegt.",
    gesperrtVor:
      "Das Entfernen ist abgeblendet, weil die Datenbank das Löschen von Rollen zurzeit nicht zulässt — das ist gemeldet. ",
    gesperrtAusblenden: "Ausblenden",
    gesperrtNach: " wirkt weiterhin: die Rolle wird nicht mehr vergeben, hält ihren Namen aber besetzt.",
    ausgeblendet: "Ausgeblendet",
    ausgeblendetText:
      "Diese Rollen werden nicht mehr vergeben, halten ihren Namen aber weiter besetzt — eine neue Rolle kann nicht so heissen.",
    einblenden: "Wieder einblenden",
    /* Team-Liste */
    team: "Team",
    alleinDa: "Ausser dir ist noch niemand hier.",
    /* {n} = Anzahl Personen. */
    anzahl: "{n} Personen, dich eingerechnet.",
    du: " · du",
    keinKontakt: "Kein Kontakt hinterlegt",
    rolleFallback: "Rolle",
    ohneRolle: "Keine Rolle",
    schliessen: "Schliessen",
    verwalten: "Verwalten",
    keineZuweisbar: "Es gibt noch keine Rolle, die sich zuweisen liesse.",
    anstellung: "Anstellung",
    anstellungSpeichern: "Anstellung speichern",
    statusTitel: "Status",
    leitungStatus:
      "Der Status der Betriebsleitung lässt sich hier nicht ändern — sonst könnte ein Betrieb ohne aktive Leitung zurückbleiben und wäre für alle verschlossen.",
    zuruecknehmen: "Einladung zurücknehmen",
    zuruecknehmenText:
      "Löscht den Eintrag ganz. Möglich, solange die Einladung nicht angenommen wurde.",
    dsgvo: "Daten löschen (DSGVO)",
    dsgvoText:
      "Name, E-Mail-Adresse und die Verknüpfung zur Anmeldung werden überschrieben. Die Person wird auf inaktiv gesetzt. Vergangene Dienstpläne bleiben erhalten, aber ohne Namen — ",
    nichtRueckgaengig: "das lässt sich nicht rückgängig machen.",
    dsgvoBestaetigen: "Ja, die Daten dieser Person endgültig löschen.",
    endgueltigLoeschen: "Endgültig löschen",
    leitung: "Leitung",
    /* Einladen */
    einladenTitel: "Jemanden einladen",
    einladenText:
      "E-Mail-Adresse oder Telefonnummer genügt — darüber findet die Person ihre Einladung, wenn sie sich anmeldet.",
    vorname: "Vorname",
    nachname: "Nachname",
    email: "E-Mail",
    telefon: "Telefon",
    telefonHinweis: "International mit + und Ländervorwahl, sonst kommt die Einladung nicht an.",
    anstellungOptional: "Anstellungsdaten (optional)",
    anstellungSpaeter: "Alles hier lässt sich auch später im Profil nachtragen.",
    einladen: "Einladen",
    /* Anstellungsfelder */
    vertragsart: "Vertragsart",
    keineAngabe: "Keine Angabe",
    sollstunden: "Sollstunden pro Woche",
    sollstundenHinweis:
      "Gespeichert wird der Monatswert (× 4,33). 40 Std./Woche → 173 Std./Monat. Leer lassen, wenn kein Soll vereinbart ist.",
    toleranz: "Überstunden-Toleranz (Stunden)",
    toleranzHinweis:
      "Freibetrag für die automatische Planung: bis hierher bleiben Überstunden folgenlos. Darüber wird die Person seltener eingeteilt. Verhindert wird dadurch nichts.",
    saldo: "Überstunden-Anfangssaldo (Stunden)",
    saldoHinweis:
      "Übertrag aus der Zeit vor QuickTeam — nicht der aktuelle Stand. Den rechnet QuickTeam laufend selbst aus. Minusstunden als negative Zahl.",
    urlaub: "Urlaubsanspruch (Tage pro Jahr)",
    urlaubHinweis:
      "Gezählt werden Kalendertage, nicht Arbeitstage — Wochenenden zählen mit. Offene Anträge belegen das Kontingent bereits.",
    /* Server Actions */
    nurChef: "Nur die Betriebsleitung darf das Team verwalten.",
    rollennameFalsch: "Der Rollenname passt nicht.",
    /* {name} = Rollenname. */
    rolleDoppelt: "Die Rolle „{name}“ gibt es schon.",
    rolleAusgeblendetDoppelt:
      "Den Namen „{name}“ trägt eine ausgeblendete Rolle. Blend sie wieder ein, statt eine zweite anzulegen.",
    nameDoppeltFeld: "Diesen Namen gibt es schon.",
    rolleAnlegenFehler: "Die Rolle liess sich nicht anlegen. Versuch es noch einmal.",
    keineRolleAngegeben: "Es wurde keine Rolle angegeben.",
    rolleBelegt:
      "Diese Rolle hängt noch an einer Schichtvorlage oder an geplanten Schichten. Entfern sie zuerst dort.",
    rolleGesperrt:
      "Rollen lassen sich derzeit nicht entfernen — die Datenbank lässt das Löschen noch nicht zu. Das ist gemeldet. Deine Rollenzuweisungen sind unverändert.",
    rolleEntfernenFehler: "Die Rolle liess sich nicht entfernen. Versuch es noch einmal.",
    nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
    rolleWeg: "Diese Rolle gibt es nicht mehr. Lad die Seite neu.",
    niemand: "Es wurde niemand angegeben.",
    eingabenFalsch: "Die Eingaben stimmen so nicht.",
    rlsFehler:
      "Gespeichert wurde nichts — entweder gibt es diese Person nicht mehr, oder die Berechtigung fehlt inzwischen. Lad die Seite neu.",
    anstellungFehler: "Die Anstellungsdaten liessen sich nicht speichern. Versuch es noch einmal.",
    gespeichert: "Gespeichert.",
    /* {name} = Vor- und Nachname. */
    doppelt:
      "{name} ist mit genau diesen Angaben schon im Team. Für eine zweite Person unter derselben Adresse trag einen anderen Namen ein.",
    einladungFehler: "Die Einladung liess sich nicht anlegen. Versuch es noch einmal.",
    rollenZuweisungFehler:
      "Die Person ist angelegt, aber die Rollen konnten nicht zugewiesen werden. Setz sie in der Liste.",
    angabeFehlt: "Angabe fehlt.",
    zuweisenFehler: "Die Rolle liess sich nicht zuweisen. Versuch es noch einmal.",
    abnehmenFehler:
      "Die Rolle liess sich nicht entfernen — vermutlich ist die Person damit schon zu einer Schicht eingeteilt.",
    statusNichtSetzbar: "Dieser Status lässt sich nicht setzen.",
    nichtImBetrieb: "Diese Person gehört nicht zu deinem Betrieb.",
    leitungStatusFehler:
      "Der Status der Betriebsleitung lässt sich hier nicht ändern. Sonst könnte ein Betrieb ohne aktive Leitung zurückbleiben — und damit für alle verschlossen sein.",
    statusFehler: "Der Status liess sich nicht ändern. Versuch es noch einmal.",
    personWeg: "Diese Person gibt es nicht mehr. Lad die Seite neu.",
    schonImTeam: "Diese Person ist bereits im Team. Setz sie auf inaktiv oder anonymisiere sie.",
    zuruecknehmenFehler: "Die Einladung liess sich nicht zurücknehmen.",
    haekchen: "Setz das Häkchen, wenn du das wirklich willst.",
    selbstNicht: "Dich selbst kannst du hier nicht anonymisieren.",
    leitungAnon: "Mitglieder der Betriebsleitung lassen sich hier nicht anonymisieren.",
  },

  /** `/dashboard/tausch` — Angebot, Liste, Entscheidungen, Aktionen. */
  tausch: {
    metaTitel: "Tausch",
    metaBeschreibung: "Eigene Schichten zum Tausch anbieten und auf Angebote reagieren.",
    titel: "Tausch",
    leadChef: "Eigene Schichten anbieten, auf Angebote reagieren, Freigaben erteilen.",
    lead: "Eigene Schichten anbieten, auf Angebote reagieren.",
    anbieten: "Schicht anbieten",
    keineSchicht: "Du hast in den nächsten 60 Tagen keine anstehende Schicht, die du anbieten könntest.",
    gesendet: "Angebot gesendet.",
    fehlerFallback: "Das hat nicht geklappt.",
    welcheSchicht: "Welche Schicht?",
    bitteWaehlen: "Bitte wählen",
    wunschtage: "Wunschtage (optional, bis zu drei)",
    wunschtageText:
      "Tage, an denen du stattdessen arbeiten möchtest. Ohne Angabe zählt der ganze Monat der angebotenen Schicht.",
    /* {tag} = formatierter Tag. */
    tagEntfernen: "{tag} entfernen",
    tagHinzufuegen: "Tag hinzufügen",
    senden: "Angebot senden",
    sendenLaufend: "Wird gesendet…",
    status: {
      offen: "Offen",
      angefragt: "Angefragt",
      wartet_auf_chef: "Wartet auf Freigabe",
      bestaetigt: "Bestätigt",
      abgelehnt_chef: "Abgelehnt",
      abgelehnt_system: "Nicht möglich",
      zurueckgezogen: "Zurückgezogen",
    },
    keineAnfragen: "Gerade keine offenen Tauschanfragen.",
    schichttausch: "Schichttausch",
    bietetAn: "Bietet an",
    /* {tage} = Liste formatierter Tage. */
    wunschtageListe: "Wunschtage: {tage}",
    dagegen: "Dagegen",
    /* {name} = anbietende Person. */
    wartetAnbieter: "Wartet auf Bestätigung durch {name}.",
    wartetChef: "Wartet auf Freigabe durch die Betriebsleitung.",
    deinAngebot: "Dein Angebot — noch niemand hat geantwortet.",
    zurueckziehen: "Zurückziehen",
    ungueltig: "Dieses Angebot ist nicht mehr gültig.",
    welcheDeiner: "Welche deiner Schichten bietest du dafür an?",
    annehmenFrage: "Jemand bietet eine Schicht dafür an — annehmen?",
    bestaetigen: "Bestätigen",
    ablehnen: "Ablehnen",
    freigabeNoetig: "Freigabe erforderlich.",
    genehmigen: "Genehmigen",
    /* Server Actions */
    anlegenFehler: "Das Angebot liess sich nicht anlegen. Versuch es noch einmal.",
    niemandPasst:
      "Dafür gibt es aktuell niemanden, der passt — weder die Rolle noch ein freier Tag treffen sich mit jemandem im Team.",
    ungueltigNeuLaden: "Dieses Angebot ist nicht mehr gültig. Lad die Seite neu.",
    eigeneWaehlen: "Wähl eine eigene Schicht, die du dafür anbietest.",
    nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
    anfrageWeg: "Diese Anfrage gibt es nicht mehr.",
    nurChef: "Nur die Betriebsleitung darf über Tauschanfragen entscheiden.",
    code: {
      bereits_besetzt: "Dieses Angebot ist schon vergeben.",
      nicht_moeglich: "Diese Schicht gibt es nicht mehr.",
      eigene_schicht: "Das ist deine eigene Schicht.",
      gegen_ungueltig: "Diese Schicht gehört dir nicht (mehr).",
      nicht_qualifiziert: "Dir fehlt die erforderliche Rolle.",
      anbieter_nicht_qualifiziert:
        "Die anbietende Person hat für deine Schicht nicht die passende Rolle.",
      schon_zugewiesen: "Eine der beiden Personen ist für den jeweils anderen Tag schon eingeteilt.",
      gegen_vergangen: "Diese Schicht liegt in der Vergangenheit.",
      nicht_wunschtag: "Dieser Tag passt nicht zu den Wunschtagen der anbietenden Person.",
      schon_belegt: "Du arbeitest an diesem Tag schon.",
      anbieter_belegt: "Die anbietende Person arbeitet an diesem Tag schon.",
    },
  },

  /** `/dashboard/schicht/[id]` — Detailseite, Besetzung, Formulare, Aktionen. */
  schicht: {
    metaTitel: "Schicht",
    metaBeschreibung: "Eine Schicht im Detail: Zeiten, Besetzung, Notizen.",
    zurueck: "Zurück zum Kalender",
    schicht: "Schicht",
    ueberMitternacht: " (über Mitternacht)",
    merkerEntwurf: "Entwurf",
    merkerMein: "Du bist eingeteilt",
    merkerAbgemeldet: "Abgemeldet",
    merkerOffen: "Frei zu übernehmen",
    merkerTausch: "Tausch gesucht",
    merkerUnterbesetzt: "Unterbesetzt",
    entwurfText:
      "Diese Schicht ist ein Entwurf und für das Team noch nicht sichtbar. Sie wird es erst, wenn der Plan veröffentlicht ist.",
    ausgeschrieben: "Diese Schicht ist ausgeschrieben",
    ausgeschriebenText:
      "Du hast die passende Rolle. Wer zuerst übernimmt, ist eingeteilt — eine Bestätigung durch die Betriebsleitung gibt es nicht.",
    zeitenTitel: "Zeiten und Kommentar",
    hinweisTitel: "Hinweis zur Schicht",
    besetzung: "Besetzung",
    gefahrenzone: "Gefahrenzone",
    niemandChef: "Für diese Schicht ist noch niemand eingeteilt.",
    niemandSonst:
      "Hier steht niemand — entweder ist noch niemand eingeteilt, oder dein Betrieb zeigt die Namen der anderen nicht an.",
    du: " (du)",
    faelltAus: "fällt aus",
    mindestbesetzung: "Mindestbesetzung",
    keinBedarf:
      "Für diese Schicht ist keine Mindestbesetzung hinterlegt — üblich bei Schichten, die von Hand angelegt und direkt besetzt wurden. Sie ist normal sichtbar; es fehlt nur der Sollwert, gegen den sich eine Unterbesetzung feststellen liesse.",
    ohneRolle: "Ohne Rolle",
    wuensche: "Wünsche für diesen Tag",
    gerne: "Arbeitet gerne",
    ungerne: "Arbeitet ungerne",
    notizen: "Notizen",
    vonDir: "von dir",
    /* {name} = Autor der Notiz. */
    vonName: "von {name}",
    vonJemandem: "von jemandem im Team",
    /* Besetzung bearbeiten */
    /* {name} = Person. */
    entfernenAria: "{name} von der Schicht entfernen",
    hinzufuegen: "Person hinzufügen",
    suchen: "Name suchen",
    suchenAria: "Person suchen",
    alleRollen: "Alle Rollen",
    niemandGefunden: "Niemand zum Hinzufügen gefunden.",
    /* Felder bearbeiten */
    datum: "Datum",
    start: "Start",
    ende: "Ende",
    speichern: "Speichern",
    speichertLaufend: "Speichert …",
    loeschen: "Schicht löschen",
    loeschenText:
      "Diese Schicht wird endgültig gelöscht — mit allen, die dafür eingeteilt sind. ",
    nichtRueckgaengig: "Das lässt sich nicht rückgängig machen.",
    loeschenBestaetigen: "Ja, diese Schicht löschen.",
    loeschenKnopf: "Löschen",
    abbrechen: "Abbrechen",
    /* Server Actions — Übersetzung der Trigger-Ausnahmen (`HC-1`…`HC-5`). */
    fehler: {
      urlaub: "Diese Person hat an diesem Tag genehmigten Urlaub.",
      ueberlappend: "Diese Person ist an diesem Tag schon für eine andere Schicht eingeteilt.",
      ruhezeit: "Das unterschreitet die gesetzliche Mindestruhezeit dieser Person.",
      tag: "Das überschreitet die gesetzliche Tageshöchstarbeitszeit dieser Person.",
      woche: "Das überschreitet die Wochenhöchstarbeitszeit dieser Person.",
      monat: "Das überschreitet die vereinbarte monatliche Stundenobergrenze dieser Person.",
      qualifikation: "Diese Person ist für diese Rolle nicht qualifiziert.",
      deaktiviert: "Diese Person ist deaktiviert und kann nicht eingeteilt werden.",
      berechtigung: "Dafür fehlt dir die Berechtigung.",
      weg: "Diese Schicht gibt es nicht mehr.",
      nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
      gleich: "Start und Ende dürfen nicht gleich sein.",
      loeschen: "Die Schicht liess sich nicht löschen. Versuch es noch einmal.",
    },
    gespeichert: "Gespeichert.",
  },

  /** `/dashboard/planung` — Zeiträume, Solver-Lauf, Freigabe, Aktionen. */
  planung: {
    metaTitel: "Planung",
    metaBeschreibung: "Planungszeiträume anlegen und den Stand der Dienstpläne verfolgen.",
    titel: "Planung",
    lead: "Für welchen Zeitraum soll geplant werden? Aus deinen Schichtvorlagen entstehen darin die konkreten Dienste.",
    ohneVorlagen:
      "Du hast noch keine Schichtvorlage mit Mindestbesetzung. Ohne sie bleibt ein Zeitraum leer — aus einer Vorlage ohne Rollenbedarf entsteht keine Schicht, und in der App wäre sie ohnehin unsichtbar. Anlegen kannst du den Zeitraum trotzdem schon.",
    angelegt: "Angelegte Zeiträume",
    fuss: "Verteilt werden die Schichten von einem Rechenverfahren, das Urlaube, Ruhezeiten, gesetzliche Höchstarbeitszeiten und die Wünsche deines Teams berücksichtigt. Es schlägt vor — freigegeben wird von dir.",
    status: {
      offen: "Offen",
      deadline_erreicht: "Frist abgelaufen",
      solver_laeuft: "Wird geplant",
      vorschlag_bereit: "Vorschlag liegt vor",
      veroeffentlicht: "Veröffentlicht",
    },
    erklaerung: {
      offen: "Dein Team kann noch Wünsche und Verfügbarkeiten eintragen.",
      deadline_erreicht: "Die Frist ist vorbei, geplant wurde noch nicht.",
      solver_laeuft: "Die Schichtverteilung wird gerade berechnet.",
      vorschlag_bereit: "Ein Vorschlag steht — noch nicht für das Team sichtbar.",
      veroeffentlicht: "Der Plan ist freigegeben und für alle sichtbar.",
    },
    /* Formular */
    neuerZeitraum: "Neuer Zeitraum",
    neuerZeitraumText:
      "Der Rahmen, für den geplant wird — üblicherweise ein Monat. Die Schichten entstehen daraus erst im nächsten Schritt.",
    beginn: "Beginn",
    ende: "Ende",
    frist: "Frist für Wünsche",
    optional: "(optional)",
    keineFrist: "Keine Frist",
    fristHinweis:
      "Bis dahin kann dein Team Verfügbarkeiten und Wünsche eintragen. Ohne Angabe gilt der Beginn des Zeitraums.",
    trotzUeberschneidung:
      "Ja, den Zeitraum trotz Überschneidung anlegen. Mir ist klar, dass für die gemeinsamen Tage doppelt Schichten entstehen können.",
    trotzFrist:
      "Ja, jetzt schon planen. Wünsche, die nach dem Absenden noch eingehen, fliessen in diesen Plan nicht mehr ein.",
    anlegen: "Zeitraum anlegen",
    erinnern: "Erinnerung: Vorlieben eintragen",
    /* Liste */
    keinZeitraum: "Noch kein Zeitraum angelegt. Fang mit dem nächsten Monat an.",
    haengtListe: "Der Lauf steht seit über zehn Minuten — vermutlich abgebrochen.",
    /* {n} = Anzahl offener Stellen. */
    unbesetztEins:
      "{n} Stelle blieb unbesetzt — es gab niemanden, der ohne Regelverstoss einspringen konnte.",
    unbesetztMehr:
      "{n} Stellen blieben unbesetzt — es gab niemanden, der ohne Regelverstoss einspringen konnte.",
    alleBesetzt: "Alle Stellen besetzt.",
    solverFehler: "Beim letzten Planungslauf ist etwas schiefgegangen:",
    entfernen: "Zeitraum entfernen",
    entfernenHinweis: "Solange keine Schichten daran hängen.",
    vorschlagEins: "Ein Vorschlag wartet auf dich",
    /* {n} = Anzahl Vorschläge. */
    vorschlagMehr: "{n} Vorschläge warten auf dich",
    vorschlagText:
      "Die Schichten stehen, sind aber für dein Team noch unsichtbar. Sieh sie dir im Kalender an — Entwürfe sind dort gestrichelt umrandet.",
    vorschlagAlle:
      " Freigeben und Verwerfen gelten für alle Vorschläge zugleich, nicht für einen einzelnen Zeitraum.",
    freigeben: "Plan freigeben",
    stattdessenVerwerfen: "Stattdessen verwerfen",
    verwerfenText:
      "Die geplanten Schichten werden gelöscht — und mit ihnen der Zeitraum, in dem sie entstanden sind. Zum Neuplanen legst du ihn wieder an. ",
    nichtRueckgaengig: "Das lässt sich nicht rückgängig machen.",
    verwerfenBestaetigen: "Ja, den Vorschlag verwerfen.",
    verwerfen: "Verwerfen",
    /* Solver-Lauf */
    sitzungAbgelaufen: "Deine Sitzung ist abgelaufen. Lad die Seite neu.",
    schonErgebnis: "Für diesen Zeitraum liegt schon ein Ergebnis vor. Lad die Seite neu.",
    keineBerechtigung: "Dafür fehlt dir die Berechtigung.",
    /* {text} = Fehlermeldung der Edge Function, {status} = HTTP-Status. */
    gescheitert: "Die Planung ist gescheitert: {text}",
    fehlerStatus: "Fehler {status}",
    verbindungWeg:
      "Die Verbindung ist abgerissen. Der Lauf kann trotzdem durchgelaufen sein — lad die Seite neu.",
    laeuft:
      "Die Schichten werden gerade verteilt. Das kann ein paar Minuten dauern — du kannst die Seite ruhig verlassen.",
    gesperrt:
      "Ein Planungslauf wurde gerade angestossen. Der Knopf ist ein paar Sekunden gesperrt, damit nicht versehentlich zweimal gerechnet wird.",
    haengt:
      "Dieser Lauf steht seit über zehn Minuten auf „wird geplant“. Vermutlich ist er abgebrochen, ohne das melden zu können. Ein neuer Lauf verwirft die bisherigen Vorschläge dieses Zeitraums und rechnet neu; von Hand gesetzte Zuweisungen bleiben unberührt.",
    wirdGestartet: "Wird gestartet …",
    neuBerechnen: "Neu berechnen",
    verteilen: "Schichten verteilen",
    /* Sollstunden-Hinweis */
    ohneSollEins: "Ein Mitarbeitender ohne Sollstunden:",
    /* {n} = Anzahl Personen. */
    ohneSollMehr: "{n} Mitarbeitende ohne Sollstunden:",
    eingeladen: " (eingeladen)",
    ohneSollTextEins: "Diese Person wird",
    ohneSollTextMehr: "Sie werden",
    ohneSollText:
      " trotzdem eingeplant, aber ohne Ziel für eine gleichmässige Verteilung — sobald ein Abrechnungsstichtag gesetzt ist, kann das ihre Überstunden verfälschen. Bitte ",
    imProfil: "im Profil ergänzen",
    ohneSollEnde: ".",
    /* Server Actions */
    nurChefAnlegen: "Nur die Betriebsleitung darf Zeiträume anlegen.",
    beginnFehlt: "Der Beginn fehlt oder ist ungültig.",
    endeFehlt: "Das Ende fehlt oder ist ungültig.",
    datumPruefen: "Datum prüfen.",
    endeNachBeginn: "Das Ende muss nach dem Beginn liegen.",
    endeNachBeginnFeld: "Muss nach dem Beginn liegen.",
    fristUngueltig: "Die Frist ist kein gültiges Datum.",
    fristNachBeginn:
      "Die Frist liegt nach dem Beginn des Zeitraums. Bis dahin müsste der Plan längst stehen.",
    fristNachBeginnFeld: "Sollte vor dem Beginn liegen.",
    /* {von}/{bis} = formatierte Daten. */
    warnungUeberschneidung:
      "Es gibt schon einen Zeitraum von {von} bis {bis}. Zwei Pläne für dieselben Tage erzeugen Schichten doppelt.",
    /* {datum} = formatiertes Datum. */
    warnungFrist:
      "Die Frist für Wünsche läuft erst am {datum} ab. Wer bis dahin noch Verfügbarkeiten oder Schichtvorlieben einträgt, wird in diesem Plan nicht mehr berücksichtigt.",
    haekchen: "Setz das Häkchen, wenn du es trotzdem willst.",
    anlegenFehler: "Der Zeitraum liess sich nicht anlegen. Versuch es noch einmal.",
    nurChefErinnern: "Nur die Betriebsleitung darf erinnern.",
    /* Die Ankündigung selbst — wörtlich aus `prefReminderTitle/Body` der App. */
    erinnerungTitel: "Bitte Schichtvorlieben eintragen",
    erinnerungText:
      "Der neue Dienstplan wird geplant. Bitte trage deine Schichtvorlieben vor der Deadline ein.",
    erinnerungFehler: "Erinnerung konnte nicht gesendet werden.",
    erinnerungGesendet: "Erinnerung an alle Mitarbeiter gesendet.",
    nurChefEntfernen: "Nur die Betriebsleitung darf Zeiträume entfernen.",
    keinZeitraumAngegeben: "Es wurde kein Zeitraum angegeben.",
    haengenSchichten:
      "An diesem Zeitraum hängen bereits Schichten. Verwirf zuerst den Plan, dann lässt er sich entfernen.",
    zeitraumWeg: "Diesen Zeitraum gibt es nicht mehr. Lad die Seite neu.",
    nurChefFreigeben: "Nur die Betriebsleitung darf Pläne freigeben.",
    freigebenFehler: "Der Plan liess sich nicht freigeben. Versuch es noch einmal.",
    nichtsFrei: "Es gab nichts freizugeben.",
    /* {n} = Anzahl Schichten. */
    freiEins: "{n} Schicht ist jetzt für dein Team sichtbar.",
    freiMehr: "{n} Schichten sind jetzt für dein Team sichtbar.",
    nurChefVerwerfen: "Nur die Betriebsleitung darf Pläne verwerfen.",
    verwerfenHaekchen: "Setz das Häkchen, wenn du den Vorschlag wirklich verwerfen willst.",
    verwerfenFehler: "Der Vorschlag liess sich nicht verwerfen. Versuch es noch einmal.",
    verworfenEins: "{n} geplante Schicht wurde verworfen. Der Zeitraum ist mit entfernt worden.",
    verworfenMehr:
      "{n} geplante Schichten wurden verworfen. Der Zeitraum ist mit entfernt worden.",
  },

  /** `/dashboard/notfall` — Meldung, Chef-Liste, offene Vertretungen. */
  notfall: {
    metaTitel: "Notfall",
    metaBeschreibung: "Notfälle melden, Vertretungen ausschreiben und übernehmen.",
    titel: "Notfall",
    lead: "Eigene Schichten als Notfall melden, Vertretungen ausschreiben und übernehmen.",
    melden: "Notfall melden",
    meldenLaufend: "Wird gemeldet…",
    keineSchicht: "Du hast keine anstehende Schicht, die du als Notfall melden könntest.",
    meldenText:
      "Du wirst sofort aus dieser Schicht ausgetragen. Die Betriebsleitung entscheidet, ob eine Vertretung ausgeschrieben wird.",
    gemeldet: "Gemeldet.",
    welcheSchicht: "Welche Schicht?",
    bitteWaehlen: "Bitte wählen",
    grund: "Grund (optional)",
    grundHinweis:
      "Kurz und ohne Angaben zu deiner Gesundheit. Lesen können ihn die Betriebsleitung und wer deine Schicht übernimmt.",
    fehlerFallback: "Das hat nicht geklappt.",
    status: {
      gemeldet: "Gemeldet",
      vertretung_gesucht: "Vertretung wird gesucht",
      besetzt: "Vertretung gefunden",
      storniert: "Zurückgezogen",
    },
    deineMeldungen: "Deine Meldungen",
    offeneNotfaelle: "Offene Notfälle",
    ausschreiben: "Vertretung ausschreiben",
    wirdGesucht: "Vertretung wird gesucht.",
    offeneVertretungen: "Offene Vertretungen",
    keineVertretungen: "Gerade keine ausgeschriebenen Vertretungen für deine Rollen.",
    uebernehmen: "Übernehmen",
    /* Meldungen der Server Actions. */
    meldenFehler: "Das hat nicht geklappt — lad die Seite neu und versuch es noch einmal.",
    nurChef: "Nur die Betriebsleitung darf eine Vertretung ausschreiben.",
    notfallWeg: "Dieser Notfall gibt es nicht mehr.",
    nochmal: "Das hat nicht geklappt. Versuch es noch einmal.",
    vertretungWeg: "Diese Vertretung ist nicht mehr offen.",
    code: {
      bereits_besetzt: "Diese Schicht ist schon vergeben.",
      nicht_qualifiziert: "Dir fehlt die erforderliche Rolle.",
      schon_zugewiesen: "Du bist für diese Schicht schon eingeteilt.",
      nicht_moeglich: "Das liess sich nicht zuweisen. Versuch es noch einmal.",
    },
  },

  /** Meldungen der Zahlungs-Actions (`src/lib/zahlung-aktionen.ts`). */
  zahlung: {
    rechnungUnvollstaendig: "Bitte vervollständige die Rechnungsangaben.",
    rechnungFehler:
      "Die Rechnungsangaben liessen sich nicht speichern. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    keinAbo: "Zu deinem Betrieb ist kein Abonnement hinterlegt. Wähl oben einen Plan aus.",
    rabattFehler:
      "Der Rabattcode liess sich nicht anwenden. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    fremdBetrieb: "Diese Zahlungsmethode gehört nicht zu deinem Betrieb.",
    fremdKonto: "Diese Zahlungsmethode gehört nicht zu deinem Konto.",
    nichtBestaetigt: "Die Zahlungsmethode ist noch nicht bestätigt. Versuch es bitte noch einmal.",
    keineMethode: "Stripe hat keine Zahlungsmethode zurückgemeldet. Versuch es noch einmal.",
    rechnungFehlt:
      "Für die Rechnung fehlen noch Angaben. Füll die Felder über dem Zahlungsformular aus und schick das Formular erneut ab.",
    uebernahmeFehler:
      "Die Zahlungsmethode liess sich nicht übernehmen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    zahlungOffen:
      "Die Zahlung ist noch nicht bestätigt. Bitte versuch es in einem Moment erneut — bei einer Lastschrift kann das kurz dauern.",
    betriebFehler:
      "Die Zahlung ist eingegangen, aber der Betrieb liess sich nicht anlegen. Lad die Seite neu — bleibt der Fehler, meld dich beim Support.",
    abschlussFehler:
      "Der Abschluss ist gerade fehlgeschlagen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    /* Je nach Lage der abgelehnten Zahlung (`AblehnungsArt` in `stripe-zahlung.ts`). */
    ablehnung: {
      "nicht-gestartet":
        "Die Zahlung wurde abgelehnt, das Abo ist nicht gestartet. Versuch es mit einer anderen Zahlungsmethode.",
      "noch-nicht":
        "Die Zahlung wurde abgelehnt, das Abo ist noch nicht gestartet. Versuch es mit einer anderen Zahlungsmethode.",
      testphase:
        "Die Karte wurde abgelehnt. Deine Testphase ist abgelaufen und die erste Abbuchung steht an — versuch es mit einer anderen Zahlungsmethode.",
    },
  },

  /**
   * Die Sätze unmittelbar vor dem Hinterlegen einer Zahlungsmethode
   * (`src/lib/abo-konditionen.ts`). {datum} und {preis} sind bereits
   * formatiert; {preis} ist selbst ein ganzer Ausdruck aus `preis`.
   */
  aboKonditionen: {
    /* {betrag} = formatierter Betrag, {zeitraum} = proMonat/proJahr. */
    preis: "{betrag} {zeitraum} zzgl. USt.",
    proMonat: "pro Monat",
    proJahr: "pro Jahr",
    kuendigung:
      "Kündbar jederzeit zum Ende des bezahlten Zeitraums — im Dashboard unter Einstellungen → „Abo verwalten“ oder per E-Mail (AGB § 6 Abs. 2).",
    rechnungsangaben:
      "Deine Rechnungsangaben werden an den Zahlungsdienstleister Stripe übermittelt, der daraus die Rechnung erstellt und die Umsatzsteuer berechnet (Datenschutzerklärung, Ziffer 6).",
    testphaseBis: "Kostenlose Testphase bis {datum} — bis dahin wird nichts abgebucht.",
    ersteAbbuchungPreis: "Erste Abbuchung am {datum}: {preis}, danach im Voraus für jeden Zeitraum.",
    ersteAbbuchung: "Erste Abbuchung am {datum}, danach im Voraus für jeden Zeitraum.",
    laeuftPreis: "Die Testphase ist vorbei, das Abo läuft. Nächste Abbuchung am {datum}: {preis}.",
    laeuft: "Die Testphase ist vorbei, das Abo läuft. Nächste Abbuchung am {datum}.",
    gekuendigt: "Das Abo ist gekündigt und endet am {datum}.",
    verlaengert: "Das Abo verlängert sich automatisch um jeweils einen weiteren Zeitraum.",
    testphaseVerbraucht:
      "Ein Neuabschluss beginnt ohne kostenlose Testphase.",
    beginntSofortPreis:
      "Mit dem Hinterlegen beginnt dein Abo sofort, und {preis} werden für den ersten Zeitraum abgebucht.",
    beginntSofort: "Mit dem Hinterlegen beginnt dein Abo sofort, und der erste Zeitraum wird abgebucht.",
    danachVoraus: "Danach verlängert es sich automatisch und wird jeweils im Voraus abgebucht.",
    fortsetzenPreis:
      "Mit dem Hinterlegen wird dein Abo sofort fortgesetzt, und {preis} werden für den ersten Zeitraum abgebucht.",
    fortsetzen:
      "Mit dem Hinterlegen wird dein Abo sofort fortgesetzt, und der erste Zeitraum wird abgebucht.",
  },

  /** `/dashboard/einstellungen` — Formular, Abo-Abschnitt, Export, Konto. */
  einstellungen: {
    metaTitel: "Einstellungen",
    metaBeschreibung: "Sichtbarkeit, Abläufe und Abrechnung deines Betriebs.",
    titel: "Einstellungen",
    lead: "Was dein Team sehen darf, wie Tausch und Notfall gerechnet werden, und bis wann abgerechnet ist.",
    nurChef:
      "Diese Einstellungen gehören der Betriebsleitung. Du siehst sie als angestellte Person nicht — was hier steht, wirkt aber auf deinen Kalender.",
    keineZeile:
      "Für diesen Betrieb sind keine Einstellungen hinterlegt. Das sollte nicht vorkommen — lad die Seite neu, und meld dich beim Support, wenn es bleibt.",
    exportTitel: "Daten exportieren",
    exportText1:
      "Alle Daten deines Betriebs als eine JSON-Datei: Mitarbeiter und Rollen, Vorlagen und Schichten, Urlaub, Verfügbarkeiten, Mitteilungen, Tausch, Notfälle und das Änderungsprotokoll. Das Paket nennt zu jedem Abschnitt, was er enthält, und listet auf, was bewusst fehlt.",
    exportText2:
      "Einzelstimmen anonymer Umfragen sind nicht enthalten — für sie steht die Auszählung im Paket. Der Export ist kostenlos und beliebig oft möglich, auch nach einer Kündigung.",
    exportKnopf: "Export herunterladen",
    exportNurChef: "Nur die Betriebsleitung kann den Betriebsexport anfordern.",
    kontoTitel: "Konto",
    kontoText:
      "Wenn du QuickTeam nicht mehr nutzen willst, kannst du deinen Zugang endgültig löschen. Der Betrieb und die Dienstpläne bleiben bestehen — dein Name verschwindet daraus.",
    kontoLoeschen: "Konto löschen",
    /* Formular */
    gespeichert:
      "Gespeichert. Die Sichtbarkeits-Einstellungen wirken für dein Team ab der nächsten Seitenansicht — niemand muss sich neu anmelden.",
    sichtTitel: "Was dein Team sieht",
    sichtText:
      "Beide Einstellungen wirken betriebsweit und sofort — sie ändern nicht die Darstellung, sondern welche Daten für Angestellte überhaupt abrufbar sind.",
    fremdeSchichten: "Fremde Schichten sichtbar",
    fremdeSchichtenText:
      "Aus: Angestellte sehen im Kalender ausschliesslich ihre eigenen Dienste. An: sie sehen den ganzen Dienstplan des Betriebs.",
    namenSichtbar: "Namen der Eingeteilten sichtbar",
    namenSichtbarText:
      "Aus: auf einer Schicht steht nur der eigene Name. An: alle Eingeteilten stehen mit Namen und Rolle da.",
    ablaeufe: "Abläufe",
    tauschFreigabe: "Schichttausch muss freigegeben werden",
    tauschFreigabeText:
      "An: ein ausgehandelter Tausch wartet auf deine Zustimmung. Aus: die beiden Beteiligten regeln ihn unter sich.",
    notfallStunden: "Notfallstunden anrechnen",
    notfallStundenText:
      "Zählt Schichten, von denen sich jemand kurzfristig abgemeldet hat, trotzdem zur Arbeitszeit.",
    frist: "Frist für Wünsche",
    /* {min}/{max} = erlaubte Tage im Monat. */
    fristText:
      "Tag im Monat, bis zu dem dein Team Verfügbarkeiten für den Folgemonat eintragen kann. {min} bis {max}.",
    abrechnungTitel: "Abrechnung und Sprache",
    abrechnungBis: "Abrechnung abgeschlossen bis",
    keinStichtag: "Kein Stichtag",
    abrechnungHinweis:
      "Stichtag für die Stundenauswertung: Zeit davor gilt als abgerechnet. Ohne Angabe wird alles gezählt.",
    spracheTitel: "Sprache des Betriebs",
    spracheVor: "Vorgesehen als Standardsprache für neue Mitglieder. ",
    spracheOhneWirkung: "Zurzeit ohne Wirkung",
    spracheNach:
      " — die App wählt ihre Sprache am Gerät, und die Website folgt der Sprachwahl jeder Person. Der Wert wird gespeichert, greift aber erst, wenn die Standardsprache gebaut ist.",
    speichern: "Speichern",
    speichernLaufend: "Wird gespeichert …",
    /* Server Action */
    nurChefAendern: "Nur die Betriebsleitung darf die Einstellungen ändern.",
    eingabenFalsch: "Die Eingaben stimmen so nicht.",
    rlsFehler: "Gespeichert wurde nichts — die Berechtigung dafür fehlt inzwischen. Lad die Seite neu.",
    speichernFehler: "Die Einstellungen liessen sich nicht speichern. Versuch es noch einmal.",
    gespeichertKurz: "Gespeichert.",
    /* Abo-Abschnitt */
    abo: {
      titel: "Abo und Abrechnung",
      status: {
        trial: "Testphase",
        aktiv: "Aktiv",
        zahlung_ausstehend: "Zahlung ausstehend",
        pausiert: "Pausiert",
        gekuendigt: "Gekündigt",
      },
      meldung: {
        "kein-abo":
          "Zu diesem Betrieb gibt es noch kein Abonnement. Wähle zuerst einen Plan in der Einrichtung.",
        "portal-fehler":
          "Das Kundenportal liess sich gerade nicht öffnen. Versuch es in ein paar Minuten noch einmal oder schreib uns an blanktrading@web.de — eine Kündigung per E-Mail ist jederzeit möglich.",
        verweigert: "Das Abo verwaltet die Betriebsleitung.",
      },
      /* {plan} = Planname. */
      plan: "Plan {plan}",
      abonnement: "Abonnement",
      /* {datum} = formatiertes Datum. */
      endet: "Gekündigt — endet am {datum}.",
      testphaseBis: "Testphase bis {datum}.",
      naechsteAbbuchung: "Nächste Abbuchung am {datum}.",
      portalText:
        "Im Kundenportal unseres Zahlungsdienstleisters Stripe kündigst du zum Ende des bezahlten Zeitraums, änderst dein Zahlungsmittel und lädst Rechnungen herunter.",
      verwalten: "Abo verwalten",
    },
  },

  /** `/kontoloeschung` — drei Stufen, zwei Formulare, die Fehlermeldungen. */
  kontoloeschung: {
    metaTitel: "Konto und Daten löschen",
    metaBeschreibung: "Dein QuickTeam-Konto endgültig entfernen.",
    /* {n} = aktuelle Stufe. */
    stufe: "Konto löschen · Schritt {n} von 3",
    abbrechen: "Abbrechen und abmelden",
    anmelden: {
      titel: "Konto und Daten löschen",
      lead: "Hier entfernst du deinen QuickTeam-Zugang endgültig. Das lässt sich nicht rückgängig machen, und es gibt keine Wiederherstellung — auch nicht durch den Support.",
      zuerst: "Zuerst anmelden",
      zuerstText:
        "Damit niemand ein fremdes Konto löschen kann, brauchen wir deine E-Mail-Adresse und dein Passwort. Was genau gelöscht wird, steht im nächsten Schritt — gelöscht wird jetzt noch nichts.",
      vergessenFrage: "Passwort vergessen?",
      vergessenLink: "Erst zurücksetzen",
      vergessenRest: ", dann hierher zurück.",
      email: "E-Mail-Adresse",
      passwort: "Passwort",
      weiter: "Weiter",
      laufend: "Wird geprüft …",
    },
    folgen: {
      titel: "Was passiert, wenn du fortfährst",
      angemeldetVor: "Du bist angemeldet als ",
      angemeldetNach: ". Lies das hier bitte zu Ende — danach folgt nur noch eine Bestätigung.",
      geloeschtTitel: "Was gelöscht wird",
      zugang: "Dein Zugang.",
      zugangText: " Anmeldung, Passwort und die Verknüpfung zu allen Betrieben, in denen du stehst.",
      daten: "Deine persönlichen Daten.",
      datenText:
        " Name, E-Mail-Adresse und Telefonnummer werden aus jeder deiner Anstellungen entfernt, dazu Mitteilungen und Benachrichtigungseinstellungen, die nur dich betreffen.",
      bleibtTitel: "Was bleibt",
      betrieb: "Der Betrieb selbst",
      betriebText:
        " und die Dienstpläne, in denen du eingeteilt warst. Dein Name steht dort nicht mehr — die Einträge bleiben, weil dein Arbeitgeber Arbeitszeiten aufbewahren muss.",
      aboTitel: "Abo und Abrechnung",
      aboText:
        "Die Löschung betrifft alle Betriebe, die du leitest. Ihre laufenden Abonnements werden anschließend sofort gekündigt. Bereits abgebuchte Zeiträume werden nicht anteilig erstattet. Falls die Kündigung technisch fehlschlägt, muss der Support sie nachholen.",
      mitgliederVor:
        "Stehen in einem deiner geleiteten Betriebe noch weitere Personen, lässt sich dein Konto nicht löschen — sonst bliebe ein Betrieb ohne Leitung zurück, und das Abo liefe weiter. Entferne sie zuvor unter ",
      mitgliederLink: "Team",
      mitgliederNach: " oder übergib die Leitung an jemand anderen.",
      export:
        "Willst du deine Daten vorher mitnehmen, brich hier ab und lade sie im Dashboard unter Einstellungen herunter. Nach der Löschung ist das nicht mehr möglich.",
      weiter: "Verstanden — weiter",
    },
    endgueltig: {
      titel: "Letzte Warnung",
      leadVor: "Der nächste Klick löscht das Konto ",
      leadNach: " sofort und endgültig.",
      keinZurueck: "Es gibt kein Zurück",
      keinRueckgaengig: "Es gibt keine Rückgängig-Funktion und keine Wiederherstellung.",
      abgemeldet: "Du wirst sofort abgemeldet und kannst dich danach nicht mehr anmelden.",
      aboChef:
        "Laufende Abonnements deiner Betriebe werden sofort gekündigt, ohne anteilige Erstattung.",
      eintraege: "Deine Einträge in vergangenen Dienstplänen bleiben ohne deinen Namen bestehen.",
      keinWort:
        "Zu diesem Konto lässt sich kein Bestätigungswort ermitteln. Meld dich beim Support, statt es hier zu versuchen.",
      zurueck: "Zurück zu den Folgen",
      /* Bestätigungsfeld: das Wort steht hervorgehoben zwischen den beiden Teilen. */
      tippVor: "Tipp zur Bestätigung ",
      tippNach: " ein",
      tippHinweis: "Genau so, wie es oben steht — Gross- und Kleinschreibung zählt.",
      verstanden:
        "Mir ist klar, dass mein Zugang danach nicht mehr existiert und sich nicht wiederherstellen lässt.",
      loeschen: "Konto endgültig löschen",
      loeschtLaufend: "Wird gelöscht …",
    },
    fehler: {
      /* {wort} = das erwartete Bestätigungswort. */
      eingabe: "Die Eingabe stimmt nicht. Tipp „{wort}“ genau so ein, wie es dasteht.",
      aboUnlesbar:
        "Die Abonnements konnten nicht geprüft werden. Dein Konto wurde nicht gelöscht. Versuch es später erneut.",
      chefMitMitgliedern:
        "Dein Konto leitet noch einen Betrieb, in dem weitere Personen stehen. Solange das so ist, lässt es sich nicht löschen — sonst bliebe ein Betrieb ohne Leitung zurück. Entferne zuerst die übrigen Mitglieder im Team oder übergib die Leitung an jemand anderen.",
      fehlgeschlagen:
        "Das Konto liess sich nicht löschen. Versuch es noch einmal — bleibt der Fehler, meld dich beim Support.",
    },
  },

  /** `/passwort-vergessen` und `/passwort-neu`. */
  passwort: {
    kicker: "Passwort zurücksetzen",
    vergessen: {
      metaTitel: "Passwort vergessen",
      metaBeschreibung:
        "Trag deine E-Mail-Adresse ein und du bekommst einen Code, mit dem du ein neues Passwort setzt.",
      titel: "Neues Passwort anfordern",
      lead: "Gib die E-Mail-Adresse an, mit der du deinen Betrieb angelegt hast. Du bekommst einen Code, mit dem du im nächsten Schritt ein neues Passwort setzt.",
      fussFrage: "Passwort wieder eingefallen?",
      fussLink: "Zur Anmeldung",
      emailLabel: "E-Mail-Adresse",
      emailHinweis: "Die Adresse, mit der du deinen Betrieb angelegt hast.",
      absenden: "Code anfordern",
      absendenLaufend: "Wird verschickt …",
    },
    neu: {
      metaTitel: "Neues Passwort setzen",
      metaBeschreibung:
        "Trag den Code aus der E-Mail ein und vergib dein neues Passwort. Der Code ist einmalig und läuft nach 60 Minuten ab.",
      titel: "Neues Passwort vergeben",
      lead: "Trag den Code aus deiner E-Mail ein und vergib gleich dein neues Passwort — danach geht es direkt weiter in die Planung.",
      zurueck: "Zurück zur Anmeldung",
      geraetTitel: "Du kannst das Gerät wechseln",
      geraetText:
        "Die E-Mail am Handy öffnen und den Code am Rechner eintippen ist ausdrücklich vorgesehen. Trag dann einfach dieselbe E-Mail-Adresse mit ein.",
      codeLabel: "Code aus der E-Mail ({n} Ziffern)",
      codeHinweis: "Der Code gilt 60 Minuten.",
      emailLabel: "E-Mail-Adresse",
      emailHinweis: "Die Adresse, an die wir den Code geschickt haben.",
      passwortLabel: "Neues Passwort",
      passwortHinweis: "Mindestens {n} Zeichen.",
      wiederholungLabel: "Passwort wiederholen",
      absenden: "Passwort speichern",
      absendenLaufend: "Wird gespeichert …",
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
