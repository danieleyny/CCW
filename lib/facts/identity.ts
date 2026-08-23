/**
 * Legal-name + packet-identity integrity (3F).
 *
 * The applicant's legal name is resolved from case_facts (confirmed against an
 * identity document / the applicant), never inferred from a display name or email
 * (guarded in lib/facts/registry). Until the legal name is present, we must not
 * generate a government form or send a sponsor invitation carrying the wrong name
 * — a wrong legal first name is a rejection, and the wrong spelling has already
 * propagated once.
 *
 * Because every form fills from the ONE fact layer (Pass 2), name / DOB / address
 * are identical across a packet by construction; the only way they drift is a
 * SIGNED document generated from an older fact snapshot — which Pass 2 already
 * marks `stale`. So the packet-identity check reduces to: the identity facts are
 * present, and no signed generated document is stale.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { resolveFacts } from "./resolve"

type DB = SupabaseClient<Database>

/** Is the applicant's legal name resolved (present, not inferred)? */
export function identityResolved(facts: Record<string, string>): boolean {
  return !!(facts["applicant.legalFirstName"]?.trim() && facts["applicant.legalLastName"]?.trim())
}

export interface IdentityIssues {
  resolved: boolean
  issues: string[]
}

/**
 * Staff-facing packet identity check: the legal name / DOB / address that every
 * generated document shares, plus any signed document made stale by a later fact
 * change. Empty `issues` ⇒ the packet is internally consistent.
 */
export async function packetIdentityIssues(db: DB, caseId: string): Promise<IdentityIssues> {
  const facts = await resolveFacts(db, caseId)
  const issues: string[] = []
  if (!facts["applicant.legalFirstName"]?.trim() || !facts["applicant.legalLastName"]?.trim())
    issues.push("Legal name is not confirmed — resolve it from the applicant's photo ID before generating forms.")
  if (!facts["applicant.dob"]?.trim()) issues.push("Date of birth is missing.")
  if (!facts["applicant.address.street"]?.trim()) issues.push("Address is missing.")

  const { count } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("generated", true)
    .eq("stale", true)
  if ((count ?? 0) > 0)
    issues.push(`${count} generated document(s) are out of date after a details change — regenerate so names/dates match across the packet.`)

  return { resolved: identityResolved(facts), issues }
}
