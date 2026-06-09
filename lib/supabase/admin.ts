import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

/**
 * Service-role Supabase client — BYPASSES RLS. Server-only. Use sparingly for
 * privileged operations: creating auth users, the seed script, and the Stripe
 * webhook. Never import this into a Client Component.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
