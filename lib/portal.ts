import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * The signed-in client's active case + client record. RLS guarantees a client
 * only ever sees their own row, so we just take the first. Returns null if the
 * client has no case yet (freshly created lead with no case, etc.).
 */
export async function getMyCase() {
  const supabase = await createClient()

  // A4e — bind to THIS login's applicant record explicitly, not RLS alone: a
  // shared device or a future multi-client account must never surface someone
  // else's case just because it sorted first.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: mine } = await supabase.from("clients").select("id").eq("profile_id", user.id)
  const clientIds = (mine ?? []).map((c) => c.id)
  if (clientIds.length === 0) return null

  const { data } = await supabase
    .from("cases")
    .select(
      "id, stage, status, nypd_app_ref, target_file_date, license_expires_on, is_renewal, client_id, clients(id, full_name, email, phone, borough, track)"
    )
    .in("client_id", clientIds)
    // Deterministic "current case": newest, tie-broken by id, so this and
    // provisioning (lib/onboarding.ts) always agree on the same canonical case.
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
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
