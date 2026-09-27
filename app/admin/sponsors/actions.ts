"use server"

import { revalidatePath } from "next/cache"
import { requireStaff } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/activity"
import { resolveFacts } from "@/lib/facts/resolve"
import { identityResolved } from "@/lib/facts/identity"
import { ensureSponsorCompany, ensureSponsorRep, addSponsoredWorker } from "@/lib/sponsor/provision"

/**
 * Staff provisions a sponsorship: the company, a rep account (role='sponsor',
 * minted via the service role — the ONLY path allowed to set a privileged role), and
 * the case↔sponsor binding with an opaque invite token. Scope defaults to packet_only
 * unless the owner deliberately widens it. The applicant must still consent before the
 * rep sees anything.
 *
 * This is now a thin composition of ensureSponsorCompany / ensureSponsorRep /
 * addSponsoredWorker (S1) — same form contract, same result — but idempotent: it no
 * longer duplicates a company or fails when the rep already exists. Its first-case
 * strictness is preserved here: the applicant must already exist and their exact legal
 * name must be resolved before this path issues an invite.
 */
export async function provisionSponsor(
  formData: FormData
): Promise<{ inviteUrl?: string; tempPassword?: string; error?: string }> {
  const { userId } = await requireStaff()
  const companyName = String(formData.get("companyName") ?? "").trim()
  const repName = String(formData.get("repName") ?? "").trim()
  const repEmail = String(formData.get("repEmail") ?? "").trim().toLowerCase()
  const applicantEmail = String(formData.get("applicantEmail") ?? "").trim().toLowerCase()
  const scope = String(formData.get("scope") ?? "packet_only") as "packet_only" | "assist" | "full"
  // Operator blocker #2 (§5-06): the designated gun custodian gates the whole case, so
  // it must be confirmed BEFORE a live invitation goes out.
  const custodianName = String(formData.get("custodianName") ?? "").trim()
  const custodianLicense = String(formData.get("custodianLicenseNumber") ?? "").trim()
  if (!companyName || !repName || !repEmail || !applicantEmail) {
    return { error: "Company, rep name, rep email, and applicant email are all required." }
  }
  if (!custodianName || !custodianLicense) {
    return { error: "Confirm the designated NYPD gun custodian (name + licence number) before inviting — §5-06 gates the case." }
  }

  const admin = createAdminClient()

  // Find the applicant's case by email (this path REQUIRES an existing applicant).
  const { data: client } = await admin.from("clients").select("id").ilike("email", applicantEmail).maybeSingle()
  if (!client) return { error: `No applicant found for ${applicantEmail}.` }
  const { data: kase } = await admin
    .from("cases")
    .select("id")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!kase) return { error: "That applicant has no case yet." }

  // Operator blocker #9: the applicant's exact legal name must be resolved (never
  // inferred from a display name / email) before a form or an invite carries it.
  const facts = await resolveFacts(admin, kase.id)
  if (!identityResolved(facts)) {
    return { error: "Confirm the applicant's exact legal name (from their photo ID) before inviting — a wrong legal name is a rejection." }
  }

  const company = await ensureSponsorCompany(admin, { companyName, custodianName, custodianLicenseNumber: custodianLicense })
  if (company.error || !company.sponsorId) return { error: company.error ?? "Couldn't create the company record." }

  const rep = await ensureSponsorRep(admin, { sponsorId: company.sponsorId, repName, repEmail })
  if (rep.error || !rep.repId) return { error: rep.error }

  const worker = await addSponsoredWorker(admin, {
    sponsorId: company.sponsorId,
    repId: rep.repId,
    repEmail,
    repName,
    scope,
    actorId: userId,
    caseId: kase.id, // existing, identity already resolved above → invite is ready
  })
  if (worker.error || !worker.sponsorshipId) return { error: worker.error ?? "Couldn't create the sponsorship binding." }

  await logActivity({
    action: "sponsor.provisioned",
    caseId: kase.id,
    clientId: client.id,
    entity: "case_sponsorship",
    entityId: worker.sponsorshipId,
    detail: { company: companyName, rep: repName, scope },
  })

  revalidatePath("/admin/sponsors")
  return { inviteUrl: worker.inviteUrl, tempPassword: rep.tempPassword }
}

/**
 * Staff approve a sponsor's worker request → run the full worker provisioning with the
 * admin client (the rep never touches it). Scope defaults to what the rep requested,
 * but staff may pass a different granted scope. Returns the invite URL only when the
 * new worker's legal name is already resolved; otherwise the invite is held and the
 * seeded legal-name task is the next step.
 */
export async function approveWorkerRequest(
  formData: FormData
): Promise<{ inviteUrl?: string; tempPassword?: string; identityResolved?: boolean; error?: string }> {
  const { userId } = await requireStaff()
  const requestId = String(formData.get("requestId") ?? "").trim()
  const grantedScope = String(formData.get("scope") ?? "").trim() as "packet_only" | "assist" | "full" | ""
  if (!requestId) return { error: "Request id is required." }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("sponsor_worker_requests")
    .select("id, sponsor_id, requested_by, applicant_name, applicant_email, requested_scope, status")
    .eq("id", requestId)
    .maybeSingle()
  if (!req) return { error: "Request not found." }
  if (req.status !== "pending") return { error: "This request has already been resolved." }

  // The requesting rep's identity, for the binding's consent-screen fields.
  const { data: rep } = await admin.from("profiles").select("id, full_name").eq("id", req.requested_by).maybeSingle()
  if (!rep) return { error: "The requesting representative no longer exists." }
  const repUser = (await admin.auth.admin.getUserById(req.requested_by)).data.user
  const repEmail = repUser?.email ?? ""

  const worker = await addSponsoredWorker(admin, {
    sponsorId: req.sponsor_id,
    repId: rep.id,
    repEmail,
    repName: rep.full_name ?? "Your representative",
    scope: (grantedScope || req.requested_scope) as "packet_only" | "assist" | "full",
    actorId: userId,
    applicantEmail: req.applicant_email,
    applicantName: req.applicant_name,
  })
  if (worker.error) return { error: worker.error }

  await admin
    .from("sponsor_worker_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", requestId)
  await logActivity({
    action: "sponsor.worker_request_approved",
    caseId: worker.caseId,
    entity: "sponsor_worker_request",
    entityId: requestId,
    detail: { applicant: req.applicant_name, scope: grantedScope || req.requested_scope },
  })
  revalidatePath("/admin/sponsors")
  // No tempPassword — the requesting rep already has an account.
  return { inviteUrl: worker.inviteUrl, identityResolved: worker.identityResolved }
}

/** Staff decline a worker request, with a reason. */
export async function declineWorkerRequest(formData: FormData): Promise<{ ok?: true; error?: string }> {
  const { userId } = await requireStaff()
  const requestId = String(formData.get("requestId") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()
  if (!requestId) return { error: "Request id is required." }
  if (reason.length < 3) return { error: "A short reason is required." }

  const admin = createAdminClient()
  const { data: req } = await admin.from("sponsor_worker_requests").select("id, status").eq("id", requestId).maybeSingle()
  if (!req) return { error: "Request not found." }
  if (req.status !== "pending") return { error: "This request has already been resolved." }

  await admin
    .from("sponsor_worker_requests")
    .update({ status: "declined", decline_reason: reason, resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", requestId)
  await logActivity({ action: "sponsor.worker_request_declined", entity: "sponsor_worker_request", entityId: requestId, detail: { reason } })
  revalidatePath("/admin/sponsors")
  return { ok: true }
}

/** Staff override of a case's derived licence track (License Division beats our
 *  inference). Required note; logged. */
export async function setCaseTrack(formData: FormData): Promise<{ ok?: true; error?: string }> {
  await requireStaff()
  const caseId = String(formData.get("caseId") ?? "").trim()
  const track = String(formData.get("track") ?? "") as
    | "concealed_carry"
    | "carry_guard"
    | "special_carry_guard"
    | "sponsored_unresolved"
  const note = String(formData.get("note") ?? "").trim()
  if (!caseId || !track) return { error: "Case and track are required." }
  if (note.length < 5) return { error: "A note explaining the override is required." }

  // Update via the staff member's own client so it's their authenticated action.
  const db = await createClient()
  const { error } = await db.from("cases").update({ license_track: track }).eq("id", caseId)
  if (error) return { error: "Couldn't update the track." }
  await logActivity({
    action: "case.track_override",
    caseId,
    entity: "case",
    entityId: caseId,
    detail: { track, note },
  })
  revalidatePath("/admin/sponsors")
  return { ok: true }
}
