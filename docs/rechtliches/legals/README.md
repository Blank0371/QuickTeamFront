# QuickTeam — Legal documents (for review)

Stand-alone, readable copies of QuickTeam's contract documents, exported for legal review. **All are pre-lawyer drafts.**

| File | Document | Language | Status |
|---|---|---|---|
| `AGB-QuickTeam-de.md` | Allgemeine Geschäftsbedingungen (Terms) | German — **legally binding** | Ready for review |
| `Terms-QuickTeam-en.md` | General Terms and Conditions | English — convenience translation | Ready for review |
| `AVV-QuickTeam-de.md` | Auftragsverarbeitungsvertrag (Art. 28 GDPR) | German — **legally binding** | Ready for review, incl. 3 annexes |
| `DPA-QuickTeam-en.md` | Data Processing Agreement | English — convenience translation | Ready for review, incl. 3 annexes |
| `datenschutzerklaerung-de.md` | Datenschutzerklärung (Privacy Policy) | German — **legally binding** | Signed 9 Sept 2026 |
| `privacy-policy-en.md` | Privacy Policy | English — convenience translation | Signed 9 Sept 2026 |

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

- **Privacy policy:** an existing privacy policy lives in the app; it should be cross-checked against this AVV/DPA (especially the US push-notification transfers and the Stripe/DPF wording).
- **Execute the provider DPAs/SCCs:** confirm the Expo (and Apple/Google) data-processing terms / SCCs are actually accepted before go-live. Annex 3 of the AVV/DPA names DPF and the EU SCCs as the transfer basis for the US push services, so the published documents already assert something that has to be true at launch. This obligation used to sit inside the documents themselves as an *Umsetzungshinweis / Implementation note*; it was removed on 2026-09-10 because `/avv` renders them publicly and an internal to-do has no place on a contract page. It lives here now — do not put it back into the documents.
- **App Store note:** these terms assume web/Stripe billing. If digital subscriptions are ever sold *inside* the iOS/Android app, Apple/Google in-app-purchase rules would additionally apply.
- **Impressum:** already exists (per operator) — not managed here.

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
- **`/avv` carries a visible notice** explaining that the `[…]` placeholders are
  customer-specific details completed on conclusion. The acceptance flow itself
  is still open (see below).

The website's soft-launch lock (`SOFT_LAUNCH`) stays **on** while these remain
pre-lawyer drafts.

## Source of truth

The in-app text lives in `src/lib/legalDocs.ts` (constants `TERMS_DE` / `TERMS_EN`), versioned via `TERMS_VERSION` in `src/lib/terms.ts`. **If the wording changes in either place, update the other to match.** The AVV/DPA here are not yet wired into an in-app acceptance flow (see `TERMS_DE` § 7(3) / Section 7(3), which assumes the customer concludes the AVV at registration).
