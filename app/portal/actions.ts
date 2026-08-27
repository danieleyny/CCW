"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { inviteReference, inviteCohabitant } from "@/lib/outreach"
import type { DocumentType } from "@/lib/doc-types"
import { enforceUploadedFile } from "@/lib/files/enforce"
import { satisfySystemRequirement } from "@/lib/requirements/system-checks"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { smartDocument } from "@/lib/requirements/smart-documents"
import { requiredReferences } from "@/lib/intake/schema"
import { referenceComposition, familyCapMessage } from "@/lib/references/composition"
import type { WizardAnswers } from "@/lib/intake/answers"

/** Verify the signed-in client owns this case and return its client_id. */
async function ownedCase(caseId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("id, client_id")
    .eq("id", caseId)
    .maybeSingle() // RLS → null if not theirs
  return data
}

// ── Document recording (file already uploaded to Storage by the browser) ──────
export async function recordDocument(input: {
  documentId: string
  caseId: string
  type: DocumentType
  /** The requirement this upload answers, when the UI knows it. */
  reqCode?: string
  /**
   * Smart documents: what the applicant tagged this file as (e.g. "us_passport").
   * When set, the SAME uploaded file binds to every outstanding requirement that
   * kind legitimately covers — a passport answers photo ID, date of birth, and
   * citizenship at once, so they never upload it three times.
   */
  documentKind?: string
  path: string
  fileName: string
}) {
  await requireRole(["client"])
  const supabase = await createClient()

  const kase = await ownedCase(input.caseId)
  if (!kase) throw new Error("Case not found")

  // The storage path must live under this client's own folder.
  if (!input.path.startsWith(`clients/${kase.client_id}/`)) {
    throw new Error("Invalid upload path")
  }

  // FMT-01, server side — the client check is bypassable (see lib/files/enforce).
  // Service role: reading storage metadata and removing a rejected object, both
  // before we've decided this upload is legitimate enough to record.
  const fileName = await enforceUploadedFile(createAdminClient(), {
    path: input.path,
    fileName: input.fileName,
  })

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("case_id", input.caseId)
    .eq("type", input.type)
  const version = (count ?? 0) + 1

  const { error } = await supabase.from("documents").insert({
    id: input.documentId,
    case_id: input.caseId,
    client_id: kase.client_id,
    type: input.type,
    status: "pending",
    file_path: input.path,
    file_name: fileName,
    req_code: input.reqCode ?? null,
    version,
  })
  if (error) throw error

  // Bind the upload to its matching requirement(s) so the consultant sees the
  // evidence attached. Status stays pending until staff review approves it —
  // satisfaction is a review decision, not an upload event. Nothing here
  // auto-satisfies or bypasses the CP-5 QA gate; it only sets document_id.
  //
  // Three ways to resolve which requirement(s) this file answers:
  //  1. SMART DOCUMENT — the applicant tagged a kind (e.g. passport). Fan the
  //     same file across every OUTSTANDING requirement that kind covers on this
  //     case (a passport → IDN-01/02/03). Upload once, all attached.
  //  2. A specific req_code from the UI — bind that single requirement.
  //  3. Neither — fall back to matching the registry document_type. (IDN-01/02/03
  //     all declare type "id", so this is the coarse path used only when the UI
  //     couldn't name the requirement.)
  // Bind via the SERVICE ROLE: case_requirements is staff-writable only
  // (case_requirements_write = is_staff_or_admin()), so the applicant's own RLS
  // client CANNOT set document_id — the update silently no-ops and the evidence
  // never binds (staff can't see it, and smart-cover siblings never light up).
  // This is the documented service-role pattern: a client-initiated write to a
  // staff-only table with server-derived values, scoped to this owned case.
  const bindDb = createAdminClient()
  const smart = input.documentKind ? smartDocument(input.documentKind) : undefined
  const boundReqCodes: string[] = []
  if (smart) {
    const { data: rows } = await bindDb
      .from("case_requirements")
      .select("id, req_code")
      .eq("case_id", input.caseId)
      .in("req_code", smart.reqCodes)
      .neq("status", "satisfied")
    for (const r of rows ?? []) {
      await bindDb.from("case_requirements").update({ document_id: input.documentId }).eq("id", r.id)
      boundReqCodes.push(r.req_code)
    }
  } else {
    const { data: matchingReqs } = input.reqCode
      ? await bindDb
          .from("case_requirements")
          .select("id, req_code")
          .eq("case_id", input.caseId)
          .eq("req_code", input.reqCode)
          .neq("status", "satisfied")
      : await bindDb
          .from("case_requirements")
          .select("id, req_code, requirements!inner(document_type)")
          .eq("case_id", input.caseId)
          .eq("requirements.document_type", input.type)
          .neq("status", "satisfied")
    for (const r of matchingReqs ?? []) {
      await bindDb.from("case_requirements").update({ document_id: input.documentId }).eq("id", r.id)
      boundReqCodes.push(r.req_code)
    }
  }

  // FMT-01 is a control we run, not a box the customer ticks: the upload just
  // passed the size/type/filename check, so the control is satisfied by evidence.
  await satisfySystemRequirement(createAdminClient(), input.caseId, "FMT-01")

  // Documents are coming in — say so on the case instead of leaving the customer
  // staring at a stage that predates everything they've done.
  await maybeAdvanceStage(createAdminClient(), input.caseId, "document_collection", "document.uploaded")

  await logActivity({
    action: "document.uploaded",
    caseId: input.caseId,
    clientId: kase.client_id,
    entity: "document",
    entityId: input.documentId,
    // Record the multi-attach so the audit trail shows one file answered several
    // requirements (e.g. a passport → IDN-01, IDN-02, IDN-03).
    detail: {
      type: input.type,
      version,
      ...(input.documentKind ? { documentKind: input.documentKind } : {}),
      ...(boundReqCodes.length ? { boundReqCodes } : {}),
    },
  })

  revalidatePath("/portal/documents")
  revalidatePath("/portal/checklist")
  revalidatePath("/portal")
  // The concierge applicant's vault lives on /portal/concierge — without this, a
  // concierge upload's router.refresh() served the stale (pre-upload) route and
  // the card never flipped to "Received".
  revalidatePath("/portal/concierge")
}

// ── References collector ──────────────────────────────────────────────────────
const referenceSchema = z.object({
  caseId: z.string().uuid(),
  name: z.string().min(2, "Enter a name"),
  relationship: z.string().optional(),
  isFamily: z.string().optional(),
  contactEmail: z.string().email().or(z.literal("")).optional(),
  contactPhone: z.string().optional(),
})

export type CollectorState = { error?: string; ok?: boolean }

export async function addReference(_prev: CollectorState, formData: FormData): Promise<CollectorState> {
  await requireRole(["client"])
  const parsed = referenceSchema.safeParse({
    caseId: formData.get("caseId"),
    name: formData.get("name"),
    relationship: formData.get("relationship") ?? "",
    isFamily: formData.get("isFamily") ?? undefined,
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const v = parsed.data
  const supabase = await createClient()

  // Enforce BOTH the count and the composition (38 RCNY §5-05(b)(8)) server-side —
  // the UI blocks it too, but the rule can't live only in the client. How many this
  // track needs, and the family cap, come from the ONE composition rule.
  const [{ data: kase }, { data: intakeRow }, { data: existing }] = await Promise.all([
    supabase.from("cases").select("is_renewal, license_track").eq("id", v.caseId).maybeSingle(),
    supabase.from("intake_sessions").select("answers").eq("case_id", v.caseId).maybeSingle(),
    supabase.from("character_references").select("is_family").eq("case_id", v.caseId),
  ])
  const answers = (intakeRow?.answers ?? {}) as WizardAnswers
  const required = requiredReferences(answers, {
    isRenewal: !!kase?.is_renewal,
    licenseTrack: (kase?.license_track ?? undefined) as
      | "concealed_carry"
      | "carry_guard"
      | "special_carry_guard"
      | "sponsored_unresolved"
      | undefined,
  })
  const refs = existing ?? []
  if (refs.length >= required) {
    return { error: `You already have ${required} reference${required === 1 ? "" : "s"}.` }
  }
  const comp = referenceComposition(refs, required)
  if (v.isFamily === "on" && comp.familyCapReached) {
    return { error: familyCapMessage(comp.maxFamily, required) }
  }

  const { data: created, error } = await supabase
    .from("character_references")
    .insert({
      case_id: v.caseId,
      name: v.name,
      relationship: v.relationship || null,
      is_family: v.isFamily === "on",
      contact_email: v.contactEmail || null,
      contact_phone: v.contactPhone || null,
      received: false,
    })
    .select("id")
    .single()
  if (error) return { error: error.message }
  await logActivity({ action: "reference.added", caseId: v.caseId, entity: "character_reference", entityId: created.id })

  // Auto-invite: if we have an email, mint the tokenized request and send it
  // immediately so the reference can self-serve without the applicant chasing
  // them. Through the ONE outreach helper — lib/outreach owns token minting,
  // sent_at stamping and the email copy for every invite path. (Service role:
  // client-initiated write of a token the client must never read back.)
  if (v.contactEmail) {
    await inviteReference(createAdminClient(), created.id)
  }

  revalidatePath("/portal/people")
  return { ok: true }
}

export async function deleteReference(id: string, caseId: string) {
  await requireRole(["client"])
  const supabase = await createClient()
  await supabase.from("character_references").delete().eq("id", id)
  revalidatePath("/portal/people")
  void caseId
}

// ── Cohabitant collector ──────────────────────────────────────────────────────
const cohabitantSchema = z.object({
  caseId: z.string().uuid(),
  name: z.string().min(2, "Enter a name"),
  relationship: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email").or(z.literal("")).optional(),
})

export async function addCohabitant(_prev: CollectorState, formData: FormData): Promise<CollectorState> {
  await requireRole(["client"])
  const parsed = cohabitantSchema.safeParse({
    caseId: formData.get("caseId"),
    name: formData.get("name"),
    relationship: formData.get("relationship") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const v = parsed.data
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from("cohabitants")
    .insert({
      case_id: v.caseId,
      name: v.name,
      relationship: v.relationship || null,
      contact_email: v.contactEmail || null,
      affidavit_status: "not_started",
    })
    .select("id")
    .single()
  if (error) return { error: error.message }
  await logActivity({ action: "cohabitant.added", caseId: v.caseId, entity: "cohabitant", entityId: created.id })

  // Auto-invite the cohabitant to complete + notarize their affidavit in-system.
  // Through the ONE outreach helper — an inline copy of it here minted the token
  // without stamping sent_at, so the link-journey tracker and the 3/7-day
  // reminder rule never saw this invite. (Service role: client-initiated write
  // of a token the client must never read back.)
  if (v.contactEmail) {
    await inviteCohabitant(createAdminClient(), created.id)
  }

  revalidatePath("/portal/people")
  return { ok: true }
}

export async function deleteCohabitant(id: string, caseId: string) {
  await requireRole(["client"])
  const supabase = await createClient()
  await supabase.from("cohabitants").delete().eq("id", id)
  revalidatePath("/portal/people")
  void caseId
}

// ── Messaging ─────────────────────────────────────────────────────────────────
export async function sendMessage(caseId: string, body: string) {
  const { userId } = await requireRole(["client"])
  const trimmed = body.trim()
  if (!trimmed) return
  const supabase = await createClient()
  // Staff thread only (engagement_id stays null); the instructor never sees it.
  const { error } = await supabase
    .from("messages")
    .insert({ case_id: caseId, sender_id: userId, body: trimmed })
  if (error) throw error
  await logActivity({ action: "message.sent", caseId, entity: "message", detail: { from: "client" } })
  revalidatePath("/portal/messages")
}

/**
 * Send a message on the applicant↔instructor thread for an engagement. Used by
 * BOTH surfaces (the applicant's marketplace panel and the instructor's case
 * view); RLS enforces that each party may only touch their own engagement's
 * thread. `threadKey` is the engagement id (MessageThread passes it opaquely).
 */
export async function sendEngagementMessage(engagementId: string, body: string) {
  const { userId, profile } = await requireRole(["client", "instructor"])
  const role = profile.role
  const trimmed = body.trim()
  if (!trimmed || !engagementId) return
  const supabase = await createClient()

  // Both parties can read their own engagement (RLS) → derive the case id.
  const { data: eng } = await supabase
    .from("engagements")
    .select("id, case_id, instructor_id")
    .eq("id", engagementId)
    .maybeSingle()
  if (!eng) throw new Error("Engagement not found")

  const { error } = await supabase.from("messages").insert({
    case_id: eng.case_id,
    engagement_id: engagementId,
    sender_id: userId,
    body: trimmed,
  })
  if (error) throw error

  // Notify the other party in-app (service role — no PII crosses the wall).
  const admin = createAdminClient()
  if (role === "instructor") {
    const { data: kase } = await admin
      .from("cases")
      .select("clients(profile_id)")
      .eq("id", eng.case_id)
      .single()
    const client = kase?.clients as unknown as { profile_id: string | null } | null
    if (client?.profile_id) {
      await admin.from("notifications").insert({
        recipient: client.profile_id, case_id: eng.case_id, kind: "info",
        title: "New message from your instructor", body: trimmed.slice(0, 140),
        link: "/portal/marketplace",
      })
    }
  } else {
    const { data: instr } = await admin
      .from("instructors").select("profile_id").eq("id", eng.instructor_id).single()
    if (instr?.profile_id) {
      await admin.from("notifications").insert({
        recipient: instr.profile_id, case_id: eng.case_id, kind: "info",
        title: "New message from your applicant", body: trimmed.slice(0, 140),
        link: "/instructor/cases",
      })
    }
  }

  await logActivity({ action: "message.sent", caseId: eng.case_id, entity: "message", detail: { from: role, engagement: engagementId } })
  revalidatePath("/portal/marketplace")
  revalidatePath(`/instructor/cases/${eng.case_id}`)
}

/**
 * Mark the OTHER party's messages in this engagement's applicant↔instructor
 * lane as read — called when a party opens the thread (both the applicant
 * marketplace and the instructor case view). Powers the "unopened for an hour
 * → email" nudge: a read message never nudges.
 */
export async function markEngagementMessagesRead(engagementId: string) {
  const { userId } = await requireRole(["client", "instructor"])
  if (!engagementId) return
  const supabase = await createClient()
  // RLS confirms the caller may see this engagement (both parties can).
  const { data: eng } = await supabase.from("engagements").select("id").eq("id", engagementId).maybeSingle()
  if (!eng) return
  // Service role to flip `read` across the lane (instructors have no messages
  // UPDATE grant); scoped to THIS engagement's non-staff lane and to messages
  // the caller did NOT send.
  const admin = createAdminClient()
  await admin
    .from("messages")
    .update({ read: true })
    .eq("engagement_id", engagementId)
    .eq("staff_only", false)
    .eq("read", false)
    .neq("sender_id", userId)
}
