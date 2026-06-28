import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"

/** Post-login dispatcher: route each role to its home surface. */
export default async function DashboardPage() {
  const { profile } = await requireUser()
  redirect(
    profile.role === "client"
      ? "/portal"
      : profile.role === "instructor"
        ? "/instructor"
        : "/admin"
  )
}
