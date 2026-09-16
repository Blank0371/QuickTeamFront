import { cookies, headers } from "next/headers";

import { PFAD_KOPFZEILE } from "@/lib/dashboard/pfad";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Die aktive Position im Dashboard.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Eine Anmeldung ist nicht eine Person in einem Betrieb.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `mitarbeiter` ist keine Personentabelle, sondern eine Anstellungs-
 * tabelle: eine Zeile je Beschäftigung. Dieselbe `auth_id` kann mehrere
 * halten — in verschiedenen Betrieben und, was leicht übersehen wird,
 * auch **mehrfach im selben Betrieb**. Der Testzugang des App-Entwicklers
 * ist genau so gebaut (drei Zeilen in Testbetrieb 12: Chef, Tim, Anna).
 *
 * Fast jeder RPC nimmt deshalb ein `p_mitarbeiter_id` entgegen und prüft
 * es gegen `auth.uid()`. Ohne eine festgelegte Position wüsste das
 * Dashboard bei jedem Aufruf nicht, wer gerade handelt.
 *
 * **Warum ein Cookie und nicht der Speicher wie in der App.** `auth.tsx`
 * hält die Position in einem React-Context; `TESTING.md` warnt deshalb
 * ausdrücklich davor, im Web-Build eine URL direkt anzusteuern — ein
 * Reload verliert die Auswahl und wirft auf den Auswahlbildschirm zurück.
 * Im Browser ist genau das der Normalfall: jeder Seitenaufruf ist ein
 * Reload, und Server Components rendern, bevor irgendein Context
 * existiert. Die Position muss also serverseitig lesbar sein, bevor die
 * erste Zeile HTML entsteht.
 *
 * **Das Cookie ist ein Hinweis, kein Nachweis.** Es trägt eine ID, die
 * vom Client kommt, und wird bei jedem Zugriff gegen die Datenbank
 * geprüft: gehört die Zeile zu dieser Anmeldung, ist sie aktiv, ist sie
 * nicht anonymisiert. `TESTING.md` §5.2 macht daraus eine Regel für
 * dieses Projekt — jede hereingereichte `p_*_id` wird gegen `auth.uid()`
 * neu abgeleitet, nie geglaubt. Ein manipuliertes Cookie bewirkt hier
 * nichts, weil die Liste der zulässigen Positionen ohnehin aus der DB
 * kommt und die geforderte ID nur darin gesucht wird.
 */

/** Name des Cookies. Kurz, ohne Präfix-Magie, damit er lesbar bleibt. */
const COOKIE = "qt_position";

/** Ein Jahr. Länger als jede Session, kürzer als „für immer". */
const COOKIE_MAX_ALTER = 60 * 60 * 24 * 365;


export type RolleTyp = "chef" | "mitarbeiter";

export type Position = {
  /** `mitarbeiter.id` — der Wert, den die RPCs als `p_mitarbeiter_id` wollen. */
  mitarbeiterId: string;
  betriebId: string;
  betriebName: string;
  rolleTyp: RolleTyp;
  /** Anzeigename der Anstellung, nicht des Kontos. */
  name: string;
};

export type Einladung = {
  mitarbeiterId: string;
  betriebId: string;
  betriebName: string;
  rolleTyp: RolleTyp;
};

/** Zeile, wie PostgREST sie mit dem eingebetteten Betriebsnamen liefert. */
type PositionsZeile = {
  id: string;
  betrieb_id: string;
  rolle_typ: string;
  vorname: string | null;
  nachname: string | null;
  betriebe: { name: string } | null;
};

function istRolleTyp(wert: string): wert is RolleTyp {
  return wert === "chef" || wert === "mitarbeiter";
}

/**
 * Alle Anstellungen dieser Anmeldung, in denen wirklich gearbeitet wird.
 *
 * Die Abfrage ist absichtlich dieselbe wie in `select.tsx` der App —
 * gleiche Filter, gleiche Einbettung, gleiche Sortierung nach
 * Betriebsnamen. Zwei Oberflächen, die dieselbe Frage verschieden
 * beantworten, sind ein Fehler, der erst beim Vergleich auffällt.
 *
 * `status = 'aktiv'` schliesst Eingeladene aus: deren Zeile existiert
 * zwar, aber bis `einladung_annehmen()` gelaufen ist, gehört sie
 * niemandem — `auth_id` ist dort noch `null`. Eingeladene kommen über
 * `holeEinladungen()`.
 */
export async function holePositionen(
  supabase: SupabaseServerClient,
  authId: string,
): Promise<Position[]> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select("id, betrieb_id, rolle_typ, vorname, nachname, betriebe(name)")
    .eq("auth_id", authId)
    .eq("status", "aktiv")
    .is("anonymisiert_am", null)
    .returns<PositionsZeile[]>();

  if (error) {
    console.error(`[dashboard] holePositionen: ${error.message}`);
    throw new Error("Die Betriebszugehörigkeiten konnten nicht geladen werden.");
  }

  return data
    .filter((zeile) => istRolleTyp(zeile.rolle_typ))
    .map((zeile) => ({
      mitarbeiterId: zeile.id,
      betriebId: zeile.betrieb_id,
      betriebName: zeile.betriebe?.name ?? "Betrieb ohne Namen",
      rolleTyp: zeile.rolle_typ as RolleTyp,
      name: `${zeile.vorname ?? ""} ${zeile.nachname ?? ""}`.trim(),
    }))
    /*
     * Nach Betrieb, dann nach Name. Die zweite Stufe ist kein Feinschliff:
     * am 2026-08-26 gegen die Live-DB gesehen, dass der Testzugang drei
     * Anstellungen im **selben** Betrieb hält (Chef, Anna, Tim). Bei
     * gleichem Betriebsnamen entschiede sonst die Reihenfolge, in der
     * Postgres die Zeilen zurückgibt — und die ist ohne `order by` nicht
     * zugesichert. Eine Liste, die bei jedem Laden anders sortiert ist,
     * lädt zum Verklicken ein, gerade weil die Einträge sich nur in der
     * Unterzeile unterscheiden.
     */
    .sort(
      (a, b) =>
        a.betriebName.localeCompare(b.betriebName, "de") ||
        a.name.localeCompare(b.name, "de") ||
        a.mitarbeiterId.localeCompare(b.mitarbeiterId),
    );
}

/**
 * Offene Einladungen.
 *
 * `meine_einladungen()` liefert den Betriebsnamen selbst mit, und das ist
 * kein Komfort: `betrieb_select` lässt nur Betriebe durch, die in
 * `meine_betriebe()` stehen, und dort steht nur, wo man **aktiv** ist.
 * Ein eingeladener Betrieb ist über die Tabelle also gar nicht lesbar.
 * Wer den Namen aus `betriebe` nachladen will, bekommt null Zeilen.
 */
export async function holeEinladungen(
  supabase: SupabaseServerClient,
): Promise<Einladung[]> {
  const { data, error } = await supabase.rpc("meine_einladungen");

  if (error) {
    console.error(`[dashboard] meine_einladungen: ${error.message}`);
    return [];
  }

  const zeilen = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  return zeilen.flatMap((zeile) => {
    const rolleTyp = String(zeile["rolle_typ"] ?? "");
    if (!istRolleTyp(rolleTyp)) return [];
    return [
      {
        mitarbeiterId: String(zeile["mitarbeiter_id"] ?? ""),
        betriebId: String(zeile["betrieb_id"] ?? ""),
        betriebName: String(zeile["betrieb_name"] ?? ""),
        rolleTyp,
      },
    ];
  });
}

/**
 * Der Pfad, den diese Anfrage angesteuert hat — aus der Kopfzeile, die
 * die Middleware gesetzt hat. `null`, wenn sie fehlt.
 *
 * Steht hier statt in `pfad.ts`, weil nur diese eine Zeile `headers()`
 * braucht; alles daneben ist reine Zeichenkettenarbeit und muss auch im
 * Browser-Bundle laufen können.
 */
export async function angefragterPfad(): Promise<string | null> {
  const kopf = await headers();
  return kopf.get(PFAD_KOPFZEILE);
}

/** Die im Cookie hinterlegte Wunsch-Position — ungeprüft. */
export async function gewuenschtePositionsId(): Promise<string | null> {
  const laden = await cookies();
  return laden.get(COOKIE)?.value ?? null;
}

/**
 * Die aktive Position, aus der Liste der zulässigen ausgewählt.
 *
 * Nimmt die Liste entgegen, statt sie selbst zu holen: der Aufrufer
 * braucht sie ohnehin, um „mehrere Positionen" von „genau eine"
 * unterscheiden zu können, und zweimal dieselbe Abfrage zu schicken wäre
 * eine Gelegenheit, zwei verschiedene Antworten zu bekommen.
 *
 * Bei genau einer Position wird sie auch ohne Cookie genommen. Das ist
 * der Normalfall — ein Chef, ein Lokal — und für ihn soll keine Auswahl
 * zwischen einer einzigen Möglichkeit stehen.
 */
export function waehleAktive(
  positionen: readonly Position[],
  gewuenscht: string | null,
): Position | null {
  if (positionen.length === 0) return null;

  if (gewuenscht !== null) {
    const treffer = positionen.find((p) => p.mitarbeiterId === gewuenscht);
    if (treffer) return treffer;
    /*
     * Cookie zeigt ins Leere: abgemeldet und mit anderem Konto wieder
     * angemeldet, Anstellung beendet, Zeile anonymisiert. Kein Fehler,
     * sondern ein veralteter Hinweis — es wird still auf die
     * Normalfall-Regel zurückgefallen.
     */
  }

  return positionen.length === 1 ? (positionen[0] ?? null) : null;
}

/**
 * Schreibt die Auswahl. Nur aus Server Actions und Route Handlern
 * aufrufbar — Server Components dürfen Cookies nicht setzen.
 *
 * `httpOnly`, weil kein Client-Code den Wert braucht: gelesen wird er
 * ausschliesslich beim Rendern auf dem Server. `lax` reicht, es geht um
 * eine Ansichtsauswahl, nicht um eine Berechtigung — die entsteht in der
 * Datenbank.
 */
export async function setzeAktivePosition(mitarbeiterId: string): Promise<void> {
  const laden = await cookies();
  laden.set(COOKIE, mitarbeiterId, {
    httpOnly: true,
    sameSite: "lax",
    secure: await ueberHttps(),
    path: "/",
    maxAge: COOKIE_MAX_ALTER,
  });
}

/**
 * Läuft diese Anfrage über HTTPS?
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das nicht mehr an `NODE_ENV` hängt.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Hier stand `secure: process.env.NODE_ENV === "production"`. Das ist
 * fast immer richtig und in genau einem Fall falsch — und dieser Fall
 * war am 2026-09-07 der gemeldete Fehler: ein Produktionsbuild, der über
 * schlichtes `http://` erreicht wird. `next build` setzt `NODE_ENV` auf
 * `production`, das Cookie geht mit `Secure` raus, und der Browser
 * **verwirft es stillschweigend**. Kein Fehler, keine Meldung — nur ein
 * Cookie, das nie ankommt.
 *
 * Die Folge ist genau die gemeldete Schleife, und sie trifft
 * ausschliesslich Konten mit mehreren Anstellungen: bei einer einzigen
 * greift die Normalfall-Regel in `waehleAktive()` und das Cookie wird gar
 * nicht gebraucht. Bei mehreren entscheidet es allein — fehlt es, ist
 * jeder Seitenaufruf wieder „keine Position gewählt". Die Auswahl selbst
 * sieht dabei aus, als hätte sie funktioniert: die Server Action liest
 * beim Rendern der Weiterleitung ihren eigenen, noch ungespeicherten
 * Wert aus dem Cookie-Speicher des laufenden Requests. Die Übersicht
 * erscheint also einmal, und erst der nächste Klick fällt zurück.
 *
 * `Secure` über `localhost` lassen Chrome und Firefox als Ausnahme
 * durchgehen, Safari nicht — und über eine LAN-Adresse oder einen
 * Hostnamen im Testnetz keiner von beiden. „Läuft bei mir" ist hier also
 * keine Nachlässigkeit, sondern eine echte Eigenschaft des Browsers.
 *
 * Gefragt wird deshalb nach dem tatsächlichen Protokoll statt nach der
 * Bauart. `x-forwarded-proto` setzt jeder Proxy, hinter dem diese
 * Anwendung in Produktion steht (Vercel, Netlify); fehlt die Kopfzeile,
 * läuft niemand dazwischen und es ist direktes HTTP. Damit ist das
 * Cookie in Produktion weiterhin `Secure` und lokal weiterhin setzbar —
 * ohne dass eine Umgebungsvariable die Wahrheit über die Verbindung
 * behaupten muss.
 */
async function ueberHttps(): Promise<boolean> {
  const kopf = await headers();
  const proto = kopf.get("x-forwarded-proto");
  if (proto === null) return false;
  // Proxy-Ketten hängen an: „https,http". Der erste Eintrag ist der Browser.
  return proto.split(",")[0]?.trim().toLowerCase() === "https";
}

/** Vergisst die Auswahl — beim Abmelden und beim bewussten Wechseln. */
export async function loescheAktivePosition(): Promise<void> {
  const laden = await cookies();
  laden.delete(COOKIE);
}
