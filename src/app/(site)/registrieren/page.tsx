import { redirect } from "next/navigation";

/**
 * `/registrieren` ist seit dem 2026-08-21 nur noch der öffentliche Name
 * für Schritt 1 des Einrichtungs-Steppers.
 *
 * Die Route bleibt bestehen, weil sie überall verlinkt ist — Kopfzeile,
 * mobiles Menü, Preisseite, Login — und weil sie die Adresse ist, die man
 * eintippt. Die Seite selbst liegt unter `/einrichtung/konto`, damit der
 * Fortschrittsbalken über allen vier Schritten dieselbe Wurzel hat.
 *
 * Kein `permanentRedirect`: sollte sich der Zuschnitt der Schritte noch
 * einmal ändern, wäre ein von Browsern dauerhaft gecachtes Ziel genau die
 * Art Altlast, die man hinterher nicht mehr los wird.
 */
export default function RegistrierenSeite() {
  redirect("/einrichtung/konto");
}
