"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { logActivity } from "@/lib/activity"

/** Verify / un-verify an instructor (gates whether clients can see them). */
export async function setInstructorVerified(formData: FormData) {
  await requireStaff()
  const id = String(formData.get("id") ?? "")
  const verified = formData.get("verified") === "true"

  const supabase = await createClient()
  const { error } = await supabase
    .from("instructors")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("id", id)
  if (error) throw error

  await logActivity({
    action: verified ? "instructor.verified" : "instructor.unverified",
    entity: "instructor",
    entityId: id,
  })
  revalidatePath("/admin/instructors")
}
