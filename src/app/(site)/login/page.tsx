import type { Metadata } from "next";
import Link from "next/link";

import { AuthRahmen } from "@/components/auth/auth-rahmen";
import { SessionHinweis } from "@/components/auth/session-hinweis";
import { FormMeldung } from "@/components/formular/felder";
import { holeTexte } from "@/i18n/server";
import { einzelwert, meldungFuer } from "@/lib/auth-meldungen";

import { LoginFormular } from "./login-formular";

export const metadata: Metadata = {
  title: "Anmelden",
  description:
    "Melde dich mit deiner E-Mail-Adresse und deinem Passwort an. Danach landest du direkt in der Planung deines Betriebs.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default async function LoginSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const t = await holeTexte();
  const fehler = meldungFuer(einzelwert(params["fehler"]), t.login.meldungen);
  const meldung = meldungFuer(einzelwert(params["meldung"]), t.login.meldungen);

  return (
    <AuthRahmen
      kicker={t.login.kicker}
      titel={t.login.titel}
      lead={t.login.lead}
      fuss={
        <p>
          {t.login.fussFrage}{" "}
          <Link
            href="/registrieren"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            {t.login.fussLink}
          </Link>
        </p>
      }
    >
      <SessionHinweis />

      {fehler ? (
        <div className="mb-6">
          <FormMeldung art="fehler">{fehler}</FormMeldung>
        </div>
      ) : null}

      {meldung ? (
        <div className="mb-6">
          <FormMeldung art="erfolg">{meldung}</FormMeldung>
        </div>
      ) : null}

      <LoginFormular texte={t.login} />

      <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
        <Link
          href="/passwort-vergessen"
          className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
        >
          {t.login.passwortVergessen}
        </Link>
      </p>
    </AuthRahmen>
  );
}
