import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadConciergeQueue, type QueueTone } from "@/lib/concierge/queue"
import { stageMeta } from "@/config/stages"
import { ConciergeTeam, type StaffMember } from "@/components/admin/concierge-team"

export const metadata = { title: "Concierge" }

const TONE_CLASS: Record<QueueTone, string> = {
  attention: "border-brass/40 bg-brass/10 text-brass-bright",
  progress: "border-signal/30 bg-signal-dim text-signal",
  waiting: "border-hairline bg-surface-2 text-text-mid",
}

/**
 * CONCIERGE Tranche 3 — the concierge operations hub: the work-queue (what needs
 * a hand, worst-first) over the team roster.
 */
export default async function ConciergeHubPage() {
  const auth = await requireStaff()
  const canEdit = auth.profile.role === "admin"

  const supabase = await createClient()
  const queue = await loadConciergeQueue(supabase)
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
          The done-for-you operation — which cases need a hand, and who runs them.
        </p>
      </div>

      {/* Phase 10 — the work-queue */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-low">Work queue</h2>
          <span className="text-xs text-text-low">
            {queue.length} active case{queue.length === 1 ? "" : "s"}
          </span>
        </div>
        {queue.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline bg-card p-6 text-center text-sm text-text-mid">
            No active concierge cases right now.
          </p>
        ) : (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-card">
            {queue.map((r) => (
              <li key={r.caseId}>
                <Link
                  href={`/admin/cases/${r.caseId}`}
                  className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-2/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.clientName}</div>
                    <div className="mt-0.5 text-xs text-text-low">
                      {stageMeta(r.stage).label}
                      {r.agentName && <> · {r.agentName}</>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[r.tone]}`}>
                      {r.label}
                    </span>
                    <ArrowRight className="size-4 text-text-low" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
