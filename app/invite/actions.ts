"use server"

import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

/**
 * Bind the signed-in rep to their sponsorship via the SECURITY DEFINER RPC, then
 * route into the sponsor surface. The RPC sets rep_profile_id + profiles.sponsor_id
 * but NEVER the role — self-elevation to 'sponsor' is blocked by guard_profile_role,
 * so a sponsor account is always admin-provisioned first. Convenience, not security:
 * every downstream read is RLS/view-scoped regardless of how the visitor arrived.
 */
export async function acceptSponsorInvite(token: string): Promise<{ error?: string }> {
  const { profile } = await requireUser()
  const db = await createClient()
  const { data: caseId, error } = await db.rpc("sponsor_accept_invite", { p_token: token })
  if (error || !caseId) return { error: "This invitation is no longer valid." }
  if (profile.role !== "sponsor") {
    // The binding is recorded, but the account hasn't been set up as a sponsor
    // yet. That's a Gun License NYC step, not something the rep can self-serve.
    return {
      error:
        "Your access is still being set up by Gun License NYC. You'll be able to continue once that's done.",
    }
  }
  redirect(`/sponsor/${caseId}`)
}
