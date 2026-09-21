## Umsetzung am 15.09.2026, Revision r2

Aktueller Schlüssel aller drei Dokumente: **2026-09-15-r2-draft**. Die Version ohne r2 ist archiviert. Notfallgründe sind jetzt in Supabase geschützt; App-Quelltexte liegen in QuickTeamMobile und wurden synchronisiert. Export umfasst jetzt 30 Bereiche. Aktueller Status und noch offene Schritte: [UMSETZUNG-2026-09-15.md](../UMSETZUNG-2026-09-15.md). Die folgenden älteren Aussagen zu offenem Notfallgrund-Umbau und fehlender App-Synchronisierung sind insoweit überholt.

# QuickTeam — Rechtstexte, Stand 15. September 2026

AGB, AVV und Datenschutzinformation liegen jeweils auf Deutsch und Englisch vor. Alle sechs Dateien und die Versionsschlüssel tragen den Stand 2026-09-15-draft. Deutsch ist die Vertragsfassung; Englisch die abgestimmte Übersetzung. Die Datenschutzinformation ist keine Verarbeitungseinwilligung.

**Entwurfsstand; keine Launchfreigabe.** Änderungen, technische Voraussetzungen und Quellen stehen in [ABGLEICH-2026-09-15.md](../ABGLEICH-2026-09-15.md). Insbesondere Export-Löschsperren, Notfallgrund-Zugriffe, App-Fassung und Dienstleister-Nachweise sind vor Veröffentlichung abzugleichen.

Die unmittelbar vorherigen sechs Texte sind mit Fassungen und SHA-256-Prüfsummen unter [archiv/vor-2026-09-15](../archiv/vor-2026-09-15/) erhalten. Bestehende Vertragsannahmen werden nicht rückwirkend ersetzt.

## Historischer Bearbeitungsverlauf bis 14. September 2026

Der folgende Verlauf dokumentiert frühere Annahmen und Prüfstände. Er ist **keine aktuelle Freigabe oder Tatsachenbestätigung**. Insbesondere sind die früheren Aussagen „No DPO required“, pauschale Stripe-Einordnung und „Court-safe“ durch den aktuellen Abgleich überholt. Ein Unterschreiten der Personalgrenze allein beseitigt keine Benennungspflicht; AGB-Kontrolle gilt auch im B2B-Bereich.

---

# QuickTeam — Legal documents (for review)

Stand-alone, readable copies of QuickTeam's contract documents, exported for legal review. **The six customer-facing documents are pre-lawyer drafts** — Terms, DPA and privacy policy; the referral partner agreement was released by the operator on 19 Sept 2026 without a lawyer review (see the last table row and "Referral partner agreement" below).

| File | Document | Language | Status |
|---|---|---|---|
| `AGB-QuickTeam-de.md` | Allgemeine Geschäftsbedingungen (Terms) | German — **legally binding** | Ready for review |
| `Terms-QuickTeam-en.md` | General Terms and Conditions | English — convenience translation | Ready for review |
| `AVV-QuickTeam-de.md` | Auftragsverarbeitungsvertrag (Art. 28 GDPR) | German — **legally binding** | Ready for review, incl. 3 annexes |
| `DPA-QuickTeam-en.md` | Data Processing Agreement | English — convenience translation | Ready for review, incl. 3 annexes |
| `datenschutzerklaerung-de.md` | Datenschutzerklärung (Privacy Policy) | German — **legally binding** | Rewritten 13 Sept 2026, amended 14 Sept 2026, ready for review — see "Privacy policy 2026-09-13" and "Amendment 2026-09-14" below |
| `privacy-policy-en.md` | Privacy Policy | English — convenience translation | Rewritten 13 Sept 2026, amended 14 Sept 2026, mirrors the German text section by section |
| `Werbepartner-Vertrag-QuickTeam-de-en.md` | Werbepartner-Vereinbarung (referral partner agreement, Promo-Code) | German — **legally binding**, with English convenience translation in one file | **Released 19 Sept 2026 (`2026-09-19`), no lawyer review** — see below |

## Referral partner agreement (`Werbepartner-Vertrag-QuickTeam-de-en.md`)

Not a customer document: it governs the relationship with an **individual** who
refers businesses and is paid a share of their net revenue. It is not part of the
registration consent flow, carries no entry in `src/lib/rechtstexte.ts`, and is not
rendered as a web page — `/promocode/antrag` builds it into the PDF that an
applicant downloads, fills in, signs and emails back. Parts A and D are the form;
Parts B and C are the contract.

**Open values were fixed on 19 Sept 2026 on the operator's instruction:** 20 % of
net revenue for the first twelve months per referred business and 10 % thereafter
(§ 4(1)); payout monthly, cut-off on the first day of each calendar month, within
14 days, minimum €50.00 (§ 6(2)–(3)); four weeks' notice to terminate (§ 9(2));
changes offered at least six weeks ahead and effective only with the partner's
consent (§ 11). The draft notice was removed at the same time, so the file no
longer marks itself as a draft.

**That decision is the operator's, and it is the one thing here a lawyer has not
seen.** Everything the reviewer should know: the document was drafted in-house, the
rates above are a business decision rather than a reviewed term, and § 3(3) (no
self-referral) plus § 5 (no compensation without collected payment) are the two
provisions doing the economic work. The agreement's own `Stand:` line is the only
version marker; there is no archive of predecessor versions because none was ever
issued to a partner.

## Key drafting decisions

- **B2B only.** Directed exclusively at entrepreneurs (§ 14 BGB); consumers excluded. This deliberately keeps the statutory consumer right of withdrawal (Widerrufsrecht) and § 305 BGB incorporation rules out of scope.
- **The business owner is the customer.** Employees are invited "Users" under the owner's contract and pay nothing; only the owner is the paying/contracting party.
- **Paid SaaS via Stripe**, billed monthly (annual optional later), month-to-month term, cancellation effective at end of the paid period, and stopping payment ends the contract.
- **Court-safe drafting** aimed at surviving German AGB-Kontrolle (§§ 305–310 BGB): the standard liability cascade, the § 536a(1) no-fault carve-out, and a change-of-terms mechanism based on active consent (since 2026-09-13; previously consent by silence).
- **German version prevails**; English is information only.

## Resolved (operator-confirmed, Sept 2026)

- **No DPO required** — BlankTrading has at most 2 people processing personal data (Section 38(1) BDSG threshold is 20).
- **Hosting:** Supabase, **Ireland** region; Supabase DPA active.
- **Stripe:** standard Stripe, DPA accepted → treated as an independent controller for payment data.
- **US push transfers:** Data Privacy Framework (Apple, Google) + EU Standard Contractual Clauses (Expo).
- **Security (TOMs):** admin/database access has 2FA; daily backups retained 7 days.

## Still open — needs the lawyer / operator

- **Privacy policy:** rewritten on 2026-09-13 against the live system (see "Privacy policy 2026-09-13" below), amended on 2026-09-14 (see "Amendment 2026-09-14"). Still open: lawyer review. **The app's copy is behind again:** it was synced on 2026-09-14 with the 13 Sept text and version `2026-09-13-draft` (see "Source of truth" below).
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
- **Deletion after contract end: 30 days** (matches AGB § 6(4)). **Paused trials: the contract ends after 90 days** without reactivation, and deletion follows 30 days later (AGB r2 § 5(3), since 2026-09-14; before r2 it was deletion on day 90). **Since 2026-09-14 the 30-day deletion runs automatically** (cron `betriebe-aufraeumen`, daily 03:30 UTC, see `docs/backend-befunde-2026-09-14.md`). **The 90-day case** goes through Stripe: the database only deletes cancelled businesses, so the cron `/api/cron/testphasen-beenden` (built 2026-09-14, daily 02:00 UTC) cancels subscriptions paused for more than 90 days, and the database job deletes 30 days after that cancellation. It takes effect once deployed with `CRON_SECRET` set in Vercel; until then, cancel such subscriptions in Stripe by hand.
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
8. **Retention of the records of acceptance (5.2, 15).** Since 2026-09-14 (operator decision): acceptances of the **Terms and DPA** are copied at the time of acceptance into an archive (business name and country, name and email of the person, document, version, language, checksum, time) and kept until the end of the third calendar year after the contract ends (§§ 195, 199 BGB), then purged by the daily job. The employees' privacy-policy acknowledgements are not archived. Please confirm: (a) the 3-year period — Austrian customers' claims can run on different limitation periods; (b) Art. 6(1)(f) / Art. 17(3)(e) as the basis; (c) whether AGB § 6(4) ("deletes the Customer's data") needs a sentence, or whether the provider's own contract evidence is not "Customer's data" in that sense. The AGB were **not** changed.
9. **Retention for accounting records** is given as 8 years for invoices / booking records (§ 147 AO as amended by BEG IV, effective 2025) and 6 years for business letters. Please confirm.
10. **AVV aligned on 2026-09-13:** § 1(4) now separates EU storage from third-country transfers by the Annex 3 sub-processors, and Annex 3 lists Vercel, Resend and WEB.DE. Please check the new § 1(5) (electronic conclusion, confirmation of authority to represent) and whether defining the controller by reference to the customer account is sufficient without a postal address.

### Consequences for the code and the app

- `src/lib/rechtstexte.ts`: `datenschutz` bumped to `2026-09-13-draft`. Managers are asked to confirm again through the consent gate on their next dashboard visit — intended.
- **The app's copy was synced** (2026-09-14) with the 13 Sept text, version `2026-09-13-draft` — **it predates the amendment below and needs another sync.** See "Source of truth" below.

## Amendment 2026-09-14 — acceptance archive and login deletion

Follows the database changes in `docs/backend-befunde-2026-09-14.md` (A1–A4, applied the same day on operator instruction).

| Where | Change |
|---|---|
| 5.2 | New paragraph: Terms/DPA acceptances are copied at the time of acceptance and kept until the end of the third calendar year after the contract ends; privacy-policy acknowledgements are not copied |
| 5.3 | Legal basis for the record of acceptance extended to the defence of legal claims after the contract ends (Art. 17(3)(e)) |
| 15 (table) | One row split in two: Terms/DPA (3 years after contract end) and privacy-policy acknowledgements (until the business is deleted) |
| 15.3, bullet 1 | The deletion no longer includes the Terms/DPA records; reference to 5.2 |
| 15.3, bullet 3 | Before: employees' login accounts remain. Now: every login account (manager or employee) that has no employment in another business left is deleted with the business |

`src/lib/rechtstexte.ts`: `datenschutz` bumped to `2026-09-14-draft`, **built on the r2 text** (billing details, Stripe) that was merged in the same day — the document now carries both changes. Since r2 a new version no longer blocks anyone; managers who accepted before get a notice (`ermittleZustimmungBefund` in `src/lib/zustimmung.ts`). AGB stay at `2026-09-13-r2-draft`, AVV at `2026-09-13-draft`.

**Database aligned with AGB r2 on the same day** (migration `loeschung_a5`): after a paused trial ends without resumption, deletion follows 30 days after that contract end (day 90 + 30, § 5(3) r2), and a written export request holds the deletion via `private.loeschsperre` until the data has been provided and 14 days have passed (§ 6(4) r2). **Operator task:** when an export request arrives by email, add a row there (`betrieb_id`, `bis` = provision date + 14 days, a reason without personal data).
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
| 6 | Export promised (AGB § 6(4)), none exists; Data Act | **Reworded 2026-09-13, function still open.** § 6(4)/(5) now promise export *on request* (CSV/JSON, within 30 days, free) plus a short Data Act clause — deliverable by hand today. A download button remains planned; once it exists, § 6(4) already allows referring to it. |
| 7 | AGB clauses (price changes, change by silence, indemnity "auf erstes Anfordern", force majeure for sub-suppliers, backup duty) | **Reworded 2026-09-13** (see "Terms 2026-09-13" below). Lawyer review still required. |
| 8 | Security promises vs. production; Next.js 15.5.22 | **Next.js updated to 15.5.25** (includes the 25 Aug 2026 fixes). RLS: enabled on every public table (checked 2026-09-13; `konto_merge_token` has RLS without policies, i.e. deny-all, intended). Backups: Supabase plan is Pro, daily backups kept 7 days. **2FA cannot be verified from here** — see checklist. |

### Operator checklist before go-live

1. **Phone number** in the Impressum: done on 2026-09-13; make sure it is actually answered.
2. **Conclude the DPAs** the documents now assert: Supabase (sign in the dashboard), Vercel, Resend, Expo (650 Industries — request DPA incl. SCCs), and clarify WEB.DE. A free WEB.DE mailbox may not offer a DPA; a business mailbox on the own domain would solve that and look more professional.
3. **Vercel plan:** the Hobby plan is for non-commercial, personal use only (Vercel fair-use guidelines). A paid SaaS needs Pro. Set the function region to `dub1` (Dublin, next to the Supabase database): Project → Settings → Functions → Function Regions, then redeploy.
4. **Stripe customer portal:** save a configuration in the Stripe dashboard (test **and** live): Settings → Billing → Customer portal. Enable "cancel at end of billing period", payment-method updates and invoice history; add links to `/agb` and `/datenschutz`. Without it, "Abo verwalten" shows an error and points to e-mail.
5. **Invoices / tax:** since 2026-09-13 the Stripe customer carries business name and country, Austrian businesses can enter their UID in step 2, and every subscription runs with Stripe Tax (`automatic_tax`). Still needed in the Stripe dashboard: a **tax registration for Germany** (the live account had none on 2026-09-13, so 0 % would be charged) and the OSS decision for Austrian customers without UID — with the tax adviser. Reverse-charge invoices need the customer's full address; enable address and tax-ID editing in the customer portal so customers can complete it.
6. **2FA** on every admin account: Supabase organisation, Vercel, Stripe, Resend, GitHub, Expo, the domain registrar.
7. **Hosting ambiguity:** the repo still contains `netlify.toml`, and the comments in `next.config.ts` describe Netlify. That misled the reviewer. Remove it if Netlify is not used.

## Terms 2026-09-13 — what changed and why

Full review of the AGB against the live flow (Stripe trial, dashboard,
consent gate, account deletion). Section and paragraph numbers that other
documents or the code cite — § 1(3), § 1(4), § 6(2), § 6(4), § 7(3), § 10,
§ 14(6) — are unchanged. `src/lib/rechtstexte.ts`: `agb` bumped to
`2026-09-13-draft`, so managers confirm again through the consent gate.

### Operator decisions (2026-09-13)

1. **Non-payment ends the contract.** Failed debit → retried within 14 days →
   still unpaid 14 days after the due date → contract ends at the end of the
   last paid period, nothing owed for the unpaid period (§ 5(6), § 6(2)).
   Default interest and the "two months in arrears" termination are gone —
   they contradicted "stopping payment ends the contract". A *reversed*
   payment (SEPA chargeback) for a period already used stays owed (§ 5(6),
   § 6(3)); otherwise a chargeback would be a free month.
2. **Export on request** (§ 6(4)/(5)), see finding 6.
3. **Changes to the Terms need active consent** (§ 13). Silence no longer
   counts. Without consent the old terms continue; the Provider may terminate
   at the end of the billing period in which the change was due. Price
   changes keep their own rule (§ 5(7): 6 weeks' notice, customer may cancel).
4. **Plan limits are contractual** (§ 2(6)): exceeding the employee limit
   other than temporarily → request to upgrade → otherwise termination at
   period end. Nothing is blocked technically, no back-charging.

### Other corrections

| Clause | Before | Now |
|---|---|---|
| § 5(2)/(3), § 6 | No trial period anywhere; "use is subject to a charge" | Free trial starts with the plan choice; without a card the subscription is suspended, management may be blocked, 90 days to resume, then contract ends and data is deleted (matches privacy policy 15.3) |
| § 3(2)/(3) | "binding offer by order, contract on confirmation or activation" | Registration is the offer; contract when the business is created after e-mail confirmation; person registering warrants authority to represent (matches AVV § 1(5) and the checkbox) |
| § 6(2) | "function in the Service or at the payment provider" | Names the dashboard function (customer portal); self-deletion of the sole manager = immediate termination (matches `/kontoloeschung`) |
| § 4(4), § 7(5), § 10(4) | Customer had to back up "by regular export" — no export exists; data-loss liability hinged on that | Provider backs up daily (AVV Annex 2); customer only keeps what it needs outside the Service; slight-negligence liability limited to restoring from backup |
| § 4(1), § 11 | Sub-supplier failures excluded / counted as force majeure | Only if the sub-supplier failure is itself force majeure (providers are vicarious agents, § 278 BGB) |
| § 4(3) | "Response times depend on the plan" — no plan defines any | Reasonable period; fixed times only if stated or agreed |
| § 7(4) | Indemnity "auf erstes Anfordern" (likely invalid in standard terms) | Plain indemnity, plus notice / defence / no acknowledgement without consent |
| § 7(2) | § 26 BDSG only (German; doubtful after CJEU C-34/21) | Art. 6/88 GDPR + national rules; works-council rights for DE (§ 87(1) no. 6 BetrVG) and AT (§§ 96, 96a ArbVG) |
| § 7(6) | — | Scheduling aid only: solver proposals are proposals, labour-law compliance stays with the customer, not a working-time recording system |
| § 2(1)/(2)/(5) | "App (iOS, Android, Web)", push listed as a feature | Web app + mobile apps "insofar as published"; solver and roles listed; push only in the mobile apps, handover not delivery owed |
| § 5(5) | — | Electronic invoices (PDF) agreed; customer supplies invoice data incl. VAT ID outside Germany |
| § 10(6) | "Where liability is excluded, claims become time-barred …" | Damages claims 1 year, except § 10(1) cases and fraudulently concealed defects |
| § 14(1) | Double text-form clause (invalid in standard terms) | Individual agreements prevail (§ 305b BGB), otherwise text form |
| § 14(4) | Jurisdiction only for merchants | Also for customers without general jurisdiction in Germany (Austrian customers) |

UI copy adjusted: `plan-auswahl.tsx` and `testphase-abgelaufen/page.tsx`
said "your data is kept" without a limit; they now say 90 days.

### Checklist — these clauses must be true in practice

1. **Stripe → Settings → Billing → Subscriptions and emails:** retry failed
   payments within **14 days**, then **cancel the subscription**; enable the
   customer e-mails for failed payments (§ 5(6) promises both). Test and live.
2. **Deletion jobs:** § 6(4) (30 days after contract end) runs automatically
   since 2026-09-14. § 5(3) (90 days after a suspended trial) is automated by
   the Stripe cron once deployed with `CRON_SECRET` — see "Operator decisions
   recorded on 2026-09-13" above. Access for employees now also ends with the
   contract (§ 6(2)) in the web dashboard; the app still has no such gate.
3. **Export requests by hand** until the download button exists: all tables
   of the business as CSV/JSON within 30 days (§ 6(4)/(5)).
4. **Changing the Terms later (§ 13) — the consent gate does not fit yet:**
   - Bump the version in `rechtstexte.ts` only **on the effective date**,
     after the 6-week offer by e-mail. Bumping earlier blocks managers before
     the change is due.
   - The gate has no "decline" path, and "Abo verwalten" sits behind it; a
     manager who does not consent can only cancel by e-mail. Under § 13(3)
     the old terms keep applying, so blocking management for someone who
     keeps paying is hard to defend. Before the first real change: give the
     gate a way out (decline / cancel link) or let it lapse to a reminder.
   - Terminating a non-consenting customer means cancelling their Stripe
     subscription by hand.
5. **Plan limits (§ 2(6)):** nothing counts employees yet; a request to
   upgrade has to be triggered by hand.
6. **The app's copy** (`QuickTeamMobile/src/lib/legalDocs.ts`, `TERMS_DE` /
   `TERMS_EN`): synced on 2026-09-14, version `2026-09-13-draft`. The Terms
   are unchanged since; the privacy policy is not (see "Amendment 2026-09-14").

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

**This folder is the master copy.** The Expo app (`QuickTeamMobile`) was synced with it on 2026-09-14:

- **Consent gate:** `src/lib/legalDocs.ts` (`PRIVACY_DE` / `PRIVACY_EN`, `TERMS_DE` / `TERMS_EN`) carries the privacy policy and the Terms word for word, with only the Markdown syntax removed (tables become indented lists). Versions in `src/lib/privacyPolicy.ts` / `src/lib/terms.ts` are `2026-09-13-draft`. **Since 2026-09-14 the privacy policy here is `2026-09-14-draft`** — `PRIVACY_DE` / `PRIVACY_EN` and `privacyPolicy.ts` need the amended text and the new version. The button says "I have taken note", since the app concludes no contract.
- **Settings > Legal:** opens `/datenschutz`, `/agb` and `/avv` on this website with `?lang=de|en` (see `src/i18n/sprach-parameter.ts`). The AVV/DPA is not in the app's consent gate; the business concludes it at registration here.
- **Review copies:** `legals/` in the app repo holds byte-identical copies of the six documents in this folder.

**When a document here changes:** re-copy the text into the app's `legalDocs.ts` and bump the app's version constants to match `rechtstexte.ts`. Otherwise the app's consent gate keeps showing the old text.
