"use client";

import { useFormStatus } from "react-dom";

/**
 * Muss innerhalb des `<form>` stehen — `useFormStatus` liest den Zustand
 * des umgebenden Formulars. Deshalb eine eigene Komponente und nicht
 * einfach ein Button im Formular selbst.
 */
export function AbsendenButton({
  children,
  laufend,
}: {
  children: string;
  /** Text während des Absendens, z. B. „Wird angelegt …" */
  laufend: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? laufend : children}
    </button>
  );
}
