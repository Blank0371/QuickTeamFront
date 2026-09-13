import { X } from "lucide-react";

import { alsUhrzeit, WOCHENTAGE, type Vorlage } from "@/lib/schichten";

/**
 * Die angelegten Vorlagen als Wochenraster.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Woher das Muster kommt — und woher ausdrücklich nicht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Vorlagen-Übersicht der App (`manager.tsx`, `byDay` samt
 * `WEEKDAY_KEYS.map`) ist **selbst eine Liste** mit einer Überschrift je
 * Tag — dieselbe Form, die hier vorher stand. Ein Raster dafür gibt es
 * dort nicht; wer eines sucht, findet es in `calendar.tsx` unter
 * `WeekView`, und zwar für die konkreten Schichten, nicht für Vorlagen.
 *
 * Übernommen ist deshalb `WeekView`: eine Kopfzeile mit den Wochentagen,
 * eine Stundenachse links, sieben Spalten mit Blöcken, die nach ihrer
 * Zeit sitzen. Die Informationen im Block kommen dagegen aus
 * `manager.tsx` — Bezeichnung, Zeitspanne, Rollenbedarf als „Rolle ×N".
 *
 * Vom Vorbild bewusst abgewichen wird an zwei Stellen:
 *
 *   `WeekView` skaliert das Zeitfenster auf die Bildschirmhöhe, damit
 *   nichts scrollt. Das geht dort, weil eine Woche konkreter Schichten
 *   selten mehr als ein paar Stunden umspannt. Ein Wochenraster aus
 *   Vorlagen deckt oft 06:00 bis 02:00 ab; auf eine feste Höhe gepresst
 *   wäre eine Dreistundenschicht ein unlesbarer Strich. Hier bestimmt
 *   deshalb das Zeitfenster die Höhe, nicht umgekehrt.
 *
 *   `WeekView` zerlegt Schichten über Mitternacht in zwei Segmente und
 *   zeichnet den Rest am Folgetag weiter. Eine Vorlage hat aber kein
 *   Datum — „Montag 22:00–06:00" liegt nicht am Dienstag, es ist die
 *   Montagsschicht. Der Block endet daher am Fuss der Spalte und sagt
 *   mit einem Pfeil, dass er weiterläuft.
 */

/** `HH:MM:SS` in Minuten seit Mitternacht. */
function inMinuten(zeit: string): number {
  const [h, m] = zeit.split(":");
  return Number(h) * 60 + Number(m);
}

/** Läuft die Vorlage über Mitternacht? Der CHECK erlaubt das ausdrücklich. */
function ueberNacht(vorlage: Vorlage): boolean {
  return inMinuten(vorlage.end_zeit) <= inMinuten(vorlage.start_zeit);
}

/**
 * Das sichtbare Zeitfenster, auf volle Stunden gerundet.
 *
 * Eine Stunde Luft nach oben und unten, wie in `WeekView` — ohne sie
 * klebt die früheste Schicht am oberen Rand und sieht abgeschnitten aus.
 * Nachtschichten ziehen das Fenster bis Mitternacht, weil ihr Block dort
 * endet.
 */
function fenster(vorlagen: readonly Vorlage[]): { von: number; bis: number } {
  if (vorlagen.length === 0) return { von: 8 * 60, bis: 18 * 60 };

  let frueh = 24 * 60;
  let spaet = 0;
  for (const v of vorlagen) {
    frueh = Math.min(frueh, inMinuten(v.start_zeit));
    spaet = Math.max(spaet, ueberNacht(v) ? 24 * 60 : inMinuten(v.end_zeit));
  }

  return {
    von: Math.max(0, Math.floor((frueh - 60) / 60) * 60),
    bis: Math.min(24 * 60, Math.ceil((spaet + 60) / 60) * 60),
  };
}

/** Pixel je Minute — grob genug fürs Auge, hoch genug für kurze Schichten. */
const PRO_MINUTE = 0.45;
/** Kein Block wird kleiner als eine bequeme Trefferfläche. */
const MIND_HOEHE = 46;

type Platziert = {
  vorlage: Vorlage;
  oben: number;
  hoehe: number;
  /** Nullbasierte Spur innerhalb des Tages. */
  spur: number;
  /** Wie viele Spuren der Tag insgesamt braucht — bestimmt die Breite. */
  spuren: number;
};

/**
 * Überlappende Vorlagen nebeneinander legen, nicht übereinander.
 *
 * Dasselbe Problem und dieselbe Lösung wie `packLanes` in `calendar.tsx`:
 * Frühdienst bis 14:00, Abenddienst ab 16:00 und ein Nachtdienst ab 18:00
 * sind in der Gastronomie der Normalfall, und die letzten beiden
 * überschneiden sich. Ohne Spuren verdeckt der später beginnende Block den
 * früheren — sichtbar war davon nur noch dessen Anfangszeit.
 *
 * Gerechnet wird in **Pixeln, nicht in Minuten**. Zwei kurz aufeinander
 * folgende Schichten überlappen zeitlich nicht, ihre gezeichneten Blöcke
 * aber sehr wohl, sobald `MIND_HOEHE` greift — die Zeitrechnung fände
 * dann keine Kollision, das Auge schon.
 *
 * Anders als `packLanes` zählt die Breite **je Überlappungsgruppe**, nicht
 * je Tag. `WeekView` teilt alle Blöcke eines Tages durch dieselbe
 * Spurenzahl; auf einem Telefonbildschirm, der einen einzigen Tag zeigt,
 * kostet das nichts. Hier stehen sieben Tage nebeneinander, und eine
 * Frühschicht, die mit nichts kollidiert, würde auf die halbe Breite
 * gestaucht, nur weil sich abends zwei andere Schichten überschneiden —
 * aus „Frühschicht" wird dann „Frü hsc hic ht".
 */
function platziere(
  vorlagen: readonly Vorlage[],
  von: number,
  bis: number,
): Platziert[] {
  const kaesten = [...vorlagen]
    .sort((a, b) => a.start_zeit.localeCompare(b.start_zeit))
    .map((vorlage) => {
      const start = inMinuten(vorlage.start_zeit);
      const ende = ueberNacht(vorlage) ? bis : inMinuten(vorlage.end_zeit);
      const oben = (start - von) * PRO_MINUTE;
      return {
        vorlage,
        oben,
        hoehe: Math.max(MIND_HOEHE, (ende - start) * PRO_MINUTE - 2),
      };
    });

  const fertig: Platziert[] = [];

  /** Eine Gruppe abschliessen: alle darin teilen sich dieselbe Spurenzahl. */
  let gruppe: (Platziert & { unten: number })[] = [];
  let gruppenEnde = -Infinity;
  const schliesse = () => {
    const spuren = Math.max(1, ...gruppe.map((g) => g.spur + 1));
    for (const g of gruppe) fertig.push({ ...g, spuren });
    gruppe = [];
  };

  for (const kasten of kaesten) {
    // Beginnt der Block nach allem bisher Gesehenen, fängt eine neue
    // Gruppe an — die vorherige kann ihre Breite endgültig bekommen.
    if (kasten.oben >= gruppenEnde && gruppe.length > 0) schliesse();

    let spur = 0;
    while (gruppe.some((g) => g.spur === spur && g.unten > kasten.oben)) spur++;

    gruppe.push({ ...kasten, spur, spuren: 0, unten: kasten.oben + kasten.hoehe });
    gruppenEnde = Math.max(gruppenEnde, kasten.oben + kasten.hoehe);
  }
  if (gruppe.length > 0) schliesse();

  return fertig;
}

export function WochenRaster({
  vorlagen,
  rollenName,
  entfernenAktion,
}: {
  vorlagen: readonly Vorlage[];
  rollenName: (id: string) => string;
  entfernenAktion: (formData: FormData) => void;
}) {
  const { von, bis } = fenster(vorlagen);
  const hoehe = (bis - von) * PRO_MINUTE;

  const ersteStunde = Math.floor(von / 60);
  const letzteStunde = Math.ceil(bis / 60);
  const stunden = Array.from(
    { length: letzteStunde - ersteStunde + 1 },
    (_, i) => ersteStunde + i,
  );

  return (
    /*
      Sieben Spalten brauchen Platz. Statt unterhalb einer Schwelle in
      eine zweite Darstellung zu kippen — zwei Bauteile, die dasselbe
      zeigen und auseinanderlaufen können — scrollt das Raster
      waagrecht. Auf dem Telefon schiebt man es, am Schreibtisch merkt
      man nichts davon.
    */
    <div className="mt-5 overflow-x-auto pb-2">
      <div className="grid min-w-[52rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        {/* Kopfzeile: leere Ecke über der Stundenachse, dann die Tage. */}
        <div aria-hidden="true" />
        {WOCHENTAGE.map((tag) => (
          <div
            key={tag.wert}
            className="border-b border-l border-line px-2 pb-2 text-center"
          >
            <span className="font-display text-xs font-bold uppercase tracking-[0.1em] text-muted">
              <span aria-hidden="true">{tag.kurz}</span>
              <span className="sr-only">{tag.name}</span>
            </span>
          </div>
        ))}

        {/* Stundenachse. Die Beschriftung sitzt auf der Linie, nicht darunter. */}
        <div className="relative" style={{ height: `${hoehe}px` }}>
          {stunden.map((stunde) => (
            <span
              key={stunde}
              className="absolute right-2 -translate-y-1/2 font-mono text-[0.65rem] text-muted"
              style={{ top: `${(stunde * 60 - von) * PRO_MINUTE}px` }}
            >
              {String(stunde).padStart(2, "0")}
            </span>
          ))}
        </div>

        {WOCHENTAGE.map((tag) => {
          const desTages = platziere(
            vorlagen.filter((v) => v.wochentag === tag.wert),
            von,
            bis,
          );

          return (
            <div
              key={tag.wert}
              className="relative border-l border-line"
              style={{ height: `${hoehe}px` }}
            >
              {/* Stundenlinien hinter den Blöcken — Orientierung, kein Inhalt. */}
              {stunden.map((stunde) => (
                <div
                  key={stunde}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-line/40"
                  style={{ top: `${(stunde * 60 - von) * PRO_MINUTE}px` }}
                />
              ))}

              {desTages.map((platz) => (
                <Block
                  key={platz.vorlage.id}
                  platz={platz}
                  tagName={tag.name}
                  rollenName={rollenName}
                  entfernenAktion={entfernenAktion}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Block({
  platz,
  tagName,
  rollenName,
  entfernenAktion,
}: {
  platz: Platziert;
  tagName: string;
  rollenName: (id: string) => string;
  entfernenAktion: (formData: FormData) => void;
}) {
  const { vorlage, oben, hoehe, spur, spuren } = platz;
  const nacht = ueberNacht(vorlage);

  const ohneBedarf = vorlage.bedarf.length === 0;
  const zeit = `${alsUhrzeit(vorlage.start_zeit)}–${alsUhrzeit(vorlage.end_zeit)}`;

  /*
    Teilt sich der Tag auf mehrere Spuren auf, halbiert sich die
    Blockbreite — und was auf 75 Pixeln knapp lesbar war, wird auf 37
    zu Buchstabensalat. Der Block zeigt dann nur noch Bezeichnung und
    Beginn. Weggelassen wird nichts Unersetzliches: das vollständige
    Bild steht in der vorgelesenen Fassung, die unabhängig von der
    Spaltenbreite ist.
  */
  const eng = spuren > 1;
  const breite = 100 / spuren;

  return (
    <div
      className={`absolute overflow-hidden rounded-blk border bg-surface-sunk py-1.5 ${
        eng ? "px-1.5" : "px-2"
      } ${
        // Eine Vorlage ohne Mindestbesetzung ist in der App unsichtbar.
        // Das ist kein Fehler, aber auch kein fertiger Zustand — der
        // gestrichelte Rand sagt „hier fehlt noch etwas", ohne Rot zu
        // verbrauchen, das Fehlern vorbehalten ist.
        ohneBedarf ? "border-dashed border-line-strong" : "border-line"
      }`}
      style={{
        top: `${oben}px`,
        height: `${hoehe}px`,
        left: `calc(${spur * breite}% + 2px)`,
        width: `calc(${breite}% - 4px)`,
      }}
      /*
        Auf halber Breite bleibt vom Namen nur ein Anfang stehen. Der
        Tooltip holt das Ganze zurueck, ohne Platz zu kosten — fuer die
        Tastatur und fuer Screenreader tut das die Beschriftung des
        Entfernen-Knopfs weiter unten.
      */
      title={eng ? `${vorlage.bezeichnung}, ${zeit}` : undefined}
    >
      {/*
        Der Titel bricht um, statt abgeschnitten zu werden. Eine Spalte
        ist rund 75 Pixel breit; „Frühschicht" auf eine Zeile gezwungen
        wird dort zu „F…" und sagt gar nichts mehr. Über zwei Zeilen
        gesetzt bleibt es lesbar, und Platz dafür ist da — ein Block ist
        so hoch wie seine Schicht lang.
      */}
      <p
        className={`text-[0.7rem] font-semibold leading-tight text-text ${
          // Auf halber Breite ist Umbrechen schlimmer als Kuerzen:
          // „Abendschicht“ zerfaellt dort in „Abe nd- sch icht“ und ist
          // als Wort nicht mehr zu erkennen. Gekuerzt bleibt „Abend…“
          // lesbar, und vollstaendig steht der Name ohnehin im
          // Entfernen-Knopf, den Screenreader vorlesen.
          eng ? "truncate" : "hyphens-auto break-words"
        }`}
      >
        {vorlage.bezeichnung}
      </p>
      <p className="mt-0.5 font-mono text-[0.6rem] leading-tight text-muted">
        {/*
          Anfang und Ende untereinander, wie in engen Kalenderspalten
          üblich: „06:00–14:00" misst breiter als die Spalte.
        */}
        <span className="block">{alsUhrzeit(vorlage.start_zeit)}</span>
        {eng ? null : (
          <span className="block">
            –{alsUhrzeit(vorlage.end_zeit)}
            {nacht ? <span aria-hidden="true"> →</span> : null}
          </span>
        )}
        {/*
          Der Wochentag steht auch hier auf dem Block selbst, nicht nur
          in der Spaltenüberschrift — aus demselben Grund wie in der
          Liste zuvor: die Spalte ist eine Anordnung, keine Eigenschaft.
          Sichtbar wäre er in einer 6rem-Spalte allerdings nur Ballast,
          also trägt ihn die vorgelesene Fassung.
        */}
        <span className="sr-only">
          {eng ? ` bis ${alsUhrzeit(vorlage.end_zeit)}` : ""} am {tagName}
          {nacht ? ", endet am Folgetag" : ""}
        </span>
      </p>

      {ohneBedarf ? (
        <p
          className={`mt-1 text-[0.6rem] leading-tight text-muted ${eng ? "sr-only" : ""}`}
        >
          Ohne Mindestbesetzung — in der App unsichtbar
        </p>
      ) : (
        <ul className={`mt-1 ${eng ? "sr-only" : ""}`}>
          {vorlage.bedarf.map((eintrag) => (
            <li key={eintrag.rolleId} className="text-[0.6rem] leading-tight text-muted">
              {eintrag.mindestanzahl}× {rollenName(eintrag.rolleId)}
            </li>
          ))}
        </ul>
      )}

      {/*
        Das Entfernen sitzt unten rechts im Block, nicht oben: oben
        stünde es in derselben Zeile wie der Titel und nähme ihm in
        einer 75-Pixel-Spalte den halben Platz. Unten ist bei fast jedem
        Block Luft — ein Block ist so hoch wie seine Schicht lang.

        36 Pixel Trefferfläche statt der 44, die hier sonst gelten. In
        eine Spalte dieser Breite passen 44 nicht, ohne den Inhalt zu
        verdrängen; WCAG 2.5.8 verlangt 24, das ist eingehalten.
      */}
      <form action={entfernenAktion} className="absolute bottom-0 right-0">
        <input type="hidden" name="vorlage_id" value={vorlage.id} />
        <button
          type="submit"
          aria-label={`${vorlage.bezeichnung} am ${tagName}, ${zeit}, entfernen`}
          className="flex size-9 items-center justify-center rounded-blk text-muted transition-colors hover:text-stop focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
