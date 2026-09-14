import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  baueExportPaket,
  findeOffeneVerweise,
  imBetriebsordner,
  ordnePfadEin,
} from "./paket";
import { AUSSCHLUESSE, EXPORT_TABELLEN } from "./tabellen";

/**
 * Der Betriebsexport.
 *
 * Geprüft wird das, was im Betrieb niemand sieht, bevor es zu spät ist:
 * ob wirklich nur **ein** Betrieb im Paket landet, ob anonyme Umfragen
 * anonym bleiben, ob eine Pseudonymisierung nicht durch das
 * Änderungsprotokoll zurückkommt, ob das Blättern bei gleichzeitigen
 * Änderungen Zeilen verliert — und ob ein lückenhaftes Paket sich auch
 * so nennt.
 *
 * Alle Daten hier sind erfunden.
 */

const BETRIEB = "b-eigen";
const FREMD = "b-fremd";

type Zeile = Record<string, unknown>;

/**
 * Attrappe des Supabase-Clients.
 *
 * Sie bildet nach, was der Paketbauer benutzt: `from().select().eq()`
 * mit `order()`, `limit()` und `or()`, dazu `rpc()`. **Sie filtert und
 * sortiert selbst** — sonst prüfte der Test nur, dass irgendetwas
 * abgefragt wird, statt dass richtig eingegrenzt und geblättert wird.
 *
 * `or()` versteht genau die Form, die `keysetBedingung()` erzeugt:
 * `a.gt."x"` und `and(a.eq."x",b.gt."y")`. Damit prüft der Test die
 * tatsächlich abgeschickte Bedingung und nicht eine nachgebaute.
 */
function klient(
  daten: Record<string, Zeile[]>,
  optionen: {
    rpc?: Record<string, unknown[]>;
    /** Wird vor jeder Seite aufgerufen — für Nebenläufigkeits-Tests. */
    vorJederSeite?: (tabelle: string, seite: number) => void;
    /** Tabellen, deren Abfrage einen Fehler liefert. */
    fehler?: Record<string, string>;
  } = {},
) {
  const abfragen: { tabelle: string; spalte: string; wert: unknown }[] = [];
  const seitenZaehler: Record<string, number> = {};

  function wertAus(roh: string): string {
    const wert = roh.trim();
    return wert.startsWith('"') && wert.endsWith('"')
      ? wert.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\")
      : wert;
  }

  /** Wertet eine einzelne `spalte.op.wert`-Bedingung aus. */
  function einzel(bedingung: string, zeile: Zeile): boolean {
    const punkt1 = bedingung.indexOf(".");
    const punkt2 = bedingung.indexOf(".", punkt1 + 1);
    const spalte = bedingung.slice(0, punkt1);
    const op = bedingung.slice(punkt1 + 1, punkt2);
    const wert = wertAus(bedingung.slice(punkt2 + 1));
    const links = String(zeile[spalte]);
    return op === "gt" ? links > wert : links === wert;
  }

  /** Zerlegt `a,and(b,c),d` in die obersten Glieder. */
  function teile(ausdruck: string): string[] {
    const raus: string[] = [];
    let tiefe = 0;
    let start = 0;
    for (let i = 0; i < ausdruck.length; i += 1) {
      const z = ausdruck[i];
      if (z === "(") tiefe += 1;
      else if (z === ")") tiefe -= 1;
      else if (z === "," && tiefe === 0) {
        raus.push(ausdruck.slice(start, i));
        start = i + 1;
      }
    }
    raus.push(ausdruck.slice(start));
    return raus.filter((t) => t.length > 0);
  }

  function passtOder(ausdruck: string, zeile: Zeile): boolean {
    return teile(ausdruck).some((glied) => {
      if (glied.startsWith("and(")) {
        return teile(glied.slice(4, -1)).every((u) => einzel(u, zeile));
      }
      return einzel(glied, zeile);
    });
  }

  const api = {
    abfragen,
    from(tabelle: string) {
      const bauer = {
        _spalte: "",
        _wert: null as unknown,
        _ordnung: [] as string[],
        _oder: null as string | null,
        select() {
          return bauer;
        },
        eq(spalte: string, wert: unknown) {
          bauer._spalte = spalte;
          bauer._wert = wert;
          abfragen.push({ tabelle, spalte, wert });
          return bauer;
        },
        order(spalte: string) {
          bauer._ordnung.push(spalte);
          return bauer;
        },
        or(ausdruck: string) {
          bauer._oder = ausdruck;
          return bauer;
        },
        _ergebnis() {
          if (optionen.fehler?.[tabelle]) {
            return { data: null, error: { message: optionen.fehler[tabelle] } };
          }

          seitenZaehler[tabelle] = (seitenZaehler[tabelle] ?? 0) + 1;
          optionen.vorJederSeite?.(tabelle, seitenZaehler[tabelle]!);

          let zeilen = (daten[tabelle] ?? []).filter(
            (zeile) => zeile[bauer._spalte] === bauer._wert,
          );
          if (bauer._oder) {
            zeilen = zeilen.filter((zeile) => passtOder(bauer._oder!, zeile));
          }
          if (bauer._ordnung.length > 0) {
            zeilen = [...zeilen].sort((a, b) => {
              for (const spalte of bauer._ordnung) {
                const x = String(a[spalte]);
                const y = String(b[spalte]);
                if (x !== y) return x < y ? -1 : 1;
              }
              return 0;
            });
          }
          return { data: zeilen, error: null };
        },
        limit(n: number) {
          const { data, error } = bauer._ergebnis();
          return Promise.resolve({ data: data ? data.slice(0, n) : null, error });
        },
        then(aufloesen: (wert: unknown) => unknown) {
          // Für die Aufrufe ohne `limit()` (Zustimmungen, Referenzwerte).
          return Promise.resolve(aufloesen(bauer._ergebnis()));
        },
      };
      return bauer;
    },
    rpc(_name: string, args: Record<string, string>) {
      return Promise.resolve({
        data: optionen.rpc?.[args["p_benachrichtigung_id"] ?? ""] ?? [],
        error: null,
      });
    },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "auth-1" } } }) },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return api as any;
}

const AUFTRAG = {
  betriebId: BETRIEB,
  betriebName: "Café Beispiel",
  authId: "auth-1",
  mitarbeiterId: "ma-1",
  rolleTyp: "chef",
};

function basis(): Record<string, Zeile[]> {
  return {
    betriebe: [
      { id: BETRIEB, name: "Café Beispiel", land: "AT" },
      { id: FREMD, name: "Fremdbetrieb", land: "DE" },
    ],
    gesetzliche_parameter: [
      { land: "AT", hoechstarbeitszeit_tag_stunden: 10 },
      { land: "DE", hoechstarbeitszeit_tag_stunden: 8 },
    ],
  };
}

/** Schlüssel mit fester Breite, damit die Textsortierung der Zahlenfolge entspricht. */
function id(n: number): string {
  return `z${String(n).padStart(6, "0")}`;
}

describe("baueExportPaket — Mandantentrennung", () => {
  it("nimmt keine Zeile eines fremden Betriebs mit", async () => {
    const daten = basis();
    daten["mitarbeiter"] = [
      { id: "m1", betrieb_id: BETRIEB, vorname: "Anna" },
      { id: "m2", betrieb_id: FREMD, vorname: "Fremd" },
    ];
    daten["schicht_instanzen"] = [
      { id: "s1", betrieb_id: BETRIEB },
      { id: "s2", betrieb_id: FREMD },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);

    assert.deepEqual(paket.tabellen["mitarbeiter"]?.map((z) => z["id"]), ["m1"]);
    assert.deepEqual(paket.tabellen["schicht_instanzen"]?.map((z) => z["id"]), ["s1"]);
    assert.deepEqual(paket.tabellen["betriebe"]?.map((z) => z["id"]), [BETRIEB]);
  });

  it("grenzt jede Tabelle ausdrücklich ein, nicht nur über RLS", async () => {
    const k = klient(basis());
    await baueExportPaket(k, AUFTRAG);

    for (const spec of EXPORT_TABELLEN) {
      const abfrage = k.abfragen.find((a: { tabelle: string }) => a.tabelle === spec.name);
      assert.ok(abfrage, `${spec.name} wurde gar nicht abgefragt`);
      assert.equal(abfrage.spalte, spec.schluessel, `${spec.name}: falsche Schlüsselspalte`);
      assert.equal(abfrage.wert, BETRIEB, `${spec.name}: nicht auf den Betrieb eingegrenzt`);
    }
  });

  it("nimmt nur die Referenzwerte des eigenen Landes auf", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);
    assert.deepEqual(paket.referenz.gesetzliche_parameter.map((z) => z["land"]), ["AT"]);
  });
});

describe("baueExportPaket — Blättern und Nebenläufigkeit", () => {
  it("liest eine Tabelle über mehrere Seiten hinweg vollständig", async () => {
    const daten = basis();
    daten["schicht_zuweisungen"] = Array.from({ length: 2345 }, (_, i) => ({
      id: id(i),
      betrieb_id: BETRIEB,
    }));

    const paket = await baueExportPaket(klient(daten), AUFTRAG);
    const gelesen = paket.tabellen["schicht_zuweisungen"] ?? [];

    assert.equal(gelesen.length, 2345);
    assert.equal(gelesen[0]?.["id"], id(0));
    assert.equal(gelesen[2344]?.["id"], id(2344));
    assert.equal(new Set(gelesen.map((z) => z["id"])).size, 2345, "keine Duplikate");
  });

  it("überspringt keine Zeile, wenn währenddessen vorne eingefügt wird", async () => {
    /*
     * Der Fehler, den Keyset behebt. Mit `range()` verschiebt eine
     * Einfügung **vor** dem aktuellen Versatz alles um eins nach hinten,
     * und die Zeile an der Seitengrenze fällt lautlos aus dem Export.
     *
     * Hier wird genau das erzwungen: vor der zweiten Seite entsteht eine
     * Zeile mit einem sehr kleinen Schlüssel, die also ganz vorne
     * einsortiert. Jede Zeile, die von Anfang an da war, muss trotzdem
     * genau einmal im Paket stehen.
     */
    const daten = basis();
    const anfangs = Array.from({ length: 1500 }, (_, i) => ({
      id: id(i + 100),
      betrieb_id: BETRIEB,
    }));
    daten["schicht_zuweisungen"] = [...anfangs];

    const paket = await baueExportPaket(
      klient(daten, {
        vorJederSeite: (tabelle, seite) => {
          if (tabelle === "schicht_zuweisungen" && seite === 2) {
            daten["schicht_zuweisungen"]!.unshift({ id: id(0), betrieb_id: BETRIEB });
          }
        },
      }),
      AUFTRAG,
    );

    const gelesen = paket.tabellen["schicht_zuweisungen"] ?? [];
    const ids = gelesen.map((z) => String(z["id"]));

    for (const zeile of anfangs) {
      assert.ok(
        ids.includes(String(zeile["id"])),
        `${zeile["id"]} fehlt im Export, obwohl die Zeile durchgehend vorhanden war`,
      );
    }
    assert.equal(new Set(ids).size, ids.length, "keine Zeile doppelt");
  });

  it("liefert keine Zeile doppelt, wenn währenddessen vorne gelöscht wird", async () => {
    // Das Gegenstück: mit `range()` rutscht alles um eins nach vorn und
    // die Zeile an der Grenze käme ein zweites Mal.
    const daten = basis();
    daten["schicht_zuweisungen"] = Array.from({ length: 1500 }, (_, i) => ({
      id: id(i),
      betrieb_id: BETRIEB,
    }));

    const paket = await baueExportPaket(
      klient(daten, {
        vorJederSeite: (tabelle, seite) => {
          if (tabelle === "schicht_zuweisungen" && seite === 2) {
            daten["schicht_zuweisungen"]!.shift();
          }
        },
      }),
      AUFTRAG,
    );

    const ids = (paket.tabellen["schicht_zuweisungen"] ?? []).map((z) => String(z["id"]));
    assert.equal(new Set(ids).size, ids.length, "keine Zeile doppelt");
  });

  it("blättert auch über einen zusammengesetzten Schlüssel korrekt", async () => {
    // `verfuegbarkeiten` ordnet nach zwei Spalten — die Keyset-Bedingung
    // muss daraus `(a,b) > (x,y)` bauen, nicht `a > x`.
    const daten = basis();
    daten["verfuegbarkeiten"] = [];
    for (let m = 0; m < 3; m += 1) {
      for (let s = 0; s < 500; s += 1) {
        daten["verfuegbarkeiten"].push({
          mitarbeiter_id: id(m),
          schicht_instanz_id: id(s),
          betrieb_id: BETRIEB,
        });
      }
    }

    const paket = await baueExportPaket(klient(daten), AUFTRAG);
    const gelesen = paket.tabellen["verfuegbarkeiten"] ?? [];

    assert.equal(gelesen.length, 1500);
    const schluessel = gelesen.map((z) => `${z["mitarbeiter_id"]}|${z["schicht_instanz_id"]}`);
    assert.equal(new Set(schluessel).size, 1500, "keine Duplikate über den Seitenrand");
  });
});

describe("baueExportPaket — Vollständigkeit", () => {
  it("nennt sich vollständig, wenn nichts fehlt", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);
    assert.equal(paket.vollstaendig, true);
    assert.deepEqual(paket.unvollstaendig, []);
  });

  it("nennt sich UNVOLLSTÄNDIG, sobald ein Anhang verzeichnet ist", async () => {
    /*
     * Die Kernzusage: ein Export mit Anhangsverzeichnis, aber ohne
     * Dateien, ist unvollständig — und sagt es selbst. Das hängt an den
     * Zeilen dieses Laufs, nicht an einer einmaligen Beobachtung über
     * leere Buckets.
     */
    const daten = basis();
    daten["nachricht_anhaenge"] = [
      {
        id: "a1",
        betrieb_id: BETRIEB,
        benachrichtigung_id: "n1",
        datei_pfad: `${BETRIEB}/dienstplan.pdf`,
        datei_name: "dienstplan.pdf",
      },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);

    assert.equal(paket.vollstaendig, false);
    assert.ok(
      paket.unvollstaendig.some((m) => m.includes("nachricht_anhaenge")),
      "der fehlende Anhang muss unter `unvollstaendig` stehen",
    );
    assert.equal(paket.dateien[0]?.datei_enthalten, false);
    assert.equal(paket.dateien[0]?.pfad_art, "speicherpfad");
    assert.equal(paket.dateien[0]?.im_betriebsordner, true);
  });

  it("nennt sich unvollständig, wenn eine Tabelle nicht lesbar war", async () => {
    const paket = await baueExportPaket(
      klient(basis(), { fehler: { urlaub: "permission denied" } }),
      AUFTRAG,
    );

    assert.equal(paket.vollstaendig, false);
    assert.ok(paket.unvollstaendig.some((m) => m.startsWith("urlaub")));
    assert.ok(paket.hinweise.some((h) => h.includes("urlaub")));
  });

  it("beschreibt die tatsächliche Konsistenzgarantie, nicht mehr", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);

    // Was zugesagt wird …
    assert.match(paket.meta.konsistenz, /genau einmal/);
    // … und was ausdrücklich nicht.
    assert.match(paket.meta.konsistenz, /NICHT/);
    assert.match(paket.meta.konsistenz, /einladungen/);
  });
});

describe("Dateipfade — eingeordnet, nie abgerufen", () => {
  it("erkennt absolute Adressen als solche", () => {
    for (const pfad of [
      "http://169.254.169.254/latest/meta-data/",
      "https://example.org/datei.pdf",
      "file:///etc/passwd",
      "data:text/plain;base64,AAAA",
      "//example.org/datei.pdf",
    ]) {
      assert.equal(ordnePfadEin(pfad), "absolute-url", pfad);
    }
  });

  it("erkennt gewöhnliche Speicherpfade", () => {
    assert.equal(ordnePfadEin("b-eigen/2026/plan.pdf"), "speicherpfad");
    assert.equal(ordnePfadEin("plan.pdf"), "speicherpfad");
  });

  it("behandelt Leeres als leer", () => {
    assert.equal(ordnePfadEin(""), "leer");
    assert.equal(ordnePfadEin("   "), "leer");
    assert.equal(ordnePfadEin(null), "leer");
    assert.equal(ordnePfadEin(42), "leer");
  });

  it("erkennt den Ordner eines fremden Betriebs", () => {
    assert.equal(imBetriebsordner(`${BETRIEB}/a.pdf`, BETRIEB), true);
    assert.equal(imBetriebsordner(`/${BETRIEB}/a.pdf`, BETRIEB), true);
    assert.equal(imBetriebsordner(`${FREMD}/a.pdf`, BETRIEB), false);
    assert.equal(imBetriebsordner("../b-fremd/a.pdf", BETRIEB), false);
    assert.equal(imBetriebsordner(`${BETRIEB}-anderer/a.pdf`, BETRIEB), false);
  });

  it("warnt bei fremden Ordnern und absoluten Adressen", async () => {
    const daten = basis();
    daten["nachricht_anhaenge"] = [
      { id: "a1", betrieb_id: BETRIEB, datei_pfad: `${FREMD}/geheim.pdf` },
      { id: "a2", betrieb_id: BETRIEB, datei_pfad: "http://169.254.169.254/" },
      { id: "a3", betrieb_id: BETRIEB, datei_pfad: `${BETRIEB}/ok.pdf` },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);

    assert.ok(
      paket.hinweise.some((h) => h.includes("nicht im Ordner dieses Betriebs")),
      "ein fremder Ordner muss gemeldet werden",
    );
    assert.ok(
      paket.hinweise.some((h) => h.includes("vollständige Adressen")),
      "eine absolute Adresse muss gemeldet werden",
    );
    assert.equal(paket.dateien.every((d) => d.datei_enthalten === false), true);
  });
});

describe("baueExportPaket — anonyme Umfragen", () => {
  it("entfernt Einzelstimmen anonymer Umfragen, auch die eigene", async () => {
    const daten = basis();
    daten["benachrichtigungen"] = [
      { id: "u-anon", betrieb_id: BETRIEB, anonym: true },
      { id: "u-offen", betrieb_id: BETRIEB, anonym: false },
    ];
    daten["umfrage_stimmen"] = [
      // Die eigene Stimme — `us_select` lässt sie durch, auch bei
      // zugesagter Anonymität.
      { id: "v1", betrieb_id: BETRIEB, benachrichtigung_id: "u-anon", mitarbeiter_id: "ma-1" },
      { id: "v2", betrieb_id: BETRIEB, benachrichtigung_id: "u-offen", mitarbeiter_id: "ma-2" },
    ];

    const paket = await baueExportPaket(
      klient(daten, { rpc: { "u-anon": [{ option_id: "o1", anzahl: 3 }] } }),
      AUFTRAG,
    );

    assert.deepEqual(
      paket.tabellen["umfrage_stimmen"]?.map((z) => z["id"]),
      ["v2"],
      "die Stimme zur anonymen Umfrage darf nicht im Paket stehen",
    );
    assert.deepEqual(paket.umfrage_ergebnisse_anonym, [
      { benachrichtigung_id: "u-anon", ergebnis: [{ option_id: "o1", anzahl: 3 }] },
    ]);
    assert.ok(paket.hinweise.some((h) => h.includes("anonymer Umfragen")));
  });
});

describe("baueExportPaket — Änderungsprotokoll", () => {
  it("entfernt Geheimnisse und den Notfallgrund aus den JSON-Werten", async () => {
    const daten = basis();
    daten["plan_aenderungen"] = [
      {
        id: 1,
        betrieb_id: BETRIEB,
        tabelle: "einladungen",
        datensatz_id: "e1",
        alte_werte: null,
        neue_werte: { hash: "geheim123", mitarbeiter_id: "m1" },
      },
      {
        id: 2,
        betrieb_id: BETRIEB,
        tabelle: "notfaelle",
        datensatz_id: "n1",
        alte_werte: { grund: "Ich bin krank.", status: "offen" },
        neue_werte: { grund: "Ich bin krank.", status: "vertreten" },
      },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);
    const [einladung, notfall] = paket.tabellen["plan_aenderungen"] ?? [];

    assert.equal((einladung?.["neue_werte"] as Zeile)["hash"], "[entfernt]");
    assert.equal((einladung?.["neue_werte"] as Zeile)["mitarbeiter_id"], "m1");
    assert.equal((notfall?.["alte_werte"] as Zeile)["grund"], "[entfernt]");
    assert.equal((notfall?.["neue_werte"] as Zeile)["status"], "vertreten");
  });

  it("macht eine Pseudonymisierung nicht rückgängig", async () => {
    const daten = basis();
    daten["mitarbeiter"] = [
      { id: "m1", betrieb_id: BETRIEB, vorname: "Gelöscht", anonymisiert_am: "2026-08-01T00:00:00Z" },
      { id: "m2", betrieb_id: BETRIEB, vorname: "Anna", anonymisiert_am: null },
    ];
    daten["plan_aenderungen"] = [
      {
        id: 1,
        betrieb_id: BETRIEB,
        tabelle: "mitarbeiter",
        datensatz_id: "m1",
        alte_werte: { vorname: "Bernd", nachname: "Beispiel", email: "b@example.org", status: "aktiv" },
        neue_werte: { vorname: "Gelöscht", status: "inaktiv" },
      },
      {
        id: 2,
        betrieb_id: BETRIEB,
        tabelle: "mitarbeiter",
        datensatz_id: "m2",
        alte_werte: { vorname: "Anna", status: "eingeladen" },
        neue_werte: { vorname: "Anna", status: "aktiv" },
      },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);
    const [geloescht, aktiv] = paket.tabellen["plan_aenderungen"] ?? [];

    assert.equal((geloescht?.["alte_werte"] as Zeile)["vorname"], "[entfernt]");
    assert.equal((geloescht?.["alte_werte"] as Zeile)["email"], "[entfernt]");
    assert.equal(
      (geloescht?.["alte_werte"] as Zeile)["status"],
      "aktiv",
      "nur Personenfelder werden entfernt, nicht der ganze Eintrag",
    );
    assert.equal(
      (aktiv?.["alte_werte"] as Zeile)["vorname"],
      "Anna",
      "eine nicht pseudonymisierte Anstellung bleibt unangetastet",
    );
    assert.ok(paket.hinweise.some((h) => h.includes("pseudonymisiert")));
  });
});

describe("baueExportPaket — Form und Ausschlüsse", () => {
  it("trennt betriebliche Vertragsannahme von persönlicher Kenntnisnahme", async () => {
    const daten = basis();
    daten["rechtliche_zustimmungen"] = [
      { id: 1, betrieb_id: BETRIEB, dokument: "agb", art: "betrieblich", auth_id: "auth-1" },
      { id: 2, betrieb_id: BETRIEB, dokument: "datenschutz", art: "persoenlich", auth_id: "auth-2" },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);

    assert.deepEqual(paket.rechtliche_zustimmungen.map((z) => z["dokument"]), ["agb"]);
    assert.deepEqual(paket.kenntnisnahmen_datenschutz.map((z) => z["dokument"]), ["datenschutz"]);
  });

  it("nennt Zeitraum, Zeitzone und die Ausschlüsse", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);

    assert.ok(Date.parse(paket.meta.begonnen_am) > 0);
    assert.ok(Date.parse(paket.meta.beendet_am) >= Date.parse(paket.meta.begonnen_am));
    assert.match(paket.meta.zeitzone, /UTC/);
    assert.equal(paket.meta.betrieb.id, BETRIEB);
    assert.equal(paket.meta.erzeugtVon.mitarbeiter_id, "ma-1");

    for (const name of ["push_tokens", "konto_merge_token", "einladungen.hash", "auth.users"]) {
      assert.ok(
        AUSSCHLUESSE.some((a) => a.name === name),
        `${name} muss als Ausschluss benannt sein`,
      );
    }
    assert.equal(paket.ausschluesse, AUSSCHLUESSE);
  });

  it("beschreibt jeden exportierten Abschnitt", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);
    for (const spec of EXPORT_TABELLEN) {
      assert.ok(
        (paket.beschreibungen[spec.name] ?? "").length > 10,
        `${spec.name} ohne Beschreibung`,
      );
    }
  });

  it("exportiert keine Geheimnisse aus den Spaltenlisten", async () => {
    const einladungen = EXPORT_TABELLEN.find((s) => s.name === "einladungen");
    assert.ok(einladungen?.spalten);
    assert.ok(!einladungen.spalten.includes("hash"));
    assert.equal(
      einladungen.eindeutig,
      false,
      "ohne den Hash ist die Sortierung nicht eindeutig — das muss die Spec sagen",
    );

    const abo = EXPORT_TABELLEN.find((s) => s.name === "betrieb_abonnements");
    assert.ok(abo?.spalten);
    assert.ok(!abo.spalten.includes("stripe_"));

    for (const verboten of ["push_tokens", "konto_merge_token", "bug_reports", "benachrichtigung_prefs"]) {
      assert.ok(
        !EXPORT_TABELLEN.some((s) => s.name === verboten),
        `${verboten} darf nicht in der Exportliste stehen`,
      );
    }
  });

  it("sortiert jede Keyset-Tabelle nach ihrem Primärschlüssel", () => {
    // Keyset ist nur korrekt, wenn die Ordnung eindeutig ist. Der Test
    // hält fest, dass niemand `eindeutig: true` an eine Ordnung schreibt,
    // die offensichtlich keine ist.
    for (const spec of EXPORT_TABELLEN) {
      assert.ok(spec.ordnung.length > 0, `${spec.name} ohne Ordnung`);
      if (spec.eindeutig) {
        assert.ok(
          spec.ordnung.every((spalte) => !spalte.endsWith("_am")),
          `${spec.name}: ein Zeitstempel ist kein eindeutiger Schlüssel`,
        );
      }
    }
  });
});

describe("Vollständigkeit: drei getrennte Fragen", () => {
  it("zählt einen fehlenden Anhang NICHT als fachliche Lücke", async () => {
    /*
     * Der Unterschied, um den es geht: eine fehlende PDF-Datei ist etwas
     * anderes als ein fehlender Dienstplan. Vorher legten beide dasselbe
     * `vollstaendig` um, und ein Empfänger konnte nicht unterscheiden, ob
     * er weiterarbeiten kann.
     */
    const daten = basis();
    daten["nachricht_anhaenge"] = [
      { id: "a1", betrieb_id: BETRIEB, benachrichtigung_id: "n1", datei_pfad: `${BETRIEB}/x.pdf` },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);

    assert.equal(paket.vollstaendigkeit.fachlich, true, "die Tabellen sind vollständig");
    assert.equal(paket.vollstaendigkeit.dateien, false, "die Datei fehlt");
    assert.equal(paket.vollstaendig, false, "insgesamt also unvollständig");
  });

  it("zählt eine unlesbare Tabelle NICHT als Dateilücke", async () => {
    const paket = await baueExportPaket(
      klient(basis(), { fehler: { urlaub: "permission denied" } }),
      AUFTRAG,
    );

    assert.equal(paket.vollstaendigkeit.fachlich, false);
    assert.equal(paket.vollstaendigkeit.dateien, true, "es fehlt keine Datei");
  });

  it("ist ohne Anhangszeilen dateivollständig", async () => {
    // Ausdrücklich: kein Anhang ist kein fehlender Anhang.
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);

    assert.equal(paket.vollstaendigkeit.dateien, true);
    assert.equal(paket.vollstaendigkeit.fachlich, true);
    assert.equal(paket.vollstaendig, true);
    assert.deepEqual(paket.unvollstaendig, []);
  });

  it("behauptet nie einen zeitlichen Schnappschuss", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);
    assert.equal(paket.vollstaendigkeit.zeitlich, "keiner");
    assert.match(paket.meta.konsistenz, /KEIN transaktionaler Schnappschuss/);
  });

  it("nennt die Paketgrösse", async () => {
    const paket = await baueExportPaket(klient(basis()), AUFTRAG);
    assert.ok(paket.meta.groesse_bytes > 0);
    assert.ok(
      Math.abs(paket.meta.groesse_bytes - Buffer.byteLength(JSON.stringify(paket), "utf8")) < 64,
      "die gemeldete Grösse muss der tatsächlichen entsprechen",
    );
  });
});

describe("findeOffeneVerweise", () => {
  it("findet eine Zuweisung ohne ihre Schicht", () => {
    // Genau der Fall, den fehlende zeitliche Konsistenz erzeugt: die
    // Schicht entsteht, nachdem `schicht_instanzen` gelesen war.
    const offen = findeOffeneVerweise({
      schicht_instanzen: [{ id: "s1" }],
      schicht_zuweisungen: [
        { id: "z1", schicht_instanz_id: "s1" },
        { id: "z2", schicht_instanz_id: "s-neu" },
      ],
    });

    const treffer = offen.find((v) => v.feld === "schicht_instanz_id");
    assert.ok(treffer, "der offene Verweis muss gefunden werden");
    assert.equal(treffer.anzahl, 1);
    assert.equal(treffer.von, "schicht_zuweisungen");
    assert.equal(treffer.nach, "schicht_instanzen");
  });

  it("hält `null` nicht für einen offenen Verweis", () => {
    // `schicht_instanzen.planungszyklus_id` ist `ON DELETE SET NULL` —
    // „nicht gesetzt" ist ein gültiger Zustand, kein Bruch.
    const offen = findeOffeneVerweise({
      schicht_instanzen: [{ id: "s1" }],
      schicht_zuweisungen: [{ id: "z1", schicht_instanz_id: null }],
    });
    assert.deepEqual(offen, []);
  });

  it("schweigt, wenn alles zusammenpasst", () => {
    const offen = findeOffeneVerweise({
      mitarbeiter: [{ id: "m1" }],
      rollen: [{ id: "r1" }],
      mitarbeiter_rollen: [{ mitarbeiter_id: "m1", rolle_id: "r1" }],
    });
    assert.deepEqual(offen, []);
  });

  it("meldet offene Verweise im Paket und in den Hinweisen", async () => {
    const daten = basis();
    daten["schicht_instanzen"] = [{ id: "s1", betrieb_id: BETRIEB }];
    daten["schicht_zuweisungen"] = [
      { id: "z1", betrieb_id: BETRIEB, schicht_instanz_id: "s-fehlt" },
    ];

    const paket = await baueExportPaket(klient(daten), AUFTRAG);

    assert.equal(paket.vollstaendigkeit.offene_verweise.length > 0, true);
    assert.ok(paket.hinweise.some((h) => h.includes("ins Leere")));
  });
});
