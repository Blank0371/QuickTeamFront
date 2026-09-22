import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { SprachWahl } from "@/components/sprach-wahl";
import { holeTexte } from "@/i18n/server";
import { leseSprache } from "@/i18n/sprache";
import { abmelden } from "@/lib/auth-aktionen";
import {
  gewuenschtePositionsId,
  holePositionen,
  waehleAktive,
} from "@/lib/dashboard/position";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await holeTexte();
  return {
    title: t.dashboard.beendet.metaTitel,
    robots: { index: false, follow: false },
  };
}

/**
 * Ende des Zugangs für Angestellte eines Betriebs, dessen Vertrag beendet ist
 * (AGB § 6 Abs. 2). Das Tor in `zugang.ts` leitet hierher.
 *
 * Liegt neben der Dashboard-Schale wie `wechseln` und `zustimmung` — darunter
 * prüfte die Seite sich selbst und schickte sich im Kreis.
 *
 * **Die Seite prüft noch einmal selbst**, dieselbe Regel wie bei der
 * Zustimmung: die Adresse ist erratbar. Wer hier ohne beendeten Vertrag
 * ankommt, geht ins Dashboard; ein Chef wird ohnehin vom Tor in den
 * Zahlungsschritt geschickt und hat hier nichts verloren.
 */
export default async function BeendetSeite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const alle = await holePositionen(supabase, user.id);
  const position = waehleAktive(alle, await gewuenschtePositionsId());

  if (position === null) redirect("/dashboard/wechseln");
  if (position.rolleTyp === "chef") redirect("/dashboard");

  const { data: beendet } = await supabase.rpc("betrieb_vertrag_beendet", {
    p_betrieb_id: position.betriebId,
  });
  if (beendet !== true) redirect("/dashboard");

  const [t, sprache] = await Promise.all([holeTexte(), leseSprache()]);
  const texte = t.dashboard.beendet;
  const weitere = alle.length > 1;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {/* Liegt neben der Dashboard-Schale, bekommt deren Sprachumschalter
            also nicht — hier mit im Inhalt, damit die Sprache auch an diesem
            Endpunkt wechselbar bleibt. */}
        <div className="mb-6 flex justify-end">
          <SprachWahl aktiv={sprache} />
        </div>

        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
          {position.betriebName}
        </p>

        <h1 className="mt-3 text-3xl leading-[1.1] sm:text-4xl">{texte.titel}</h1>

        <p className="mt-4 text-base leading-relaxed text-muted">{texte.text}</p>
        <p className="mt-3 text-base leading-relaxed text-muted">{texte.loeschung}</p>

        {weitere ? (
          <p className="mt-6 text-base leading-relaxed text-text">{texte.mehrere}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {weitere ? (
            <Link
              href="/dashboard/wechseln"
              className="rounded-blk bg-signal px-5 py-3 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              {t.dashboard.wechseln}
            </Link>
          ) : null}
          <form action={abmelden}>
            <button
              type="submit"
              className="rounded-blk px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-text"
            >
              {t.dashboard.abmelden}
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-muted">{user.email}</p>
      </div>
    </Container>
  );
}
