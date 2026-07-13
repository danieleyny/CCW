"use server"

import { randomUUID } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { validateFile } from "@/lib/files/validator"
import { recomputeReferenceRequirement, tokenActive } from "@/lib/references/process"
import { rateLimit } from "@/lib/rate-limit"
import { REFERENCE_QUESTIONS, type ReferenceAnswers } from "@/lib/references/questions"
import { isReasonableSignature } from "@/lib/signatures"

type Admin = ReturnType<typeof createAdminClient>

/** Capture the reference's e-signature; their letter PDF then comes pre-signed. */
export async function saveReferenceSignature(token: string, base64: string): Promise<{ ok?: boolean; error?: string }> {
  if (!isReasonableSignature(base64)) return { error: "Please draw or type your signature first." }
  if (!rateLimit(`r:${token}`)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: req } = await admin
    .from("reference_requests")
    .select("reference_id, case_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!req || !tokenActive(req)) return { error: "This link is invalid or has expired." }
  const { error } = await admin
    .from("signatures")
    .upsert({ case_id: req.case_id, signer_key: `reference:${req.reference_id}`, png_base64: base64 }, { onConflict: "case_id,signer_key" })
  if (error) return { error: error.message }
  return { ok: true }
}

/** Notify the applicant (in-app + email) and the engaged instructor (in-app, no PII). */
async function notifyParties(
  admin: Admin,
  caseId: string,
  opts: { title: string; body: string }
) {
  const { data: kase } = await admin.from("cases").select("client_id").eq("id", caseId).single()
  if (kase?.client_id) {
    const { data: client } = await admin.from("clients").select("profile_id, email").eq("id", kase.client_id).single()
    if (client?.profile_id) {
      await admin.from("notifications").insert({
        recipient: client.profile_id, case_id: caseId, kind: "info",
        title: opts.title, body: opts.body, link: "/portal/people",
      })
    }
    if (client?.email) await sendEmail({ to: client.email, subject: opts.title, html: `<p>${opts.body}</p>`, text: opts.body })
  }
  const { data: eng } = await admin
    .from("engagements")
    .select("instructor_id")
    .eq("case_id", caseId)
    .eq("status", "active")
    .maybeSingle()
  if (eng) {
    const { data: instr } = await admin.from("instructors").select("profile_id").eq("id", eng.instructor_id).single()
    if (instr?.profile_id) {
      await admin.from("notifications").insert({
        recipient: instr.profile_id, case_id: caseId, kind: "info",
        title: opts.title, body: opts.body, link: "/instructor/cases",
      })
    }
  }
}

/**
 * Step 1 — the reference answers the questionnaire. Stores answers (the PDF is
 * regenerated on download from these), marks the reference "received", recomputes
 * REF-01, and notifies both parties. Token-scoped, service-role, no login.
 */
export async function submitReferenceAnswers(
  token: string,
  answers: ReferenceAnswers,
  notaryArea: string
): Promise<{ ok?: boolean; error?: string; alreadyDone?: boolean }> {
  for (const q of REFERENCE_QUESTIONS) {
    if (q.required && !(answers[q.key] || "").trim()) {
      return { error: "Please answer all required questions." }
    }
  }
  if (!rateLimit(`r:${token}`)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: req } = await admin
    .from("reference_requests")
    .select("id, reference_id, case_id, status, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!req || !tokenActive(req)) return { error: "This link is invalid or has expired." }
  if (req.status === "notarized") return { ok: true, alreadyDone: true }

  const firstTime = req.status !== "submitted"
  await admin
    .from("reference_requests")
    .update({ answers: answers as never, notary_area: notaryArea || null, status: "submitted", answered_at: new Date().toISOString() })
    .eq("id", req.id)
  await admin.from("character_references").update({ received: true }).eq("id", req.reference_id)
  await recomputeReferenceRequirement(admin, req.case_id)

  if (firstTime) {
    await notifyParties(admin, req.case_id, {
      title: "A character reference responded",
      body: "A reference completed their statement and is getting it notarized. You'll be notified when it's uploaded.",
    })
    await admin.from("activity_log").insert({
      case_id: req.case_id, action: "reference.answered", entity: "reference", entity_id: req.reference_id, detail: {} as never,
    })
  }
  return { ok: true }
}

/**
 * Step 2 — the reference uploads the notarized PDF/scan. Stored via the
 * service-role client (anonymous users can't write Storage), bound to a documents
 * row, flips status to notarized, recomputes REF-01, notifies both parties.
 */
export async function uploadNotarizedReference(
  token: string,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the notarized file to upload." }

  const check = validateFile({ name: file.name, size: file.size })
  if (!check.ok) return { error: check.errors[0] ?? "That file can't be uploaded." }

  if (!rateLimit(`r:${token}`, 10)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: req } = await admin
    .from("reference_requests")
    .select("id, reference_id, case_id, status, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!req || !tokenActive(req)) return { error: "This link is invalid or has expired." }

  const { data: kase } = await admin.from("cases").select("client_id").eq("id", req.case_id).single()
  if (!kase?.client_id) return { error: "Case not found." }

  const documentId = randomUUID()
  const path = `clients/${kase.client_id}/${documentId}/${check.sanitizedName}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true })
  if (upErr) return { error: "Upload failed. Please try again." }

  await admin.from("documents").insert({
    id: documentId, case_id: req.case_id, client_id: kase.client_id,
    type: "reference_letter", status: "pending", file_path: path, file_name: check.sanitizedName, notarized: true,
  })
  await admin.from("character_references").update({ notarized: true, received: true }).eq("id", req.reference_id)
  await admin
    .from("reference_requests")
    .update({ status: "notarized", notarized_at: new Date().toISOString(), document_id: documentId })
    .eq("id", req.id)
  await recomputeReferenceRequirement(admin, req.case_id)

  await notifyParties(admin, req.case_id, {
    title: "A notarized reference was uploaded",
    body: "A character reference uploaded their notarized statement — it's now on the case.",
  })
  await admin.from("activity_log").insert({
    case_id: req.case_id, action: "reference.notarized", entity: "reference", entity_id: req.reference_id, detail: {} as never,
  })
  return { ok: true }
}
