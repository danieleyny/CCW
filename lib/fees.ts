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
// NYPD License Division on the NYPD portal, and the fingerprint fee to the
// DCJS-approved vendor (IDEMIA/IdentoGO) at the appointment. Taking either —
// even as a pass-through — would put us in the position NYPD reserves for the
// applicant. Our own service fee (Stripe / enroll) is a separate thing entirely.
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
  /** Accepted payment methods, per the agency/vendor. */
  how: string[]
  /** Waived for this applicant (retired law enforcement). */
  waived?: boolean
  waivedReason?: string
  /**
   * The fingerprint fee is set by the vendor and drifts (our schedule and NYPD's
   * public page have disagreed). Show the number we have and tell them to
   * confirm it — quietly confident and wrong is the failure mode here.
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
      // Collected by the DCJS-approved vendor at the appointment, not by NYPD.
      payTo: "IDEMIA / IdentoGO — the DCJS-approved fingerprint vendor",
      when: "At your fingerprint appointment",
      how: ["Credit card, check, or money order payable to IDEMIA"],
      caveat: "Confirm the exact amount when you book — the vendor sets it and it changes.",
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
 * Fingerprint scheduling. The NY DCJS service code for NYPD handgun licensing is
 * NOT published on the NYPD required-documents checklist or on IdentoGO's public
 * lookup, and the codes that ARE public (15464Z / 15465F) are for DCJS record
 * reviews — a different service. Printing one of those, or inventing a code,
 * would send someone to the wrong appointment and cost them a reprint and
 * another fee. So we link to the lookup and say where the real code comes from.
 */
export const FINGERPRINT_SCHEDULING = {
  vendor: "IDEMIA / IdentoGO",
  lookupUrl: "https://uenroll.identogo.com/service-code-lookup",
  schedulingUrl: "https://uenroll.identogo.com",
  phone: "(877) 472-6915",
  serviceCodeNote:
    "Your NYPD application instructions give the exact NY DCJS service code to use — enter that code at IdentoGO, or call and tell them it's for an NYPD handgun license. Don't guess a code: the wrong one means being reprinted and paying again.",
  bring: [
    "Your government photo ID",
    "The fingerprint fee, in a method IDEMIA accepts",
    "Your appointment confirmation and the service code from your NYPD instructions",
  ],
} as const
