"use client";

import { useState } from "react";

import type { Eingeladener, Rolle } from "@/lib/team";
import type { Dictionary } from "@/i18n/de";
import { rollenNameSchema } from "@/lib/validierung";

import { MitarbeiterAbschnitt } from "./mitarbeiter-abschnitt";
import { RollenAbschnitt } from "./rollen-abschnitt";
import { WeiterFormular } from "./weiter-formular";

/**
 * Schritt 3 als ein Zustand statt dreier Formulare nebeneinander.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Rollen werden gesammelt, nicht sofort geschrieben.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Entscheidung vom 2026-09-07, Begründung an `schreibeRollen()` in
 * `src/lib/team.ts`: `rollen` hat keine DELETE-Policy, eine einmal
 * geschriebene Rolle ist nicht mehr wegzubekommen — und „anlegen,
 * vertippt, weg damit" ist der häufigste Handgriff dieses Schritts.
 * Solange nichts geschrieben ist, gibt es nichts zu löschen.
 *
 * Deshalb liegt der Zustand hier oben und nicht in `RollenAbschnitt`:
 * drei Stellen brauchen dieselbe Liste — der Editor selbst, die
 * Rollen-Chips im Einladungsformular und das versteckte Feld im
 * Weiter-Formular. Zwei Kopien davon wären zwei Gelegenheiten,
 * auseinanderzulaufen.
 *
 * **Entwürfe tragen ihren Namen, nicht eine ID**, denn eine ID haben sie
 * noch nicht. Der Name ist ohnehin der Schlüssel, unter dem die
 * Datenbank sie eindeutig hält (`UNIQUE (betrieb_id, name)`), und
 * `rollenSicherstellen()` in `aktionen.ts` löst ihn beim Schreiben wieder
 * auf.
 *
 * **Ohne JavaScript sammelt hier nichts.** Das ist der Preis der
 * Umstellung und er ist bewusst bezahlt: eine Sammlung, die erst am Ende
 * schreibt, kann es ohne Client-Zustand nicht geben. Die Alternative
 * wäre gewesen, weiterhin bei jedem „Hinzufügen" zu schreiben — also
 * genau der Fehler, um den es geht. Die übrigen Formulare des Schritts
 * (Einladen, Entfernen, Weiter) sind unverändert echte `<form>`-Posts.
 */
export function TeamSchritt({
  bestehendeRollen,
  leute,
  texte,
}: {
  /** Was schon in der Datenbank steht — aus einem früheren Durchgang. */
  bestehendeRollen: readonly Rolle[];
  leute: readonly Eingeladener[];
  texte: Dictionary["stepper"]["team"];
}) {
  const [gesammelt, setzeGesammelt] = useState<string[]>([]);
  const [rollenFehler, setzeRollenFehler] = useState<string | null>(null);

  const bestehendeNamen = bestehendeRollen.map((rolle) => rolle.name);

  /*
   * Was noch **nicht** in der Datenbank steht — abgeleitet, nicht
   * nachgeführt.
   *
   * Nach einer Einladung schreibt `mitarbeiterEinladen()` die Entwürfe
   * und `revalidatePath()` liefert die Seite mit dem neuen Bestand neu
   * aus. Diese Komponente wird dabei aber nicht neu aufgebaut, ihr
   * Zustand überlebt — und dieselbe Rolle stünde doppelt da, einmal als
   * bestehende und einmal als Entwurf. Sie im Erfolgsfall aus dem
   * Zustand zu entfernen wäre die zweite Buchführung über dieselbe
   * Tatsache; abzuleiten ist billiger und kann nicht auseinanderlaufen.
   */
  const bekannt = new Set(bestehendeNamen.map((name) => name.toLowerCase()));
  const entwuerfe = gesammelt.filter((name) => !bekannt.has(name.toLowerCase()));

  const alleNamen = [...bestehendeNamen, ...entwuerfe];

  function hinzufuegen(roh: string): void {
    const geprueft = rollenNameSchema.safeParse(roh);
    if (!geprueft.success) {
      setzeRollenFehler(geprueft.error.issues[0]?.message ?? texte.rollennameFehler);
      return;
    }

    const name = geprueft.data;

    /*
     * Gegen den **gesamten** Bestand prüfen, nicht nur gegen die
     * Entwürfe: `UNIQUE (betrieb_id, name)` kennt den Unterschied nicht,
     * und ein Name, der schon in der Datenbank steht, liefe beim
     * Schreiben in den Constraint. Hier fällt es sofort auf, statt erst
     * beim Weitergehen.
     */
    if (alleNamen.some((vorhanden) => vorhanden.toLowerCase() === name.toLowerCase())) {
      setzeRollenFehler(texte.rolleDoppelt.replace("{name}", name));
      return;
    }

    setzeRollenFehler(null);
    setzeGesammelt((bisher) => [...bisher, name]);
  }

  function entfernen(name: string): void {
    setzeRollenFehler(null);
    setzeGesammelt((bisher) => bisher.filter((eintrag) => eintrag !== name));
  }

  return (
    <>
      <RollenAbschnitt
        bestehende={bestehendeRollen}
        entwuerfe={entwuerfe}
        fehler={rollenFehler}
        beiHinzufuegen={hinzufuegen}
        beiEntfernen={entfernen}
        texte={texte}
      />

      <MitarbeiterAbschnitt
        rollenNamen={alleNamen}
        bestehendeRollen={bestehendeRollen}
        entwuerfe={entwuerfe}
        leute={leute}
        texte={texte}
      />

      <WeiterFormular
        entwuerfe={entwuerfe}
        kannWeiter={alleNamen.length > 0}
        texte={texte}
      />
    </>
  );
}
