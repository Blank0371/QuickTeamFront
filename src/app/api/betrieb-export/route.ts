import { baueExportPaket, type ProtokollUmfang } from "@/lib/export/paket";
import { serialisierePaket } from "@/lib/export/serialisierung";
import { betreteOhneTore, istChef } from "@/lib/dashboard/zugang";

/**
 * Der Datenexport eines Betriebs — § 6 Abs. 4 und 5 der AGB, Art. 20
 * DSGVO, Art. 23 ff. der Verordnung (EU) 2023/2854.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein Route Handler und keine Server Action
 * ─────────────────────────────────────────────────────────────────────
 *
 * Das Ergebnis ist eine Datei, kein neuer Seitenzustand. Eine Server
 * Action kann keinen Download ausliefern, ohne den Inhalt vorher durch
 * das HTML zu schicken; ein Route Handler setzt
 * `Content-Disposition: attachment` und ist fertig. Der Knopf braucht
 * dadurch kein JavaScript — er ist ein gewöhnlicher Link.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Wer darf das
 * ─────────────────────────────────────────────────────────────────────
 *
 * `betreteOhneTore()` leitet Anmeldung, aktive Anstellung und Position
 * aus `auth.uid()` und dem geprüften `qt_position`-Cookie ab. **Aus der
 * Anfrage wird nichts übernommen** — es gibt keinen `?betrieb=`
 * Parameter, und es soll auch keinen geben: er wäre genau die
 * hereingereichte Id, der man nicht glauben darf.
 *
 * Dass hier die beiden wirtschaftlichen Tore fehlen, ist Absicht und
 * der eigentliche Grund für `betreteOhneTore()`: § 6 Abs. 4 der AGB
 * gibt den Export **bis dreissig Tage nach Vertragsende**, also
 * ausdrücklich auch dann, wenn nicht mehr gezahlt wird. Ein Export, den
 * die Zahlungssperre abfängt, wäre kein Export.
 *
 * Angestellte bekommen ihn nicht: der Betriebsexport umfasst die Daten
 * **aller** Beschäftigten, und wer sie herausgeben darf, ist der
 * datenschutzrechtlich Verantwortliche — der Kunde, vertreten durch die
 * Betriebsleitung (§ 7 Abs. 2 AGB). Für die eigenen Daten einer
 * angestellten Person ist Art. 15 DSGVO der Weg, und der führt über den
 * Arbeitgeber, nicht über uns.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Bereitstellung
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die Datei entsteht in der angemeldeten Sitzung und wird direkt an sie
 * ausgeliefert — sie wird nirgends abgelegt, es gibt keinen Link, der
 * weitergegeben werden könnte, und nichts, das später noch abrufbar
 * wäre. Damit ist die Frage nach dem „verifizierten Empfänger"
 * beantwortet, bevor sie entsteht: Empfänger ist, wer sich gerade
 * angemeldet hat.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { supabase, position } = await betreteOhneTore();

  if (!istChef(position)) {
    return new Response(
      "Nur die Betriebsleitung kann den Betriebsexport anfordern.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * ───────────────────────────────────────────────────────────────────
   *  Der einzige Parameter — und warum er einer sein darf
   * ───────────────────────────────────────────────────────────────────
   *
   * `?protokoll=voll` bestimmt den **Umfang**, nicht den Betrieb. Die
   * Regel „jede hereingereichte Id wird serverseitig neu abgeleitet,
   * nie geglaubt" bleibt davon unberührt: ein `?betrieb=` gibt es
   * weiterhin nicht, und wer hier `voll` anhängt, bekommt genau die
   * Daten, die er auch sonst sähe — nur mehr davon.
   *
   * Alles, was nicht `voll` ist, ist `keins`. Ein Tippfehler liefert
   * damit das Standardpaket statt eines Fehlers; das ist die richtige
   * Richtung, weil das Standardpaket vollständig **sagt**, was ihm
   * fehlt und wo es liegt.
   */
  const protokoll: ProtokollUmfang =
    new URL(request.url).searchParams.get("protokoll") === "voll" ? "voll" : "keins";

  const paket = await baueExportPaket(supabase, {
    betriebId: position.betriebId,
    betriebName: position.betriebName,
    authId: user?.id ?? "",
    mitarbeiterId: position.mitarbeiterId,
    rolleTyp: position.rolleTyp,
    protokoll,
  });

  const datum = new Date().toISOString().slice(0, 10);

  /*
   * ───────────────────────────────────────────────────────────────────
   *  Ein unvollständiges Paket heisst auch so.
   * ───────────────────────────────────────────────────────────────────
   *
   * `vollstaendig: false` steht im Paket — aber wer eine Exportdatei
   * archiviert, liest sie oft nie wieder auf. Der Dateiname ist die
   * einzige Angabe, die auch dann sichtbar bleibt, wenn die Datei nur
   * abgelegt und Monate später hervorgeholt wird. Deshalb trägt er den
   * Vorbehalt mit, und der Antwortkopf ebenfalls: Letzterer ist die
   * Stelle, an der ein Skript ihn auswerten kann, ohne das ganze JSON zu
   * lesen.
   */
  const teile = [
    "quickteam-export",
    dateiSicher(position.betriebName),
    /*
     * Der Umfang gehört in den Dateinamen, weil zwei Pakete desselben
     * Betriebs vom selben Tag sonst gleich heissen und sich dabei um
     * ein Vielfaches unterscheiden. Wer beide abgelegt hat, kann sie
     * ohne Hineinsehen auseinanderhalten.
     */
    ...(protokoll === "voll" ? ["mit-aenderungsprotokoll"] : []),
    datum,
    ...(paket.vollstaendig ? [] : ["UNVOLLSTAENDIG"]),
  ];
  const dateiname = `${teile.join("-")}.json`;

  return new Response(serialisierePaket(paket), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${dateiname}"`,
      "x-quickteam-export-vollstaendig": paket.vollstaendig ? "ja" : "nein",
      /*
       * Wie der Vollständigkeitskopf: damit ein Skript den Umfang
       * auswerten kann, ohne die ganze Datei zu lesen.
       */
      "x-quickteam-export-protokoll": protokoll,
      /*
       * Ein Export ist eine Momentaufnahme personenbezogener Daten. Er
       * gehört in keinen Zwischenspeicher — weder in den des Browsers
       * noch in den eines Proxys.
       */
      "cache-control": "no-store, private",
    },
  });
}

/**
 * Betriebsnamen taugen nicht als Dateinamen: sie enthalten Umlaute,
 * Schrägstriche und Anführungszeichen, und ein Anführungszeichen bräche
 * den `Content-Disposition`-Kopf auf.
 */
function dateiSicher(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "betrieb"
  );
}
