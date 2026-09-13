/**
 * Die Bildmarke.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Seit dem 2026-08-29 das echte Logo, vorher ein Platzhalter.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Hier stand bis dahin ein selbst gezeichnetes SVG: drei versetzte
 * Balken in einer Spalte, gefärbt über `fill-signal` und `fill-schicht`.
 * Das war ein Platzhalter in der Hausfarbe, kein Logo — es sollte nur
 * verhindern, dass in der Kopfzeile eine Lücke steht.
 *
 * Die Quelle ist `docs/Logo` (PNG mit Alpha, 1312×1199). Die
 * ausgelieferten Grössen entstehen daraus mit `sharp`: der transparente
 * Rand wird abgeschnitten, dann quadratisch skaliert.
 *
 * **Ein `<img>` und kein `next/image`.** Die Marke steht in der
 * Kopfzeile jeder öffentlichen Seite, also auch auf der Landing Page,
 * für die eine Obergrenze von 150 kB First Load JS gilt. `next/image`
 * bringt für ein Bild fester Grösse, das nie ausgetauscht wird und
 * sofort sichtbar ist, keinen Nutzen, der die Laufzeit rechtfertigt —
 * kein Lazy Loading (es steht über der Falz), keine Grössenvarianten
 * (es ist 32 Pixel gross). Breite und Höhe stehen am Element, also gibt
 * es auch keinen Layout-Sprung.
 *
 * **Ausgeliefert wird 128px für 32–36px Anzeige.** Das reicht bis zur
 * vierfachen Pixeldichte und kostet 8 kB.
 *
 * Anders als das alte SVG passt sich die Marke dem Farbschema **nicht**
 * an — sie bringt ihre eigenen Farben mit. Das ist kein Verlust: Rahmen
 * und Kacheln sind Bronze, Grün und Rot auf transparentem Grund und
 * stehen damit auf hellem wie dunklem Untergrund. Genau die Palette aus
 * `docs/Farbpalette.html`, nur als Bild statt als Token.
 */
export function LogoMark({
  className = "",
  label,
}: {
  className?: string;
  /**
   * Nur setzen, wenn die Marke allein steht. Neben der Wortmarke bleibt
   * sie ohne Label — sonst liest der Screenreader „QuickTeam QuickTeam".
   */
  label?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Begründung im Kopf der Datei
    <img
      src="/logo.png"
      width={128}
      height={128}
      alt={label ?? ""}
      className={className}
      decoding="async"
      // Die Marke steht in der Kopfzeile, also über der Falz. Sie zu
      // verzögern hiesse, die erste Sekunde jeder Seite mit einer Lücke
      // zu beginnen.
      loading="eager"
    />
  );
}

/** Bildmarke plus Wortmarke. Die Wortmarke läuft im Display-Schnitt. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-[1.0625rem] font-bold tracking-tight">
        QuickTeam
      </span>
    </span>
  );
}
