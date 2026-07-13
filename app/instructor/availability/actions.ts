"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { myInstructorId } from "@/lib/instructor"

export async function addSlot(formData: FormData) {
  await requireRole(["instructor"])
  const id = await myInstructorId()
  if (!id) throw new Error("Instructor profile not found")

  const type = String(formData.get("type") ?? "combined_18h")
  const startsAt = String(formData.get("startsAt") ?? "")
  const endsAt = String(formData.get("endsAt") ?? "")
  const capacity = Number(formData.get("capacity") ?? 1)
  const locationId = String(formData.get("locationId") ?? "")
  if (!startsAt || !endsAt) throw new Error("Start and end are required")

  const supabase = await createClient()
  const { error } = await supabase.from("availability_slots").insert({
    instructor_id: id,
    location_id: locationId || null,
    type: type as never,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
  })
  if (error) throw error
  revalidatePath("/instructor/availability")
}

export async function removeSlot(formData: FormData) {
  await requireRole(["instructor"])
  const slotId = String(formData.get("slotId") ?? "")
  const supabase = await createClient()
  const { error } = await supabase.from("availability_slots").delete().eq("id", slotId)
  if (error) throw error
  revalidatePath("/instructor/availability")
}
