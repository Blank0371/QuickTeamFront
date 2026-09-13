import type { ReactNode } from "react";

/**
 * Ein sehr kleiner Markdown-Renderer für die Rechtstexte.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Warum keine Bibliothek
 * ─────────────────────────────────────────────────────────────────────
 *
 * `react-markdown` samt `remark` wäre der bequeme Weg und zieht rund
 * 100 kB in eine Route, die aus Fliesstext besteht. Die Quelldateien in
 * `docs/rechtliches/` benutzen einen geschlossenen Satz von Konstrukten
 * — am 2026-09-09 nachgezählt: Überschriften (`#`, `##`, `###`),
 * Aufzählungen (`-`), Trennlinien (`---`), Fettschrift und Absätze.
 * Dafür lohnt keine Abhängigkeit.
 *
 * **Kein `dangerouslySetInnerHTML`.** Alles wird als React-Knoten
 * gebaut; roher HTML-Text aus der Datei landet nie im DOM. Das ist hier
 * keine Förmlichkeit — `.claude/rules/security.md` verbietet genau das,
 * und ein Rechtstext ist der Ort, an dem man am ehesten in Versuchung
 * käme, „nur schnell" HTML durchzureichen.
 *
 * **Was nicht unterstützt wird, bleibt sichtbar.** Ein Codeblock käme
 * als gewöhnlicher Absatz heraus statt zu verschwinden. Lieber roh als
 * fort: ein fehlender Absatz in einer Datenschutzerklärung ist ein
 * Rechtsproblem, ein unschön gesetzter nicht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Tabellen und Blockzitate, ergänzt am 2026-09-10
 * ─────────────────────────────────────────────────────────────────────
 *
 * Beide standen bis dahin unter „nicht unterstützt", und das ging, so
 * lange die Quellen nur Datenschutzerklärung und Impressum waren. Mit
 * `AVV-QuickTeam-de.md` kommen beide vor, und zwar an tragender Stelle:
 * die Liste der Unterauftragsverarbeiter samt Ort der Verarbeitung und
 * Übermittlungsgrundlage **ist** eine Tabelle. Als Absatzfolge voller
 * Pipe-Zeichen wäre sie unlesbar — bei einer Angabe nach Art. 28 DSGVO
 * ist das kein Schönheitsfehler.
 */

/** `**fett**` innerhalb einer Zeile. Alles andere bleibt Text. */
function inline(text: string, schluessel: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).flatMap((teil, i) => {
    if (teil.length === 0) return [];
    if (teil.startsWith("**") && teil.endsWith("**")) {
      return [
        <strong key={`${schluessel}-${i}`} className="font-semibold text-text">
          {teil.slice(2, -2)}
        </strong>,
      ];
    }
    return [<span key={`${schluessel}-${i}`}>{teil}</span>];
  });
}

export function MarkdownText({ quelle }: { quelle: string }) {
  const zeilen = quelle.replace(/\r\n/g, "\n").split("\n");
  const knoten: ReactNode[] = [];
  let liste: string[] = [];
  let zitat: string[] = [];
  let tabelle: string[] = [];

  function listeSchliessen(i: number) {
    if (liste.length === 0) return;
    knoten.push(
      <ul key={`ul-${i}`} className="mt-3 flex list-disc flex-col gap-2 pl-5">
        {liste.map((eintrag, j) => (
          <li key={j} className="text-sm leading-relaxed text-muted">
            {inline(eintrag, `li-${i}-${j}`)}
          </li>
        ))}
      </ul>,
    );
    liste = [];
  }

  function zitatSchliessen(i: number) {
    if (zitat.length === 0) return;
    /*
     * Ein Blockzitat trägt in diesen Dokumenten keinen Zitatcharakter,
     * sondern eine Einordnung — „die folgenden Maßnahmen beschreiben den
     * Stand zum Zeitpunkt des Vertragsschlusses". Deshalb abgesetzt und
     * mit Kante, aber nicht kursiv: der Text ist so verbindlich wie der
     * Rest, er gehört nur nicht in die laufende Nummerierung.
     */
    knoten.push(
      <blockquote
        key={`bq-${i}`}
        className="mt-5 border-l-2 border-schicht pl-4 text-sm leading-relaxed text-muted"
      >
        {zitat.map((absatz, j) => (
          <p key={j} className={j === 0 ? undefined : "mt-3"}>
            {inline(absatz, `bq-${i}-${j}`)}
          </p>
        ))}
      </blockquote>,
    );
    zitat = [];
  }

  function tabelleSchliessen(i: number) {
    if (tabelle.length === 0) return;

    const zellen = (zeile: string) =>
      zeile
        .replace(/^\||\|$/gu, "")
        .split("|")
        .map((z) => z.trim());

    /* `|---|---|` ist die Trennzeile unter dem Kopf, kein Inhalt. */
    const istTrenner = (zeile: string) => /^\|[\s:|-]+\|$/u.test(zeile.trim());
    const inhalt = tabelle.filter((zeile) => !istTrenner(zeile));
    const [kopf, ...rumpf] = inhalt;

    if (kopf !== undefined) {
      knoten.push(
        /*
          `overflow-x-auto`: vier Spalten Fliesstext passen auf 375 px
          nicht nebeneinander. Ohne den eigenen Scrollbereich schöbe die
          Tabelle die ganze Seite quer — `CLAUDE.md` verlangt
          ausdrücklich, dass der Body nie horizontal scrollt.
        */
        <div key={`tb-${i}`} className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong">
                {zellen(kopf).map((z, j) => (
                  <th key={j} className="px-3 py-2 align-top font-semibold text-text">
                    {inline(z, `th-${i}-${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rumpf.map((zeile, r) => (
                <tr key={r} className="border-b border-line">
                  {zellen(zeile).map((z, j) => (
                    <td key={j} className="px-3 py-2 align-top leading-relaxed text-muted">
                      {inline(z, `td-${i}-${r}-${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
    tabelle = [];
  }

  zeilen.forEach((roh, i) => {
    const zeile = roh.trimEnd();

    if (zeile.startsWith("|")) {
      listeSchliessen(i);
      zitatSchliessen(i);
      tabelle.push(zeile);
      return;
    }
    tabelleSchliessen(i);

    if (zeile.startsWith(">")) {
      listeSchliessen(i);
      /*
       * `>` allein trennt zwei Absätze **innerhalb** desselben Zitats —
       * so steht es in `AVV-QuickTeam-de.md` zwischen dem Stripe- und
       * dem Push-Hinweis. Als leerer Eintrag würde daraus ein leerer
       * Absatz; hier wird er deshalb übersprungen und trennt nur.
       */
      const inhalt = zeile.replace(/^>\s?/u, "");
      if (inhalt.trim().length > 0) zitat.push(inhalt);
      return;
    }
    zitatSchliessen(i);

    if (zeile.startsWith("- ")) {
      liste.push(zeile.slice(2));
      return;
    }
    listeSchliessen(i);

    if (zeile.trim().length === 0) return;

    if (zeile.startsWith("### ")) {
      knoten.push(
        <h3 key={i} className="mt-6 font-display text-base text-text">
          {inline(zeile.slice(4), `h3-${i}`)}
        </h3>,
      );
      return;
    }
    if (zeile.startsWith("## ")) {
      knoten.push(
        <h2 key={i} className="mt-10 font-display text-xl text-text">
          {inline(zeile.slice(3), `h2-${i}`)}
        </h2>,
      );
      return;
    }
    if (zeile.startsWith("# ")) {
      /*
       * Die erste Überschrift der Datei wird **nicht** als `h1`
       * gerendert: die Seite bringt ihre eigene mit, und `CLAUDE.md`
       * verlangt genau ein `h1` je Seite. Sie fällt deshalb heraus.
       */
      return;
    }
    if (/^-{3,}$/.test(zeile.trim())) {
      knoten.push(<hr key={i} className="mt-8 border-line" />);
      return;
    }

    knoten.push(
      <p key={i} className="mt-3 text-sm leading-relaxed text-muted">
        {inline(zeile, `p-${i}`)}
      </p>,
    );
  });

  listeSchliessen(zeilen.length);
  zitatSchliessen(zeilen.length);
  tabelleSchliessen(zeilen.length);

  return <div>{knoten}</div>;
}
