# Sensitive data inventory

What Gun License NYC actually holds, where it lives, and what happens to it on
an erasure request. This document exists **before** the erasure code on purpose:
the failure mode it prevents is writing a scrubber from memory and missing a
copy.

Compiled by reading the migrations, not by recollection. Each row names the file
that defines it.

---

## ⚠️ Read this first: disclosure narratives exist in five places

An applicant's written account of an arrest, order of protection, domestic
incident, or mental-health question is the most sensitive text in the system. It
is **not** stored once:

| # | Location | Shape |
|---|---|---|
| 1 | `disclosures.narrative` | the typed column, one row per disclosure |
| 2 | `intake_sessions.answers` | jsonb — the whole wizard payload, narratives included |
| 3 | `requirement_answers.answers` | jsonb — questionnaire answers per req_code |
| 4 | `license_reports.details` | free text; §5-24 post-issuance reports |
| 5 | the `documents` storage bucket | **rendered into the PDF bytes** by the document engine |

Any scrub that targets only #1 is theater — the story survives in four other
places, one of which is a file. `lib/privacy/erase.ts` must hit all five, and
its tests assert all five.

---

## Tables

| Table | Sensitive columns | Defined in | Class | On erasure |
|---|---|---|---|---|
| `disclosures` | `narrative`, `parties` (third-party names), `disposition`, `jurisdiction_text`, `occurred_on`, `type` | `20260628000300_intake_disclosure.sql` | **Criminal history** | Purge rows |
| `intake_sessions` | `answers` jsonb (entire wizard) | `20260628000300` | **Criminal history** | Purge row |
| `requirement_answers` | `answers` jsonb | `20260718000500_document_engine.sql` | **Criminal history** | Purge rows |
| `license_reports` | `details`; `kind` includes `psychiatric_treatment`, `substance_treatment`, `arrest_or_summons`, `order_of_protection`, `erpo` | `20260713000700_revenue_lifecycle.sql` | **Health + criminal** | Purge rows |
| `case_notes` | `body` — unbounded staff prose about the applicant | `20260713000500_consultant_cockpit.sql` | **Staff assessment** | Purge rows |
| `documents` + storage bytes | `file_path`, `file_name`, `review_notes`; types include `safe_photo_open/closed` (interior of a home), `arrest_statement`, `order_of_protection_copy` | `20260608194250`, `20260718000500` | **Mixed, incl. criminal** | Purge rows **and** storage objects |
| `clients` | `full_name`, `email`, `phone`, `borough`, `zip`, `lat`, `lng`, `home_geog`, `eligibility` jsonb | `20260608194250`, `20260718000200_client_location.sql` | **Identity + precise location** | Purge/anonymize |
| `cohabitants` | `name`, `relationship`, `contact_email`, `answers` jsonb, `token` | `20260608194250`, `20260628001200`, `20260713000200` | **Third-party PII** | Purge rows |
| `character_references` + `reference_requests` | `name`, `contact_email`, `contact_phone`, `is_family`, `answers` jsonb | `20260608194250`, `20260628000700`, `20260628001100` | **Third-party PII** | Purge rows |
| `signatures` | `png_base64` (handwritten signature image), `ip`, `user_agent`, `consent_text` | `20260628001300_signatures.sql`, `20260718000600` | **Biometric-adjacent** | Delete image; null `ip`/`user_agent` |
| `signature_events` | `ip`, `user_agent`, `document_sha256`, `consent_text`, `signed_at` | `20260718000600_signing_audit_and_evidence.sql` | **Legal evidence** | **Retained — minimized only.** See below |
| `purchase_authorizations` | `handgun_desc` tied to a named person at a known geopoint | `20260713000700` | **Physical-safety risk** | Purge rows |
| `messages` | `body` | `20260718000400` | Correspondence | Purge rows |
| `cases` | `nypd_app_ref`, `license_expires_on`, stage history | `20260608194250` | Government identifier | Purge/anonymize |
| `activity_log` | `detail` jsonb | `20260608194251` | Audit | Cascades with case — see below |
| `profiles` | `full_name`, `phone` | `20260608194250` | Identity | Out of case scope |
| `subscribers` | `email` | law-watch funnel | Marketing | Separate unsubscribe path |

### Storage

One bucket, `documents`, **private** (`20260608194252_storage_documents.sql`).
Path convention `clients/<client_id>/<document_id>/<filename>`; all four policies
gate on `client_visible(storage_doc_client_id(name))`, which fails closed on a
malformed path.

---

## Two documented positions

These are the places where "delete everything" is the wrong answer, and saying
so plainly is better than a silent partial delete.

### 1. `signature_events` is retained, not deleted

The table was deliberately built append-only — `grant select, insert` only, no
update or delete — to establish an ESIGN/UETA evidence trail for documents the
applicant signed. Destroying it on request would dismantle the evidence that a
signature was validly obtained, which is a record we have an independent reason
to keep (15 U.S.C. §7001(d)).

So it is **minimized rather than erased**:

- **Nulled:** `ip`, `user_agent` — identifying, and not what makes the record
  evidentiary.
- **Kept:** `document_sha256`, `consent_text`, `signed_at`, `signer_key` — the
  binding itself, which contains no personal narrative.
- `signatures.png_base64` **is deleted** — a handwritten signature image is
  biometric-adjacent personal data, and the hash binding, not the picture, is
  what proves the signing.

This is disclosed to the applicant in the deletion-request copy. We do not tell
someone their data is gone when part of it is retained.

### 2. `activity_log` cannot be the record of its own erasure

`activity_log.case_id` and `.client_id` are both `on delete cascade`, so deleting
a case destroys the log entries describing it — exactly backwards for a record
that must outlive the thing it documents. `logActivity()` is also best-effort by
design (`lib/activity.ts` swallows errors so logging never breaks a mutation),
which is fine for a stage change and unacceptable as the sole record of an
irreversible act.

Erasures therefore write to **`data_erasure_log`**, which holds plain `uuid`
columns rather than foreign keys — deliberately un-referenced, so nothing
cascades it away — and is granted `select, insert` only. `recordErasure()`
inserts directly and **throws** on failure rather than swallowing.

---

## Encryption at rest — assessed, and deliberately not added

Supabase already provides AES-256 at rest for both the Postgres volume and
Storage, TLS in transit, and encrypted PITR backups.

Column-level encryption (pgcrypto) was evaluated and **rejected**: it does not
defend against the threat that actually matters here. A leaked service-role key
or an RLS hole reads plaintext either way, because the application must be able
to decrypt what it renders into documents. Meanwhile it would break real things:

- `lib/qa-gate.ts` checks `narrative.trim().length < 20` to enforce candor — on
  ciphertext that check silently passes garbage.
- `lib/forms/documents.ts` and the document engine read narratives directly to
  render them.
- The RLS test suite could no longer assert on content.

**Done instead**, in order of actual risk reduced:

1. Stop the duplication — the narrative in `intake_sessions.answers` is redundant
   once `disclosures` rows exist.
2. Short-lived signed URLs for document bytes rather than hour-long ones.
3. Supabase Vault for true secrets.

If counsel requires column encryption regardless, scope it to
`disclosures.narrative` alone with the key in Vault, and add a `narrative_len`
integer so the candor gate keeps working.

---

## Retention

⚖ **No retention window is set, and none is guessed.** Retention obligations for
firearms-licensing records may include statutory *minimums* as well as maximums,
and that is counsel's determination.

`retention_policies` exists so the window is a data edit rather than a deploy —
the same reason the `fees` table exists. Every policy ships `enabled = false`
with `retain_days = null`, and `runRetention()` additionally refuses to act
unless a policy is both enabled and has a window. Two independent offs.

Nothing is deleted on a timer until someone with authority sets that number.
