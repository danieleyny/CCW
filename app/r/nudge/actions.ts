"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { inviteReference } from "@/lib/outreach"
import { rateLimit } from "@/lib/rate-limit"

/**
 * One-click "remind this reference" — the action behind the button in the
 * applicant's reference-unfilled reminder email. Token-scoped and login-free
 * (the capability IS the token), like every /r and /c public flow.
 *
 * The token here is `reference_requests.nudge_token`, NOT the reference's own
 * fill-token — resolving it, we re-send the reference their invite via the one
 * outreach helper (which refreshes the link and re-emails it).
 */
export async function sendReferenceNudge(
  nudgeToken: string
): Promise<{ ok?: boolean; emailed?: boolean; hadEmail?: boolean; referenceName?: string; error?: string }> {
  if (!rateLimit(`nudge:${nudgeToken}`, 5)) {
    return { error: "That reminder was just sent — please wait a minute before sending another." }
  }
  const admin = createAdminClient()
  const { data: req } = await admin
    .from("reference_requests")
    .select("id, reference_id, status, character_references(name)")
    .eq("nudge_token", nudgeToken)
    .maybeSingle()
  if (!req) return { error: "This reminder link is invalid or has expired." }

  const referenceName = (req.character_references as unknown as { name: string } | null)?.name ?? "your reference"

  // Already done — nothing to nudge, and say so plainly.
  if (req.status === "notarized" || req.status === "submitted") {
    return { ok: true, emailed: false, hadEmail: true, referenceName }
  }

  const result = await inviteReference(admin, req.reference_id)
  if (!result) return { error: "We couldn't find that reference anymore." }

  return { ok: true, emailed: result.emailed, hadEmail: result.hadEmail, referenceName }
}
