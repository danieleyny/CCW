import { TrackView } from "@/components/analytics/track-view"
import { ConciergeWorkspace } from "@/components/admin/concierge-workspace"
import { requireStaff } from "@/lib/auth"
import { loadConciergeBoard, type ConciergeTab } from "@/lib/concierge/board"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: { absolute: "Concierge · Staff" } }

const VALID_TABS = new Set<ConciergeTab>(["enrolled", "leads", "team"])

export default async function ConciergeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; agent?: string; showHidden?: string }>
}) {
  const [{ profile }, query] = await Promise.all([requireStaff(), searchParams])
  const tab = VALID_TABS.has(query.tab as ConciergeTab) ? query.tab as ConciergeTab : "enrolled"
  const agentFilter = query.agent?.trim() || "anyone"
  const supabase = await createClient()
  const data = await loadConciergeBoard(supabase, {
    currentUserId: profile.id,
    agentFilter,
    showHidden: query.showHidden === "1",
  })

  return (
    <>
      <TrackView event="admin_concierge_viewed" params={{ tab, agentFilter }} />
      <ConciergeWorkspace data={data} tab={tab} canEdit={profile.role === "admin"} />
    </>
  )
}
