/**
 * One-off repair: generated documents that were stored as type 'id'.
 *
 * The document engine shipped with `type: doc.documentType ?? "id"`, so every
 * generated document without a matching enum value landed in the Government
 * photo ID slot. Migration 20260718000700 added real types and deleted the
 * fallback; this re-types the rows already written.
 *
 * Deletes nothing. Only touches rows with generated = true, and never touches a
 * genuine IDN-01 upload.
 *
 * Usage:
 *   pnpm exec tsx scripts/repair-generated-doc-types.ts            # local
 *   ENV_FILE=/path/to/prod-env pnpm exec tsx scripts/repair-generated-doc-types.ts
 *   DRY=1 ...                                                      # report only
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const envFile = process.env.ENV_FILE ?? ".env.local"
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]
    })
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.env.DRY === "1"

/** req_code → the type the document should have had. */
const BY_REQ: Record<string, string> = {
  "DSC-01": "disclosure_addendum",
  "QUE-01": "disclosure_addendum",
  "ARR-01": "arrest_statement",
  "OOP-01": "order_of_protection_statement",
  "DIR-01": "domestic_incident_statement",
  WORKSHEET: "application_worksheet",
}
/** The ARR-01 companion letter shares its req_code — disambiguate by filename. */
const BY_FILENAME: Record<string, string> = {
  "certificate-of-disposition-requests.pdf": "court_request_letter",
}

async function main() {
  const { data: rows, error } = await admin
    .from("documents")
    .select("id, case_id, type, req_code, file_name, generated")
    .eq("generated", true)
    .eq("type", "id")
  if (error) throw error

  console.log(`Scanning ${envFile} → ${rows?.length ?? 0} generated document(s) stored as type 'id'`)
  if (!rows?.length) {
    console.log("Nothing to repair. ✓")
    return
  }

  let fixed = 0
  const unresolved: string[] = []
  for (const r of rows) {
    // A real IDN-01 upload is never generated, but belt-and-braces.
    if (r.req_code === "IDN-01" || r.req_code === "IDN-02" || r.req_code === "IDN-03") continue

    const target = (r.file_name && BY_FILENAME[r.file_name]) || (r.req_code ? BY_REQ[r.req_code] : undefined)
    if (!target) {
      unresolved.push(`${r.id} (req_code=${r.req_code ?? "null"}, file=${r.file_name ?? "null"})`)
      continue
    }
    console.log(`  ${r.file_name ?? r.id}: id → ${target}${DRY ? "  [dry-run]" : ""}`)
    if (!DRY) {
      const { error: upErr } = await admin
        .from("documents")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ type: target as any })
        .eq("id", r.id)
      if (upErr) throw upErr
    }
    fixed++
  }

  console.log(`\nRepaired ${fixed} row(s)${DRY ? " (dry run — nothing written)" : ""}.`)
  if (unresolved.length) {
    console.log(`Could not resolve ${unresolved.length} row(s) — left untouched for manual review:`)
    for (const u of unresolved) console.log(`  ${u}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
