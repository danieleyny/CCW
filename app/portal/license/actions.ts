"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { authExpiresOn, inspectionDueAt, REPORT_KINDS, RENEWAL_RUNWAY_DAYS } from "@/lib/license"
import { openRenewalForClient } from "@/lib/renewals"
import { daysUntil } from "@/lib/format"

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * PART C / Phase 10 — the applicant starts their own renewal in one click.
 *
 * Only inside the renewal runway (T-9 months): starting earlier is pointless
 * because the 2-hour live-fire refresher must be dated within 6 months of the
 * renewal. Idempotent via openRenewalForClient — a second click, or the cron
 * getting there first, returns the existing renewal instead of a duplicate.
 */
export async function startMyRenewal(): Promise<{ ok?: boolean; error?: string }> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("license_expires_on, stage, clients(full_name)")
    .eq("id", myCase.id)
    .single()

  if (kase?.stage !== "licensed" || !kase.license_expires_on) {
    return { error: "Renewals open once your current license is issued." }
  }
  const daysLeft = daysUntil(kase.license_expires_on)
  if (daysLeft != null && daysLeft > RENEWAL_RUNWAY_DAYS) {
    return { error: "You're not in the renewal window yet — we'll let you know when it opens." }
  }

  // Service-role justified: opening a renewal writes a new case + staff task
  // with server-derived values, after requireRole + ownership.
  const res = await openRenewalForClient(createAdminClient(), {
    clientId: myCase.client_id,
    fullName: (kase.clients as unknown as { full_name: string } | null)?.full_name,
    expiresOn: kase.license_expires_on,
    source: "applicant",
  })

  await logActivity({
    action: "renewal.started_by_applicant",
    caseId: myCase.id,
    clientId: myCase.client_id,
    detail: { renewal_case: res.renewalCaseId, already_open: res.alreadyOpen },
  })
  revalidatePath("/portal/license")
  return { ok: true }
}

/** Log a purchase authorization the NYPD issued (starts the 30-day clock). */
export async function logAuthorization(formData: FormData): Promise<{ error?: string }> {
  await requireRole(["client"])
  const parsed = z
    .object({ authorizedOn: isoDay, handgunDesc: z.string().max(300).optional().or(z.literal("")) })
    .safeParse({ authorizedOn: formData.get("authorizedOn"), handgunDesc: formData.get("handgunDesc") ?? "" })
  if (!parsed.success) return { error: "Enter the authorization date." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const supabase = await createClient()
  const { error } = await supabase.from("purchase_authorizations").insert({
    case_id: myCase.id,
    client_id: myCase.client_id,
    authorized_on: parsed.data.authorizedOn,
    expires_on: authExpiresOn(parsed.data.authorizedOn),
    handgun_desc: parsed.data.handgunDesc || null,
  })
  if (error) return { error: error.message }

  await logActivity({ action: "license.authorization_logged", caseId: myCase.id, entity: "purchase_authorization" })
  revalidatePath("/portal/license")
  return {}
}

/** Log the purchase itself (starts the 72-hour inspection + 90-day clocks). */
export async function logPurchase(formData: FormData): Promise<{ error?: string }> {
  await requireRole(["client"])
  const parsed = z
    .object({ authId: z.string().uuid(), acquiredOn: isoDay })
    .safeParse({ authId: formData.get("authId"), acquiredOn: formData.get("acquiredOn") })
  if (!parsed.success) return { error: "Enter the purchase date." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("purchase_authorizations")
    .update({
      acquired_on: parsed.data.acquiredOn,
      inspection_due: inspectionDueAt(parsed.data.acquiredOn),
    })
    .eq("id", parsed.data.authId)
    .eq("case_id", myCase.id)
  if (error) return { error: error.message }

  await logActivity({
    action: "license.purchase_logged",
    caseId: myCase.id,
    entity: "purchase_authorization",
    entityId: parsed.data.authId,
  })
  revalidatePath("/portal/license")
  return {}
}

/** Mark the 72-hour inspection done. */
export async function markInspected(formData: FormData): Promise<{ error?: string }> {
  await requireRole(["client"])
  const authId = String(formData.get("authId") ?? "")
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("purchase_authorizations")
    .update({ inspected_on: new Date().toISOString().slice(0, 10) })
    .eq("id", authId)
    .eq("case_id", myCase.id)
  if (error) return { error: error.message }

  await logActivity({ action: "license.inspection_done", caseId: myCase.id, entity: "purchase_authorization", entityId: authId })
  revalidatePath("/portal/license")
  return {}
}

/** § 5-24 guided report: recorded, staff tasked, audit-logged. */
export async function submitLicenseReport(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireRole(["client"])
  const parsed = z
    .object({
      kind: z.enum(REPORT_KINDS.map((k) => k.key) as [string, ...string[]]),
      details: z.string().min(10, "Describe what changed (a sentence or two).").max(4000),
    })
    .safeParse({ kind: formData.get("kind"), details: formData.get("details") })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const supabase = await createClient()
  const { data: report, error } = await supabase
    .from("license_reports")
    .insert({
      case_id: myCase.id,
      client_id: myCase.client_id,
      kind: parsed.data.kind,
      details: parsed.data.details,
    })
    .select("id")
    .single()
  if (error) return { error: error.message }

  const label = REPORT_KINDS.find((k) => k.key === parsed.data.kind)?.label ?? parsed.data.kind
  // Service-role justified: tasks RLS is staff-write-only; this is a system
  // notification with server-derived values after requireRole + ownership.
  await createAdminClient().from("tasks").insert({
    case_id: myCase.id,
    title: `§5-24 report: ${label}`,
    description: "Client filed a reporting-duty update — review and walk them through the NYPD reporting step.",
    priority: 1,
    status: "open",
  })

  await logActivity({
    action: "license.report_filed",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "license_report",
    entityId: report.id,
    detail: { kind: parsed.data.kind },
  })
  revalidatePath("/portal/license")
  return { ok: true }
}
