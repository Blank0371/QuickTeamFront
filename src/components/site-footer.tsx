import Link from "next/link";

import { Container } from "@/components/container";
import { LogoMark } from "@/components/logo";
import { holeTexte } from "@/i18n/server";
import { softLaunchAktiv } from "@/lib/soft-launch";

export async function SiteFooter() {
  const t = await holeTexte();
  const jahr = new Date().getFullYear();
  /* Derselbe Schalter wie in `site-header.tsx` und in der Middleware. */
  const authOffen = !softLaunchAktiv();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <Container className="py-12">
        {/*
          Die Spaltenzahl haengt an der Konto-Spalte: mit ihr vier, ohne
          sie drei. Beide Klassen stehen ausgeschrieben da, weil Tailwind
          Klassennamen im Quelltext sucht und einen zusammengesetzten
          String nicht faende.
        */}
        <div
          className={`grid gap-10 sm:grid-cols-2 ${
            authOffen ? "lg:grid-cols-[1.5fr_1fr_1fr_1fr]" : "lg:grid-cols-[1.5fr_1fr_1fr]"
          }`}
        >
          <div>
            <LogoMark className="h-9 w-9" label="QuickTeam" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {t.footer.claim}
            </p>
          </div>

          <FooterSpalte titel={t.footer.produkt} links={t.nav.links} />
          {/*
            Die Spalte „Konto" steht und faellt mit der Sperre — sie
            fuehrt auf `/login`, `/registrieren` und
            `/passwort-vergessen`, also auf genau die drei Routen, die
            `GESPERRTE_PRAEFIXE` abdeckt.
          */}
          {authOffen ? (
            <FooterSpalte titel={t.footer.konto} links={t.footer.kontoLinks} />
          ) : null}
          <FooterSpalte titel={t.footer.rechtliches} links={t.footer.rechtlichesLinks} />
        </div>

        <p className="mt-12 border-t border-line pt-6 font-mono text-xs text-muted">
          {t.footer.copyright(jahr)}
        </p>
      </Container>
    </footer>
  );
}

function FooterSpalte({
  titel,
  links,
}: {
  titel: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-label={titel}>
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-text">
        {titel}
      </h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
