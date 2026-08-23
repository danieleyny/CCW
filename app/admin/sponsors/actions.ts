"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireStaff } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/activity"
import { materializeSponsorPacket } from "@/lib/requirements/materialize"
import { resolveFacts } from "@/lib/facts/resolve"
import { identityResolved } from "@/lib/facts/identity"
import { seedOperatorBlockers } from "@/lib/sponsor/operator-blockers"

/**
 * Staff provisions a sponsorship: the company, a rep account (role='sponsor',
 * minted here via the service role — the ONLY path allowed to set a privileged
 * role), and the case↔sponsor binding with an opaque invite token. Scope defaults
 * to packet_only unless the owner deliberately widens it — a row someone chose,
 * never a default nobody noticed. The applicant must still consent before the rep
 * sees anything.
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
  // Operator blocker #2 (§5-06): the designated gun custodian gates the whole
  // case, so it must be confirmed BEFORE a live invitation goes out.
  const custodianName = String(formData.get("custodianName") ?? "").trim()
  const custodianLicense = String(formData.get("custodianLicenseNumber") ?? "").trim()
  if (!companyName || !repName || !repEmail || !applicantEmail) {
    return { error: "Company, rep name, rep email, and applicant email are all required." }
  }
  if (!custodianName || !custodianLicense) {
    return { error: "Confirm the designated NYPD gun custodian (name + licence number) before inviting — §5-06 gates the case." }
  }

  const admin = createAdminClient()

  // Find the applicant's case by email.
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

  // The company, with its confirmed gun custodian.
  const { data: sponsor, error: sErr } = await admin
    .from("sponsors")
    .insert({ legal_name: companyName, custodian_name: custodianName, custodian_license_number: custodianLicense })
    .select("id")
    .single()
  if (sErr || !sponsor) return { error: "Couldn't create the company record." }

  // The rep account. New email only (a dark first-case assumption); on collision,
  // ask for a fresh address rather than silently binding an existing account.
  const tempPassword = randomBytes(9).toString("base64url")
  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email: repEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: repName },
  })
  if (uErr || !created.user) {
    return { error: "Couldn't create the rep account (is the email already in use?)." }
  }
  const repId = created.user.id
  // Elevate to sponsor + bind to the company (service-role role write).
  await admin.from("profiles").update({ role: "sponsor", sponsor_id: sponsor.id, full_name: repName }).eq("id", repId)

  const token = randomBytes(24).toString("base64url")
  const { data: sponsorship, error: bErr } = await admin
    .from("case_sponsorships")
    .insert({
      case_id: kase.id,
      sponsor_id: sponsor.id,
      rep_profile_id: repId,
      invited_email: repEmail,
      invited_name: repName,
      invite_token: token,
      scope,
      status: "invited",
    })
    .select("id")
    .single()
  if (bErr || !sponsorship) return { error: "Couldn't create the sponsorship binding." }

  // Seed the company packet now, so the rep can start immediately (even before the
  // applicant's category resolves).
  await materializeSponsorPacket(admin, kase.id)

  // Surface the operator blockers as OUR staff tasks (owned by the provisioner) —
  // never applicant failures. Custodian + legal name are already confirmed above.
  await seedOperatorBlockers(admin, kase.id, userId)

  await logActivity({
    action: "sponsor.provisioned",
    caseId: kase.id,
    clientId: client.id,
    entity: "case_sponsorship",
    entityId: sponsorship.id,
    detail: { company: companyName, rep: repName, scope },
  })

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  revalidatePath("/admin/sponsors")
  return { inviteUrl: `${origin}/invite/${token}`, tempPassword }
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
