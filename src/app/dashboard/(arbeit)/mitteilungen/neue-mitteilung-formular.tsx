"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { FormMeldung } from "@/components/formular/felder";
import { erlaubteKategorien, KATEGORIE_LABEL, PRIORITAET_LABEL } from "@/lib/dashboard/mitteilungen";
import { leererZustand } from "@/lib/formular";
import { PRIORITAETEN, type ErstellbarerTyp } from "@/lib/validierung";

import { mitteilungErstellen } from "./aktionen";

function SendenKnopf() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="self-start rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Wird gesendet…" : "Senden"}
    </button>
  );
}

const feldBasis =
  "w-full rounded-blk border border-line-strong bg-surface px-3.5 py-2.5 text-base text-text " +
  "transition-colors placeholder:text-muted";

/**
 * Eine Auswahl unter mehreren, ohne natives `<input type="radio">`.
 *
 * Bewusst kein `RadioGroup`/`WahlRadioChip`: siehe die Erklärung an
 * `NeueMitteilungFormular` unten — ein natives Radio-Element in diesem
 * Formular hörte auf den Reset, den React nach jedem abgeschlossenen
 * Server-Action-Aufruf auslöst, und riss die Auswahl dabei still mit.
 * Ein reiner Knopf mit eigenem `onClick` hat dieses Problem nicht.
 */
function AuswahlChip({
  gewaehlt,
  onClick,
  beschriftung,
}: {
  gewaehlt: boolean;
  onClick: () => void;
  beschriftung: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={gewaehlt}
      className={`flex items-center gap-2 rounded-blk border px-3.5 py-2 text-sm font-medium transition-colors ${
        gewaehlt ? "border-signal bg-signal-weak text-text" : "border-line text-muted hover:text-text"
      }`}
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
          gewaehlt ? "border-signal bg-signal" : "border-line-strong"
        }`}
        aria-hidden="true"
      >
        {gewaehlt ? <span className="size-1.5 rounded-full bg-signal-ink" /> : null}
      </span>
      {beschriftung}
    </button>
  );
}

/**
 * Wachsende Liste von Textzeilen, alle mit demselben `name` — Spiegel von
 * `listField()` in `compose.tsx`. `formData.getAll(name)` sammelt sie am
 * Server als Array, ganz ohne verstecktes Serialisieren.
 */
function ZeilenFeld({
  name,
  werte,
  setWerte,
  hinzufuegenLabel,
}: {
  name: string;
  werte: string[];
  setWerte: (werte: string[]) => void;
  hinzufuegenLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {werte.map((wert, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            name={name}
            value={wert}
            onChange={(e) => setWerte(werte.map((w, j) => (j === i ? e.target.value : w)))}
            placeholder={`${i + 1}.`}
            className={feldBasis}
          />
          {werte.length > 1 ? (
            <button
              type="button"
              onClick={() => setWerte(werte.filter((_, j) => j !== i))}
              aria-label="Zeile entfernen"
              className="shrink-0 rounded-blk p-2 text-muted transition-colors hover:text-text"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setWerte([...werte, ""])}
        className="flex items-center gap-1.5 self-start text-sm font-semibold text-signal"
      >
        <Plus className="size-4" aria-hidden="true" />
        {hinzufuegenLabel}
      </button>
    </div>
  );
}

const LEER_ZUSTAND = {
  typ: "allgemein" as ErstellbarerTyp,
  titel: "",
  text: "",
  prioritaet: "normal" as (typeof PRIORITAETEN)[number],
  items: [""],
  optionen: ["", ""],
  mehrfachauswahl: false,
  anonym: false,
};

/**
 * Formular für eine neue Mitteilung.
 *
 * Kategorien, Pflichtfelder und Berechtigung spiegeln `compose.tsx` der
 * App (Parity-Audit vom 2026-08-31): Titel immer Pflicht, Checkliste
 * mindestens ein Punkt, Umfrage mindestens zwei Optionen — geprüft
 * clientseitig über `required`/Mindestlängen der Felder und serverseitig
 * über `mitteilungSchema`. `dokument` steht bewusst nicht zur Auswahl, da
 * die Referenz-App dafür keinen Compose-Weg kennt.
 *
 * **Jedes Feld ist React-kontrolliert, auch Titel, Text, Kategorie und
 * Priorität — und Letztere bewusst nicht über `RadioGroup`.** Beim
 * Verifizieren im Browser (playwright-cli) fiel auf: React setzt das
 * native `<form>` nach jedem abgeschlossenen Server-Action-Aufruf zurück,
 * bei einem fehlgeschlagenen Versuch genauso wie bei einem
 * erfolgreichen. Ein `RadioGroup` bringt dafür ein natives, verstecktes
 * `<input type="radio">` mit; der Reset setzt dessen `checked` auf den
 * ursprünglichen Stand zurück, und die Komponente meldet das über
 * `onValueChange` — unabhängig davon, ob der Wert von aussen als
 * `value` (kontrolliert) oder `defaultValue` hereinkommt. Erst
 * kontrolliert, dann sprang die Kategorie nach jedem *fehlgeschlagenen*
 * Versuch still auf „Ankündigung" zurück, und mit ihr verschwand die
 * Umfrage-spezifische Fehlermeldung (`felder.optionen`) aus der bedingt
 * gerenderten Ansicht — ohne dass irgendwo ein Fehler zu sehen war.
 * `compose.tsx` in der App kennt dieses Verhalten nicht: dort ist der
 * ganze Formularzustand ohnehin React-State ohne natives Formular-Reset,
 * ein Fehler setzt nur `error` und lässt die Eingabe unangetastet. Die
 * Lösung hier: Kategorie und Priorität als reine Knöpfe (`AuswahlChip`)
 * mit eigenem `onClick`, ihr Wert reist über ein verstecktes Feld statt
 * über ein natives Radio-Element, das der Browser zurücksetzen könnte.
 */
function NeueMitteilungFormular({
  chef,
  onSchliessen,
}: {
  chef: boolean;
  onSchliessen: () => void;
}) {
  const [zustand, aktion] = useActionState(mitteilungErstellen, leererZustand);
  const kategorien = erlaubteKategorien(chef);

  const [typ, setTyp] = useState<ErstellbarerTyp>(LEER_ZUSTAND.typ);
  const [titel, setTitel] = useState(LEER_ZUSTAND.titel);
  const [text, setText] = useState(LEER_ZUSTAND.text);
  const [prioritaet, setPrioritaet] = useState(LEER_ZUSTAND.prioritaet);
  const [items, setItems] = useState<string[]>(LEER_ZUSTAND.items);
  const [optionen, setOptionen] = useState<string[]>(LEER_ZUSTAND.optionen);
  const [mehrfachauswahl, setMehrfachauswahl] = useState(LEER_ZUSTAND.mehrfachauswahl);
  const [anonym, setAnonym] = useState(LEER_ZUSTAND.anonym);

  useEffect(() => {
    if (zustand.status === "erfolg") {
      setTyp(LEER_ZUSTAND.typ);
      setTitel(LEER_ZUSTAND.titel);
      setText(LEER_ZUSTAND.text);
      setPrioritaet(LEER_ZUSTAND.prioritaet);
      setItems(LEER_ZUSTAND.items);
      setOptionen(LEER_ZUSTAND.optionen);
      setMehrfachauswahl(LEER_ZUSTAND.mehrfachauswahl);
      setAnonym(LEER_ZUSTAND.anonym);
    }
    /*
     * Abhängigkeit ist `zustand` selbst, nicht `zustand.status`: jeder
     * Dispatch von `useActionState` liefert ein frisches Objekt, auch wenn
     * zwei Erfolge unmittelbar aufeinanderfolgen (zwei Mitteilungen kurz
     * hintereinander gesendet). Ein Vergleich nur auf `status` hätte den
     * zweiten Erfolg übersehen, weil sich der String nicht geändert hätte
     * — beim Verifizieren im Browser genau so aufgefallen: das Formular
     * blieb nach der zweiten gesendeten Mitteilung gefüllt stehen.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zustand]);

  const fehlermeldung =
    zustand.status === "fehler"
      ? (zustand.nachricht ?? Object.values(zustand.felder)[0] ?? "Das hat nicht geklappt.")
      : null;

  return (
    <form action={aktion} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="verfassen-titel" className="font-display text-lg text-text">
          Neue Mitteilung
        </h2>
        <button
          type="button"
          onClick={onSchliessen}
          className="-mr-1 -mt-1 shrink-0 rounded-blk p-1.5 text-muted transition-colors hover:bg-surface-sunk hover:text-text"
        >
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Verfassen abbrechen</span>
        </button>
      </div>

      {fehlermeldung ? <FormMeldung art="fehler">{fehlermeldung}</FormMeldung> : null}
      {zustand.status === "erfolg" ? <FormMeldung art="erfolg">Gesendet.</FormMeldung> : null}

      <div>
        <p className="mb-2 text-sm font-medium text-text">Kategorie</p>
        <div className="flex flex-row flex-wrap gap-2">
          {kategorien.map((kategorie) => (
            <AuswahlChip
              key={kategorie}
              gewaehlt={typ === kategorie}
              onClick={() => setTyp(kategorie)}
              beschriftung={KATEGORIE_LABEL[kategorie]}
            />
          ))}
        </div>
        <input type="hidden" name="typ" value={typ} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mitteilung-titel" className="text-sm font-medium text-text">
          Titel
        </label>
        <input
          id="mitteilung-titel"
          name="titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          required
          className={feldBasis}
        />
        {zustand.felder.titel ? (
          <p className="text-sm font-medium text-stop">{zustand.felder.titel}</p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text">Priorität</p>
        <div className="flex flex-row flex-wrap gap-2">
          {PRIORITAETEN.map((p) => (
            <AuswahlChip
              key={p}
              gewaehlt={prioritaet === p}
              onClick={() => setPrioritaet(p)}
              beschriftung={PRIORITAET_LABEL[p]}
            />
          ))}
        </div>
        <input type="hidden" name="prioritaet" value={prioritaet} />
      </div>

      {typ === "allgemein" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mitteilung-text" className="text-sm font-medium text-text">
            Text
          </label>
          <textarea
            id="mitteilung-text"
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={500}
            className={feldBasis}
          />
        </div>
      ) : null}

      {typ === "aufgabenliste" ? (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Punkte</p>
          <ZeilenFeld name="items" werte={items} setWerte={setItems} hinzufuegenLabel="Punkt hinzufügen" />
          {zustand.felder.items ? (
            <p className="mt-1.5 text-sm font-medium text-stop">{zustand.felder.items}</p>
          ) : null}
        </div>
      ) : null}

      {typ === "umfrage" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-text">Optionen</p>
            <ZeilenFeld
              name="optionen"
              werte={optionen}
              setWerte={setOptionen}
              hinzufuegenLabel="Option hinzufügen"
            />
            {zustand.felder.optionen ? (
              <p className="mt-1.5 text-sm font-medium text-stop">{zustand.felder.optionen}</p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="mehrfachauswahl"
              value="true"
              checked={mehrfachauswahl}
              onChange={(e) => setMehrfachauswahl(e.target.checked)}
              className="size-4"
            />
            Mehrfachauswahl
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="anonym"
              value="true"
              checked={anonym}
              onChange={(e) => setAnonym(e.target.checked)}
              className="size-4"
            />
            Anonym
          </label>
        </div>
      ) : null}

      <SendenKnopf />
    </form>
  );
}

/**
 * Der Einstieg ins Verfassen — ein Knopf, kein Dauergast.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum das Formular nicht mehr offen im Feed steht
 * ─────────────────────────────────────────────────────────────────────
 *
 * Bis zum 2026-09-06 stand das ganze Formular dauerhaft zwischen
 * Seitenkopf und Liste — Kategorie-Chips, Titel, Priorität, Textfeld,
 * Senden. Das ist die Reihenfolge einer Schreibmaske, aber der Bereich
 * heisst „Mitteilungen" und wird überwiegend gelesen: wer nachsieht, was
 * angekündigt wurde, scrollte zuerst an einem leeren Formular vorbei.
 *
 * Die App löst dasselbe über einen eigenen Screen: `messages.tsx` zeigt
 * nur den Feed und darüber einen Knopf, der `/compose` öffnet. Der
 * Ablauf ist damit „erst lesen, auf Wunsch schreiben" — und genau der
 * wird hier übernommen. Die Umsetzung ist eine andere, weil das Medium
 * eine andere ist: im Browser braucht es dafür keinen Seitenwechsel, ein
 * Aufklappen an Ort und Stelle reicht und erhält den Platz im Feed.
 *
 * **Auf Erfolg wird bewusst nicht zugeklappt.** Die Bestätigung
 * („Gesendet.") steht im Formular; wer es im selben Moment abbaut,
 * nimmt sie mit — derselbe Fehler, der beim Übernehmen einer
 * ausgeschriebenen Schicht schon einmal aufgetreten ist
 * (`src/lib/dashboard/ausschreibung-aktionen.ts`). Die Felder leeren
 * sich, das Formular bleibt stehen, geschlossen wird von Hand.
 *
 * Geschlossen wird das Formular **abgebaut** und nicht nur versteckt:
 * `useActionState` sitzt darin, und ein neuer Anlauf soll mit leeren
 * Feldern und ohne die Meldung des letzten beginnen.
 */
export function MitteilungVerfassen({ chef }: { chef: boolean }) {
  const [offen, setOffen] = useState(false);

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="flex items-center gap-2 self-start rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
      >
        <Plus aria-hidden="true" className="size-4" />
        Neue Mitteilung
      </button>
    );
  }

  return <NeueMitteilungFormular chef={chef} onSchliessen={() => setOffen(false)} />;
}
