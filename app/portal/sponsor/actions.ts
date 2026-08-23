"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/activity"
import { SPONSOR_CONSENT_VERSION } from "@/config/sponsor-consent"

/**
 * The applicant's own consent + revocation. Both go through SECURITY DEFINER RPCs
 * that authorize the case owner (case_visible) — a sponsor can call neither. The
 * sponsor sees NOTHING until sponsor_record_consent activates the binding.
 */

export async function recordSponsorConsent(
  sponsorshipId: string,
  signerName: string
): Promise<{ ok?: true; error?: string }> {
  await requireRole(["client"])
  if (signerName.trim().length < 2) return { error: "Type your full name to consent." }
  const db = await createClient()
  const { error } = await db.rpc("sponsor_record_consent", {
    p_sponsorship_id: sponsorshipId,
    p_version: SPONSOR_CONSENT_VERSION,
  })
  if (error) return { error: "Couldn't record your consent. Please try again." }
  await logActivity({
    action: "sponsor.consent_granted",
    entity: "case_sponsorship",
    entityId: sponsorshipId,
    detail: { version: SPONSOR_CONSENT_VERSION, signer_name: signerName.trim() },
  })
  revalidatePath("/portal/sponsor")
  return { ok: true }
}

export async function revokeSponsor(sponsorshipId: string): Promise<{ ok?: true; error?: string }> {
  await requireRole(["client"])
  const db = await createClient()
  const { error } = await db.rpc("sponsor_revoke", { p_sponsorship_id: sponsorshipId })
  if (error) return { error: "Couldn't revoke access. Please try again." }
  await logActivity({
    action: "sponsor.access_revoked",
    entity: "case_sponsorship",
    entityId: sponsorshipId,
  })
  revalidatePath("/portal/sponsor")
  return { ok: true }
}
