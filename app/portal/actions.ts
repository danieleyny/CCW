"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { sendEmail } from "@/lib/email"
import { newReferenceToken, tokenExpiry } from "@/lib/references/process"
import type { DocumentType } from "@/lib/doc-types"
import { enforceUploadedFile } from "@/lib/files/enforce"
import { satisfySystemRequirement } from "@/lib/requirements/system-checks"

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
    version,
  })
  if (error) throw error

  // V3-P2.1 — bind the upload to its matching requirement(s) so the consultant
  // sees the evidence attached. Status stays pending until staff review
  // approves it (satisfaction is a review decision, not an upload event).
  const { data: matchingReqs } = await supabase
    .from("case_requirements")
    .select("id, requirements!inner(document_type)")
    .eq("case_id", input.caseId)
    .eq("requirements.document_type", input.type)
    .neq("status", "satisfied")
  for (const r of matchingReqs ?? []) {
    await supabase.from("case_requirements").update({ document_id: input.documentId }).eq("id", r.id)
  }

  // FMT-01 is a control we run, not a box the customer ticks: the upload just
  // passed the size/type/filename check, so the control is satisfied by evidence.
  await satisfySystemRequirement(createAdminClient(), input.caseId, "FMT-01")

  await logActivity({
    action: "document.uploaded",
    caseId: input.caseId,
    clientId: kase.client_id,
    entity: "document",
    entityId: input.documentId,
    detail: { type: input.type, version },
  })

  revalidatePath("/portal/documents")
  revalidatePath("/portal/checklist")
  revalidatePath("/portal")
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

  const { count } = await supabase
    .from("character_references")
    .select("id", { count: "exact", head: true })
    .eq("case_id", v.caseId)
  if ((count ?? 0) >= 4) return { error: "You already have 4 references." }

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

  // Auto-invite: if we have an email, create the tokenized request and send it
  // immediately so the reference can self-serve without the applicant chasing them.
  if (v.contactEmail) {
    const admin = createAdminClient()
    const token = newReferenceToken()
    await admin.from("reference_requests").insert({
      reference_id: created.id, case_id: v.caseId, token, status: "sent", sent_at: new Date().toISOString(),
      expires_at: tokenExpiry(),
    })
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    const link = `${base}/r/${token}`
    await sendEmail({
      to: v.contactEmail,
      subject: "You've been listed as a character reference — Gun License NYC",
      html: `<div style="font-family:sans-serif;line-height:1.5">
        <p>Hi ${v.name},</p>
        <p>${"An applicant"} listed you as a character reference for their NYC concealed-carry
        license. Please confirm and complete it here — it takes a minute, no account needed,
        and we'll build a ready-to-notarize letter for you:</p>
        <p><a href="${link}">${link}</a></p>
      </div>`,
      text: `Complete your character reference: ${link}`,
    })
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
  if (v.contactEmail) {
    const admin = createAdminClient()
    const token = newReferenceToken()
    await admin.from("cohabitants").update({ token, token_expires_at: tokenExpiry() }).eq("id", created.id)
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    const link = `${base}/c/${token}`
    await sendEmail({
      to: v.contactEmail,
      subject: "Please complete a cohabitant affidavit — Gun License NYC",
      html: `<div style="font-family:sans-serif;line-height:1.5">
        <p>Hi ${v.name},</p>
        <p>You were listed as a household member on a NYC concealed-carry license application.
        Please confirm and complete a short affidavit here — no account needed, and we'll build
        a ready-to-notarize document for you:</p>
        <p><a href="${link}">${link}</a></p>
      </div>`,
      text: `Complete your cohabitant affidavit: ${link}`,
    })
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
