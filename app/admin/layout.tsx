import type { Metadata } from "next"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadAdminNavCounts } from "@/lib/admin/nav-counts"
import { AdminShell } from "@/components/admin/admin-shell"
import { NotificationBell } from "@/components/shared/notification-bell"
import { AccountActions } from "@/components/auth/account-actions"
import "../portal/portal-v2.css"

export const metadata: Metadata = {
  title: { default: "Today · Staff", template: "%s · Staff" },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Real authorization (proxy only does the optimistic signed-in check).
  const { profile } = await requireStaff()
  // Best-effort operational badges never block the authenticated shell.
  const supabase = await createClient()
  const counts = await loadAdminNavCounts(supabase, profile.id, profile.role).catch(() => ({}))
  const name = profile.full_name || "Staff"

  return (
    <AdminShell
      counts={counts}
      name={name}
      role={profile.role}
      notification={<NotificationBell />}
      accountActions={<AccountActions />}
    >
      {children}
    </AdminShell>
  )
}
