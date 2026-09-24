import { getDictionary } from "@/i18n";
import { leseSprache } from "@/i18n/sprache";
import { holeSchichten, monatsnamen, wochentageKurz, wochentageLang } from "@/lib/dashboard/kalender";
import { planArbeitsmappe } from "@/lib/dashboard/plan-excel";
import { datumKurz, dateiname, leseZeitraum, zeitraumTitel } from "@/lib/dashboard/plan-export";
import { baueXlsx } from "@/lib/export/xlsx";
import { betreteDashboard } from "@/lib/dashboard/zugang";

/**
 * Der Dienstplan eines Zeitraums als Excel-Datei (`.xlsx`, zwei Blätter —
 * Begründung in `plan-excel.ts`).
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
  const jetzt = new Date();

  const datei = baueXlsx(
    planArbeitsmappe(zeitraum, proTag, {
      t,
      locale: sprache,
      betriebName: position.betriebName,
      jetzt,
      zeitraumTitel: zeitraumTitel(zeitraum, t.kw, monatsnamen(sprache), sprache),
      wochentageKurz: wochentageKurz(sprache),
      datumKurz: (datum) => datumKurz(datum, sprache),
      wochentagLang: (datum) => {
        const [jahr, monat, tag] = datum.split("-").map(Number);
        const js = new Date(Date.UTC(jahr ?? 1970, (monat ?? 1) - 1, tag ?? 1)).getUTCDay();
        return lang[(js + 6) % 7] ?? "";
      },
    }),
  );

  return new Response(datei, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${dateiname(position.betriebName, zeitraum)}"`,
      // Ein Dienstplan nennt Namen und Arbeitszeiten — nichts für einen
      // Zwischenspeicher, weder im Browser noch in einem Proxy.
      "cache-control": "no-store, private",
    },
  });
}
