"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * „Konto löschen" — nur nach drei Sekunden Halten.
 *
 * Der Weg zur Löschseite ist destruktiv, deshalb kein gewöhnlicher Tipp:
 * Wischen im Menü darf die Seite nicht versehentlich öffnen. Ein Druck
 * füllt über drei Sekunden einen Balken; erst wenn er voll ist, geht es
 * weiter (`/dashboard`… → `/kontoloeschung`, die selbst noch dreistufig
 * bestätigt). Loslassen vorher bricht ab.
 *
 * **Mit der Tastatur bedienbar:** ein `<a>` mit echtem `href`. Eine
 * Aktivierung per Enter (Klick mit `detail === 0`) navigiert sofort — die
 * Zielseite ist die Sicherung, nicht dieser Balken. Nur der Zeiger-Klick
 * (Maus/Finger) wird abgefangen und verlangt das Halten. Ohne JavaScript
 * ist der Link ein normaler Link; das Menü selbst braucht aber ohnehin JS
 * zum Öffnen.
 */
const DAUER_MS = 3000;

export function KontoLoeschenHalten({
  label,
  haltenHinweis,
}: {
  label: string;
  haltenHinweis: string;
}) {
  const router = useRouter();
  const [fortschritt, setFortschritt] = useState(0); // 0 … 1
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const fertig = useRef(false);

  const abbrechen = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  useEffect(() => abbrechen, [abbrechen]);

  const loslassen = useCallback(() => {
    if (fertig.current) return;
    abbrechen();
    setFortschritt(0);
  }, [abbrechen]);

  const tick = useCallback(
    (now: number) => {
      const p = Math.min(1, (now - start.current) / DAUER_MS);
      setFortschritt(p);
      if (p >= 1) {
        fertig.current = true;
        abbrechen();
        router.push("/kontoloeschung");
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [abbrechen, router],
  );

  function starten(e: React.PointerEvent<HTMLAnchorElement>) {
    if (!e.isPrimary) return;
    e.preventDefault(); // kein Textmarkieren, kein Zeiger-Klick
    fertig.current = false;
    start.current = performance.now();
    abbrechen();
    raf.current = requestAnimationFrame(tick);
  }

  const haelt = fortschritt > 0;

  return (
    <a
      href="/kontoloeschung"
      // Zeiger-Klick abfangen (Halten verlangt), Tastatur (detail === 0)
      // durchlassen.
      onClick={(e) => {
        if (e.detail !== 0) e.preventDefault();
      }}
      onPointerDown={starten}
      onPointerUp={loslassen}
      onPointerLeave={loslassen}
      onPointerCancel={loslassen}
      role="button"
      aria-label={`${label} — ${haltenHinweis}`}
      className={`relative flex touch-none select-none items-center gap-3 overflow-hidden rounded-blk px-3 py-3 text-sm font-medium text-stop transition-colors hover:bg-surface-sunk ${
        haelt ? "bg-surface-sunk" : ""
      }`}
    >
      {/* Fortschrittsfüllung — wächst mit der Haltedauer. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-stop/15"
        style={{ width: `${fortschritt * 100}%` }}
      />

      <Trash2 className="relative size-5 shrink-0" aria-hidden="true" />
      <span className="relative flex min-w-0 flex-col leading-tight">
        <span>{label}</span>
        <span className="text-[0.6875rem] font-normal text-muted">{haltenHinweis}</span>
      </span>
    </a>
  );
}
