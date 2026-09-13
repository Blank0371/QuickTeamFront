import type { Metadata } from "next";
import Link from "next/link";

import { AuthRahmen } from "@/components/auth/auth-rahmen";

import { PasswortVergessenFormular } from "./passwort-vergessen-formular";

export const metadata: Metadata = {
  title: "Passwort vergessen",
  description:
    "Trag deine E-Mail-Adresse ein und du bekommst einen Code, mit dem du ein neues Passwort setzt.",
  alternates: { canonical: "/passwort-vergessen" },
  robots: { index: false, follow: true },
};

export default function PasswortVergessenSeite() {
  return (
    <AuthRahmen
      kicker="Passwort zurücksetzen"
      titel="Neues Passwort anfordern"
      lead="Gib die E-Mail-Adresse an, mit der du deinen Betrieb angelegt hast. Du bekommst einen Code, mit dem du im nächsten Schritt ein neues Passwort setzt."
      fuss={
        <p>
          Passwort wieder eingefallen?{" "}
          <Link
            href="/login"
            className="font-medium text-signal underline underline-offset-4 hover:text-signal-hover"
          >
            Zur Anmeldung
          </Link>
        </p>
      }
    >
      <PasswortVergessenFormular />
    </AuthRahmen>
  );
}
