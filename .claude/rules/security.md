# Sicherheit — Betriebsregeln

Ergänzt `CLAUDE.md` (dort steht die vollständige `service_role`-Ausnahme und die
RLS-Regel). Hier stehen nur die Punkte, die dort nicht als Regel formuliert sind.

- **Nie den Inhalt einer `.env*`-Datei oder eines Secrets lesen oder ausgeben** —
  auch nicht zur Fehlersuche. Wenn geprüft werden muss, ob ein Wert gesetzt ist,
  Vorhandensein/Länge prüfen (`[ -n "$VAR" ]`, `${#VAR}`), nie den Wert selbst.
- **Jede vom Client hereingereichte ID wird serverseitig neu aus `auth.uid()`
  abgeleitet, nie geglaubt** — das gilt für jeden neuen RPC-Aufruf und jedes
  Cookie genauso wie für `qt_position` (siehe `CLAUDE.md`, `TESTING.md` §5.2).
- **`SUPABASE_SERVICE_ROLE_KEY` bleibt auf die eine Stelle in `CLAUDE.md`
  beschränkt** (`api/stripe/webhook/route.ts`). Die einzige bestehende Ausnahme
  ist `.claude/skills/run-quickteam-web/hole-code.mjs` — ein lokales Testwerkzeug,
  keine Anwendungslogik. Ein weiteres Skript, das den Key liest, braucht dieselbe
  Rechtfertigung und eine kurze Rückfrage beim Nutzer, bevor es entsteht.
- Client-seitige Zod-Prüfung ist UX, keine Verteidigung — jede Prüfung braucht
  ihr Gegenstück in der Server Action.
- Kein `dangerouslySetInnerHTML` mit ungeprüften oder externen Daten.
- Der Stripe-Webhook prüft die Signatur, bevor irgendein Supabase-Client
  entsteht — das gilt für jede Änderung an dieser Datei, nicht nur den
  bestehenden Code.
