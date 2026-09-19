import { permanentRedirect } from "next/navigation";

/**
 * `/datenloeschung` — die Adresse, die man sich merkt.
 *
 * Sie leitet auf `/kontoloeschung` und ist **ausdrücklich keine zweite
 * Umsetzung.** Der Vorgang lässt sich nicht rückgängig machen; eine
 * zweite Fassung der Warnungen, der Anmeldung oder des Vergleichs wäre
 * eine zweite Gelegenheit, sich zu widersprechen.
 *
 * **Warum die andere Adresse die echte ist.** Die Datenschutzerklärung
 * nennt in Ziffer 15.2 wörtlich `quickteam.at/kontoloeschung`. Ein Umzug
 * hätte den Rechtstext geändert, damit sein `Stand:`-Datum und den Wert
 * in `rechtstexte.ts` — und `pruefeZustimmung()` hätte anschliessend
 * jeden Bestandsbetrieb neu gefragt. Ein Zustimmungs-Durchlauf für alle,
 * ausgelöst durch eine Umbenennung, ist der teuerste Weg zu einer URL.
 *
 * Die Weiterleitung bleibt trotzdem, weil „Datenlöschung" der Begriff
 * ist, den Leute suchen und eintippen — und weil eine gemerkte Adresse,
 * die ins Leere läuft, schlimmer ist als keine.
 *
 * **`permanentRedirect` (308) und nicht `redirect` (307):** die Adresse
 * wird sich nicht mehr ändern, und ein 308 darf zwischengespeichert
 * werden. Der Query-String geht dabei verloren — hier folgenlos, weil
 * `?schritt=` ohnehin erst nach der Anmeldung eine Rolle spielt und
 * `/kontoloeschung` ohne ihn bei Stufe 1 beginnt.
 *
 * Kein `robots`-Eintrag nötig: die Seite rendert nie, sie leitet nur.
 * Das Ziel selbst steht auf `index: false`.
 */
export default function DatenloeschungSeite(): never {
  permanentRedirect("/kontoloeschung");
}
