/**
 * Was in den Betriebsexport gehört — und was ausdrücklich nicht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum eine Liste und keine Schleife über `information_schema`
 * ─────────────────────────────────────────────────────────────────────
 *
 * Ein Export, der sich seine Tabellen selbst sucht, nimmt beim nächsten
 * Schema-Zuwachs alles mit, was jemand anlegt — auch das, was niemand
 * herausgeben wollte. Eine neue Tabelle taucht dann still im Paket auf,
 * und gemerkt wird es erst, wenn sie drin steht. Diese Liste ist
 * deshalb bewusst von Hand gepflegt: eine neue Tabelle fehlt im Export,
 * bis jemand sie hier einträgt, und das Fehlen ist der harmlosere
 * Fehler.
 *
 * Die Gegenprobe dazu läuft mit: `AUSSCHLUESSE` unten nennt jede
 * bekannte Tabelle, die **nicht** exportiert wird, mit Grund. Zusammen
 * decken beide Listen das Schema ab; `pruefeAbdeckung()` im Paketbauer
 * meldet, was in keiner von beiden steht.
 *
 * Grundlage ist § 6 Abs. 5 der AGB (Umfang des Exports) und der
 * Anbieterwechsel nach Art. 23 ff. der Verordnung (EU) 2023/2854.
 */

export type Sichtbarkeit =
  /** Unverändert exportiert. */
  | "voll"
  /**
   * Einzelne Spalten fallen heraus — Geheimnisse, interne Kennungen.
   * `spalten` nennt dann ausdrücklich, was bleibt.
   */
  | "gefiltert"
  /**
   * Zeilen werden zusätzlich nachbearbeitet, bevor sie ins Paket gehen
   * (Anonymität, Pseudonymisierung, Redaktion). Der Eingriff steht im
   * Paketbauer und wird im Paket selbst unter `hinweise` benannt.
   */
  | "bearbeitet";

export type TabellenSpec = {
  /** Tabellenname in `public`. */
  name: string;
  /** Ein Satz, der im Paket neben den Daten steht. */
  beschreibung: string;
  /**
   * Die Spalte, über die auf den Betrieb eingegrenzt wird. Alle
   * Exporttabellen bis auf `betriebe` tragen `betrieb_id`; `betriebe`
   * selbst wird über `id` eingegrenzt.
   *
   * **Das ist keine Bequemlichkeit, sondern die Mandantengrenze.** RLS
   * greift ohnehin, aber eine Policy wie `na_select`
   * (`betrieb_id IN (SELECT meine_betriebe())`) würde einem Konto mit
   * zwei Anstellungen die Daten **beider** Betriebe liefern. Der Export
   * gilt genau einem Betrieb; die Einschränkung muss deshalb hier
   * stehen und nicht nur in der Datenbank.
   */
  schluessel: "betrieb_id" | "id";
  /** Spaltenliste für `select`, falls nicht alles mitgeht. */
  spalten?: string;
  /** Primärschlüssel — Sortierung für die seitenweise Abfrage. */
  ordnung: string[];
  /**
   * Ist `ordnung` für jede Zeile eindeutig?
   *
   * Entscheidet, **wie** geblättert wird (`leseTabelle` in `paket.ts`).
   * Nur eine eindeutige Ordnung erlaubt Keyset-Blättern und damit die
   * Zusage „jede durchgehend vorhandene Zeile genau einmal". Ist sie es
   * nicht, wird eine Seite gelesen und ein Überlauf gemeldet, statt
   * stillschweigend abzuschneiden.
   *
   * Überall `true`, weil die Ordnung der Primärschlüssel ist — ausser
   * bei `einladungen`, deren Primärschlüssel der Einladungs-Hash ist.
   * Den exportieren wir nicht und wollen ihn auch nicht als
   * Sortierkriterium benutzen.
   */
  eindeutig: boolean;
  sicht: Sichtbarkeit;
  /** Steht im Paket, wenn `sicht` nicht `"voll"` ist. */
  anmerkung?: string;
};

export const EXPORT_TABELLEN: readonly TabellenSpec[] = [
  {
    name: "betriebe",
    beschreibung: "Stammdaten des Betriebs.",
    schluessel: "id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "betriebs_einstellungen",
    beschreibung: "Betriebsweite Einstellungen (Sichtbarkeit, Fristen, Abrechnungstag).",
    schluessel: "betrieb_id",
    ordnung: ["betrieb_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "mitarbeiter",
    beschreibung:
      "Alle Anstellungen des Betriebs, einschliesslich eingeladener, pausierter und inaktiver. Eine Person kann mehrere Zeilen haben.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "bearbeitet",
    anmerkung:
      "Zeilen mit gesetztem `anonymisiert_am` sind pseudonymisiert und bleiben es — der Export stellt keine gelöschten Namen wieder her.",
  },
  {
    name: "rollen",
    beschreibung: "Rollen des Betriebs; `aktiv = false` heisst weich gelöscht.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "mitarbeiter_rollen",
    beschreibung: "Welche Anstellung welche Rolle ausüben darf.",
    schluessel: "betrieb_id",
    ordnung: ["mitarbeiter_id", "rolle_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_vorlagen",
    beschreibung:
      "Wochenraster der wiederkehrenden Schichten. `wochentag` ist montagsbasiert: 0 = Montag, 6 = Sonntag.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_vorlage_mindestbesetzung",
    beschreibung: "Rollenbedarf je Vorlage.",
    schluessel: "betrieb_id",
    ordnung: ["schicht_vorlage_id", "rolle_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "planungszyklen",
    beschreibung: "Planungszeiträume samt Solver-Läufen.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_instanzen",
    beschreibung: "Die konkreten Schichten mit Datum und Status.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_instanz_mindestbesetzung",
    beschreibung: "Rollenbedarf je konkreter Schicht.",
    schluessel: "betrieb_id",
    ordnung: ["schicht_instanz_id", "rolle_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_zuweisungen",
    beschreibung: "Wer welche Schicht in welcher Rolle übernimmt.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_ausschreibung_bedarf",
    beschreibung: "Offene Ausschreibungen je Schicht und Rolle.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schicht_notizen",
    beschreibung: "Notizen an einzelnen Schichten.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "urlaub",
    beschreibung: "Urlaubsanträge samt Status und Entscheidung.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "abwesenheit",
    beschreibung: "Abwesenheiten ausserhalb des Urlaubs.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "verfuegbarkeiten",
    beschreibung: "Rückmeldungen zur Verfügbarkeit je Schicht.",
    schluessel: "betrieb_id",
    ordnung: ["mitarbeiter_id", "schicht_instanz_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "mitarbeiter_schicht_vorlieben",
    beschreibung: "Dauerhafte Schichtvorlieben je Vorlage.",
    schluessel: "betrieb_id",
    ordnung: ["mitarbeiter_id", "schicht_vorlage_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "mitarbeiter_schicht_tagesvorlieben",
    beschreibung: "Schichtvorlieben für einen bestimmten Tag.",
    schluessel: "betrieb_id",
    ordnung: ["mitarbeiter_id", "schicht_vorlage_id", "datum"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "benachrichtigungen",
    beschreibung:
      "Ankündigungen, Umfragen, Checklisten und Systemmeldungen. `anonym = true` heisst: die Einzelstimmen der zugehörigen Umfrage sind nicht personenbezogen auswertbar.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "umfrage_optionen",
    beschreibung: "Antwortmöglichkeiten je Umfrage.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "umfrage_stimmen",
    beschreibung:
      "Einzelstimmen — ausschliesslich zu Umfragen, die **nicht** anonym sind. Für anonyme Umfragen steht stattdessen die Auszählung unter `umfrage_ergebnisse_anonym`.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "bearbeitet",
    anmerkung:
      "Stimmen anonymer Umfragen werden entfernt, auch die eigene — sonst wäre eine zugesagte Anonymität durch den Export teilweise aufgehoben.",
  },
  {
    name: "aufgaben",
    beschreibung: "Checklistenpunkte an Mitteilungen.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "benachrichtigung_gelesen",
    beschreibung: "Wer welche Mitteilung gelesen hat.",
    schluessel: "betrieb_id",
    ordnung: ["benachrichtigung_id", "mitarbeiter_id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "nachricht_anhaenge",
    beschreibung:
      "Verzeichnis der Dateianhänge. Die Dateien selbst liegen im Objektspeicher; siehe `dateien` und die Hinweise im Paket.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "schichttausch_anfragen",
    beschreibung: "Schichttausch: Angebot, Annahme, Genehmigung.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "notfaelle",
    beschreibung: "Notfallmeldungen und Vertretungen.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "voll",
  },
  {
    name: "plan_aenderungen",
    beschreibung:
      "Änderungsprotokoll des Betriebs. Alte und neue Werte liegen als JSON vor.",
    schluessel: "betrieb_id",
    ordnung: ["id"],
    eindeutig: true,
    sicht: "bearbeitet",
    anmerkung:
      "In `alte_werte`/`neue_werte` werden Geheimnisse sowie Namen und Kontaktdaten inzwischen pseudonymisierter Anstellungen entfernt; der Notfallgrund wird als besondere Kategorie nach Art. 9 DSGVO nicht mitgeführt.",
  },
  {
    name: "einladungen",
    beschreibung:
      "Offene und eingelöste Einladungen. Der Einladungs-Hash ist ein Zugangsgeheimnis und fehlt.",
    schluessel: "betrieb_id",
    spalten: "betrieb_id, mitarbeiter_id, ablaufdatum, erstellt_am, eingeloest_am",
    ordnung: ["erstellt_am"],
    eindeutig: false,
    sicht: "gefiltert",
  },
  {
    name: "betrieb_abonnements",
    beschreibung:
      "Tarif und Abrechnungsstand. Rechnungen und Zahlungsmittel liegen beim Zahlungsdienstleister und sind über das Kundenportal abrufbar.",
    schluessel: "betrieb_id",
    spalten: "betrieb_id, plan, status, aktualisiert_am",
    ordnung: ["betrieb_id"],
    eindeutig: true,
    sicht: "gefiltert",
    anmerkung:
      "Ohne die Kennungen des Zahlungsdienstleisters (`stripe_customer_id`, `stripe_subscription_id`) — sie sind Zugangsmerkmale zu einem fremden System, keine Betriebsdaten.",
  },
];

/**
 * Tabellen, die bewusst **nicht** im Betriebsexport stehen, mit Grund.
 *
 * Steht wörtlich so im Paket. Ein Export, der schweigt, was er
 * weglässt, ist nach Art. 20 DSGVO und Art. 25 der Datenverordnung
 * schwer zu prüfen — und für einen Anbieterwechsel wertlos, weil der
 * neue Anbieter nicht weiss, was er noch braucht.
 */
export const AUSSCHLUESSE: readonly { name: string; grund: string }[] = [
  {
    name: "push_tokens",
    grund:
      "Geräteschlüssel für Push-Benachrichtigungen. Zugangsmerkmal, kein Betriebsdatum; nach § 6 Abs. 5 Satz 2 der AGB ausdrücklich ausgenommen.",
  },
  {
    name: "konto_merge_token",
    grund: "Kurzlebige Einmal-Token zur Kontozusammenführung. Zugangsgeheimnis.",
  },
  {
    name: "einladungen.hash",
    grund:
      "Der Hash löst eine Einladung ein und ist damit ein Zugangsgeheimnis. Die fachlichen Angaben der Einladung sind enthalten.",
  },
  {
    name: "auth.users",
    grund:
      "Passwort-Hashes, Sitzungen, Wiederherstellungs-Token und weitere Authentifizierungsdaten. Nicht exportierbar und nach § 6 Abs. 5 Satz 2 der AGB ausgenommen.",
  },
  {
    name: "benachrichtigung_prefs",
    grund:
      "Persönliche Benachrichtigungseinstellungen eines Kontos, nicht betriebsbezogen. Sie sind ausserdem durch RLS nur für die betroffene Person selbst lesbar — der Betrieb kann sie gar nicht abrufen.",
  },
  {
    name: "bug_reports",
    grund:
      "Fehlermeldungen ohne Betriebsbezug (die Tabelle trägt keine `betrieb_id`). Sie enthalten Freitext und Diagnoseangaben, die zu fremden Betrieben gehören können.",
  },
  {
    name: "gesetzliche_parameter",
    grund:
      "Gemeinsame Referenztabelle aller Betriebe. Statt der ganzen Tabelle enthält das Paket unter `referenz.gesetzliche_parameter` die Regelwerte für das Land dieses Betriebs.",
  },
];

/**
 * Was über die reinen Tabellen hinaus im Paket steht.
 *
 * Getrennt aufgeführt, weil es keine 1:1-Abbildung einer Tabelle ist,
 * sondern aus einer RPC oder aus mehreren Quellen entsteht.
 */
export const ZUSATZ_ABSCHNITTE: readonly { name: string; beschreibung: string }[] = [
  {
    name: "umfrage_ergebnisse_anonym",
    beschreibung:
      "Auszählung anonymer Umfragen über die Datenbankfunktion `umfrage_ergebnis()` — Anzahl je Option, ohne Zuordnung zu Personen.",
  },
  {
    name: "rechtliche_zustimmungen",
    beschreibung:
      "Die betrieblichen Vertragsannahmen (AGB, AVV) mit Fassung, Zeitpunkt und handelnder Person.",
  },
  {
    name: "kenntnisnahmen_datenschutz",
    beschreibung:
      "Persönliche Kenntnisnahmen der Datenschutzerklärung. Getrennt geführt, weil sie keine Vertragsannahme des Betriebs sind.",
  },
  {
    name: "referenz.gesetzliche_parameter",
    beschreibung:
      "Die Arbeitszeit-Regelwerte des Landes dieses Betriebs, in der zum Exportzeitpunkt gültigen Fassung.",
  },
  {
    name: "dateien",
    beschreibung:
      "Zuordnung der Dateianhänge zu Mitteilungen, mit Pfad, Name, Typ und Grösse.",
  },
];
