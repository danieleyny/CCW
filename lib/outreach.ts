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
import { renderEmail } from "@/lib/email/template"
import { newReferenceToken, tokenExpiry } from "@/lib/references/process"
import { brand } from "@/config/brand"

type DB = SupabaseClient<Database>

const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

/**
 * The applicant's name, for the invite email — a recipient who instantly sees
 * WHO added them is far more likely to act than one greeted by "an applicant".
 * Same join the token pages (/r, /c) already use. Null when unresolvable, so
 * callers fall back to the impersonal wording rather than sending "undefined".
 */
async function applicantNameFor(admin: DB, caseId: string): Promise<string | null> {
  const { data: kase } = await admin.from("cases").select("clients(full_name)").eq("id", caseId).maybeSingle()
  const name = (kase?.clients as unknown as { full_name: string } | null)?.full_name?.trim()
  return name || null
}

export interface InviteResult {
  /** The private link, whether or not email delivery was possible. */
  link: string
  /** True only when an email was actually delivered (provider accepted it). */
  emailed: boolean
  /**
   * True when there was an address on file to send to — even if delivery then
   * failed. Lets callers tell "no email on file" (applicant must copy the link)
   * apart from "we tried to email but it didn't go" (a delivery/config problem).
   */
  hadEmail: boolean
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
  if (!ref.contact_email) return { link, emailed: false, hadEmail: false }

  const applicant = await applicantNameFor(admin, ref.case_id)
  const { html, text } = renderEmail({
    // Lead with WHO asked — that's the line the inbox preview shows.
    preheader: applicant
      ? `${applicant} asked you to be a character reference — confirm in about a minute.`
      : "Confirm your character reference for a NYC carry-license application — takes a minute.",
    eyebrow: "Action needed",
    heading: applicant ? `${applicant} listed you as a character reference` : "Confirm your character reference",
    paragraphs: [
      `Hi ${ref.name},`,
      `${applicant ?? "An applicant"} listed you as a character reference for their NYC concealed-carry license. Please confirm and attest — it takes a minute, and no account is needed. We'll build a ready-to-notarize letter from your answers.`,
    ],
    cta: { label: "Confirm your reference →", url: link },
    footnote: "This secure link expires in 30 days. If you weren't expecting this, you can ignore this email.",
    recipientReason: "You received this because an applicant listed you as a character reference.",
  })
  const res = await sendEmail({ to: ref.contact_email, subject: `Character reference request — ${brand.name}`, html, text })
  // emailed reflects ACTUAL delivery, not "an address exists": if the send was a
  // no-op (no key) or errored, the applicant is told to copy the link instead.
  return { link, emailed: res.skipped === false && !("error" in res), hadEmail: true }
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
    // sent_at mirrors reference_requests: it stamps every (re)send, so the
    // 3/7-day reminder clock and the "invited" state track the LAST invite.
    .update({ token, token_expires_at: tokenExpiry(), token_revoked_at: null, sent_at: new Date().toISOString() })
    .eq("id", cohab.id)

  const link = `${siteBase()}/c/${token}`
  if (!cohab.contact_email) return { link, emailed: false, hadEmail: false }

  const applicant = await applicantNameFor(admin, cohab.case_id)
  const { html, text } = renderEmail({
    // Lead with WHO listed them — that's the line the inbox preview shows.
    preheader: applicant
      ? `${applicant} listed you as a household member — complete a short affidavit.`
      : "Confirm and complete your cohabitant affidavit — no account needed.",
    eyebrow: "Action needed",
    heading: applicant ? `${applicant} listed you as a household member` : "Complete your cohabitant affidavit",
    paragraphs: [
      `Hi ${cohab.name},`,
      applicant
        ? `${applicant} listed you as a household member on their NYC concealed-carry license application. Please confirm and complete a short affidavit — no account needed, and we'll build a ready-to-notarize document for you.`
        : "You were listed as a household member on a NYC concealed-carry license application. Please confirm and complete a short affidavit — no account needed, and we'll build a ready-to-notarize document for you.",
    ],
    cta: { label: "Complete your affidavit →", url: link },
    footnote: "This secure link expires in 30 days. If you weren't expecting this, you can ignore this email.",
    recipientReason: "You received this because an applicant listed you as a member of their household.",
  })
  const res = await sendEmail({ to: cohab.contact_email, subject: `Please complete a cohabitant affidavit — ${brand.name}`, html, text })
  // emailed reflects ACTUAL delivery (see inviteReference).
  return { link, emailed: res.skipped === false && !("error" in res), hadEmail: true }
}
