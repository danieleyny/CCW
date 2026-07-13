"use server"

import { randomUUID } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateFile } from "@/lib/files/validator"
import { notifyCaseParties } from "@/lib/notify"
import { recomputeCohabitantRequirement } from "@/lib/cohabitants/process"
import { isReasonableSignature } from "@/lib/signatures"
import { tokenActive } from "@/lib/references/process"
import { rateLimit } from "@/lib/rate-limit"

/** V3-P0.4 — map cohabitants' token_* columns onto the shared guard. */
const cohabTokenActive = (c: { token_expires_at?: string | null; token_revoked_at?: string | null }) =>
  tokenActive({ expires_at: c.token_expires_at, revoked_at: c.token_revoked_at })

/** Capture the cohabitant's e-signature; the affidavit PDF then comes pre-signed. */
export async function saveCohabitantSignature(token: string, base64: string): Promise<{ ok?: boolean; error?: string }> {
  if (!isReasonableSignature(base64)) return { error: "Please draw or type your signature first." }
  if (!rateLimit(`c:${token}`)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!cohab || !cohabTokenActive(cohab)) return { error: "This link is invalid or has expired." }
  const { error } = await admin
    .from("signatures")
    .upsert({ case_id: cohab.case_id, signer_key: `cohabitant:${cohab.id}`, png_base64: base64 }, { onConflict: "case_id,signer_key" })
  if (error) return { error: error.message }
  return { ok: true }
}

/** Step 1 — the cohabitant confirms + attests; we mark the affidavit "received". */
export async function submitCohabitantAnswers(
  token: string,
  answers: Record<string, string>,
  notaryArea: string
): Promise<{ ok?: boolean; error?: string; alreadyDone?: boolean }> {
  if (!rateLimit(`c:${token}`)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, case_id, affidavit_status, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!cohab || !cohabTokenActive(cohab)) return { error: "This link is invalid or has expired." }
  if (cohab.affidavit_status === "notarized") return { ok: true, alreadyDone: true }

  const firstTime = cohab.affidavit_status !== "received"
  await admin
    .from("cohabitants")
    .update({ answers: answers as never, notary_area: notaryArea || null, affidavit_status: "received" })
    .eq("id", cohab.id)
  await recomputeCohabitantRequirement(admin, cohab.case_id)

  if (firstTime) {
    await notifyCaseParties(admin, cohab.case_id, {
      title: "A cohabitant confirmed their affidavit",
      body: "A household member completed their affidavit and is getting it notarized.",
    })
  }
  return { ok: true }
}

/** Step 2 — the cohabitant uploads the notarized affidavit (service-role storage). */
export async function uploadNotarizedCohabitant(
  token: string,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the notarized file to upload." }
  const check = validateFile({ name: file.name, size: file.size })
  if (!check.ok) return { error: check.errors[0] ?? "That file can't be uploaded." }

  if (!rateLimit(`c:${token}`, 10)) return { error: "Too many requests — please wait a minute and try again." }
  const admin = createAdminClient()
  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!cohab || !cohabTokenActive(cohab)) return { error: "This link is invalid or has expired." }

  const { data: kase } = await admin.from("cases").select("client_id").eq("id", cohab.case_id).single()
  if (!kase?.client_id) return { error: "Case not found." }

  const documentId = randomUUID()
  const path = `clients/${kase.client_id}/${documentId}/${check.sanitizedName}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true })
  if (upErr) return { error: "Upload failed. Please try again." }

  await admin.from("documents").insert({
    id: documentId, case_id: cohab.case_id, client_id: kase.client_id,
    type: "cohabitant_affidavit", status: "pending", file_path: path, file_name: check.sanitizedName, notarized: true,
  })
  await admin
    .from("cohabitants")
    .update({ affidavit_status: "notarized", notarized_at: new Date().toISOString(), document_id: documentId })
    .eq("id", cohab.id)
  await recomputeCohabitantRequirement(admin, cohab.case_id)

  await notifyCaseParties(admin, cohab.case_id, {
    title: "A notarized cohabitant affidavit was uploaded",
    body: "A household member uploaded their notarized affidavit — it's now on the case.",
  })
  return { ok: true }
}
