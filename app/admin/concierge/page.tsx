import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { ConciergeTeam, type StaffMember } from "@/components/admin/concierge-team"

export const metadata = { title: "Concierge" }

/**
 * CONCIERGE Tranche 3 — the concierge operations hub. Phase 8 ships the team
 * roster; Phase 10 adds the work-queue above it.
 */
export default async function ConciergeHubPage() {
  const auth = await requireStaff()
  const canEdit = auth.profile.role === "admin"

  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_concierge_agent")
    .in("role", ["staff", "admin"])
    .order("full_name")

  const staff: StaffMember[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role,
    isAgent: p.is_concierge_agent,
  }))
  const agentCount = staff.filter((s) => s.isAgent).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Concierge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The done-for-you operation — who runs it, and which cases need a hand.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-low">
            Concierge team
          </h2>
          <span className="text-xs text-text-low">
            {agentCount} agent{agentCount === 1 ? "" : "s"}
          </span>
        </div>
        <p className="max-w-prose text-sm text-text-mid">
          Concierge agents are the staff who run done-for-you cases. It&apos;s a label for assignment and
          the work-queue — not a permission change; every staff member can already work any case.
          {!canEdit && " Only an admin can change the roster."}
        </p>
        <ConciergeTeam staff={staff} canEdit={canEdit} />
      </section>
    </div>
  )
}
