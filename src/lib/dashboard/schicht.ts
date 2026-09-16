import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Eine einzelne Schicht mit allem, was dazugehört.
 *
 * Quelle ist `schicht_ansehen`, am 2026-08-26 im Quelltext nachgelesen.
 * Sie liefert **mehr** als `kalender_schichten` (Bedarf je Rolle,
 * Zuweisungs-IDs, Übernahme-Angebot) und zugleich **weniger**: das Feld
 * `status` fehlt. Siehe `holeSchicht()`.
 */
export type SchichtDetail = {
  id: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  kommentar: string | null;
  label: string | null;
  can_edit: boolean;
  mine: boolean;
  canceled: boolean;
  open: boolean;
  swap_wanted: boolean;
  understaffed: boolean;
  /** Übernahme-Angebot (Ausschreibung oder Vertretung) — erst in Phase 6 benutzt. */
  claim: unknown;
  /**
   * Mindestbesetzung je Rolle. **Nur für Chefs gefüllt**, sonst `null` —
   * nicht `[]`. Die Unterscheidung zählt: `[]` hiesse „kein Bedarf
   * hinterlegt", `null` heisst „geht dich nichts an".
   */
  bedarf:
    | {
        rolle_id: string;
        role_name: string | null;
        benoetigt: number;
        besetzt: number;
      }[]
    | null;
  participants: {
    name: string;
    mitarbeiter_id: string;
    zuweisung_id: string;
    rolle_id: string | null;
    role_name: string | null;
    attendet: boolean;
    is_me: boolean;
  }[];
};

export type Notiz = {
  id: string;
  text: string;
  autor_id: string;
  /** `null`, wenn der Name nicht gezeigt werden darf — nicht „kein Autor". */
  autor_name: string | null;
  is_me: boolean;
  erstellt_am: string;
  aktualisiert_am: string | null;
};

/**
 * Holt eine Schicht — oder `null`, wenn es sie nicht gibt **oder** sie
 * nicht gezeigt werden darf.
 *
 * Die Funktion unterscheidet beides absichtlich nicht: sie gibt in
 * beiden Fällen `null` zurück. Das ist richtig so und wird hier nicht
 * repariert — eine Oberfläche, die „diese Schicht existiert, aber du
 * darfst sie nicht sehen" sagt, verrät bereits etwas. Die Seite zeigt
 * deshalb schlicht „nicht gefunden".
 *
 * ─────────────────────────────────────────────────────────────────────
 *  `status` kommt aus einem zweiten Zugriff, und das ist eine Ausnahme.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `kalender_schichten` liefert `status`, `schicht_ansehen` nicht. Ohne
 * ihn sähe die Detailansicht einer noch nicht veröffentlichten Schicht
 * genauso aus wie die einer bestätigten — ein Chef könnte einen Entwurf
 * für den fertigen Dienstplan halten. Das ist zu teuer, um es
 * wegzulassen.
 *
 * Gelesen wird deshalb ergänzend `schicht_instanzen.status`. Das ist
 * **keine** zweite Autorisierungsebene: die Tabelle trägt
 * `instanzen_select` mit `kann_schicht_sehen(id) or
 * schicht_offen_ausgeschrieben(id)`, RLS entscheidet also nach
 * denselben Regeln wie die Funktion selbst. Und gefragt wird erst,
 * nachdem `schicht_ansehen` die Sicht bereits gewährt hat — der Zugriff
 * kann nichts freigeben, was vorher verschlossen war.
 *
 * **Gemeldet, nicht repariert:** dass `schicht_ansehen` den Status nicht
 * mitliefert, gehört ins App-Repo. Von hier wird die Funktion nicht
 * angefasst.
 */
export async function holeSchicht(
  supabase: SupabaseServerClient,
  instanzId: string,
  mitarbeiterId: string,
): Promise<{ schicht: SchichtDetail; status: string | null } | null> {
  const { data, error } = await supabase.rpc("schicht_ansehen", {
    p_instanz_id: instanzId,
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[schicht] schicht_ansehen(${instanzId}): ${error.message}`);
    return null;
  }

  if (data === null || typeof data !== "object") return null;

  const schicht = data as SchichtDetail;

  const { data: zeile, error: statusFehler } = await supabase
    .from("schicht_instanzen")
    .select("status")
    .eq("id", instanzId)
    .maybeSingle();

  if (statusFehler) {
    console.error(`[schicht] status(${instanzId}): ${statusFehler.message}`);
  }

  return { schicht, status: zeile?.status ?? null };
}

/**
 * Notizen zur Schicht.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  Die beiden Funktionen sind sich nicht einig, wer die Schicht sehen
 *  darf — und das muss hier abgefangen werden.
 * ─────────────────────────────────────────────────────────────────────
 *
 * `schicht_ansehen` gewährt die Sicht auch dann, wenn die Schicht zur
 * Übernahme offensteht (`claim` gesetzt): eine Ausschreibung in meiner
 * Rolle oder eine gesuchte Vertretung. `schicht_notizen_holen` prüft
 * dagegen nur `kann_schicht_sehen()`, und das kennt Chef, die Einstellung
 * `mitarbeiter_sehen_andere_schichten` und „ich bin zugewiesen" — die
 * Ausschreibung nicht.
 *
 * Wer also eine offene Schicht betrachtet, bekommt das Detail, aber für
 * die Notizen ein `Nicht berechtigt` geworfen. Ein unbehandelter Fehler
 * risse dabei die ganze Seite mit, obwohl das Wesentliche längst da ist.
 * Deshalb: Fehler schlucken, Notizen weglassen, Seite steht.
 *
 * Ebenfalls gemeldet, nicht repariert.
 */
export async function holeNotizen(
  supabase: SupabaseServerClient,
  instanzId: string,
  mitarbeiterId: string,
): Promise<Notiz[]> {
  const { data, error } = await supabase.rpc("schicht_notizen_holen", {
    p_instanz_id: instanzId,
    p_mitarbeiter_id: mitarbeiterId,
  });

  if (error) {
    console.error(`[schicht] notizen(${instanzId}): ${error.message}`);
    return [];
  }

  return Array.isArray(data) ? (data as Notiz[]) : [];
}

export type ZuweisbareRolle = { id: string; name: string };

export type ZuweisbarerMitarbeiter = {
  id: string;
  name: string;
  /** Rollen, für die diese Person qualifiziert ist — leer heisst „nicht einteilbar". */
  rollen: ZuweisbareRolle[];
};

/**
 * Team fürs manuelle Zuweisen — Spiegel der drei Abfragen in
 * `shift/[id].tsx` (Zeilen 253–255): Mitarbeiter, aktive Rollen,
 * Mitarbeiter-Rollen-Zuordnung, clientseitig zusammengeführt.
 *
 * **Kein Status-Filter**, absichtlich: die App filtert `mitarbeiter` beim
 * Laden dieser Liste nicht nach `status` — wer `schicht_zuweisen` ruft,
 * bekommt die Antwort vom Trigger, nicht von hier. `pruefe_zuweisung_constraints`
 * prüft zwar `status = 'deaktiviert'`, ein Wert, den der CHECK auf
 * `mitarbeiter.status` gar nicht zulässt (nur `eingeladen`/`aktiv`/
 * `pausiert`/`inaktiv`) — dieser Zweig im Trigger feuert nie. Gemeldet,
 * nicht repariert; die Fehlermeldung dafür steht trotzdem bereit, falls
 * das App-Repo den Wert eines Tages korrigiert.
 */
export async function holeZuweisbareMitarbeiter(
  supabase: SupabaseServerClient,
  betriebId: string,
): Promise<ZuweisbarerMitarbeiter[]> {
  const [{ data: mitarbeiter }, { data: rollen }, { data: zuordnung }] = await Promise.all([
    supabase.from("mitarbeiter").select("id, vorname, nachname").eq("betrieb_id", betriebId).in("status", ["aktiv", "eingeladen"]).is("anonymisiert_am", null).order("nachname"),
    supabase.from("rollen").select("id, name").eq("betrieb_id", betriebId).eq("aktiv", true),
    supabase.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").eq("betrieb_id", betriebId),
  ]);

  const rollenNamen = new Map((rollen ?? []).map((r) => [r.id, r.name as string]));
  const rollenVon = new Map<string, ZuweisbareRolle[]>();
  for (const zeile of zuordnung ?? []) {
    const name = rollenNamen.get(zeile.rolle_id);
    if (!name) continue; // inaktive oder gelöschte Rolle — nicht wählbar
    const liste = rollenVon.get(zeile.mitarbeiter_id) ?? [];
    liste.push({ id: zeile.rolle_id, name });
    rollenVon.set(zeile.mitarbeiter_id, liste);
  }

  return (mitarbeiter ?? []).map((m) => ({
    id: m.id,
    name: `${m.vorname} ${m.nachname}`.trim(),
    rollen: rollenVon.get(m.id) ?? [],
  }));
}
