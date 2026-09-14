import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ZUSTIMMUNG_DATEIEN,
  ZUSTIMMUNG_DOKUMENTE,
  type ZustimmungDokument,
} from "@/lib/rechtstexte";

/**
 * Der Fingerabdruck der Fassung, der jemand zugestimmt hat.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum ein Hash neben der Versionszeichenkette
 * ─────────────────────────────────────────────────────────────────────
 *
 * `rechtliche_zustimmungen.version` trägt „2026-09-13-draft" — eine
 * Angabe, die ein Mensch pflegt. Wird ein Rechtstext geändert und der
 * Wert in `rechtstexte.ts` vergessen (Schritt 3 der Anleitung dort),
 * verweisen alle folgenden Zustimmungen auf eine Fassung, die es so
 * nicht mehr gibt, und die alten sind von den neuen nicht mehr zu
 * unterscheiden. Genau dann ist der Nachweis wertlos, und zwar
 * unbemerkt.
 *
 * Der Hash kann nicht vergessen werden: er wird aus der Datei gelesen,
 * die die Seite ausliefert. Zwei Zeilen mit derselben `version`, aber
 * verschiedenem `inhalt_hash`, sind der sichtbare Beleg für genau
 * diesen Fehler — und die Zeile sagt trotzdem noch, welchem Text
 * zugestimmt wurde.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum die deutsche Fassung gehasht wird, egal welche gelesen wurde
 * ─────────────────────────────────────────────────────────────────────
 *
 * Die deutsche Fassung ist nach § 14 Abs. 6 der AGB die maßgebliche;
 * die englische ist eine Übersetzung davon. Ein Hash je Sprache würde
 * zwei Zeilen erzeugen, die sich unterscheiden, obwohl derselbe Vertrag
 * gemeint ist. Welche Sprache die Person gelesen hat, steht deshalb
 * getrennt in `sprache` — beides zusammen ist die vollständige Auskunft.
 *
 * Beim Vergleich von Fassungen zählt also: `version` + `inhalt_hash`
 * für das *Was*, `sprache` für das *Wie gelesen*.
 */
export type ZustimmungHashes = Partial<Record<ZustimmungDokument, string>>;

async function dateiHash(relativ: string): Promise<string | null> {
  try {
    const inhalt = await readFile(
      path.join(process.cwd(), "docs", "rechtliches", relativ),
      "utf8",
    );
    /*
     * Zeilenenden normalisieren, bevor gehasht wird. Ein Checkout mit
     * `core.autocrlf=true` liefert dieselbe Datei mit CRLF und damit
     * einen anderen Hash — der Nachweis würde je nach Arbeitsplatz des
     * Entwicklers anders aussehen, ohne dass sich ein Wort geändert hat.
     */
    return createHash("sha256").update(inhalt.replace(/\r\n/g, "\n")).digest("hex");
  } catch (ursache) {
    const text = ursache instanceof Error ? ursache.message : String(ursache);
    console.error(`[zustimmung] Hash für ${relativ} nicht lesbar: ${text}`);
    return null;
  }
}

/**
 * Die Fingerabdrücke aller drei Dokumente.
 *
 * Ein Fehlschlag ist **kein** Abbruch: der Nachweis besteht aus
 * `dokument` + `version` + `akzeptiert_am` + `auth_id`, der Hash ist
 * eine Zugabe. Eine nicht lesbare Datei darf niemanden an der
 * Einrichtung hindern — sie landet im Protokoll, und die Zeile wird
 * ohne Hash geschrieben.
 */
export async function zustimmungHashes(): Promise<ZustimmungHashes> {
  const eintraege = await Promise.all(
    ZUSTIMMUNG_DOKUMENTE.map(
      async (dokument) =>
        [dokument, await dateiHash(ZUSTIMMUNG_DATEIEN[dokument].de)] as const,
    ),
  );

  const hashes: ZustimmungHashes = {};
  for (const [dokument, hash] of eintraege) {
    if (hash) hashes[dokument] = hash;
  }
  return hashes;
}
