import { z } from "zod";

import type { ValidierungsSchluessel } from "@/i18n/de";
import { loeseMeldung, meldung, type Textblock } from "@/i18n/text";

/**
 * Ein Regelsatz für beide Seiten: im Browser für sofortige Rückmeldung
 * beim Verlassen eines Feldes, in der Server Action als tatsächliche
 * Prüfung. Der Client-Teil ist Komfort, der Server-Teil ist die
 * Verteidigung — er läuft auch, wenn JavaScript aus ist.
 *
 * Besonders wichtig bei `vorname` und `nachname`: die Datenbank hat dort
 * nur NOT NULL und keinen trim-CHECK. Ein String aus Leerzeichen liefe
 * ohne diese Prüfung durch bis in die Tabelle.
 */

/**
 * Meldungsschlüssel statt Sätze — die Begründung steht vollständig in
 * `src/i18n/text.ts`. Kurz: die Schemata hier entstehen im Modul-Scope,
 * und ein Modul-Scope kennt die Sprache der Anfrage nicht.
 *
 * `vm` bindet den Schlüssel an den Typ aus dem Wörterbuch, ein Vertipper
 * bricht also den Typecheck. **Der Import ist ein `import type`** und
 * damit zur Laufzeit weg: keine einzige Zeile Deutsch landet über diesen
 * Weg im Client-Bündel, obwohl die Datei auch im Browser läuft.
 */
function vm(
  schluessel: ValidierungsSchluessel,
  werte?: Record<string, string | number>,
): string {
  return meldung(schluessel, werte);
}

/** Markiert einen Wert als selbst aufzulösenden Schlüssel (`@`-Verweis). */
function verweis(schluessel: ValidierungsSchluessel): string {
  return `@${schluessel}`;
}

/**
 * ISO-Datum `YYYY-MM-DD`.
 *
 * Steht hier oben und nicht bei den Urlaubsregeln, wo es früher stand:
 * `tauschAngebotSchema` benutzt es inzwischen auch und wird **vorher**
 * ausgewertet. Ein `const` weiter unten läge zu diesem Zeitpunkt noch in
 * der temporalen Todeszone — das wäre kein Typfehler, sondern ein
 * ReferenceError beim Laden des Moduls.
 */
const DATUM_REGEX = /^\d{4}-\d{2}-\d{2}$/u;

/** `betriebe.land` erlaubt per CHECK ausschliesslich diese zwei Werte. */
export const LAENDER = [
  { code: "AT", name: "Österreich" },
  { code: "DE", name: "Deutschland" },
] as const;

export type LandCode = (typeof LAENDER)[number]["code"];

/**
 * Supabase lehnt Passwörter über 72 Byte ab (bcrypt-Grenze).
 *
 * Exportiert, weil die Registrierung die Regeln seit dem 2026-09-07
 * **anzeigt** statt sie nur anzuwenden. Vorher stand am Feld der Satz
 * „Mindestens 8 Zeichen" als Literal — zwei Stellen für dieselbe Zahl,
 * von denen eine still veralten kann. Wer die Grenze ändert, ändert sie
 * hier und die Liste im Formular zieht mit.
 */
export const PASSWORT_MIN = 8;
export const PASSWORT_MAX = 72;

/**
 * Stellenzahl des Bestätigungscodes.
 *
 * Muss mit „Email OTP Length" in Supabase (Authentication → Sign In /
 * Providers → Email) übereinstimmen. Supabase erlaubt dort 6 bis 10;
 * dieses Projekt fährt 8. Stimmen die Werte nicht überein, weist entweder
 * diese Prüfung gültige Codes ab oder Supabase lehnt sie an — beides sieht
 * für den Nutzer gleich aus.
 *
 * Steht hier bewusst als einzelne Konstante: eine Änderung im Dashboard
 * ist hier eine Zeile.
 */
export const CODE_LAENGE = 8;

function pflichtText(bez: ValidierungsSchluessel, max: number) {
  return z
    .string()
    .trim()
    .min(1, vm("v.pflicht.leer", { bez: verweis(bez) }))
    .max(max, vm("v.pflicht.lang", { bez: verweis(bez), max }));
}

/**
 * Einzelne Feldregeln, benannt wie die `name`-Attribute im Formular.
 * Daraus werden unten die Formularschemata zusammengesetzt; die
 * Client-Prüfung greift auf dieselben Einträge zu.
 */
export const feldSchemata = {
  betrieb_name: pflichtText("bez.betriebName", 120),
  /*
   * Die Zustimmung zu AGB, AVV und Datenschutzerklärung.
   *
   * Ein Kontrollkästchen sendet **gar nichts**, wenn es nicht gesetzt
   * ist — kein "false", kein leerer String, der Schlüssel fehlt im
   * FormData schlicht. `text()` macht daraus "", und genau daran
   * scheitert das Literal. Ein `z.boolean()` wäre hier falsch: es gibt
   * keinen Wahrheitswert zu prüfen, sondern einen erwarteten Wert.
   *
   * Steht bewusst im geteilten Schema und nicht nur in der Server
   * Action: dieselbe Regel prüft der Browser (Sofortmeldung am Feld) und
   * der Server (der Nachweis, der später zählt).
   */
  zustimmung: z.literal("ja", vm("v.zustimmung.fehlt")),
  land: z.enum(
    LAENDER.map((l) => l.code) as [LandCode, ...LandCode[]],
    vm("v.land.wahl"),
  ),
  vorname: pflichtText("bez.vorname", 80),
  nachname: pflichtText("bez.nachname", 80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, vm("v.email.leer"))
    .pipe(z.email(vm("v.email.form"))),
  passwort: z
    .string()
    .min(PASSWORT_MIN, vm("v.passwort.kurz", { min: PASSWORT_MIN }))
    .max(PASSWORT_MAX, vm("v.passwort.lang", { max: PASSWORT_MAX })),
  wiederholung: z.string().min(1, vm("v.wiederholung.leer")),
  /*
   * Aus der E-Mail kopierte Codes bringen oft Leerzeichen mit — die
   * werden entfernt, statt daraus einen Fehler zu machen. Erst danach
   * wird auf reine Ziffern geprüft.
   */
  code: z
    .string()
    .transform((wert) => wert.replace(/\s+/gu, ""))
    .pipe(
      z
        .string()
        .min(1, vm("v.code.leer"))
        .regex(
          new RegExp(`^\\d{${CODE_LAENGE}}$`, "u"),
          vm("v.code.ziffern", { anzahl: CODE_LAENGE }),
        ),
    ),
  /*
   * Österreichische UID-Nummer, freiwillig — abgefragt in Schritt 2, nur
   * für Betriebe mit `land = 'AT'`. Sie entscheidet bei Stripe Tax über
   * das Reverse-Charge-Verfahren; ohne sie behandelt Stripe den Betrieb
   * wie einen Privatkunden. Für deutsche Betriebe ändert sie nichts
   * (Inlandsumsatz), deshalb gibt es dort kein Feld.
   *
   * Leerzeichen, Punkte und Bindestriche aus dem Kopieren werden entfernt,
   * statt daraus einen Fehler zu machen. Leer heisst „keine Angabe" und
   * ist gültig. Ob die Nummer tatsächlich vergeben ist, prüft Stripe
   * danach gegen VIES — hier geht es nur um die Form.
   */
  uid: z
    .string()
    .transform((wert) => wert.replace(/[\s.-]/gu, "").toUpperCase())
    .refine((wert) => wert === "" || /^ATU\d{8}$/u.test(wert), {
      error: vm("v.uid.form"),
    }),
} as const;

export type FeldName = keyof typeof feldSchemata;

/**
 * Prüft ein einzelnes Feld. `null` heisst: in Ordnung.
 *
 * `texte` ist der aufgelöste Validierungsblock der aktiven Sprache. Er
 * kommt als Argument herein und wird **nicht** hier nachgeschlagen: diese
 * Funktion läuft im Browser, und ein Wörterbuch-Import an dieser Stelle
 * zöge beide Sprachen ins Client-Bündel. Die Inseln beziehen ihn über
 * `useKlientTexte()`.
 */
export function pruefeFeld(
  name: string,
  wert: unknown,
  texte: Textblock,
): string | null {
  if (!(name in feldSchemata)) return null;
  const schema = feldSchemata[name as FeldName];
  const ergebnis = schema.safeParse(wert);
  if (ergebnis.success) return null;
  const roh = ergebnis.error.issues[0]?.message;
  return roh === undefined ? null : loeseMeldung(roh, texte);
}

/*
 * Die Wiederholung steht hier und **nicht** in `loginSchema`. Das ist
 * kein Versehen: beim Anlegen ist ein Tippfehler im Passwort erst
 * bemerkbar, wenn die Anmeldung Wochen später scheitert — bis dahin
 * hilft nur noch der Zurücksetzen-Weg. Beim Anmelden fällt derselbe
 * Tippfehler sofort auf, weil die Anmeldung sofort scheitert; ein
 * zweites Feld wäre dort nur ein zweiter Handgriff ohne Gewinn.
 *
 * Aufgebaut wie `passwortNeuSchema` weiter unten, mit demselben
 * `refine` und derselben Meldung — dieselbe Frage soll nicht zweimal
 * verschieden beantwortet werden.
 */
export const registrierungSchema = z
  .object({
    betrieb_name: feldSchemata.betrieb_name,
    land: feldSchemata.land,
    vorname: feldSchemata.vorname,
    nachname: feldSchemata.nachname,
    email: feldSchemata.email,
    passwort: feldSchemata.passwort,
    wiederholung: feldSchemata.wiederholung,
    zustimmung: feldSchemata.zustimmung,
  })
  .refine((werte) => werte.passwort === werte.wiederholung, {
    /*
     * Der Fehler haengt am Wiederholungsfeld, nicht am Passwortfeld.
     * `aria-describedby` verknüpft ihn dort, und dort steht auch der
     * Cursor: die Meldung erscheint an dem Feld, das gerade getippt
     * wurde, statt am Feld darüber.
     */
    path: ["wiederholung"],
    error: vm("v.wiederholung.ungleich"),
  });

export type Registrierung = z.infer<typeof registrierungSchema>;

/*
 * Die nachgeholte Zustimmung im Dashboard.
 *
 * Nur das eine Feld: Betrieb und Person leitet die Server Action aus
 * `auth.uid()` ab, statt sie aus dem Formular zu nehmen. Das Schema
 * greift auf dasselbe `feldSchemata.zustimmung` zurück wie die
 * Registrierung — derselbe erwartete Wert, dieselbe Meldung, eine
 * Stelle zum Ändern.
 */
export const zustimmungSchema = z.object({
  zustimmung: feldSchemata.zustimmung,
});

export const loginSchema = z.object({
  email: feldSchemata.email,
  passwort: z.string().min(1, vm("v.passwort.leer")),
});

export const passwortVergessenSchema = z.object({ email: feldSchemata.email });

/** Registrierung bestätigen: `verifyOtp` braucht Adresse **und** Code. */
export const bestaetigungSchema = z.object({
  email: feldSchemata.email,
  code: feldSchemata.code,
});

/*
 * Passwort-Reset in einem Schritt: Code prüfen und neues Passwort setzen.
 * Die Adresse steht mit im Formular, damit der Vorgang auf einem anderen
 * Gerät zu Ende gebracht werden kann als dem, das ihn angestossen hat.
 */
export const passwortNeuSchema = z
  .object({
    email: feldSchemata.email,
    code: feldSchemata.code,
    passwort: feldSchemata.passwort,
    wiederholung: feldSchemata.wiederholung,
  })
  .refine((werte) => werte.passwort === werte.wiederholung, {
    path: ["wiederholung"],
    error: vm("v.wiederholung.ungleich"),
  });

/**
 * Was aus `user_metadata` zurückkommt, ist nicht vertrauenswürdiger als
 * ein Formularfeld — es stammt aus derselben Quelle. Vor dem RPC-Aufruf
 * geht es deshalb noch einmal durch dieselben Regeln.
 */
export const betriebsMetadatenSchema = z.object({
  betrieb_name: feldSchemata.betrieb_name,
  land: feldSchemata.land,
  vorname: feldSchemata.vorname,
  nachname: feldSchemata.nachname,
});

export type BetriebsMetadaten = z.infer<typeof betriebsMetadatenSchema>;

/**
 * Prüft einen Plan-Wert, bevor damit eine Price-ID nachgeschlagen wird.
 *
 * Gebraucht in Schritt 2 des Steppers, wo die Wahl aus einem Formular
 * kommt und damit so vertrauenswürdig ist wie jedes Formularfeld: ohne
 * diese Prüfung liesse sich ein beliebiger Wert einschleusen.
 *
 * Ohne Angabe gilt `basic` — derselbe Wert, den der Trigger beim Anlegen
 * in `betrieb_abonnements` schreibt. Ein Fehler wäre hier fehl am Platz:
 * es gibt keine sinnvolle Meldung für „dein Plan ist kaputt", und der
 * Einstiegsplan ist die richtige Vorgabe.
 *
 * Bis zum 2026-08-18 reiste der Wert von `/preise` über `user_metadata`
 * bis in den Checkout. Dieser Weg ist mit dem Stepper entfallen: die Wahl
 * steht jetzt unmittelbar vor dem Anlegen des Abos, in derselben Sitzung.
 */
export const planSchema = z.enum(["basic", "pro", "business"]).catch("basic");

/** Schritt 2: die freiwillige UID-Nummer neben der Planwahl. */
export const uidSchema = z.object({ uid: feldSchemata.uid });

/** Prüft einen Wert aus einem Formularfeld oder Query-Parameter. */
export function planOderBasic(wert: unknown): "basic" | "pro" | "business" {
  return planSchema.parse(wert);
}

/* ------------------------------------------------------------------ */
/* Schritt 3: Rollen und Mitarbeiter                                   */
/* ------------------------------------------------------------------ */

/**
 * `rollen` hat `CHECK length(trim(name)) > 0` und `UNIQUE (betrieb_id,
 * name)`. Die Länge deckelt die Datenbank nicht — 60 Zeichen sind hier
 * gesetzt, damit eine Rolle in eine Zeile passt.
 */
export const rollenNameSchema = pflichtText("bez.rollenName", 60);

/**
 * Ziffern einer Telefonnummer, alles andere entfernt.
 *
 * Genau so normalisiert `meine_einladungen()` auf der Gegenseite: eine
 * eingeladene Person findet ihre Zeile über die Ziffernfolge, nicht über
 * die Schreibweise. „+43 660 1234567" und „0043-660-1234567" müssen
 * deshalb zum selben Ergebnis führen.
 */
export function telefonZiffern(wert: string): string {
  return wert.replace(/\D+/gu, "");
}

/** Untergrenze aus `meine_einladungen()` — kürzere Ziffernfolgen findet sie nicht. */
export const TELEFON_MIN_ZIFFERN = 6;

/**
 * Bringt eine getippte Nummer in die Form, in der sie gefunden wird.
 *
 * Am 2026-08-23 im Quelltext von `meine_einladungen()` nachgesehen: die
 * Funktion vergleicht `regexp_replace(telefon, '[^0-9]', '', 'g')` mit
 * denselben Ziffern aus `auth.jwt() ->> 'phone'`. Sie kanonisiert
 * **nichts** — kein Land, keine Vorwahl. Zwei Schreibweisen derselben
 * Nummer sind für sie zwei verschiedene Nummern.
 *
 * Supabase legt die Telefonnummer eines Kontos international und ohne
 * Pluszeichen ab (`436601234567`). Damit die Einladung ankommt, müssen
 * die gespeicherten Ziffern genau das ergeben.
 *
 * Behoben wird hier nur der eindeutige Fall: ein führendes `00` ist die
 * internationale Amtskennzahl und wird zu `+`. Eine nationale Nummer mit
 * einer einzelnen führenden `0` bleibt unangetastet — sie liesse sich nur
 * unter Annahme des Landes umrechnen, und eine stille Annahme über eine
 * Telefonnummer ist schlimmer als eine sichtbare Nachfrage. Dafür sagt
 * der Hinweis am Feld, welche Form gebraucht wird.
 */
export function telefonKanonisch(wert: string): string {
  const getrimmt = wert.trim();
  const ziffern = telefonZiffern(getrimmt);
  if (ziffern.length === 0) return getrimmt;

  if (getrimmt.startsWith("+")) return `+${ziffern}`;
  if (ziffern.startsWith("00")) return `+${ziffern.slice(2)}`;
  return getrimmt;
}

/**
 * Eine Einladung braucht einen Namen und mindestens einen Weg, sie
 * zuzustellen.
 *
 * Beide Kontaktspalten sind in der Datenbank nullable, und
 * `meine_einladungen()` findet die Zeile ausschliesslich über
 * `lower(email)` oder über die normalisierten Telefonziffern. Eine
 * Einladung ohne beides ist deshalb kein Schönheitsfehler, sondern ein
 * Datensatz, den niemand je annehmen kann — diese Regel ist die einzige
 * Verteidigungslinie davor.
 */
export const einladungSchema = z
  .object({
    vorname: feldSchemata.vorname,
    nachname: feldSchemata.nachname,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .transform((wert) => (wert.length === 0 ? null : wert))
      .refine(
        (wert) => wert === null || z.email().safeParse(wert).success,
        vm("v.email.form"),
      ),
    telefon: z
      .string()
      .trim()
      .transform((wert) => (wert.length === 0 ? null : telefonKanonisch(wert)))
      .refine(
        (wert) => wert === null || telefonZiffern(wert).length >= TELEFON_MIN_ZIFFERN,
        vm("v.telefon.kurz", { min: TELEFON_MIN_ZIFFERN }),
      ),
  })
  .refine((daten) => daten.email !== null || daten.telefon !== null, {
    message: vm("v.einladung.kontakt"),
    path: ["email"],
  });

export type Einladung = z.infer<typeof einladungSchema>;

/* ------------------------------------------------------------------ */
/* Anstellungsdaten: Vertrag, Sollstunden, Urlaubsanspruch             */
/* ------------------------------------------------------------------ */

/**
 * Vertragsarten zur Auswahl.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Gespeichert wird die Beschriftung, nicht ein Kürzel.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `mitarbeiter.vertrag_typ` ist `text` **ohne CHECK** — die Datenbank
 * gibt kein Vokabular vor, und am 2026-09-08 war die Spalte in allen 168
 * Zeilen `NULL`. Es gibt also keinen Bestand, an den man sich halten
 * müsste; diese Liste legt das Vokabular erstmals fest.
 *
 * Deshalb steht hier der Anzeigetext selbst und kein `vollzeit`-Kürzel:
 * `manager.tsx:598` in der App rendert den Spaltenwert **ungeprüft** als
 * Wert einer Detailzeile. Ein Kürzel erschiene dort wörtlich als
 * „geringfuegig". Dasselbe Argument wie bei
 * `schicht_vorlagen.bezeichnung` in `CLAUDE.md` — was die App roh
 * ausgibt, muss hier schon lesbar sein.
 *
 * Die Kehrseite ist bewusst in Kauf genommen: eine spätere Umbenennung
 * ist eine Datenänderung, keine Codeänderung. Bei fünf Werten und einem
 * leeren Bestand ist das der günstigere Handel.
 */
export const VERTRAG_TYPEN = [
  "Vollzeit",
  "Teilzeit",
  "Minijob / geringfügig",
  "Aushilfe",
  "Sonstiges",
] as const;

export type VertragTyp = (typeof VERTRAG_TYPEN)[number];

/** Stunden eines vollen Monats — 31 × 24. Obergrenze gegen Vertipper. */
const STUNDEN_MAX = 744;

/** Ein Jahr Urlaub — Obergrenze gegen Vertipper, kein fachliches Limit. */
const URLAUB_TAGE_MAX = 365;

/**
 * Leeres Feld heisst „Spalten-Default", nicht „Fehler".
 *
 * Für die beiden nullbaren Spalten (`vertrag_typ`, `soll_stunden`) ist
 * das `NULL`, für die drei NOT-NULL-Spalten ihr jeweiliger Default aus
 * dem Schema (`0`, `0`, `25`). Eine Regel für alle fünf Felder — sonst
 * müsste man sich je Feld merken, was ein leeres Kästchen bedeutet.
 */
function zahlOderDefault(vorgabe: number) {
  return (wert: unknown) => {
    if (typeof wert !== "string") return wert;
    return wert.trim() === "" ? vorgabe : wert;
  };
}

/**
 * Die fünf Anstellungsfelder, die dieses Repo schreibt.
 *
 * **`max_stunden_hart` fehlt mit Absicht.** DB-Trigger und Solver lesen
 * die Spalte als Wochen- bzw. als Monatsgrenze; kein Wert erfüllt beide.
 * Ausführlich in `docs/backend-befunde-2026-09-07.md`, Punkt 14.
 *
 * **Keine dieser Spalten hat einen CHECK ausser `urlaubsanspruch_tage
 * >= 0`.** Negative Sollstunden liefen ohne diese Prüfung anstandslos in
 * die Tabelle und von dort in die Überstundenrechnung. Die Zod-Regel ist
 * hier also nicht Komfort, sondern die einzige Verteidigung — wie bei
 * `vorname`/`nachname`.
 */
export const anstellungSchema = z.object({
  vertrag_typ: z.preprocess(
    (wert) => (typeof wert === "string" && wert.trim() === "" ? null : wert),
    z.enum(VERTRAG_TYPEN, vm("v.vertrag.wahl")).nullable(),
  ),

  /*
   * Monatswert. Die Eingabe erfolgt in Wochenstunden und wird vor dem
   * Speichern mit 4,33 multipliziert — die Konvention der App
   * (`index.tsx:74`: „weekly-hours × 4.33 figure for a typical month")
   * und die des Bestands (143 Werte, keiner unter 60, 173 = 40 × 4,33).
   * Umgerechnet wird in `monatsstundenAusWoche()` unten, nicht hier:
   * dieses Schema prüft, was tatsächlich in der Spalte landet.
   */
  soll_stunden: z.preprocess(
    (wert) => (typeof wert === "string" && wert.trim() === "" ? null : wert),
    z.coerce
      .number({ error: vm("v.sollstunden.zahl") })
      .int(vm("v.stunden.ganz"))
      .min(0, vm("v.sollstunden.negativ"))
      .max(STUNDEN_MAX, vm("v.stunden.maxMonat", { max: STUNDEN_MAX }))
      .nullable(),
  ),

  toleranz_ueberstunden: z.preprocess(
    zahlOderDefault(0),
    z.coerce
      .number({ error: vm("v.toleranz.zahl") })
      .min(0, vm("v.toleranz.negativ"))
      .max(STUNDEN_MAX, vm("v.stunden.max", { max: STUNDEN_MAX })),
  ),

  /*
   * **Darf negativ sein**, anders als die beiden Felder darüber. Das ist
   * ein Anfangssaldo: wer aus einem anderen System mit Minusstunden
   * herüberkommt, bringt sie mit. Eine Untergrenze bei 0 würde genau den
   * Fall verbieten, für den das Feld existiert.
   */
  ueberstunden_saldo: z.preprocess(
    zahlOderDefault(0),
    z.coerce
      .number({ error: vm("v.saldo.zahl") })
      .min(-STUNDEN_MAX, vm("v.stunden.min", { max: STUNDEN_MAX }))
      .max(STUNDEN_MAX, vm("v.stunden.max", { max: STUNDEN_MAX })),
  ),

  /*
   * Die einzige der fünf Spalten mit einem eigenen CHECK
   * (`urlaubsanspruch_tage >= 0`). Hier trotzdem geprüft: eine
   * abgewiesene Eingabe mit lesbarem Satz ist besser als ein
   * fehlschlagender Write mit Postgres-Rohmeldung.
   */
  urlaubsanspruch_tage: z.preprocess(
    zahlOderDefault(25),
    z.coerce
      .number({ error: vm("v.urlaubstage.zahl") })
      .int(vm("v.tage.ganz"))
      .min(0, vm("v.urlaubstage.negativ"))
      .max(URLAUB_TAGE_MAX, vm("v.urlaubstage.max", { max: URLAUB_TAGE_MAX })),
  ),
});

export type AnstellungEingabe = z.infer<typeof anstellungSchema>;

/** Der Faktor, mit dem die App Wochen- in Monatsstunden umrechnet: 52/12. */
export const WOCHEN_PRO_MONAT = 4.33;

/**
 * Wochenstunden → Monatswert für `soll_stunden`.
 *
 * Gerundet auf ganze Stunden, damit die neuen Werte zum Bestand passen
 * (40 h/Woche → 173, nicht 173,2). Leere Eingabe bleibt leer.
 */
export function monatsstundenAusWoche(wochenstunden: string): string {
  const roh = wochenstunden.trim();
  if (roh === "") return "";
  const zahl = Number(roh.replace(",", "."));
  if (!Number.isFinite(zahl)) return roh; // Zod meldet es gleich lesbar
  return String(Math.round(zahl * WOCHEN_PRO_MONAT));
}

/** Monatswert → Wochenstunden, für die Anzeige im Formular. */
export function wochenstundenAusMonat(sollStunden: number | null): string {
  if (sollStunden === null) return "";
  return String(Math.round((sollStunden / WOCHEN_PRO_MONAT) * 10) / 10);
}

/* ------------------------------------------------------------------ */
/* Schritt 4: Schichtvorlagen                                          */
/* ------------------------------------------------------------------ */

/**
 * `schicht_vorlagen.bezeichnung` ist nullable, und die App rendert sie
 * ungeprüft — ein NULL erscheint dort als das Wort „null". Hier ist sie
 * deshalb Pflicht.
 */
export const vorlagenBezeichnungSchema = pflichtText("bez.bezeichnung", 60);

/** Dieselbe Form wie `validTime` in `manager.tsx`: 00:00 bis 23:59. */
const UHRZEIT = /^([01]\d|2[0-3]):[0-5]\d$/u;

const uhrzeitSchema = z
  .string()
  .trim()
  .regex(UHRZEIT, vm("v.uhrzeit.form"));

/**
 * Eine Schichtvorlage.
 *
 * `wochentag` ist montagsbasiert (0 = Montag) — die Begründung und die
 * drei Belegstellen im App-Quelltext stehen in `src/lib/schichten.ts`.
 * Der CHECK in der Datenbank prüft nur den Bereich 0..6 und fängt eine
 * Verwechslung mit der JS-Konvention nicht ab.
 *
 * `chk_vorlage_zeiten_verschieden` verbietet ausschliesslich
 * `start = end`. Eine Nachtschicht über Mitternacht (22:00 bis 06:00) ist
 * also erlaubt und ausdrücklich gewollt — hier wird deshalb **nicht**
 * geprüft, ob das Ende nach dem Beginn liegt.
 */
export const vorlagenSchema = z
  .object({
    bezeichnung: vorlagenBezeichnungSchema,
    wochentag: z.coerce
      .number()
      .int(vm("v.wochentag.wahl"))
      .min(0, vm("v.wochentag.wahl"))
      .max(6, vm("v.wochentag.wahl")),
    start_zeit: uhrzeitSchema,
    end_zeit: uhrzeitSchema,
  })
  .refine((daten) => daten.start_zeit !== daten.end_zeit, {
    message: vm("v.zeiten.beginnEnde"),
    path: ["end_zeit"],
  });

export type VorlagenEingabe = z.infer<typeof vorlagenSchema>;

/** `mindestanzahl smallint CHECK >= 0`; 0 heisst „diese Rolle wird hier nicht gebraucht". */
export const mindestanzahlSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(99);

/* ------------------------------------------------------------------ */
/* Mitteilungen                                                        */
/* ------------------------------------------------------------------ */

/**
 * Anlegbare Kategorien — bewusst ohne `dokument`. Der Parity-Audit vom
 * 2026-08-31 fand dafür keinen Compose-Weg in der Referenz-App: die
 * Kategorie ist im RPC und in der RLS zwar vorgesehen, aber
 * `compose.tsx` bietet sie nie zur Auswahl an. Ohne Referenzverhalten
 * wäre ein Formular dafür eine neue Produktentscheidung, keine
 * Portierung.
 */
export const MITTEILUNGS_TYPEN = ["allgemein", "aufgabenliste", "umfrage"] as const;
export type ErstellbarerTyp = (typeof MITTEILUNGS_TYPEN)[number];

export const PRIORITAETEN = ["normal", "wichtig", "dringend"] as const;

const MITTEILUNG_TEXT_LIMIT = 500;

/**
 * Eine Mitteilung — Ankündigung, Checkliste oder Umfrage.
 *
 * Die Pflichtfelder je Kategorie spiegeln `canPost` in `compose.tsx` der
 * App: Titel immer Pflicht, eine Checkliste mindestens ein Punkt, eine
 * Umfrage mindestens zwei Optionen. `ankuendigung_erstellen` selbst prüft
 * keins davon — diese Schicht ist die einzige Verteidigung.
 */
export const mitteilungSchema = z
  .object({
    typ: z.enum(MITTEILUNGS_TYPEN, vm("v.kategorie.wahl")),
    titel: pflichtText("bez.titel", 150),
    text: z
      .string()
      .trim()
      .max(MITTEILUNG_TEXT_LIMIT, vm("v.zeichen.max", { max: MITTEILUNG_TEXT_LIMIT }))
      .transform((wert) => (wert.length > 0 ? wert : null))
      .nullable(),
    prioritaet: z.enum(PRIORITAETEN).catch("normal"),
    items: z
      .array(z.string())
      .transform((liste) => liste.map((eintrag) => eintrag.trim()).filter((eintrag) => eintrag.length > 0)),
    optionen: z
      .array(z.string())
      .transform((liste) => liste.map((eintrag) => eintrag.trim()).filter((eintrag) => eintrag.length > 0)),
    mehrfachauswahl: z.boolean(),
    anonym: z.boolean(),
  })
  .refine((daten) => daten.typ !== "aufgabenliste" || daten.items.length >= 1, {
    message: vm("v.checkliste.leer"),
    path: ["items"],
  })
  .refine((daten) => daten.typ !== "umfrage" || daten.optionen.length >= 2, {
    message: vm("v.umfrage.leer"),
    path: ["optionen"],
  });

export type MitteilungEingabe = z.infer<typeof mitteilungSchema>;

/* ------------------------------------------------------------------ */
/* Tausch                                                              */
/* ------------------------------------------------------------------ */

/**
 * Eine Schicht zum Tausch anbieten. Spiegel von `compose.tsx`
 * (`aenderungswunsch`): Pflicht ist nur die Schicht selbst, Wunschtage
 * sind optional. `tausch_anbieten()` kappt serverseitig ohnehin auf drei
 * und verwirft Tage in der Vergangenheit — die Drei-Tage-Grenze steht
 * hier trotzdem, damit ein manipuliertes Formular nicht beliebig viele
 * Werte durchreicht, bevor die RPC sie stillschweigend kürzt.
 */
/**
 * `tausch_anbieten()` kappt serverseitig auf drei Wunschtage. Die Zahl
 * steht hier als Konstante, weil sie seit der Umstellung auf
 * Meldungsschlüssel an zwei Stellen gebraucht wird — in der Regel und im
 * Meldungstext. Zwei Literale wären zwei Gelegenheiten, sie
 * auseinanderlaufen zu lassen.
 */
const WUNSCHTAGE_MAX = 3;

export const tauschAngebotSchema = z.object({
  instanzId: z.string().min(1, vm("v.schicht.wahl")),
  praeferenzTage: z
    .array(z.string().regex(DATUM_REGEX, vm("v.datum.ungueltig")))
    .max(WUNSCHTAGE_MAX, vm("v.wunschtage.max")),
});

export type TauschAngebotEingabe = z.infer<typeof tauschAngebotSchema>;

/* ------------------------------------------------------------------ */
/* Notfall                                                             */
/* ------------------------------------------------------------------ */

const NOTFALL_GRUND_LIMIT = 500;

/**
 * Eine eigene Schicht als Notfall melden. Spiegel von `EmergencySection`
 * in `scheduling.tsx`: Pflicht ist nur die Schicht, der Grund ist frei
 * und optional — `notfall_melden()` selbst prüft nur `nullif(btrim(…),
 * '')`, kein Limit. Die Obergrenze hier ist eine eigene Vorsichtsmassnahme,
 * kein Spiegel eines Referenzwerts.
 */
export const notfallMeldungSchema = z.object({
  zuweisungId: z.string().min(1, vm("v.schicht.wahl")),
  grund: z
    .string()
    .trim()
    .max(NOTFALL_GRUND_LIMIT, vm("v.zeichen.max", { max: NOTFALL_GRUND_LIMIT }))
    .transform((wert) => (wert.length > 0 ? wert : null))
    .nullable(),
});

export type NotfallMeldungEingabe = z.infer<typeof notfallMeldungSchema>;

/* ------------------------------------------------------------------ */
/* Urlaub                                                              */
/* ------------------------------------------------------------------ */


/**
 * `urlaub_kommentar_check` und `urlaub_begruendung_check` erlauben beide
 * höchstens 50 Zeichen — dieselbe Grenze wie in `scheduling.tsx`
 * (Kommentarfeld) und `manager.tsx` (Ablehnungsgrund), jeweils mit
 * `maxLength={50}`.
 */
const URLAUB_KOMMENTAR_LIMIT = 50;

/**
 * Ein Urlaubsantrag. Spiegel des Bereichs-Pickers in `VacationSection`:
 * Pflicht sind nur die beiden Daten, der Kommentar ist frei. Die
 * eigentlichen Sperren — Vergangenheit, Kontingent, bereits verplante
 * Schichten, veröffentlichter Plan — prüft ausschliesslich
 * `urlaub_beantragen()` selbst; hier wird nur die Reihenfolge der Daten
 * geprüft, damit eine offensichtlich falsche Eingabe nicht erst am RPC
 * scheitert.
 */
export const urlaubAntragSchema = z
  .object({
    von: z.string().regex(DATUM_REGEX, vm("v.datum.start")),
    bis: z.string().regex(DATUM_REGEX, vm("v.datum.ende")),
    kommentar: z
      .string()
      .trim()
      .max(URLAUB_KOMMENTAR_LIMIT, vm("v.zeichen.max", { max: URLAUB_KOMMENTAR_LIMIT }))
      .transform((wert) => (wert.length > 0 ? wert : null))
      .nullable(),
  })
  .refine((daten) => daten.bis >= daten.von, {
    message: vm("v.datum.reihenfolge"),
    path: ["bis"],
  });

export type UrlaubAntragEingabe = z.infer<typeof urlaubAntragSchema>;

/** Chef-Entscheidung über einen Antrag — Spiegel von `decide()` in `manager.tsx`. */
export const urlaubEntscheidungSchema = z.object({
  urlaubId: z.string().min(1, vm("v.antrag.weg")),
  status: z.enum(["approved", "denied"], vm("v.entscheidung.ungueltig")),
  begruendung: z
    .string()
    .trim()
    .max(URLAUB_KOMMENTAR_LIMIT, vm("v.zeichen.max", { max: URLAUB_KOMMENTAR_LIMIT }))
    .transform((wert) => (wert.length > 0 ? wert : null))
    .nullable(),
});

export type UrlaubEntscheidungEingabe = z.infer<typeof urlaubEntscheidungSchema>;

/* ------------------------------------------------------------------ */
/* Verfügbarkeit                                                       */
/* ------------------------------------------------------------------ */

/**
 * Wiederkehrende Wünsche werden gesammelt und erst auf „Speichern"
 * geschrieben — anders als `toggleRecur()` in `scheduling.tsx`, das pro
 * Klick sofort schreibt. Entscheidung des Nutzers vom 2026-09-01: erst
 * so viele Wünsche wie gewünscht auswählen, dann in einem Zug speichern
 * oder verwerfen. `praeferenz: null` heisst „diesen Wunsch entfernen".
 */
/** Obergrenze eines Sammel-Speicherns — schützt vor manipulierten Formularen. */
const PRAEFERENZEN_MAX = 500;

export const wiederkehrendePraeferenzenSchema = z
  .array(
    z.object({
      schichtVorlageId: z.string().min(1, vm("v.vorlage.weg")),
      praeferenz: z.enum(["gerne", "ungerne"]).nullable(),
    }),
  )
  .max(PRAEFERENZEN_MAX, vm("v.aenderungen.max"));

export type WiederkehrendePraeferenzenEingabe = z.infer<typeof wiederkehrendePraeferenzenSchema>;

/** Spiegel von `confirmDate()`/`toggleStaged()` — Vorlage, Datum, Wunsch. */
export const tagesPraeferenzSchema = z.object({
  schichtVorlageId: z.string().min(1, vm("v.vorlage.weg")),
  datum: z.string().regex(DATUM_REGEX, vm("v.datum.ungueltig")),
  praeferenz: z.enum(["gerne", "ungerne"], vm("v.wunsch.ungueltig")),
});

export type TagesPraeferenzEingabe = z.infer<typeof tagesPraeferenzSchema>;

/** Spiegel von `remove()` — nur Vorlage und Datum, kein Wunsch nötig. */
export const tagesPraeferenzLoeschenSchema = z.object({
  schichtVorlageId: z.string().min(1, vm("v.vorlage.weg")),
  datum: z.string().regex(DATUM_REGEX, vm("v.datum.ungueltig")),
});

export type TagesPraeferenzLoeschenEingabe = z.infer<typeof tagesPraeferenzLoeschenSchema>;

/* ------------------------------------------------------------------ */
/* Manuelle Schichtzuweisung                                          */
/* ------------------------------------------------------------------ */

/** Spiegel von `assign()` in `shift/[id].tsx` — Schicht, Person, Rolle. */
export const schichtZuweisenSchema = z.object({
  instanzId: z.string().min(1, vm("v.schicht.weg")),
  mitarbeiterId: z.string().min(1, vm("v.person.weg")),
  rolleId: z.string().min(1, vm("v.rolle.wahl")),
});

export type SchichtZuweisenEingabe = z.infer<typeof schichtZuweisenSchema>;

/** Spiegel von `unassign()` — nur Schicht und Person, keine Rolle nötig. */
export const schichtZuweisungEntfernenSchema = z.object({
  instanzId: z.string().min(1, vm("v.schicht.weg")),
  mitarbeiterId: z.string().min(1, vm("v.person.weg")),
});

export type SchichtZuweisungEntfernenEingabe = z.infer<typeof schichtZuweisungEntfernenSchema>;

/* ------------------------------------------------------------------ */
/* Schicht bearbeiten                                                  */
/* ------------------------------------------------------------------ */

const ZEIT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/u;
const SCHICHT_KOMMENTAR_LIMIT = 140;

/**
 * Spiegel von `saveDetails()` in `shift/[id].tsx` — Datum, Start, Ende,
 * Kommentar. Einzige Prüfung dort ist `start !== end` als `"HH:mm"`-Text
 * (Übernacht-Schichten sind erlaubt); dieselbe Prüfung steht auch als
 * `chk_instanz_zeiten_verschieden` in der Datenbank. Anders als die App
 * — die den Schreibfehler gar nicht abfragt — wird hier geprüft und bei
 * einem Fehler etwas Ehrliches gesagt statt „Gespeichert" zu zeigen.
 */
export const schichtFelderSchema = z
  .object({
    instanzId: z.string().min(1, vm("v.schicht.weg")),
    datum: z.string().regex(DATUM_REGEX, vm("v.datum.ungueltig")),
    startZeit: z.string().regex(ZEIT_REGEX, vm("v.uhrzeit.ungueltig")),
    endZeit: z.string().regex(ZEIT_REGEX, vm("v.uhrzeit.ungueltig")),
    kommentar: z
      .string()
      .trim()
      .max(SCHICHT_KOMMENTAR_LIMIT, vm("v.zeichen.max", { max: SCHICHT_KOMMENTAR_LIMIT }))
      .transform((wert) => (wert.length > 0 ? wert : null))
      .nullable(),
  })
  .refine((daten) => daten.startZeit !== daten.endZeit, {
    message: vm("v.zeiten.startEnde"),
    path: ["endZeit"],
  });

export type SchichtFelderEingabe = z.infer<typeof schichtFelderSchema>;

/** Spiegel von `deleteShift()` — nur die ID, der Rest ist RLS/Cascade. */
export const schichtLoeschenSchema = z.object({
  instanzId: z.string().min(1, vm("v.schicht.weg")),
});

export type SchichtLoeschenEingabe = z.infer<typeof schichtLoeschenSchema>;

/* ------------------------------------------------------------------ */
/* Betriebseinstellungen                                               */
/* ------------------------------------------------------------------ */

/**
 * Die beiden Sprachen, die `betriebs_einstellungen.sprache_standard`
 * zulaesst — der CHECK auf der Spalte kennt genau `'de'` und `'en'`.
 *
 * **Die App unterstuetzt sieben** (`de`, `en`, `es`, `fr`, `ru`, `tr`,
 * `uk` in `src/i18n/locales/`). Der CHECK ist also enger als das
 * Produkt. Erweitern hiesse Schema aendern, und das passiert von hier
 * aus nicht — gemeldet, nicht repariert.
 */
export const SPRACHEN = [
  { code: "de", name: "Deutsch" },
  { code: "en", name: "Englisch" },
] as const;

export type SpracheCode = (typeof SPRACHEN)[number]["code"];

/** Grenzen von `verfuegbarkeit_deadline_tag`, identisch zum CHECK. */
export const DEADLINE_MIN = 1;
export const DEADLINE_MAX = 28;

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Die sieben schreibbaren Felder von `betriebs_einstellungen`.
 *
 * Die Schluessel sind bewusst die Spaltennamen und nicht camelCase: was
 * hier herauskommt, geht unveraendert als `update()`-Nutzlast an
 * PostgREST. Eine Umbenennung dazwischen waere eine zweite Stelle, an
 * der ein Feldname falsch sein kann.
 *
 * Nicht dabei: `betrieb_id` (Schluessel, kommt aus der Position),
 * `aktualisiert_am` (setzt der BEFORE-UPDATE-Trigger) und
 * `weitere_einstellungen` (leeres jsonb-Erweiterungsfeld ohne
 * Verbraucher).
 */
export const einstellungenSchema = z.object({
  sprache_standard: z.enum(["de", "en"], vm("v.sprache.wahl")),
  verfuegbarkeit_deadline_tag: z.coerce
    .number({ error: vm("v.zahl.pflicht") })
    .int(vm("v.tage.ganz"))
    .min(DEADLINE_MIN, vm("v.deadline.min", { min: DEADLINE_MIN }))
    .max(DEADLINE_MAX, vm("v.deadline.max", { max: DEADLINE_MAX })),
  notfall_stunden_anrechnen: z.boolean(),
  mitarbeiter_sehen_andere_schichten: z.boolean(),
  mitarbeiter_sehen_andere_mitarbeiter: z.boolean(),
  /*
   * Leer heisst `null`, nicht `""`: die Spalte ist `date NULL` ohne
   * Default und ohne CHECK, und ein Leerstring waere fuer Postgres ein
   * ungueltiges Datum statt „nicht gesetzt".
   */
  abrechnung_bis: z
    .string()
    .trim()
    .refine((wert) => wert === "" || ISO_DATUM.test(wert), vm("v.datum.pruefen"))
    .transform((wert) => (wert === "" ? null : wert))
    .nullable(),
  ask_chef_for_shift_switch: z.boolean(),
});

export type EinstellungenEingabe = z.infer<typeof einstellungenSchema>;
