"use server"

import { createClient } from "@/lib/supabase/server"

/** Mark all of the signed-in user's notifications read (RLS scopes to them). */
export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient", user.id)
    .eq("read", false)
}
