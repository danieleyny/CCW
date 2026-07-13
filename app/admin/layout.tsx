import { requireStaff } from "@/lib/auth"
import { Sidebar } from "@/components/admin/sidebar"
import { Topbar } from "@/components/admin/topbar"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Real authorization (proxy only does the optimistic signed-in check).
  const { profile } = await requireStaff()

  return (
    <div className="dark flex min-h-svh bg-background text-foreground">
      <DarkBackdrop />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={profile.full_name || "Staff"} role={profile.role} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
