"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { notifyClient } from "@/lib/email"
import { STAGE_KEYS, stageMeta, type CaseStageKey } from "@/config/stages"
import { CHECKLIST_TEMPLATE } from "@/config/checklist-templates"
import {
  BOROUGHS,
  CLIENT_TRACKS,
} from "@/config/stages"

// ── stage changes (pipeline drag + case file) ────────────────────────────────
export async function setCaseStage(caseId: string, stage: CaseStageKey) {
  await requireStaff()
  if (!STAGE_KEYS.includes(stage)) throw new Error("Invalid stage")

  const supabase = await createClient()
  const { data: kase, error } = await supabase
    .from("cases")
    .update({ stage })
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
    subject: `Your CARRY application moved to: ${stageMeta(stage).label}`,
    body: `Hi ${client?.full_name ?? ""}, your application is now at the "${stageMeta(stage).label}" stage. ${stageMeta(stage).clientHint}`,
  })

  revalidatePath("/admin/pipeline")
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/admin")
  return { ok: true }
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

// ── checklist ────────────────────────────────────────────────────────────────
export async function updateChecklistItem(
  itemId: string,
  status: string,
  caseId: string
) {
  await requireStaff()
  const supabase = await createClient()
  const { error } = await supabase
    .from("checklist_items")
    .update({ status: status as never })
    .eq("id", itemId)
  if (error) throw error
  await logActivity({
    action: "checklist.updated",
    caseId,
    entity: "checklist_item",
    entityId: itemId,
    detail: { status },
  })
  revalidatePath(`/admin/cases/${caseId}`)
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
    .select("type, client_id, clients(full_name, email)")
    .single()
  if (error) throw error

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

// ── payments ─────────────────────────────────────────────────────────────────
export async function requestPayment(input: {
  caseId: string
  amountCents: number
  type: "deposit" | "full" | "installment"
  description: string
}) {
  await requireStaff()
  if (!input.amountCents || input.amountCents < 50) throw new Error("Enter a valid amount")
  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("client_id")
    .eq("id", input.caseId)
    .single()
  const { error } = await supabase.from("payments").insert({
    case_id: input.caseId,
    client_id: kase?.client_id ?? null,
    amount_cents: input.amountCents,
    type: input.type,
    status: "pending",
    description: input.description || `${input.type} payment`,
  })
  if (error) throw error
  await logActivity({ action: "payment.requested", caseId: input.caseId, detail: { amount: input.amountCents, type: input.type } })
  revalidatePath("/admin/payments")
}

// ── tasks ────────────────────────────────────────────────────────────────────
export async function setTaskStatus(taskId: string, status: "open" | "done") {
  await requireStaff()
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId)
  if (error) throw error
  revalidatePath("/admin")
}

// ── manual client creation ───────────────────────────────────────────────────
const createClientSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  borough: z.enum(BOROUGHS as unknown as [string, ...string[]]).optional().or(z.literal("")),
  track: z.enum(CLIENT_TRACKS.map((t) => t.key) as unknown as [string, ...string[]]),
  createAccount: z.string().optional(),
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
      user_metadata: { full_name: input.fullName, role: "client" },
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
    .insert({ client_id: client.id, stage: "lead", status: "active" })
    .select("id")
    .single()
  if (caseErr) return { error: caseErr.message }

  // Seed the checklist from the template (all not-started).
  const rows = CHECKLIST_TEMPLATE.map((t) => ({
    case_id: kase.id,
    template_key: t.key,
    stage: t.stageKey,
    title: t.title,
    description: t.description ?? null,
    required: t.required,
    owner: t.owner,
    document_type: t.documentType ?? null,
    status: "not_started" as const,
  }))
  await supabase.from("checklist_items").insert(rows)

  await logActivity({
    action: "case.created",
    caseId: kase.id,
    clientId: client.id,
    entity: "client",
    entityId: client.id,
    detail: { manual: true },
  })

  revalidatePath("/admin/pipeline")
  revalidatePath("/admin/cases")
  redirect(`/admin/cases/${kase.id}`)
}
