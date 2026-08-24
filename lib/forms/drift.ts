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

export interface TemplateWarning {
  key: string
  formNumber: string | null
  revision: string | null
  reason: string
}

/**
 * Staff-facing template warnings (3G): a template whose latest drift check found
 * the official source changed, or one not re-verified in a long time. Surfaced as
 * a visible warning — never an automatic swap. Already-finalised documents keep
 * the template sha256 they were made from, so this never invalidates them.
 */
export async function staleTemplateWarnings(db: DB): Promise<TemplateWarning[]> {
  const STALE_DAYS = 180
  const [{ data: templates }, { data: checks }] = await Promise.all([
    db.from("form_templates").select("key, form_number, revision, verified_at").eq("active", true),
    db.from("form_template_checks").select("template_key, matched, checked_at").order("checked_at", { ascending: false }),
  ])
  const latest = new Map<string, boolean>()
  for (const c of checks ?? []) if (!latest.has(c.template_key)) latest.set(c.template_key, c.matched)
  const now = Date.now()
  const out: TemplateWarning[] = []
  for (const t of templates ?? []) {
    const base = { key: t.key, formNumber: t.form_number, revision: t.revision }
    if (latest.get(t.key) === false) {
      out.push({ ...base, reason: "The official source changed since we last verified this form. Re-fetch and re-verify before filing." })
    } else if (t.verified_at && (now - new Date(t.verified_at).getTime()) / 86_400_000 > STALE_DAYS) {
      out.push({ ...base, reason: `Not re-verified in over ${STALE_DAYS} days — confirm it against the live source before filing.` })
    }
  }
  return out
}
