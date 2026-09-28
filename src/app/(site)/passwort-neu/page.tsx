import type { Metadata } from "next";
import Link from "next/link";

import { AuthRahmen } from "@/components/auth/auth-rahmen";
import { holeTexte } from "@/i18n/server";
import { einzelwert } from "@/lib/auth-meldungen";
import { feldSchemata } from "@/lib/validierung";

import { PasswortNeuFormular } from "./passwort-neu-formular";

export async function generateMetadata(): Promise<Metadata> {
  const { passwort } = await holeTexte();
  return {
    title: passwort.neu.metaTitel,
    description: passwort.neu.metaBeschreibung,
    alternates: { canonical: "/passwort-neu" },
    robots: { index: false, follow: false },
  };
}

export default async function PasswortNeuSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  /*
   * Kein Sitzungs-Gate mehr: die Sitzung entsteht erst beim Prüfen des
   * Codes in der Server Action. Der Parameter füllt nur das Feld vor —
   * verlassen wird sich darauf nicht, geprüft wird der Code.
   */
  const geprueft = feldSchemata.email.safeParse(einzelwert(params["email"]) ?? "");
  const email = geprueft.success ? geprueft.data : null;

  const t = await holeTexte();
  const neu = t.passwort.neu;

  return (
    <AuthRahmen
      kicker={t.passwort.kicker}
      titel={neu.titel}
      lead={neu.lead}
      fuss={
        <p>
          <Link
            href="/login"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            {neu.zurueck}
          </Link>
        </p>
      }
    >
      <PasswortNeuFormular email={email} versandTexte={t.codeVersand} texte={neu} />

      <div className="mt-6 rounded-blk border border-line bg-surface-sunk p-5">
        <h2 className="font-display text-sm font-bold text-text">{neu.geraetTitel}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{neu.geraetText}</p>
      </div>
    </AuthRahmen>
  );
}
