"use client";

import { useActionState, useState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, SelectFeld, TextFeld } from "@/components/formular/felder";
import { ZustimmungFeld } from "@/components/formular/zustimmung-feld";
import { PasswortKriterien } from "@/components/formular/passwort-kriterien";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";
import { LAENDER, PROMO_CODE_MAX } from "@/lib/validierung";

import { registrieren } from "./aktionen";

/**
 * Abschnitt A von Schritt 1: Betriebs- und Zugangsdaten.
 *
 * Ohne JavaScript sendet das Formular ganz normal an die Server Action —
 * die Client-Prüfung ist Komfort, keine Voraussetzung.
 *
 * Nach dem Absenden leitet die Aktion auf dieselbe Route mit `?email=`
 * zurück; dort klappt Abschnitt B auf und dieser hier rückt in ein
 * zugeklapptes `<details>`. Deshalb bleibt die Komponente unverändert
 * bedienbar, auch wenn sie zusammengeklappt darunter steht.
 *
 * `idPraefix` ist genau dafür da: in Lage B stehen zwei Formulare auf
 * derselben Seite, und beide hätten ein Feld mit der ID "email". Doppelte
 * IDs sind nicht bloss ungültiges HTML — `<label for>` und
 * `aria-describedby` zeigen dann beide auf das erste Vorkommen, und die
 * Beschriftung des zweiten Feldes hängt ins Leere. Die `name`-Attribute
 * bleiben unverändert; daran hängt die Feldprüfung, und die soll in
 * beiden Fällen dieselbe sein.
 */
export function DatenAbschnitt({
  idPraefix = "",
  vorbelegung,
  texte,
}: {
  idPraefix?: string;
  /** Vom Server-Elternteil in der Sprache der Anfrage hereingereicht. */
  texte: Dictionary["registrierung"];
  /**
   * Was in Abschnitt A schon eingetippt wurde. Nur in Lage B gesetzt —
   * im leeren Formular wäre eine Vorbelegung aus einem früheren Anlauf
   * eine Überraschung, keine Hilfe.
   */
  vorbelegung?: Record<string, string | undefined>;
}) {
  const [zustand, aktion] = useActionState(registrieren, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung();

  /*
   * Der Tippstand beider Passwortfelder, nur für die Kriterienliste.
   *
   * Die Felder selbst bleiben ungesteuert — `defaultValue` und
   * `name` tragen die Eingabe weiterhin allein, das Formular
   * funktioniert unverändert ohne JavaScript. Hier liegt also keine
   * zweite Wahrheit über den Feldinhalt, sondern nur eine Mitschrift
   * für die Anzeige.
   */
  const [passwortStand, setzePasswortStand] = useState({
    passwort: "",
    wiederholung: "",
  });

  /*
   * Reihenfolge mit Absicht: was gerade abgeschickt wurde, schlägt das
   * Gemerkte. Sonst überschriebe die Vorbelegung nach einem
   * Validierungsfehler genau die Korrektur, die jemand eben getippt hat.
   */
  const gemerkt = vorbelegung ?? {};
  const werte: Record<string, string | undefined> = {
    ...gemerkt,
    ...(zustand.werte ?? {}),
  };
  const fehler = (feld: string) => fehlerFuer(feld, zustand.felder);

  return (
    <form action={aktion} noValidate onBlur={beiVerlassen} className="flex flex-col gap-5">
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <TextFeld
        id={`${idPraefix}betrieb_name`}
        name="betrieb_name"
        label="Betriebsname"
        autoComplete="organization"
        maxLength={120}
        defaultValue={werte["betrieb_name"]}
        fehler={fehler("betrieb_name")}
      />

      <SelectFeld
        id={`${idPraefix}land`}
        name="land"
        label="Land"
        optionen={LAENDER}
        defaultValue={werte["land"]}
        fehler={fehler("land")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextFeld
          id={`${idPraefix}vorname`}
          name="vorname"
          label="Vorname"
          autoComplete="given-name"
          maxLength={80}
          defaultValue={werte["vorname"]}
          fehler={fehler("vorname")}
        />
        <TextFeld
          id={`${idPraefix}nachname`}
          name="nachname"
          label="Nachname"
          autoComplete="family-name"
          maxLength={80}
          defaultValue={werte["nachname"]}
          fehler={fehler("nachname")}
        />
      </div>

      <TextFeld
        id={`${idPraefix}email`}
        name="email"
        type="email"
        label="E-Mail-Adresse"
        autoComplete="email"
        defaultValue={werte["email"]}
        fehler={fehler("email")}
        hinweis="An diese Adresse geht dein Bestätigungscode."
      />

      {/*
        Zwei Passwortfelder beim Anlegen, eines beim Anmelden.
        Ein Tippfehler hier fiele sonst erst bei der nächsten Anmeldung
        auf — womöglich Wochen später, und dann hilft nur noch der
        Zurücksetzen-Weg über einen Code. Beim Anmelden fällt derselbe
        Tippfehler sofort auf, dort wäre ein zweites Feld nur ein
        zweiter Handgriff.

        Beide tragen `autoComplete="new-password"`: das sagt dem
        Passwortmanager, dass hier etwas Neues entsteht, und hält ihn
        davon ab, ein gespeichertes Passwort einzusetzen.

        Die Regeln stehen seit dem 2026-09-07 als abhakbare Liste unter
        dem Feld statt als Satz darüber („Mindestens 8 Zeichen."). Ein
        Hinweis wird gelesen, bevor man tippt, und ist genau dann
        vergessen, wenn er gebraucht wird — beim Absenden. Die Liste
        beantwortet dagegen laufend „bin ich schon durch?".

        Sie hängt über `aria-describedby` am Passwortfeld, damit ein
        Screenreader sie beim Betreten des Feldes mitbekommt und nicht
        erst, wenn er zufällig darüber stolpert.

        **Kein `maxLength` auf den beiden Feldern**, obwohl die
        Obergrenze bekannt ist: der Browser schneidet damit auch beim
        Einfügen ab. Ein aus dem Passwortmanager eingefügtes langes
        Passwort würde stillschweigend gekürzt angelegt, während der
        Manager die volle Länge behält — die Anmeldung schlüge ab dann
        immer fehl, ohne erkennbaren Grund. Zu lang wird deshalb
        angezeigt und abgelehnt, nicht heimlich zurechtgeschnitten.
      */}
      <TextFeld
        id={`${idPraefix}passwort`}
        name="passwort"
        type="password"
        label="Passwort"
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
          />
        }
      />

      <TextFeld
        id={`${idPraefix}wiederholung`}
        name="wiederholung"
        type="password"
        label="Passwort wiederholen"
        autoComplete="new-password"
        fehler={fehler("wiederholung")}
        beiEingabe={(wert) =>
          setzePasswortStand((vorher) => ({ ...vorher, wiederholung: wert }))
        }
      />

      {/*
        Freiwillig und deshalb `required={false}` — die Voreinstellung von
        `TextFeld` ist Pflicht. Kein `autoComplete`: ein Promo-Code ist
        nichts, was der Browser von woanders her kennen könnte.
      */}
      <TextFeld
        id={`${idPraefix}promo_code`}
        name="promo_code"
        label={texte.promoCode}
        required={false}
        autoComplete="off"
        maxLength={PROMO_CODE_MAX}
        defaultValue={werte["promo_code"]}
        fehler={fehler("promo_code")}
        hinweis={texte.promoCodeHinweis}
      />

      <ZustimmungFeld
        idPraefix={idPraefix}
        vorbelegt={werte["zustimmung"] === "ja"}
        fehler={fehler("zustimmung")}
      />

      <AbsendenButton laufend="Wird angelegt …">Betrieb anlegen</AbsendenButton>
    </form>
  );
}
