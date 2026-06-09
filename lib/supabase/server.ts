import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/types"

/**
 * Server Supabase client bound to the request's cookie session. RLS applies as
 * the signed-in user. In Next 16 `cookies()` is async, so this is too.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In Server Components, set() throws — safe to ignore because the
          // proxy (proxy.ts) refreshes the session cookie on every request.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // no-op
          }
        },
      },
    }
  )
}
