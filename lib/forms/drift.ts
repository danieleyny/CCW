import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { createHash } from "node:crypto"

type DB = SupabaseClient<Database>

/**
 * Freshness is a real risk: these official forms carry revision dates and change
 * without notice (M-522 is Rev 05/10; the cohabitant affidavit was revised
 * 11/16/2023). A stale form is a rejected filing. This re-fetches each source_url,
 * compares its sha256 to the file we hold, and records the result in
 * form_template_checks. A row with matched=false is the DRIFT FLAG — we NEVER
 * auto-swap a template; a changed official form needs a human to look at what
 * changed.
 */
export async function runFormTemplateDriftCheck(admin: DB): Promise<{ checked: number; drifted: string[] }> {
  const { data: rows } = await admin.from("form_templates").select("key, source_url, sha256").eq("active", true)
  const drifted: string[] = []

  for (const r of rows ?? []) {
    let fetchedSha: string | null = null
    let matched = false
    let note: string | null = null
    try {
      const res = await fetch(r.source_url, { redirect: "follow" })
      const ct = res.headers.get("content-type") ?? ""
      if (res.ok && ct.includes("pdf")) {
        const buf = new Uint8Array(await res.arrayBuffer())
        fetchedSha = createHash("sha256").update(buf).digest("hex")
        matched = fetchedSha === r.sha256
      } else {
        note = `unexpected response: HTTP ${res.status} (${ct || "no content-type"})`
      }
    } catch (e) {
      note = e instanceof Error ? e.message : String(e)
    }
    await admin
      .from("form_template_checks")
      .insert({ template_key: r.key, fetched_sha256: fetchedSha, matched, note })
    if (!matched) drifted.push(r.key)
  }

  return { checked: rows?.length ?? 0, drifted }
}
