import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { newReferenceToken, tokenExpiry, tokenActive } from "@/lib/references/process"
import { resolveFacts } from "@/lib/facts/resolve"
import { renderEmail } from "@/lib/email/template"
import { sendEmail } from "@/lib/email"
import { brand } from "@/config/brand"

type DB = SupabaseClient<Database>

const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

/** Is a safeguard invite's token still usable? */
export const safeguardTokenActive = (i: { token_expires_at?: string | null; token_revoked_at?: string | null }) =>
  tokenActive({ expires_at: i.token_expires_at, revoked_at: i.token_revoked_at })

export interface SafeguardInviteRow {
  id: string
  case_id: string
  email: string
  token: string | null
  token_expires_at: string | null
  token_revoked_at: string | null
  status: string
  document_id: string | null
  sent_at: string | null
  opened_at: string | null
  completed_at: string | null
}

/** The current (most recent) safeguard invite for a case, if any. */
export async function loadSafeguardInvite(db: DB, caseId: string): Promise<SafeguardInviteRow | null> {
  const { data } = await db
    .from("safeguard_invites")
    .select("id, case_id, email, token, token_expires_at, token_revoked_at, status, document_id, sent_at, opened_at, completed_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as SafeguardInviteRow | null) ?? null
}

async function applicantNameFor(admin: DB, caseId: string): Promise<string | null> {
  const { data } = await admin.from("cases").select("clients:client_id(full_name)").eq("id", caseId).maybeSingle()
  return (data?.clients as unknown as { full_name?: string } | null)?.full_name ?? null
}

/** The fill values for the NYPD safeguard acknowledgement, from the case's facts. */
export async function safeguardFillValues(admin: DB, caseId: string): Promise<Record<string, unknown>> {
  const f = await resolveFacts(admin, caseId)
  return {
    applicantName: f["applicant.fullName"] ?? "",
    safeguardFirstName: f["safeguard.firstName"] ?? "",
    safeguardLastName: f["safeguard.lastName"] ?? "",
    safeguardStreet: f["safeguard.street"] ?? "",
    safeguardApt: f["safeguard.apt"] ?? "",
    safeguardCity: f["safeguard.city"] ?? "",
    safeguardZip: f["safeguard.zip"] ?? "",
    safeguardCellPhone: f["safeguard.phone"] ?? "",
  }
}

export interface InviteResult {
  link: string
  emailed: boolean
  hadEmail: boolean
}

/**
 * Create (or re-send) the tokenized self-service link for the safeguard person.
 * Reuses the latest invite row for the case, minting a fresh token if none/revoked.
 * Mirrors inviteCohabitant — but this acknowledgement is WITNESSED, not notarized.
 */
export async function inviteSafeguard(admin: DB, caseId: string, email: string): Promise<InviteResult | null> {
  const clean = (email || "").trim()
  if (!clean) return null

  const existing = await loadSafeguardInvite(admin, caseId)
  const token = existing?.token && !existing.token_revoked_at ? existing.token : newReferenceToken()

  if (existing) {
    await admin
      .from("safeguard_invites")
      .update({ email: clean, token, token_expires_at: tokenExpiry(), token_revoked_at: null, sent_at: new Date().toISOString() })
      .eq("id", existing.id)
  } else {
    await admin
      .from("safeguard_invites")
      .insert({ case_id: caseId, email: clean, token, token_expires_at: tokenExpiry(), sent_at: new Date().toISOString() })
  }

  const link = `${siteBase()}/g/${token}`
  const applicant = await applicantNameFor(admin, caseId)
  const { html, text } = renderEmail({
    preheader: applicant
      ? `${applicant} designated you to safeguard their firearm(s) — sign a short acknowledgement.`
      : "Complete a short safeguarding acknowledgement — no account needed.",
    eyebrow: "Action needed",
    heading: applicant ? `${applicant} asked you to safeguard their firearm(s)` : "Complete your safeguarding acknowledgement",
    paragraphs: [
      "Hello,",
      applicant
        ? `${applicant} designated you as the person who will safeguard and surrender their firearm(s) if they die or become incapacitated, on their NYC firearm-license application. Please confirm and complete a short NYPD acknowledgement — no account needed. We build the form for you; you sign it in front of a witness (not a notary) and upload it.`
        : "You were designated as the person who will safeguard and surrender an applicant's firearm(s) on their NYC firearm-license application. Please confirm and complete a short NYPD acknowledgement — no account needed. We build the form for you; you sign it in front of a witness (not a notary) and upload it.",
    ],
    cta: { label: "Complete your acknowledgement →", url: link },
    footnote: "This secure link expires in 30 days. If you weren't expecting this, you can ignore this email.",
    recipientReason: "You received this because an applicant designated you to safeguard their firearm(s).",
  })
  const res = await sendEmail({ to: clean, subject: `Please complete a safeguarding acknowledgement — ${brand.name}`, html, text })
  return { link, emailed: res.skipped === false && !("error" in res), hadEmail: true }
}
