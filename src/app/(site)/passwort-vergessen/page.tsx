import type { Metadata } from "next";
import Link from "next/link";

import { AuthRahmen } from "@/components/auth/auth-rahmen";
import { holeTexte } from "@/i18n/server";

import { PasswortVergessenFormular } from "./passwort-vergessen-formular";

export async function generateMetadata(): Promise<Metadata> {
  const { passwort } = await holeTexte();
  return {
    title: passwort.vergessen.metaTitel,
    description: passwort.vergessen.metaBeschreibung,
    alternates: { canonical: "/passwort-vergessen" },
    robots: { index: false, follow: true },
  };
}

export default async function PasswortVergessenSeite() {
  const { passwort } = await holeTexte();
  const t = passwort.vergessen;

  return (
    <AuthRahmen
      kicker={passwort.kicker}
      titel={t.titel}
      lead={t.lead}
      fuss={
        <p>
          {t.fussFrage}{" "}
          <Link
            href="/login"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            {t.fussLink}
          </Link>
        </p>
      }
    >
      <PasswortVergessenFormular texte={t} />
    </AuthRahmen>
  );
}
