/**
 * FMT-01, enforced where it can't be bypassed.
 *
 * The browser validates a file before uploading it, but the browser is the
 * caller's machine: `recordDocument` is a server action that can be invoked
 * directly with any path and any filename, and the storage write happens from
 * the client too. So the server re-checks the object THAT ACTUALLY LANDED —
 * its real size, and the name we're about to record — and removes it if it
 * doesn't belong.
 *
 * We normalize rather than reject wherever we safely can: a dirty filename gets
 * cleaned (the NYPD portal silently rejects those), and only size/type — which
 * we can't fix server-side without re-encoding — refuse.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { validateFile } from "@/lib/files/validator"

type DB = SupabaseClient<Database>

export class UploadRejected extends Error {}

/**
 * The true size of an object already in storage. `list` on the object's own
 * folder reads its metadata without pulling the bytes back down.
 */
export async function storedObjectSize(admin: DB, path: string): Promise<number | null> {
  const slash = path.lastIndexOf("/")
  const { data } = await admin.storage
    .from("documents")
    .list(path.slice(0, slash), { search: path.slice(slash + 1) })
  const found = data?.find((o) => o.name === path.slice(slash + 1))
  const size = (found?.metadata as { size?: number } | null)?.size
  return typeof size === "number" ? size : null
}

/**
 * Validate an uploaded object server-side. Returns the filename to record.
 * Throws UploadRejected — and deletes the object — if it can't be accepted.
 */
export async function enforceUploadedFile(
  admin: DB,
  args: { path: string; fileName: string }
): Promise<string> {
  const size = await storedObjectSize(admin, args.path)
  const check = validateFile({ name: args.fileName, size: size ?? 0 })

  if (size === null || !check.ok) {
    // Service role: the client's own RLS let them write here, so a rejected
    // object has to be removed by us or it lingers unreferenced in the bucket.
    await admin.storage.from("documents").remove([args.path])
    throw new UploadRejected(
      size === null ? "The uploaded file wasn't found." : (check.errors[0] ?? "That file can't be uploaded.")
    )
  }
  return check.sanitizedName
}
