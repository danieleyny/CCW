"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/activity"
import { ONBOARDING_ACKNOWLEDGEMENTS } from "@/content/trainer-onboarding"

/**
 * PART C / Phase 13 — record that an instructor agreed to the platform rules.
 *
 * Server-side we re-check that EVERY acknowledgement was ticked, so a
 * hand-crafted request can't shortcut the gate. Only then do we stamp
 * onboarding_completed_at — the column the escalation guard deliberately leaves
 * self-settable (the instructor completes their own). (No graded quiz — agreeing
 * to every rule is the gate.)
 */
export async function completeOnboarding(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  await requireRole(["instructor"])

  // Every rule agreed to?
  for (const a of ONBOARDING_ACKNOWLEDGEMENTS) {
    if (formData.get(`ack_${a.key}`) !== "on") {
      return { error: "Please agree to every rule before continuing." }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not signed in." }

  const { error } = await supabase
    .from("instructors")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("profile_id", user.id)
  if (error) return { error: error.message }

  await logActivity({ action: "instructor.onboarding_completed", entity: "instructor" })
  revalidatePath("/instructor")
  revalidatePath("/instructor/onboarding")
  return { ok: true }
}
