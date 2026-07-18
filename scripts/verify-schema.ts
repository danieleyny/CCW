/**
 * Does the database actually have the columns this build depends on?
 *
 * A migration that never got pushed doesn't fail at deploy — it fails later, in
 * a customer's face, as a raw PostgREST error. Run this against any environment
 * before or after a deploy; it exits non-zero with the exact `db push` command
 * when the database is behind.
 *
 *   pnpm exec tsx scripts/verify-schema.ts                       # local
 *   ENV_FILE=/private/tmp/ccw-prod-env pnpm exec tsx scripts/verify-schema.ts
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { REQUIRED_COLUMNS } from "../lib/schema-health"

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

async function main() {
  console.log(`Schema check → ${env.NEXT_PUBLIC_SUPABASE_URL}\n`)
  const missing: typeof REQUIRED_COLUMNS = []

  for (const c of REQUIRED_COLUMNS) {
    // Selecting the column is the honest test: it's exactly the path the app
    // takes, through the same PostgREST schema cache.
    const { error } = await admin.from(c.table).select(c.column).limit(1)
    if (error) {
      console.log(`✗ ${c.table}.${c.column}  — ${error.message}`)
      missing.push(c)
    } else {
      console.log(`✓ ${c.table}.${c.column}`)
    }
  }

  if (missing.length === 0) {
    console.log("\n✅ Database matches the deployed code.")
    return
  }

  console.log(`\n❌ ${missing.length} column(s) missing — the database is BEHIND this build.`)
  console.log("Migrations that add them:")
  for (const m of [...new Set(missing.map((c) => c.since))]) console.log(`  • ${m}`)
  console.log("\nFix: supabase db push --include-all   (then reload the PostgREST schema cache)")
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
