import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { hasVisibleInk } from "@/lib/pdf/png"

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

/**
 * Is this actually somebody's signature?
 *
 * Size bounds alone let a 1x1 transparent PNG through — which then gets scaled
 * into a solid block on the signature line. So we also decode it and check there
 * is real ink with real dimensions behind it.
 */
export function isReasonableSignature(base64: string): boolean {
  if (typeof base64 !== "string" || base64.length <= 80 || base64.length >= 1_400_000) return false
  try {
    return hasVisibleInk(new Uint8Array(Buffer.from(base64, "base64")))
  } catch {
    return false
  }
}
