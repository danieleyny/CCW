"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { recomputeReferenceRequirement } from "@/lib/references/process"
import { inviteReference, inviteCohabitant } from "@/lib/outreach"
import { recomputeCohabitantRequirement } from "@/lib/cohabitants/process"

/** Send (or re-send) a tokenized self-serve link to a character reference. */
export async function sendReferenceRequest(formData: FormData) {
  await requireRole(["client", "staff", "admin"])
  const referenceId = String(formData.get("referenceId") ?? "")

  // Ownership check through RLS before the service-role helper touches anything.
  const supabase = await createClient()
  const { data: ref } = await supabase
    .from("character_references")
    .select("id, case_id, contact_email")
    .eq("id", referenceId)
    .maybeSingle()
  if (!ref) throw new Error("Reference not found")
  if (!ref.contact_email) throw new Error("Add an email for this reference first")

  await inviteReference(createAdminClient(), referenceId)

  await logActivity({
    action: "reference.request_sent",
    caseId: ref.case_id,
    entity: "reference",
    entityId: referenceId,
  })
  revalidatePath("/portal/people")
  revalidatePath("/admin/cases", "layout")
}

/**
 * Applicant fallback: record a notarized reference doc they collected directly.
 * The file is already uploaded to Storage by the browser (client RLS). We bind a
 * documents row, flip the reference + request to notarized, and recompute REF-01.
 */
export async function recordReferenceUpload(input: {
  targetId: string
  path: string
  fileName: string
  documentId: string
}) {
  await requireRole(["client"])
  const supabase = await createClient()
  const { data: ref } = await supabase
    .from("character_references")
    .select("id, case_id")
    .eq("id", input.targetId)
    .maybeSingle()
  if (!ref) throw new Error("Reference not found")

  const { data: kase } = await supabase.from("cases").select("client_id").eq("id", ref.case_id).single()
  if (!kase) throw new Error("Case not found")
  if (!input.path.startsWith(`clients/${kase.client_id}/`)) throw new Error("Invalid upload path")

  const admin = createAdminClient()
  await admin.from("documents").insert({
    id: input.documentId, case_id: ref.case_id, client_id: kase.client_id,
    type: "reference_letter", status: "pending", file_path: input.path, file_name: input.fileName, notarized: true,
  })
  await admin.from("character_references").update({ notarized: true, received: true }).eq("id", ref.id)
  await admin
    .from("reference_requests")
    .update({ status: "notarized", notarized_at: new Date().toISOString(), document_id: input.documentId })
    .eq("reference_id", ref.id)
  await recomputeReferenceRequirement(admin, ref.case_id)

  await logActivity({ action: "reference.notarized", caseId: ref.case_id, entity: "reference", entityId: ref.id })
  revalidatePath("/portal/people")
  revalidatePath("/admin/cases", "layout")
}

/** Applicant fallback: record a notarized cohabitant affidavit they collected directly. */
export async function recordCohabitantUpload(input: {
  targetId: string
  path: string
  fileName: string
  documentId: string
}) {
  await requireRole(["client"])
  const supabase = await createClient()
  const { data: cohab } = await supabase.from("cohabitants").select("id, case_id").eq("id", input.targetId).maybeSingle()
  if (!cohab) throw new Error("Cohabitant not found")

  const { data: kase } = await supabase.from("cases").select("client_id").eq("id", cohab.case_id).single()
  if (!kase) throw new Error("Case not found")
  if (!input.path.startsWith(`clients/${kase.client_id}/`)) throw new Error("Invalid upload path")

  const admin = createAdminClient()
  await admin.from("documents").insert({
    id: input.documentId, case_id: cohab.case_id, client_id: kase.client_id,
    type: "cohabitant_affidavit", status: "pending", file_path: input.path, file_name: input.fileName, notarized: true,
  })
  await admin
    .from("cohabitants")
    .update({ affidavit_status: "notarized", notarized_at: new Date().toISOString(), document_id: input.documentId })
    .eq("id", cohab.id)
  await recomputeCohabitantRequirement(admin, cohab.case_id)

  await logActivity({ action: "cohabitant.notarized", caseId: cohab.case_id, entity: "cohabitant", entityId: cohab.id })
  revalidatePath("/portal/people")
  revalidatePath("/admin/cases", "layout")
}

/** Send (or re-send) a cohabitant their affidavit link. */
export async function sendCohabitantRequest(formData: FormData) {
  await requireRole(["client", "staff", "admin"])
  const cohabitantId = String(formData.get("cohabitantId") ?? "")

  const supabase = await createClient()
  const { data: cohab } = await supabase
    .from("cohabitants")
    .select("id, case_id, contact_email")
    .eq("id", cohabitantId)
    .maybeSingle()
  if (!cohab) throw new Error("Cohabitant not found")
  if (!cohab.contact_email) throw new Error("Add an email for this cohabitant first")

  await inviteCohabitant(createAdminClient(), cohabitantId)

  await logActivity({ action: "cohabitant.request_sent", caseId: cohab.case_id, entity: "cohabitant", entityId: cohab.id })
  revalidatePath("/portal/people")
  revalidatePath("/admin/cases", "layout")
}

/** V3-P0.4 — kill a reference link immediately (rotated on the next resend). */
export async function revokeReferenceLink(formData: FormData) {
  await requireRole(["client", "staff", "admin"])
  const referenceId = String(formData.get("referenceId") ?? "")

  // Ownership check under the caller's RLS before the service-role write.
  const supabase = await createClient()
  const { data: ref } = await supabase
    .from("character_references")
    .select("id, case_id")
    .eq("id", referenceId)
    .maybeSingle()
  if (!ref) throw new Error("Reference not found")

  const admin = createAdminClient()
  await admin
    .from("reference_requests")
    .update({ revoked_at: new Date().toISOString() })
    .eq("reference_id", referenceId)

  await logActivity({ action: "reference.link_revoked", caseId: ref.case_id, entity: "reference", entityId: referenceId })
  revalidatePath("/portal/people")
  revalidatePath("/admin/cases", "layout")
}

/** V3-P0.4 — kill a cohabitant affidavit link immediately. */
export async function revokeCohabitantLink(formData: FormData) {
  await requireRole(["client", "staff", "admin"])
  const cohabitantId = String(formData.get("cohabitantId") ?? "")

  const supabase = await createClient()
  const { data: cohab } = await supabase
    .from("cohabitants")
    .select("id, case_id")
    .eq("id", cohabitantId)
    .maybeSingle()
  if (!cohab) throw new Error("Cohabitant not found")

  const admin = createAdminClient()
  await admin
    .from("cohabitants")
    .update({ token_revoked_at: new Date().toISOString() })
    .eq("id", cohab.id)

  await logActivity({ action: "cohabitant.link_revoked", caseId: cohab.case_id, entity: "cohabitant", entityId: cohab.id })
  revalidatePath("/portal/people")
  revalidatePath("/admin/cases", "layout")
}
