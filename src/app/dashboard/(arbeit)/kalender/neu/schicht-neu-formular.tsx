"use client";

import { AlertTriangle, Check } from "lucide-react";
import { startTransition, useActionState, useMemo, useRef, useState, type FormEvent } from "react";

import { DatumWahl } from "@/components/formular/datum-wahl";
import { FormMeldung } from "@/components/formular/felder";
import { ZahlStepper } from "@/components/formular/zahl-stepper";
import { ZeitWahl } from "@/components/formular/zeit-wahl";
import type { Dictionary } from "@/i18n/de";
import { useKlientTexte } from "@/i18n/sprach-provider";
import { fuelle } from "@/i18n/text";
import type { ZuweisbareRolle, ZuweisbarerMitarbeiter } from "@/lib/dashboard/schicht";
import { beginnVorbei } from "@/lib/datum";
import { feldFehler, leererZustand } from "@/lib/formular";
import { leseSchichtErstellen, schichtErstellenSchema } from "@/lib/validierung";

import { schichtErstellen, type SchichtNeuZustand } from "./aktionen";

type Texte = Dictionary["schichtNeu"];
type Modus = "zuweisung" | "ausschreibung";

const chipBasis =
  "rounded-blk border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70";
function chipKlasse(aktiv: boolean): string {
  return `${chipBasis} ${aktiv ? "border-signal bg-signal-weak text-text" : "border-line text-muted hover:text-text"}`;
}

function Fehler({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-stop">
      {text}
    </p>
  );
}

/**
 * Formular „Schicht erstellen" — Spiegel von `CreateShiftModal` in
 * `calendar.tsx`: Datum, Beginn, Ende, Kommentar, dann entweder Personen
 * direkt einteilen oder die Schicht je Rolle offen ausschreiben.
 *
 * Abgeschickt wird über `onSubmit` statt `<form action>`: React setzt ein
 * Formular nach einer Action sonst zurück, und die Auswahl (wer, welche
 * Rolle, wie viele) soll eine Fehlermeldung oder den Urlaubshinweis
 * überleben. Die Schema-Prüfung läuft vorher im Browser (Komfort) und in
 * der Action noch einmal (Verteidigung).
 */
export function SchichtNeuFormular({
  datum,
  heute,
  team,
  rollen,
  texte: t,
}: {
  datum: string;
  heute: string;
  team: ZuweisbarerMitarbeiter[];
  rollen: ZuweisbareRolle[];
  texte: Texte;
}) {
  const { validierung } = useKlientTexte();
  const [zustand, aktion, laeuft] = useActionState<SchichtNeuZustand, FormData>(
    schichtErstellen,
    leererZustand,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [modus, setModus] = useState<Modus>("zuweisung");
  const [auswahl, setAuswahl] = useState<Map<string, string>>(new Map()); // mitarbeiter → rolle
  const [suche, setSuche] = useState("");
  const [rollenFilter, setRollenFilter] = useState<string | null>(null);
  /** Fehler aus der Browser-Prüfung; `null`, sobald der Server geantwortet hat. */
  const [lokal, setLokal] = useState<Record<string, string> | null>(null);
  const [warnungZu, setWarnungZu] = useState<SchichtNeuZustand | null>(null);

  const felder = lokal ?? zustand.felder;
  const warnungen = zustand.warnungen && warnungZu !== zustand ? zustand.warnungen : null;

  const datumWert = zustand.werte?.datum ?? datum;
  const startWert = zustand.werte?.start_zeit ?? "09:00";
  const endWert = zustand.werte?.end_zeit ?? "17:00";
  const kommentarWert = zustand.werte?.kommentar ?? "";

  // Wie in der App: nach erster Rolle sortiert, Personen ohne Rolle ans Ende.
  const sichtbar = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const ersteRolle = (m: ZuweisbarerMitarbeiter) => (m.rollen[0]?.name ?? "￿").toLowerCase();
    return team
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
      .filter((m) => (rollenFilter ? m.rollen.some((r) => r.id === rollenFilter) : true))
      .sort((a, b) => ersteRolle(a).localeCompare(ersteRolle(b)) || a.name.localeCompare(b.name));
  }, [team, suche, rollenFilter]);

  function umschalten(m: ZuweisbarerMitarbeiter) {
    const erste = m.rollen[0];
    if (!erste) return;
    setAuswahl((vorher) => {
      const neu = new Map(vorher);
      if (neu.has(m.id)) neu.delete(m.id);
      else neu.set(m.id, erste.id);
      return neu;
    });
  }

  function rolleSetzen(mitarbeiterId: string, rolleId: string) {
    setAuswahl((vorher) => new Map(vorher).set(mitarbeiterId, rolleId));
  }

  function senden(trotzdem: boolean) {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const roh = leseSchichtErstellen(fd);
    const geprueft = schichtErstellenSchema.safeParse(roh);
    if (!geprueft.success) {
      setLokal(feldFehler(geprueft.error, validierung));
      return;
    }
    if (beginnVorbei(geprueft.data.datum, geprueft.data.startZeit)) {
      setLokal({ datum: validierung["v.schicht.vergangen"] ?? "" });
      return;
    }
    setLokal(null);
    if (trotzdem) fd.set("trotzdem", "ja");
    startTransition(() => aktion(fd));
  }

  function absenden(ereignis: FormEvent<HTMLFormElement>) {
    ereignis.preventDefault();
    senden(false);
  }

  const anzahl = auswahl.size;

  return (
    <form ref={formRef} onSubmit={absenden} noValidate className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="modus" value={modus} />

      {zustand.nachricht ? (
        <FormMeldung art="fehler">{zustand.nachricht}</FormMeldung>
      ) : null}

      <section className="rounded-panel border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap gap-3">
          <DatumWahl
            key={`datum-${datumWert}`}
            name="datum"
            label={t.datum}
            defaultValue={datumWert}
            min={heute}
            fehler={felder.datum}
          />
          <ZeitWahl
            key={`start-${startWert}`}
            id="neu-start"
            name="start_zeit"
            label={t.start}
            defaultValue={startWert}
            fehler={felder.startZeit}
          />
          <ZeitWahl
            key={`ende-${endWert}`}
            id="neu-ende"
            name="end_zeit"
            label={t.ende}
            defaultValue={endWert}
            fehler={felder.endZeit}
            hinweis={t.ueberNachtHinweis}
          />
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">{t.kommentar}</span>
          <textarea
            key={`kommentar-${kommentarWert}`}
            name="kommentar"
            defaultValue={kommentarWert}
            maxLength={140}
            rows={2}
            placeholder={t.kommentarPlatzhalter}
            aria-describedby="neu-kommentar-hinweis"
            className="rounded-blk border border-line-strong bg-bg px-3.5 py-2.5 text-text"
          />
          <span id="neu-kommentar-hinweis" className="text-xs text-muted">
            {t.kommentarHinweis}
          </span>
          {felder.kommentar ? (
            <span className="text-sm font-medium text-stop">{felder.kommentar}</span>
          ) : null}
        </label>
      </section>

      <fieldset className="rounded-panel border border-line bg-surface p-4 shadow-card sm:p-5">
        <legend className="sr-only">{t.modusLegende}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-blk border border-line bg-bg p-1">
          {(["zuweisung", "ausschreibung"] as const).map((m) => (
            <label
              key={m}
              className={`cursor-pointer rounded-blk px-3 py-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal ${
                modus === m ? "bg-signal text-signal-ink" : "text-text hover:bg-surface-sunk"
              }`}
            >
              <input
                type="radio"
                name="modus_wahl"
                value={m}
                checked={modus === m}
                onChange={() => setModus(m)}
                className="sr-only"
              />
              {m === "zuweisung" ? t.modusZuweisen : t.modusAusschreiben}
            </label>
          ))}
        </div>

        {/* Beide Teile bleiben gemountet: ein Moduswechsel verwirft nichts. */}
        <div className={modus === "zuweisung" ? "mt-4" : "hidden"}>
          <p className="text-sm font-medium text-text">
            {t.personenWaehlen}
            {anzahl > 0 ? (
              <span className="ml-2 text-muted">· {fuelle(t.gewaehlt, { n: anzahl })}</span>
            ) : null}
          </p>

          {[...auswahl.entries()].map(([mitarbeiterId, rolleId]) => (
            <input key={mitarbeiterId} type="hidden" name="zuweisung" value={`${mitarbeiterId}:${rolleId}`} />
          ))}

          <input
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder={t.suchen}
            aria-label={t.suchen}
            className="mt-3 w-full rounded-blk border border-line-strong bg-bg px-3.5 py-2 text-sm text-text"
          />

          {rollen.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setRollenFilter(null)} className={chipKlasse(rollenFilter === null)}>
                {t.alleRollen}
              </button>
              {rollen.map((r) => (
                <button key={r.id} type="button" onClick={() => setRollenFilter(r.id)} className={chipKlasse(rollenFilter === r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
          ) : null}

          {sichtbar.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t.niemandGefunden}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2" aria-describedby={felder.zuweisungen ? "neu-zuweisungen-fehler" : undefined}>
              {sichtbar.map((m) => {
                const gewaehlt = auswahl.get(m.id);
                const planbar = m.rollen.length > 0;
                return (
                  <li
                    key={m.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-blk border px-3 py-2 ${
                      gewaehlt ? "border-signal/60 bg-signal-weak" : "border-line bg-bg"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => umschalten(m)}
                      disabled={!planbar}
                      aria-pressed={Boolean(gewaehlt)}
                      className="flex min-w-0 grow items-center gap-3 text-left disabled:cursor-not-allowed"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-5 shrink-0 items-center justify-center rounded-blk border ${
                          gewaehlt ? "border-signal bg-signal text-signal-ink" : "border-line-control"
                        }`}
                      >
                        {gewaehlt ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm font-medium ${planbar ? "text-text" : "text-muted"}`}>
                          {m.name}
                        </span>
                        <span className="block text-xs text-muted">
                          {planbar ? m.rollen.map((r) => r.name).join(", ") : t.keineRolle}
                        </span>
                      </span>
                    </button>

                    {gewaehlt && m.rollen.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={fuelle(t.rolleFuer, { name: m.name })}>
                        {m.rollen.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => rolleSetzen(m.id, r.id)}
                            aria-pressed={gewaehlt === r.id}
                            className={chipKlasse(gewaehlt === r.id)}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <Fehler id="neu-zuweisungen-fehler" text={felder.zuweisungen} />
        </div>

        <div className={modus === "ausschreibung" ? "mt-4" : "hidden"}>
          <p className="text-sm font-medium text-text">{t.rollenBenoetigt}</p>
          {rollen.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t.keineRollen}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {rollen.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-blk border border-line bg-bg px-3 py-2"
                >
                  <label htmlFor={`bedarf-${r.id}`} className="text-sm font-medium text-text">
                    {r.name}
                  </label>
                  <ZahlStepper id={`bedarf-${r.id}`} name={`bedarf_${r.id}`} label={r.name} min={0} max={99} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted">{t.ausschreibenHinweis}</p>
          <Fehler id="neu-bedarf-fehler" text={felder.bedarf} />
        </div>
      </fieldset>

      {warnungen ? (
        <div role="alertdialog" aria-labelledby="neu-warnung-titel" className="rounded-panel border border-stop/40 bg-stop/10 p-4">
          <p id="neu-warnung-titel" className="flex items-center gap-2 font-display text-sm font-bold text-text">
            <AlertTriangle className="size-4 text-stop" aria-hidden="true" />
            {t.warnTitel}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-text">
            {warnungen.map((w, i) => (
              <li key={`${w.name}-${i}`}>
                <strong>{w.name}</strong> — {w.gruende.join(", ")}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={laeuft}
              onClick={() => senden(true)}
              className="rounded-blk bg-signal px-4 py-2 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:opacity-70"
            >
              {t.trotzdem}
            </button>
            <button
              type="button"
              onClick={() => setWarnungZu(zustand)}
              className="rounded-blk border border-line px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-sunk"
            >
              {t.abbrechen}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div>
          <button
            type="submit"
            disabled={laeuft || Boolean(warnungen)}
            className="rounded-blk bg-signal px-5 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {laeuft ? t.laeuft : modus === "zuweisung" ? t.erstellen : t.ausschreiben}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-muted">{t.sofortHinweis}</p>
      </div>
    </form>
  );
}
