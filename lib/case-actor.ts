import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyCase } from "@/lib/portal"
import { loadSponsorCase } from "@/lib/sponsor/queries"

/**
 * WHO may act on a case, resolved once so the SAME server action serves both the
 * applicant and a full-scope sponsor (no forked sponsor-only actions that drift).
 *
 * Two actors reach these actions:
 *   • the owning CLIENT — writes go through their RLS-scoped client, exactly as
 *     before; the caseId is derived from getMyCase() and any passed one must match.
 *   • a full-scope SPONSOR rep — authorized here via the RLS-backed sponsor view
 *     (active + consented + non-revoked + scope='full'); their writes go through
 *     the admin client, because a sponsor has no direct table grants. The
 *     authorization IS this check, so it must be exact.
 *
 * THE LINE THAT DOES NOT MOVE: this grants write/prepare access only. It never
 * grants the acts that are legally the applicant's — signing/adopting a sworn
 * statement (signRequirementDocument stays client-only), the final submit, or
 * changing consent/scope. Those are enforced in their own actions, not here.
 */
export interface CaseActor {
  profileId: string
  clientId: string
  caseId: string
  actor: "client" | "sponsor"
  /** Applicant full name — for document prefills / generated-doc headers. */
  clientName: string
  /** RLS client for the owner; admin client for a full-scope sponsor. */
  db: SupabaseClient<Database>
}

/**
 * Resolve the acting party for a case. Returns null (caller returns a generic
 * error) when the visitor may not act. `caseId` is required for a sponsor and
 * optional for the owner (derived from their single case).
 */
export async function authorizeCaseActor(caseId?: string): Promise<CaseActor | null> {
  const auth = await requireUser()
  const role = auth.profile.role

  if (role === "client") {
    const myCase = await getMyCase()
    if (!myCase) return null
    if (caseId && caseId !== myCase.id) return null // never let a client target another case
    return {
      profileId: auth.userId,
      clientId: myCase.client_id,
      caseId: myCase.id,
      actor: "client",
      clientName: myCase.client.full_name,
      db: await createClient(),
    }
  }

  if (role === "sponsor") {
    if (!caseId) return null
    const scope = await loadSponsorCase(caseId) // active + consented + non-revoked binding
    if (!scope || scope.scope !== "full") return null
    const admin = createAdminClient()
    const { data: kase } = await admin
      .from("cases")
      .select("client_id, clients:client_id(full_name)")
      .eq("id", caseId)
      .maybeSingle()
    if (!kase?.client_id) return null
    const clientName = (kase.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"
    return { profileId: auth.userId, clientId: kase.client_id, caseId, actor: "sponsor", clientName, db: admin }
  }

  return null
}
