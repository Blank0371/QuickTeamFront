# QuickTeam — Legal documents (for review)

Stand-alone, readable copies of QuickTeam's contract documents, exported for legal review. **All are pre-lawyer drafts.**

| File | Document | Language | Status |
|---|---|---|---|
| `AGB-QuickTeam-de.md` | Allgemeine Geschäftsbedingungen (Terms) | German — **legally binding** | Ready for review |
| `Terms-QuickTeam-en.md` | General Terms and Conditions | English — convenience translation | Ready for review |
| `AVV-QuickTeam-de.md` | Auftragsverarbeitungsvertrag (Art. 28 GDPR) | German — **legally binding** | Ready for review, incl. 3 annexes |
| `DPA-QuickTeam-en.md` | Data Processing Agreement | English — convenience translation | Ready for review, incl. 3 annexes |
| `datenschutzerklaerung-de.md` | Datenschutzerklärung (Privacy Policy) | German — **legally binding** | Rewritten 13 Sept 2026, ready for review — see "Privacy policy 2026-09-13" below |
| `privacy-policy-en.md` | Privacy Policy | English — convenience translation | Rewritten 13 Sept 2026, mirrors the German text section by section |

## Key drafting decisions

- **B2B only.** Directed exclusively at entrepreneurs (§ 14 BGB); consumers excluded. This deliberately keeps the statutory consumer right of withdrawal (Widerrufsrecht) and § 305 BGB incorporation rules out of scope.
- **The business owner is the customer.** Employees are invited "Users" under the owner's contract and pay nothing; only the owner is the paying/contracting party.
- **Paid SaaS via Stripe**, billed monthly (annual optional later), month-to-month term, cancellation effective at end of the paid period, and stopping payment ends the contract.
- **Court-safe drafting** aimed at surviving German AGB-Kontrolle (§§ 305–310 BGB): the standard liability cascade, the § 536a(1) no-fault carve-out, and a proper change-of-terms mechanism with an objection right.
- **German version prevails**; English is information only.

## Resolved (operator-confirmed, Sept 2026)

- **No DPO required** — BlankTrading has at most 2 people processing personal data (Section 38(1) BDSG threshold is 20).
- **Hosting:** Supabase, **Ireland** region; Supabase DPA active.
- **Stripe:** standard Stripe, DPA accepted → treated as an independent controller for payment data.
- **US push transfers:** Data Privacy Framework (Apple, Google) + EU Standard Contractual Clauses (Expo).
- **Security (TOMs):** admin/database access has 2FA; daily backups retained 7 days.

## Still open — needs the lawyer / operator

- **Privacy policy:** rewritten on 2026-09-13 against the live system (see "Privacy policy 2026-09-13" below). Still open: lawyer review, syncing the app's own copy, and bringing the AVV/DPA (§ 1(4), Annex 3) in line with it.
- **Execute the provider DPAs/SCCs:** confirm the Expo (and Apple/Google) data-processing terms / SCCs are actually accepted before go-live. Annex 3 of the AVV/DPA names DPF and the EU SCCs as the transfer basis for the US push services, so the published documents already assert something that has to be true at launch. This obligation used to sit inside the documents themselves as an *Umsetzungshinweis / Implementation note*; it was removed on 2026-09-10 because `/avv` renders them publicly and an internal to-do has no place on a contract page. It lives here now — do not put it back into the documents.
- **App Store note:** these terms assume web/Stripe billing. If digital subscriptions are ever sold *inside* the iOS/Android app, Apple/Google in-app-purchase rules would additionally apply.
- **Impressum:** already exists (per operator) — not managed here.

## Privacy policy 2026-09-13 — what it is based on, and what the reviewer should check

The 13 Sept 2026 version replaces the 9 Sept text completely. It now covers
**website, web dashboard and app in one document** and states, per processing
activity, purpose, legal basis, recipients and a concrete retention period.
Every factual statement was checked against the live system on 2026-09-13,
not taken from earlier documents.

### Verified facts the text relies on

| Statement in the policy | Source |
|---|---|
| Unconfirmed accounts deleted after 24 h | `cron.job` "cleanup-unconfirmed-users", hourly, `cleanup_unconfirmed_users()` |
| Account self-deletion: what is deleted, pseudonymised, kept | source of `konto_selbst_loeschen()` and FK rules on `mitarbeiter` / `auth.users` |
| Employer-side removal | source of `mitarbeiter_anonymisieren()` |
| Sole manager deleting the account cancels Stripe immediately | `src/app/(site)/kontoloeschung/aktionen.ts` |
| Push payload carries full title/text of announcements | edge function `push-versenden` (v3) |
| Solver runs in-house, no third party | edge function `plan-generieren` (v12): no outbound calls |
| Change log with before/after snapshots, managers only | trigger `schreibe_audit_log()`, policy `audit_select_chef` |
| Sessions store IP + user agent, no expiry | `auth.sessions` (counts only, no rows read) |
| Supabase Pro: logs 7 days, backups daily / 7 days | organisation plan `pro`; Supabase docs |
| Vercel runtime logs ≤ 1 day | Vercel docs (Hobby 1 h, Pro 1 day) |
| Resend stores data in the USA, 30 days, SCC + DPF | Resend GDPR page / DPA |
| Cookie names, lifetimes, scopes | `src/i18n/sprache.ts`, `src/lib/dashboard/position.ts`, `src/lib/registrierung-merker.ts`, `@supabase/ssr` defaults, Stripe cookie policy |
| Fonts self-hosted, no analytics | `next/font/google` (build-time), no tracking dependency in `package.json` |
| Bug reports are not linked to an account | table `bug_reports` has no user column |

### Operator decisions recorded on 2026-09-13

- **Hosting is Vercel.** The repo also contains a `netlify.toml`; if the site ever moves, Sections 3, 13 and 14 must change.
- **SMS/phone login is off.** It is therefore not mentioned. If it is ever switched on, the SMS provider must be added (recipient, third country, retention).
- **Deletion after contract end: 30 days** (matches AGB § 6(4)). **Paused trials: deleted after 90 days** without reactivation. **Nothing automates either yet** — until a job exists, both must be done by hand. The policy promises them.
- **Contact stays blanktrading@web.de**, so WEB.DE is listed as a processor.
- **Bug reports: deleted after handling, at most 12 months.** This period was set while drafting, not decided explicitly — change it if needed.

### Points for the lawyer

1. **Legal bases for employee data (7.5, 8).** Worded as the *employer's* bases, with Art. 88 GDPR and § 26 BDSG as the national rule. After CJEU C-34/21 (30 Mar 2023) the validity of § 26(1) BDSG as a "more specific rule" is doubtful; please confirm the wording.
2. **Business owner as data subject (5.3).** Art. 6(1)(b) for sole traders, (f) for representatives of legal entities. Please confirm.
3. **Stripe as independent controller (6).** Operator-confirmed earlier. Stripe's fraud cookies are treated as strictly necessary under § 25(2) no. 2 TDDDG; please confirm that no consent is needed for `__stripe_mid` on the payment page.
4. **No cookie banner (4).** Everything is claimed to be strictly necessary. `qt_sprache` (language preference) is the weakest case; it is only set when the user switches language.
5. **Health data (8).** The policy is honest that the emergency reason is visible to business members and that "sick" is Art. 9 data. That visibility is a technical defect (see `docs/backend-befunde-2026-09-13.md`). Please consider whether the text can go live before the defect is fixed.
6. **Push token after sign-out (10).** The policy admits that sign-out does not remove the token. That is true today and should be fixed in the app; then the sentence can go.
7. **"Agreements under Art. 28 with all processors" (13).** Must be true on the publication date. In particular: can a WEB.DE free mail account be covered by a DPA? If not, a business mailbox is the cleaner solution.
8. **Retention of the records of acceptance (15).** They are deleted together with the business (FK `ON DELETE CASCADE`), i.e. 30 days after the contract ends. Keeping them for the limitation period (3 years, §§ 195, 199 BGB) would need a schema change; the policy describes the current behaviour.
9. **Retention for accounting records** is given as 8 years for invoices / booking records (§ 147 AO as amended by BEG IV, effective 2025) and 6 years for business letters. Please confirm.
10. **AVV aligned on 2026-09-13:** § 1(4) now separates EU storage from third-country transfers by the Annex 3 sub-processors, and Annex 3 lists Vercel, Resend and WEB.DE. Please check the new § 1(5) (electronic conclusion, confirmation of authority to represent) and whether defining the controller by reference to the customer account is sufficient without a postal address.

### Consequences for the code and the app

- `src/lib/rechtstexte.ts`: `datenschutz` bumped to `2026-09-13-draft`. Managers are asked to confirm again through the consent gate on their next dashboard visit — intended.
- **The app ships its own copy** (`src/lib/legalDocs.ts` in the app repo, last updated 2026-09-12). It no longer matches this text and has to be brought in line by the app developer; this repo does not write to the app repo.
- **Vercel region:** Without a `regions` setting, Vercel runs server functions in `iad1` (Washington, D.C.). Setting the project to `dub1` (Dublin, same region as the Supabase database) would keep dashboard data processing in the EU and reduce latency. The policy is written so that it is true either way.

## External legal review of 2026-09-13 — status per finding

A reviewer looked at an **older checkout** (privacy policy of 9 Sept, before
the rewrite above). All eight findings were re-checked against this repo on
2026-09-13.

| # | Finding | Status |
|---|---|---|
| 1 | Privacy policy misses website hosting, cookies, Stripe; "never in plain text" too absolute | **Fixed.** Rewrite of 13 Sept covers all three. Password sentence now describes the actual flow (TLS → our server → Supabase, not logged, only a hash stored). Verified: no server action logs or echoes the password. |
| 2 | AVV § 1(4) "exclusively EU/EEA" contradicts US sub-processors | **Fixed in the text.** § 1(4) now separates EU storage from transfers by the Annex 3 sub-processors. Annex 3 gained Vercel, Resend and WEB.DE; Supabase's US access is named. **Still open (operator):** the DPAs/SCCs must actually be concluded — see checklist below. |
| 3 | AVV promises auto-filled company/address/representative — not implemented | **Fixed.** Placeholders removed; the party is defined via the customer account (AGB § 1(4)); new § 1(5) describes electronic conclusion. The registration checkbox now includes the confirmation of authority to represent the business. The `/avv` notice no longer promises anything the code doesn't do. |
| 4 | Impressum: e-mail alone is not enough (CJEU C-298/07) | **Fixed.** Phone number +43 664 2538798 added to the Impressum (and to the controller block of the privacy policy). It must actually be answered. |
| 5 | Payment view: no amount, fixed "14 days free", no cancellation UI | **Fixed.** Amount, VAT note, actual trial end, first debit, renewal and cancellation are shown directly above the button, read from the Stripe subscription (`src/lib/abo-konditionen.ts`). The expired-trial button now says "Kostenpflichtig fortsetzen". **Cancellation:** "Abo verwalten" in dashboard settings opens the Stripe customer portal. A mismatch between website price and Stripe price is logged (`[preise]`). **Still open:** invoice data (see below). |
| 6 | Export promised (AGB § 6(4)), none exists; Data Act | **Open, planned.** Operator plans a download button (likely Excel). Chapter VI of the Data Act asks for a structured, commonly used, machine-readable format; `.xlsx` is likely fine, CSV/JSON per table would be safer. AGB § 6(4) should be reworded once the function exists. |
| 7 | AGB clauses (price changes, change by silence, indemnity "auf erstes Anfordern", force majeure for sub-suppliers, backup duty) | **For the lawyer.** Not changed here. |
| 8 | Security promises vs. production; Next.js 15.5.22 | **Next.js updated to 15.5.25** (includes the 25 Aug 2026 fixes). RLS: enabled on every public table (checked 2026-09-13; `konto_merge_token` has RLS without policies, i.e. deny-all, intended). Backups: Supabase plan is Pro, daily backups kept 7 days. **2FA cannot be verified from here** — see checklist. |

### Operator checklist before go-live

1. **Phone number** in the Impressum: done on 2026-09-13; make sure it is actually answered.
2. **Conclude the DPAs** the documents now assert: Supabase (sign in the dashboard), Vercel, Resend, Expo (650 Industries — request DPA incl. SCCs), and clarify WEB.DE. A free WEB.DE mailbox may not offer a DPA; a business mailbox on the own domain would solve that and look more professional.
3. **Vercel plan:** the Hobby plan is for non-commercial, personal use only (Vercel fair-use guidelines). A paid SaaS needs Pro. Set the function region to `dub1` (Dublin, next to the Supabase database): Project → Settings → Functions → Function Regions, then redeploy.
4. **Stripe customer portal:** save a configuration in the Stripe dashboard (test **and** live): Settings → Billing → Customer portal. Enable "cancel at end of billing period", payment-method updates and invoice history; add links to `/agb` and `/datenschutz`. Without it, "Abo verwalten" shows an error and points to e-mail.
5. **Invoices / tax:** the Stripe customer only carries e-mail and business ID. German invoices up to 250 € gross may omit the recipient's address (Kleinbetragsrechnung), but reverse-charge invoices to Austrian businesses need the customer's name, address and VAT ID. Clarify with a tax adviser; Stripe can collect address and tax ID in the portal/checkout.
6. **2FA** on every admin account: Supabase organisation, Vercel, Stripe, Resend, GitHub, Expo, the domain registrar.
7. **Hosting ambiguity:** the repo still contains `netlify.toml`, and the comments in `next.config.ts` describe Netlify. That misled the reviewer. Remove it if Netlify is not used.

## Published on the website (added 2026-09-10)

All six documents in this folder are rendered by the website:

| Route | German | English |
|---|---|---|
| `/agb` | `AGB-QuickTeam-de.md` | `Terms-QuickTeam-en.md` |
| `/avv` | `AVV-QuickTeam-de.md` | `DPA-QuickTeam-en.md` |
| `/datenschutz` | `datenschutzerklaerung-de.md` | `privacy-policy-en.md` |

Language follows the `qt_sprache` cookie, not a path prefix. The privacy policy
moved here from `docs/rechtliches/` on 2026-09-10 — it existed in both places,
byte-identical, which is an invitation to edit the copy nobody serves. **This
folder is now the only location for legal documents.**

Two consequences for anyone editing these files:

- **They are now customer-facing.** The leading `> **Note (not part of the
  contract text): …**` blockquote has been removed from both English files: it
  carried internal repository paths and the words "Pre-lawyer draft" onto a
  public route. The precedence of the German version is unaffected — it is stated
  normatively in Section 14(6) of the Terms themselves. Do not reintroduce
  reviewer notes into the documents; this README is where they belong.
- **`/avv` carries a visible notice** explaining how the agreement is concluded
  (electronically at registration, with confirmation of authority to represent).
  Until 2026-09-13 it claimed that `[…]` placeholders were filled from the
  business data; that never happened, and the placeholders are gone.

The website's soft-launch lock (`SOFT_LAUNCH`) stays **on** while these remain
pre-lawyer drafts.

## Source of truth

The in-app text lives in `src/lib/legalDocs.ts` (constants `TERMS_DE` / `TERMS_EN`), versioned via `TERMS_VERSION` in `src/lib/terms.ts`. **If the wording changes in either place, update the other to match.** The AVV/DPA here are not yet wired into an in-app acceptance flow (see `TERMS_DE` § 7(3) / Section 7(3), which assumes the customer concludes the AVV at registration).
