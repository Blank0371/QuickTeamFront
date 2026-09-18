"use client";

import { type FormEvent, useActionState, useRef, useState } from "react";

import { AbsendenButton } from "@/components/formular/absenden-button";
import { FormMeldung, SelectFeld, TextFeld } from "@/components/formular/felder";
import { ZustimmungFeld } from "@/components/formular/zustimmung-feld";
import { PasswortKriterien } from "@/components/formular/passwort-kriterien";
import { useFeldPruefung } from "@/components/formular/use-feld-pruefung";
import { useKlientTexte } from "@/i18n/sprach-provider";
import type { Dictionary } from "@/i18n/de";
import { leererZustand } from "@/lib/formular";
import { PROMO_CODE_MAX } from "@/lib/validierung";

import { promoCodePruefen, registrieren } from "./aktionen";

/**
 * Der Prüfstand des Promo-Codes.
 *
 * `ungeprueft` ist der Startwert und der Zustand nach jeder Änderung am
 * Feld — ein Code, der eben noch stimmte, muss nach dem Umtippen erneut
 * geprüft werden. `pruefend` läuft während des Server-Aufrufs; danach
 * einer der drei Werte aus `PromoPruefung`.
 */
type PromoStatus = "ungeprueft" | "pruefend" | "gueltig" | "unbekannt" | "nicht-pruefbar";

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
  texte,
  zustimmungTexte,
  laender,
  vorbelegung,
}: {
  idPraefix?: string;
  /** Vom Server-Elternteil in der Sprache der Anfrage hereingereicht. */
  texte: Dictionary["registrierung"];
  /** Der Zustimmungssatz, ebenfalls in der Sprache der Anfrage. */
  zustimmungTexte: Dictionary["zustimmungFeld"];
  /** Länderoptionen mit übersetzten Namen — der Code bleibt `AT`/`DE`. */
  laender: readonly { code: string; name: string }[];
  /**
   * Was in Abschnitt A schon eingetippt wurde. Nur in Lage B gesetzt —
   * im leeren Formular wäre eine Vorbelegung aus einem früheren Anlauf
   * eine Überraschung, keine Hilfe.
   */
  vorbelegung?: Record<string, string | undefined>;
}) {
  const [zustand, aktion] = useActionState(registrieren, leererZustand);
  const { beiVerlassen, fehlerFuer } = useFeldPruefung();
  const { validierung } = useKlientTexte();

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

  /*
   * Der Promo-Code wird wie die Passwörter mitgeschrieben, nicht
   * gesteuert — das Feld trägt seinen Wert weiter allein. Die Mitschrift
   * dient zwei Dingen: dem „Prüfen"-Knopf, der den aktuellen Wert
   * braucht, und der Sperre des Absende-Knopfes.
   */
  const [promoWert, setzePromoWert] = useState(werte["promo_code"] ?? "");
  const [promoStatus, setzePromoStatus] = useState<PromoStatus>("ungeprueft");
  const pruefButtonRef = useRef<HTMLButtonElement>(null);

  /*
   * Wurde einmal versucht abzuschicken, während der Promo-Code noch
   * ungeprüft war? Dann steht am Absende-Knopf, was zu tun ist — statt
   * ihn nur auszugrauen, ohne zu sagen warum.
   */
  const [absendeVersucht, setzeAbsendeVersucht] = useState(false);

  async function pruefePromo() {
    const wert = promoWert.trim();
    if (wert === "") return;
    setzePromoStatus("pruefend");
    setzePromoStatus(await promoCodePruefen(wert));
  }

  /*
   * Ein eingetragener Code muss geprüft sein, bevor der Betrieb entsteht.
   * `nicht-pruefbar` lässt durch — das Feld ist freiwillig, und an einer
   * nicht erreichbaren Prüfung soll die Registrierung nicht scheitern
   * (dieselbe Abwägung wie serverseitig in `pruefePromoCode`). Ohne
   * JavaScript greift die Sperre nicht; dann prüft die Server Action den
   * Code selbst.
   */
  const promoLeer = promoWert.trim() === "";
  const promoOk = promoLeer || promoStatus === "gueltig" || promoStatus === "nicht-pruefbar";

  /*
   * Der Absende-Knopf bleibt anklickbar. Wer ihn mit einem ungeprüften
   * Code drückt, bekommt keine ausgegraute Sackgasse, sondern die
   * Aufforderung, den Code erst zu prüfen — und der Fokus springt auf
   * den Prüf-Knopf, wo die nächste Handlung liegt.
   */
  function beiAbsenden(ereignis: FormEvent<HTMLFormElement>) {
    if (!promoOk) {
      ereignis.preventDefault();
      setzeAbsendeVersucht(true);
      pruefButtonRef.current?.focus();
    }
  }

  return (
    <form
      action={aktion}
      noValidate
      onSubmit={beiAbsenden}
      onBlur={beiVerlassen}
      className="flex flex-col gap-5"
    >
      {zustand.nachricht ? <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung> : null}

      <TextFeld
        id={`${idPraefix}betrieb_name`}
        name="betrieb_name"
        label={texte.felder.betriebName}
        autoComplete="organization"
        maxLength={120}
        defaultValue={werte["betrieb_name"]}
        fehler={fehler("betrieb_name")}
      />

      <SelectFeld
        id={`${idPraefix}land`}
        name="land"
        label={texte.felder.land}
        optionen={laender}
        defaultValue={werte["land"]}
        fehler={fehler("land")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextFeld
          id={`${idPraefix}vorname`}
          name="vorname"
          label={texte.felder.vorname}
          autoComplete="given-name"
          maxLength={80}
          defaultValue={werte["vorname"]}
          fehler={fehler("vorname")}
        />
        <TextFeld
          id={`${idPraefix}nachname`}
          name="nachname"
          label={texte.felder.nachname}
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
        label={texte.felder.email}
        autoComplete="email"
        defaultValue={werte["email"]}
        fehler={fehler("email")}
        hinweis={texte.felder.emailHinweis}
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

      {/*
        Freiwillig und deshalb `required={false}` — die Voreinstellung von
        `TextFeld` ist Pflicht. Kein `autoComplete`: ein Promo-Code ist
        nichts, was der Browser von woanders her kennen könnte.

        Der „Prüfen"-Knopf und die Rückmeldung stehen unter dem Feld. Ein
        eingetragener Code muss geprüft sein, bevor der Betrieb entsteht;
        jede Änderung am Feld setzt die Rückmeldung zurück, damit ein alter
        „passt" nicht über einem inzwischen anderen Code stehen bleibt.
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
        beiEingabe={(wert) => {
          setzePromoWert(wert);
          setzePromoStatus("ungeprueft");
        }}
        unten={
          <div className="flex flex-col gap-2">
            <button
              ref={pruefButtonRef}
              type="button"
              onClick={pruefePromo}
              disabled={promoLeer || promoStatus === "pruefend"}
              className="self-start rounded-blk border border-line-strong px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              {promoStatus === "pruefend" ? texte.promoPruefend : texte.promoPruefen}
            </button>

            <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm">
              {promoStatus === "gueltig" ? (
                <span className="font-medium text-signal">{texte.promoGueltig}</span>
              ) : promoStatus === "unbekannt" ? (
                <span className="font-medium text-stop">
                  {validierung["v.promo.unbekannt"]}
                </span>
              ) : promoStatus === "nicht-pruefbar" ? (
                <span className="text-muted">{texte.promoNichtPruefbar}</span>
              ) : null}
            </p>
          </div>
        }
      />

      <ZustimmungFeld
        idPraefix={idPraefix}
        vorbelegt={werte["zustimmung"] === "ja"}
        fehler={fehler("zustimmung")}
        texte={zustimmungTexte}
      />

      {absendeVersucht && !promoOk ? (
        <p role="alert" className="text-sm font-medium text-stop">
          {promoStatus === "unbekannt"
            ? validierung["v.promo.unbekannt"]
            : texte.promoBittePruefen}
        </p>
      ) : null}

      <AbsendenButton laufend={texte.wirdAngelegt}>{texte.betriebAnlegen}</AbsendenButton>
    </form>
  );
}
