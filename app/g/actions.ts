"use server"

import { randomUUID } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateFile } from "@/lib/files/validator"
import { sniffFileType } from "@/lib/files/magic"
import { notifyCaseParties } from "@/lib/notify"
import { rateLimit } from "@/lib/rate-limit"
import { safeguardTokenActive } from "@/lib/safeguard/invite"

/** Stamp the first open of a safeguard link (best-effort; drives "opened" state). */
export async function markSafeguardOpened(token: string): Promise<void> {
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("safeguard_invites")
    .select("id, opened_at, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (invite && !invite.opened_at && safeguardTokenActive(invite)) {
    await admin.from("safeguard_invites").update({ opened_at: new Date().toISOString() }).eq("id", invite.id)
  }
}

/**
 * The safeguard person uploads the SIGNED (witnessed) acknowledgement. We store it,
 * bind it to SFG-01 for staff review, and mark the invite complete. This form is
 * witnessed, not notarized — so `notarized` stays false.
 */
export async function uploadSignedSafeguard(token: string, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the signed file to upload." }
  const check = validateFile({ name: file.name, size: file.size })
  if (!check.ok) return { error: check.errors[0] ?? "That file can't be uploaded." }

  if (!rateLimit(`g:${token}`, 10)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("safeguard_invites")
    .select("id, case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!invite || !safeguardTokenActive(invite)) return { error: "This link is invalid or has expired." }

  const { data: kase } = await admin.from("cases").select("client_id").eq("id", invite.case_id).single()
  if (!kase?.client_id) return { error: "Case not found." }

  const documentId = randomUUID()
  const path = `clients/${kase.client_id}/${documentId}/${check.sanitizedName}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const sniff = sniffFileType(bytes)
  if (!sniff) return { error: "That file isn't a valid PDF or image. Upload a PDF, JPG, PNG, or HEIC." }
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: sniff.contentType, upsert: true })
  if (upErr) return { error: "Upload failed. Please try again." }

  await admin.from("documents").insert({
    id: documentId,
    case_id: invite.case_id,
    client_id: kase.client_id,
    req_code: "SFG-01",
    type: "safeguard_acknowledgement",
    status: "pending",
    file_path: path,
    file_name: check.sanitizedName,
  })
  // Bind it to SFG-01 for staff review (pending, not auto-satisfied) — a witnessed
  // government form is verified before it counts.
  await admin
    .from("case_requirements")
    .update({ status: "pending", document_id: documentId, notes: "Signed acknowledgement uploaded by the safeguard person — under review." })
    .eq("case_id", invite.case_id)
    .eq("req_code", "SFG-01")
    .in("status", ["pending", "na"])
  await admin
    .from("safeguard_invites")
    .update({ status: "signed", completed_at: new Date().toISOString(), document_id: documentId })
    .eq("id", invite.id)

  await notifyCaseParties(admin, invite.case_id, {
    title: "The safeguard acknowledgement was uploaded",
    body: "The person designated to safeguard the firearm(s) uploaded their signed acknowledgement — it's now on the case for review.",
  })
  return { ok: true }
}
