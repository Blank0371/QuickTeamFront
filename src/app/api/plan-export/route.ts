import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { holeSchichten, wochentageLang } from "@/lib/dashboard/kalender";
import {
  alsCsv,
  dateiname,
  langeForm,
  leseZeitraum,
  tageIm,
} from "@/lib/dashboard/plan-export";
import { betreteDashboard } from "@/lib/dashboard/zugang";

/**
 * Der Dienstplan eines Zeitraums als CSV — die Excel-Hälfte des Exports.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein Route Handler
 * ─────────────────────────────────────────────────────────────────────
 *
 * Dasselbe Argument wie beim Betriebsexport: eine Server Action kann keinen
 * Download ausliefern, ohne den Inhalt durch das HTML zu schicken. Ein Route
 * Handler setzt `Content-Disposition: attachment` — und der Knopf auf der
 * Druckseite bleibt ein gewöhnlicher Link ohne JavaScript.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Wer darf das, und wie viel
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betreteDashboard()` — **mit** den Toren, anders als beim Betriebsexport.
 * Dort ist der Export eine vertragliche Zusage über das Vertragsende hinaus
 * (§ 6 Abs. 4 AGB); hier ist er eine gewöhnliche Ansicht des Dienstplans in
 * anderer Verpackung. Was am Bildschirm gesperrt ist, soll nicht über einen
 * Dateidownload offenstehen.
 *
 * **Angestellte bekommen ihn auch** — und zwar genau das, was sie ohnehin
 * sehen dürfen. Die Abgrenzung macht `kalender_schichten` selbst: die
 * Funktion entscheidet über `mitarbeiter_sehen_andere_schichten`, blendet
 * Entwürfe für Nicht-Chefs aus und schneidet die Teilnehmerliste zu. Eine
 * zusätzliche Prüfung hier wäre die zweite Autorisierungsebene, die es in
 * diesem Projekt nicht geben soll.
 *
 * Aus der Anfrage wird nur der **Zeitraum** übernommen. Betrieb und Position
 * kommen aus `auth.uid()` und dem geprüften `qt_position`-Cookie; es gibt
 * keinen `?betrieb=`-Parameter, und es soll keinen geben.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { supabase, position } = await betreteDashboard();

  const adresse = new URL(request.url);
  const zeitraum = leseZeitraum(
    {
      woche: adresse.searchParams.get("woche") ?? undefined,
      monat: adresse.searchParams.get("monat") ?? undefined,
    },
    new Date(),
  );

  const sprache = await leseSprache();
  const texte = getDictionary(sprache);
  const t = texte.planExport;

  const { proTag, fehler } = await holeSchichten(
    supabase,
    position.betriebId,
    position.mitarbeiterId,
    zeitraum.von,
    zeitraum.bis,
    texte.kalender.ladeFehler,
  );

  /*
   * Ein Lesefehler darf keine Datei mit null Zeilen erzeugen: die sähe aus
   * wie „in diesem Monat arbeitet niemand" und wäre als Aushang schlimmer
   * als gar kein Download.
   */
  if (fehler) {
    return new Response(fehler, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const lang = wochentageLang(sprache);
  const wochentagName = (datum: string) => {
    const [jahr, monat, tag] = datum.split("-").map(Number);
    const js = new Date(Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, tag ?? 1)).getUTCDay();
    return lang[(js + 6) % 7] ?? "";
  };

  const csv = alsCsv(langeForm(tageIm(zeitraum), proTag, t.csvKopf, wochentagName));

  return new Response(csv, {
    headers: {
      // `text/csv` allein reicht nicht: ohne `charset` raten manche Programme
      // die Kodierung, obwohl das BOM in der Datei steht.
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${dateiname(position.betriebName, zeitraum)}"`,
      // Ein Dienstplan nennt Namen und Arbeitszeiten — nichts für einen
      // Zwischenspeicher, weder im Browser noch in einem Proxy.
      "cache-control": "no-store, private",
    },
  });
}
