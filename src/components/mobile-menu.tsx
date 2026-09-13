"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type NavLink = { href: string; label: string };

/**
 * Einzige interaktive Insel im Header. Bewusst ohne Dialog-Bibliothek:
 * ein Panel, ein Zustand, Fokus bleibt im Dokument.
 */
export function MobileMenu({
  links,
  login,
  registrieren,
  oeffnenLabel,
  schliessenLabel,
}: {
  links: readonly NavLink[];
  /**
   * Beschriftungen der beiden Konto-Eintraege — und zugleich der Schalter
   * dafuer, ob es sie gibt: fehlen sie, entfaellt der ganze Block.
   *
   * So kommt die Soft-Launch-Sperre in dieser Client-Insel an, ohne dass
   * sie den Schalter selbst liest. `process.env.SOFT_LAUNCH` steht im
   * Browser nicht zur Verfuegung (kein `NEXT_PUBLIC_`-Praefix, und das
   * soll es auch nicht bekommen — der Wert gehoert nicht ins Buendel).
   * Der Header ist eine Server Component, liest dort `softLaunchAktiv()`
   * und reicht nur das Ergebnis herein.
   */
  login?: string;
  registrieren?: string;
  oeffnenLabel: string;
  schliessenLabel: string;
}) {
  const [offen, setOffen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Navigation schliesst das Menü — sonst bleibt es beim Zurück-Wischen offen.
  useEffect(() => {
    setOffen(false);
  }, [pathname]);

  useEffect(() => {
    if (!offen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOffen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offen]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        aria-controls={panelId}
        className="grid h-11 w-11 place-items-center rounded-blk border border-line text-text transition-colors hover:bg-surface-sunk"
      >
        <span className="sr-only">{offen ? schliessenLabel : oeffnenLabel}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {offen ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!offen}
        className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-card"
      >
        <nav className="mx-auto w-full max-w-6xl px-5 py-4">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="block rounded-blk px-3 py-3 text-base font-medium text-text transition-colors hover:bg-surface-sunk aria-[current=page]:text-signal"
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {login && registrieren ? (
              <>
                <li className="mt-2 border-t border-line pt-3">
                  <Link
                    href="/login"
                    className="block rounded-blk px-3 py-3 text-base font-medium text-text transition-colors hover:bg-surface-sunk"
                  >
                    {login}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/registrieren"
                    className="block rounded-blk bg-signal px-3 py-3 text-center text-base font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
                  >
                    {registrieren}
                  </Link>
                </li>
              </>
            ) : null}
          </ul>
        </nav>
      </div>
    </div>
  );
}
