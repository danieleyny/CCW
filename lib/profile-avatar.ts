import "server-only"

import { createClient } from "@/lib/supabase/server"

/** Mint a short-lived URL only for the authenticated viewer allowed by RLS. */
export async function getProfileAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const db = await createClient()
  const { data, error } = await db.storage.from("avatars").createSignedUrl(path, 60 * 60)
  return error ? null : data.signedUrl
}
