/**
 * Tokenized outreach: the one place a reference or household member gets their
 * private link minted and mailed.
 *
 * This logic lived only inside the /portal/people form actions, so the checklist
 * had no way to invite anybody — which is half of why COH-01 and REF-01 were
 * dead ends there. Both surfaces now call these.
 *
 * A resend rotates a revoked token and always resets the 30-day window, so a
 * link someone lost can be killed and reissued without touching anything else.
 *
 * NOTE ON DELIVERY: with no Resend key configured, sendEmail logs instead of
 * sending. The link is still minted and shown in the portal for the applicant to
 * copy — the invitation is never silently lost.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { sendEmail } from "@/lib/email"
import { newReferenceToken, tokenExpiry } from "@/lib/references/process"
import { brand } from "@/config/brand"

type DB = SupabaseClient<Database>

const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export interface InviteResult {
  /** The private link, whether or not email delivery was possible. */
  link: string
  /** False when there's no email on file — the applicant shares the link instead. */
  emailed: boolean
}

/** Mint (or rotate) a reference's link and email it if we have an address. */
export async function inviteReference(admin: DB, referenceId: string): Promise<InviteResult | null> {
  const { data: ref } = await admin
    .from("character_references")
    .select("id, case_id, name, contact_email")
    .eq("id", referenceId)
    .maybeSingle()
  if (!ref) return null

  const { data: existing } = await admin
    .from("reference_requests")
    .select("id, token, revoked_at")
    .eq("reference_id", referenceId)
    .maybeSingle()

  let token: string
  if (existing) {
    token = existing.revoked_at ? newReferenceToken() : existing.token
    await admin
      .from("reference_requests")
      .update({
        token,
        status: "sent",
        sent_at: new Date().toISOString(),
        expires_at: tokenExpiry(),
        revoked_at: null,
      })
      .eq("id", existing.id)
  } else {
    token = newReferenceToken()
    await admin.from("reference_requests").insert({
      reference_id: referenceId,
      case_id: ref.case_id,
      token,
      status: "sent",
      sent_at: new Date().toISOString(),
      expires_at: tokenExpiry(),
    })
  }

  const link = `${siteBase()}/r/${token}`
  if (!ref.contact_email) return { link, emailed: false }

  await sendEmail({
    to: ref.contact_email,
    subject: `Character reference request — ${brand.name}`,
    html: `<div style="font-family:sans-serif;line-height:1.5">
      <p>Hi ${ref.name},</p>
      <p>An applicant listed you as a character reference for their NYC concealed-carry
      license. Please confirm and attest below — it takes a minute, no account needed:</p>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#666;font-size:12px">— ${brand.name}</p>
    </div>`,
    text: `Confirm your character reference: ${link}`,
  })
  return { link, emailed: true }
}

/** Mint (or rotate) a household member's link and email it if we have an address. */
export async function inviteCohabitant(admin: DB, cohabitantId: string): Promise<InviteResult | null> {
  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, case_id, name, contact_email, token, token_revoked_at")
    .eq("id", cohabitantId)
    .maybeSingle()
  if (!cohab) return null

  const token = !cohab.token || cohab.token_revoked_at ? newReferenceToken() : cohab.token
  await admin
    .from("cohabitants")
    .update({ token, token_expires_at: tokenExpiry(), token_revoked_at: null })
    .eq("id", cohab.id)

  const link = `${siteBase()}/c/${token}`
  if (!cohab.contact_email) return { link, emailed: false }

  await sendEmail({
    to: cohab.contact_email,
    subject: `Please complete a cohabitant affidavit — ${brand.name}`,
    html: `<div style="font-family:sans-serif;line-height:1.5">
      <p>Hi ${cohab.name},</p>
      <p>Please confirm and complete your cohabitant affidavit here — no account needed:</p>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#666;font-size:12px">— ${brand.name}</p>
    </div>`,
    text: `Complete your cohabitant affidavit: ${link}`,
  })
  return { link, emailed: true }
}
