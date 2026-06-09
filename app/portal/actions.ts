"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import type { DocumentType } from "@/config/checklist-templates"

const ALLOWED_CLIENT_STATUSES = ["not_started", "in_progress", "submitted"] as const

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
    file_name: input.fileName,
    version,
  })
  if (error) throw error

  // Mark the matching checklist item submitted (best effort).
  await supabase
    .from("checklist_items")
    .update({ status: "submitted" })
    .eq("case_id", input.caseId)
    .eq("document_type", input.type)
    .neq("status", "approved")

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

// ── Checklist (client-owned items only) ───────────────────────────────────────
export async function updateMyChecklistItem(itemId: string, status: string, caseId: string) {
  await requireRole(["client"])
  if (!ALLOWED_CLIENT_STATUSES.includes(status as never)) {
    throw new Error("Not allowed")
  }
  const supabase = await createClient()
  // RLS only permits updating owner='client' items on a visible case.
  const { error } = await supabase
    .from("checklist_items")
    .update({ status: status as never })
    .eq("id", itemId)
    .eq("owner", "client")
  if (error) throw error
  await logActivity({ action: "checklist.client_updated", caseId, entity: "checklist_item", entityId: itemId, detail: { status } })
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

  const { error } = await supabase.from("character_references").insert({
    case_id: v.caseId,
    name: v.name,
    relationship: v.relationship || null,
    is_family: v.isFamily === "on",
    contact_email: v.contactEmail || null,
    contact_phone: v.contactPhone || null,
    received: true,
  })
  if (error) return { error: error.message }
  await logActivity({ action: "reference.added", caseId: v.caseId, entity: "character_reference" })
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
})

export async function addCohabitant(_prev: CollectorState, formData: FormData): Promise<CollectorState> {
  await requireRole(["client"])
  const parsed = cohabitantSchema.safeParse({
    caseId: formData.get("caseId"),
    name: formData.get("name"),
    relationship: formData.get("relationship") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const v = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from("cohabitants").insert({
    case_id: v.caseId,
    name: v.name,
    relationship: v.relationship || null,
    affidavit_status: "not_started",
  })
  if (error) return { error: error.message }
  await logActivity({ action: "cohabitant.added", caseId: v.caseId, entity: "cohabitant" })
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
  const { error } = await supabase
    .from("messages")
    .insert({ case_id: caseId, sender_id: userId, body: trimmed })
  if (error) throw error
  await logActivity({ action: "message.sent", caseId, entity: "message", detail: { from: "client" } })
  revalidatePath("/portal/messages")
}
