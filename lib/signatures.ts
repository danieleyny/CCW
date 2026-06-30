import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/** Load a signer's captured signature as PNG bytes (for stamping into a PDF). */
export async function getSignaturePng(db: DB, caseId: string, signerKey: string): Promise<Uint8Array | undefined> {
  const { data } = await db
    .from("signatures")
    .select("png_base64")
    .eq("case_id", caseId)
    .eq("signer_key", signerKey)
    .maybeSingle()
  if (!data?.png_base64) return undefined
  return new Uint8Array(Buffer.from(data.png_base64, "base64"))
}

/** Basic sanity check on a captured signature payload (non-empty, not huge). */
export function isReasonableSignature(base64: string): boolean {
  return typeof base64 === "string" && base64.length > 80 && base64.length < 1_400_000
}
