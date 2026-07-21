/**
 * V4-A4f — government fees live in the `fees` table (admin-writable), so a fee
 * change is a data edit, not a redeploy. Everything customer-facing that quotes
 * "$340" / "$88.25" now reads from here. No `server-only` so scripts and the
 * verify harness can read it too.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export interface Fees {
  /** e.g. "$340" (whole dollars trimmed) */
  applicationFee: string
  /** e.g. "$88.25" */
  fingerprintFee: string
  /** application + fingerprint, e.g. "$428.25" */
  combined: string
  applicationCents: number
  fingerprintCents: number
}

// Sensible fallbacks if the table is unreachable — matches the seeded values,
// so a page never renders a blank fee. The DB remains the source of truth.
const FALLBACK = { nypd_application: 34000, dcjs_fingerprint: 8825 }

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`
}

export async function getFees(db: DB): Promise<Fees> {
  const { data } = await db.from("fees").select("key, amount_cents").eq("active", true)
  const byKey = new Map((data ?? []).map((f) => [f.key, f.amount_cents]))
  const applicationCents = byKey.get("nypd_application") ?? FALLBACK.nypd_application
  const fingerprintCents = byKey.get("dcjs_fingerprint") ?? FALLBACK.dcjs_fingerprint
  return {
    applicationFee: usd(applicationCents),
    fingerprintFee: usd(fingerprintCents),
    combined: usd(applicationCents + fingerprintCents),
    applicationCents,
    fingerprintCents,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZED FEE READINESS
//
// WE NEVER COLLECT THESE. The application fee is paid by the applicant to the
// NYPD License Division on the NYPD portal, and the fingerprint fee to the NYPD
// License Division IN PERSON at the appointment NYPD schedules after reviewing
// the documents — there is no third-party vendor for this license type. Taking
// either — even as a pass-through — would put us in the position NYPD reserves
// for the applicant. Our own service fee (Stripe / enroll) is a separate thing.
//
// What we CAN do is make the money part unambiguous: exactly what this person
// owes given their situation, to whom, when, and how it can be paid.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeeLineItem {
  key: "nypd_application" | "dcjs_fingerprint"
  label: string
  amountCents: number
  /** Formatted for display, e.g. "$340". */
  amount: string
  /** Who this is actually paid to — never us. */
  payTo: string
  /** When it comes due. */
  when: string
  /** Accepted payment methods, per the NYPD License Division. */
  how: string[]
  /** Waived for this applicant (retired law enforcement). */
  waived?: boolean
  waivedReason?: string
  /**
   * The fingerprint fee amount can drift (our schedule and NYPD's public page
   * have disagreed). Show the number we have and tell them to confirm it —
   * quietly confident and wrong is the failure mode here.
   */
  caveat?: string
}

export interface FeeSummary {
  items: FeeLineItem[]
  /** What they will actually pay, after any waiver. */
  totalCents: number
  total: string
  /** True when a line was waived, so the UI can call that out — it's a $340 swing. */
  hasWaiver: boolean
  nonRefundable: string
}

export interface FeeContext {
  isRetiredLeo?: boolean | null
  isRenewal?: boolean | null
}

/**
 * The applicant's own fee picture.
 *
 * Amounts come from the `fees` table every time — an admin fee edit flows
 * straight through to the checklist, the fee sheet and the reminders, with no
 * redeploy and no hardcoded dollar value anywhere in the UI.
 */
export async function computeFeeSummary(db: DB, ctx: FeeContext = {}): Promise<FeeSummary> {
  const { data } = await db.from("fees").select("key, amount_cents, label, payee").eq("active", true)
  const rows = new Map((data ?? []).map((f) => [f.key, f]))

  const applicationCents = rows.get("nypd_application")?.amount_cents ?? FALLBACK.nypd_application
  const fingerprintCents = rows.get("dcjs_fingerprint")?.amount_cents ?? FALLBACK.dcjs_fingerprint

  // Retired law enforcement: the APPLICATION fee is waived, the fingerprint fee
  // is not. People in this group routinely don't know the waiver applies to them.
  const leoWaived = !!ctx.isRetiredLeo
  const leoRow = rows.get("retired_leo_application")
  const applicationOwed = leoWaived ? (leoRow?.amount_cents ?? 0) : applicationCents

  const items: FeeLineItem[] = [
    {
      key: "nypd_application",
      label: rows.get("nypd_application")?.label ?? "NYPD License Division application fee",
      amountCents: applicationOwed,
      amount: usd(applicationOwed),
      payTo: rows.get("nypd_application")?.payee ?? "NYPD License Division",
      // Renewals pay the same amount as new applications.
      when: ctx.isRenewal
        ? "When you submit your renewal on the NYPD portal"
        : "When you submit your application on the NYPD portal",
      how: [
        "Credit card on the NYPD portal, or",
        "Two U.S. Postal or bank money orders payable to “New York City Police Department”",
        "No cash and no personal checks",
      ],
      waived: leoWaived,
      waivedReason: leoWaived ? "Waived — retired law enforcement" : undefined,
    },
    {
      key: "dcjs_fingerprint",
      label: rows.get("dcjs_fingerprint")?.label ?? "Fingerprint fee",
      amountCents: fingerprintCents,
      amount: usd(fingerprintCents),
      // Collected by the NYPD License Division IN PERSON at the fingerprinting
      // appointment NYPD schedules — no third-party vendor for this license type.
      payTo: "NYPD License Division — at your in-person fingerprinting appointment",
      when: "When NYPD schedules you to be fingerprinted in person, after your documents are reviewed",
      how: [
        "Money order payable to “New York City Police Department”, or",
        "Credit or debit card",
        "No cash and no personal checks",
      ],
      caveat: "Confirm the exact amount when NYPD schedules you — it can change.",
    },
  ]

  const totalCents = items.reduce((sum, i) => sum + i.amountCents, 0)
  return {
    items,
    totalCents,
    total: usd(totalCents),
    hasWaiver: leoWaived,
    nonRefundable: "Both fees are non-refundable, whatever the outcome of your application.",
  }
}

/**
 * Fingerprinting for an NYPD handgun license is done IN PERSON at the NYPD
 * License Division. NYPD contacts the applicant to schedule it after the
 * documents are reviewed, and collects the fingerprint fee there. There is NO
 * third-party vendor, NO IdentoGO/IDEMIA, and NO DCJS service code for this
 * license type — that's a different NY process. The applicant should not go
 * hunting for a code or a vendor location.
 * Source: NYPD License Division "New Application Instructions", steps 3 & 9
 * (licensing.nypdonline.org/new-app-instruction).
 */
export const FINGERPRINT_SCHEDULING = {
  scheduledBy: "the NYPD License Division",
  location: "the NYPD License Division (One Police Plaza, Manhattan)",
  instructionsUrl: "https://licensing.nypdonline.org/new-app-instruction",
  process:
    "You don't book this yourself, and there's no service code to find. After you submit your application and upload your documents on the NYPD portal, the NYPD License Division contacts you to schedule an in-person appointment to be fingerprinted and pay your fees.",
  bring: [
    "Originals of every document you uploaded with your application",
    "Your government-issued photo ID",
    "The fingerprint fee — money order payable to the New York City Police Department, or a credit/debit card (no cash, no personal checks)",
  ],
} as const
