/**
 * Der Schalter für die Promo-Code-Anfrageseite (`/promocode`).
 *
 * `PROMO_CODE=an` schaltet eine öffentliche Seite frei, auf der
 * Interessenten das Antragsformular für eine Promo-Partnerschaft
 * herunterladen, ausfüllen, unterschreiben und an `blanktrading@web.de`
 * senden (Betreff „Request Promo Partnership"). Der Schalter steuert
 * beides — ob die Route ausgeliefert wird **und** ob es einen sichtbaren
 * Weg dorthin gibt (die Kopfzeilen-Registerkarte). Ein zweiter Mechanismus
 * für die Sichtbarkeit wäre eine zweite Gelegenheit, in die falsche
 * Richtung zu zeigen — dieselbe Überlegung wie beim Soft-Launch-Schalter
 * (`src/lib/soft-launch.ts`).
 *
 * **Standardmässig geschlossen, und das ist die richtige Richtung.**
 * Anders als `SOFT_LAUNCH` (aktiv, solange nicht ausdrücklich „aus") ist
 * diese Seite aktiv, **nur** wenn der Wert exakt „an" lautet. Ein
 * fehlender, leerer oder vertippter Wert lässt die Seite also aus — die
 * Anweisung war ausdrücklich: nicht erreichbar, wenn `PROMO_CODE` irgendetwas
 * anderes als „an" ist.
 *
 * **Kein `NEXT_PUBLIC_`-Präfix, bewusst.** Der Wert gehört nicht ins
 * Browser-Bündel. Client-Inseln bekommen nur das Ergebnis hereingereicht,
 * so wie beim Soft-Launch — der Header ist eine Server Component, liest
 * hier und gibt der `MobileMenu` nur die fertige Registerkarten-Liste.
 *
 * Nicht zu verwechseln mit `src/lib/promo-code.ts`: das ist der Promo-Code,
 * den ein Betrieb bei der Registrierung einträgt. Hier geht es um die Seite,
 * auf der jemand überhaupt erst Partner werden möchte.
 */

/** Präfix der Anfrageseite und ihres Formular-Downloads. */
export const PROMO_CODE_PRAEFIX = "/promocode";

/** Aktiv nur bei exakt „an". */
export function promoCodeSeiteAktiv(): boolean {
  return process.env.PROMO_CODE?.trim().toLowerCase() === "an";
}

/**
 * Gilt die Sperre für diesen Pfad?
 *
 * Deckt `/promocode` selbst und alles darunter ab (`/promocode/antrag`).
 * Wie bei `istGesperrt()` fängt der folgende Schrägstrich ab, dass ein
 * `startsWith` versehentlich eine fremde Route wie `/promocodex` trifft.
 */
export function promoSeiteGesperrt(pfad: string): boolean {
  if (promoCodeSeiteAktiv()) return false;
  return pfad === PROMO_CODE_PRAEFIX || pfad.startsWith(`${PROMO_CODE_PRAEFIX}/`);
}
