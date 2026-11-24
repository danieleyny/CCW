import type { SupabaseClient } from "@supabase/supabase-js"
import type { BrandKey } from "@/config/brands"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/** Resolve outbound identity from the case, never from an untrusted form value. */
export async function caseBrandFor(db: DB, caseId: string): Promise<BrandKey> {
  const { data } = await db.from("cases").select("brand").eq("id", caseId).maybeSingle()
  return data?.brand ?? "gln"
}
