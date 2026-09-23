import Link from "next/link";

import { wochentageLang } from "@/lib/dashboard/kalender";
import type {
  Praeferenz,
  TeamTagesPraeferenz,
  TeamWiederkehrendePraeferenz,
} from "@/lib/dashboard/verfuegbarkeit";
import { alsUhrzeit, type Vorlage } from "@/lib/schichten";

export type Sortierung = "tag" | "person";

const WOCHENTAGE = wochentageLang("de");

/**
 * Chef-Sicht auf `/dashboard/verfuegbarkeit`: alle Wünsche des Teams —
 * wiederkehrende (je Vorlage, also Wochentag + Schicht) und die für
 * einzelne kommende Tage samt Notiz. Web-eigen — die App zeigt dem Chef
 * keine Wünsche, der Solver liest sie direkt.
 *
 * Ein Umschalter gruppiert beide Abschnitte nach Tag oder nach Person.
 * Er steht in der Adresse (`?sortierung=person`), nicht im
 * Komponentenzustand — dasselbe Muster wie `RollenFilter`: teilbar, ohne
 * JavaScript, die Seite bleibt eine Server Component.
 *
 * Wünsche zu einer inzwischen deaktivierten Vorlage fallen aus dem
 * wiederkehrenden Teil heraus (`holeVorlagen` liefert nur aktive) — sie
 * wirken im Plan ohnehin nicht mehr.
 */
export function TeamWuensche({
  wiederkehrend,
  tageswuensche,
  vorlagen,
  sortierung,
}: {
  wiederkehrend: TeamWiederkehrendePraeferenz[];
  tageswuensche: TeamTagesPraeferenz[];
  vorlagen: Vorlage[];
  sortierung: Sortierung;
}) {
  return (
    <>
      <nav aria-label="Gruppierung" className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Gruppiert nach</span>
        <Umschalter href="/dashboard/verfuegbarkeit" aktiv={sortierung === "tag"} name="Tag" />
        <Umschalter href="/dashboard/verfuegbarkeit?sortierung=person" aktiv={sortierung === "person"} name="Person" />
      </nav>

      <section aria-labelledby="wiederkehrend-titel" className="mt-8">
        <h2 id="wiederkehrend-titel" className="font-display text-lg text-text">
          Wiederkehrende Wünsche
        </h2>
        <p className="mt-1 text-sm text-muted">Gelten für jedes Vorkommen des Wochentags.</p>
        <Wiederkehrend wuensche={wiederkehrend} vorlagen={vorlagen} sortierung={sortierung} />
      </section>

      <section aria-labelledby="tage-titel" className="mt-10">
        <h2 id="tage-titel" className="font-display text-lg text-text">
          Wünsche für einzelne Tage
        </h2>
        <p className="mt-1 text-sm text-muted">Kommende Tage, mit Notizen. Überschreiben die wiederkehrenden.</p>
        <Tageswuensche wuensche={tageswuensche} vorlagen={vorlagen} sortierung={sortierung} />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function vorlagenName(v: Vorlage): string {
  return `${WOCHENTAGE[v.wochentag] ?? ""} · ${v.bezeichnung} (${alsUhrzeit(v.start_zeit)}–${alsUhrzeit(v.end_zeit)})`;
}

function Wiederkehrend({
  wuensche,
  vorlagen,
  sortierung,
}: {
  wuensche: TeamWiederkehrendePraeferenz[];
  vorlagen: Vorlage[];
  sortierung: Sortierung;
}) {
  /* `holeVorlagen` sortiert bereits montagsbasiert nach Wochentag und Beginn. */
  const reihenfolge = new Map(vorlagen.map((v, i) => [v.id, i]));
  const bekannt = wuensche.filter((w) => reihenfolge.has(w.schichtVorlageId));

  if (bekannt.length === 0) {
    return <p className="mt-4 text-sm text-muted">Noch keine wiederkehrenden Wünsche.</p>;
  }

  if (sortierung === "tag") {
    return (
      <ul className="mt-4 flex flex-col gap-2">
        {vorlagen.map((v) => {
          const hier = bekannt.filter((w) => w.schichtVorlageId === v.id);
          if (hier.length === 0) return null;
          return (
            <li key={v.id} className="rounded-card border border-line bg-surface px-4 py-3">
              <h3 className="text-sm font-semibold text-text">{vorlagenName(v)}</h3>
              <NamenZeile praeferenz="gerne" namen={hier.filter((w) => w.praeferenz === "gerne").map((w) => w.name)} />
              <NamenZeile praeferenz="ungerne" namen={hier.filter((w) => w.praeferenz === "ungerne").map((w) => w.name)} />
            </li>
          );
        })}
      </ul>
    );
  }

  const vorlageVon = new Map(vorlagen.map((v) => [v.id, v]));
  return (
    <div className="mt-4 flex flex-col gap-5">
      {nachPerson(bekannt).map(([id, eintraege]) => (
        <div key={id}>
          <h3 className="text-sm font-semibold text-text">{eintraege[0]?.name ?? "Ohne Namen"}</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {[...eintraege]
              .sort((a, b) => (reihenfolge.get(a.schichtVorlageId) ?? 0) - (reihenfolge.get(b.schichtVorlageId) ?? 0))
              .map((w) => {
                const v = vorlageVon.get(w.schichtVorlageId);
                return (
                  <li
                    key={w.schichtVorlageId}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-blk border border-line bg-surface px-4 py-2 text-sm"
                  >
                    <span className="text-text">{v ? vorlagenName(v) : "Schicht"}</span>
                    <PraeferenzText praeferenz={w.praeferenz} />
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NamenZeile({ praeferenz, namen }: { praeferenz: Praeferenz; namen: string[] }) {
  if (namen.length === 0) return null;
  return (
    <p className="mt-1.5 text-sm">
      <PraeferenzText praeferenz={praeferenz} />
      <span className="text-muted">: </span>
      <span className="text-text">{namen.join(", ")}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */

function Tageswuensche({
  wuensche,
  vorlagen,
  sortierung,
}: {
  wuensche: TeamTagesPraeferenz[];
  vorlagen: Vorlage[];
  sortierung: Sortierung;
}) {
  if (wuensche.length === 0) {
    return <p className="mt-4 text-sm text-muted">Keine Wünsche für kommende Tage.</p>;
  }

  const namen = new Map(
    vorlagen.map((v) => [v.id, `${v.bezeichnung} (${alsUhrzeit(v.start_zeit)}–${alsUhrzeit(v.end_zeit)})`]),
  );
  const schicht = (w: TeamTagesPraeferenz) => namen.get(w.schichtVorlageId) ?? "Schicht";

  const gruppen: [string, TeamTagesPraeferenz[]][] =
    sortierung === "person"
      ? nachPerson(wuensche).map(([id, e]) => [id, [...e].sort((a, b) => a.datum.localeCompare(b.datum))])
      : gruppiere(wuensche, (w) => w.datum);

  return (
    <div className="mt-4 flex flex-col gap-5">
      {gruppen.map(([schluessel, eintraege]) => (
        <div key={schluessel}>
          <h3 className="text-sm font-semibold text-text">
            {sortierung === "person" ? (eintraege[0]?.name ?? "Ohne Namen") : langesDatum(schluessel)}
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {eintraege.map((w) => (
              <li
                key={`${w.mitarbeiterId}-${w.schichtVorlageId}-${w.datum}`}
                className="rounded-card border border-line bg-surface px-4 py-3"
              >
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  {sortierung === "person" ? (
                    <time dateTime={w.datum} className="font-semibold text-text">
                      {kurzesDatum(w.datum)}
                    </time>
                  ) : (
                    <span className="font-semibold text-text">{w.name}</span>
                  )}
                  <span className="text-muted">{schicht(w)}</span>
                  <PraeferenzText praeferenz={w.praeferenz} />
                </p>
                {w.notiz ? (
                  <p className="mt-2 whitespace-pre-line rounded-blk bg-surface-sunk px-3 py-2 text-sm leading-relaxed text-text">
                    {w.notiz}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PraeferenzText({ praeferenz }: { praeferenz: Praeferenz }) {
  return (
    <span className={`text-xs font-semibold ${praeferenz === "gerne" ? "text-text" : "text-muted"}`}>
      {praeferenz === "gerne" ? "Gerne" : "Ungerne"}
    </span>
  );
}

function gruppiere<T>(liste: T[], schluessel: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of liste) m.set(schluessel(x), [...(m.get(schluessel(x)) ?? []), x]);
  return [...m.entries()];
}

/** Nach Person gruppiert, Gruppen alphabetisch nach Name. */
function nachPerson<T extends { mitarbeiterId: string; name: string }>(liste: T[]): [string, T[]][] {
  return gruppiere(
    [...liste].sort((a, b) => a.name.localeCompare(b.name, "de")),
    (x) => x.mitarbeiterId,
  );
}

function langesDatum(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function kurzesDatum(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Optik wie `RollenFilter` — ein Link, kein Knopf: die Wahl steht in der Adresse. */
function Umschalter({ href, aktiv, name }: { href: string; aktiv: boolean; name: string }) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={aktiv ? "true" : undefined}
      className={`rounded-blk border px-2.5 py-1.5 text-sm font-medium transition-colors ${
        aktiv ? "border-signal bg-signal-weak text-text" : "border-line text-muted hover:border-line-strong hover:text-text"
      }`}
    >
      {name}
    </Link>
  );
}
