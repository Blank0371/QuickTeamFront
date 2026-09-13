import type { Metadata } from "next";
import Link from "next/link";

import { AuthRahmen } from "@/components/auth/auth-rahmen";
import { einzelwert } from "@/lib/auth-meldungen";
import { feldSchemata } from "@/lib/validierung";

import { PasswortNeuFormular } from "./passwort-neu-formular";

export const metadata: Metadata = {
  title: "Neues Passwort setzen",
  description:
    "Trag den Code aus der E-Mail ein und vergib dein neues Passwort. Der Code ist einmalig und läuft nach 60 Minuten ab.",
  alternates: { canonical: "/passwort-neu" },
  robots: { index: false, follow: false },
};

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

  return (
    <AuthRahmen
      kicker="Passwort zurücksetzen"
      titel="Neues Passwort vergeben"
      lead="Trag den Code aus deiner E-Mail ein und vergib gleich dein neues Passwort — danach geht es direkt weiter in die Planung."
      fuss={
        <p>
          <Link
            href="/login"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      }
    >
      <PasswortNeuFormular email={email} />

      <div className="mt-6 rounded-blk border border-line bg-surface-sunk p-5">
        <h2 className="font-display text-sm font-bold text-text">
          Du kannst das Gerät wechseln
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Die E-Mail am Handy öffnen und den Code am Rechner eintippen ist ausdrücklich
          vorgesehen. Trag dann einfach dieselbe E-Mail-Adresse mit ein.
        </p>
      </div>
    </AuthRahmen>
  );
}
