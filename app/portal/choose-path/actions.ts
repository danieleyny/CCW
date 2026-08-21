"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { hasPaidPackage } from "@/lib/packages"
import { autoAssignConciergeAgent } from "@/lib/concierge/assign"
import { matchAccessCode } from "@/lib/access-codes"
import { startCheckout, type EnrollResult } from "@/app/portal/enroll/actions"

const schema = z.object({
  packageKey: z.enum(["self_guided", "full_concierge"]),
  mode: z.enum(["full", "deposit"]),
})

/**
 * CONCIERGE Phase 1 — the post-intake fork. Selecting a path (1) records the
 * experience switch on the case, then (2) hands straight off to the existing
 * checkout so there's ONE payment machine and one price source (the DB package,
 * never hardcoded). Self-Guided and Full Concierge are the same purchase flow at
 * two prices; only `service_mode` diverges the experience afterward.
 *
 * The choice is reversible until paid — re-picking overwrites `service_mode`.
 */
export async function choosePath(_prev: EnrollResult, formData: FormData): Promise<EnrollResult> {
  await requireRole(["client"])
  const parsed = schema.safeParse({
    packageKey: formData.get("packageKey"),
    mode: formData.get("mode") ?? "full",
  })
  if (!parsed.success) return { error: "Please choose a path." }
  const { packageKey } = parsed.data

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }

  const serviceMode = packageKey === "full_concierge" ? "concierge" : "self_guided"

  // Service-role justified: `cases` is staff-managed (cases_update RLS is
  // is_staff_or_admin only). This is a client-initiated write of a server-derived
  // experience switch to their OWN case, gated by requireRole + getMyCase
  // ownership above — the same convention startCheckout uses for payments.
  const admin = createAdminClient()
  await admin.from("cases").update({ service_mode: serviceMode }).eq("id", myCase.id)

  await logActivity({
    action: "case.path_selected",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
    detail: { service_mode: serviceMode, package: packageKey },
  })

  // Self-Guided: straight to intake, low-friction — they pay when ready (the
  // portal's soft enroll nudge). Full Concierge: pay first ($1,000), then the
  // paid dashboard opens — and they NEVER see intake (we fill it out for them).
  if (serviceMode === "self_guided") {
    redirect("/portal/intake")
  }

  // Concierge → the existing checkout (Stripe → Checkout redirect on success,
  // whose success_url routes a paid concierge case to /portal/concierge;
  // Stripe-off / custom price → recorded invoice-request fallback).
  return startCheckout(_prev, formData)
}

// ── ACCESS CODES · Phase 1 — comp-code redemption ────────────────────────────
const redeemSchema = z.object({
  packageKey: z.enum(["self_guided", "full_concierge"]),
  code: z.string().min(1).max(64),
})

export type RedeemResult = { error?: string; ok?: boolean }

/**
 * Redeem a comp/access code: unlock a package without payment by writing a paid
 * $0 payments row (mirrors recordOfflinePayment), so every hasPaidPackage()
 * surface unlocks by itself. Security lives HERE, server-side: the codes never
 * reach the browser, the check is timing-safe, every attempt is rate-limited and
 * logged, and failure is ONE generic message (never an oracle). It substitutes
 * for PAYMENT and nothing else — the agreements/QA gates and every requirement
 * still apply.
 */
export async function redeemAccessCode(_prev: RedeemResult, formData: FormData): Promise<RedeemResult> {
  await requireRole(["client"])

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }

  // Rate limit FIRST, on both IP and case — IP alone rotates, case alone multiplies.
  const ip = clientIpFrom(await headers())
  if (!rateLimit(`access-code:${ip}`, 5, 10 * 60_000)) {
    return { error: "Too many attempts. Try again shortly." }
  }
  if (!rateLimit(`access-code-case:${myCase.id}`, 5, 10 * 60_000)) {
    return { error: "Too many attempts. Try again shortly." }
  }

  const parsed = redeemSchema.safeParse({
    packageKey: formData.get("packageKey"),
    code: formData.get("code"),
  })
  if (!parsed.success) return { error: "That code isn't valid." }
  const { packageKey, code } = parsed.data

  const matched = matchAccessCode(code, packageKey)
  if (!matched) {
    // Log the failure — with the input length only, never the raw attempt.
    await logActivity({
      action: "access_code.rejected",
      caseId: myCase.id,
      clientId: myCase.client_id,
      entity: "case",
      entityId: myCase.id,
      detail: { package: packageKey, ip },
    })
    return { error: "That code isn't valid." }
  }

  const admin = createAdminClient()

  // One redemption per case — if already unlocked, don't write a second row.
  if (await hasPaidPackage(admin, myCase.id, packageKey)) {
    return { error: "You already have access." }
  }

  const serviceMode = packageKey === "full_concierge" ? "concierge" : "self_guided"

  // The paid $0 row — same shape as recordOfflinePayment. $0 + the explicit
  // description means a comp can never be mistaken for revenue.
  const { error: payErr } = await admin.from("payments").insert({
    case_id: myCase.id,
    client_id: myCase.client_id,
    amount_cents: 0,
    type: "full",
    status: "paid",
    paid_at: new Date().toISOString(),
    package_key: packageKey,
    description: `Access code redeemed (${matched.label}) — comped, no payment collected`,
  })
  if (payErr) return { error: "Couldn't apply that code. Try again." }

  await admin
    .from("cases")
    .update({ service_mode: serviceMode, ...(matched.flavor === "demo" ? { is_demo: true } : {}) })
    .eq("id", myCase.id)

  if (packageKey === "full_concierge") {
    await autoAssignConciergeAgent(admin, myCase.id)
  }

  await logActivity({
    action: "access_code.redeemed",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
    detail: { code_label: matched.label, package: packageKey, flavor: matched.flavor, ip },
  })

  // Land exactly where a paying customer lands.
  redirect(serviceMode === "concierge" ? "/portal/concierge" : "/portal/intake")
}
