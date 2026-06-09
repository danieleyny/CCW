import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * The signed-in client's active case + client record. RLS guarantees a client
 * only ever sees their own row, so we just take the first. Returns null if the
 * client has no case yet (freshly created lead with no case, etc.).
 */
export async function getMyCase() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select(
      "id, stage, status, nypd_app_ref, target_file_date, license_expires_on, client_id, clients(id, full_name, email, phone, borough, track)"
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const client = data.clients as unknown as {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    borough: string | null
    track: string
  }
  return { ...data, client }
}

export type MyCase = NonNullable<Awaited<ReturnType<typeof getMyCase>>>
