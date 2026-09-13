# Coding — Betriebsregeln

Allgemeine Code-Qualität (keine unnötigen Kommentare, keine vorzeitige
Abstraktion, …) regelt bereits Claude Codes Standardverhalten — hier stehen
nur QuickTeam-spezifische Konventionen und die Werkzeugpolitik.

- **Gates:** `npm run typecheck` und `npm run build`. `npm run lint` fragt in
  dieser Umgebung interaktiv und hängt — kein Gate, nicht verlassen.
- Domänenbegriffe bleiben Deutsch und decken sich mit dem Spaltennamen
  (`betrieb`, `mitarbeiter`, `rolle_typ`) — auch mitten in sonst englischem
  Code. Allgemeine Infrastrukturbegriffe (`client`, `middleware`) bleiben
  Englisch. Nicht nur in eine Richtung übersetzen.
- Bestehende Dateikonvention übernehmen: `aktionen.ts` für Server Actions,
  `*-formular.tsx` für die Client-Insel eines Formulars, `page.tsx` bleibt
  Server Component.
- Zod-Prüfung läuft immer doppelt: client-seitig (UX) und in der Server
  Action (Verteidigung) — eine Seite allein ist unvollständig.

## Werkzeugpolitik (gilt für alle Skills in diesem Repo)

- **Browser-Verifikation:** `playwright-cli`, gefahren nach
  `.claude/skills/run-quickteam-web/SKILL.md` (Auth, Dev-Server) und
  `.claude/skills/playwright-cli/SKILL.md` (Befehle). Eine Änderung gilt erst
  als geprüft, wenn die Seite tatsächlich geladen wurde — nicht nach Lesen
  des Codes.
- **Externe Dokumentation:** `find-docs`/Context7 nur, wenn die Frage
  tatsächlich aktuelles externes API-Verhalten betrifft (Next.js, Supabase-JS,
  Stripe, …) — nicht für etwas, das bereits in diesem Repo dokumentiert ist.
- **Codex:** optionale zweite Meinung für umfangreiche oder risikoreiche
  Änderungen (Auth, Zahlung, schemanahe Änderungen, sicherheitsrelevanter
  Code) — vor dem Aufruf beim Nutzer nachfragen, nie automatisch auslösen.
