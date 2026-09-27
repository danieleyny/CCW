import "server-only"

import { randomBytes } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { materializeSponsorPacket } from "@/lib/requirements/materialize"
import { resolveFacts } from "@/lib/facts/resolve"
import { identityResolved } from "@/lib/facts/identity"
import { seedOperatorBlockers } from "@/lib/sponsor/operator-blockers"

/**
 * Provisioning, split so a company can add a SECOND worker (S1). The old
 * provisionSponsor baked in three first-case assumptions — always a new company,
 * always a new rep account, applicant must already exist. These three functions
 * separate the concerns so it can be called again for the same company; each takes
 * the ADMIN client (minting a privileged role stays service-role only — the one path
 * allowed to set role='sponsor'). None of this is a sponsor-facing read path.
 */

type DB = SupabaseClient<Database>
const origin = () => process.env.NEXT_PUBLIC_SITE_URL ?? ""

/**
 * Find an existing company by legal name (case-insensitive) or create one.
 * IDEMPOTENT — a second worker for ISS Action never splits into a second company.
 * The §5-06 gun custodian is company-level: set it when the company is first created
 * or when it's still missing; never silently overwrite a confirmed custodian.
 */
export async function ensureSponsorCompany(
  admin: DB,
  input: { companyName: string; custodianName?: string; custodianLicenseNumber?: string }
): Promise<{ sponsorId?: string; error?: string }> {
  const companyName = input.companyName.trim()
  if (!companyName) return { error: "Company name is required." }

  const { data: existing } = await admin.from("sponsors").select("id, custodian_name, custodian_license_number").ilike("legal_name", companyName).maybeSingle()
  if (existing) {
    // Backfill the custodian only if it isn't set yet — don't clobber a confirmed one.
    const patch: { custodian_name?: string; custodian_license_number?: string } = {}
    if (input.custodianName && !existing.custodian_name) patch.custodian_name = input.custodianName.trim()
    if (input.custodianLicenseNumber && !existing.custodian_license_number) patch.custodian_license_number = input.custodianLicenseNumber.trim()
    if (Object.keys(patch).length) await admin.from("sponsors").update(patch).eq("id", existing.id)
    return { sponsorId: existing.id }
  }

  const { data: created, error } = await admin
    .from("sponsors")
    .insert({
      legal_name: companyName,
      custodian_name: input.custodianName?.trim() || null,
      custodian_license_number: input.custodianLicenseNumber?.trim() || null,
    })
    .select("id")
    .single()
  if (error || !created) return { error: "Couldn't create the company record." }
  return { sponsorId: created.id }
}

async function findAuthUserId(admin: DB, email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase())?.id ?? null
}

/**
 * Find the rep for this company by email, or mint one. Reuses an existing account
 * (a rep with a second worker no longer fails on "email already in use"): if the
 * account is unbound we bind it to this company; if it's already bound to a DIFFERENT
 * company we refuse rather than silently rebind. tempPassword is returned ONLY when a
 * new account was minted.
 */
export async function ensureSponsorRep(
  admin: DB,
  input: { sponsorId: string; repName: string; repEmail: string }
): Promise<{ repId?: string; tempPassword?: string; error?: string }> {
  const repEmail = input.repEmail.trim().toLowerCase()
  const repName = input.repName.trim()
  if (!repEmail || !repName) return { error: "Rep name and email are required." }

  const existingId = await findAuthUserId(admin, repEmail)
  if (existingId) {
    const { data: prof } = await admin.from("profiles").select("sponsor_id, role").eq("id", existingId).maybeSingle()
    if (prof?.sponsor_id && prof.sponsor_id !== input.sponsorId) {
      return { error: "That email already belongs to a representative of a different company." }
    }
    if (!prof?.sponsor_id) {
      await admin.from("profiles").update({ role: "sponsor", sponsor_id: input.sponsorId, full_name: repName }).eq("id", existingId)
    }
    return { repId: existingId }
  }

  const tempPassword = randomBytes(9).toString("base64url")
  const { data: created, error } = await admin.auth.admin.createUser({
    email: repEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: repName },
  })
  if (error || !created.user) return { error: "Couldn't create the rep account." }
  await admin.from("profiles").update({ role: "sponsor", sponsor_id: input.sponsorId, full_name: repName }).eq("id", created.user.id)
  return { repId: created.user.id, tempPassword }
}

/**
 * Bind a worker to a sponsor: create the applicant's clients+cases rows if they don't
 * exist yet, create the case↔sponsor binding with a fresh opaque invite token, seed
 * the operator blockers, and materialise the company packet. Scope stays whatever the
 * caller passes (staff choose; the request only requests). The invite is HELD — never
 * surfaced as ready — until the applicant's exact legal name is resolved (a wrong name
 * is a rejection); that's a staff task, already seeded, not a rep failure. The return
 * reports identityResolved so the approver knows whether the invite may go out.
 */
export async function addSponsoredWorker(
  admin: DB,
  input: {
    sponsorId: string
    repId: string
    repEmail: string
    repName: string
    scope: "packet_only" | "assist" | "full"
    actorId: string | null
    /** An existing case to bind (provisionSponsor path). Omit to create the worker. */
    caseId?: string
    applicantEmail?: string
    applicantName?: string
  }
): Promise<{ caseId?: string; sponsorshipId?: string; inviteUrl?: string; identityResolved?: boolean; error?: string }> {
  let caseId = input.caseId
  let clientId: string | null = null

  if (!caseId) {
    const applicantEmail = (input.applicantEmail ?? "").trim().toLowerCase()
    if (!applicantEmail) return { error: "Applicant email is required to create a worker." }
    // Reuse the applicant's existing client+case if there is one; otherwise create both.
    const { data: client } = await admin.from("clients").select("id").ilike("email", applicantEmail).maybeSingle()
    if (client) {
      clientId = client.id
      const { data: kase } = await admin
        .from("cases")
        .select("id")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      caseId = kase?.id
    }
    if (!clientId) {
      const { data: newClient, error: cErr } = await admin
        .from("clients")
        .insert({
          full_name: input.applicantName?.trim() || applicantEmail,
          email: applicantEmail,
          track: "resident",
          current_stage: "lead",
          lead_source: "sponsor",
          profile_id: null,
        })
        .select("id")
        .single()
      if (cErr || !newClient) return { error: "Couldn't create the applicant record." }
      clientId = newClient.id
    }
    if (!caseId) {
      // A sponsored armed-guard case: category resolves at intake; concierge is
      // unlocked by the sponsorship itself, not a purchase.
      const { data: newCase, error: kErr } = await admin
        .from("cases")
        .insert({ client_id: clientId, stage: "lead", service_mode: "concierge", license_track: "sponsored_unresolved" })
        .select("id")
        .single()
      if (kErr || !newCase) return { error: "Couldn't create the worker's case." }
      caseId = newCase.id
    }
  }

  // One binding per (case, sponsor).
  const { data: dupe } = await admin.from("case_sponsorships").select("id").eq("case_id", caseId).eq("sponsor_id", input.sponsorId).maybeSingle()
  if (dupe) return { error: "This worker is already sponsored by this company." }

  const token = randomBytes(24).toString("base64url")
  const { data: binding, error: bErr } = await admin
    .from("case_sponsorships")
    .insert({
      case_id: caseId,
      sponsor_id: input.sponsorId,
      rep_profile_id: input.repId,
      invited_email: input.repEmail.trim().toLowerCase(),
      invited_name: input.repName.trim(),
      invite_token: token,
      scope: input.scope,
      status: "invited",
    })
    .select("id")
    .single()
  if (bErr || !binding) return { error: "Couldn't create the sponsorship binding." }

  await materializeSponsorPacket(admin, caseId!)
  await seedOperatorBlockers(admin, caseId!, input.actorId)

  const facts = await resolveFacts(admin, caseId!)
  const idResolved = identityResolved(facts)

  return {
    caseId,
    sponsorshipId: binding.id,
    // The invite is only "ready" once the legal name is resolved; the approver holds it otherwise.
    inviteUrl: idResolved ? `${origin()}/invite/${token}` : undefined,
    identityResolved: idResolved,
  }
}
