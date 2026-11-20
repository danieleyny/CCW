import { redirect } from "next/navigation"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadAdminInstructors } from "@/lib/admin/instructors"
import { InstructorVerificationDesk } from "@/components/admin/instructor-verification-desk"

export const metadata = { title: { absolute: "Instructor verification · Staff" } }
export default async function VerifyInstructorPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const [{ profile }, params] = await Promise.all([requireStaff(), searchParams])
  if (profile.role !== "admin") redirect("/admin/instructors")
  return <InstructorVerificationDesk key={params.i ?? "first"} rows={await loadAdminInstructors(await createClient())} selectedId={params.i ?? null} />
}
