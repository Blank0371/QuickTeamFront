---
name: run-quickteam-web
description: Build, run, typecheck, and drive the QuickTeam web app (Next.js dashboard, auth, onboarding stepper). Use when asked to start quickteam-web, run its dev server, log in, take a screenshot of the dashboard, or click through the site.
---

This is a Next.js 15 App Router site (marketing pages, auth, onboarding
stepper, `/dashboard`) backed by a live, shared Supabase project — there is
no local database to seed, and the accounts in it are real. Drive it by
starting `npm run dev` and scripting `playwright-cli` (`@playwright/cli`,
already a devDependency) against it.

**The normal verification path never modifies an existing account.** Log in
to a dedicated test account with a password you already know (env vars or
given to you directly — see "Anmelden" below). `hole-code.mjs` in this skill
directory is an **optional, heavily guarded** helper for the one case that
needs it — confirming a brand-new test account's registration when no inbox
is reachable from this container — and it refuses to run at all against a
project that isn't identifiably local/dev/test. It cannot reset an existing
password; that capability was deliberately removed (see Gotchas).

All paths below are relative to the repo root (`quickteam-web`, this
project's `package.json` name).

## Prerequisites

Nothing beyond `npm install` — no system packages, no browser install (the
`@playwright/cli` devDependency ships pre-registered browsers), no `xvfb`
(there's no GUI window; `playwright-cli` runs a real headless Chromium).

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
```

Every variable in `.env.local.example` must be set — this repo has no
mock mode. In this container all of them were already present (Supabase
URL/anon key, Stripe secret/publishable/webhook/price IDs,
`SUPABASE_SERVICE_ROLE_KEY`). `SUPABASE_SERVICE_ROLE_KEY` is also what the
optional `hole-code.mjs` helper needs — it's the same key described in
`CLAUDE.md`'s "Was hier nicht passiert" section (webhook-only in app code;
here it's read locally by a throwaway script, never imported into the Next
app, never printed).

For the normal (non-optional) path, set a dedicated test account's
credentials — never read, print, or commit these:

```bash
export QT_TEST_EMAIL="..."      # a test account you or the user already control
export QT_TEST_PASSWORD="..."   # its existing password — never generated or reset here
```

Per `.claude/rules/security.md`, don't read `.env*` contents to discover
these — ask the user for them, or have them exported before you start.

## Build

```bash
npm run typecheck   # tsc --noEmit — ran clean in this container
npm run build        # writes to .next-build, not .next (see Gotchas)
```

`npm run lint` exists but `next lint` prompts interactively on first run in
a non-TTY container and hangs — don't use it as a gate (see
`.claude/memory` note `lint-nicht-nutzbar`, already known in this repo).

## Run (agent path)

Start the dev server in the background and wait for it to actually serve,
then drive it with `playwright-cli` from **outside the repo tree**:

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null || curl -sf http://localhost:3001 >/dev/null; do sleep 1; done'
```

`next dev` defaults to port 3000 but silently falls back to 3001 (then
3002, …) if the port is taken — check the server's own stdout for the
`Local: http://localhost:XXXX` line rather than assuming 3000.

**Run `playwright-cli` from a directory outside this repo**, invoking the
project's local binary by absolute path — see Gotchas for why this
specific combination matters:

```bash
mkdir -p /tmp/qt-pwcli && cd /tmp/qt-pwcli
PWCLI="$(pwd -W 2>/dev/null || pwd)/../../path/to/quickteam-web/node_modules/.bin/playwright-cli.cmd"
# or simply the absolute repo path, e.g.:
PWCLI="C:/path/to/quickteam-web/node_modules/.bin/playwright-cli.cmd"

"$PWCLI" open "http://localhost:3001/login"
```

### Anmelden (the normal path — read-only regarding accounts)

Log in with a dedicated test account's existing email + password. Never
reset, never regenerate, never guess one — if you don't have credentials,
ask the user rather than trying to obtain them yourself.

```bash
"$PWCLI" open "http://localhost:3001/login"
"$PWCLI" find "Passwort"              # returns refs for the email/password fields + submit button
"$PWCLI" fill <email-ref> "$QT_TEST_EMAIL"
"$PWCLI" fill <passwort-ref> "$QT_TEST_PASSWORD"
"$PWCLI" click <submit-ref>
# → redirects straight to /dashboard
```

This is the only auth step the normal verification workflow performs. It
reads the account's state; it never writes to it.

### Optional: bootstrapping a brand-new test account

Only needed once, and only if no dedicated test account exists yet. This
**creates a new account** — it never touches an existing one, and the
underlying helper (`hole-code.mjs`) hard-refuses `type: recovery` (the
password-reset flow) for exactly that reason. It also refuses to run at all
unless the Supabase project is identifiably local/dev/test — against this
repo's actual (shared, real-users) project it aborts by default; see the
guard's own error output before ever considering an override.

```bash
# Register through the UI first (fills the account's own chosen password —
# the helper only supplies the confirmation code, it never sets a password):
"$PWCLI" open "http://localhost:3001/registrieren"
# ... fill business name, land, name, a NEW email, and a password you choose ...

# From the repo root — hole-code.mjs reads .env.local relative to its own
# location, so it works from any cwd once given by absolute path.
node .claude/skills/run-quickteam-web/hole-code.mjs "the-new-email@example.com" signup
# → prints the 8-digit confirmation code, or aborts with a clear reason
#   (wrong project, unsupported type) — see the script's own header comment
```

Enter the printed code in the confirmation step the registration form
opened. From then on, treat this as a normal dedicated test account and use
"Anmelden" above — don't call `hole-code.mjs` again for it.

### Driving the dashboard

Standard `playwright-cli` usage from here — `find`/`snapshot` for refs,
`click`/`fill` to act, `screenshot --filename=...` to capture. Full command
reference: the sibling `playwright-cli` skill in this repo
(`.claude/skills/playwright-cli/SKILL.md`).

```bash
"$PWCLI" screenshot --filename=dashboard.png
"$PWCLI" find "Team"                                          # ambiguous — matches the logo link too
"$PWCLI" click "getByRole('link', { name: 'Team', exact: true })"
"$PWCLI" screenshot --filename=dashboard-team.png
"$PWCLI" close
```

Screenshots land in `.playwright-cli/` **relative to wherever you ran
`playwright-cli` from** — that's exactly why the driver runs from
`/tmp/qt-pwcli`, not the repo (see Gotchas).

## Run (human path)

```bash
npm run dev   # → http://localhost:3000 (or next free port). Ctrl-C to stop.
```

## Test

No automated test suite in this repo as of this writing — `package.json`
has no `test` script. `npm run typecheck` and `npm run build` are the
verification gates (see `CLAUDE.md` / project memory).

---

## Gotchas

- **Never run `playwright-cli` with the repo as its cwd while `next dev`
  is running.** Its default output directory is `.playwright-cli/`
  relative to cwd. If that lands inside the repo, Next's file watcher
  treats every snapshot/console-log/screenshot it writes as a source
  change and rebuilds — one `find` or `click` command was enough to
  trigger a *continuous* rebuild loop (hundreds of "Fast Refresh
  rebuilding" lines) that eventually made the page's RSC fetch return
  500 mid-interaction. There is no `--output-dir` flag. Fix: `cd` to any
  directory outside the repo before invoking it.
- **`npx playwright cli` from outside the repo does NOT reuse the repo's
  installed browsers/version.** It resolves an unrelated `playwright`
  package from npm's cache (a different version, `(no browsers)` until
  you separately install them). The fix used above — invoking
  `node_modules/.bin/playwright-cli.cmd` **by absolute path** while cwd is
  elsewhere — gets both right: Node resolves `require()`s relative to the
  script's own location (so it's the repo's exact devDependency and its
  pre-registered browsers), while output files land next to the cwd you
  chose, not inside the watched repo.
- **`next dev` silently moves off port 3000** if something else is
  already listening there (it did, in this container — another instance
  of this same app was already running on 3000). It does not error; it
  just prints `using available port 3001 instead`. Read the server's own
  startup line rather than hardcoding 3000.
- **No inbox reachable from this container** — registration/confirmation
  mails an 8-digit OTP (`CLAUDE.md`: "Bestätigung läuft über Codes, nicht
  über Links"). `hole-code.mjs` sidesteps that, for new-account
  confirmation only, by calling `auth.admin.generateLink()` with the
  service-role key, which returns `properties.email_otp` — the literal
  code a real inbox would have shown. This does not bypass verification:
  `verifyOtp` on the site still checks the code against Supabase normally.
- **`hole-code.mjs` refuses `type: recovery` unconditionally** — that type
  generates a code for `/passwort-neu`, which changes an *existing*
  account's password. An earlier version of this skill documented exactly
  that flow as the normal way to obtain a login, and it was used against a
  real account in this project's shared Supabase instance before the
  helper was locked down — the account's password ended up changed as a
  side effect. That's precisely the failure mode the current guard
  (project-identification check + hard `recovery` block) exists to
  prevent. Don't work around it; get real test-account credentials from
  the user instead.
- **Two real accounts already exist** in the shared Supabase project — a
  chef account (business "Test") and a 3-employee test business
  ("Testbetrieb 12", chef + 2 staff, all under one email; per
  `.claude/rules/supabase.md`, Testbetrieb 12 is a fixture the App's own
  test suite depends on). Neither is a sanctioned target for `hole-code.mjs`
  or for password changes of any kind — if one of them is meant to serve as
  the dedicated test account, get its actual password from the user rather
  than resetting it.
- **A form submission can appear to fail while it actually succeeded
  server-side.** If a rebuild storm (see above) is in flight when you
  click submit, the server action can complete while the client never
  gets to show the success state. This is exactly how the password-reset
  side effect described above went unnoticed at first — the browser still
  showed the form, so the submit looked like a no-op. Don't assume "no
  visible change" means "nothing happened"; re-check actual state instead.

## Troubleshooting

- **`playwright-cli` click/fill produces no visible effect and the page
  keeps re-rendering** (visible via repeated `Fast Refresh rebuilding` in
  `next dev`'s own stdout): you ran `playwright-cli` with the repo as cwd.
  `rm -rf .playwright-cli` in the repo root, then rerun from outside the
  repo per "Run (agent path)" above.
- **`getByRole('link', { name: 'Team' })` throws "strict mode
  violation: … resolved to 2 elements"**: the dashboard header's logo
  link is also named "Team" as part of its accessible name chain in some
  states. Use `{ name: 'Team', exact: true }`.
- **`screenshot` exits with code 2 but no error text on the very first
  call after `open`**: transient — the page/browser hadn't finished
  settling yet. Retrying the same command immediately succeeded.
