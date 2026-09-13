/**
 * Der angefragte Pfad als Kopfzeile.
 *
 * Next gibt einer Server Component ihre eigene Adresse nicht — es gibt
 * kein `usePathname` auf dem Server, und `headers()` trägt von sich aus
 * nichts Verlässliches. Das Dashboard-Tor braucht sie trotzdem: es muss
 * beim Umleiten auf die Positionswahl sagen können, wohin es eigentlich
 * gehen sollte, sonst landet jeder nach der Wahl auf der Übersicht statt
 * auf dem Bereich, den er angeklickt hat.
 *
 * Gesetzt wird die Kopfzeile in `src/lib/supabase/middleware.ts`,
 * gelesen in `src/lib/dashboard/position.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum eine eigene Datei für eine einzige Zeichenkette.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Trennung wie bei `soft-launch.ts` / `soft-launch-riegel.ts`
 * und aus demselben Grund: die schreibende Seite hängt an
 * `src/middleware.ts` und läuft damit in der Edge-Umgebung, die lesende
 * Seite steht in `position.ts` und importiert `next/headers` — dort hat
 * es nichts zu suchen. Stünde die Konstante bei einem der beiden, zöge
 * der Import die falsche Laufzeit mit; als Literal an zwei Stellen wäre
 * sie eine Gelegenheit, sich zu vertippen, ohne dass etwas wirft.
 */
export const PFAD_KOPFZEILE = "x-qt-pfad";

/* ------------------------------------------------------------------ */
/* Wohin nach der Auswahl                                              */
/* ------------------------------------------------------------------ */

/**
 * Name des Parameters, der das eigentliche Ziel über die Positionswahl
 * hinweg trägt.
 *
 * Steht hier und nicht in `position.ts`, weil ihn auch die Wahlliste
 * braucht — und die ist eine Client-Komponente. Ein Import aus
 * `position.ts` zöge `next/headers` ins Browser-Bundle; der Dev-Server
 * bricht dann mit „You're importing a component that needs
 * next/headers" ab. Alles unter dieser Überschrift ist deshalb bewusst
 * frei von Laufzeit-Abhängigkeiten: reine Funktionen auf Zeichenketten,
 * auf beiden Seiten der Grenze benutzbar.
 */
export const ZIEL_PARAMETER = "weiter";

/** Das Ziel, wenn keins mitgereicht wurde oder es nicht taugt. */
const STANDARD_ZIEL = "/dashboard";

/**
 * Prüft ein mitgereichtes Ziel, bevor darauf umgeleitet wird.
 *
 * Der Wert kommt aus einem Formularfeld und ist damit so
 * vertrauenswürdig wie jedes andere: ungeprüft wäre `weiter` eine offene
 * Weiterleitung — ein Link auf unsere eigene Anmeldeseite, der nach dem
 * Klick auf einer fremden Domain endet. Erlaubt ist deshalb nur, was
 * innerhalb des Dashboards liegt.
 *
 * `//fremde.tld` fängt die erste Prüfung ab: das ist eine
 * protokollrelative URL, die trotz führendem Schrägstrich das Ziel
 * wechselt. `/\` tut in einigen Browsern dasselbe.
 *
 * Die Positionswahl selbst ist als Ziel ausgeschlossen — sie führte
 * unmittelbar wieder auf sich selbst zurück.
 *
 * Erlaubt sind neben dem Dashboard auch die Schritte des
 * Einrichtungs-Steppers (`/einrichtung…`): das Zustimmungs-Tor wird seit
 * dem 2026-09-12 auch aus dem Stepper heraus angesprungen — schlug das
 * Speichern der Zustimmung bei der Registrierung fehl, verlangt der Stepper
 * sie nach, bevor Mitarbeiterdaten verarbeitet werden (Punkt 13). Danach
 * muss der Weg zurück in den Stepper führen, nicht pauschal ins Dashboard.
 * Beides sind erste-Partei-Pfade; eine offene Weiterleitung entsteht nicht.
 */
export function sicheresZiel(roh: string | null | undefined): string {
  if (!roh) return STANDARD_ZIEL;
  if (roh.startsWith("//") || roh.startsWith("/\\")) return STANDARD_ZIEL;

  const istDashboard = roh === "/dashboard" || roh.startsWith("/dashboard/");
  const istEinrichtung = roh === "/einrichtung" || roh.startsWith("/einrichtung/");
  if (!istDashboard && !istEinrichtung) return STANDARD_ZIEL;

  /*
   * Beide Zwischenstationen sind als Ziel ausgeschlossen — sie führten
   * unmittelbar wieder auf sich selbst zurück. `wechseln` ist die
   * Antwort auf „keine Position gewählt", `zustimmung` die auf „noch
   * nicht zugestimmt"; ein `weiter=` auf eine davon wäre eine Schleife,
   * aus der nur das Schliessen des Tabs hilft.
   */
  const ohneSuche = roh.split("?")[0] ?? roh;
  if (ohneSuche === "/dashboard/wechseln") return STANDARD_ZIEL;
  if (ohneSuche === "/dashboard/zustimmung") return STANDARD_ZIEL;

  return roh;
}

/**
 * Hängt das Ziel an die Adresse der Positionswahl.
 *
 * Ohne diesen Umweg wäre die Wahl eine Einbahnstrasse: `waehlePosition`
 * leitete fest auf `/dashboard`, und wer auf „Kalender" geklickt hatte,
 * landete nach der Auswahl auf der Übersicht — bei jedem Versuch aufs
 * Neue, ohne je anzukommen. Genau so ist der Fehler vom 2026-09-07
 * gemeldet worden.
 */
export function wechselAdresse(ziel: string | null): string {
  const geprueft = sicheresZiel(ziel);
  if (geprueft === STANDARD_ZIEL) return "/dashboard/wechseln";
  return `/dashboard/wechseln?${ZIEL_PARAMETER}=${encodeURIComponent(geprueft)}`;
}

/**
 * Hängt das Ziel an die Adresse des Zustimmungs-Tors.
 *
 * Wortgleich zu `wechselAdresse` und aus demselben Grund: ohne den
 * Umweg landete nach dem Haken jeder auf der Übersicht, auch wer auf
 * „Kalender" geklickt hat. Getrennte Funktion statt eines Parameters,
 * weil die beiden Tore unterschiedliche Fragen beantworten und ihre
 * Adressen unabhängig voneinander wandern dürfen.
 */
export function zustimmungAdresse(ziel: string | null): string {
  const geprueft = sicheresZiel(ziel);
  if (geprueft === STANDARD_ZIEL) return "/dashboard/zustimmung";
  return `/dashboard/zustimmung?${ZIEL_PARAMETER}=${encodeURIComponent(geprueft)}`;
}
