/**
 * Populate public.form_templates from the code registry + the on-disk PDFs.
 * Provenance + drift baseline: records each template's official title, source URL,
 * and the sha256 of the file we hold. Idempotent (upsert by key).
 *
 *   ENV_FILE=.env.prod tsx scripts/register-form-templates.ts   # hosted
 *   tsx scripts/register-form-templates.ts                       # local
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: process.env.ENV_FILE || ".env.local" })

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { FORM_TEMPLATES } from "../lib/forms/templates"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
const db = createClient(URL, KEY, { auth: { persistSession: false } })

async function main() {
  const now = new Date().toISOString()
  for (const t of Object.values(FORM_TEMPLATES)) {
    const bytes = readFileSync(join(process.cwd(), "assets", "form-templates", t.file))
    const sha256 = createHash("sha256").update(bytes).digest("hex")
    const { error } = await db.from("form_templates").upsert(
      {
        key: t.key,
        official_title: t.officialTitle,
        form_number: t.formNumber ?? null,
        revision: t.revision ?? null,
        issuing_authority: t.issuingAuthority,
        source_url: t.sourceUrl,
        storage_path: t.file,
        sha256,
        is_fillable: t.isFillable,
        verified_at: now,
        active: true,
      },
      { onConflict: "key" }
    )
    if (error) throw new Error(`${t.key}: ${error.message}`)
    console.log(`✓ ${t.key.padEnd(32)} ${sha256.slice(0, 12)}  ${t.file}`)
  }
  console.log(`\nRegistered ${Object.keys(FORM_TEMPLATES).length} templates on ${URL}`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
