import { getDictionary } from "@/i18n";
import {
  schichtName,
  schichtZustand,
  type Fortsetzung,
  type KalenderSchicht,
} from "@/lib/dashboard/kalender";

type KalenderTexte = ReturnType<typeof getDictionary>["kalender"];

/* ------------------------------------------------------------------ */
/* Kompaktzeile — was die Monatszelle wirklich zeigt                    */
/* ------------------------------------------------------------------ */

/**
 * Eine Schicht als einzeilige Kompaktzeile im Monatsraster.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Umbau 2026-09-21 — „wann arbeite ich?" statt „wer mit welcher Rolle?"
 * ─────────────────────────────────────────────────────────────────────
 *
 * Vorher trug die Zeile einen Rollenfarbbalken links und „N Personen ·
 * Rolle". Die erste Frage an einen Dienstplan ist aber nicht die Rolle,
 * sondern **wann** — und für die angemeldete Person zuerst: *wann muss
 * ich arbeiten?*. Die Rolle ist damit nachrangig; sie steht vollständig
 * auf der Schichtseite (`/dashboard/schicht/…`), einen Klick entfernt.
 *
 * Deshalb trägt die Zeile jetzt:
 *
 *   · **Uhrzeit gross und zuerst** — „09–17" (volle Stunden ohne
 *     Minuten). Das ist die Antwort auf „wann".
 *   · **Die eigene Schicht hervorgehoben** — signalfarbener Grund und
 *     fetter Text. Wer das Raster überfliegt, sieht seine eigenen Tage
 *     sofort, ohne eine Kachel lesen zu müssen.
 *   · **Kein Rollenbalken, keine Rolle, keine Personenzahl.** Wer wirklich
 *     arbeitet und in welcher Rolle, steht im Tagesdetail (Popover am
 *     Tagesknopf) und auf der Schichtseite.
 *
 * Der Schichtname bleibt als gedämpfte zweite Zeile, weil er eine Schicht
 * benennt („Abendservice"), ohne die Rolle zu verraten.
 */
export function KompaktZeile({
  schicht,
  t,
}: {
  schicht: KalenderSchicht;
  t: KalenderTexte;
}) {
  const meine = schichtZustand(schicht) === "meine";
  const name = schichtName(schicht);
  const nachts = schicht.end_zeit < schicht.start_zeit;

  return (
    <a
      href={`/dashboard/schicht/${schicht.id}`}
      className={`flex items-center gap-1.5 rounded-blk px-1.5 py-1 transition-colors ${
        meine
          ? "bg-signal-weak ring-1 ring-inset ring-signal/30 hover:ring-signal/50"
          : "hover:bg-surface-sunk"
      }`}
    >
      <span className="min-w-0 grow">
        <span
          className={`block truncate font-mono text-xs leading-tight text-text ${
            meine ? "font-semibold" : ""
          }`}
        >
          {kurzeZeit(schicht.start_zeit)}–{kurzeZeit(schicht.end_zeit)}
          {nachts ? <span className="text-muted"> +1</span> : null}
        </span>
        {name ? (
          <span className="block truncate text-[0.625rem] leading-tight text-muted">
            {name}
          </span>
        ) : null}
      </span>

      {meine ? <span className="sr-only">{t.duEingeteilt}</span> : null}

      {schicht.understaffed ? (
        <>
          <span
            aria-hidden="true"
            title={t.legendeUnterbesetzt}
            className="size-1.5 shrink-0 rounded-full bg-stop"
          />
          <span className="sr-only">{t.legendeUnterbesetzt}</span>
        </>
      ) : null}
    </a>
  );
}

/** „09:00" → „09", „17:30" → „17:30". Volle Stunden ohne Minuten. */
function kurzeZeit(zeit: string): string {
  const [h, m] = zeit.split(":");
  return m === "00" ? (h ?? "") : `${h}:${m}`;
}

/**
 * Die Fortsetzung als Kompaktzeile — gestrichelt.
 *
 * Sie zählt nicht als Schicht dieses Tages und sieht deshalb bewusst
 * anders aus als die Zeilen darüber.
 */
export function KompaktFortsetzung({
  fortsetzung,
  t,
}: {
  fortsetzung: Fortsetzung;
  t: KalenderTexte;
}) {
  return (
    <a
      href={`/dashboard/schicht/${fortsetzung.id}`}
      className="flex items-center gap-1.5 rounded-blk border border-dashed border-line px-1 py-0.5 transition-colors hover:border-line-strong"
    >
      <span className="truncate font-mono text-[0.6875rem] leading-tight text-muted">
        <span aria-hidden="true">↳ </span>
        {t.fortsetzungKurz.replace("{zeit}", kurzeZeit(fortsetzung.end_zeit))}
      </span>
      <span className="sr-only">{t.fortsetzungHint}</span>
    </a>
  );
}
