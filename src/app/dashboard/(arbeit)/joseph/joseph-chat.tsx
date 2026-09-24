"use client";

import { SendHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";

const feldBasis =
  "w-full rounded-blk border border-line-strong bg-surface px-3.5 py-2.5 text-base text-text " +
  "transition-colors placeholder:text-muted";

/**
 * Chat-Attrappe für Joseph. Absenden leert nur das Feld — nichts wird
 * gespeichert, gesendet oder angezeigt (experimentell, 2026-09-24).
 *
 * Das Eingabefeld trägt bewusst kein `name`: ohne JavaScript schickt das
 * Formular dann einen leeren GET an dieselbe Seite, statt den Text in die
 * Adresszeile (und damit in Verlauf und Server-Protokolle) zu schreiben.
 */
export function JosephChat({
  label,
  platzhalter,
  senden,
}: {
  label: string;
  platzhalter: string;
  senden: string;
}) {
  const [text, setText] = useState("");

  function abschicken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setText("");
  }

  return (
    <form onSubmit={abschicken} className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="joseph-nachricht" className="sr-only">
          {label}
        </label>
        <input
          id="joseph-nachricht"
          type="text"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={platzhalter}
          className={feldBasis}
        />
      </div>
      <button
        type="submit"
        disabled={text.trim() === ""}
        className="inline-flex shrink-0 items-center gap-2 rounded-blk bg-signal px-4 py-2.5 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
        {senden}
      </button>
    </form>
  );
}
