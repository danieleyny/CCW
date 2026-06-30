"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { getSignaturePng, isReasonableSignature } from "@/lib/signatures"
import { affirmationOfUnderstanding, socialMediaDisclosure } from "@/lib/forms/documents"
import { formatSocialAccounts, type WizardAnswers } from "@/lib/intake/answers"

/** Save the applicant's e-signature; downloaded forms then come pre-signed. */
export async function saveApplicantSignature(base64: string): Promise<{ ok?: boolean; error?: string }> {
  await requireRole(["client"])
  if (!isReasonableSignature(base64)) return { error: "Please draw or type your signature first." }
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("signatures")
    .upsert({ case_id: myCase.id, signer_key: "applicant", png_base64: base64 }, { onConflict: "case_id,signer_key" })
  if (error) return { error: error.message }

  await logActivity({ action: "signature.saved", caseId: myCase.id, entity: "signature" })
  revalidatePath("/portal/forms")
  return { ok: true }
}

const SIGNABLE: Record<string, { reqCode: string; docType: "affirmation_understanding" | "social_media_list" }> = {
  affirmation: { reqCode: "AFF-01", docType: "affirmation_understanding" },
  "social-media": { reqCode: "SOC-01", docType: "social_media_list" },
}

/**
 * "Sign & file" a signature-only form: generate the signed PDF, store it as a
 * document, and mark the requirement satisfied — fully completed in-system.
 */
export async function fileSignedForm(key: string): Promise<{ ok?: boolean; error?: string }> {
  await requireRole(["client"])
  const target = SIGNABLE[key]
  if (!target) return { error: "This form can't be auto-filed." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }
  const supabase = await createClient()

  const sig = await getSignaturePng(supabase, myCase.id, "applicant")
  if (!sig) return { error: "Add your signature first, then file." }

  const { data: session } = await supabase.from("intake_sessions").select("answers").eq("case_id", myCase.id).maybeSingle()
  const answers = (session?.answers ?? {}) as WizardAnswers
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  const applicant = myCase.client.full_name

  const pdf =
    key === "affirmation"
      ? await affirmationOfUnderstanding(applicant, dateStr, sig)
      : await socialMediaDisclosure(applicant, formatSocialAccounts(answers), dateStr, sig)

  const clientId = myCase.client_id
  const documentId = randomUUID()
  const fileName = `${key}-signed.pdf`
  const path = `clients/${clientId}/${documentId}/${fileName}`

  const admin = createAdminClient()
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, new Uint8Array(pdf), { contentType: "application/pdf", upsert: true })
  if (upErr) return { error: "Couldn't save the document. Try again." }

  await admin.from("documents").insert({
    id: documentId, case_id: myCase.id, client_id: clientId,
    type: target.docType, status: "pending", file_path: path, file_name: fileName,
  })
  await admin
    .from("case_requirements")
    .update({ status: "satisfied", document_id: documentId, notes: "signed in-system" })
    .eq("case_id", myCase.id)
    .eq("req_code", target.reqCode)
    .in("status", ["pending", "na"])

  await logActivity({ action: "form.signed_filed", caseId: myCase.id, entity: "document", entityId: documentId, detail: { key } })
  revalidatePath("/portal/forms")
  revalidatePath("/portal/checklist")
  return { ok: true }
}
