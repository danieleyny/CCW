import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadAdminInstructors } from "@/lib/admin/instructors"
import { logActivity } from "@/lib/activity"
import { InstructorsWorkspace } from "@/components/admin/instructors-workspace"

export const metadata = { title: { absolute: "Instructors · Staff" } }
const TABS = new Set(["all", "needs_verification", "setting_up", "live", "inactive"])

export default async function AdminInstructorsPage({ searchParams }: { searchParams: Promise<{ tab?: string; i?: string }> }) {
  const [{ profile }, params] = await Promise.all([requireStaff(), searchParams])
  const tab = TABS.has(params.tab ?? "") ? params.tab! : "all"
  const rows = await loadAdminInstructors(await createClient())
  await logActivity({ action: "admin_instructors_viewed", entity: "instructor", detail: { tab } })
  return <InstructorsWorkspace rows={rows} role={profile.role} initialTab={tab as "all" | "needs_verification" | "setting_up" | "live" | "inactive"} initialSelected={params.i ?? null} />
}
