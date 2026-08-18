"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { notifyClient } from "@/lib/email"
import { notifyCaseParties } from "@/lib/notify"
import { reviewUrl } from "@/lib/review"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { sendBookingInvites } from "@/lib/calendar/invites"
import { getStripe } from "@/lib/stripe"
import { findOrCreateCustomer, createAndSendInvoice } from "@/lib/stripe/invoicing"
import { STAGE_KEYS, stageMeta, stageIndex, type CaseStageKey } from "@/config/stages"
import { materializeCaseRequirements } from "@/lib/requirements/materialize"
import { actionFor } from "@/lib/requirements/actions"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import {
  BOROUGHS,
  CLIENT_TRACKS,
} from "@/config/stages"

// ── stage changes (pipeline drag + case file) ────────────────────────────────
export type StageChangeResult = { ok: true } | { ok: false; blockers: string[] }

/**
 * V3-P2.4 / V4-A1 — the CP-5 gate lives HERE, server-side: a case cannot be
 * dragged into application_assembled OR ANY LATER STAGE until every blocking
 * requirement is satisfied, every disclosure is narrated, training is current,
 * the reference count is met, the application photo meets spec, and a named
 * staff member has signed off. Failing returns the specific blocker list,
 * never a generic error.
 */
export async function setCaseStage(caseId: string, stage: CaseStageKey): Promise<StageChangeResult> {
  await requireStaff()
  if (!STAGE_KEYS.includes(stage)) throw new Error("Invalid stage")

  const supabase = await createClient()

  // Gate every stage AT OR PAST application_assembled (index 7) — not just the
  // two named stages. Stages after `filed` (fingerprinting, decision, licensed)
  // must not be a back door around the CP-5 checks.
  if (stageIndex(stage) >= stageIndex("application_assembled")) {
    const gate = await evaluatePreFilingGate(supabase, caseId)
    if (!gate.ok) {
      await logActivity({
        action: "case.stage_blocked",
        caseId,
        entity: "case",
        entityId: caseId,
        detail: { to: stage, blockers: gate.blockers.map((b) => b.kind) },
      })
      return { ok: false, blockers: gate.blockers.map((b) => b.detail) }
    }
  }

  const { data: kase, error } = await supabase
    .from("cases")
    .update({ stage, stage_entered_at: new Date().toISOString() })
    .eq("id", caseId)
    .select("id, client_id, clients(full_name, email)")
    .single()
  if (error) throw error

  await logActivity({
    action: "case.stage_advanced",
    caseId,
    clientId: kase.client_id,
    entity: "case",
    entityId: caseId,
    detail: { to: stage },
  })

  // Notify the client (stubbed until email keys are set).
  const client = kase.clients as unknown as { full_name: string; email: string | null }
  await notifyClient({
    to: client?.email,
    subject: `Your Gun License NYC application moved to: ${stageMeta(stage).label}`,
    body: `Hi ${client?.full_name ?? ""}, your application is now at the "${stageMeta(stage).label}" stage. ${stageMeta(stage).clientHint}`,
  })

  revalidatePath("/admin/pipeline")
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/admin")
  return { ok: true }
}

/**
 * V3-P2.4 — the named-human sign-off. Only grantable when everything else in
 * the gate already passes; recorded on the case and in the activity log.
 */
export async function signPreFilingQa(caseId: string): Promise<StageChangeResult> {
  const { userId, profile } = await requireStaff()
  const supabase = await createClient()

  const gate = await evaluatePreFilingGate(supabase, caseId)
  if (!gate.readyForSignOff) {
    return { ok: false, blockers: gate.blockers.filter((b) => b.kind !== "sign_off_missing").map((b) => b.detail) }
  }

  const { error } = await supabase
    .from("cases")
    .update({ qa_signed_off_by: userId, qa_signed_off_at: new Date().toISOString() })
    .eq("id", caseId)
  if (error) throw error

  await logActivity({
    action: "case.qa_signed_off",
    caseId,
    entity: "case",
    entityId: caseId,
    detail: { by: profile.full_name },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  return { ok: true }
}

/**
 * V4-A2 — record a license as issued. This is the write that was missing:
 * nothing set license_expires_on / county_license_expires_on, so the whole
 * post-issuance lifecycle (portal license card, renewal-runway + county-watcher
 * reminders) read columns nobody filled. Populates all of them + issued-on.
 */
const recordLicenseSchema = z
  .object({
    caseId: z.string().uuid(),
    licenseType: z.string().trim().min(1, "License type is required.").max(120),
    issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date is required."),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date is required."),
    countyLicenseExpiresOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
  })
  .refine((v) => v.expiresOn > v.issuedOn, {
    message: "Expiry must be after the issue date.",
    path: ["expiresOn"],
  })

export async function recordLicenseIssued(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStaff()
  const parsed = recordLicenseSchema.safeParse({
    caseId: formData.get("caseId"),
    licenseType: formData.get("licenseType"),
    issuedOn: formData.get("issuedOn"),
    expiresOn: formData.get("expiresOn"),
    countyLicenseExpiresOn: formData.get("countyLicenseExpiresOn") ?? "",
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the license details." }
  }
  const { caseId, licenseType, issuedOn, expiresOn, countyLicenseExpiresOn } = parsed.data

  const supabase = await createClient()
  const { data: kase, error } = await supabase
    .from("cases")
    .update({
      license_issued_on: issuedOn,
      license_expires_on: expiresOn,
      county_license_expires_on: countyLicenseExpiresOn || null,
      stage: "licensed",
      status: "active",
      stage_entered_at: new Date().toISOString(),
    })
    .eq("id", caseId)
    .select("id, client_id, clients(full_name, email)")
    .single()
  if (error) throw error

  // license_type lives on the client record (the applicant, not the case).
  await supabase.from("clients").update({ license_type: licenseType }).eq("id", kase.client_id)

  await logActivity({
    action: "case.license_issued",
    caseId,
    clientId: kase.client_id,
    entity: "case",
    entityId: caseId,
    detail: { licenseType, issuedOn, expiresOn, countyLicenseExpiresOn: countyLicenseExpiresOn || null },
  })

  const client = kase.clients as unknown as { full_name: string; email: string | null }
  // The one honest moment to ask for a review: the case is licensed. Only when a
  // real review URL is configured (NEXT_PUBLIC_REVIEW_URL) — silent otherwise.
  const review = reviewUrl()
  await notifyClient({
    to: client?.email,
    subject: "Your carry license has been issued",
    body:
      `Hi ${client?.full_name ?? ""}, your ${licenseType} license is recorded as issued ${issuedOn} and valid through ${expiresOn}. Your portal now shows your license details, purchase-authorization clock, and renewal runway.` +
      (review ? `\n\nIf the process went well for you, a short review would mean a lot and helps other New Yorkers find us.` : ""),
    cta: review ? { label: "Leave a review", url: review } : undefined,
  })

  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/portal/license")
  revalidatePath("/portal")
  return { ok: true }
}

/**
 * PART C / Phase 10 — open a renewal for a licensed case's client, on demand.
 * Same idempotent primitive the cron uses; staff can start it without waiting
 * for the 90-day auto-open.
 */
export async function openRenewalNow(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  await requireStaff()
  const caseId = String(formData.get("caseId") ?? "")
  if (!caseId) return { error: "No case." }

  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("client_id, stage, license_expires_on, clients(full_name)")
    .eq("id", caseId)
    .single()
  if (!kase) return { error: "Case not found." }
  if (kase.stage !== "licensed") return { error: "Renewals open from a licensed case." }

  const { openRenewalForClient } = await import("@/lib/renewals")
  const res = await openRenewalForClient(createAdminClient(), {
    clientId: kase.client_id,
    fullName: (kase.clients as unknown as { full_name: string } | null)?.full_name,
    expiresOn: kase.license_expires_on,
    source: "admin",
  })

  await logActivity({
    action: "renewal.opened_by_staff",
    caseId,
    clientId: kase.client_id,
    detail: { renewal_case: res.renewalCaseId, already_open: res.alreadyOpen },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  if (res.renewalCaseId) redirect(`/admin/cases/${res.renewalCaseId}`)
  return { ok: true }
}

/** V3-P2.2 — assign/reassign a case's consultant (there was no UI for this at all). */
export async function reassignCase(formData: FormData) {
  const { profile } = await requireStaff()
  const clientId = String(formData.get("clientId") ?? "")
  const caseId = String(formData.get("caseId") ?? "")
  const staffId = String(formData.get("staffId") ?? "") || null

  const supabase = await createClient()
  const { error } = await supabase.from("clients").update({ assigned_staff: staffId }).eq("id", clientId)
  if (error) throw error

  await logActivity({
    action: "case.reassigned",
    caseId,
    clientId,
    entity: "client",
    entityId: clientId,
    detail: { to: staffId, by: profile.full_name },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/admin/cases")
}

export async function setCaseStatus(caseId: string, status: string) {
  await requireStaff()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cases")
    .update({ status: status as never })
    .eq("id", caseId)
    .select("client_id")
    .single()
  if (error) throw error
  await logActivity({ action: "case.status_changed", caseId, clientId: data.client_id, detail: { status } })
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/admin/pipeline")
}

// ── document review ──────────────────────────────────────────────────────────
export async function reviewDocument(input: {
  documentId: string
  caseId: string
  clientId: string
  status: "approved" | "rejected"
  notes?: string
}) {
  const { profile, userId } = await requireStaff()
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from("documents")
    .update({
      status: input.status,
      review_notes: input.notes ?? null,
      reviewer: userId,
    })
    .eq("id", input.documentId)
    .select("type, req_code, client_id, clients(full_name, email)")
    .single()
  if (error) throw error

  // V3-P2.1 — the review decision drives the requirement (one checklist):
  // approve → matching requirement satisfied + evidence bound; reject → back to
  // pending with the reviewer's note so the client sees what to fix.
  //
  // Match the SAME way the upload bound evidence: by req_code. Matching by
  // document_type is ambiguous when several requirements share a type — the three
  // IDN reqs all map to 'id', and IDN-03's registry document_type is NULL — which
  // both left IDN-03 stuck "In review" after approval AND over-satisfied IDN-01/02.
  // Fall back to document_type only for legacy docs uploaded before req_code existed.
  // Resolve the req_code this document satisfies. Prefer the doc's own req_code;
  // otherwise map its document TYPE to a req_code the SAME way the portal
  // associates uploads — via the action config (actionFor().documentType), NOT
  // the registry requirements.document_type. The registry column is NULL for
  // some reqs (IDN-03), so the old fallback couldn't match them and an approved
  // document was left with its requirement stuck unsatisfied + unbound.
  let targetReqCode: string | null = doc.req_code ?? null
  if (!targetReqCode) {
    const { data: crs } = await supabase
      .from("case_requirements")
      .select("req_code")
      .eq("case_id", input.caseId)
    targetReqCode = (crs ?? []).find((r) => actionFor(r.req_code)?.documentType === doc.type)?.req_code ?? null
  }
  const { data: matchingReqs } = targetReqCode
    ? await supabase
        .from("case_requirements")
        .select("id, status")
        .eq("case_id", input.caseId)
        .eq("req_code", targetReqCode)
    : { data: [] as Array<{ id: string; status: string }> }
  for (const r of matchingReqs ?? []) {
    if (r.status === "na") continue
    await supabase
      .from("case_requirements")
      .update(
        input.status === "approved"
          ? { status: "satisfied", document_id: input.documentId, reviewer: userId }
          : {
              // PRIVACY: case_requirements.notes is the one field an ENGAGED
              // INSTRUCTOR can read. Never put reviewer prose here — a rejection
              // reason can quote disclosure/arrest content. The detailed reason
              // is already stored on documents.review_notes (instructor-invisible)
              // and is what the applicant sees on their upload.
              status: "pending",
              notes: "Document rejected — awaiting re-upload.",
            }
      )
      .eq("id", r.id)
  }

  await logActivity({
    action: input.status === "approved" ? "document.approved" : "document.rejected",
    caseId: input.caseId,
    clientId: input.clientId,
    entity: "document",
    entityId: input.documentId,
    detail: { type: doc.type, notes: input.notes ?? null, by: profile.full_name },
  })

  const client = doc.clients as unknown as { full_name: string; email: string | null }
  await notifyClient({
    to: client?.email,
    subject:
      input.status === "approved"
        ? "A document was approved"
        : "Action needed: a document needs a fix",
    body:
      input.status === "approved"
        ? `Good news — your ${doc.type.replace(/_/g, " ")} was approved.`
        : `Your ${doc.type.replace(/_/g, " ")} needs a fix: ${input.notes ?? "please re-upload."}`,
  })

  revalidatePath(`/admin/cases/${input.caseId}`)
}

// ── messages ─────────────────────────────────────────────────────────────────
export async function postMessage(caseId: string, body: string) {
  const { userId } = await requireStaff()
  const trimmed = body.trim()
  if (!trimmed) return
  const supabase = await createClient()
  const { error } = await supabase
    .from("messages")
    .insert({ case_id: caseId, sender_id: userId, body: trimmed })
  if (error) throw error
  await logActivity({ action: "message.sent", caseId, entity: "message" })
  revalidatePath(`/admin/cases/${caseId}`)
}

/**
 * B3B — the private STAFF↔INSTRUCTOR lane (staff_only=true, keyed to the
 * engagement). RLS keeps this hidden from the client. Carries coordination
 * only — never applicant disclosures/PII.
 */
export async function sendStaffInstructorMessage(caseId: string, engagementId: string, body: string) {
  const { userId } = await requireStaff()
  const trimmed = body.trim()
  if (!trimmed) return
  const supabase = await createClient()
  const { error } = await supabase.from("messages").insert({
    case_id: caseId,
    engagement_id: engagementId,
    sender_id: userId,
    body: trimmed,
    staff_only: true,
  })
  if (error) throw error
  await logActivity({ action: "message.staff_instructor_sent", caseId, entity: "message" })
  revalidatePath(`/admin/cases/${caseId}`)
}

// ── B3A: admin instructor assignment (full assignment power) ───────────────────
/**
 * Directly assign (or reassign) a verified instructor to a case, overriding the
 * applicant's marketplace choice. Every assignment is logged as an admin action
 * and surfaced to the applicant. Uses the service role because `engagements`
 * has no staff INSERT policy (created only via RPCs) — the values here are all
 * server-derived from a staff-gated action.
 */
export async function adminAssignInstructor(caseId: string, instructorId: string) {
  const { profile } = await requireStaff()
  const admin = createAdminClient()

  const { data: instr } = await admin
    .from("instructors")
    .select("id, name, verified")
    .eq("id", instructorId)
    .maybeSingle()
  if (!instr) throw new Error("Instructor not found")
  // Full assignment power: admin may assign an as-yet-unverified instructor
  // (the dropdown labels them "pending"). Verification gates marketplace
  // visibility, not an admin's deliberate override.

  // Retire any other active engagement, then bind the chosen instructor.
  // Reassigning to a previously-engaged instructor reactivates their row
  // (unique case_id + instructor_id).
  await admin
    .from("engagements")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .eq("status", "active")
    .neq("instructor_id", instructorId)

  const { error } = await admin.from("engagements").upsert(
    {
      case_id: caseId,
      instructor_id: instructorId,
      type: "training",
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id,instructor_id" }
  )
  if (error) throw error

  await logActivity({
    action: "case.admin_assigned_instructor",
    caseId,
    entity: "engagement",
    detail: { instructor_id: instructorId, instructor: instr.name, by: profile.full_name },
  })
  await notifyCaseParties(admin, caseId, {
    title: "An instructor was assigned to your case",
    body: `${instr.name} will handle your training — you can message them from your portal.`,
  })
  revalidatePath(`/admin/cases/${caseId}`)
}

/** Staff confirm a booking (mirror of the instructor action, staff-authorized). */
export async function adminConfirmBooking(formData: FormData) {
  await requireStaff()
  const bookingId = String(formData.get("bookingId") ?? "")
  const admin = createAdminClient()
  const { data: b } = await admin.from("bookings").select("id, case_id, ics_uid").eq("id", bookingId).maybeSingle()
  if (!b) throw new Error("Booking not found")
  const uid = b.ics_uid ?? `${bookingId}@carry.app`
  const { error } = await admin.from("bookings").update({ status: "confirmed", ics_uid: uid }).eq("id", bookingId)
  if (error) throw error
  await sendBookingInvites(bookingId)
  await maybeAdvanceStage(admin, b.case_id, "training_scheduled", "booking.confirmed_by_staff")
  await logActivity({ action: "booking.confirmed_by_staff", caseId: b.case_id, entity: "booking", entityId: bookingId })
  revalidatePath(`/admin/cases/${b.case_id}`)
}

/** Staff cancel a booking (logs + revalidates — the instructor path did neither). */
export async function adminCancelBooking(formData: FormData) {
  await requireStaff()
  const bookingId = String(formData.get("bookingId") ?? "")
  const admin = createAdminClient()
  const { data: b } = await admin.from("bookings").select("case_id").eq("id", bookingId).maybeSingle()
  if (!b) throw new Error("Booking not found")
  await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId)
  await logActivity({ action: "booking.cancelled_by_staff", caseId: b.case_id, entity: "booking", entityId: bookingId })
  revalidatePath(`/admin/cases/${b.case_id}`)
}

// ── payments ─────────────────────────────────────────────────────────────────
export interface RequestPaymentResult {
  ok: boolean
  /** Present when a real Stripe invoice was issued — the hosted pay page. */
  hostedInvoiceUrl?: string | null
  /** True when Stripe was off and we fell back to the manual invoice task. */
  fallback?: boolean
  error?: string
}

/**
 * Staff-requested payment. With Stripe on, issue a REAL hosted invoice that
 * emails the client a branded pay link (Stripe Invoicing). With Stripe off,
 * fall back to a pending row + a staff "send invoice" task so nothing dead-ends.
 */
export async function requestPayment(input: {
  caseId: string
  amountCents: number
  type: "deposit" | "full" | "installment"
  description: string
}): Promise<RequestPaymentResult> {
  await requireStaff()
  if (!input.amountCents || input.amountCents < 50) return { ok: false, error: "Enter a valid amount" }

  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("client_id")
    .eq("id", input.caseId)
    .single()
  const clientId = kase?.client_id ?? null
  const description = input.description || `${input.type} payment`

  // The pending row first — it's the record of truth either path shares, and its
  // id is the invoice's reconciliation key.
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      case_id: input.caseId,
      client_id: clientId,
      amount_cents: input.amountCents,
      type: input.type,
      status: "pending",
      description,
    })
    .select("id")
    .single()
  if (error || !payment) return { ok: false, error: error?.message ?? "Could not create the payment" }

  const stripe = getStripe()
  if (stripe && clientId) {
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("id, email, full_name, stripe_customer_id")
        .eq("id", clientId)
        .single()
      if (client?.email) {
        const customerId = await findOrCreateCustomer(supabase, stripe, client)
        const invoice = await createAndSendInvoice(stripe, {
          customerId,
          paymentId: payment.id,
          caseId: input.caseId,
          amountCents: input.amountCents,
          description,
        })
        await supabase
          .from("payments")
          .update({ stripe_invoice_id: invoice.id, hosted_invoice_url: invoice.hostedInvoiceUrl })
          .eq("id", payment.id)
        await logActivity({
          action: "payment.invoiced",
          caseId: input.caseId,
          clientId,
          entity: "payment",
          entityId: payment.id,
          detail: { amount: input.amountCents, type: input.type, stripe_invoice_id: invoice.id },
        })
        revalidatePath("/admin/payments")
        return { ok: true, hostedInvoiceUrl: invoice.hostedInvoiceUrl }
      }
    } catch (e) {
      // A Stripe failure shouldn't lose the requested payment — the row stands,
      // and staff can send it manually via the fallback task below.
      console.error("[stripe] invoice creation failed:", e)
    }
  }

  // Stripe-off (or no client email / Stripe error) fallback: a staff task so the
  // request is actioned by a human. Mirrors the enroll-page invoice fallback.
  await supabase.from("tasks").insert({
    case_id: input.caseId,
    title: `Send invoice: ${description}`,
    description: "Payment requested from the admin console. Send the invoice / payment link.",
    priority: 1,
    status: "open",
  })
  await logActivity({
    action: "payment.requested",
    caseId: input.caseId,
    clientId,
    entity: "payment",
    entityId: payment.id,
    detail: { amount: input.amountCents, type: input.type },
  })
  revalidatePath("/admin/payments")
  return { ok: true, fallback: true }
}

// ── tasks ────────────────────────────────────────────────────────────────────
export async function setTaskStatus(taskId: string, status: "open" | "done") {
  await requireStaff()
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId)
  if (error) throw error
  revalidatePath("/admin")
}

const createTaskSchema = z.object({
  title: z.string().min(2, "Give the task a title").max(300),
  description: z.string().max(2000).optional().or(z.literal("")),
  caseId: z.string().uuid().optional().or(z.literal("")),
  assignee: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(3).default(2),
})

/** V3-P2.3 — consultants can finally CREATE tasks ("call client re: safe photos, due Friday"). */
export async function createTask(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { userId } = await requireStaff()
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    caseId: formData.get("caseId") ?? "",
    assignee: formData.get("assignee") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    priority: formData.get("priority") ?? 2,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const v = parsed.data

  const supabase = await createClient()
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: v.title,
      description: v.description || null,
      case_id: v.caseId || null,
      assignee: v.assignee || userId, // default: my own queue
      due_date: v.dueDate || null,
      priority: v.priority,
      status: "open",
    })
    .select("id")
    .single()
  if (error) return { error: error.message }

  await logActivity({
    action: "task.created",
    caseId: v.caseId || undefined,
    entity: "task",
    entityId: task.id,
    detail: { title: v.title, assignee: v.assignee || userId },
  })
  revalidatePath("/admin")
  if (v.caseId) revalidatePath(`/admin/cases/${v.caseId}`)
  return { ok: true }
}

// ── case notes (V3-P2.2 — internal work product, staff/admin RLS only) ───────
export async function addCaseNote(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { userId } = await requireStaff()
  const caseId = String(formData.get("caseId") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!body || body.length > 8000) return { error: "Write a note (max 8000 chars)." }

  const supabase = await createClient()
  const { error } = await supabase.from("case_notes").insert({ case_id: caseId, author: userId, body })
  if (error) return { error: error.message }

  await logActivity({ action: "note.added", caseId, entity: "case_note" })
  revalidatePath(`/admin/cases/${caseId}`)
  return { ok: true }
}

export async function toggleNotePin(formData: FormData) {
  await requireStaff()
  const noteId = String(formData.get("noteId") ?? "")
  const caseId = String(formData.get("caseId") ?? "")
  const pinned = formData.get("pinned") === "true"
  const supabase = await createClient()
  const { error } = await supabase.from("case_notes").update({ pinned }).eq("id", noteId)
  if (error) throw error
  revalidatePath(`/admin/cases/${caseId}`)
}

// ── requirements review (V3-P2.2 — the one checklist, staff side) ────────────
export async function setCaseRequirementStatus(
  caseReqId: string,
  caseId: string,
  status: "pending" | "satisfied" | "na" | "rejected",
  /** Deliberate staff override when satisfying a document-backed requirement
   *  with no evidence bound. Recorded on the row and in the activity log. */
  overrideReason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireStaff()
  const supabase = await createClient()

  // A blocking requirement is a legal must-have — a staffer can never mark one
  // N/A to skip it past the CP-5 gate. (The DB trigger enforces this too; this
  // is the clean, user-facing refusal.)
  if (status === "na") {
    const { data: row } = await supabase
      .from("case_requirements")
      .select("req_code, requirements!inner(blocking)")
      .eq("id", caseReqId)
      .single()
    const blocking = (row?.requirements as unknown as { blocking: boolean } | null)?.blocking
    if (blocking) {
      return {
        ok: false,
        error: `${row?.req_code ?? "This requirement"} is legally required — it can't be marked N/A.`,
      }
    }
  }

  // Satisfaction must rest on evidence. A document-backed requirement (the
  // registry declares a document_type) can only be marked satisfied when
  // something is bound to it — otherwise the checklist claims a document exists
  // that nobody has. Staff keep an escape hatch, but it must be deliberate and
  // it gets recorded. (A DB trigger enforces the same rule.)
  let overrideNote: string | undefined
  if (status === "satisfied") {
    const { data: row } = await supabase
      .from("case_requirements")
      .select("req_code, document_id, reference_id, cohabitant_id, disclosure_id, requirements!inner(document_type)")
      .eq("id", caseReqId)
      .single()
    const documentBacked = !!(row?.requirements as unknown as { document_type: string | null } | null)?.document_type
    const hasEvidence =
      !!row?.document_id || !!row?.reference_id || !!row?.cohabitant_id || !!row?.disclosure_id

    if (documentBacked && !hasEvidence) {
      if (!overrideReason?.trim()) {
        return {
          ok: false,
          error: `${row?.req_code ?? "This requirement"} has no document bound to it. Approve the uploaded document, or record an override reason.`,
        }
      }
      overrideNote = `OVERRIDE: ${overrideReason.trim()}`
      await logActivity({
        action: "requirement.satisfied_override",
        caseId,
        entity: "case_requirement",
        entityId: caseReqId,
        detail: { req_code: row?.req_code, reason: overrideReason.trim(), by: userId },
      })
    }
  }

  const { error } = await supabase
    .from("case_requirements")
    .update({ status, reviewer: userId, ...(overrideNote ? { notes: overrideNote } : {}) })
    .eq("id", caseReqId)
  if (error) throw error
  await logActivity({
    action: "requirement.status_set",
    caseId,
    entity: "case_requirement",
    entityId: caseReqId,
    detail: { status },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/portal/checklist")
  return { ok: true }
}

/** Bulk-approve every pending requirement that already has evidence bound. */
export async function approveRequirementsWithEvidence(caseId: string): Promise<{ approved: number }> {
  const { userId } = await requireStaff()
  const supabase = await createClient()
  const { data } = await supabase
    .from("case_requirements")
    .update({ status: "satisfied", reviewer: userId })
    .eq("case_id", caseId)
    .eq("status", "pending")
    .not("document_id", "is", null)
    .select("id")
  await logActivity({
    action: "requirement.bulk_approved",
    caseId,
    entity: "case_requirement",
    detail: { count: data?.length ?? 0 },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/portal/checklist")
  return { approved: data?.length ?? 0 }
}

// ── disclosure review (V3-P2.2 — candor-maximizing, never coaching content) ──
/**
 * Ask the client for a fuller written explanation. Prompts for COMPLETENESS
 * only — the consultant may never suggest what to include or omit.
 */
export async function requestBetterNarrative(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { userId } = await requireStaff()
  const caseId = String(formData.get("caseId") ?? "")
  const disclosureId = String(formData.get("disclosureId") ?? "")

  const supabase = await createClient()
  const { data: disc } = await supabase
    .from("disclosures")
    .select("id, type, occurred_on")
    .eq("id", disclosureId)
    .eq("case_id", caseId)
    .maybeSingle()
  if (!disc) return { error: "Disclosure not found" }

  const label = disc.type.replace(/_/g, " ") + (disc.occurred_on ? ` (${disc.occurred_on})` : "")
  const body =
    `Your written explanation for the ${label} disclosure needs more detail before we can assemble your application. ` +
    `Please describe, in your own words: what happened, when and where, how it was resolved, and anything the reviewer ` +
    `should understand about the circumstances. Complete, candid explanations are what the License Division looks for — ` +
    `you can edit it under Application intake → written explanations.`

  await supabase.from("messages").insert({ case_id: caseId, sender_id: userId, body })

  // In-app nudge for the client too.
  const { data: kase } = await supabase.from("cases").select("client_id, clients(profile_id, email)").eq("id", caseId).single()
  const client = kase?.clients as unknown as { profile_id: string | null; email: string | null } | null
  if (client?.profile_id) {
    await supabase.from("notifications").insert({
      recipient: client.profile_id,
      case_id: caseId,
      kind: "action_required",
      title: "A written explanation needs more detail",
      body: `Please expand your explanation for the ${label} disclosure.`,
      link: "/portal/intake",
    })
  }
  await notifyClient({
    to: client?.email ?? null,
    subject: "A written explanation needs more detail",
    body,
  })

  await logActivity({
    action: "disclosure.narrative_requested",
    caseId,
    entity: "disclosure",
    entityId: disclosureId,
    detail: { type: disc.type },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  return { ok: true }
}

/** V3-P2.5 — opening a case file marks the client's messages read (inbox unread state).
 *  Scoped to the staff↔client lane (engagement_id IS NULL): staff opening a case
 *  must NOT mark the applicant↔instructor lane read, or it would suppress the
 *  "unopened for an hour" nudge for messages the actual recipient never saw. */
export async function markCaseMessagesRead(caseId: string) {
  const { userId } = await requireStaff()
  const supabase = await createClient()
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("case_id", caseId)
    .is("engagement_id", null)
    .eq("read", false)
    .neq("sender_id", userId)
  revalidatePath("/admin/inbox")
}

// ── manual client creation ───────────────────────────────────────────────────
const createClientSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  borough: z.enum(BOROUGHS as unknown as [string, ...string[]]).optional().or(z.literal("")),
  track: z.enum(CLIENT_TRACKS.map((t) => t.key) as unknown as [string, ...string[]]),
  createAccount: z.string().optional(),
  // CONCIERGE Phase 5 — pre-stage a done-for-you case. Leave the account OFF and
  // the applicant CLAIMS this exact client+case on signup (email match in
  // ensureClientCaseForProfile), so the concierge case is already set up for them.
  serviceMode: z.enum(["self_guided", "concierge"]).optional().or(z.literal("")),
})

export type CreateClientState = { error?: string }

export async function createClientWithCase(
  _prev: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const { userId } = await requireStaff()

  const parsed = createClientSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    borough: formData.get("borough") ?? "",
    track: formData.get("track"),
    createAccount: formData.get("createAccount") ?? undefined,
    serviceMode: formData.get("serviceMode") ?? "",
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const input = parsed.data
  const supabase = await createClient()

  // Optionally provision a portal account (service role).
  let profileId: string | null = null
  if (input.createAccount === "on" && input.email) {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: { full_name: input.fullName },
      // Role is not set here — handle_new_user creates 'client' by default,
      // which is exactly what this flow provisions.
    })
    if (error) return { error: `Account: ${error.message}` }
    profileId = data.user?.id ?? null
    // (An invite/password-reset email would be sent here once email is enabled.)
  }

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      borough: input.borough || null,
      track: input.track as never,
      assigned_staff: userId,
      profile_id: profileId,
      current_stage: "lead",
      lead_source: "admin_manual",
    })
    .select("id")
    .single()
  if (clientErr) return { error: clientErr.message }

  const { data: kase, error: caseErr } = await supabase
    .from("cases")
    .insert({
      client_id: client.id,
      stage: "lead",
      status: "active",
      service_mode: input.serviceMode || null,
    })
    .select("id")
    .single()
  if (caseErr) return { error: caseErr.message }

  // V3-P2.1 — materialize the baseline requirement set from the versioned
  // registry (conditional rules refine after the client's intake). Service-role
  // is justified: generation writes system rows across RLS boundaries.
  await materializeCaseRequirements(
    createAdminClient(),
    kase.id,
    input.track === "non_resident" ? "special_carry" : "nyc",
    { isCarry: true }
  )

  await logActivity({
    action: "case.created",
    caseId: kase.id,
    clientId: client.id,
    entity: "client",
    entityId: client.id,
    detail: { manual: true, service_mode: input.serviceMode || null },
  })

  revalidatePath("/admin/pipeline")
  revalidatePath("/admin/cases")
  redirect(`/admin/cases/${kase.id}`)
}
