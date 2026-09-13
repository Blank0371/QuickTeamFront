import Link from "next/link";

import { Container } from "@/components/container";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/mobile-menu";
import { NavLink } from "@/components/nav-link";
import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { SprachWahl } from "@/components/sprach-wahl";
import { softLaunchAktiv } from "@/lib/soft-launch";

export async function SiteHeader() {
  const sprache = await leseSprache();
  const t = getDictionary(sprache);
  /*
   * Ein Schalter, zwei Wirkungen. `softLaunchAktiv()` entscheidet in
   * `src/middleware.ts` darueber, ob `/login` und `/registrieren`
   * ueberhaupt ausgeliefert werden — und hier darueber, ob es Knoepfe
   * dorthin gibt. Zwei getrennte Mechanismen (etwa eine eigene
   * Konstante fuer die Sichtbarkeit) waeren zwei Gelegenheiten, in
   * verschiedene Richtungen zu zeigen: sichtbare Knoepfe vor einer
   * gesperrten Route, oder eine offene Route ohne Weg dorthin.
   *
   * Weiterhin **entfernt statt versteckt**: die Knoepfe entstehen gar
   * nicht erst im Markup, wenn die Sperre steht. Kein `hidden`, das
   * ein Screenreader oder ein Crawler doch noch findet.
   */
  const authOffen = !softLaunchAktiv();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
      <Container className="relative flex h-16 items-center justify-between gap-4">
        <Link href="/" className="rounded-blk text-text">
          <Logo />
          <span className="sr-only">Startseite</span>
        </Link>

        <nav aria-label={t.nav.hauptnavigation} className="hidden md:block">
          <ul className="flex items-center gap-7">
            {t.nav.links.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href}>{link.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/*
          Der Sprachumschalter steht rechts und **ausserhalb** der
          Soft-Launch-Bedingung: er hängt nicht an Konten, sondern an
          der Lesbarkeit. Während der Sperre gibt es keine Anmeldung,
          die Seite selbst bleibt aber lesbar — und dann soll sie auch
          auf Englisch lesbar sein.
        */}
        <div className="ml-auto hidden md:block">
          <SprachWahl aktiv={sprache} />
        </div>

        {authOffen ? (
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-blk px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-sunk"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/registrieren"
              className="rounded-blk bg-signal px-4 py-2 text-sm font-semibold text-signal-ink transition-colors hover:bg-signal-hover"
            >
              {t.nav.registrieren}
            </Link>
          </div>
        ) : null}

        <MobileMenu
          links={t.nav.links}
          login={authOffen ? t.nav.login : undefined}
          registrieren={authOffen ? t.nav.registrieren : undefined}
          oeffnenLabel={t.nav.menueOeffnen}
          schliessenLabel={t.nav.menueSchliessen}
        />
      </Container>
    </header>
  );
}
