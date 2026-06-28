"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { sendEmail } from "@/lib/email"
import { newReferenceToken } from "@/lib/references/process"

/** Send (or re-send) a tokenized self-serve link to a character reference. */
export async function sendReferenceRequest(formData: FormData) {
  await requireRole(["client", "staff", "admin"])
  const referenceId = String(formData.get("referenceId") ?? "")

  const supabase = await createClient()
  const { data: ref } = await supabase
    .from("character_references")
    .select("id, case_id, name, contact_email")
    .eq("id", referenceId)
    .maybeSingle()
  if (!ref) throw new Error("Reference not found")
  if (!ref.contact_email) throw new Error("Add an email for this reference first")

  const admin = createAdminClient()
  let token: string
  const { data: existing } = await admin
    .from("reference_requests")
    .select("id, token")
    .eq("reference_id", referenceId)
    .maybeSingle()
  if (existing) {
    token = existing.token
    await admin
      .from("reference_requests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", existing.id)
  } else {
    token = newReferenceToken()
    await admin.from("reference_requests").insert({
      reference_id: referenceId,
      case_id: ref.case_id,
      token,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const link = `${base}/r/${token}`
  await sendEmail({
    to: ref.contact_email,
    subject: "Character reference request — CARRY",
    html: `<div style="font-family:sans-serif;line-height:1.5">
      <p>Hi ${ref.name},</p>
      <p>An applicant listed you as a character reference for their NYC concealed-carry
      license. Please confirm and attest below — it takes a minute, no account needed:</p>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#666;font-size:12px">— ${"CARRY"}</p>
    </div>`,
    text: `Confirm your character reference: ${link}`,
  })

  await logActivity({
    action: "reference.request_sent",
    caseId: ref.case_id,
    entity: "reference",
    entityId: referenceId,
  })
  revalidatePath("/portal/people")
}
