import Link from "next/link";

import { abmelden } from "@/lib/auth-aktionen";
import { createClient } from "@/lib/supabase/server";
import { supabaseKonfiguriert } from "@/lib/supabase/env";

/**
 * Schmales Banner über den Auth-Formularen, wenn bereits eine gültige
 * Session besteht.
 *
 * Bewusst kein Redirect: wer auf einem Tablet im Lokal das Konto wechseln
 * oder einen zweiten Standort anlegen will, muss an das Formular
 * herankommen. Der Hinweis bietet die Abkürzung an, nimmt aber nichts weg.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die Abkürzung führte bis zum 2026-08-29 in die native App.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Hier stand `href={appUrl}` — `NEXT_PUBLIC_APP_URL`, also die Expo-App
 * auf Port 8081. Das war richtig, solange dieses Repo hinter dem Login
 * nichts anzubieten hatte. Seit der Kursänderung vom 2026-08-26 gibt es
 * ein eigenes Dashboard, und der Verweis war eine Regression dagegen:
 * er schickte angemeldete Leute in eine App, die nicht veröffentlicht
 * ist, statt an ihren Arbeitsplatz.
 *
 * Das Ziel ist `/einrichtung` und nicht direkt `/dashboard`, aus
 * demselben Grund wie bei `anmelden()`: dort läuft die Ableitung und
 * entscheidet, ob jemand in einen offenen Schritt, auf die Sperrseite
 * oder ins Dashboard gehört. Ein zweites Ziel wäre ein zweiter Ort zum
 * Auseinanderlaufen.
 */
export async function SessionHinweis() {
  if (!supabaseKonfiguriert()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-blk border border-line bg-surface-sunk px-4 py-3">
      <p className="text-sm text-muted">
        Angemeldet als <span className="font-medium text-text">{user.email}</span>
      </p>
      <span className="flex items-center gap-4">
        <Link
          href="/einrichtung"
          className="text-sm font-semibold text-signal underline underline-offset-4 hover:text-signal-hover"
        >
          Zur Planung
        </Link>
        <form action={abmelden}>
          <button
            type="submit"
            className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-text"
          >
            Abmelden
          </button>
        </form>
      </span>
    </div>
  );
}
