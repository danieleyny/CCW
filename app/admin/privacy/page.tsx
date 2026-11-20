import { PrivacyWorkspace } from "@/components/admin/privacy-workspace"
import { logActivity } from "@/lib/activity"
import { loadAdminPrivacy } from "@/lib/admin/privacy"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: { absolute: "Privacy · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>
type PrivacyTab = "retention" | "erasure" | "closed"

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminPrivacyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requireStaff()
  const params = await searchParams
  const requestedTab = first(params.tab)
  const tab: PrivacyTab = requestedTab === "erasure" || requestedTab === "closed" ? requestedTab : "retention"
  const requestedId = first(params.r) ?? null
  const review = first(params.review) === "1"
  const showAllLog = first(params.all) === "1"
  const db = await createClient()
  const data = await loadAdminPrivacy(db, {
    isAdmin: profile.role === "admin",
    selectedId: requestedId,
  })

  await logActivity({
    action: "admin_privacy_viewed",
    entity: "admin_privacy",
    detail: { tab },
  })

  return <PrivacyWorkspace data={data} tab={tab} explicitSelection={!!requestedId} review={review} showAllLog={showAllLog} />
}
