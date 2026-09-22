"use client";

import { useActionState, useState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, TextFeld } from "@/components/formular/felder";
import { ZustimmungFeld } from "@/components/formular/zustimmung-feld";
import { PasswortKriterien } from "@/components/formular/passwort-kriterien";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";

import { registrieren } from "./aktionen";

/**
 * Abschnitt A der Kontoerstellung: E-Mail, Passwort, Datenschutz.
 *
 * Seit dem 2026-09-22 trägt die Registrierung **keine** Betriebsdaten mehr
 * — kein Betriebsname, kein Land, kein Chef-Name, kein Promo-Code. Das
 * alles gehört zum Anlegen des Betriebs (`/einrichtung/betrieb`) und wird
 * erst dort erhoben. Hier entsteht nur das Konto.
 *
 * Ohne JavaScript sendet das Formular ganz normal an die Server Action —
 * die Client-Prüfung ist Komfort, keine Voraussetzung.
 *
 * `idPraefix` trennt die Feld-Ids: in Lage B stehen zwei Formulare auf
 * derselben Seite, und doppelte Ids brächen `<label for>` und
 * `aria-describedby`.
 */
export function KontoAbschnitt({
  idPraefix = "",
  texte,
  zustimmungTexte,
  vorbelegung,
}: {
  idPraefix?: string;
  texte: Dictionary["registrierung"];
  zustimmungTexte: Dictionary["zustimmungFeld"];
  vorbelegung?: Record<string, string | undefined>;
}) {
  const [zustand, aktion] = useActionState(registrieren, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung();

  const [passwortStand, setzePasswortStand] = useState({
    passwort: "",
    wiederholung: "",
  });

  // Der Absende-Knopf bleibt gesperrt, bis die Datenschutz-Kenntnisnahme
  // gesetzt ist (Client-Komfort; Zod in der Server Action bleibt die
  // eigentliche Verteidigung). Vorbelegt nach einem Validierungsfehler.
  const [zugestimmt, setzeZugestimmt] = useState(
    (zustand.werte ?? vorbelegung ?? {})["zustimmung"] === "ja",
  );

  const gemerkt = vorbelegung ?? {};
  const werte: Record<string, string | undefined> = {
    ...gemerkt,
    ...(zustand.werte ?? {}),
  };
  const fehler = (feld: string) => fehlerFuer(feld, zustand.felder);

  return (
    <form
      action={aktion}
      noValidate
      onBlur={beiVerlassen}
      className="flex flex-col gap-5"
    >
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <TextFeld
        id={`${idPraefix}email`}
        name="email"
        type="email"
        label={texte.felder.email}
        autoComplete="email"
        defaultValue={werte["email"]}
        fehler={fehler("email")}
        hinweis={texte.felder.emailHinweis}
      />

      {/*
        Zwei Passwortfelder beim Anlegen, eines beim Anmelden — ein
        Tippfehler hier fiele sonst erst bei der nächsten Anmeldung auf.
        `autoComplete="new-password"` hält den Passwortmanager davon ab,
        ein gespeichertes Passwort einzusetzen. Kein `maxLength`: der
        Browser schnitte damit auch beim Einfügen ab.
      */}
      <TextFeld
        id={`${idPraefix}passwort`}
        name="passwort"
        type="password"
        label={texte.felder.passwort}
        autoComplete="new-password"
        fehler={fehler("passwort")}
        beschriebenVon={`${idPraefix}passwort-kriterien`}
        beiEingabe={(wert) =>
          setzePasswortStand((vorher) => ({ ...vorher, passwort: wert }))
        }
        unten={
          <PasswortKriterien
            id={`${idPraefix}passwort-kriterien`}
            stand={passwortStand}
            texte={texte.passwortKriterien}
          />
        }
      />

      <TextFeld
        id={`${idPraefix}wiederholung`}
        name="wiederholung"
        type="password"
        label={texte.felder.passwortWiederholen}
        autoComplete="new-password"
        fehler={fehler("wiederholung")}
        beiEingabe={(wert) =>
          setzePasswortStand((vorher) => ({ ...vorher, wiederholung: wert }))
        }
      />

      <ZustimmungFeld
        idPraefix={idPraefix}
        variante="datenschutz"
        vorbelegt={werte["zustimmung"] === "ja"}
        fehler={fehler("zustimmung")}
        texte={zustimmungTexte}
        beiAenderung={setzeZugestimmt}
      />

      <AbsendenButton laufend={texte.wirdAngelegt} deaktiviert={!zugestimmt}>
        {texte.kontoAnlegen}
      </AbsendenButton>
    </form>
  );
}
