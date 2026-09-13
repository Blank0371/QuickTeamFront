import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/container";
import { Uebernehmen } from "@/components/dashboard/uebernehmen";
import { leseAusschreibung } from "@/lib/dashboard/ausschreibung";
import {
  WOCHENTAGE_LANG,
  MONATSNAMEN,
  hhmm,
} from "@/lib/dashboard/kalender";
import { holeNotizen, holeSchicht, holeZuweisbareMitarbeiter } from "@/lib/dashboard/schicht";
import { betreteDashboard, istChef } from "@/lib/dashboard/zugang";

import { RosterEditor } from "./roster-editor";
import { SchichtFelderFormular, SchichtLoeschenFormular } from "./schicht-formular";

export const metadata: Metadata = {
  title: "Schicht",
  description: "Eine Schicht im Detail: Zeiten, Besetzung, Notizen.",
  robots: { index: false, follow: false },
};

/**
 * Schichtdetail. Besetzung, eigene Felder (Zeiten/Kommentar) und Löschen
 * sind jetzt editierbar — Parity-Audits „manual-shift-assignment" und
 * „shift-editing" vom 2026-09-01, Spiegel von `shift/[id].tsx` in der
 * App. Notizen schreiben bleibt Phase 1, also lesend.
 *
 * Eigene Adresse statt Überblendung wie in der App: im Web ist eine
 * Schicht etwas, das man verlinken, teilen und im zweiten Tab offen
 * lassen können soll. Später zeigen auch Mitteilungen und Tauschanfragen
 * hierher.
 */
export default async function SchichtSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, position } = await betreteDashboard();
  const { id } = await params;

  const ergebnis = await holeSchicht(supabase, id, position.mitarbeiterId);

  /*
   * `null` heisst „gibt es nicht" **oder** „darfst du nicht sehen" — die
   * Funktion unterscheidet das nicht, und die Oberfläche tut es auch
   * nicht. Alles andere verriete die Existenz fremder Schichten.
   */
  if (ergebnis === null) notFound();

  const { schicht, status } = ergebnis;
  const notizen = await holeNotizen(supabase, id, position.mitarbeiterId);

  /*
   * Dieselbe Bedingung wie `canEdit = shift.can_edit && isChef` in der
   * App: `can_edit` kommt aus `schicht_ansehen` (Serverseite), `istChef`
   * aus der lokalen Position — beides zusammen, keins allein.
   */
  const bearbeitbar = schicht.can_edit && istChef(position);
  const team = bearbeitbar ? await holeZuweisbareMitarbeiter(supabase, position.betriebId) : [];

  /*
   * `claim` kommt aus `schicht_ansehen` und ist dort bereits gefiltert:
   * enthalten sind nur Rollen, die diese Person hat **und** für die
   * `count(zuweisungen) < benoetigt` gilt (Zeile 79-81 der Funktion).
   * Anders als im Kalender, wo `open` die Kapazität nicht prüft, muss
   * hier nichts nachgerechnet werden.
   */
  const ausschreibung = leseAusschreibung(schicht.claim);

  const datum = new Date(`${schicht.datum}T12:00:00`);
  const wochentag = WOCHENTAGE_LANG[(datum.getDay() + 6) % 7];
  const ueberNacht = schicht.end_zeit < schicht.start_zeit;
  const bezeichnung = schicht.label?.trim() ? schicht.label.trim() : null;

  return (
    <Container className="py-8 sm:py-10">
      <div className="w-full max-w-3xl">
        <Link
          href={`/dashboard/kalender?monat=${schicht.datum.slice(0, 7)}`}
          className="text-sm font-medium text-muted transition-colors hover:text-text"
        >
          <span aria-hidden="true">‹</span> Zurück zum Kalender
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl leading-tight sm:text-3xl">
              {bezeichnung ?? "Schicht"}
            </h1>
            {bearbeitbar ? null : (
              <p className="mt-1 text-base text-muted">
                <time dateTime={schicht.datum}>
                  {wochentag}, {datum.getDate()}. {MONATSNAMEN[datum.getMonth()]}{" "}
                  {datum.getFullYear()}
                </time>
                {" · "}
                <span className="font-mono">
                  {hhmm(schicht.start_zeit)}–{hhmm(schicht.end_zeit)}
                </span>
                {ueberNacht ? (
                  <span className="text-muted"> (über Mitternacht)</span>
                ) : null}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {status === "geplant" ? (
              <Merker art="entwurf">Entwurf</Merker>
            ) : null}
            {schicht.mine && !schicht.canceled ? (
              <Merker art="mein">Du bist eingeteilt</Merker>
            ) : null}
            {schicht.canceled ? <Merker art="stop">Abgemeldet</Merker> : null}
            {schicht.open ? <Merker art="offen">Frei zu übernehmen</Merker> : null}
            {schicht.swap_wanted ? <Merker art="neutral">Tausch gesucht</Merker> : null}
            {schicht.understaffed ? <Merker art="stop">Unterbesetzt</Merker> : null}
          </div>
        </div>

        {status === "geplant" ? (
          <p className="mt-4 rounded-blk border border-dashed border-line-strong bg-surface-sunk px-4 py-3 text-sm leading-relaxed text-muted">
            Diese Schicht ist ein Entwurf und für das Team noch nicht sichtbar. Sie
            wird es erst, wenn der Plan veröffentlicht ist.
          </p>
        ) : null}

        {/*
          Der Merker oben sagt „Frei zu übernehmen" — hier steht, was man
          dagegen tun kann. Bewusst ein eigener Abschnitt und kein
          klickbarer Merker: ein Zustandsschild, das zugleich ein Knopf
          ist, ist beides halb. Ausserdem braucht die Auswahl Platz,
          sobald die Ausschreibung mehr als eine Rolle trägt.

          Die Übernahme ist sofort verbindlich — der RPC schreibt die
          Zuweisung ohne Zwischenstatus, und ein Gegenstück zu
          `ask_chef_for_shift_switch` gibt es für Ausschreibungen nicht.
          Deshalb steht das auch so da.
        */}
        {ausschreibung ? (
          <section
            aria-labelledby="uebernehmen-titel"
            className="mt-6 rounded-card border border-signal/40 bg-signal-weak p-5"
          >
            <h2 id="uebernehmen-titel" className="font-display text-base font-bold text-text">
              Diese Schicht ist ausgeschrieben
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Du hast die passende Rolle. Wer zuerst übernimmt, ist eingeteilt — eine
              Bestätigung durch die Betriebsleitung gibt es nicht.
            </p>
            <Uebernehmen
              benachrichtigungId={ausschreibung.benachrichtigungId}
              instanzId={id}
              rollen={ausschreibung.rollen}
            />
          </section>
        ) : null}

        {bearbeitbar ? (
          <section aria-labelledby="felder-titel" className="mt-8">
            <h2
              id="felder-titel"
              className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
            >
              Zeiten und Kommentar
            </h2>
            <SchichtFelderFormular
              instanzId={id}
              datum={schicht.datum}
              startZeit={schicht.start_zeit}
              endZeit={schicht.end_zeit}
              kommentar={schicht.kommentar ?? ""}
            />
          </section>
        ) : schicht.kommentar?.trim() ? (
          <section aria-labelledby="kommentar-titel" className="mt-8">
            <h2
              id="kommentar-titel"
              className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
            >
              Hinweis zur Schicht
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text">
              {schicht.kommentar}
            </p>
          </section>
        ) : null}

        {bearbeitbar ? (
          <section aria-labelledby="besetzung-titel" className="mt-8">
            <h2
              id="besetzung-titel"
              className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
            >
              Besetzung
            </h2>
            <RosterEditor instanzId={id} teilnehmer={schicht.participants} team={team} />
          </section>
        ) : (
          <Besetzung schicht={schicht} />
        )}

        {schicht.bedarf !== null ? <Bedarf bedarf={schicht.bedarf} /> : null}

        <Notizen notizen={notizen} />

        {bearbeitbar ? (
          <section aria-labelledby="loeschen-titel" className="mt-10">
            <h2
              id="loeschen-titel"
              className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
            >
              Gefahrenzone
            </h2>
            <div className="mt-3">
              <SchichtLoeschenFormular instanzId={id} monat={schicht.datum.slice(0, 7)} />
            </div>
          </section>
        ) : null}
      </div>
    </Container>
  );
}

/**
 * `erstellt_am` ist ein `timestamptz` und wird hier auf dem Server
 * formatiert — die Zeitzone muss deshalb ausgeschrieben werden.
 *
 * Ohne sie nähme `toLocaleString` die des Servers, und die ist auf Vercel
 * UTC: eine Notiz, die um 20:00 im Lokal geschrieben wurde, stünde als
 * 18:00 da. Kein Absturz, keine Warnung, nur eine Uhrzeit, die nicht
 * stimmt — und bei einer Schichtnotiz ist gerade die Uhrzeit die
 * Information.
 *
 * `Europe/Vienna` fest verdrahtet, weil der Zielmarkt AT und DE ist und
 * beide dieselbe Zone haben. Käme ein Land mit anderer Zone dazu, gehört
 * hier die Zone des Betriebs hin — die Tabelle kennt sie heute nicht.
 */
function zeitpunkt(iso: string): string {
  return new Date(iso).toLocaleString("de-AT", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Vienna",
  });
}

function Merker({
  art,
  children,
}: {
  art: "entwurf" | "mein" | "stop" | "offen" | "neutral";
  children: string;
}) {
  const stil = {
    entwurf: "border-dashed border-line-strong text-muted",
    mein: "border-signal/60 bg-signal-weak text-text",
    stop: "border-stop/60 bg-stop/10 text-stop",
    offen: "border-dashed border-signal/70 bg-signal-weak text-text",
    neutral: "border-line text-muted",
  }[art];

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${stil}`}
    >
      {children}
    </span>
  );
}

/**
 * Wer arbeitet.
 *
 * Eine leere Liste bekommt eine eigene Erklärung, weil sie zweideutig
 * ist: `schicht_ansehen` schneidet die Teilnehmer nach
 * `mitarbeiter_sehen_andere_mitarbeiter` zu. „Niemand eingeteilt" und
 * „du darfst die anderen nicht sehen" sehen in den Daten gleich aus —
 * ausser man ist selbst dabei.
 */
function Besetzung({
  schicht,
}: {
  schicht: { participants: { name: string; role_name: string | null; attendet: boolean; is_me: boolean }[]; can_edit: boolean };
}) {
  return (
    <section aria-labelledby="besetzung-titel" className="mt-8">
      <h2
        id="besetzung-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        Besetzung
      </h2>

      {schicht.participants.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {schicht.can_edit
            ? "Für diese Schicht ist noch niemand eingeteilt."
            : "Hier steht niemand — entweder ist noch niemand eingeteilt, oder dein Betrieb zeigt die Namen der anderen nicht an."}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {schicht.participants.map((person, i) => (
            <li
              key={`${person.name}-${i}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-blk border border-line bg-surface px-4 py-2.5"
            >
              <span
                className={`text-sm ${
                  person.attendet ? "text-text" : "text-muted line-through"
                } ${person.is_me ? "font-semibold" : ""}`}
              >
                {person.name}
                {person.is_me ? " (du)" : ""}
              </span>

              {person.role_name ? (
                <span className="text-xs text-muted">{person.role_name}</span>
              ) : null}

              {!person.attendet ? (
                <span className="text-xs font-semibold text-stop">
                  fällt aus
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Mindestbesetzung je Rolle — nur für Chefs, weil die Funktion `bedarf`
 * für alle anderen gar nicht erst füllt.
 *
 * Gezählt wird `besetzt` ohne die Abgemeldeten: `coalesce(z.attendet,
 * true)` steht so in der Funktion. Wer sich abmeldet, bleibt in der
 * Besetzungsliste stehen, zählt aber nicht mehr mit — genau deshalb kann
 * eine Schicht mit vier Namen unterbesetzt sein.
 *
 * **Eine leere Liste heisst nicht „unsichtbar".** Der Satz aus
 * `CLAUDE.md`, dass etwas ohne Mindestbesetzung in der App nicht
 * erscheint, gilt für `schicht_vorlagen` — dort filtert `scheduling.tsx`
 * danach. Für eine bereits erzeugte `schicht_instanz` gilt er nicht:
 * `kalender_schichten` kennt keinen solchen Filter, die Schicht steht
 * ganz normal im Plan. In Testbetrieb 12 trifft das auf 16 von 164
 * Instanzen zu — alle von Hand angelegt und direkt besetzt.
 */
function Bedarf({
  bedarf,
}: {
  bedarf: { rolle_id: string; role_name: string | null; benoetigt: number; besetzt: number }[];
}) {
  return (
    <section aria-labelledby="bedarf-titel" className="mt-8">
      <h2
        id="bedarf-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        Mindestbesetzung
      </h2>

      {bedarf.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Für diese Schicht ist keine Mindestbesetzung hinterlegt — üblich bei
          Schichten, die von Hand angelegt und direkt besetzt wurden. Sie ist
          normal sichtbar; es fehlt nur der Sollwert, gegen den sich eine
          Unterbesetzung feststellen liesse.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {bedarf.map((zeile) => {
            const fehlt = zeile.besetzt < zeile.benoetigt;
            return (
              <li
                key={zeile.rolle_id}
                className={`rounded-blk border px-4 py-2 text-sm ${
                  fehlt ? "border-stop/60 bg-stop/10" : "border-line bg-surface"
                }`}
              >
                <span className="text-text">{zeile.role_name ?? "Ohne Rolle"}</span>{" "}
                <span
                  className={`font-mono ${fehlt ? "font-semibold text-stop" : "text-muted"}`}
                >
                  {zeile.besetzt}/{zeile.benoetigt}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Notizen zur Schicht, lesend.
 *
 * `autor_name` kann `null` sein — dann darf der Name nicht gezeigt
 * werden, und es steht ausdrücklich nicht „Unbekannt": die Notiz hat
 * sehr wohl einen Autor, wir dürfen ihn nur nicht nennen.
 *
 * Geschrieben wird hier nichts; Phase 1 ist lesend.
 */
function Notizen({
  notizen,
}: {
  notizen: {
    id: string;
    text: string;
    autor_name: string | null;
    is_me: boolean;
    erstellt_am: string;
  }[];
}) {
  if (notizen.length === 0) return null;

  return (
    <section aria-labelledby="notizen-titel" className="mt-8">
      <h2
        id="notizen-titel"
        className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted"
      >
        Notizen
      </h2>

      <ul className="mt-3 flex flex-col gap-3">
        {notizen.map((notiz) => (
          <li
            key={notiz.id}
            className="rounded-card border border-line bg-surface px-4 py-3"
          >
            <p className="whitespace-pre-line text-sm leading-relaxed text-text">
              {notiz.text}
            </p>
            <p className="mt-2 text-xs text-muted">
              {notiz.is_me
                ? "von dir"
                : notiz.autor_name
                  ? `von ${notiz.autor_name}`
                  : "von jemandem im Team"}
              {" · "}
              <time dateTime={notiz.erstellt_am}>{zeitpunkt(notiz.erstellt_am)}</time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
