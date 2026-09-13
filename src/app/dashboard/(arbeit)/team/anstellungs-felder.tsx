"use client";

import { SelectFeld, TextFeld } from "@/components/formular/felder";
import type { Anstellung } from "@/lib/dashboard/team";
import { VERTRAG_TYPEN, wochenstundenAusMonat } from "@/lib/validierung";

/**
 * Vertrag, Sollstunden, Überstunden-Toleranz, Anfangssaldo,
 * Urlaubsanspruch — einmal gebaut, an zwei Stellen benutzt.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum eine gemeinsame Komponente und nicht zweimal dieselben Felder
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Felder erscheinen beim Einladen und im Profil derselben Person.
 * Zwei Fassungen wären zwei Gelegenheiten, sich zu widersprechen — und
 * zwar nicht optisch, sondern inhaltlich: die Erklärtexte unten sind das
 * Ergebnis einer Quelltext-Recherche (was rechnet womit?), und eine
 * halb mitgezogene Kopie davon wäre schlimmer als gar kein Text.
 *
 * `idPraefix` trennt die Feld-IDs: im Profil steht je Person ein
 * eigener Satz Felder auf derselben Seite, und doppelte IDs hängen
 * `<label for>` und `aria-describedby` ins Leere.
 *
 * **Alle fünf sind optional.** Pflicht bleibt nur, was es vorher schon
 * war (Name plus E-Mail oder Telefon). Ein leeres Feld bedeutet den
 * Default der Spalte — `NULL` bei Vertragsart und Sollstunden, sonst
 * `0` / `0` / `25`; die Regel steht in `anstellungSchema`.
 */
export function AnstellungsFelder({
  idPraefix,
  werte,
  fehler,
}: {
  idPraefix: string;
  /** Bestand aus der Datenbank. Fehlt beim Einladen — dort ist alles leer. */
  werte?: Anstellung;
  fehler: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SelectFeld
        id={`${idPraefix}vertrag_typ`}
        name="vertrag_typ"
        label="Vertragsart"
        optionen={VERTRAG_TYPEN.map((typ) => ({ code: typ, name: typ }))}
        leerText="Keine Angabe"
        defaultValue={werte?.vertragTyp ?? ""}
        fehler={fehler["vertrag_typ"]}
      />

      {/*
        Eingetragen werden **Wochen**stunden, gespeichert wird der
        Monatswert (× 4,33, gerundet). Das ist keine Erfindung dieses
        Formulars, sondern die Konvention, die der App-Code selbst
        benennt (`index.tsx:74`: „weekly-hours × 4.33 figure for a
        typical month") und die der Bestand bestätigt: 143 gesetzte
        Werte, keiner unter 60, und 173 ist genau 40 × 4,33.

        Gefragt wird trotzdem nach der Woche, weil das die Zahl ist, die
        in einem Arbeitsvertrag steht. Die Umrechnung macht
        `monatsstundenAusWoche()` in der Server Action.
      */}
      <TextFeld
        id={`${idPraefix}wochenstunden`}
        name="wochenstunden"
        type="number"
        label="Sollstunden pro Woche"
        required={false}
        min={0}
        step="any"
        defaultValue={wochenstundenAusMonat(werte?.sollStunden ?? null)}
        fehler={fehler["soll_stunden"]}
        hinweis="Gespeichert wird der Monatswert (× 4,33). 40 Std./Woche → 173 Std./Monat. Leer lassen, wenn kein Soll vereinbart ist."
      />

      {/*
        Erklärtext erst nach Prüfung geschrieben, nicht geraten. Gesucht
        wurde nach allen Verbrauchern von `toleranz_ueberstunden`:
        Postgres kennt genau einen (`schuetze_mitarbeiter_spalten`, und
        der liest den Wert nur als Sperrliste), das App-Repo kennt nur
        den Solver. Dort ist es ein Freibetrag —
        `otPen = max(0, überstunden − toleranz)` (`solver.ts:351`) —, und
        `otPen` geht als Kostenzuschlag in die Auswahl ein
        (`solver.ts:268`, Gewicht `W_OT = 0.6`, Priorität 2 von 3).

        Es verhindert also nichts und begrenzt nichts. Genau das steht
        deshalb da.
      */}
      <TextFeld
        id={`${idPraefix}toleranz_ueberstunden`}
        name="toleranz_ueberstunden"
        type="number"
        label="Überstunden-Toleranz (Stunden)"
        required={false}
        min={0}
        step="any"
        defaultValue={String(werte?.toleranzUeberstunden ?? 0)}
        fehler={fehler["toleranz_ueberstunden"]}
        hinweis="Freibetrag für die automatische Planung: bis hierher bleiben Überstunden folgenlos. Darüber wird die Person seltener eingeteilt. Verhindert wird dadurch nichts."
      />

      {/*
        Die Beschriftung ist der ganze Punkt dieses Feldes. Die Spalte
        heisst `ueberstunden_saldo` und sieht nach „aktueller Stand" aus
        — sie ist aber der **Startwert**: App und Solver rechnen den
        laufenden Saldo bei jedem Aufruf neu aus diesem Wert plus der
        Differenz aller abgerechneten Monate und schreiben ihn nie
        zurück. Wer hier den heutigen Stand einträgt, zählt die
        vergangenen Monate doppelt.

        Negative Werte sind ausdrücklich erlaubt — Minusstunden aus dem
        Vorsystem sind genau der Fall, für den es das Feld gibt.
      */}
      <TextFeld
        id={`${idPraefix}ueberstunden_saldo`}
        name="ueberstunden_saldo"
        type="number"
        label="Überstunden-Anfangssaldo (Stunden)"
        required={false}
        step="any"
        defaultValue={String(werte?.ueberstundenSaldo ?? 0)}
        fehler={fehler["ueberstunden_saldo"]}
        hinweis="Übertrag aus der Zeit vor QuickTeam — nicht der aktuelle Stand. Den rechnet QuickTeam laufend selbst aus. Minusstunden als negative Zahl."
      />

      <TextFeld
        id={`${idPraefix}urlaubsanspruch_tage`}
        name="urlaubsanspruch_tage"
        type="number"
        label="Urlaubsanspruch (Tage pro Jahr)"
        required={false}
        min={0}
        step={1}
        defaultValue={String(werte?.urlaubsanspruchTage ?? 25)}
        fehler={fehler["urlaubsanspruch_tage"]}
        hinweis="Gezählt werden Kalendertage, nicht Arbeitstage — Wochenenden zählen mit. Offene Anträge belegen das Kontingent bereits."
      />
    </div>
  );
}
